ALTER TABLE "users" ADD COLUMN "adult_eligibility_status" text DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "adult_eligibility_policy_version" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "adult_eligibility_decided_at" timestamp with time zone;--> statement-breakpoint
UPDATE "users" SET "email" = NULL;--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "birth_year";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_adult_eligibility_status_check" CHECK ("users"."adult_eligibility_status" IN ('unverified', 'eligible', 'ineligible'));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_adult_eligibility_lifecycle_check" CHECK (("users"."adult_eligibility_status" = 'unverified' AND "users"."adult_eligibility_policy_version" IS NULL AND "users"."adult_eligibility_decided_at" IS NULL) OR ("users"."adult_eligibility_status" IN ('eligible', 'ineligible') AND NULLIF(BTRIM("users"."adult_eligibility_policy_version"), '') IS NOT NULL AND "users"."adult_eligibility_decided_at" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_requires_adult_eligibility_check" CHECK ("users"."adult_eligibility_status" = 'eligible' OR "users"."email" IS NULL);
