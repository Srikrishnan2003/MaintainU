"use server";

import { db } from "@/lib/db";
import { technicians, users, jobs, attendance, jobUpdates, technicianScores, requests, companies, dailyAssignments as dailyAssignmentsTable, masterTeams, masterTeamMembers } from "@/db/schema";
import { eq, and, sql, or, desc } from "drizzle-orm";
import { requireRole, createSession, getSession } from "@/services/auth.service";
import { emitAttendanceUpdate } from "@/lib/event-emitter";
import { validateAction, technicianProfileSchema, technicianDocumentsSchema, jobUpdateSchema, attendanceLocationSchema, ActionResult } from "@/lib/validations/actions";
import { z } from "zod";

// ─── Onboarding Schemas ─────────────────────────────────────────────

const onboardingSchema = z.object({
  dob: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Gender is required"),
  address: z.string().min(10, "Please provide a complete address"),
  experience: z.coerce.number().min(0, "Experience cannot be negative"),
  experienceLevel: z.string().optional(),
  skills: z.array(z.string()).optional(),
  primarySkill: z.string().min(1, "Primary skill is required"),
  documents: z.object({
     profilePhoto: z.string().url("Profile photo is required"),
     aadhaar: z.string().url("Aadhaar document is required"),
     pan: z.string().url("PAN document is required"),
  })
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

// ─── Actions ────────────────────────────────────────────────────────

/**
 * Handle initial registration/onboarding for a new technician user.
 */
export async function submitTechnicianOnboarding(formData: OnboardingInput) {
    try {
        const user = await requireRole("technician");
        if (user.status !== "PENDING_PROFILE") return { success: false, message: "Profile already submitted." };

        const parsed = onboardingSchema.safeParse(formData);
        if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };

        const data = parsed.data;

        await db.transaction(async (tx) => {
            await tx.update(technicians).set({
               ...data,
               status: "Pending",
            }).where(eq(technicians.userId, user.userId));

            await tx.update(users).set({
               status: "PENDING_APPROVAL",
               profileCompleted: true,
               updatedAt: new Date()
            }).where(eq(users.id, user.userId));
        });

        await createSession({ id: user.userId, role: "technician", status: "PENDING_APPROVAL", phone: user.phone });
        return { success: true, message: "Onboarding completed. Pending approval." };
    } catch (e: any) {
        console.error("submitTechnicianOnboarding Error:", e);
        return { success: false, message: e.code === '23505' ? "Profile already exists." : "Failed to submit profile" };
    }
}

/**
 * Fetch profile details for the logged-in technician.
 */
export async function getTechnicianProfileAction() {
    try {
        const session = await getSession();
        if (!session) return { success: false };

        const [tech, user] = await Promise.all([
            db.query.technicians.findFirst({ where: eq(technicians.userId, session.userId) }),
            db.query.users.findFirst({ where: eq(users.id, session.userId) })
        ]);

        if (!tech || !user) return { success: false };

        const completedJobsCount = await db.select({ count: sql<number>`count(*)` })
            .from(jobs)
            .where(
                and(
                    eq(jobs.leadTechnicianId, tech.id),
                    or(eq(jobs.status, 'Completed'), eq(jobs.status, 'Work_Completed'))
                )
            );

        return {
            success: true,
            data: {
                ...tech,
                name: user.name,
                phone: user.phone,
                completedJobs: Number(completedJobsCount[0].count)
            }
        };
    } catch (e) {
        return { success: false };
    }
}

/**
 * Update technician profile settings.
 */
export async function updateTechnicianProfileAction(data: any): Promise<ActionResult> {
    const extendedProfileSchema = technicianProfileSchema.extend({
        emergencyContactName: z.string().optional(),
        emergencyContactPhone: z.string().regex(/^(\+91)?[6-9]\d{9}$/, "Invalid Indian phone number").optional().or(z.literal("")).transform(v => v === "" ? undefined : v),
        preferredLocations: z.union([
            z.array(z.string()),
            z.string().transform((val) => val.split(",").map(s => s.trim()).filter(Boolean))
        ]).optional(),
        dailyRate: z.coerce.number().optional(),
        photo: z.string().url().optional(),
        bankDetails: z.any().optional(),
    });

    const validation = validateAction(extendedProfileSchema, data);
    if (!validation.success) {
        return validation;
    }
    const validatedData = validation.data;

    try {
        const session = await getSession();
        if (!session) return { success: false, message: "Not authenticated" };

        const tech = await db.query.technicians.findFirst({
            where: eq(technicians.userId, session.userId),
            columns: { id: true, documents: true }
        });

        if (!tech) return { success: false, message: "Technician not found" };

        const mergedDocuments = {
            ...(tech.documents as Record<string, any> ?? {}),
        };
        if (validatedData.photo) {
            mergedDocuments.photo = validatedData.photo;
        }

        await db.update(technicians)
            .set({ 
                primarySkill: validatedData.primarySkill, 
                experience: validatedData.experience ? Number(validatedData.experience) : undefined, 
                experienceLevel: validatedData.experienceLevel,
                address: validatedData.address,
                emergencyContactName: validatedData.emergencyContactName,
                emergencyContactPhone: validatedData.emergencyContactPhone,
                skills: Array.isArray(validatedData.skills) ? validatedData.skills : (typeof validatedData.skills === 'string' ? (validatedData.skills as string).split(',').map(s => s.trim()).filter(Boolean) : undefined),
                preferredLocations: Array.isArray(validatedData.preferredLocations) ? validatedData.preferredLocations : (typeof validatedData.preferredLocations === 'string' ? (validatedData.preferredLocations as string).split(',').map(s => s.trim()).filter(Boolean) : undefined),
                dailyRate: validatedData.dailyRate,
                bankDetails: validatedData.bankDetails,
                documents: Object.keys(mergedDocuments).length > 0 ? mergedDocuments : undefined,
                updatedAt: new Date() 
            })
            .where(eq(technicians.userId, session.userId));

        if (validatedData.name) {
            await db.update(users).set({ name: validatedData.name, updatedAt: new Date() }).where(eq(users.id, session.userId));
        }

        return { success: true, message: "Profile updated successfully" };
    } catch (e) {
        return { success: false, message: "Failed to update profile" };
    }
}

/**
 * Post a status update for a specific job.
 */
export async function postJobUpdateAction(jobId: string, message: string, photos: string[]): Promise<ActionResult> {
    const validation = validateAction(jobUpdateSchema, { jobId, message, photos });
    if (!validation.success) {
        return validation;
    }
    const validatedData = validation.data;

    try {
        const user = await requireRole("technician");
        const tech = await db.query.technicians.findFirst({ where: eq(technicians.userId, user.userId) });
        if (!tech) return { success: false };

        const job = await db.query.jobs.findFirst({ where: eq(jobs.id, jobId) });
        if (!job) return { success: false, message: "Job not found" };

        let authorized = job.leadTechnicianId === tech.id;
        if (!authorized) {
            const req = await db.query.requests.findFirst({ where: eq(requests.id, job.requestId) });
            if (req && req.technicianId === tech.id) authorized = true;
        }

        if (!authorized) {
            const teamMember = await db.select().from(masterTeamMembers)
                .innerJoin(masterTeams, eq(masterTeamMembers.masterTeamId, masterTeams.id))
                .where(and(eq(masterTeams.jobId, jobId), eq(masterTeamMembers.technicianId, tech.id)))
                .limit(1);
            if (teamMember.length > 0) authorized = true;
        }

        if (!authorized) return { success: false, message: "Unauthorized" };

        await db.insert(jobUpdates).values({
            jobId,
            technicianId: tech.id,
            type: 'update',
            message: validatedData.message,
            photos: validatedData.photos || [],
        });
        return { success: true };
    } catch (e) {
        return { success: false };
    }
}

/**
 * Mark daily attendance for the technician.
 */
export async function markAttendanceAction(location: any): Promise<ActionResult> {
    const validation = validateAction(attendanceLocationSchema, location);
    if (!validation.success) {
        return validation;
    }
    const validatedData = validation.data;

    try {
        const user = await requireRole("technician");
        const tech = await db.query.technicians.findFirst({ where: eq(technicians.userId, user.userId) });
        if (!tech) return { success: false, message: "Technician not found" };

        await db.insert(attendance).values({
            technicianId: tech.id,
            checkInTime: new Date(),
            locationCheckIn: JSON.stringify(validatedData),
            status: validatedData.status === 'leave' ? 'Absent' : 'Present'
        });

        if (validatedData.status !== 'leave') {
            await db.update(technicians).set({ status: 'ACTIVE' }).where(eq(technicians.id, tech.id));
        }

        emitAttendanceUpdate(tech.id, validatedData && 'jobId' in validatedData ? (validatedData.jobId as string) : "", 'Present', new Date().toISOString());

        return { success: true, message: "Attendance marked successfully" };
    } catch (e) {
        return { success: false, message: "Failed to mark attendance" };
    }
}

/**
 * Fetch attendance logs for the logged-in technician.
 */
export async function getTechnicianAttendanceAction() {
    try {
        const session = await getSession();
        if (!session) return { success: false, data: [] };

        const tech = await db.query.technicians.findFirst({ where: eq(technicians.userId, session.userId) });
        if (!tech) return { success: false, data: [] };

        const results = await db.select({
            id: attendance.id,
            status: attendance.status,
            checkInTime: attendance.checkInTime,
            checkOutTime: attendance.checkOutTime,
            createdAt: attendance.createdAt,
            workDate: dailyAssignmentsTable.workDate,
            companyName: companies.companyName
        })
        .from(attendance)
        .innerJoin(dailyAssignmentsTable, eq(attendance.dailyAssignmentId, dailyAssignmentsTable.id))
        .innerJoin(jobs, eq(dailyAssignmentsTable.jobId, jobs.id))
        .innerJoin(requests, eq(jobs.requestId, requests.id))
        .innerJoin(companies, eq(requests.companyId, companies.id))
        .where(
            and(
                eq(attendance.technicianId, tech.id),
                eq(attendance.status, 'Present')
            )
        )
        .orderBy(desc(attendance.createdAt))
        .limit(30);

        const mappedData = results.map(r => ({
            ...r,
            date: r.workDate || new Date(r.createdAt).toISOString().split('T')[0],
            checkInTime: r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-",
        }));

        return { success: true, data: mappedData };
    } catch (e) {
        return { success: false, data: [] };
    }
}

/**
 * Update technician documents (AADHAAR, PAN, etc.).
 */
export async function updateTechnicianDocumentsAction(documents: any): Promise<ActionResult> {
    const validation = validateAction(technicianDocumentsSchema, documents);
    if (!validation.success) {
        return validation;
    }
    const validatedData = validation.data;

    try {
        const user = await requireRole("technician");
        await db.update(technicians).set({ documents: validatedData }).where(eq(technicians.userId, user.userId));
        return { success: true };
    } catch (e) {
        return { success: false };
    }
}

/**
 * Handle subsequent profile completion.
 */
export async function completeTechnicianProfileAction(data: any): Promise<ActionResult> {
    const validation = validateAction(technicianProfileSchema, data);
    if (!validation.success) {
        return validation;
    }
    const validatedData = validation.data;

    try {
        const user = await requireRole("technician");
        if (validatedData.name) await db.update(users).set({ name: validatedData.name }).where(eq(users.id, user.userId));

        const skillsStr = Array.isArray(validatedData.skills) ? validatedData.skills.join(",") : (validatedData.skills || "");
        const skillsArray = skillsStr.split(",").map((s: string) => s.trim()).filter(Boolean);
        if (validatedData.primarySkill && !skillsArray.includes(validatedData.primarySkill)) skillsArray.unshift(validatedData.primarySkill);
        if (!user || user.role !== 'technician') return { success: false, message: "Unauthorized" };

        await db.update(technicians).set({
            experience: validatedData.experience ? Number(validatedData.experience) : undefined,
            experienceLevel: validatedData.experienceLevel,
            primarySkill: validatedData.primarySkill,
            skills: skillsArray,
            address: validatedData.address,
            updatedAt: new Date()
        }).where(eq(technicians.userId, user.userId));
        await db.update(users).set({ profileCompleted: true }).where(eq(users.id, user.userId));

        return { success: true, message: "Profile updated" };
    } catch (e) {
        return { success: false, message: "Failed to update profile" };
    }
}

export type TechnicianExportRow = {
    name: string;
    phone: string;
    serviceType: string;
    status: string;
    joinedDate: string;
};

/**
 * Admin Action: Exports technician data.
 */
export async function exportTechniciansAction(): Promise<ActionResult<TechnicianExportRow[]>> {
    try {
        await requireRole("admin");
        
        const result = await db.select({
            name: users.name,
            phone: users.phone,
            serviceType: technicians.primarySkill,
            status: technicians.status,
            joinedDate: technicians.createdAt,
        })
        .from(technicians)
        .innerJoin(users, eq(technicians.userId, users.id))
        .leftJoin(technicianScores, eq(technicianScores.technicianId, technicians.id))
        .orderBy(desc(technicians.createdAt));

        const rows: TechnicianExportRow[] = result.map(row => ({
            name: row.name || "",
            phone: row.phone || "",
            serviceType: row.serviceType || "General",
            status: row.status || "",
            joinedDate: row.joinedDate ? row.joinedDate.toISOString() : ""
        }));

        return { success: true, message: "Export ready", data: rows };
    } catch (e: any) {
        return { success: false, message: e.message || "Failed to export technicians" };
    }
}
