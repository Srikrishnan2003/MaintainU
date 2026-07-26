import { randomInt, createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { otpVerifications, users, companies } from "@/db/schema";
import { eq, and, gt, sql } from "drizzle-orm";
import { sendOTP } from "./sms.service";
import { sendEmail } from "./email.service";

// ─── Constants ──────────────────────────────────────────────────────
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 3;

// ─── generateOTP ────────────────────────────────────────────────────
// Generates a cryptographically secure 6-digit numeric OTP.
// Uses crypto.randomInt which is uniform and unbiased (unlike Math.random).
export function generateOTP(): string {
    const min = Math.pow(10, OTP_LENGTH - 1);  // 100000
    const max = Math.pow(10, OTP_LENGTH);       // 1000000
    return randomInt(min, max).toString();
}

// ─── deliverOTP ─────────────────────────────────────────────────────
// Delegates to the configured SMS provider (Console, MSG91, Twilio).
export async function deliverOTP(phone: string, otp: string): Promise<void> {
    const result = await sendOTP(phone, otp);

    if (process.env.NODE_ENV !== "production") {
        console.log(`\n[SMS Service] Result for ${phone}:`, result);
    }

    if (!result.success) {
        throw new Error(`SMS delivery failed [${result.provider}]: ${result.error || "Unknown error"}`);
    }
}

// ─── hashOTP ────────────────────────────────────────────────────────
// SHA-256 with a per-OTP random salt.
// Returns "salt:hash" for storage. Salt is needed to verify later.
//
// Why SHA-256 over bcrypt?
//   - OTP has 5-min TTL + 3 attempts → brute-force is already impossible
//   - SHA-256 is ~100,000x faster than bcrypt → no latency on verify
//   - Salt prevents rainbow tables on the 1M possible codes
export function hashOTP(otp: string): string {
    const salt = randomBytes(16).toString("hex");
    const hash = createHash("sha256")
        .update(salt + otp)
        .digest("hex");
    return `${salt}:${hash}`;
}

// ─── verifyOTPHash ──────────────────────────────────────────────────
// Compares a plain OTP against a stored "salt:hash" string.
export function verifyOTPHash(otp: string, storedHash: string): boolean {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;

    const computedHash = createHash("sha256")
        .update(salt + otp)
        .digest("hex");
    return computedHash === hash;
}

// ─── createOTP ──────────────────────────────────────────────────────
// Full flow: invalidate old → generate → hash → store → print to terminal.
// Returns only a success status. The OTP is NEVER sent to the caller.
export async function createOTP(phone: string): Promise<{ success: boolean; message: string }> {
    try {
        // 1. Delete ALL existing OTPs for this phone (active + expired) to prevent table bloat
        await db.delete(otpVerifications)
            .where(eq(otpVerifications.phone, phone));

        // 2. Generate and hash
        const otp = generateOTP();
        const hashedOTP = hashOTP(otp);

        // 3. Compute expiry
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        // 4. Store in DB
        await db.insert(otpVerifications).values({
            phone,
            otp: hashedOTP,
            expiresAt,
            attempts: 0,
        });

        // 5. Call delivery service
        await deliverOTP(phone, otp);

        // 5.5 Fallback OTP delivery via email for all user types
        try {
            const userRecord = await db.query.users.findFirst({ where: eq(users.phone, phone) });
            if (userRecord) {
                let emailTo: string | null = null;
                if (userRecord.role === "company") {
                    const company = await db.query.companies.findFirst({ where: eq(companies.userId, userRecord.id) });
                    if (company && company.email) {
                        emailTo = company.email;
                    }
                }

                // If not a company or no company email found, fallback to mock email
                if (!emailTo) {
                    // TODO: Replace with real technician email once email field is added to users table
                    emailTo = `technician_${userRecord.phone || userRecord.id}@maintainu.com`;
                }

                sendEmail({
                    to: emailTo,
                    subject: `MaintainU Verification Code: ${otp}`,
                    body: `Hello ${userRecord.name || "User"},\n\nYour MaintainU verification code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nRegards,\nMaintainU Admin`
                }).catch(err => console.error("OTP email send error:", err));
            }
        } catch (err) {
            console.error("OTP email delivery error:", err);
        }

        // 6. Return success — NO OTP in the response
        return { success: true, message: "OTP sent successfully" };
    } catch (error) {
        console.error("OTP creation failed:", error);
        return { success: false, message: "Failed to send OTP. Please try again." };
    }
}

// ─── verifyOTP ──────────────────────────────────────────────────────
// Validates an OTP against the stored hash. Enforces expiry and attempt limits.
// Deletes the record on success (single-use).
export async function verifyOTP(phone: string, otp: string): Promise<{ success: boolean; message: string }> {
    try {
        // 1. Find the latest active OTP for this phone
        const records = await db.select()
            .from(otpVerifications)
            .where(
                and(
                    eq(otpVerifications.phone, phone),
                    gt(otpVerifications.expiresAt, new Date())
                )
            )
            .limit(1);

        if (records.length === 0) {
            return { success: false, message: "OTP expired or not found. Please request a new one." };
        }

        const record = records[0];

        // 2. Increment attempts ATOMICALLY BEFORE verifying (prevents race conditions)
        const updatedRecords = await db.update(otpVerifications)
            .set({
                attempts: sql`${otpVerifications.attempts} + 1`,
                updatedAt: new Date(),
            })
            .where(eq(otpVerifications.id, record.id))
            .returning();

        if (updatedRecords.length === 0) {
            return { success: false, message: "OTP expired or not found. Please request a new one." };
        }

        const currentAttempts = updatedRecords[0].attempts;

        // 3. Strict Check attempt limit
        if (currentAttempts > MAX_ATTEMPTS) {
            // Delete the exhausted OTP
            await db.delete(otpVerifications).where(eq(otpVerifications.id, record.id));
            return { success: false, message: "Too many failed attempts. Please request a new OTP." };
        }

        // 4. Verify the hash
        if (!verifyOTPHash(otp, record.otp)) {
            const remaining = MAX_ATTEMPTS - currentAttempts;
            if (remaining <= 0) {
                await db.delete(otpVerifications).where(eq(otpVerifications.id, record.id));
                return { success: false, message: "Too many failed attempts. Please request a new OTP." };
            }
            return {
                success: false,
                message: `Invalid OTP. ${remaining} attempt${remaining > 1 ? "s" : ""} remaining.`,
            };
        }

        // 5. Success — delete the used OTP (single-use)
        await db.delete(otpVerifications).where(eq(otpVerifications.id, record.id));

        return { success: true, message: "OTP verified successfully" };
    } catch (error) {
        console.error("OTP verification failed:", error);
        return { success: false, message: "Verification failed. Please try again." };
    }
}
