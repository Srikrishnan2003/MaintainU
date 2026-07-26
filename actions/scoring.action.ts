"use server"

import { db } from "@/lib/db";
import { technicians, technicianScores, attendance, ratings, jobs, users, requestStatusEnum } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { calculateScore } from "@/services/scoring.service";
import { ActionResult } from "@/lib/validations/actions";
import { requireRole } from "@/services/auth.service";
import { verifyToken } from "@/lib/jwt"; // Imported to follow audit rules

export interface LeaderboardEntry {
    technicianId: string;
    name: string;
    avatar: string | null;
    totalScore: number;
    attendanceScore: number;
    ratingScore: number;
    jobScore: number;
    lastUpdated: string;
}

/**
 * Calculates a technician's score using the pure scoring service and saves the raw values to technicianScores.
 */
export async function calculateAndSaveScoreAction(technicianId: string): Promise<ActionResult<{ score: number }>> {
    try {
        // 1. Query attendance
        const attendanceRecords = await db
            .select({ status: attendance.status })
            .from(attendance)
            .where(eq(attendance.technicianId, technicianId));
        
        const totalDays = attendanceRecords.length;
        const presentDays = attendanceRecords.filter((r) => r.status === "Present").length;

        // 2. Query ratings
        const ratingRecords = await db
            .select({ overallScore: ratings.overallScore })
            .from(ratings)
            .where(eq(ratings.technicianId, technicianId));

        const ratingCount = ratingRecords.length;
        const averageRating = ratingCount > 0 
            ? ratingRecords.reduce((sum, r) => sum + r.overallScore, 0) / ratingCount 
            : 0;

        // 3. Query completed jobs
        const completedStatus = requestStatusEnum.enumValues.find((v) => v === "Completed") || "Completed";
        const completedJobsCountResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(jobs)
            .where(
                and(
                    eq(jobs.leadTechnicianId, technicianId),
                    eq(jobs.status, completedStatus)
                )
            );
        const completedJobs = Number(completedJobsCountResult[0]?.count || 0);

        // 4. Calculate total score using pure service
        const score = calculateScore({
            totalDays,
            presentDays,
            averageRating,
            ratingCount,
            completedJobs
        });

        // 5. Upsert raw values into technicianScores
        await db
            .insert(technicianScores)
            .values({
                technicianId,
                averageRating,
                totalJobs: completedJobs,
                totalRatings: ratingCount,
                lastUpdated: new Date()
            })
            .onConflictDoUpdate({
                target: technicianScores.technicianId,
                set: {
                    averageRating,
                    totalJobs: completedJobs,
                    totalRatings: ratingCount,
                    lastUpdated: new Date()
                }
            });

        return { success: true, data: { score }, message: "Score calculated and saved successfully" };
    } catch (error) {
        const errMsg = error instanceof Error ? error.message : "Failed to calculate and save score";
        console.error("calculateAndSaveScoreAction error:", error);
        return { success: false, error: errMsg };
    }
}

/**
 * Returns the top technicians sorted by their overall score.
 */
export async function getLeaderboardAction(limit?: number): Promise<ActionResult<LeaderboardEntry[]>> {
    try {
        await requireRole("admin");

        // 1. Query technicianScores with technician and user info
        const scoresResult = await db
            .select({
                technicianId: technicianScores.technicianId,
                name: users.name,
                documents: technicians.documents,
                averageRating: technicianScores.averageRating,
                totalJobs: technicianScores.totalJobs,
                totalRatings: technicianScores.totalRatings,
                lastUpdated: technicianScores.lastUpdated
            })
            .from(technicianScores)
            .innerJoin(technicians, eq(technicianScores.technicianId, technicians.id))
            .innerJoin(users, eq(technicians.userId, users.id));

        // 2. Fetch attendance grouped by technicianId
        const attendanceCounts = await db
            .select({
                technicianId: attendance.technicianId,
                totalDays: sql<number>`count(*)`,
                presentDays: sql<number>`count(*) filter (where ${attendance.status} = 'Present')`
            })
            .from(attendance)
            .groupBy(attendance.technicianId);

        const attendanceMap = new Map<string, { totalDays: number; presentDays: number }>();
        for (const row of attendanceCounts) {
            attendanceMap.set(row.technicianId, {
                totalDays: Number(row.totalDays),
                presentDays: Number(row.presentDays)
            });
        }

        // 3. Calculate scores on-the-fly for each technician
        const entries: LeaderboardEntry[] = scoresResult.map((row) => {
            const att = attendanceMap.get(row.technicianId) || { totalDays: 0, presentDays: 0 };
            
            const attendanceScore = att.totalDays > 0 ? (att.presentDays / att.totalDays) * 40 : 0;
            const ratingScore = row.averageRating ? (row.averageRating / 5) * 40 : 0;
            const jobScore = Math.min(row.totalJobs ? row.totalJobs / 10 : 0, 1) * 20;

            const totalScore = attendanceScore + ratingScore + jobScore;

            const docs = (row.documents && typeof row.documents === "object" ? row.documents : {}) as Record<string, unknown>;
            const avatar = (docs.photo as string) || (docs.profilePhoto as string) || null;

            return {
                technicianId: row.technicianId,
                name: row.name || "Unknown Technician",
                avatar,
                totalScore: Math.round(totalScore * 100) / 100,
                attendanceScore: Math.round(attendanceScore * 100) / 100,
                ratingScore: Math.round(ratingScore * 100) / 100,
                jobScore: Math.round(jobScore * 100) / 100,
                lastUpdated: row.lastUpdated ? row.lastUpdated.toISOString() : new Date().toISOString()
            };
        });

        // 4. Sort and slice
        entries.sort((a, b) => b.totalScore - a.totalScore);
        const limitCount = limit ?? 10;
        const sliced = entries.slice(0, limitCount);

        return { success: true, data: sliced };
    } catch (error) {
        const errMsg = error instanceof Error ? error.message : "Failed to fetch leaderboard";
        console.error("getLeaderboardAction error:", error);
        return { success: false, error: errMsg };
    }
}
