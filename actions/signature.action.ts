"use server"

import { db } from "@/lib/db";
import { jobs, requests, companies, technicians, users, masterTeams, masterTeamMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole, getSession } from "@/services/auth.service";
import { createNotification } from "@/services/notification.service";

/**
 * Shared Action: Fetches signature and job completion details for sharing.
 */
export async function getJobSignatureDetailsAction(jobId: string) {
    try {
        const session = await getSession();
        if (!session) return { success: false, message: "Unauthorized" };

        const result = await db.select({
            jobId: jobs.id,
            signatureUrl: jobs.signatureUrl,
            completedAt: jobs.completedAt,
            requestId: requests.id,
            description: requests.description,
            serviceType: requests.serviceType,
            companyName: companies.companyName,
            companyAddress: companies.address,
            technicianName: users.name,
            technicianId: technicians.id,
            companyUserId: companies.userId,
            requestTechnicianId: requests.technicianId
        })
        .from(jobs)
        .innerJoin(requests, eq(jobs.requestId, requests.id))
        .innerJoin(companies, eq(requests.companyId, companies.id))
        .leftJoin(technicians, eq(jobs.leadTechnicianId, technicians.id))
        .leftJoin(users, eq(technicians.userId, users.id))
        .where(eq(jobs.id, jobId))
        .limit(1);

        if (result.length === 0) return { success: false, message: "Job not found" };

        const job = result[0];

        if (session.role === "company") {
            if (job.companyUserId !== session.userId) return { success: false, message: "Unauthorized" };
        } else if (session.role === "technician") {
            const tech = await db.query.technicians.findFirst({ where: eq(technicians.userId, session.userId) });
            if (!tech) return { success: false, message: "Unauthorized" };
            
            let authorized = job.requestTechnicianId === tech.id || job.technicianId === tech.id;
            
            if (!authorized) {
                const teamMember = await db.select().from(masterTeamMembers)
                    .innerJoin(masterTeams, eq(masterTeamMembers.masterTeamId, masterTeams.id))
                    .where(and(eq(masterTeams.jobId, jobId), eq(masterTeamMembers.technicianId, tech.id)))
                    .limit(1);
                if (teamMember.length > 0) authorized = true;
            }
            
            if (!authorized) return { success: false, message: "Unauthorized" };
        }

        const teamMembers = await db.select({
            name: users.name,
            skill: technicians.primarySkill
        })
        .from(masterTeamMembers)
        .innerJoin(technicians, eq(masterTeamMembers.technicianId, technicians.id))
        .innerJoin(users, eq(technicians.userId, users.id))
        .innerJoin(masterTeams, eq(masterTeamMembers.masterTeamId, masterTeams.id))
        .where(eq(masterTeams.jobId, jobId));

        return {
            success: true,
            signatureDetails: {
                ...job,
                teamMembers,
                signedBy: job.technicianName || 'Team Lead',
                signedAt: job.completedAt
            }
        };
    } catch (e) {
        return { success: false, message: "Failed to get signature details" };
    }
}

/**
 * Technician/Admin Action: Shares job signature details with company and admins.
 */
export async function shareSignatureAction(jobId: string) {
    try {
        const details = await getJobSignatureDetailsAction(jobId);
        if (!details.success) return details;

        const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin'));
        const companyUser = await db.select({ userId: companies.userId })
            .from(jobs)
            .innerJoin(requests, eq(jobs.requestId, requests.id))
            .innerJoin(companies, eq(requests.companyId, companies.id))
            .where(eq(jobs.id, jobId));

        for (const admin of admins) {
            await createNotification(
                admin.id,
                'Job_Update',
                'Job Completed - Signature Received',
                `Job ${jobId.slice(0, 8)} finalized.`,
                `/admin/requests/${jobId}`
            );
        }

        if (companyUser[0]) {
            await createNotification(
                companyUser[0].userId,
                'Job_Update',
                'Work Signed Off',
                `Your request has been signed off by ${details.signatureDetails?.signedBy}.`,
                `/company/requests/${jobId}`
            );
        }

        return { success: true, message: "Signature shared." };
    } catch (e) {
        return { success: false };
    }
}
