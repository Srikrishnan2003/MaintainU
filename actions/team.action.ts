"use server"

import { db } from "@/lib/db";
import { masterTeams, masterTeamMembers, technicians, users, notifications, requests, jobs } from "@/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { getSession, requireRole } from "@/services/auth.service";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/services/notification.service";

/**
 * Admin Action: Fetches the master team for a job.
 */
export async function getMasterTeamAction(requestIdOrJobId: string) {
    try {
        await requireRole("admin");
        
        let actualJobId = requestIdOrJobId;
        const req = await db.query.requests.findFirst({ where: eq(requests.id, requestIdOrJobId) });
        let job = null;
        if (req) {
            job = await db.query.jobs.findFirst({ where: eq(jobs.requestId, req.id) });
            if (!job) return { members: [], leadTechnicianId: null };
            actualJobId = job.id;
        } else {
            job = await db.query.jobs.findFirst({ where: eq(jobs.id, actualJobId) });
        }

        const masterTeam = await db.query.masterTeams.findFirst({ where: eq(masterTeams.jobId, actualJobId) });
        if (!masterTeam) return { members: [], leadTechnicianId: job?.leadTechnicianId || null };

        const members = await db.select({
            technicianId: masterTeamMembers.technicianId,
            status: masterTeamMembers.status,
            user: users,
            tech: technicians
        })
        .from(masterTeamMembers)
        .innerJoin(technicians, eq(masterTeamMembers.technicianId, technicians.id))
        .innerJoin(users, eq(technicians.userId, users.id))
        .where(eq(masterTeamMembers.masterTeamId, masterTeam.id));

        return {
            members: members.map(m => ({
                id: m.technicianId,
                name: m.user.name || m.user.phone,
                phone: m.user.phone,
                skill: m.tech.primarySkill,
                rating: m.tech.rating,
                status: m.status
            })),
            leadTechnicianId: job?.leadTechnicianId || null
        };
    } catch (e) {
        console.error("Get master team error:", e);
        return { members: [], leadTechnicianId: null };
    }
}

/**
 * Admin Action: Updates master team composition.
 */
export async function updateMasterTeamAction(requestIdOrJobId: string, techIds: string[]) {
    try {
        await requireRole("admin");

        // First, check if this ID is a request ID
        let actualJobId = requestIdOrJobId;
        const req = await db.query.requests.findFirst({ where: eq(requests.id, requestIdOrJobId) });
        
        if (req) {
            // It's a request ID. Check if a job already exists for it.
            let job = await db.query.jobs.findFirst({ where: eq(jobs.requestId, req.id) });
            if (!job) {
                // Create the job since it doesn't exist yet
                [job] = await db.insert(jobs).values({
                    requestId: req.id,
                    status: techIds.length > 0 ? 'Assigned' : 'Requested',
                    leadTechnicianId: techIds[0] || null,
                    assignedAt: new Date()
                }).returning();
            } else {
                // Update existing job
                await db.update(jobs).set({
                    status: techIds.length > 0 ? 'Assigned' : 'Requested',
                    leadTechnicianId: techIds[0] || null,
                    updatedAt: new Date()
                }).where(eq(jobs.id, job.id));
            }

            // Always sync request status and technician
            await db.update(requests).set({ 
                status: techIds.length > 0 ? 'Assigned' : 'Pending_Assign', 
                technicianId: techIds[0] || null,
                updatedAt: new Date() 
            }).where(eq(requests.id, req.id));
            actualJobId = job.id;
        } else {
            // Check if it's already a job ID
            const job = await db.query.jobs.findFirst({ where: eq(jobs.id, requestIdOrJobId) });
            if (!job) {
                return { success: false, message: "Invalid ID: Not a request or job" };
            }
        }

        let masterTeam = await db.query.masterTeams.findFirst({ where: eq(masterTeams.jobId, actualJobId) });

        if (!masterTeam) {
            [masterTeam] = await db.insert(masterTeams).values({ jobId: actualJobId, status: 'ACTIVE' }).returning();
        }

        const existingMembers = await db.select().from(masterTeamMembers).where(eq(masterTeamMembers.masterTeamId, masterTeam.id));

        // Add new members
        const toInsert = techIds.filter(id => !existingMembers.some(m => m.technicianId === id));
        const toReinvite = techIds.filter(id => existingMembers.some(m => m.technicianId === id && (m.status === 'Removed' || m.status === 'Declined')));
        
        const techsToNotify = [...toInsert, ...toReinvite];

        if (toInsert.length > 0) {
            await db.insert(masterTeamMembers).values(
                toInsert.map(id => ({ masterTeamId: masterTeam!.id, technicianId: id, status: 'Invited' }))
            );
        }

        if (toReinvite.length > 0) {
            await db.update(masterTeamMembers)
                .set({ status: 'Invited', addedAt: new Date() })
                .where(and(
                    eq(masterTeamMembers.masterTeamId, masterTeam!.id),
                    inArray(masterTeamMembers.technicianId, toReinvite)
                ));
        }

        if (techsToNotify.length > 0) {
            const techs = await db.select({ id: technicians.id, userId: technicians.userId })
                .from(technicians)
                .where(inArray(technicians.id, techsToNotify));

            for (const t of techs) {
                await createNotification(
                    t.userId,
                    'System',
                    'Master Team Invitation',
                    'You have been invited to join a Master Team.',
                    '/technician/dashboard'
                );
            }
        }

        // Remove unselected members
        const toRemove = existingMembers
            .filter(m => !techIds.includes(m.technicianId) && m.status !== 'Removed')
            .map(m => m.technicianId);

        if (toRemove.length > 0) {
            await db.update(masterTeamMembers)
                .set({ status: 'Removed' })
                .where(and(
                    eq(masterTeamMembers.masterTeamId, masterTeam!.id),
                    inArray(masterTeamMembers.technicianId, toRemove)
                ));
        }

        return { success: true };
    } catch (e) {
        console.error("Update master team error:", e);
        return { success: false };
    }
}

/**
 * Technician Action: Fetches any pending master team invites.
 */
export async function getTechnicianInviteAction() {
    try {
        const session = await getSession();
        if (!session) return { invite: null };

        const tech = await db.query.technicians.findFirst({ where: eq(technicians.userId, session.userId) });
        if (!tech) return { invite: null };

        const invite = await db.select({
            id: masterTeamMembers.id,
            status: masterTeamMembers.status,
            createdAt: masterTeamMembers.addedAt,
            jobId: masterTeams.jobId,
            serviceType: requests.serviceType,
            description: requests.description,
            timeSlot: requests.timeSlot,
            preferredDate: requests.preferredDate,
            ticketId: requests.id
        })
        .from(masterTeamMembers)
        .innerJoin(masterTeams, eq(masterTeamMembers.masterTeamId, masterTeams.id))
        .innerJoin(jobs, eq(masterTeams.jobId, jobs.id))
        .innerJoin(requests, eq(jobs.requestId, requests.id))
        .where(and(eq(masterTeamMembers.technicianId, tech.id), eq(masterTeamMembers.status, 'Invited')))
        .limit(1);

        return { invite: invite[0] || null };
    } catch (e) {
        return { invite: null };
    }
}

/**
 * Technician Action: Respond to a master team invitation.
 */
export async function respondToMasterTeamInviteAction(inviteId: string, accept: boolean) {
    try {
        await requireRole("technician");
        
        const invite = await db.query.masterTeamMembers.findFirst({ where: eq(masterTeamMembers.id, inviteId) });
        
        await db.update(masterTeamMembers)
            .set({ status: accept ? 'Accepted' : 'Declined' })
            .where(eq(masterTeamMembers.id, inviteId));
            
        if (accept && invite) {
            const masterTeam = await db.query.masterTeams.findFirst({ where: eq(masterTeams.id, invite.masterTeamId) });
            if (masterTeam) {
                const job = await db.query.jobs.findFirst({ where: eq(jobs.id, masterTeam.jobId) });
                if (job && (job.status === 'Pending_Assign' || job.status === 'Assigned')) {
                    const req = await db.query.requests.findFirst({ where: eq(requests.id, job.requestId) });
                    if (req) {
                        await db.update(requests).set({ status: 'Team_Confirmed', updatedAt: new Date() }).where(eq(requests.id, req.id));
                        await db.update(jobs).set({ status: 'Team_Confirmed', updatedAt: new Date() }).where(eq(jobs.id, job.id));
                    }
                }
            }
        }

        revalidatePath('/technician/dashboard');
        revalidatePath('/technician/jobs');
        revalidatePath('/admin/jobs');

        return { success: true };
    } catch (e) {
        console.error("respondToMasterTeamInviteAction error:", e);
        return { success: false };
    }
}
