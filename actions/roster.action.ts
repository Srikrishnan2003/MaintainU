"use server"

import { db } from "@/lib/db";
import { dailyAssignments as dailyAssignmentsTable, attendance, technicians, jobs, requests, companies, users, masterTeams, masterTeamMembers, dailyInvites } from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { getSession, requireRole } from "@/services/auth.service";
import { createNotification } from "@/services/notification.service";

/**
 * Internal Helper: Get or create a "Standby" job for general operations/roster tracking.
 */
async function getOrCreateStandbyJob() {
    let internalCompany = await db.query.companies.findFirst({
        where: eq(companies.companyName, "Internal Operations")
    });

    if (!internalCompany) {
        const phone = "0000000000";
        let internalUser = await db.query.users.findFirst({ where: eq(users.phone, phone) });

        if (!internalUser) {
            [internalUser] = await db.insert(users).values({
                phone,
                role: 'company',
                status: 'ACTIVE',   // Must be a valid statusEnum value
                name: 'Internal Ops'
            }).returning();
        }

        [internalCompany] = await db.insert(companies).values({
            userId: internalUser.id,
            companyName: "Internal Operations",
            address: "HQ"
        }).returning();
    }

    let standbyRequest = await db.query.requests.findFirst({
        where: and(
            eq(requests.companyId, internalCompany.id),
            eq(requests.serviceType, "GENERAL") // "GENERAL" is used as the sentinel serviceType for internal standby
        )
    });

    if (!standbyRequest) {
        // This is a system-internal sentinel record, not a real customer request.
        // serviceType "GENERAL" is the closest valid value for internal ops.
        // priority is plain text (not a DB enum) so any string is safe here.
        [standbyRequest] = await db.insert(requests).values({
            companyId: internalCompany.id,
            description: "General Standby & Operations",
            priority: "Low",
            serviceType: "GENERAL",
            status: "In_Progress"
        }).returning();
    }

    let standbyJob = await db.query.jobs.findFirst({
        where: eq(jobs.requestId, standbyRequest.id)
    });

    if (!standbyJob) {
        [standbyJob] = await db.insert(jobs).values({
            requestId: standbyRequest.id,
            status: "In_Progress"
        }).returning();
    }

    return standbyJob.id;
}

/**
 * Admin Action: Create a daily roster for specific technicians.
 */
export async function createDailyRosterAction(techIds: string[], date?: string) {
    try {
        await requireRole("admin");
        const jobId = await getOrCreateStandbyJob();
        const targetDate = date || new Date().toISOString().split('T')[0];
        let count = 0;

        const masterTeam = await db.query.masterTeams.findFirst({ where: eq(masterTeams.jobId, jobId) });
        const masterMemberIds = masterTeam ?
            (await db.select({ id: masterTeamMembers.technicianId }).from(masterTeamMembers).where(eq(masterTeamMembers.masterTeamId, masterTeam.id))).map(m => m.id)
            : [];

        for (const techId of techIds) {
            let dailyAssignment = await db.query.dailyAssignments.findFirst({
                where: and(eq(dailyAssignmentsTable.jobId, jobId), eq(dailyAssignmentsTable.workDate, targetDate))
            });

            if (!dailyAssignment) {
                [dailyAssignment] = await db.insert(dailyAssignmentsTable).values({
                    jobId,
                    workDate: targetDate,
                    status: 'Active'
                }).returning();
            }

            const existingAttendance = await db.query.attendance.findFirst({
                where: and(eq(attendance.dailyAssignmentId, dailyAssignment.id), eq(attendance.technicianId, techId))
            });

            if (!existingAttendance) {
                const isReplacement = !masterMemberIds.includes(techId);

                await db.insert(attendance).values({
                    dailyAssignmentId: dailyAssignment.id,
                    technicianId: techId,
                    status: isReplacement ? 'Replacement' : 'Present',
                    checkInTime: targetDate === new Date().toISOString().split('T')[0] ? new Date() : null,
                });

                if (targetDate === new Date().toISOString().split('T')[0]) {
                    await db.update(technicians).set({ status: 'ACTIVE' }).where(eq(technicians.id, techId));
                }
                count++;
            }
        }

        return { success: true, count };
    } catch (e) {
        console.error("Roster error:", e);
        return { success: false, message: "Failed to create roster" };
    }
}

/**
 * Admin Action: Sends daily invites to master team members.
 */
export async function sendDailyInvitesAction(workDate?: string) {
    const date = workDate || new Date().toISOString().split('T')[0];

    try {
        await requireRole("admin");
        const members = await db.select({
            memberId: masterTeamMembers.id,
            techId: masterTeamMembers.technicianId,
            userId: technicians.userId
        })
        .from(masterTeamMembers)
        .innerJoin(technicians, eq(masterTeamMembers.technicianId, technicians.id))
        .where(eq(masterTeamMembers.status, 'Accepted'));

        const existingInvites = await db.select({ memberId: dailyInvites.masterTeamMemberId })
            .from(dailyInvites)
            .where(eq(dailyInvites.workDate, date));

        const existingMemberIds = existingInvites.map(i => i.memberId);
        const newInvites = members.filter(m => !existingMemberIds.includes(m.memberId));

        if (newInvites.length > 0) {
            await db.insert(dailyInvites).values(
                newInvites.map(m => ({
                    masterTeamMemberId: m.memberId,
                    technicianId: m.techId,
                    workDate: date,
                    status: 'Pending'
                }))
            );

            for (const m of newInvites) {
                await createNotification(
                    m.userId,
                    'System',
                    'Daily Work Invite',
                    `You have been invited for work on ${date}.`,
                    '/technician/dashboard'
                );
            }
        }

        return { success: true, invitesSent: newInvites.length };
    } catch (e) {
        console.error("Send daily invites error:", e);
        return { success: false, message: "Failed to send daily invites" };
    }
}

/**
 * Technician Action: Fetches today's daily invite.
 */
export async function getDailyInviteAction() {
    try {
        const session = await getSession();
        if (!session) return { invite: null };

        const tech = await db.query.technicians.findFirst({ where: eq(technicians.userId, session.userId) });
        if (!tech) return { invite: null };

        const today = new Date().toISOString().split('T')[0];
        const invite = await db.select().from(dailyInvites)
            .where(and(
                eq(dailyInvites.technicianId, tech.id),
                eq(dailyInvites.workDate, today),
                eq(dailyInvites.status, 'Pending')
            ))
            .limit(1);

        return { invite: invite[0] || null };
    } catch (e) {
        return { invite: null };
    }
}

/**
 * Technician Action: Respond to a daily work invite.
 */
export async function respondToDailyInviteAction(inviteId: string, accept: boolean) {
    try {
        await requireRole("technician");
        await db.update(dailyInvites)
            .set({
                status: accept ? 'Accepted' : 'Declined',
                respondedAt: new Date()
            })
            .where(eq(dailyInvites.id, inviteId));

        return { success: true };
    } catch (e) {
        return { success: false };
    }
}

/**
 * Admin Action: Monitor daily invite statuses.
 */
export async function getDailyInviteStatusesAction(workDate?: string) {
    const date = workDate || new Date().toISOString().split('T')[0];

    try {
        await requireRole("admin");
        const results = await db.select({
            id: dailyInvites.id,
            techName: users.name,
            status: dailyInvites.status,
            respondedAt: dailyInvites.respondedAt
        })
        .from(dailyInvites)
        .innerJoin(technicians, eq(dailyInvites.technicianId, technicians.id))
        .innerJoin(users, eq(technicians.userId, users.id))
        .where(eq(dailyInvites.workDate, date));

        return {
            success: true,
            invites: results,
            summary: {
                total: results.length,
                accepted: results.filter(i => i.status === 'Accepted').length,
                declined: results.filter(i => i.status === 'Declined').length,
                pending: results.filter(i => i.status === 'Pending').length
            }
        };
    } catch (e) {
        return { success: false, invites: [] };
    }
}
