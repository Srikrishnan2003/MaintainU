import { db } from "@/lib/db";
import { notifications } from "@/db/schema";
import { emitNotification } from "@/lib/event-emitter";

/**
 * Internal service to create a system notification for a specific user.
 */
export async function createNotification(
    userId: string, 
    type: string, 
    title: string, 
    message: string, 
    link?: string
) {
    try {
        const [newNotif] = await db.insert(notifications).values({
            userId,
            type,
            title,
            message,
            link,
            isRead: false
        }).returning();

        if (newNotif) {
            emitNotification(userId, {
                id: newNotif.id,
                message: newNotif.message,
                type: newNotif.type,
                createdAt: newNotif.createdAt
            });
        }
    } catch (e) {
        console.error("Failed to create notification:", e);
    }
}
