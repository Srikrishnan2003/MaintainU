"use server"

import { db } from "@/lib/db";
import { requests, technicians, jobs, companies, attendance, dailyAssignments as dailyAssignmentsTable, jobUpdates, users, serviceTypeEnum, priorityEnum, masterTeams, masterTeamMembers } from "@/db/schema";
import { UTApi } from "uploadthing/server";
import { generateJobReportPDF } from "@/services/pdf.service";
import { emitJobStatusUpdate } from "@/lib/event-emitter";

const utapi = new UTApi();
import { eq, and, isNull, sql, desc, ne, gte, lte, ilike, or, asc, inArray } from "drizzle-orm";
import { requireRole, getSession } from "@/services/auth.service";
import { revalidatePath } from "next/cache";
import { logStatusChange } from "@/services/audit.service";
import { createNotification } from "@/services/notification.service";
import { validateAction, jobActionSchema, attendanceLocationSchema, ActionResult } from "@/lib/validations/actions";
import { getCompanyUserIdFromJob } from "@/services/job.service";
import { validateJobTransition } from "@/lib/state-machine";
import { calculateAndSaveScoreAction } from "@/actions/scoring.action";

/**
 * Technician Action: Transitions job from ASSIGNED -> IN_PROGRESS
 */
export async function startJob(requestId: string) {
    try {
        const user = await requireRole("technician");

        // Lookup Technician explicitly associated with this user
        const techRecords = await db.select().from(technicians).where(eq(technicians.userId, user.userId)).limit(1);
        const techRecord = techRecords[0];

        if (!techRecord) return { success: false, message: "Technician profile not found" };

        const requestRecords = await db.select().from(requests).where(eq(requests.id, requestId)).limit(1);
        const requestRecord = requestRecords[0];

        if (!requestRecord) return { success: false, message: "Request not found" };

        // 1. Validate Ownership
        if (requestRecord.technicianId !== techRecord.id) {
            return { success: false, message: "Forbidden: You are not assigned to this job" };
        }

        // 2. Validate Origin State (Strict State Machine)
        if (!validateJobTransition(requestRecord.status, "IN_PROGRESS")) {
            return { 
                success: false, 
                message: `Invalid transition from ${requestRecord.status} to IN_PROGRESS.` 
            };
        }

        // 3. Update & Store Timestamp
        await db.update(requests).set({
            status: "IN_PROGRESS",
            startedAt: new Date(),
            updatedAt: new Date()
        }).where(eq(requests.id, requestId));

        // 4. Audit Log
        await logStatusChange(null, requestId, requestRecord.status, "IN_PROGRESS");
        
        const job = await db.query.jobs.findFirst({ where: eq(jobs.requestId, requestId) });
        if (job) emitJobStatusUpdate(job.id, requestId, requestRecord.companyId || "", job.leadTechnicianId || techRecord.id || "", "IN_PROGRESS", new Date());

        return { success: true, message: "Job successfully started" };

    } catch (error: any) {
        console.error("startJob error:", error);
        return { success: false, message: error.message || "Failed to start job" };
    }
}

/**
 * Technician Action: Transitions job from IN_PROGRESS -> COMPLETED with signature sign-off.
 */
export async function completeJob(jobId: string, signature: string) {
    try {
        const user = await requireRole("technician");

        const techRecords = await db.select().from(technicians).where(eq(technicians.userId, user.userId)).limit(1);
        const techRecord = techRecords[0];

        if (!techRecord) return { success: false, message: "Technician profile not found" };

        const jobRecord = await db.query.jobs.findFirst({ where: eq(jobs.id, jobId) });
        if (!jobRecord) return { success: false, message: "Job not found" };

        const requestId = jobRecord.requestId;
        const requestRecords = await db.select().from(requests).where(eq(requests.id, requestId)).limit(1);
        const requestRecord = requestRecords[0];

        if (!requestRecord) return { success: false, message: "Request not found" };

        // 1. Validate Ownership (Only Lead Technician)
        let isAuthorized = requestRecord.technicianId === techRecord.id || jobRecord.leadTechnicianId === techRecord.id;

        if (!isAuthorized) {
            return { success: false, message: "Forbidden: You are not authorized to complete this job" };
        }

        // 2. Validate Origin State
        // In the new system, we trust the state machine more, but for migration compatibility, 
        // we check both job and request status.

        // 3. Sequential Completion (Neon HTTP does not support transactions)
        // Update Job
        await db.update(jobs)
            .set({
                status: "Work_Completed",
                completedAt: new Date(),
                signatureUrl: signature
            })
            .where(eq(jobs.id, jobId));

        // Update Request
        await db.update(requests)
            .set({
                status: "Work_Completed",
                updatedAt: new Date()
            })
            .where(eq(requests.id, requestId));

        // Close Attendance
        const assignment = await db.query.dailyAssignments.findFirst({
            where: eq(dailyAssignmentsTable.jobId, jobId),
            orderBy: (assignments, { desc }) => [desc(assignments.id)]
        });

        if (assignment) {
            await db.update(attendance)
                .set({ checkOutTime: new Date() })
                .where(
                    and(
                        eq(attendance.dailyAssignmentId, assignment.id),
                        isNull(attendance.checkOutTime)
                    )
                );
        }

        // 4. Notifications & Logs
        await logStatusChange(jobId, requestId, requestRecord.status, "Work_Completed");
        emitJobStatusUpdate(jobId, requestId, requestRecord.companyId || "", jobRecord.leadTechnicianId || "", "Work_Completed", new Date());

        const companyUserId = await getCompanyUserIdFromJob(jobId);
        if (companyUserId) {
            await createNotification(
                companyUserId,
                'Job_Update',
                'Job Ready for Review',
                `Technician has completed the work and captured the signature for ${jobId.slice(0, 8)}. Please review.`,
                `/company/requests/${requestId}`
            );
        }

        // Fire-and-forget score recalculation
        try {
            calculateAndSaveScoreAction(techRecord.id).catch((err) => {
                console.error("Silent score recalculation error (completeJob):", err);
            });
        } catch (err) {
            console.error("Silent score recalculation error (completeJob):", err);
        }

        return { success: true, message: "Job marked as completed" };

    } catch (error: any) {
        console.error("completeJob error:", error);
        return { success: false, message: error.message || "Failed to complete job" };
    }
}

/**
 * Technician Action: Respond to an invitation for a specific request.
 */
export async function respondToJobInviteAction(requestIdOrJobId: string, accept: boolean, reason?: string) {
    try {
        const user = await requireRole("technician");
        
        let req = await db.query.requests.findFirst({ where: eq(requests.id, requestIdOrJobId) });
        if (!req) {
            // Check if it's a job ID
            const job = await db.query.jobs.findFirst({ where: eq(jobs.id, requestIdOrJobId) });
            if (job) {
                req = await db.query.requests.findFirst({ where: eq(requests.id, job.requestId) });
            }
        }
        
        if (!req) return { success: false, message: "Request or Job not found" };

        const requestId = req.id;

        const nextStatus = accept ? "Accepted" : "Declined";

        const jobRecord = await db.query.jobs.findFirst({ where: eq(jobs.requestId, requestId) });
        if (!jobRecord) return { success: false, message: "Job not found" };

        const tech = await db.query.technicians.findFirst({ where: eq(technicians.userId, user.userId) });
        if (tech) {
            const masterTeam = await db.query.masterTeams.findFirst({ where: eq(masterTeams.jobId, jobRecord.id) });
            if (masterTeam) {
                await db.update(masterTeamMembers)
                    .set({ status: nextStatus })
                    .where(and(
                        eq(masterTeamMembers.masterTeamId, masterTeam.id),
                        eq(masterTeamMembers.technicianId, tech.id)
                    ));
            }
            
            if (accept && (req.status === 'Assigned' || req.status === 'Pending_Assign' || jobRecord.status === 'Assigned')) {
                const updatedStatus = masterTeam ? "Team_Confirmed" : "Accepted";
                await db.update(requests).set({ status: updatedStatus, updatedAt: new Date() }).where(eq(requests.id, requestId));
                await db.update(jobs).set({ status: updatedStatus, updatedAt: new Date() }).where(eq(jobs.id, jobRecord.id));
                await logStatusChange(jobRecord.id, requestId, req.status, updatedStatus);
                emitJobStatusUpdate(jobRecord.id, requestId, req.companyId || "", jobRecord.leadTechnicianId || "", updatedStatus, new Date());
            }
        }

        revalidatePath('/technician/dashboard');
        revalidatePath('/technician/jobs');
        revalidatePath(`/technician/jobs/${requestIdOrJobId}`);

        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message || "Failed to respond to invite" };
    }
}

export async function finalizeJobAcceptanceAction(requestIdOrJobId: string): Promise<ActionResult> {
    try {
        await requireRole("admin");
        
        let req = await db.query.requests.findFirst({ where: eq(requests.id, requestIdOrJobId) });
        if (!req) {
            const job = await db.query.jobs.findFirst({ where: eq(jobs.id, requestIdOrJobId) });
            if (job) {
                req = await db.query.requests.findFirst({ where: eq(requests.id, job.requestId) });
            }
        }
        
        if (!req) return { success: false, message: "Request or Job not found" };

        const requestId = req.id;
        const nextStatus = "Accepted";

        if (!validateJobTransition(req.status, nextStatus)) {
            return { success: false, message: `Invalid transition from ${req.status} to ${nextStatus}` };
        }

        await db.update(requests).set({ status: nextStatus, updatedAt: new Date() }).where(eq(requests.id, requestId));
        
        const updateValues: any = { status: nextStatus, updatedAt: new Date() };
        const updatedJobs = await db.update(jobs).set(updateValues).where(eq(jobs.requestId, requestId)).returning();

        for (const job of updatedJobs) {
            await logStatusChange(job.id, requestId, req.status, nextStatus);
            emitJobStatusUpdate(job.id, requestId, req.companyId || "", job.leadTechnicianId || "", nextStatus, new Date());
        }

        revalidatePath('/admin/jobs');
        revalidatePath('/admin/requests');
        revalidatePath(`/admin/jobs/${requestIdOrJobId}`);
        revalidatePath(`/admin/requests/${requestIdOrJobId}`);

        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message || "Failed to finalize job" };
    }
}

export async function pauseJobAction(jobId: string, reason: string): Promise<ActionResult> {
    const validation = validateAction(jobActionSchema, { jobId, reason });
    if (!validation.success) {
        return validation;
    }
    const validatedData = validation.data;

    try {
        const user = await requireRole("technician");
        const job = await db.query.jobs.findFirst({ where: eq(jobs.id, jobId) });
        if (!job || !job.requestId) return { success: false, message: "Job not found" };
        
        const req = await db.query.requests.findFirst({ where: eq(requests.id, job.requestId) });
        if (!req) return { success: false, message: "Request not found" };

        if (!validateJobTransition(req.status, "On_Hold")) {
            return { success: false, message: `Invalid transition to On_Hold from ${req.status}` };
        }

        await db.update(requests).set({ status: "On_Hold" }).where(eq(requests.id, job.requestId));
        await db.update(jobs).set({ 
            status: "On_Hold",
            holdReason: validatedData.reason 
        }).where(eq(jobs.id, jobId));

        await logStatusChange(jobId, job.requestId, req.status, "On_Hold", validatedData.reason);
        emitJobStatusUpdate(jobId, req.id, req.companyId || "", job.leadTechnicianId || "", "On_Hold", new Date());
        
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message || "Failed to pause job" };
    }
}

export async function failJobAction(jobId: string, reason: string): Promise<ActionResult> {
    const validation = validateAction(jobActionSchema, { jobId, reason });
    if (!validation.success) {
        return validation;
    }
    const validatedData = validation.data;

    try {
        const user = await requireRole("technician");
        const job = await db.query.jobs.findFirst({ where: eq(jobs.id, jobId) });
        if (!job || !job.requestId) return { success: false, message: "Job not found" };
        
        const req = await db.query.requests.findFirst({ where: eq(requests.id, job.requestId) });
        if (!req) return { success: false, message: "Request not found" };

        if (!validateJobTransition(req.status, "Failed")) {
             return { success: false, message: `Invalid transition to Failed from ${req.status}` };
        }

        await db.update(requests).set({ status: "Failed" }).where(eq(requests.id, job.requestId));
        await db.update(jobs).set({ 
            status: "Failed",
            failureReason: validatedData.reason,
            failedAt: new Date()
        }).where(eq(jobs.id, jobId));

        await logStatusChange(jobId, job.requestId, req.status, "Failed", validatedData.reason);
        emitJobStatusUpdate(jobId, req.id, req.companyId || "", job.leadTechnicianId || "", "Failed", new Date());

        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message || "Failed to mark job as failed" };
    }
}

export async function getJobByIdAction(id: string) {
    try {
        const session = await getSession();
        if (!session) return { job: null };

        const result = await db.select({
            job: jobs,
            req: requests,
            comp: companies
        })
        .from(jobs)
        .innerJoin(requests, eq(jobs.requestId, requests.id))
        .leftJoin(companies, eq(requests.companyId, companies.id))
        .where(eq(jobs.id, id))
        .limit(1);

        if (result.length === 0) return { job: null };

        const { job, req, comp } = result[0];

        if (session.role === "company") {
            const companyRec = await db.query.companies.findFirst({ where: eq(companies.userId, session.userId) });
            if (!companyRec || req.companyId !== companyRec.id) return { job: null };
        } else if (session.role === "technician") {
            const tech = await db.query.technicians.findFirst({ where: eq(technicians.userId, session.userId) });
            if (!tech) return { job: null };
            
            let authorized = req.technicianId === tech.id || job.leadTechnicianId === tech.id;
            
            if (!authorized) {
                const teamMember = await db.select().from(masterTeamMembers)
                    .innerJoin(masterTeams, eq(masterTeamMembers.masterTeamId, masterTeams.id))
                    .where(and(eq(masterTeams.jobId, job.id), eq(masterTeamMembers.technicianId, tech.id)))
                    .limit(1);
                if (teamMember.length > 0) authorized = true;
            }
            
            if (!authorized) return { job: null };
        }

        const activeAttendances = await db.select({ 
                locationCheckIn: attendance.locationCheckIn,
                techName: users.name
            })
            .from(attendance)
            .innerJoin(dailyAssignmentsTable, eq(attendance.dailyAssignmentId, dailyAssignmentsTable.id))
            .innerJoin(technicians, eq(attendance.technicianId, technicians.id))
            .innerJoin(users, eq(technicians.userId, users.id))
            .where(and(
                eq(dailyAssignmentsTable.jobId, job.id),
                isNull(attendance.checkOutTime)
            ));
            
        const activeLocations = activeAttendances
            .filter(a => a.locationCheckIn)
            .map(a => {
                const parsed = typeof a.locationCheckIn === 'string' ? JSON.parse(a.locationCheckIn) : a.locationCheckIn;
                return {
                    lat: parsed.latitude || parsed.lat,
                    lng: parsed.longitude || parsed.lng,
                    name: a.techName
                };
            })
            .filter(loc => loc.lat !== undefined && loc.lng !== undefined);

        let hasActiveSession = false;
        let isLead = false;
        if (session && session.role === "technician") {
            const tech = await db.query.technicians.findFirst({ where: eq(technicians.userId, session.userId) });
            if (tech) {
                const myActiveSession = await db.select({ id: attendance.id })
                    .from(attendance)
                    .innerJoin(dailyAssignmentsTable, eq(attendance.dailyAssignmentId, dailyAssignmentsTable.id))
                    .where(and(
                        eq(dailyAssignmentsTable.jobId, job.id),
                        eq(attendance.technicianId, tech.id),
                        isNull(attendance.checkOutTime)
                    ))
                    .limit(1);
                hasActiveSession = myActiveSession.length > 0;
                isLead = req.technicianId === tech.id || job.leadTechnicianId === tech.id;
            }
        }

        return {
            hasActiveSession,
            isLead,
            job: {
                id: job.id,
                requestId: req.id,
                technicianId: job.leadTechnicianId,
                company: comp?.companyName || "Unknown Company",
                address: comp?.address || "Address Placeholder",
                service: req.serviceType,
                description: req.description,
                supervisor: req.supervisorName,
                supervisorPhone: req.supervisorPhone,
                timeSlot: req.timeSlot || req.preferredTimeSlot || "Flexible",
                date: req.preferredDate ? String(req.preferredDate) : undefined,
                team: [],
                status: job.status,
                signatureUrl: job.signatureUrl,
                supervisorSignName: job.supervisorSignName,
                completedAt: job.completedAt,
                photos: req.photos || [],
                updates: (await db.select({
                    id: jobUpdates.id,
                    jobId: jobUpdates.jobId,
                    technicianId: jobUpdates.technicianId,
                    type: jobUpdates.type,
                    message: jobUpdates.message,
                    photos: jobUpdates.photos,
                    createdAt: jobUpdates.createdAt,
                    technicianName: users.name
                })
                .from(jobUpdates)
                .leftJoin(technicians, eq(jobUpdates.technicianId, technicians.id))
                .leftJoin(users, eq(technicians.userId, users.id))
                .where(eq(jobUpdates.jobId, job.id))
                .orderBy(desc(jobUpdates.createdAt))) || [],
                activeLocations,
                hasActiveSession
            }
        };
    } catch (e: any) {
        console.error("getJobByIdAction error:", e);
        return { job: null };
    }
}

export async function acceptJobAction(jobId: string) {
    try {
        const user = await requireRole("technician");
        await db.update(jobs)
            .set({ status: 'Team_Confirmed', updatedAt: new Date() })
            .where(eq(jobs.id, jobId));
            
        const job = await db.query.jobs.findFirst({ where: eq(jobs.id, jobId) });
        if (job) {
            const req = await db.query.requests.findFirst({ where: eq(requests.id, job.requestId) });
            emitJobStatusUpdate(jobId, job.requestId, req?.companyId || "", job.leadTechnicianId || "", "Team_Confirmed", new Date());
        }

        const companyUserId = await getCompanyUserIdFromJob(jobId);
        if (companyUserId) {
            await createNotification(
                companyUserId,
                'Job_Update',
                'Job Accepted',
                `A technician has accepted your request ${jobId.slice(0, 8)}.`,
                `/company/requests/${jobId}`
            );
        }

        return { success: true };
    } catch (e) {
        return { success: false, message: "Failed to accept job" };
    }
}

export async function checkInAction(jobId: string, location: any): Promise<ActionResult> {
    const validation = validateAction(attendanceLocationSchema, { jobId, ...location });
    if (!validation.success) {
        return validation;
    }
    const validatedData = validation.data;

    try {
        const user = await requireRole("technician");
        const job = await db.query.jobs.findFirst({ where: eq(jobs.id, jobId) });
        if (!job || !job.requestId) return { success: false, message: "Job not found" };

        if (['Work_Completed', 'Completed', 'Invoiced', 'Paid'].includes(job.status)) {
            return { success: false, message: "Job is already completed" };
        }

        const tech = await db.query.technicians.findFirst({ where: eq(technicians.userId, user.userId) });
        if (!tech) return { success: false, message: "Technician profile not found" };

        const todayStr = new Date().toISOString().split('T')[0];

        const [req, assignmentResult] = await Promise.all([
            db.query.requests.findFirst({ where: eq(requests.id, job.requestId) }),
            db.query.dailyAssignments.findFirst({
                where: and(
                    eq(dailyAssignmentsTable.jobId, jobId),
                    eq(dailyAssignmentsTable.workDate, todayStr)
                )
            })
        ]);
        
        if (!req) return { success: false, message: "Request not found" };

        let assignment = assignmentResult;

        if (!assignment) {
            [assignment] = await db.insert(dailyAssignmentsTable).values({
                jobId,
                workDate: todayStr,
                status: "Active"
            }).returning();
        }

        const openSession = await db.select().from(attendance)
            .where(and(
                eq(attendance.dailyAssignmentId, assignment.id),
                eq(attendance.technicianId, tech.id),
                isNull(attendance.checkOutTime)
            ))
            .limit(1);

        if (openSession.length > 0) {
            await db.update(attendance)
                .set({ locationCheckIn: JSON.stringify(validatedData) })
                .where(eq(attendance.id, openSession[0].id));
                
            // Ensure status is at least In_Progress even if session existed
            if (req.status === 'Accepted' || req.status === 'Team_Confirmed' || req.status === 'Arrived') {
                await db.update(requests).set({ status: 'In_Progress', updatedAt: new Date() }).where(eq(requests.id, job.requestId));
                await db.update(jobs).set({ status: 'In_Progress', updatedAt: new Date() }).where(eq(jobs.id, jobId));
                await logStatusChange(jobId, job.requestId, req.status, "In_Progress");
                emitJobStatusUpdate(jobId, req.id, req.companyId || "", job.leadTechnicianId || "", "In_Progress", new Date());
            }

            // We no longer insert a new jobUpdate on every background location tick
            // to prevent spamming the job feed with map cards.

            return { success: true, message: "Location updated" };
        }

        await db.insert(attendance).values({
            dailyAssignmentId: assignment.id,
            technicianId: tech.id,
            checkInTime: new Date(),
            locationCheckIn: JSON.stringify(validatedData),
            status: 'Present'
        });

        if (req.status === 'Accepted' || req.status === 'Team_Confirmed' || req.status === 'Arrived') {
            await db.update(requests).set({ status: 'In_Progress', updatedAt: new Date() }).where(eq(requests.id, job.requestId));
            await db.update(jobs).set({ status: 'In_Progress', updatedAt: new Date() }).where(eq(jobs.id, jobId));
            
            await logStatusChange(jobId, job.requestId, req.status, "In_Progress");
            emitJobStatusUpdate(jobId, req.id, req.companyId || "", job.leadTechnicianId || "", "In_Progress", new Date());
        }

        // Add a job update to reflect the location check-in on the Live Tracking feed
        await db.insert(jobUpdates).values({
            jobId,
            technicianId: tech.id,
            type: 'update',
            message: `Technician arrived and checked in. Location: [${validatedData.latitude.toFixed(4)}, ${validatedData.longitude.toFixed(4)}]`,
            photos: []
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message || "Failed to check-in" };
    }
}

export async function checkOutAction(jobId: string, location: any): Promise<ActionResult> {
    const validation = validateAction(attendanceLocationSchema, { jobId, ...location });
    if (!validation.success) {
        return validation;
    }
    const validatedData = validation.data;

    try {
        const user = await requireRole("technician");
        const job = await db.query.jobs.findFirst({ where: eq(jobs.id, jobId) });
        if (!job) return { success: false, message: "Job not found" };

        const tech = await db.query.technicians.findFirst({ where: eq(technicians.userId, user.userId) });
        if (!tech) return { success: false, message: "Technician profile not found" };

        const todayStr = new Date().toISOString().split('T')[0];
        
        const assignment = await db.query.dailyAssignments.findFirst({
            where: and(
                eq(dailyAssignmentsTable.jobId, jobId),
                eq(dailyAssignmentsTable.workDate, todayStr)
            )
        });

        if (!assignment) return { success: false, message: "No active assignment for today" };

        const openSession = await db.select().from(attendance)
            .where(and(
                eq(attendance.dailyAssignmentId, assignment.id),
                eq(attendance.technicianId, tech.id),
                isNull(attendance.checkOutTime)
            ))
            .limit(1);

        if (openSession.length > 0) {
            await db.update(attendance)
                .set({ 
                    checkOutTime: new Date()
                })
                .where(eq(attendance.id, openSession[0].id));

            return { success: true, message: "Checked out successfully" };
        }

        return { success: false, message: "No active check-in found" };
    } catch (e: any) {
        return { success: false, message: e.message || "Failed to check out" };
    }
}

export async function enterRestrictedAreaAction(jobId: string) {
    try {
        const user = await requireRole("technician");
        const job = await db.query.jobs.findFirst({ where: eq(jobs.id, jobId) });
        if (!job || !job.requestId) return { success: false, message: "Job not found" };

        const req = await db.query.requests.findFirst({ where: eq(requests.id, job.requestId) });
        if (!req) return { success: false, message: "Request not found" };

        if (!validateJobTransition(req.status, "In_Zone")) {
            return { success: false, message: "Invalid transition to In_Zone" };
        }

        await db.update(jobs)
            .set({ 
                status: 'In_Zone', 
                enteredAreaAt: new Date(),
                updatedAt: new Date() 
            })
            .where(eq(jobs.id, jobId));

        await db.update(requests)
            .set({ status: 'In_Zone', updatedAt: new Date() })
            .where(eq(requests.id, job.requestId));

        await logStatusChange(jobId, job.requestId, req.status, "In_Zone");
        emitJobStatusUpdate(jobId, req.id, req.companyId || "", job.leadTechnicianId || "", "In_Zone", new Date());
        
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message || "Failed to enter area" };
    }
}

export async function exitRestrictedAreaAction(jobId: string) {
    try {
        const user = await requireRole("technician");
        const job = await db.query.jobs.findFirst({ where: eq(jobs.id, jobId) });
        if (!job || !job.requestId) return { success: false, message: "Job not found" };

        const req = await db.query.requests.findFirst({ where: eq(requests.id, job.requestId) });
        if (!req) return { success: false, message: "Request not found" };

        if (!validateJobTransition(req.status, "Exited_Zone")) {
             return { success: false, message: "Invalid transition to Exited_Zone" };
        }

        await db.update(jobs)
            .set({ 
                status: 'Exited_Zone', 
                exitedAreaAt: new Date(),
                updatedAt: new Date() 
            })
            .where(eq(jobs.id, jobId));

        await db.update(requests)
            .set({ status: 'Exited_Zone', updatedAt: new Date() })
            .where(eq(requests.id, job.requestId));

        await logStatusChange(jobId, job.requestId, req.status, "Exited_Zone");
        emitJobStatusUpdate(jobId, req.id, req.companyId || "", job.leadTechnicianId || "", "Exited_Zone", new Date());

        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message || "Failed to exit area" };
    }
}

export async function adminResetAssignmentAction(jobId: string, reason: string = "Administrative reset") {
    try {
        await requireRole("admin");
        const job = await db.query.jobs.findFirst({ where: eq(jobs.id, jobId) });
        if (!job) throw new Error("Job not found");

        await db.update(jobs)
            .set({ status: 'Cancelled', updatedAt: new Date() })
            .where(eq(jobs.requestId, job.requestId));

        await db.update(requests)
            .set({ status: 'Pending_Assign', updatedAt: new Date() })
            .where(eq(requests.id, job.requestId));

        await logStatusChange(jobId, job.requestId, job.status, 'Pending_Assign', reason);
        const req = await db.query.requests.findFirst({ where: eq(requests.id, job.requestId) });
        emitJobStatusUpdate(jobId, job.requestId, req?.companyId || "", job.leadTechnicianId || "", 'Cancelled', new Date());

        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message || "Failed to reset assignment" };
    }
}

// ─── Filters for getJobsAction ───────────────────────────────────────
import type { Job } from "@/db/types";

export interface GetJobsFilters {
    status?: Job["status"];
    companyId?: string;
    technicianId?: string;  // technician UUID (from technicians table)
    dateFrom?: string;      // ISO date string e.g. "2025-01-01"
    dateTo?: string;        // ISO date string e.g. "2025-12-31"
    limit?: number;         // default 50
    offset?: number;        // default 0 (for pagination)
    search?: string;
    serviceType?: typeof serviceTypeEnum.enumValues[number];
    priority?: typeof priorityEnum.enumValues[number];
}

/**
 * Admin Action: Fetch all jobs with enriched company and technician details.
 * Supports optional filtering by status, company, technician, and date range.
 * Called by lib/api/index.ts → api.getJobs()
 */
export async function getJobsAction(filters?: GetJobsFilters) {
    try {
        const session = await requireRole(["admin", "technician"]);

        const pageLimit  = filters?.limit  ?? 50;
        const pageOffset = filters?.offset ?? 0;

        // ─── Build WHERE conditions dynamically ──────────────────────
        const conditions: any[] = [];
        let activeAttendanceMap: Record<string, boolean> = {};

        if (session.role === "technician") {
            const tech = await db.query.technicians.findFirst({
                where: eq(technicians.userId, session.userId)
            });
            if (!tech) {
                return { success: true, data: [] };
            }

            const activeAttendances = await db.select({ jobId: dailyAssignmentsTable.jobId })
                .from(attendance)
                .innerJoin(dailyAssignmentsTable, eq(attendance.dailyAssignmentId, dailyAssignmentsTable.id))
                .where(and(
                    eq(attendance.technicianId, tech.id),
                    isNull(attendance.checkOutTime)
                ));
            activeAttendances.forEach(a => {
                if (a.jobId) activeAttendanceMap[a.jobId] = true;
            });

            const teamMemberships = await db.select({ jobId: masterTeams.jobId })
                .from(masterTeamMembers)
                .innerJoin(masterTeams, eq(masterTeamMembers.masterTeamId, masterTeams.id))
                .where(and(
                    eq(masterTeamMembers.technicianId, tech.id),
                    eq(masterTeamMembers.status, 'Accepted')
                ));
                
            const memberJobIds = teamMemberships.map(m => m.jobId).filter(id => id !== null) as string[];
            
            if (memberJobIds.length > 0) {
                conditions.push(or(
                    eq(jobs.leadTechnicianId, tech.id),
                    inArray(jobs.id, memberJobIds)
                ));
            } else {
                conditions.push(eq(jobs.leadTechnicianId, tech.id));
            }
        }

        if (filters?.search) {
            conditions.push(or(ilike(users.name, `%${filters.search}%`), ilike(companies.companyName, `%${filters.search}%`)));
        }
        if (filters?.serviceType) {
            conditions.push(eq(requests.serviceType, filters.serviceType));
        }
        if (filters?.priority) {
            conditions.push(eq(requests.priority, filters.priority));
        }

        if (filters?.status) {
            conditions.push(eq(jobs.status, filters.status));
        }
        if (filters?.companyId) {
            conditions.push(eq(requests.companyId, filters.companyId));
        }
        if (filters?.technicianId) {
            conditions.push(eq(jobs.leadTechnicianId, filters.technicianId));
        }
        if (filters?.dateFrom) {
            conditions.push(gte(jobs.createdAt, new Date(filters.dateFrom)));
        }
        if (filters?.dateTo) {
            // Set to end of the provided day
            const end = new Date(filters.dateTo);
            end.setHours(23, 59, 59, 999);
            conditions.push(lte(jobs.createdAt, end));
        }

        conditions.push(sql`(${companies.companyName} != 'Internal Operations' OR ${companies.companyName} IS NULL)`);

        // ─── Query ──────────────────────────────────────────────────
        const result = await db
            .select({
                job:      jobs,
                req:      requests,
                comp:     companies,
                techUser: users,
            })
            .from(jobs)
            .innerJoin(requests,    eq(jobs.requestId,        requests.id))
            .leftJoin(companies,    eq(requests.companyId,    companies.id))
            .leftJoin(technicians,  eq(jobs.leadTechnicianId, technicians.id))
            .leftJoin(users,        eq(technicians.userId,    users.id))
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(jobs.createdAt))
            .limit(pageLimit)
            .offset(pageOffset);

        // ─── Shape ──────────────────────────────────────────────────
        const enrichedJobs = result.map(({ job, req, comp, techUser }) => ({
            id:              job.id,
            requestId:       job.requestId,
            status:          job.status,
            // Request / service info
            serviceType:     req.serviceType,
            description:     req.description,
            location:        req.location || comp?.address || "Unknown Location",
            priority:        req.priority,
            timeSlot:        req.timeSlot || req.preferredTimeSlot || null,
            preferredDate:   req.preferredDate ? String(req.preferredDate) : null,
            // Company info
            companyId:       req.companyId,
            companyName:     comp?.companyName || "Unknown Company",
            companyAddress:  comp?.address     || null,
            // Technician info
            technicianId:    job.leadTechnicianId  || null,
            technicianName:  techUser?.name        || null,
            // Timestamps
            scheduledStart:  job.scheduledStart,
            startedAt:       job.startedAt,
            completedAt:     job.completedAt,
            createdAt:       job.createdAt,
            updatedAt:       job.updatedAt,
            hasActiveSession: activeAttendanceMap[job.id] || false,
        }));

        return { success: true, data: enrichedJobs };
    } catch (e: any) {
        if (e.message !== "Forbidden: Insufficient role" && e.message !== "Unauthorized") {
            console.error("getJobsAction error:", e);
        }
        return { success: false, error: e.message || "Failed to fetch jobs", data: [] };
    }
}

/**
 * Admin Action: Generate PDF Report for a Job
 */
export async function generateJobReportPDFAction(jobId: string) {
    try {
        const session = await requireRole("admin");

        // Bespoke query for complete Job Report data
        const [jobCore] = await db.select({
            id: jobs.id,
            status: jobs.status,
            assignedAt: jobs.assignedAt,
            startedAt: jobs.startedAt,
            completedAt: jobs.completedAt,
            companyName: companies.companyName,
            serviceType: requests.serviceType,
            priority: requests.priority,
            description: requests.description,
            leadTechnicianName: users.name,
            masterTeamId: jobs.masterTeamId
        })
        .from(jobs)
        .innerJoin(requests, eq(jobs.requestId, requests.id))
        .leftJoin(companies, eq(requests.companyId, companies.id))
        .leftJoin(technicians, eq(jobs.leadTechnicianId, technicians.id))
        .leftJoin(users, eq(technicians.userId, users.id))
        .where(eq(jobs.id, jobId))
        .limit(1);

        if (!jobCore) {
            return { success: false, message: "Job not found" };
        }

        // Get team members if masterTeamId exists
        let teamMembers: string[] = [];
        if (jobCore.masterTeamId) {
            const members = await db.select({
                name: users.name
            })
            .from(masterTeamMembers)
            .innerJoin(technicians, eq(masterTeamMembers.technicianId, technicians.id))
            .innerJoin(users, eq(technicians.userId, users.id))
            .where(eq(masterTeamMembers.masterTeamId, jobCore.masterTeamId));
            
            teamMembers = members.map(m => m.name || "Unknown");
        }

        // Get Attendance Summary
        const attendanceData = await db.select({
            status: attendance.status
        })
        .from(dailyAssignmentsTable)
        .innerJoin(attendance, eq(attendance.dailyAssignmentId, dailyAssignmentsTable.id))
        .where(eq(dailyAssignmentsTable.jobId, jobId));

        const present = attendanceData.filter(a => a.status === "Present").length;
        const absent = attendanceData.filter(a => a.status === "Absent").length;
        const total = attendanceData.length;

        // Get Updates Log
        const updatesLog = await db.select()
        .from(jobUpdates)
        .where(eq(jobUpdates.jobId, jobId))
        .orderBy(desc(jobUpdates.createdAt));

        const mappedUpdates = updatesLog.map(u => ({
            status: u.type,
            message: u.message,
            photoCount: u.photos && Array.isArray(u.photos) ? u.photos.length : 0,
            createdAt: u.createdAt
        }));

        const fullJobData = {
            ...jobCore,
            teamMembers,
            attendanceSummary: { present, absent, total },
            updates: mappedUpdates
        };

        // Generate PDF
        const pdfBuffer = await generateJobReportPDF(fullJobData);

        // Upload to UploadThing
        const utFile = new File([new Uint8Array(pdfBuffer)], `job-report-${jobId}.pdf`, { type: "application/pdf" });
        const uploadResponse = await utapi.uploadFiles([utFile]);

        if (!uploadResponse || uploadResponse.length === 0 || uploadResponse[0].error) {
            console.error("UploadThing Error:", uploadResponse?.[0]?.error);
            return { success: false, message: "Failed to upload PDF" };
        }

        const pdfUrl = uploadResponse[0].data.url;

        return { success: true, data: { pdfUrl }, message: "Job Report generated successfully" };
    } catch (e: unknown) {
        const err = e as Error;
        console.error("generateJobReportPDFAction error:", err);
        return { success: false, message: "Failed to generate Job Report PDF" };
    }
}

