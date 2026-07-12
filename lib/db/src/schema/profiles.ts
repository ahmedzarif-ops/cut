import {
  date,
  doublePrecision,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { usersTable } from "./users";

/**
 * Per-user profile captured during onboarding. One row per user.
 * All physical measurements are stored in metric (kg / cm); the user's
 * display `units` preference lives on the users table.
 */
export const profilesTable = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  // "cut" | "maintain" | "recomp" | "gain"
  goal: text("goal").notNull().default("cut"),
  // "male" | "female" | "other" | "unspecified"
  sex: text("sex").notNull().default("unspecified"),
  birthYear: integer("birth_year"),
  heightCm: doublePrecision("height_cm"),
  startWeightKg: doublePrecision("start_weight_kg"),
  goalWeightKg: doublePrecision("goal_weight_kg"),
  targetDate: date("target_date", { mode: "string" }),
  // "sedentary" | "light" | "moderate" | "active" | "very_active"
  activityLevel: text("activity_level").notNull().default("moderate"),
  // "beginner" | "intermediate" | "advanced"
  trainingExperience: text("training_experience").notNull().default("beginner"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;
