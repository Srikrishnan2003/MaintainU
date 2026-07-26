"use server"

import { db } from "@/lib/db";
import { jobs, requests, companies, technicians, users, masterTeams, masterTeamMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole } from "@/services/auth.service";
import { createNotification } from "@/services/notification.service";

/**
 * Shared Action: Fetches signature and job completion details for sharing.
 */
export async function getJobSignatureDetailsAction(jobId: string) {
    try {
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
            technicianId: technicians.id
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
