import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { usersTable } from "./users";

/** Direct preference feedback for a reviewed fixed catalog meal. */
export const mealFeedbackTable = pgTable(
  "meal_feedback",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    templateId: text("template_id").notNull(),
    preference: text("preference").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.templateId] }),
    index("meal_feedback_user_updated_index").on(table.userId, table.updatedAt),
    check(
      "meal_feedback_preference_check",
      sql`${table.preference} IN ('liked', 'not_for_me')`,
    ),
  ],
);

export const insertMealFeedbackSchema = createInsertSchema(
  mealFeedbackTable,
).omit({ createdAt: true, updatedAt: true });
export type InsertMealFeedback = z.infer<typeof insertMealFeedbackSchema>;
export type MealFeedback = typeof mealFeedbackTable.$inferSelect;
