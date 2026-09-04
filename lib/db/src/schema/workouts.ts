import { sql } from "drizzle-orm";
import {
  check,
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { usersTable } from "./users";

/** A private workout session on the user's local calendar day. */
export const workoutEntriesTable = pgTable(
  "workout_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    /** Client-generated idempotency key; unique within the user's account. */
    clientRequestId: uuid("client_request_id").notNull(),
    /** Canonical user-local date, computed by the server. */
    loggedOn: date("logged_on", { mode: "string" }).notNull(),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("workout_entries_user_client_request_unique").on(
      table.userId,
      table.clientRequestId,
    ),
    index("workout_entries_user_logged_on_index").on(
      table.userId,
      table.loggedOn,
    ),
    check(
      "workout_entries_kind_check",
      sql`${table.kind} IN ('strength', 'cardio', 'recovery')`,
    ),
    check(
      "workout_entries_name_length_check",
      sql`char_length(btrim(${table.name})) BETWEEN 1 AND 80`,
    ),
    check(
      "workout_entries_notes_length_check",
      sql`${table.notes} IS NULL OR char_length(${table.notes}) <= 500`,
    ),
  ],
);

/** One exercise or activity row inside a workout session. */
export const workoutExercisesTable = pgTable(
  "workout_exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workoutEntryId: uuid("workout_entry_id")
      .notNull()
      .references(() => workoutEntriesTable.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    name: text("name").notNull(),
    sets: integer("sets"),
    reps: integer("reps"),
    loadKg: doublePrecision("load_kg"),
    durationMinutes: integer("duration_minutes"),
    distanceKm: doublePrecision("distance_km"),
    caloriesKcal: integer("calories_kcal"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("workout_exercises_entry_position_unique").on(
      table.workoutEntryId,
      table.position,
    ),
    index("workout_exercises_entry_index").on(table.workoutEntryId),
    check(
      "workout_exercises_position_range_check",
      sql`${table.position} BETWEEN 0 AND 49`,
    ),
    check(
      "workout_exercises_name_length_check",
      sql`char_length(btrim(${table.name})) BETWEEN 1 AND 80`,
    ),
    check(
      "workout_exercises_sets_range_check",
      sql`${table.sets} IS NULL OR ${table.sets} BETWEEN 1 AND 20`,
    ),
    check(
      "workout_exercises_reps_range_check",
      sql`${table.reps} IS NULL OR ${table.reps} BETWEEN 1 AND 100`,
    ),
    check(
      "workout_exercises_load_range_check",
      sql`${table.loadKg} IS NULL OR (${table.loadKg} >= 0 AND ${table.loadKg} <= 1000 AND ${table.loadKg} NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision))`,
    ),
    check(
      "workout_exercises_duration_range_check",
      sql`${table.durationMinutes} IS NULL OR ${table.durationMinutes} BETWEEN 1 AND 1440`,
    ),
    check(
      "workout_exercises_distance_range_check",
      sql`${table.distanceKm} IS NULL OR (${table.distanceKm} > 0 AND ${table.distanceKm} <= 1000 AND ${table.distanceKm} NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision))`,
    ),
    check(
      "workout_exercises_calories_range_check",
      sql`${table.caloriesKcal} IS NULL OR ${table.caloriesKcal} BETWEEN 0 AND 10000`,
    ),
  ],
);

export const insertWorkoutEntrySchema = createInsertSchema(
  workoutEntriesTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWorkoutExerciseSchema = createInsertSchema(
  workoutExercisesTable,
).omit({ id: true, createdAt: true });

export type InsertWorkoutEntry = z.infer<typeof insertWorkoutEntrySchema>;
export type WorkoutEntry = typeof workoutEntriesTable.$inferSelect;
export type InsertWorkoutExercise = z.infer<typeof insertWorkoutExerciseSchema>;
export type WorkoutExercise = typeof workoutExercisesTable.$inferSelect;
