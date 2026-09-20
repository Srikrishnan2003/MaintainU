"use server"

import { db } from "@/lib/db";
import { notifications, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/services/auth.service";
import { firebaseAdmin } from "@/lib/firebase-admin";
import { getMessaging } from "firebase-admin/messaging";

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

/**
 * Registers the device's FCM token for the currently logged-in user.
 */
export async function registerFcmTokenAction(token: string) {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Unauthorized" };

        await db.update(users)
            .set({ fcmToken: token })
            .where(eq(users.id, session.userId));
            
        return { success: true };
    } catch (e) {
        console.error("Register FCM token error:", e);
        return { success: false, error: "Internal Server Error" };
    }
}

/**
 * Helper to dispatch a native Android push notification to a specific user.
 * This looks up the user's fcmToken and uses the Firebase Admin SDK to send it.
 */
export async function sendPushNotification(userId: string, title: string, body: string, data?: Record<string, string>) {
    try {
        // Fetch user's FCM token
        const userResult = await db.select({ fcmToken: users.fcmToken }).from(users).where(eq(users.id, userId)).limit(1);
        if (!userResult.length || !userResult[0].fcmToken) {
            console.log(`No FCM token found for user ${userId}, skipping push notification.`);
            return { success: false, reason: "No FCM token" };
        }

        const token = userResult[0].fcmToken;

        // Send push notification via Firebase Admin
        const response = await getMessaging(firebaseAdmin.app()).send({
            token,
            notification: {
                title,
                body,
            },
            data: data || {},
            android: {
                priority: "high",
            }
        });

        console.log("Successfully sent push notification:", response);
        return { success: true, messageId: response };
    } catch (error) {
        console.error("Error sending push notification:", error);
        return { success: false, error };
    }
}
