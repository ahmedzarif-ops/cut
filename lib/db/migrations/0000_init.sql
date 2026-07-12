CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"units" text DEFAULT 'metric' NOT NULL,
	"onboarding_complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"display_name" text,
	"goal" text DEFAULT 'cut' NOT NULL,
	"sex" text DEFAULT 'unspecified' NOT NULL,
	"birth_year" integer,
	"height_cm" double precision,
	"start_weight_kg" double precision,
	"goal_weight_kg" double precision,
	"target_date" date,
	"activity_level" text DEFAULT 'moderate' NOT NULL,
	"training_experience" text DEFAULT 'beginner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;