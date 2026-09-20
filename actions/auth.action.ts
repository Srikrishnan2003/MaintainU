"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { users, companies, technicians } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { NewTechnician, NewCompany } from "@/db/types";
import { createOTP, verifyOTP } from "@/services/otp.service";
import { createSession, destroySession, getSession } from "@/services/auth.service";
import { checkRateLimit } from "@/lib/rate-limiter";
import { getUserByPhone } from "@/services/user.service";
import { redirect } from "next/navigation";

// ─── Verification Schemas ───────────────────────────────────────────

const phoneSchema = z.object({
    phone: z.string().regex(/^\+?[\d\s-]{10,15}$/, "Invalid phone format"),
});

const otpSchema = phoneSchema.extend({
    otp: z.string().length(6, "OTP must be exactly 6 digits").regex(/^\d+$/, "OTP must be numeric"),
});

// ─── API Endpoints / Server Actions ─────────────────────────────────

export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
    status?: string;
}

/**
 * Standardize phone representation before hitting DB/Services.
 */
function normalizePhone(phone: string): string {
    return phone.replace(/[^\d+]/g, ""); // Keep only digits and leading '+'
}

/**
 * Initiates an OTP request or handles initial registration/pending status.
 * Migrated from monolithic sendOTPAction.
 */
export async function sendOTP(phoneInput: string, inputRole?: "company" | "technician", details?: any): Promise<ApiResponse> {
    try {
        const parsed = phoneSchema.safeParse({ phone: phoneInput });
        if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };
        
        const normalizedPhone = normalizePhone(parsed.data.phone);

        const rateLimit = await checkRateLimit(normalizedPhone, "otp");
        if (!rateLimit.success) {
            return { success: false, message: "Too many requests. Please try again later." };
        }

        const existingUsers = await db.select().from(users).where(eq(users.phone, normalizedPhone)).limit(1);
        const user = existingUsers[0];

        let finalStatus = user ? user.status : 'PENDING_PROFILE';
        let isNewOrUpgraded = false;

        if (user) {
            if (user.status === 'REJECTED') return { success: false, error: "banned", message: "Account suspended or rejected" };

            // Handle Pending statuses
            if (user.status === 'PENDING_PROFILE' || user.status === 'PENDING_APPROVAL') {
                const updates: any = {};
                if (inputRole && inputRole !== user.role) updates.role = inputRole;
                if (details?.name || details?.companyName) updates.name = details?.name || details?.companyName;

                // If details contain multiple keys, it means the full form was submitted
                if (details && Object.keys(details).length > 2 && user.status === 'PENDING_PROFILE') {
                    updates.status = 'PENDING_APPROVAL';
                    finalStatus = 'PENDING_APPROVAL';
                    isNewOrUpgraded = true;
                }

                if (Object.keys(updates).length > 0) {
                    await db.update(users).set(updates).where(eq(users.id, user.id));
                }

                // Sync Profile Details minimally
                if (user.role === 'technician' || inputRole === 'technician') {
                    const existingTech = await db.query.technicians.findFirst({ where: eq(technicians.userId, user.id) });
                    const techData: any = { userId: user.id, ...details, status: finalStatus };
                    if (existingTech) await db.update(technicians).set(techData).where(eq(technicians.id, existingTech.id));
                    else await db.insert(technicians).values(techData);
                } else if (user.role === 'company' || inputRole === 'company') {
                    const existingComp = await db.query.companies.findFirst({ where: eq(companies.userId, user.id) });
                    const compData: any = { userId: user.id, ...details };
                    if (existingComp) await db.update(companies).set(compData).where(eq(companies.id, existingComp.id));
                    else await db.insert(companies).values(compData);
                }
            }
        } else {
            // New User flow (Self-registration)
            const role = inputRole || "company";
            
            // Determine if full details are provided initially
            finalStatus = (details && Object.keys(details).length > 2) ? 'PENDING_APPROVAL' : 'PENDING_PROFILE';
            if (finalStatus === 'PENDING_APPROVAL') isNewOrUpgraded = true;

            const [newUser] = await db.insert(users).values({
                phone: normalizedPhone,
                role,
                status: finalStatus,
                name: details?.name || details?.companyName || "New User"
            }).returning();

            if (role === 'technician') {
                const techInsert: NewTechnician = {
                    userId: newUser.id,
                    status: finalStatus,
                    dob: details?.dob || undefined,
                    gender: details?.gender,
                    address: details?.address,
                    experience: details?.experience ? Number(details.experience) : undefined,
                    experienceLevel: details?.experienceLevel,
                    skills: details?.skills || [],
                    primarySkill: details?.primarySkill,
                };
                await db.insert(technicians).values(techInsert);
            } else {
                const compInsert: NewCompany = {
                    userId: newUser.id,
                    companyName: details?.companyName || details?.name || "New User",
                    address: details?.address || "Pending",
                    industryType: details?.industryType || "General",
                    email: details?.email,
                    gstin: details?.gstin,
                    contactPerson: details?.contactPerson,
                    spokespersonPhone: details?.spokespersonPhone,
                };
                await db.insert(companies).values(compInsert);
            }
        }

        // Notify Admins if newly upgraded to PENDING_APPROVAL
        if (isNewOrUpgraded) {
            import("@/actions/notification.action").then(async ({ sendPushNotification }) => {
                try {
                    const admins = await db.query.users.findMany({ where: eq(users.role, "admin") });
                    for (const admin of admins) {
                        await sendPushNotification(
                            admin.id, 
                            "New Account Registration", 
                            `A new ${inputRole || "user"} account is waiting for approval.`,
                            { route: "/admin/approvals" }
                        );
                    }
                } catch (e) {
                    console.error("Failed to notify admins of new registration:", e);
                }
            });
        }

        // Standard OTP trigger for ALL users (Active or Pending)
        const otpResult = await createOTP(normalizedPhone);
        if (!otpResult.success) return { success: false, message: otpResult.message, status: finalStatus };

        return { success: true, message: "OTP sent successfully", status: finalStatus };
    } catch (error) {
        console.error("sendOTP error:", error);
        return { success: false, message: "An error occurred" };
    }
}

/**
 * Standard verification flow.
 */
export async function verifyOTPAction(phoneInput: string, otpInput: string): Promise<ApiResponse> {
    try {
        const parsed = otpSchema.safeParse({ phone: phoneInput, otp: otpInput });
        if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };

        const normalizedPhone = normalizePhone(parsed.data.phone);
        const { otp } = parsed.data;

        const verifyResult = await verifyOTP(normalizedPhone, otp);
        if (!verifyResult.success) return { success: false, message: verifyResult.message };

        const user = await getUserByPhone(normalizedPhone);
        if (!user) return { success: false, message: "User not found" };

        await createSession({ id: user.id, role: user.role, status: user.status });

        if (user.status === "REJECTED") return { success: false, error: "banned", message: "Account suspended or rejected" };

        return { success: true, message: "Authentication successful", data: user };
    } catch (error) {
        console.error("verifyOTP error:", error);
        return { success: false, message: "An error occurred" };
    }
}

export async function logoutAction() {
    await destroySession();
    return { success: true };
}

export async function refreshSessionAction() {
    const session = await getSession();
    if (!session) return { success: false };

    try {
        const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
        if (!user) return { success: false };

        if (user.status !== session.status) {
            await createSession({ id: user.id, role: user.role, status: user.status });
        }

        return {
            success: true,
            status: user.status,
            role: user.role,
            name: user.name,
            phone: user.phone,
            profileCompleted: user.profileCompleted
        };
    } catch (e) {
        return { success: false };
    }
}

export async function checkUserStatusAction(phone: string) {
    const normalizedPhone = normalizePhone(phone);
    const user = await getUserByPhone(normalizedPhone);
    if (!user) return { exists: false, status: "PENDING_PROFILE", role: "company" as const };
    return { exists: true, status: user.status, role: user.role };
}

export async function getSessionTokenAction() {
    const cookieStore = await cookies();
    return cookieStore.get("session_token")?.value || null;
}
