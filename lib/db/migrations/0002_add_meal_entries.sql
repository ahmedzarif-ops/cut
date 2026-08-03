CREATE TABLE "meal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"client_request_id" uuid NOT NULL,
	"logged_on" date NOT NULL,
	"template_id" text NOT NULL,
	"name" text NOT NULL,
	"serving_description" text NOT NULL,
	"servings" double precision NOT NULL,
	"calories_kcal_per_serving" double precision NOT NULL,
	"protein_g_per_serving" double precision NOT NULL,
	"carbs_g_per_serving" double precision NOT NULL,
	"fat_g_per_serving" double precision NOT NULL,
	"fiber_g_per_serving" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meal_entries_servings_range_check" CHECK ("meal_entries"."servings" >= 0.25 AND "meal_entries"."servings" <= 4),
	CONSTRAINT "meal_entries_nutrition_nonnegative_check" CHECK ("meal_entries"."calories_kcal_per_serving" >= 0 AND "meal_entries"."protein_g_per_serving" >= 0 AND "meal_entries"."carbs_g_per_serving" >= 0 AND "meal_entries"."fat_g_per_serving" >= 0 AND "meal_entries"."fiber_g_per_serving" >= 0)
);
--> statement-breakpoint
ALTER TABLE "meal_entries" ADD CONSTRAINT "meal_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "meal_entries_user_client_request_unique" ON "meal_entries" USING btree ("user_id","client_request_id");--> statement-breakpoint
CREATE INDEX "meal_entries_user_logged_on_index" ON "meal_entries" USING btree ("user_id","logged_on");
