"use server"

import { db } from "@/lib/db";
import { notifications } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/services/auth.service";

/**
 * Fetches all notifications for the currently logged-in user.
 */
export async function getNotificationsAction() {
    try {
        const session = await getSession();
        if (!session) return { notifications: [] };

        const userId = session.userId;

        const results = await db.select().from(notifications)
            .where(eq(notifications.userId, userId))
            .orderBy(desc(notifications.createdAt))
            .limit(50);

        return { notifications: results };
    } catch (e) {
        console.error("Get notifications error:", e);
        return { notifications: [] };
    }
}

/**
 * Marks a specific notification as read.
 */
export async function markNotificationAsReadAction(id: string) {
    try {
        await db.update(notifications)
            .set({ isRead: true })
            .where(eq(notifications.id, id));
        return { success: true };
    } catch (e) {
        return { success: false };
    }
}

/**
 * Marks all notifications as read for the currently logged-in user.
 */
export async function markAllNotificationsAsReadAction() {
    try {
        const session = await getSession();
        if (!session) return { success: false };

        await db.update(notifications)
            .set({ isRead: true })
            .where(eq(notifications.userId, session.userId));
        return { success: true };
    } catch (e) {
        return { success: false };
    }
}
