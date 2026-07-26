"use server"

import { db } from "@/lib/db";
import { replacementWorkers, replacementAssignments, technicians, users, dailyAssignments as dailyAssignmentsTable } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireRole } from "@/services/auth.service";
import { createNotification } from "@/services/notification.service";

/**
 * Admin Action: Fetches all available for replacement workers.
 */
export async function getAvailableReplacementsAction(excludeIds: string[] = []) {
    try {
        await requireRole("admin");
        const results = await db.select({
            techId: technicians.id,
            user: users,
            tech: technicians
        })
        .from(technicians)
        .leftJoin(users, eq(technicians.userId, users.id))
        .where(
            and(
                eq(users.status, 'ACTIVE'),
                excludeIds.length > 0 ? sql`${technicians.id} NOT IN ${excludeIds}` : undefined
            )
        );

        return {
            replacements: results.map(r => ({
                id: r.techId,
                name: r.user?.name || r.user?.phone || "Unknown",
                phone: r.user?.phone,
                skill: r.tech.primarySkill,
                rating: r.tech.rating,
                status: r.tech.status
            }))
        };
    } catch (e) {
        return { replacements: [] };
    }
}

/**
 * Admin Action: Fetches the registered replacement worker pool.
 */
export async function getReplacementWorkersAction() {
    try {
        await requireRole("admin");
        const workers = await db.select({
            id: replacementWorkers.id,
            techId: replacementWorkers.technicianId,
            techName: users.name,
            skills: replacementWorkers.skills,
            status: replacementWorkers.status,
            rating: technicians.rating
        })
        .from(replacementWorkers)
        .innerJoin(technicians, eq(replacementWorkers.technicianId, technicians.id))
        .innerJoin(users, eq(technicians.userId, users.id));

        return { workers };
    } catch (e) {
        return { workers: [] };
    }
}

/**
 * Admin Action: Manual assignment of a replacement worker.
 */
export async function assignReplacementWorkerAction(replacementWorkerId: string, dailyAssignmentId: string, masterTeamId?: string) {
    try {
        await requireRole("admin");
        await db.update(replacementWorkers).set({ status: 'Assigned' }).where(eq(replacementWorkers.id, replacementWorkerId));

        await db.insert(replacementAssignments).values({
            replacementWorkerId,
            dailyAssignmentId,
            masterTeamId: masterTeamId || null,
            status: 'ACTIVE'
        });

        const worker = await db.select({ userId: technicians.userId })
            .from(replacementWorkers)
            .innerJoin(technicians, eq(replacementWorkers.technicianId, technicians.id))
            .where(eq(replacementWorkers.id, replacementWorkerId));

        if (worker[0]) {
            await createNotification(
                worker[0].userId,
                'Job_Update',
                'Replacement Assignment',
                'You have been assigned as a replacement for today.',
                '/technician/dashboard'
            );
        }

        return { success: true };
    } catch (e) {
        return { success: false };
    }
}

/**
 * Admin Action: Registers a technician into the replacement worker pool.
 */
export async function addReplacementWorkerAction(technicianId: string, skills?: string[]) {
    try {
        await requireRole("admin");
        await db.insert(replacementWorkers).values({
            technicianId,
            skills: skills || [],
            status: 'ACTIVE'
        }).onConflictDoNothing();

        return { success: true };
    } catch (e) {
        return { success: false };
    }
}
