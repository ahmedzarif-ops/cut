CREATE TABLE "account_deletion_requests" (
	"identity_hash" text PRIMARY KEY NOT NULL,
	"clerk_user_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"last_error_code" text,
	CONSTRAINT "account_deletion_requests_status_check" CHECK ("account_deletion_requests"."status" IN ('pending', 'completed')),
	CONSTRAINT "account_deletion_requests_attempt_count_check" CHECK ("account_deletion_requests"."attempt_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deletion_status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_deletion_status_check" CHECK ("users"."deletion_status" IN ('active', 'pending'));
