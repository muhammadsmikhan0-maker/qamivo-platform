ALTER TABLE "profiles" ADD COLUMN "email" text;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "avatar_key" text;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "avatar_position" text DEFAULT 'center' NOT NULL;
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "reference_image_ids" text[] DEFAULT '{}'::text[] NOT NULL;
--> statement-breakpoint
CREATE TABLE "uploads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id" text NOT NULL,
  "store_key" text NOT NULL UNIQUE,
  "purpose" text NOT NULL,
  "content_type" text NOT NULL,
  "file_size" integer NOT NULL,
  "is_public" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "upload_size_valid" CHECK ("file_size" > 0 AND "file_size" <= 5242880),
  CONSTRAINT "upload_purpose_valid" CHECK ("purpose" in ('avatar','company_logo','portfolio','job_reference','message_attachment','support_attachment','course_image','ad_creative'))
);
--> statement-breakpoint
CREATE INDEX "uploads_owner_created" ON "uploads" ("owner_id","created_at");
--> statement-breakpoint
CREATE TABLE "conversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "job_id" uuid,
  "subject" text DEFAULT 'Qamivo conversation' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "conversations_job_id_jobs_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id")
);
--> statement-breakpoint
CREATE INDEX "conversations_created" ON "conversations" ("created_at");
--> statement-breakpoint
CREATE TABLE "conversation_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" uuid NOT NULL,
  "member_id" text NOT NULL,
  "unread_count" integer DEFAULT 0 NOT NULL,
  "last_read_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "conversation_members_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id"),
  CONSTRAINT "conversation_unread_nonnegative" CHECK ("unread_count" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_member_unique" ON "conversation_members" ("conversation_id","member_id");
--> statement-breakpoint
CREATE INDEX "conversation_members_member_created" ON "conversation_members" ("member_id","created_at");
--> statement-breakpoint
CREATE TABLE "messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" uuid NOT NULL,
  "sender_id" text NOT NULL,
  "body" text DEFAULT '' NOT NULL,
  "attachment_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id"),
  CONSTRAINT "message_body_or_attachment" CHECK (length(trim("body")) > 0 OR "attachment_id" IS NOT NULL),
  CONSTRAINT "message_body_length" CHECK (length("body") <= 4000)
);
--> statement-breakpoint
CREATE INDEX "messages_conversation_created" ON "messages" ("conversation_id","created_at");
--> statement-breakpoint
CREATE TABLE "email_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_type" text NOT NULL,
  "recipient" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "provider_id" text,
  "error_code" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "email_events_status_created" ON "email_events" ("status","created_at");
