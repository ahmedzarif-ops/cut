CREATE TABLE "meal_entry_deletion_tombstones" (
	"user_id" uuid NOT NULL,
	"client_request_id" uuid NOT NULL,
	"deleted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meal_entry_deletion_tombstones_pk" PRIMARY KEY("user_id","client_request_id")
);
--> statement-breakpoint
ALTER TABLE "meal_entry_deletion_tombstones" ADD CONSTRAINT "meal_entry_deletion_tombstones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;