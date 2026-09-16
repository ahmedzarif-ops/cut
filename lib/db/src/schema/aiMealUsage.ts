import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { usersTable } from "./users";

/**
 * Minimal accounting for paid meal-generation calls. Prompts, responses,
 * ingredient lists, and photos are deliberately not stored here.
 */
export const aiMealUsageTable = pgTable(
  "ai_meal_usage",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    usageDay: date("usage_day", { mode: "string" }).notNull(),
    requestCount: integer("request_count").notNull().default(0),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    reservedCostMicrodollars: integer("reserved_cost_microdollars")
      .notNull()
      .default(0),
    spentCostMicrodollars: integer("spent_cost_microdollars")
      .notNull()
      .default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.usageDay] }),
    index("ai_meal_usage_day_index").on(table.usageDay),
    check(
      "ai_meal_usage_nonnegative_check",
      sql`${table.requestCount} >= 0 AND ${table.inputTokens} >= 0 AND ${table.outputTokens} >= 0 AND ${table.reservedCostMicrodollars} >= 0 AND ${table.spentCostMicrodollars} >= 0`,
    ),
  ],
);

export const insertAiMealUsageSchema = createInsertSchema(
  aiMealUsageTable,
).omit({ createdAt: true, updatedAt: true });
export type InsertAiMealUsage = z.infer<typeof insertAiMealUsageSchema>;
export type AiMealUsage = typeof aiMealUsageTable.$inferSelect;
