"use server";

import { db } from "@/lib/db";
import { requests, companies, users, jobs, technicians, masterTeams, masterTeamMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole, getSession } from "@/services/auth.service";
import { logStatusChange } from "@/services/audit.service";
import { validateJobTransition } from "@/lib/state-machine";
import { validateAction, createRequestSchema, reviewRequestSchema, ActionResult } from "@/lib/validations/actions";

/**
 * Company Action: Formulate a new service request.
 * Migrated and enhanced from legacy createRequestAction.
 */
export async function createRequest(data: any): Promise<ActionResult<any>> {
    const validation = validateAction(createRequestSchema, data);
    if (!validation.success) {
        return validation;
    }
    const validatedData = validation.data;

    try {
        const user = await requireRole("company");

        // 1. Resolve Company Profile
        const companyResult = await db.select().from(companies).where(eq(companies.userId, user.userId)).limit(1);
        let companyId = companyResult[0]?.id;

        if (!companyId) {
            // Auto-recovery for missing profiles
            const userRecord = await db.query.users.findFirst({ where: eq(users.id, user.userId) });
            const [newProfile] = await db.insert(companies).values({
                userId: user.userId,
                companyName: userRecord?.name || "Default Company",
                address: "Address Pending",
                industryType: "General"
            }).returning();
            companyId = newProfile.id;
        }

        // 2. Insert Request
        const [newReq] = await db.insert(requests).values({
            companyId: companyId,
            priority: validatedData.priority,
            description: validatedData.description,
            serviceType: validatedData.serviceType,
            timeSlot: validatedData.timeSlot || validatedData.preferredTimeSlot,
            preferredDate: validatedData.date || validatedData.preferredDate,
            supervisorName: validatedData.supervisor || validatedData.supervisorName,
            supervisorPhone: validatedData.supervisorPhone,
            photos: validatedData.photos || [],
            location: validatedData.location,
            status: "Requested"
        }).returning();

        await logStatusChange(null, newReq.id, null, "Requested", "Initial request creation");

        return { success: true, id: newReq.id, data: newReq };
    } catch (e: any) {
        console.error("Create request error:", e);
        return { success: false, message: e.message || "Failed to create request" };
    }
}

/**
 * Admin Action: Review and transition a request status.
 */
export async function reviewRequestAction(requestId: string, status: any, reason?: string): Promise<ActionResult> {
    const validation = validateAction(reviewRequestSchema, { requestId, status, reason });
    if (!validation.success) {
        return validation;
    }
    const validatedStatus = validation.data.status;
    const rejectionReason = validation.data.reason;

    try {
        await requireRole("admin");
        const req = await db.query.requests.findFirst({ where: eq(requests.id, requestId) });
        if (!req) return { success: false, message: "Request not found" };

        if (!validateJobTransition(req.status, validatedStatus)) {
            return { success: false, message: `Invalid transition from ${req.status} to ${validatedStatus}` };
        }

        const updateData: any = { status: validatedStatus, updatedAt: new Date() };
        if (validatedStatus === 'Rejected' && rejectionReason) {
            updateData.rejectionReason = rejectionReason;
            updateData.rejectedAt = new Date();
        }

        await db.update(requests).set(updateData).where(eq(requests.id, requestId));
        await logStatusChange(null, requestId, req.status, validatedStatus, rejectionReason || undefined);
        
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message || "Failed to review request" };
    }
}

/**
 * Shared Action: Fetch detailed request data.
 */
export async function getRequestByIdAction(id: string) {
    try {
        const session = await getSession();
        if (!session) return { request: null };

        const result = await db.select({
            request: requests,
            company: companies,
            job: jobs
        })
        .from(requests)
        .leftJoin(companies, eq(requests.companyId, companies.id))
        .leftJoin(jobs, eq(requests.id, jobs.requestId))
        .where(eq(requests.id, id))
        .limit(1);

        if (result.length === 0) return { request: null };

        const req = result[0].request;
        const job = result[0].job;

        if (session.role === "company") {
            const comp = await db.query.companies.findFirst({ where: eq(companies.userId, session.userId) });
            if (!comp || req.companyId !== comp.id) return { request: null };
        } else if (session.role === "technician") {
            const tech = await db.query.technicians.findFirst({ where: eq(technicians.userId, session.userId) });
            if (!tech) return { request: null };
            
            // Allow if assigned directly to request
            let authorized = req.technicianId === tech.id;
            
            // Or if they are the lead technician on the job
            if (!authorized && job && job.leadTechnicianId === tech.id) {
                authorized = true;
            }
            
            // Or if they are in the master team
            if (!authorized && job) {
                const teamMember = await db.select().from(masterTeamMembers)
                    .innerJoin(masterTeams, eq(masterTeamMembers.masterTeamId, masterTeams.id))
                    .where(and(eq(masterTeams.jobId, job.id), eq(masterTeamMembers.technicianId, tech.id)))
                    .limit(1);
                if (teamMember.length > 0) authorized = true;
            }
            
            if (!authorized) return { request: null };
        }

        return {
            request: {
                ...result[0].request,
                companyName: result[0].company?.companyName || "Unknown Company",
                jobId: result[0].job?.id || null
            }
        };
    } catch (e: any) {
        console.error("getRequestByIdAction error:", e);
        return { request: null };
    }
}

/**
 * Company Action: Delete/Cancel a request if it hasn't started.
 */
export async function deleteRequestAction(id: string) {
    try {
        const user = await requireRole("company");
        const req = await db.query.requests.findFirst({ where: eq(requests.id, id) });
        
        if (!req) return { success: false, message: "Request not found" };
        
        // Ownership check
        const company = await db.query.companies.findFirst({ where: eq(companies.userId, user.userId) });
        if (!company || req.companyId !== company.id) return { success: false, message: "Unauthorized" };

        // Status check (Optional: only allow deleting 'Requested' or 'Pending_Assign')
        if (req.status !== 'Requested' && req.status !== 'Pending_Assign') {
            return { success: false, message: "Cannot delete a request that is already being processed" };
        }

        await db.delete(requests).where(eq(requests.id, id));
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message || "Failed to delete request" };
    }
}
