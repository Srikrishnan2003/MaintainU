CREATE TABLE "daily_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"master_team_member_id" uuid NOT NULL,
	"technician_id" uuid NOT NULL,
	"work_date" date NOT NULL,
	"status" text DEFAULT 'Pending',
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"link" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replacement_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"replacement_worker_id" uuid NOT NULL,
	"daily_assignment_id" uuid NOT NULL,
	"master_team_id" uuid,
	"assigned_at" timestamp DEFAULT now(),
	"status" text DEFAULT 'Active'
);
--> statement-breakpoint
CREATE TABLE "replacement_workers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"technician_id" uuid NOT NULL,
	"status" text DEFAULT 'Available',
	"skills" text[],
	"added_at" timestamp DEFAULT now(),
	CONSTRAINT "replacement_workers_technician_id_unique" UNIQUE("technician_id")
);
--> statement-breakpoint
ALTER TABLE "technicians" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_invites" ADD CONSTRAINT "daily_invites_master_team_member_id_master_team_members_id_fk" FOREIGN KEY ("master_team_member_id") REFERENCES "public"."master_team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_invites" ADD CONSTRAINT "daily_invites_technician_id_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replacement_assignments" ADD CONSTRAINT "replacement_assignments_replacement_worker_id_replacement_workers_id_fk" FOREIGN KEY ("replacement_worker_id") REFERENCES "public"."replacement_workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replacement_assignments" ADD CONSTRAINT "replacement_assignments_daily_assignment_id_daily_assignments_id_fk" FOREIGN KEY ("daily_assignment_id") REFERENCES "public"."daily_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replacement_assignments" ADD CONSTRAINT "replacement_assignments_master_team_id_master_teams_id_fk" FOREIGN KEY ("master_team_id") REFERENCES "public"."master_teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replacement_workers" ADD CONSTRAINT "replacement_workers_technician_id_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE no action ON UPDATE no action;