import { db } from "@/lib/db";
import { jobStatusHistory } from "@/db/schema";
import { getSession } from "@/services/auth.service";

/**
 * Logs a status transition for a job or request into the audit trail.
 */
export async function logStatusChange(
    jobId: string | null, 
    requestId: string | null, 
    from: string | null, 
    to: string, 
    reason?: string
) {
    try {
        const session = await getSession();
        const actorId = session?.userId || null;
        const actorRole = session?.role || null;

        const values: any = {
            fromStatus: from,
            toStatus: to,
            actorId,
            actorRole,
            reason
        };
        if (jobId) values.jobId = jobId;
        if (requestId) values.requestId = requestId;

        await db.insert(jobStatusHistory).values(values);
    } catch (e) {
        console.error("Failed to log status change:", e);
    }
}
