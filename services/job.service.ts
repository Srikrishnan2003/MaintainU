import { db } from "@/lib/db";
import { jobs, requests, companies } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Finds the core User ID of the company associated with a specific job.
 * Useful for sending notifications.
 */
export async function getCompanyUserIdFromJob(jobId: string) {
    try {
        const result = await db.select({ userId: companies.userId })
            .from(jobs)
            .leftJoin(requests, eq(jobs.requestId, requests.id))
            .leftJoin(companies, eq(requests.companyId, companies.id))
            .where(eq(jobs.id, jobId))
            .limit(1);
        return result[0]?.userId;
    } catch (e) {
        console.error("Error finding company user:", e);
        return null;
    }
}
