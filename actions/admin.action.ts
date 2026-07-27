"use server"

import { db } from "@/lib/db";
import type { User } from "@/db/types";
import { 
    requests, technicians, users, companies, attendance, jobStatusHistory, ratings, technicianScores,
    jobs, masterTeams, masterTeamMembers, dailyInvites, dailyAssignments, replacementAssignments,
    substitutions, jobUpdates, invoices, payments 
} from "@/db/schema";
import { eq, desc, sql, and, or, ilike, inArray } from "drizzle-orm";
import type { RequestsFilterParams, TechniciansFilterParams, ApprovalsFilterParams } from "@/lib/validations/filters";
import { requireRole, createSession } from "@/services/auth.service";
import { emitAccountApproved } from "@/lib/event-emitter";
import { logStatusChange } from "@/services/audit.service";
import bcrypt from "bcryptjs";
import { validateAction, updateUserStatusSchema, adminLoginSchema, ActionResult } from "@/lib/validations/actions";
import { calculateScore } from "@/services/scoring.service";
import { sendEmail } from "@/services/email.service";
import { revalidatePath } from "next/cache";

/**
 * Admin Action: Assigns a technician to a request.
 */
export async function assignTechnicianToRequest(requestId: string, technicianId: string) {
    try {
        const adminUser = await requireRole("admin");

        const requestRecords = await db.select().from(requests).where(eq(requests.id, requestId)).limit(1);
        const requestRecord = requestRecords[0];

        if (!requestRecord) return { success: false, message: "Request not found" };

        if (requestRecord.technicianId === technicianId) {
            return { success: false, message: "Technician is already assigned" };
        }

        const techRecords = await db.select({
            id: technicians.id,
            userStatus: users.status,
            phone: users.phone,
            name: users.name
        })
        .from(technicians)
        .innerJoin(users, eq(technicians.userId, users.id))
        .where(eq(technicians.id, technicianId))
        .limit(1);

        if (!techRecords[0] || techRecords[0].userStatus !== "ACTIVE") {
            return { success: false, message: "Technician must be ACTIVE to receive assignments." };
        }

        const previousStatus = requestRecord.status;

        await db.transaction(async (tx) => {
            await tx.update(requests).set({
                technicianId: technicianId,
                status: "ASSIGNED",
                updatedAt: new Date()
            }).where(eq(requests.id, requestId));

            await logStatusChange(null, requestId, previousStatus, "ASSIGNED", `Assigned to ${technicianId} by Admin`);
        });

        const tech = techRecords[0];
        // TODO: Replace with real technician email once email field is added to users table
        const techEmail = `technician_${tech.phone || tech.id}@maintainu.com`;

        try {
            sendEmail({
                to: techEmail,
                subject: `New Job Assigned - Request #${requestId.slice(0, 8)}`,
                body: `Hello ${tech.name || "Technician"},\n\nYou have been assigned to a new industrial maintenance request (Request #${requestId.slice(0, 8)}).\n\nPlease review the job details in your dashboard.\n\nRegards,\nMaintainU Admin`
            }).catch(err => console.error("Email send error (assignTechnicianToRequest):", err));
        } catch (err) {
            console.error("Email send error (assignTechnicianToRequest):", err);
        }
        
        return { success: true, message: "Technician successfully assigned" };

    } catch (error: any) {
         console.error("assignTechnician error:", error);
         return { success: false, message: error.message || "Failed to execute assignment" };
    }
}

/**
 * Admin Action: Fetches all requests with company details.
 */
export async function getRequestsAction(filters?: RequestsFilterParams) {
    try {
        await requireRole("admin");

        const conditions: any[] = [];
        if (filters?.search) {
            conditions.push(or(ilike(companies.companyName, `%${filters.search}%`), ilike(requests.location, `%${filters.search}%`)));
        }
        if (filters?.serviceType) {
            conditions.push(eq(requests.serviceType, filters.serviceType));
        }
        if (filters?.priority) {
            conditions.push(eq(requests.priority, filters.priority));
        }
        if (filters?.status) {
            conditions.push(eq(requests.status, filters.status));
        }

        conditions.push(sql`(${companies.companyName} != 'Internal Operations' OR ${companies.companyName} IS NULL)`);

        const result = await db.select({
            request: requests,
            company: companies,
            techUser: users
        })
        .from(requests)
        .leftJoin(companies, eq(requests.companyId, companies.id))
        .leftJoin(technicians, eq(requests.technicianId, technicians.id))
        .leftJoin(users, eq(technicians.userId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(requests.createdAt));

        return { 
            requests: result.map(({ request, company, techUser }) => ({
                ...request,
                companyName: company?.companyName || "Unknown Company",
                companyLocation: company?.address,
                technicianName: techUser?.name,
                technicianPhone: techUser?.phone
            }))
        };
    } catch (e) {
        return { requests: [] };
    }
}

/**
 * Admin Action: Fetches all technicians with their live status.
 */
export async function getTechniciansAction(filters?: TechniciansFilterParams) {
    try {
        await requireRole("admin");

        const conditions: any[] = [];
        conditions.push(eq(users.role, 'technician'));
        
        if (filters?.search) {
            conditions.push(or(ilike(users.name, `%${filters.search}%`), ilike(users.phone, `%${filters.search}%`)));
        }
        if (filters?.status) {
            conditions.push(eq(users.status, filters.status));
        }
        if (filters?.serviceType) {
            conditions.push(eq(technicians.primarySkill, filters.serviceType));
        }

        const result = await db.select({
            user: users,
            tech: technicians
        })
        .from(users)
        .leftJoin(technicians, eq(technicians.userId, users.id))
        .where(and(...conditions));

        const enriched = await Promise.all(result.map(async ({ user, tech }) => {
            let location = null;
            let isOnline = false;

            if (tech) {
                const lastAttendance = await db.select().from(attendance)
                    .where(eq(attendance.technicianId, tech.id))
                    .orderBy(desc(attendance.createdAt))
                    .limit(1);

                if (lastAttendance[0]) {
                    if (lastAttendance[0].locationCheckIn) {
                        try { location = JSON.parse(lastAttendance[0].locationCheckIn); } catch (e) {}
                    }
                    isOnline = !!(lastAttendance[0].checkInTime && !lastAttendance[0].checkOutTime);
                }
            }

            return {
                id: user.id,
                techId: tech?.id,
                name: user.name || user.phone,
                skill: tech?.primarySkill || "General",
                rating: tech?.rating || "0",
                status: isOnline ? 'Online' : (tech?.status || user.status) === 'ACTIVE' ? 'ACTIVE' : (tech?.status || user.status),
                isOnline,
                phone: user.phone,
                experience: tech?.experience,
                lat: location?.lat || null,
                lng: location?.lng || null,
                locationName: location?.address || "Unknown Location",
                documents: tech?.documents 
            };
        }));

        return { technicians: enriched };
    } catch (e) {
        return { technicians: [] };
    }
}

/**
 * Admin Action: Fetches all users.
 */
export async function getUsersAction() {
    try {
        await requireRole("admin");
        const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
        return { users: allUsers };
    } catch (e) {
        return { users: [] };
    }
}

/**
 * Admin Action: Fetches all technician approvals.
 */
export async function getApprovalsAction(filters?: ApprovalsFilterParams) {
    try {
        await requireRole("admin");
        
        const conditions: any[] = [];
        
        if (filters?.search) {
            conditions.push(or(ilike(users.name, `%${filters.search}%`), ilike(users.phone, `%${filters.search}%`)));
        }
        if (filters?.status) {
            conditions.push(eq(technicians.status, filters.status));
        }
        
        const result = await db.select({
            id: technicians.id,
            userId: users.id,
            name: users.name,
            phone: users.phone,
            dob: technicians.dob,
            gender: technicians.gender,
            address: technicians.address,
            experience: technicians.experience,
            primarySkill: technicians.primarySkill,
            documents: technicians.documents,
            status: technicians.status,
            createdAt: technicians.createdAt,
        })
        .from(technicians)
        .innerJoin(users, eq(technicians.userId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(technicians.createdAt));

        return { approvals: result };
    } catch (e) {
        return { approvals: [] };
    }
}

/**
 * Admin Action: Updates a user's status and synchronized tech status.
 */
export async function updateUserStatusAction(userId: string, status: any, role?: any): Promise<ActionResult> {
    const validation = validateAction(updateUserStatusSchema, { userId, status, role });
    if (!validation.success) {
        return validation;
    }
    const validatedData = validation.data;

    try {
        await requireRole("admin");

        const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
        if (targetUser && targetUser.role === "admin" && validatedData.status === "REJECTED") {
            return { success: false, message: "Admin accounts cannot be banned or rejected." };
        }

        await db.update(users)
            .set({ 
                status: validatedData.status as "PENDING_PROFILE" | "PENDING_APPROVAL" | "ACTIVE" | "REJECTED", 
                ...(validatedData.role ? { role: validatedData.role as "admin" | "company" | "technician" } : {}) 
            })
            .where(eq(users.id, userId));

        if (validatedData.status === 'ACTIVE') {
            await db.update(technicians)
                .set({ status: 'ACTIVE', approvedAt: new Date() })
                .where(eq(technicians.userId, userId));
                
            const userRecord = await db.query.users.findFirst({ where: eq(users.id, userId) });
            if (userRecord) {
                emitAccountApproved(userId, userRecord.role);

                let emailTo: string | null = null;
                if (userRecord.role === "company") {
                    const company = await db.query.companies.findFirst({ where: eq(companies.userId, userId) });
                    if (company && company.email) {
                        emailTo = company.email;
                    }
                } else if (userRecord.role === "technician") {
                    // TODO: Replace with real technician email once email field is added to users table
                    emailTo = `technician_${userRecord.phone || userId}@maintainu.com`;
                }

                if (emailTo) {
                    try {
                        sendEmail({
                            to: emailTo,
                            subject: "Account Approved - MaintainU",
                            body: `Hello ${userRecord.name || "User"},\n\nYour MaintainU account has been approved and activated. You can now log in to the platform.\n\nRegards,\nMaintainU Admin`
                        }).catch(err => console.error("Email send error (updateUserStatusAction):", err));
                    } catch (err) {
                        console.error("Email send error (updateUserStatusAction):", err);
                    }
                }
            }
        } else {
            await db.update(technicians)
                .set({ status: validatedData.status === 'REJECTED' ? 'REJECTED' : 'PENDING_APPROVAL' })
                .where(eq(technicians.userId, userId));
        }

        return { success: true };
    } catch (e) {
        return { success: false };
    }
}

/**
 * Admin Action: Detailed lookup of a user and their profile.
 */
export async function getUserDetailsAction(userId: string) {
    try {
        await requireRole("admin");
        const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
        if (!user) return { success: false, message: "User not found" };

        let details: any = {};
        if (user.role === 'company') {
            details = (await db.query.companies.findFirst({ where: eq(companies.userId, userId) })) || {};
        } else if (user.role === 'technician') {
            const tech = await db.query.technicians.findFirst({ where: eq(technicians.userId, userId) });
            if (tech) {
                // Fetch scoring and attendance stats in parallel
                const [scoreRecord, attendanceRecords] = await Promise.all([
                    db.query.technicianScores.findFirst({ where: eq(technicianScores.technicianId, tech.id) }),
                    db.select({ status: attendance.status })
                        .from(attendance)
                        .where(eq(attendance.technicianId, tech.id))
                ]);
                const totalDays = attendanceRecords.length;
                const presentDays = attendanceRecords.filter(r => r.status === "Present").length;

                // Calculate scores on-the-fly
                const averageRating = scoreRecord?.averageRating || 0;
                const completedJobs = scoreRecord?.totalJobs || 0;
                
                const attendanceScore = totalDays > 0 ? (presentDays / totalDays) * 40 : 0;
                const ratingScore = (averageRating / 5) * 40;
                const jobScore = Math.min(completedJobs / 10, 1) * 20;
                const totalScore = attendanceScore + ratingScore + jobScore;

                details = {
                    ...tech,
                    score: {
                        totalScore: Math.round(totalScore * 100) / 100,
                        attendanceScore: Math.round(attendanceScore * 100) / 100,
                        ratingScore: Math.round(ratingScore * 100) / 100,
                        jobScore: Math.round(jobScore * 100) / 100,
                        lastUpdated: scoreRecord?.lastUpdated || new Date()
                    }
                };
            } else {
                details = {};
            }
        }

        return { success: true, user: { ...user, details } };
    } catch (e) {
        return { success: false };
    }
}

/**
 * Admin Action: Approves a technician application.
 */
export async function approveTechnician(technicianId: string) {
    try {
        await requireRole("admin");
        const tech = await db.query.technicians.findFirst({ where: eq(technicians.id, technicianId) });
        if (!tech) return { success: false, message: "Technician not found" };

        await db.transaction(async (tx) => {
            await tx.update(technicians).set({ status: "Active", approvedAt: new Date() }).where(eq(technicians.id, technicianId));
            await tx.update(users).set({ status: "ACTIVE" }).where(eq(users.id, tech.userId));
        });

        const userRecord = await db.query.users.findFirst({ where: eq(users.id, tech.userId) });
        if (userRecord) {
            // TODO: Replace with real technician email once email field is added to users table
            const emailTo = `technician_${userRecord.phone || tech.userId}@maintainu.com`;
            try {
                sendEmail({
                    to: emailTo,
                    subject: "Technician Application Approved - MaintainU",
                    body: `Hello ${userRecord.name || "Technician"},\n\nYour technician application has been approved. You can now log in and accept job assignments.\n\nRegards,\nMaintainU Admin`
                }).catch(err => console.error("Email send error (approveTechnician):", err));
            } catch (err) {
                console.error("Email send error (approveTechnician):", err);
            }
        }

        return { success: true, message: "Technician approved" };
    } catch (e) {
        return { success: false };
    }
}

/**
 * Admin Action: Rejects a technician application.
 */
export async function rejectTechnician(technicianId: string, reason: string = "Application rejected") {
    try {
        await requireRole("admin");
        const tech = await db.query.technicians.findFirst({ where: eq(technicians.id, technicianId) });
        if (!tech) return { success: false, message: "Technician not found" };

        await db.transaction(async (tx) => {
            await tx.update(technicians).set({ status: "Rejected", rejectionReason: reason }).where(eq(technicians.id, technicianId));
            await tx.update(users).set({ status: "REJECTED" }).where(eq(users.id, tech.userId));
        });

        return { success: true, message: "Technician application rejected" };
    } catch (e) {
        return { success: false };
    }
}

/**
 * Admin Action: Fetches all ratings and reviews.
 */
export async function getFeedbackAction() {
    try {
        await requireRole("admin");
        const result = await db.select({
            rating: ratings,
            techName: users.name,
            companyName: companies.companyName
        })
        .from(ratings)
        .leftJoin(technicians, eq(ratings.technicianId, technicians.id))
        .leftJoin(users, eq(technicians.userId, users.id))
        .leftJoin(requests, eq(ratings.jobId, sql`NULL`)) // This should join jobs, then requests
        .orderBy(desc(ratings.createdAt));

        return { feedback: result };
    } catch (e) {
        return { feedback: [] };
    }
}

/**
/**
 * Admin Action: High-privileged login for administrative accounts.
 * Uses bcrypt to securely compare the stored password hash.
 */
export async function adminLoginAction(phone: string, inputPass: string): Promise<ActionResult> {
    const validation = validateAction(adminLoginSchema, { phone, inputPass });
    if (!validation.success) {
        return validation;
    }
    const validatedData = validation.data;

    try {
        const normalizedPhone = validatedData.phone.startsWith('+91')
            ? validatedData.phone
            : `+91${validatedData.phone}`;
        const user = await db.query.users.findFirst({
            where: and(eq(users.phone, normalizedPhone), eq(users.role, 'admin'))
        });

        if (!user) {
            // Generic message to prevent user enumeration
            return { success: false, message: "Invalid credentials" };
        }

        if (!user.passwordHash) {
            return {
                success: false,
                message: "Admin account not configured in environment or database."
            };
        }

        const passwordValid = await bcrypt.compare(validatedData.inputPass, user.passwordHash);
        if (!passwordValid) {
            return { success: false, message: "Invalid credentials" };
        }

        // createSession sets both 'session_token' and 'admin_session' cookies
        await createSession({ id: user.id, role: user.role, status: user.status });
        return { success: true, role: user.role };
    } catch (e: any) {
        console.error("adminLoginAction error:", e);
        return { success: false, message: "Authentication error" };
    }
}

/**
 * Admin Action: Permanently deletes a user and their associated profiles.
 * Migrated from lib/actions.ts with added admin role guard.
 */
export async function deleteUserAction(userId: string) {
    try {
        await requireRole("admin");

        const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
        if (targetUser && targetUser.role === "admin") {
            return { success: false, message: "Admin accounts cannot be deleted." };
        }

        // Sequential deletes required — companies/technicians FK reference users.id
        await db.delete(companies).where(eq(companies.userId, userId));
        await db.delete(technicians).where(eq(technicians.userId, userId));

        // Delete the user record
        await db.delete(users).where(eq(users.id, userId));

        return { success: true };
    } catch (e: any) {
        console.error("deleteUserAction error:", e);
        return { success: false, message: e.message || "Failed to delete user" };
    }
}

export async function getDeleteRequestWarningAction(requestId: string): Promise<{ success: boolean; counts?: any; exportData?: any; message?: string }> {
    try {
        await requireRole("admin");
        
        const counts = {
            jobs: 0,
            masterTeams: 0,
            masterTeamMembers: 0,
            dailyInvites: 0,
            dailyAssignments: 0,
            attendance: 0,
            substitutions: 0,
            replacementAssignments: 0,
            jobUpdates: 0,
            jobStatusHistory: 0,
            invoices: 0,
            payments: 0,
            ratings: 0
        };

        const jobRecords = await db.select().from(jobs).where(eq(jobs.requestId, requestId));
        const jobIds = jobRecords.map(j => j.id);
        counts.jobs = jobIds.length;

        let exportData: any = null;

        if (jobIds.length > 0) {
            const history = await db.select().from(jobStatusHistory).where(or(eq(jobStatusHistory.requestId, requestId), inArray(jobStatusHistory.jobId, jobIds)));
            counts.jobStatusHistory = history.length;

            const mTeams = await db.select().from(masterTeams).where(inArray(masterTeams.jobId, jobIds));
            const masterTeamIds = mTeams.map(t => t.id);
            counts.masterTeams = masterTeamIds.length;

            if (masterTeamIds.length > 0) {
                const members = await db.select().from(masterTeamMembers).where(inArray(masterTeamMembers.masterTeamId, masterTeamIds));
                const memberIds = members.map(m => m.id);
                counts.masterTeamMembers = memberIds.length;

                if (memberIds.length > 0) {
                    const invites = await db.select().from(dailyInvites).where(inArray(dailyInvites.masterTeamMemberId, memberIds));
                    counts.dailyInvites = invites.length;
                }
            }

            const dAssignments = await db.select().from(dailyAssignments).where(inArray(dailyAssignments.jobId, jobIds));
            const assignmentIds = dAssignments.map(a => a.id);
            counts.dailyAssignments = assignmentIds.length;

            if (assignmentIds.length > 0) {
                const attRecords = await db.select().from(attendance).where(inArray(attendance.dailyAssignmentId, assignmentIds));
                const attIds = attRecords.map(a => a.id);
                counts.attendance = attIds.length;

                if (attIds.length > 0) {
                    const subs = await db.select().from(substitutions).where(inArray(substitutions.attendanceId, attIds));
                    counts.substitutions = subs.length;
                }

                const replAssign = await db.select().from(replacementAssignments).where(inArray(replacementAssignments.dailyAssignmentId, assignmentIds));
                counts.replacementAssignments = replAssign.length;
            }

            const updates = await db.select().from(jobUpdates).where(inArray(jobUpdates.jobId, jobIds));
            counts.jobUpdates = updates.length;

            const invoiceRecords = await db.select().from(invoices).where(inArray(invoices.jobId, jobIds));
            const invoiceIds = invoiceRecords.map(i => i.id);
            counts.invoices = invoiceIds.length;

            if (invoiceIds.length > 0) {
                const paymentRecords = await db.select().from(payments).where(inArray(payments.invoiceId, invoiceIds));
                counts.payments = paymentRecords.length;
                exportData = { invoices: invoiceRecords, payments: paymentRecords };
            }

            const ratingRecords = await db.select().from(ratings).where(inArray(ratings.jobId, jobIds));
            counts.ratings = ratingRecords.length;
        } else {
            const history = await db.select().from(jobStatusHistory).where(eq(jobStatusHistory.requestId, requestId));
            counts.jobStatusHistory = history.length;
        }

        return { success: true, counts, exportData };
    } catch (e: any) {
        return { success: false, message: e.message || "Failed to fetch delete warning" };
    }
}

export async function deleteRequestCascadingAction(requestId: string): Promise<ActionResult> {
    try {
        await requireRole("admin");
        
        const jobRecords = await db.select().from(jobs).where(eq(jobs.requestId, requestId));
        const jobIds = jobRecords.map(j => j.id);

        if (jobIds.length > 0) {
            const invoiceRecords = await db.select().from(invoices).where(inArray(invoices.jobId, jobIds));
            const invoiceIds = invoiceRecords.map(i => i.id);
            if (invoiceIds.length > 0) {
                await db.delete(payments).where(inArray(payments.invoiceId, invoiceIds));
            }

            const dAssignments = await db.select().from(dailyAssignments).where(inArray(dailyAssignments.jobId, jobIds));
            const assignmentIds = dAssignments.map(a => a.id);
            
            if (assignmentIds.length > 0) {
                const attRecords = await db.select().from(attendance).where(inArray(attendance.dailyAssignmentId, assignmentIds));
                const attIds = attRecords.map(a => a.id);
                if (attIds.length > 0) {
                    await db.delete(substitutions).where(inArray(substitutions.attendanceId, attIds));
                }
                await db.delete(replacementAssignments).where(inArray(replacementAssignments.dailyAssignmentId, assignmentIds));
                await db.delete(attendance).where(inArray(attendance.dailyAssignmentId, assignmentIds));
            }

            const mTeams = await db.select().from(masterTeams).where(inArray(masterTeams.jobId, jobIds));
            const masterTeamIds = mTeams.map(t => t.id);
            if (masterTeamIds.length > 0) {
                const members = await db.select().from(masterTeamMembers).where(inArray(masterTeamMembers.masterTeamId, masterTeamIds));
                const memberIds = members.map(m => m.id);
                if (memberIds.length > 0) {
                    await db.delete(dailyInvites).where(inArray(dailyInvites.masterTeamMemberId, memberIds));
                }
                await db.delete(masterTeamMembers).where(inArray(masterTeamMembers.masterTeamId, masterTeamIds));
            }

            await db.delete(invoices).where(inArray(invoices.jobId, jobIds));
            await db.delete(dailyAssignments).where(inArray(dailyAssignments.jobId, jobIds));
            await db.delete(masterTeams).where(inArray(masterTeams.jobId, jobIds));
            await db.delete(ratings).where(inArray(ratings.jobId, jobIds));
            await db.delete(jobUpdates).where(inArray(jobUpdates.jobId, jobIds));
            await db.delete(jobStatusHistory).where(or(eq(jobStatusHistory.requestId, requestId), inArray(jobStatusHistory.jobId, jobIds)));
            await db.delete(jobs).where(inArray(jobs.id, jobIds));
        } else {
            await db.delete(jobStatusHistory).where(eq(jobStatusHistory.requestId, requestId));
        }

        await db.delete(requests).where(eq(requests.id, requestId));

        revalidatePath('/admin/requests');
        revalidatePath('/admin/jobs');

        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message || "Failed to cascade delete request" };
    }
}

/**
 * Admin Action: Finalize a request by marking as Completed.
 */
export async function finalizeRequestAction(requestId: string) {
    try {
        await requireRole("admin");

        const requestRecord = await db.query.requests.findFirst({ where: eq(requests.id, requestId) });
        if (!requestRecord || requestRecord.status !== "Work_Completed") {
            return { success: false, message: "Request not found or not in Work_Completed state" };
        }

        const jobRecord = await db.query.jobs.findFirst({ where: eq(jobs.requestId, requestId) });
        if (!jobRecord) return { success: false, message: "Request has no associated job" };
        
        const jobId = jobRecord.id;
        // 2. Mark Job as Completed
        await db.update(jobs)
            .set({ status: "Completed" })
            .where(eq(jobs.id, jobId));

        // 3. Mark Request as Completed
        await db.update(requests)
            .set({ status: "Completed", updatedAt: new Date() })
            .where(eq(requests.id, requestId));

        // 4. Log and notify
        await logStatusChange(jobId, requestId, "Work_Completed", "Completed");

        revalidatePath(`/admin/requests/${requestId}`);
        revalidatePath('/admin/requests');
        revalidatePath('/admin/jobs');

        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message || "Failed to finalize request" };
    }
}

/**
 * Admin Action: Fetch attendance records for a specific technician in a given month.
 */
export async function getTechnicianWorkCalendarAction(technicianId: string, month: number, year: number) {
    try {
        await requireRole("admin");

        const startOfMonth = new Date(year, month - 1, 1);
        const startDateStr = startOfMonth.toISOString().split('T')[0];
        
        const lastDayOfMonth = new Date(year, month, 0);
        const endDateStr = lastDayOfMonth.toISOString().split('T')[0];

        const results = await db.select({
            id: attendance.id,
            status: attendance.status,
            checkInTime: attendance.checkInTime,
            checkOutTime: attendance.checkOutTime,
            createdAt: attendance.createdAt,
            workDate: dailyAssignments.workDate,
            companyName: companies.companyName,
            serviceType: requests.serviceType,
            jobId: jobs.id
        })
        .from(attendance)
        .innerJoin(dailyAssignments, eq(attendance.dailyAssignmentId, dailyAssignments.id))
        .innerJoin(jobs, eq(dailyAssignments.jobId, jobs.id))
        .innerJoin(requests, eq(jobs.requestId, requests.id))
        .innerJoin(companies, eq(requests.companyId, companies.id))
        .where(
            sql`${attendance.technicianId} = ${technicianId} 
            AND ${attendance.status} = 'Present'
            AND TO_CHAR(COALESCE(${dailyAssignments.workDate}, ${attendance.createdAt}::date), 'YYYY-MM-DD') >= ${startDateStr} 
            AND TO_CHAR(COALESCE(${dailyAssignments.workDate}, ${attendance.createdAt}::date), 'YYYY-MM-DD') <= ${endDateStr}`
        )
        .orderBy(desc(sql`COALESCE(${dailyAssignments.workDate}, ${attendance.createdAt}::date)`));

        const mappedData = results.map(r => ({
            ...r,
            date: r.workDate || (r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : null),
            checkInTime: r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-",
            checkOutTime: r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"
        }));

        return { success: true, data: mappedData };
    } catch (e: any) {
        return { success: false, message: e.message || "Failed to fetch work calendar", data: [] };
    }
}

export async function getAdminStatsAction() {
    try {
        await requireRole("admin");
        const pendingCount = await db.select({ count: sql<number>`count(*)` }).from(requests).where(eq(requests.status, 'Requested'));
        const activeCount = await db.select({ count: sql<number>`count(*)` }).from(jobs).where(eq(jobs.status, 'In_Progress'));
        const completedCount = await db.select({ count: sql<number>`count(*)` }).from(jobs).where(or(eq(jobs.status, 'Completed'), eq(jobs.status, 'Work_Completed')));
        const usersCount = await db.select({ count: sql<number>`count(*)` }).from(users);
        const pendingTechs = await db.select({ count: sql<number>`count(*)` }).from(technicians).where(eq(technicians.status, 'Pending'));
        
        return { 
            success: true, 
            data: {
                pendingRequests: Number(pendingCount[0].count),
                activeJobs: Number(activeCount[0].count),
                completedJobs: Number(completedCount[0].count),
                totalUsers: Number(usersCount[0].count),
                pendingTechs: Number(pendingTechs[0].count),
                zoneAlerts: 0
            }
        };
    } catch (e) {
        return { success: false, data: null };
    }
}

export async function getActivityFeedAction() {
    try {
        await requireRole("admin");
        const recentReqs = await db.select({
            request: requests,
            company: companies
        }).from(requests).leftJoin(companies, eq(requests.companyId, companies.id)).orderBy(desc(requests.createdAt)).limit(10);
        const activity = recentReqs.map(r => ({
            id: r.request.id,
            type: 'request',
            title: r.company?.companyName || "New Request",
            subtitle: r.request.serviceType,
            status: r.request.status,
            requestId: r.request.id
        }));
        return { success: true, data: activity };
    } catch (e) {
        return { success: false, data: [] };
    }
}
