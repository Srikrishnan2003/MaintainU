/**
 * scripts/seed-admin.ts
 *
 * One-time setup script to create or update the admin user with a bcrypt-hashed password.
 *
 * Usage:
 *   npm run seed:admin
 *   -- or with custom credentials: --
 *   ADMIN_PHONE=9999999999 ADMIN_PASSWORD=MySecret npm run seed:admin
 *
 * saltRounds: 12 is the production-recommended minimum.
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const SALT_ROUNDS = 12;

if (!process.env.ADMIN_PHONE || !process.env.ADMIN_PASSWORD) {
    console.warn("⚠️  ADMIN_PHONE or ADMIN_PASSWORD not set in .env — using defaults");
    console.warn("⚠️  Set these in .env before running in production!");
}

// ── Credentials ── override via env vars ──────
const ADMIN_PHONE    = process.env.ADMIN_PHONE    ?? "+910000000000";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "DefaultSecurePass!23";
const ADMIN_NAME     = process.env.ADMIN_NAME     ?? "Admin";

async function main() {
    console.log("\n🔐 MaintainU — Admin Seeder\n");

    if (ADMIN_PASSWORD.length < 8) {
        console.error("❌  Password must be at least 8 characters.");
        process.exit(1);
    }

    console.log(`📱 Phone   : ${ADMIN_PHONE}`);
    console.log(`👤 Name    : ${ADMIN_NAME}`);
    console.log(`⚙️  Hashing  (saltRounds=${SALT_ROUNDS}) — this may take a moment...\n`);

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);

    // Check if an admin with this phone already exists
    const existing = await db.query.users.findFirst({
        where: eq(users.phone, ADMIN_PHONE),
    });

    if (existing) {
        // Update existing user to active admin with new name and password
        await db
            .update(users)
            .set({
                name: ADMIN_NAME,
                role: "admin",
                passwordHash,
                status: "ACTIVE",
                updatedAt: new Date(),
            })
            .where(eq(users.id, existing.id));

        console.log("✅  Admin account and name updated successfully.");
        console.log(`   ID: ${existing.id}`);
    } else {
        // Insert new admin user
        const [newAdmin] = await db
            .insert(users)
            .values({
                phone:        ADMIN_PHONE,
                name:         ADMIN_NAME,
                role:         "admin",
                status:       "ACTIVE",
                passwordHash,
                profileCompleted: true,
            })
            .returning();

        console.log("✅  Admin user created successfully.");
        console.log(`   ID: ${newAdmin.id}`);
    }

    console.log("\n🚀  You can now log in at /admin-login");
    console.log(`   Phone   : ${ADMIN_PHONE}\n`);

    process.exit(0);
}

main().catch((err) => {
    console.error("\n❌  Seeder failed:", err);
    process.exit(1);
});
