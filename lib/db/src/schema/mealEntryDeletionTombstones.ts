import { pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { usersTable } from "./users";

/**
 * Consumes a meal-create request UUID after the user deletes its row. Keeping
 * only the opaque key prevents a delayed create retry from resurrecting the
 * meal, without retaining its template, serving, or nutrition snapshot.
 */
export const mealEntryDeletionTombstonesTable = pgTable(
  "meal_entry_deletion_tombstones",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    clientRequestId: uuid("client_request_id").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "meal_entry_deletion_tombstones_pk",
      columns: [table.userId, table.clientRequestId],
    }),
  ],
);

export const insertMealEntryDeletionTombstoneSchema = createInsertSchema(
  mealEntryDeletionTombstonesTable,
).omit({ deletedAt: true });
export type InsertMealEntryDeletionTombstone = z.infer<
  typeof insertMealEntryDeletionTombstoneSchema
>;
export type MealEntryDeletionTombstone =
  typeof mealEntryDeletionTombstonesTable.$inferSelect;
