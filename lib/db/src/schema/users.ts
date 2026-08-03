import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Internal user record. This is the system-of-record identity for the whole
 * app. `clerkUserId` is the external Clerk identity; every other table
 * references `users.id` (the internal uuid) — NEVER the Clerk id directly,
 * because dev and prod Clerk instances issue different ids for the same person.
 */
export const usersTable = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull().unique(),
    email: text("email"),
    // IANA timezone (e.g. "America/New_York"). Used to compute the user-local
    // calendar day for all daily rollups so a log at 11pm counts for that day.
    timezone: text("timezone").notNull().default("UTC"),
    // "metric" | "imperial" — display units only; storage is always metric (kg/cm).
    units: text("units").notNull().default("metric"),
    onboardingComplete: boolean("onboarding_complete").notNull().default(false),
    /** Blocks ordinary account access while durable deletion is in progress. */
    deletionStatus: text("deletion_status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "users_deletion_status_check",
      sql`${table.deletionStatus} IN ('active', 'pending')`,
    ),
  ],
);

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
