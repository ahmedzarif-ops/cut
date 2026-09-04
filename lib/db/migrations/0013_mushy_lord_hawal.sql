CREATE TABLE "ai_meal_usage" (
	"user_id" uuid NOT NULL,
	"usage_day" date NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_meal_usage_user_id_usage_day_pk" PRIMARY KEY("user_id","usage_day"),
	CONSTRAINT "ai_meal_usage_nonnegative_check" CHECK ("ai_meal_usage"."request_count" >= 0 AND "ai_meal_usage"."input_tokens" >= 0 AND "ai_meal_usage"."output_tokens" >= 0)
);
--> statement-breakpoint
ALTER TABLE "ai_meal_usage" ADD CONSTRAINT "ai_meal_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_meal_usage_day_index" ON "ai_meal_usage" USING btree ("usage_day");