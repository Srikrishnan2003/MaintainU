import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getUserByPhone(phone: string) {
    const userRecords = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    return userRecords.length > 0 ? userRecords[0] : null;
}

export async function createUser(data: { phone: string; role: "admin" | "company" | "technician" }) {
    // We enforce no public signup; this service would be used by an admin action.
    const newUser = await db.insert(users).values({
        phone: data.phone,
        role: data.role,
        status: "PENDING_PROFILE"
    }).returning();
    
    return newUser[0];
}

export async function updateStatus(userId: string, newStatus: "PENDING_PROFILE" | "PENDING_APPROVAL" | "ACTIVE" | "REJECTED") {
    const updatedUser = await db.update(users)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();
        
    return updatedUser[0];
}
