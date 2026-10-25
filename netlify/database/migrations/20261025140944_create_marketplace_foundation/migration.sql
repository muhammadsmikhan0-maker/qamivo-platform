CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"record_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"budget" integer NOT NULL,
	"currency" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_budget_positive" CHECK ("budget" > 0),
	CONSTRAINT "job_status_valid" CHECK ("status" in ('open', 'closed'))
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY,
	"username" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"headline" text NOT NULL,
	"bio" text NOT NULL,
	"skills" text NOT NULL,
	"category" text NOT NULL,
	"country" text NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"job_id" uuid NOT NULL,
	"freelancer_id" text NOT NULL,
	"cover_letter" text NOT NULL,
	"amount" integer NOT NULL,
	"days" integer NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proposal_price_positive" CHECK ("amount" > 0),
	CONSTRAINT "proposal_days_positive" CHECK ("days" > 0),
	CONSTRAINT "proposal_status_valid" CHECK ("status" in ('submitted','shortlisted','rejected'))
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY,
	"count" integer NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "jobs_status_created" ON "jobs" ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "one_proposal_per_job_member" ON "proposals" ("job_id","freelancer_id");--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_job_id_jobs_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id");