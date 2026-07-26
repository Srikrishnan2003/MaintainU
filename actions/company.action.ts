"use server";

import { db } from "@/lib/db";
import { companies, users, requests, jobs } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireRole, createSession, getSession } from "@/services/auth.service";
import { validateAction, companyProfileSchema, ActionResult } from "@/lib/validations/actions";
import { z } from "zod";

// ─── Onboarding Schemas ─────────────────────────────────────────────

const companyOnboardingSchema = z.object({
  companyName: z.string().min(2, "Company Name must be at least 2 characters"),
  contactPerson: z.string().min(2, "Contact Person name must be at least 2 characters"),
  address: z.string().min(10, "Please provide a complete address")
});

export type CompanyOnboardingInput = z.infer<typeof companyOnboardingSchema>;

// ─── Actions ────────────────────────────────────────────────────────

/**
 * Handle initial registration/onboarding for a new company user.
 */
export async function submitCompanyOnboarding(formData: CompanyOnboardingInput) {
    try {
        const user = await requireRole("company");
        if (user.status !== "PENDING_PROFILE") return { success: false, message: "Profile already submitted." };

        const parsed = companyOnboardingSchema.safeParse(formData);
        if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };

        const data = parsed.data;

        await db.transaction(async (tx) => {
            await tx.insert(companies).values({
               userId: user.userId,
               companyName: data.companyName,
               contactPerson: data.contactPerson,
               address: data.address,
            });

            await tx.update(users).set({
               status: "ACTIVE",
               profileCompleted: true,
               updatedAt: new Date(),
               name: data.companyName
            }).where(eq(users.id, user.userId));
        });

        await createSession({ id: user.userId, role: "company", status: "ACTIVE", phone: user.phone });
        return { success: true, message: "Welcome to MaintainU Enterprise!" };
    } catch (e: any) {
        console.error("submitCompanyOnboarding Error:", e);
        return { success: false, message: e.code === '23505' ? "Company profile already exists." : "Failed to submit profile" };
    }
}

/**
 * Fetch all service requests for the logged-in company.
 * Includes enrichment for active job status.
 */
export async function getCompanyRequestsAction() {
    try {
        const session = await getSession();
        if (!session) return { requests: [] };

        const companyProfile = await db.query.companies.findFirst({ where: eq(companies.userId, session.userId) });
        if (!companyProfile) return { requests: [] };

        const compRequests = await db.select().from(requests)
            .where(eq(requests.companyId, companyProfile.id))
            .orderBy(desc(requests.createdAt));

        const enrichedRequests = await Promise.all(compRequests.map(async (r) => {
            const associatedJobs = await db.select().from(jobs).where(eq(jobs.requestId, r.id));
            let effectiveStatus = r.status;
            const hasActiveJob = associatedJobs.some(j => j.status === 'In_Progress');

            if (hasActiveJob && r.status !== 'Completed' && r.status !== 'Cancelled') {
                effectiveStatus = 'In_Progress';
            }

            return {
                ...r,
                date: r.preferredDate || undefined,
                status: effectiveStatus,
                companyName: companyProfile.companyName,
                companyLocation: companyProfile.address || undefined
            };
        }));

        return { requests: enrichedRequests };
    } catch (e) {
        return { requests: [] };
    }
}

/**
 * Fetch profile details for the logged-in company.
 */
export async function getCompanyProfileAction() {
    try {
        const session = await getSession();
        if (!session) return { success: false };

        const company = await db.query.companies.findFirst({ where: eq(companies.userId, session.userId) });
        const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });

        if (!company || !user) return { success: false };

        return {
            success: true,
            data: {
                ...company,
                phone: user.phone,
                email: company.email || "admin@company.com",
                subscription: "Pro Plan" 
            }
        };
    } catch (e) {
        return { success: false };
    }
}

/**
 * Handle subsequent profile completion/updates.
 */
export async function completeCompanyProfileAction(data: any): Promise<ActionResult> {
    const validation = validateAction(companyProfileSchema, data);
    if (!validation.success) {
        return validation;
    }
    const validatedData = validation.data;

    try {
        const user = await requireRole("company");
        if (!validatedData.gstin) return { success: false, message: "GSTIN is required" };

        const existingCompany = await db.query.companies.findFirst({ where: eq(companies.userId, user.userId) });

        if (existingCompany) {
            await db.update(companies).set({
                companyName: validatedData.companyName,
                gstin: validatedData.gstin,
                address: validatedData.address,
                contactPerson: validatedData.contactPerson,
                email: validatedData.email,
                updatedAt: new Date()
            }).where(eq(companies.id, existingCompany.id));
        } else {
             // Fallback to insertion if profile missing
             await db.insert(companies).values({
                 userId: user.userId,
                 companyName: validatedData.companyName || "Default Company",
                 spokespersonPhone: validatedData.spokespersonPhone,
                 address: validatedData.address,
                 industryType: validatedData.industryType,
                 gstin: validatedData.gstin,
                 contactPerson: validatedData.contactPerson,
                 email: validatedData.email
             });
        }

        await db.update(users).set({ profileCompleted: true }).where(eq(users.id, user.userId));
        return { success: true };
    } catch (e) {
        return { success: false, message: "Failed to save profile" };
    }
}

/**
 * Generic update action for company profile settings.
 */
export async function updateCompanyProfileAction(data: any): Promise<ActionResult> {
    const validation = validateAction(companyProfileSchema, data);
    if (!validation.success) {
        return validation;
    }
    const validatedData = validation.data;

    try {
        const session = await getSession();
        if (!session) return { success: false, message: "Not authenticated" };

        await db.update(companies)
            .set({ ...validatedData, updatedAt: new Date() })
            .where(eq(companies.userId, session.userId));

        if (validatedData.companyName) {
            await db.update(users).set({ name: validatedData.companyName, updatedAt: new Date() }).where(eq(users.id, session.userId));
        }

        return { success: true, message: "Profile updated successfully" };
    } catch (e) {
        return { success: false, message: "Failed to update profile" };
    }
}
