import {
  date,
  doublePrecision,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { usersTable } from "./users";

/** One canonical weigh-in per user-local calendar day. */
export const weightEntriesTable = pgTable(
  "weight_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    recordedOn: date("recorded_on", { mode: "string" }).notNull(),
    weightKg: doublePrecision("weight_kg").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("weight_entries_user_recorded_on_unique").on(
      table.userId,
      table.recordedOn,
    ),
  ],
);

export const insertWeightEntrySchema = createInsertSchema(
  weightEntriesTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertWeightEntry = z.infer<typeof insertWeightEntrySchema>;
export type WeightEntry = typeof weightEntriesTable.$inferSelect;
