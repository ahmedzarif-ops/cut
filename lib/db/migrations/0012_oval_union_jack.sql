CREATE TABLE "workout_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"client_request_id" uuid NOT NULL,
	"logged_on" date NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workout_entries_kind_check" CHECK ("workout_entries"."kind" IN ('strength', 'cardio', 'recovery')),
	CONSTRAINT "workout_entries_name_length_check" CHECK (char_length(btrim("workout_entries"."name")) BETWEEN 1 AND 80),
	CONSTRAINT "workout_entries_notes_length_check" CHECK ("workout_entries"."notes" IS NULL OR char_length("workout_entries"."notes") <= 500)
);
--> statement-breakpoint
CREATE TABLE "workout_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_entry_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"sets" integer,
	"reps" integer,
	"load_kg" double precision,
	"duration_minutes" integer,
	"distance_km" double precision,
	"calories_kcal" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workout_exercises_position_range_check" CHECK ("workout_exercises"."position" BETWEEN 0 AND 49),
	CONSTRAINT "workout_exercises_name_length_check" CHECK (char_length(btrim("workout_exercises"."name")) BETWEEN 1 AND 80),
	CONSTRAINT "workout_exercises_sets_range_check" CHECK ("workout_exercises"."sets" IS NULL OR "workout_exercises"."sets" BETWEEN 1 AND 20),
	CONSTRAINT "workout_exercises_reps_range_check" CHECK ("workout_exercises"."reps" IS NULL OR "workout_exercises"."reps" BETWEEN 1 AND 100),
	CONSTRAINT "workout_exercises_load_range_check" CHECK ("workout_exercises"."load_kg" IS NULL OR ("workout_exercises"."load_kg" >= 0 AND "workout_exercises"."load_kg" <= 1000 AND "workout_exercises"."load_kg" NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision))),
	CONSTRAINT "workout_exercises_duration_range_check" CHECK ("workout_exercises"."duration_minutes" IS NULL OR "workout_exercises"."duration_minutes" BETWEEN 1 AND 1440),
	CONSTRAINT "workout_exercises_distance_range_check" CHECK ("workout_exercises"."distance_km" IS NULL OR ("workout_exercises"."distance_km" > 0 AND "workout_exercises"."distance_km" <= 1000 AND "workout_exercises"."distance_km" NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision))),
	CONSTRAINT "workout_exercises_calories_range_check" CHECK ("workout_exercises"."calories_kcal" IS NULL OR "workout_exercises"."calories_kcal" BETWEEN 0 AND 10000)
);
--> statement-breakpoint
ALTER TABLE "workout_entries" ADD CONSTRAINT "workout_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_workout_entry_id_workout_entries_id_fk" FOREIGN KEY ("workout_entry_id") REFERENCES "public"."workout_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workout_entries_user_client_request_unique" ON "workout_entries" USING btree ("user_id","client_request_id");--> statement-breakpoint
CREATE INDEX "workout_entries_user_logged_on_index" ON "workout_entries" USING btree ("user_id","logged_on");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_exercises_entry_position_unique" ON "workout_exercises" USING btree ("workout_entry_id","position");--> statement-breakpoint
CREATE INDEX "workout_exercises_entry_index" ON "workout_exercises" USING btree ("workout_entry_id");