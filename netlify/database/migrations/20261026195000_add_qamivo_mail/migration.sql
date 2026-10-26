CREATE TABLE "mail_api_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id" text NOT NULL,
  "name" text NOT NULL,
  "key_prefix" text NOT NULL,
  "key_hash" text NOT NULL UNIQUE,
  "last_used_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "mail_api_keys_owner_created" ON "mail_api_keys" ("owner_id", "created_at");
--> statement-breakpoint
CREATE TABLE "mail_domains" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id" text NOT NULL,
  "domain" text NOT NULL,
  "provider_domain_id" text NOT NULL UNIQUE,
  "status" text NOT NULL DEFAULT 'pending',
  "dns_records" text NOT NULL DEFAULT '[]',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "last_checked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "mail_domains_domain_unique" ON "mail_domains" ("domain");
--> statement-breakpoint
CREATE INDEX "mail_domains_owner_created" ON "mail_domains" ("owner_id", "created_at");
--> statement-breakpoint
CREATE TABLE "mail_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id" text NOT NULL,
  "provider_id" text,
  "from_email" text NOT NULL,
  "recipients" text[] NOT NULL,
  "subject" text NOT NULL,
  "status" text NOT NULL DEFAULT 'sending',
  "error_code" text,
  "idempotency_key" text,
  "request_hash" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "mail_messages_owner_idempotency_unique" ON "mail_messages" ("owner_id", "idempotency_key");
--> statement-breakpoint
CREATE INDEX "mail_messages_owner_created" ON "mail_messages" ("owner_id", "created_at");
--> statement-breakpoint
CREATE INDEX "mail_messages_provider_id" ON "mail_messages" ("provider_id");
