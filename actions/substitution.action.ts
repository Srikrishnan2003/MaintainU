"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { attendance, dailyAssignments, jobs, requests, substitutions, technicians, users } from "@/db/schema";
import { eq, and, getTableColumns, desc } from "drizzle-orm";
import { ActionResult } from "@/lib/validations/actions";
import { verifySessionToken } from "@/services/auth.service";
import { cookies } from "next/headers";
import { calculateSubstitutionImpact, validateSubstitution } from "@/services/substitution.service";

// Zod schema for request
const requestSubstitutionSchema = z.object({
    originalTechnicianId: z.string().uuid(),
    substituteTechnicianId: z.string().uuid(),
    attendanceId: z.string().uuid(),
    reason: z.string().min(5).max(500),
    salaryTransferred: z.boolean()
});

async function requireAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) throw new Error("Unauthorized");
    const session = await verifySessionToken(token);
    if (!session || session.role !== "admin") throw new Error("Unauthorized");
    return session;
}

export async function requestSubstitutionAction(data: z.infer<typeof requestSubstitutionSchema>): Promise<ActionResult<{ substitutionId: string }>> {
    try {
        await requireAdmin();
        const parsed = requestSubstitutionSchema.safeParse(data);
        if (!parsed.success) return { success: false, error: "Validation Error", message: parsed.error.issues[0].message };

        const { originalTechnicianId, substituteTechnicianId, attendanceId, reason, salaryTransferred } = parsed.data;

        // Fetch original and substitute tech data
        const originalTech = await db.query.technicians.findFirst({ where: eq(technicians.id, originalTechnicianId) });
        const substituteTech = await db.query.technicians.findFirst({ where: eq(technicians.id, substituteTechnicianId) });

        if (!originalTech || !substituteTech) {
            return { success: false, error: "Not Found", message: "Technician not found" };
        }

        const validation = validateSubstitution(
            { status: originalTech.status || "ACTIVE", skills: originalTech.primarySkill ? [originalTech.primarySkill] : [] },
            { status: substituteTech.status || "ACTIVE", skills: substituteTech.primarySkill ? [substituteTech.primarySkill] : [] }
        );

        if (!validation.valid) {
            return { success: false, error: "Validation Error", message: validation.warnings[0] };
        }

        if (validation.warnings.length > 0) {
            console.warn("Substitution skill mismatch:", validation.warnings);
        }

        // Create substitution row
        const [substitution] = await db.insert(substitutions).values({
            attendanceId,
            originalTechnicianId,
            substituteTechnicianId,
            reason,
            salaryTransferred,
            adminDecision: "Pending"
        }).returning();

        return { success: true, message: "Substitution requested", data: { substitutionId: substitution.id } };
    } catch (e: any) {
        return { success: false, error: e.message || "Failed", message: "Failed to request substitution" };
    }
}

export async function getSubstitutionsAction(filters?: { dateRange?: { start: Date, end: Date }, status?: string, technicianId?: string }): Promise<ActionResult<any[]>> {
    try {
        await requireAdmin();

        let baseQuery = db.select({
            id: substitutions.id,
            attendanceId: substitutions.attendanceId,
            originalTechnicianId: substitutions.originalTechnicianId,
            substituteTechnicianId: substitutions.substituteTechnicianId,
            reason: substitutions.reason,
            adminDecision: substitutions.adminDecision,
            salaryTransferred: substitutions.salaryTransferred,
            requestedAt: substitutions.requestedAt,
            // Joined fields
            workDate: dailyAssignments.workDate,
            jobReference: requests.id,
            jobId: jobs.id
        })
        .from(substitutions)
        .innerJoin(attendance, eq(substitutions.attendanceId, attendance.id))
        .innerJoin(dailyAssignments, eq(attendance.dailyAssignmentId, dailyAssignments.id))
        .innerJoin(jobs, eq(dailyAssignments.jobId, jobs.id))
        .innerJoin(requests, eq(jobs.requestId, requests.id));

        const results = await baseQuery.orderBy(desc(substitutions.requestedAt));

        // Fetch users to map names (we do it here to avoid 2x joins making the query overly complex for Drizzle)
        const allTechs = await db.select({ id: technicians.id, name: users.name }).from(technicians).innerJoin(users, eq(technicians.userId, users.id));
        const techMap = new Map(allTechs.map(t => [t.id, t.name]));

        const formattedResults = results.map(r => ({
            ...r,
            originalName: techMap.get(r.originalTechnicianId) || "Unknown",
            substituteName: techMap.get(r.substituteTechnicianId || "") || "Unknown",
        }));

        // Apply filters in memory for simplicity unless performance dictates otherwise
        let filtered = formattedResults;
        if (filters?.status) {
            filtered = filtered.filter(f => f.adminDecision === filters.status);
        }
        if (filters?.technicianId) {
            filtered = filtered.filter(f => f.originalTechnicianId === filters.technicianId || f.substituteTechnicianId === filters.technicianId);
        }
        if (filters?.dateRange) {
            filtered = filtered.filter(f => {
                const date = new Date(f.workDate);
                return date >= filters.dateRange!.start && date <= filters.dateRange!.end;
            });
        }

        return { success: true, message: "Substitutions fetched", data: filtered };
    } catch (e: any) {
        return { success: false, error: e.message || "Failed", message: "Failed to fetch substitutions" };
    }
}

export async function approveSubstitutionAction(substitutionId: string): Promise<ActionResult<null>> {
    try {
        await requireAdmin();

        const [sub] = await db.select().from(substitutions).where(eq(substitutions.id, substitutionId));
        if (!sub) return { success: false, error: "Not Found", message: "Substitution not found" };

        if (sub.adminDecision !== "Pending") {
            return { success: false, error: "Invalid State", message: "Substitution is already processed" };
        }

        // Mark as approved
        await db.update(substitutions)
            .set({ adminDecision: "Approved", decidedAt: new Date() })
            .where(eq(substitutions.id, substitutionId));

        const impact = calculateSubstitutionImpact("Approved", sub.salaryTransferred || false);

        // Update original attendance
        await db.update(attendance)
            .set({ status: impact.originalNewStatus })
            .where(eq(attendance.id, sub.attendanceId));

        // If salary transferred, create/update attendance for substitute
        if (impact.updateReplacementAttendance) {
            const att = await db.query.attendance.findFirst({ where: eq(attendance.id, sub.attendanceId) });
            if (att && att.dailyAssignmentId && sub.substituteTechnicianId) {
                // Insert a new attendance record for the substitute for the same daily assignment
                await db.insert(attendance).values({
                    dailyAssignmentId: att.dailyAssignmentId,
                    technicianId: sub.substituteTechnicianId,
                    status: impact.replacementNewStatus,
                    checkInTime: new Date() // Best approximation or leave null until they check in
                });
            }
        }

        return { success: true, message: "Substitution approved", data: null };
    } catch (e: any) {
        return { success: false, error: e.message || "Failed", message: "Failed to approve substitution" };
    }
}

export async function cancelSubstitutionAction(substitutionId: string): Promise<ActionResult<null>> {
    try {
        await requireAdmin();

        const [sub] = await db.select().from(substitutions).where(eq(substitutions.id, substitutionId));
        if (!sub) return { success: false, error: "Not Found", message: "Substitution not found" };

        if (sub.adminDecision === "Rejected") {
            return { success: false, error: "Invalid State", message: "Substitution is already rejected/cancelled" };
        }

        // Reject / Cancel
        await db.update(substitutions)
            .set({ adminDecision: "Rejected", decidedAt: new Date() })
            .where(eq(substitutions.id, substitutionId));

        return { success: true, message: "Substitution cancelled", data: null };
    } catch (e: any) {
        return { success: false, error: e.message || "Failed", message: "Failed to cancel substitution" };
    }
}
