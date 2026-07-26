-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  Migration: 0004_add_missing_columns                                        ║
-- ║  Author:    Antigravity (reviewed by user before push)                      ║
-- ║                                                                              ║
-- ║  Changes:                                                                   ║
-- ║  1. users         → add password_hash (varchar 255, nullable)               ║
-- ║  2. requests      → add time_slot, supervisor_name, supervisor_phone,       ║
-- ║                         photos columns (all nullable)                        ║
-- ║  3. requests      → relax NOT NULL on location, preferred_date,             ║
-- ║                         preferred_time_slot                                  ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- ─── 1. users: add password_hash ─────────────────────────────────────────────
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "password_hash" varchar(255);

--> statement-breakpoint

-- ─── 2. requests: add four new columns ───────────────────────────────────────
ALTER TABLE "requests"
  ADD COLUMN IF NOT EXISTS "time_slot"       varchar(100),
  ADD COLUMN IF NOT EXISTS "supervisor_name" varchar(255),
  ADD COLUMN IF NOT EXISTS "supervisor_phone" varchar(20),
  ADD COLUMN IF NOT EXISTS "photos"          text[];

--> statement-breakpoint

-- ─── 3. requests: relax NOT NULL constraints ─────────────────────────────────
--  These three columns were NOT NULL in the original schema but the new action
--  layer does not always supply them (location comes from company profile,
--  preferredDate/preferredTimeSlot have been superseded by preferredDate/timeSlot).
ALTER TABLE "requests"
  ALTER COLUMN "location"              DROP NOT NULL,
  ALTER COLUMN "preferred_date"        DROP NOT NULL,
  ALTER COLUMN "preferred_time_slot"   DROP NOT NULL;
