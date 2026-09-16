import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Durable account-deletion coordination state, intentionally independent of
 * users so it survives the user-row cascade and prevents JIT reprovisioning.
 * No body, fitness, or nutrition values belong in this table.
 */
export const accountDeletionRequestsTable = pgTable(
  "account_deletion_requests",
  {
    /** One-way digest of the high-entropy external ID; never a bearer token. */
    identityHash: text("identity_hash").primaryKey(),
    /** Needed only while coordinating Clerk deletion; erase on completion. */
    clerkUserId: text("clerk_user_id"),
    status: text("status").notNull().default("pending"),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    /** Stable operational code only; never store raw vendor errors. */
    lastErrorCode: text("last_error_code"),
    /** Durable phase prevents a queued RevenueCat DELETE from being repeated. */
    subscriptionDeletionStatus: text("subscription_deletion_status")
      .notNull()
      .default("not_started"),
    /** Opaque fencing token for the one worker allowed to call vendors. */
    leaseToken: uuid("lease_token"),
    /** A crashed claimant may be replaced only after this database time. */
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "account_deletion_requests_status_check",
      sql`${table.status} IN ('pending', 'completed')`,
    ),
    check(
      "account_deletion_requests_attempt_count_check",
      sql`${table.attemptCount} >= 0`,
    ),
    check(
      "account_deletion_requests_identity_hash_check",
      sql`${table.identityHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "account_deletion_requests_lifecycle_check",
      sql`(${table.status} = 'pending' AND ${table.clerkUserId} IS NOT NULL AND ${table.completedAt} IS NULL) OR (${table.status} = 'completed' AND ${table.clerkUserId} IS NULL AND ${table.completedAt} IS NOT NULL AND ${table.lastErrorCode} IS NULL AND ${table.subscriptionDeletionStatus} = 'confirmed')`,
    ),
    check(
      "account_deletion_requests_lease_check",
      sql`(${table.leaseToken} IS NULL AND ${table.leaseExpiresAt} IS NULL) OR (${table.status} = 'pending' AND ${table.leaseToken} IS NOT NULL AND ${table.leaseExpiresAt} IS NOT NULL)`,
    ),
    check(
      "account_deletion_requests_subscription_deletion_status_check",
      sql`${table.subscriptionDeletionStatus} IN ('not_started', 'queued', 'confirmed')`,
    ),
    index("account_deletion_requests_retry_index").on(
      table.status,
      table.lastAttemptAt,
      table.requestedAt,
    ),
    index("account_deletion_requests_lease_index").on(
      table.status,
      table.leaseExpiresAt,
    ),
  ],
);

export const insertAccountDeletionRequestSchema = createInsertSchema(
  accountDeletionRequestsTable,
).omit({
  requestedAt: true,
  updatedAt: true,
});
export type InsertAccountDeletionRequest = z.infer<
  typeof insertAccountDeletionRequestSchema
>;
export type AccountDeletionRequest =
  typeof accountDeletionRequestsTable.$inferSelect;
