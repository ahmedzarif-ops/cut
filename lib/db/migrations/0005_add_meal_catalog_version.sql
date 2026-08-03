-- Existing meal rows were all created from the launch catalog. Backfill that
-- release while adding the required snapshot column, then remove the default
-- so every future write must state the catalog version explicitly.
ALTER TABLE "meal_entries" ADD COLUMN "catalog_version" text DEFAULT '2026-08-03.1' NOT NULL;--> statement-breakpoint
ALTER TABLE "meal_entries" ALTER COLUMN "catalog_version" DROP DEFAULT;
