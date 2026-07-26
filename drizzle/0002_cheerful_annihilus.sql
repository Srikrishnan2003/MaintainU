CREATE TABLE "job_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"request_id" uuid,
	"from_status" text,
	"to_status" text NOT NULL,
	"actor_id" uuid,
	"actor_role" text,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "requests" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "requests" ALTER COLUMN "status" SET DEFAULT 'Requested'::text;--> statement-breakpoint
DROP TYPE "public"."request_status";--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('Requested', 'Reviewing', 'Rejected', 'Pending_Assign', 'Team_Forming', 'Assigned', 'Declined', 'Accepted', 'Team_Confirmed', 'Dispatched', 'On_The_Way', 'Arrived', 'In_Zone', 'Exited_Zone', 'Work_Started', 'In_Progress', 'On_Hold', 'Failed', 'Timed_Out', 'Work_Completed', 'Sign_Pending', 'Completed', 'Invoiced', 'Paid', 'Cancelled');--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "status" SET DATA TYPE "public"."request_status" USING "status"::"public"."request_status";--> statement-breakpoint
ALTER TABLE "requests" ALTER COLUMN "status" SET DEFAULT 'Requested'::"public"."request_status";--> statement-breakpoint
ALTER TABLE "requests" ALTER COLUMN "status" SET DATA TYPE "public"."request_status" USING "status"::"public"."request_status";--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "hold_reason" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "failure_reason" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "failed_at" timestamp;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "reassigned_from_id" uuid;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "assigned_at" timestamp;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "response_deadline" timestamp;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "decline_reason" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "declined_at" timestamp;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "entered_area_at" timestamp;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "exited_area_at" timestamp;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "is_restricted_area" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "estimated_zone_duration" integer;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "rejected_at" timestamp;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "assignment_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "job_status_history" ADD CONSTRAINT "job_status_history_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_status_history" ADD CONSTRAINT "job_status_history_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE no action ON UPDATE no action;