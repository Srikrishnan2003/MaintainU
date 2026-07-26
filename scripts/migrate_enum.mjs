import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

async function run() {
    const sql = neon(process.env.DATABASE_URL);
    
    try {
        console.log("Adding new values to enum...");
        await sql`ALTER TYPE status ADD VALUE IF NOT EXISTS 'PENDING_PROFILE';`;
        await sql`ALTER TYPE status ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';`;
        await sql`ALTER TYPE status ADD VALUE IF NOT EXISTS 'ACTIVE';`;
        await sql`ALTER TYPE status ADD VALUE IF NOT EXISTS 'REJECTED';`;
        
        console.log("Updating existing records...");
        await sql`UPDATE users SET status = 'ACTIVE' WHERE status = 'active';`;
        await sql`UPDATE users SET status = 'PENDING_PROFILE' WHERE status = 'pending';`;
        await sql`UPDATE users SET status = 'PENDING_APPROVAL' WHERE status = 'banned';`;
        await sql`UPDATE users SET status = 'REJECTED' WHERE status = 'rejected';`;
        console.log("Records updated successfully.");
    } catch (e) {
        console.error("Error migrating:", e.message);
    }
}
run();
