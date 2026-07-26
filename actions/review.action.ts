"use server"

import { db } from "@/lib/db";
import { ratings, technicians, companies, jobs, requests, users } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getSession, requireRole } from "@/services/auth.service";
import { calculateAndSaveScoreAction } from "@/actions/scoring.action";

/**
 * Company Action: Submits a rating and review for a completed job.
 */
export async function submitRatingAction(jobId: string, technicianId: string, score: number, review?: string) {
    try {
        const session = await getSession();
        if (!session) return { success: false, message: "Not authenticated" };

        const company = await db.query.companies.findFirst({
            where: eq(companies.userId, session.userId)
        });

        if (!company) return { success: false, message: "Company profile not found" };

        // Record the rating
        await db.insert(ratings).values({
            jobId,
            companyId: company.id,
            technicianId,
            overallScore: score,
            reviewText: review || ""
        });

        // Update technician's average rating
        const allRatings = await db.select({ score: ratings.overallScore })
            .from(ratings)
            .where(eq(ratings.technicianId, technicianId));

        if (allRatings.length > 0) {
            const sum = allRatings.reduce((acc, curr) => acc + curr.score, 0);
            const average = sum / allRatings.length;

            await db.update(technicians)
                .set({ rating: parseFloat(average.toFixed(1)) })
                .where(eq(technicians.id, technicianId));
        }

        // Fire-and-forget score recalculation
        try {
            calculateAndSaveScoreAction(technicianId).catch((err) => {
                console.error("Silent score recalculation error (submitRating):", err);
            });
        } catch (err) {
            console.error("Silent score recalculation error (submitRating):", err);
        }

        return { success: true, message: "Rating submitted successfully" };
    } catch (e) {
        console.error("Submit rating error:", e);
        return { success: false, message: "Failed to submit rating" };
    }
}

/**
 * Admin Action: Fetches all feedback for monitoring.
 */
export async function getFeedbackAction() {
    try {
        await requireRole("admin");
        
        const result = await db.select({
            id: ratings.id,
            jobId: ratings.jobId,
            score: ratings.overallScore,
            review: ratings.reviewText,
            companyName: companies.companyName,
            technicianName: users.name,
            serviceType: requests.serviceType,
            createdAt: jobs.completedAt
        })
        .from(ratings)
        .innerJoin(companies, eq(ratings.companyId, companies.id))
        .innerJoin(technicians, eq(ratings.technicianId, technicians.id))
        .innerJoin(users, eq(technicians.userId, users.id))
        .innerJoin(jobs, eq(ratings.jobId, jobs.id))
        .innerJoin(requests, eq(jobs.requestId, requests.id))
        .orderBy(desc(ratings.createdAt));

        return { success: true, feedback: result };
    } catch (e) {
        console.error("Fetch feedback error:", e);
        return { success: false, feedback: [] };
    }
}
