CREATE TABLE "nutrition_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"daily_calorie_target" integer,
	"daily_protein_target_g" integer,
	"diet_style" text DEFAULT 'no_preference' NOT NULL,
	"preferred_cuisines" text[] DEFAULT '{}'::text[] NOT NULL,
	"avoided_ingredients" text[] DEFAULT '{}'::text[] NOT NULL,
	"learning_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nutrition_preferences_calorie_target_range_check" CHECK ("nutrition_preferences"."daily_calorie_target" IS NULL OR ("nutrition_preferences"."daily_calorie_target" >= 800 AND "nutrition_preferences"."daily_calorie_target" <= 6000)),
	CONSTRAINT "nutrition_preferences_protein_target_range_check" CHECK ("nutrition_preferences"."daily_protein_target_g" IS NULL OR ("nutrition_preferences"."daily_protein_target_g" >= 20 AND "nutrition_preferences"."daily_protein_target_g" <= 400)),
	CONSTRAINT "nutrition_preferences_diet_style_check" CHECK ("nutrition_preferences"."diet_style" IN ('no_preference', 'omnivore', 'vegetarian', 'vegan', 'pescatarian')),
	CONSTRAINT "nutrition_preferences_cuisines_count_check" CHECK (cardinality("nutrition_preferences"."preferred_cuisines") <= 10),
	CONSTRAINT "nutrition_preferences_avoided_count_check" CHECK (cardinality("nutrition_preferences"."avoided_ingredients") <= 20)
);
--> statement-breakpoint
CREATE TABLE "saved_foods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source" text NOT NULL,
	"source_ref" text,
	"fingerprint" text NOT NULL,
	"name" text NOT NULL,
	"serving_description" text NOT NULL,
	"calories_kcal" double precision NOT NULL,
	"protein_g" double precision NOT NULL,
	"carbs_g" double precision NOT NULL,
	"fat_g" double precision NOT NULL,
	"fiber_g" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_foods_source_check" CHECK ("saved_foods"."source" IN ('curated', 'barcode', 'manual')),
	CONSTRAINT "saved_foods_nutrition_nonnegative_check" CHECK ("saved_foods"."calories_kcal" >= 0 AND "saved_foods"."protein_g" >= 0 AND "saved_foods"."carbs_g" >= 0 AND "saved_foods"."fat_g" >= 0 AND "saved_foods"."fiber_g" >= 0),
	CONSTRAINT "saved_foods_nutrition_finite_check" CHECK ("saved_foods"."calories_kcal" NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision) AND "saved_foods"."protein_g" NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision) AND "saved_foods"."carbs_g" NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision) AND "saved_foods"."fat_g" NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision) AND "saved_foods"."fiber_g" NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision))
);
--> statement-breakpoint
CREATE TABLE "meal_feedback" (
	"user_id" uuid NOT NULL,
	"template_id" text NOT NULL,
	"preference" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meal_feedback_user_id_template_id_pk" PRIMARY KEY("user_id","template_id"),
	CONSTRAINT "meal_feedback_preference_check" CHECK ("meal_feedback"."preference" IN ('liked', 'not_for_me'))
);
--> statement-breakpoint
ALTER TABLE "nutrition_preferences" ADD CONSTRAINT "nutrition_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_foods" ADD CONSTRAINT "saved_foods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_feedback" ADD CONSTRAINT "meal_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "saved_foods_user_fingerprint_unique" ON "saved_foods" USING btree ("user_id","fingerprint");--> statement-breakpoint
CREATE INDEX "saved_foods_user_updated_index" ON "saved_foods" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "meal_feedback_user_updated_index" ON "meal_feedback" USING btree ("user_id","updated_at");