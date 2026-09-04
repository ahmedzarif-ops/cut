import { createHash, randomUUID } from "node:crypto";
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import { clerkClient, getAuth } from "@clerk/express";
import { isClerkAPIResponseError } from "@clerk/shared/error";
import type { Request } from "express";
import {
  accountDeletionRequestsTable,
  db,
  usersTable,
  type AccountDeletionRequest,
} from "@workspace/db";
import {
  getRevenueCatCustomerDeletionProvider,
  invalidateSubscriptionStatusForUser,
  isValidRevenueCatAppUserId,
  RevenueCatCustomerDeletionError,
} from "./revenueCatSubscriptionService";

export type AccountDeletionStatus = "none" | "pending" | "completed";

export interface AccountDeletionResult {
  status: "pending" | "completed";
}

export interface AccountDeletionRetrySummary {
  processed: number;
  completed: number;
  pending: number;
  /** Aggregate-only backlog signals; never include identities or error details. */
  pendingBacklogCount: number;
  oldestPendingAgeSeconds: number | null;
  maxPendingAttemptCount: number;
}

export type IdentityDeleter = (clerkUserId: string) => Promise<void>;
export type SubscriptionCustomerDeleter = (
  internalUserId: string,
) => Promise<void>;
export type SubscriptionCustomerDeletionPoller = (
  internalUserId: string,
) => Promise<void>;
type SubscriptionDeletionStatus = "not_started" | "queued" | "confirmed";
interface StageAfterInsertHookContext {
  identityHash: string;
  completeAtBarrier(): Promise<void>;
}
type StageAfterInsertHook = (
  context: StageAfterInsertHookContext,
) => Promise<void>;
type StatusBeforeFallbackHook = (identityHash: string) => Promise<void>;
type LocalDeletionFinalizer = (
  identityHash: string,
  clerkUserId: string,
  leaseToken: string,
) => Promise<void>;

const DELETION_LEASE_DURATION_SQL = sql`INTERVAL '2 minutes'`;

const defaultIdentityDeleter: IdentityDeleter = async (clerkUserId) => {
  await clerkClient.users.deleteUser(clerkUserId);
};

const defaultSubscriptionCustomerDeleter: SubscriptionCustomerDeleter = async (
  internalUserId,
) => {
  await getRevenueCatCustomerDeletionProvider().deleteCustomer(internalUserId);
};

const defaultSubscriptionCustomerDeletionPoller: SubscriptionCustomerDeletionPoller =
  async (internalUserId) => {
    await getRevenueCatCustomerDeletionProvider().confirmCustomerDeleted(
      internalUserId,
    );
  };

let identityDeleter: IdentityDeleter = defaultIdentityDeleter;
let subscriptionCustomerDeleter: SubscriptionCustomerDeleter =
  defaultSubscriptionCustomerDeleter;
let subscriptionCustomerDeletionPoller: SubscriptionCustomerDeletionPoller =
  defaultSubscriptionCustomerDeletionPoller;
let stageAfterInsertHook: StageAfterInsertHook | null = null;
let statusBeforeFallbackHook: StatusBeforeFallbackHook | null = null;
let localDeletionFinalizer: LocalDeletionFinalizer;

/** Test seam for the external identity operation; pass null to restore Clerk. */
export function setAccountIdentityDeleter(
  deleter: IdentityDeleter | null,
): void {
  identityDeleter = deleter ?? defaultIdentityDeleter;
}

/** Test seam for RevenueCat customer deletion; pass null to restore it. */
export function setAccountSubscriptionCustomerDeleter(
  deleter: SubscriptionCustomerDeleter | null,
): void {
  subscriptionCustomerDeleter = deleter ?? defaultSubscriptionCustomerDeleter;
}

/** Test seam for GET-only polling after RevenueCat accepts a queued delete. */
export function setAccountSubscriptionCustomerDeletionPoller(
  poller: SubscriptionCustomerDeletionPoller | null,
): void {
  subscriptionCustomerDeletionPoller =
    poller ?? defaultSubscriptionCustomerDeletionPoller;
}

/** Test-only race seam after insert-do-nothing and before pending refresh. */
export function setAccountDeletionStageAfterInsertHook(
  hook: StageAfterInsertHook | null,
): void {
  stageAfterInsertHook = hook;
}

/** Test-only race seam between the first durable read and fallback lookup. */
export function setAccountDeletionStatusBeforeFallbackHook(
  hook: StatusBeforeFallbackHook | null,
): void {
  statusBeforeFallbackHook = hook;
}

/** Test seam for a failure after Clerk succeeds but before local completion. */
export function setAccountDeletionFinalizer(
  finalizer: LocalDeletionFinalizer | null,
): void {
  localDeletionFinalizer = finalizer ?? finalizeAccountDeletion;
}

/** One-way identity key used for durable tombstones and privacy-safe logs. */
export function hashClerkIdentity(clerkUserId: string): string {
  return createHash("sha256").update(clerkUserId, "utf8").digest("hex");
}

/**
 * Special authentication for deletion/status routes. It deliberately does not
 * provision or resolve an internal user, so tombstoned identities can retry.
 */
export function getAccountDeletionIdentity(req: Request): string | null {
  return getAuth(req)?.userId ?? null;
}

async function getDeletionRequest(
  identityHash: string,
): Promise<AccountDeletionRequest | undefined> {
  const [request] = await db
    .select()
    .from(accountDeletionRequestsTable)
    .where(eq(accountDeletionRequestsTable.identityHash, identityHash));
  return request;
}

/** Check the durable tombstone without reading or creating a user row. */
export async function getDurableDeletionStatus(
  identityHash: string,
): Promise<AccountDeletionStatus> {
  const request = await getDeletionRequest(identityHash);
  if (request?.status === "completed") return "completed";
  if (request?.status === "pending") return "pending";
  return "none";
}

/**
 * Close the deletion race after resolving or creating a user. A pending
 * request locks access but preserves retained data for retry. A completed
 * tombstone atomically removes only the exact identity/user pair before access
 * is denied, so a stale token can never leave a new active row behind.
 */
export async function enforcePostProvisionDeletionGuard(input: {
  identityHash: string;
  clerkUserId: string;
  userId: string;
}): Promise<AccountDeletionStatus> {
  if (hashClerkIdentity(input.clerkUserId) !== input.identityHash) {
    throw new Error("Account deletion identity guard mismatch");
  }

  return db.transaction(async (tx) => {
    const [request] = await tx
      .select({ status: accountDeletionRequestsTable.status })
      .from(accountDeletionRequestsTable)
      .where(eq(accountDeletionRequestsTable.identityHash, input.identityHash));
    if (request?.status === "pending") return "pending";
    if (request?.status !== "completed") return "none";

    await tx
      .delete(usersTable)
      .where(
        and(
          eq(usersTable.id, input.userId),
          eq(usersTable.clerkUserId, input.clerkUserId),
        ),
      );
    return "completed";
  });
}

/** Public status lookup. This is read-only and never JIT-provisions a user. */
export async function getAccountDeletionStatus(
  clerkUserId: string,
): Promise<AccountDeletionStatus> {
  const identityHash = hashClerkIdentity(clerkUserId);
  const durableStatus = await getDurableDeletionStatus(identityHash);
  if (durableStatus !== "none") return durableStatus;
  await statusBeforeFallbackHook?.(identityHash);

  // Defensive fallback for a legacy/inconsistent pending row. The normal
  // staging transaction always writes the request and user tombstone together.
  const [pendingUser] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.clerkUserId, clerkUserId),
        eq(usersTable.deletionStatus, "pending"),
      ),
    );
  if (pendingUser) return "pending";

  // A deletion may have completed after the first durable read and removed its
  // user before the fallback query. Re-read before reporting none.
  return getDurableDeletionStatus(identityHash);
}

async function stageAccountDeletion(
  clerkUserId: string,
  identityHash: string,
): Promise<AccountDeletionRequest> {
  return db.transaction(async (tx) => {
    const now = new Date();
    await tx
      .insert(accountDeletionRequestsTable)
      .values({ identityHash, clerkUserId, status: "pending" })
      .onConflictDoNothing({
        target: accountDeletionRequestsTable.identityHash,
      });

    await stageAfterInsertHook?.({
      identityHash,
      async completeAtBarrier() {
        const completedAt = new Date();
        await tx
          .update(accountDeletionRequestsTable)
          .set({
            clerkUserId: null,
            status: "completed",
            completedAt,
            subscriptionDeletionStatus: "confirmed",
            leaseToken: null,
            leaseExpiresAt: null,
            updatedAt: completedAt,
          })
          .where(eq(accountDeletionRequestsTable.identityHash, identityHash));
        await tx
          .delete(usersTable)
          .where(eq(usersTable.clerkUserId, clerkUserId));
      },
    });

    // Monotonic state transition: a concurrent finalizer may have changed the
    // row to completed after this stage began. Only a still-pending row may be
    // refreshed; completed can never regress or regain a raw Clerk ID.
    await tx
      .update(accountDeletionRequestsTable)
      .set({ clerkUserId, status: "pending", updatedAt: now })
      .where(
        and(
          eq(accountDeletionRequestsTable.identityHash, identityHash),
          eq(accountDeletionRequestsTable.status, "pending"),
        ),
      );

    const [request] = await tx
      .select()
      .from(accountDeletionRequestsTable)
      .where(eq(accountDeletionRequestsTable.identityHash, identityHash));
    if (!request) throw new Error("Account deletion request was not staged");
    if (request.status === "completed") return request;
    if (request.status !== "pending") {
      throw new Error("Account deletion request has an invalid state");
    }

    // The unique Clerk ID constraint is the race guard against an eligibility
    // decision creating the row between the durable-request check and staging.
    await tx
      .insert(usersTable)
      .values({ clerkUserId, deletionStatus: "pending" })
      .onConflictDoUpdate({
        target: usersTable.clerkUserId,
        set: { deletionStatus: "pending", updatedAt: now },
      });

    return request;
  });
}

function identityAlreadyDeleted(error: unknown): boolean {
  return isClerkAPIResponseError(error) && error.status === 404;
}

function sanitizedIdentityErrorCode(error: unknown): string {
  const status = isClerkAPIResponseError(error) ? error.status : undefined;
  if (status === 401 || status === 403) return "identity_auth_failed";
  if (status === 429) return "identity_rate_limited";
  if (status !== undefined && status >= 500) return "identity_unavailable";
  if (status !== undefined) return "identity_request_failed";
  return "identity_transport_failed";
}

function subscriptionCustomerAlreadyDeleted(error: unknown): boolean {
  return (
    error instanceof RevenueCatCustomerDeletionError &&
    error.reason === "not_found"
  );
}

function sanitizedSubscriptionErrorCode(error: unknown): string {
  if (!(error instanceof RevenueCatCustomerDeletionError)) {
    return "subscription_transport_failed";
  }
  switch (error.reason) {
    case "invalid_app_user_id":
      return "subscription_customer_id_invalid";
    case "not_configured":
    case "auth_error":
      return "subscription_auth_failed";
    case "invalid_configuration":
      return "subscription_configuration_invalid";
    case "rate_limited":
      return "subscription_rate_limited";
    case "timeout":
    case "network_error":
    case "provider_unavailable":
      return "subscription_unavailable";
    case "invalid_response":
      return "subscription_response_invalid";
    case "deletion_queued":
      return "subscription_deletion_queued";
    case "not_found":
    case "provider_error":
      return "subscription_request_failed";
  }
}

async function resolveSubscriptionCustomerId(
  clerkUserId: string,
): Promise<string | null> {
  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .limit(1);
  return user?.id ?? null;
}

interface DeletionAttemptClaim {
  leaseToken: string;
  subscriptionDeletionStatus: SubscriptionDeletionStatus;
}

async function claimDeletionAttempt(
  identityHash: string,
): Promise<DeletionAttemptClaim | null> {
  const leaseToken = randomUUID();
  const [request] = await db
    .update(accountDeletionRequestsTable)
    .set({
      leaseToken,
      leaseExpiresAt: sql`CURRENT_TIMESTAMP + ${DELETION_LEASE_DURATION_SQL}`,
      attemptCount: sql`${accountDeletionRequestsTable.attemptCount} + 1`,
      lastAttemptAt: sql`CURRENT_TIMESTAMP`,
      lastErrorCode: null,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(
      and(
        eq(accountDeletionRequestsTable.identityHash, identityHash),
        eq(accountDeletionRequestsTable.status, "pending"),
        sql`(${accountDeletionRequestsTable.leaseToken} IS NULL OR ${accountDeletionRequestsTable.leaseExpiresAt} <= CURRENT_TIMESTAMP)`,
      ),
    )
    .returning({
      leaseToken: accountDeletionRequestsTable.leaseToken,
      subscriptionDeletionStatus:
        accountDeletionRequestsTable.subscriptionDeletionStatus,
    });
  if (!request?.leaseToken) return null;
  if (
    request.subscriptionDeletionStatus !== "not_started" &&
    request.subscriptionDeletionStatus !== "queued" &&
    request.subscriptionDeletionStatus !== "confirmed"
  ) {
    return null;
  }
  return {
    leaseToken: request.leaseToken,
    subscriptionDeletionStatus: request.subscriptionDeletionStatus,
  };
}

async function renewDeletionLease(
  identityHash: string,
  leaseToken: string,
): Promise<boolean> {
  const [renewed] = await db
    .update(accountDeletionRequestsTable)
    .set({
      leaseExpiresAt: sql`CURRENT_TIMESTAMP + ${DELETION_LEASE_DURATION_SQL}`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(
      and(
        eq(accountDeletionRequestsTable.identityHash, identityHash),
        eq(accountDeletionRequestsTable.status, "pending"),
        eq(accountDeletionRequestsTable.leaseToken, leaseToken),
        sql`${accountDeletionRequestsTable.leaseExpiresAt} > CURRENT_TIMESTAMP`,
      ),
    )
    .returning({ leaseToken: accountDeletionRequestsTable.leaseToken });
  return renewed?.leaseToken === leaseToken;
}

async function recordFailure(
  identityHash: string,
  leaseToken: string,
  lastErrorCode: string,
  subscriptionDeletionStatus?: SubscriptionDeletionStatus,
): Promise<void> {
  try {
    await db
      .update(accountDeletionRequestsTable)
      .set({
        lastErrorCode,
        lastAttemptAt: sql`CURRENT_TIMESTAMP`,
        ...(subscriptionDeletionStatus ? { subscriptionDeletionStatus } : {}),
        leaseToken: null,
        leaseExpiresAt: null,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(
        and(
          eq(accountDeletionRequestsTable.identityHash, identityHash),
          eq(accountDeletionRequestsTable.status, "pending"),
          eq(accountDeletionRequestsTable.leaseToken, leaseToken),
        ),
      );
  } catch {
    // Best effort only. The durable pending row created before any external
    // call remains the source of truth even if metadata cannot be updated.
  }
}

async function markSubscriptionDeletionConfirmed(
  identityHash: string,
  leaseToken: string,
): Promise<boolean> {
  const [confirmed] = await db
    .update(accountDeletionRequestsTable)
    .set({
      subscriptionDeletionStatus: "confirmed",
      leaseExpiresAt: sql`CURRENT_TIMESTAMP + ${DELETION_LEASE_DURATION_SQL}`,
      lastErrorCode: null,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(
      and(
        eq(accountDeletionRequestsTable.identityHash, identityHash),
        eq(accountDeletionRequestsTable.status, "pending"),
        eq(accountDeletionRequestsTable.leaseToken, leaseToken),
        sql`${accountDeletionRequestsTable.leaseExpiresAt} > CURRENT_TIMESTAMP`,
      ),
    )
    .returning({
      subscriptionDeletionStatus:
        accountDeletionRequestsTable.subscriptionDeletionStatus,
    });
  return confirmed?.subscriptionDeletionStatus === "confirmed";
}

async function finalizeAccountDeletion(
  identityHash: string,
  clerkUserId: string,
  leaseToken: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const now = new Date();
    const [completed] = await tx
      .update(accountDeletionRequestsTable)
      .set({
        clerkUserId: null,
        status: "completed",
        completedAt: now,
        lastErrorCode: null,
        leaseToken: null,
        leaseExpiresAt: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(accountDeletionRequestsTable.identityHash, identityHash),
          eq(accountDeletionRequestsTable.status, "pending"),
          eq(
            accountDeletionRequestsTable.subscriptionDeletionStatus,
            "confirmed",
          ),
          eq(accountDeletionRequestsTable.leaseToken, leaseToken),
          sql`${accountDeletionRequestsTable.leaseExpiresAt} > CURRENT_TIMESTAMP`,
        ),
      )
      .returning({ status: accountDeletionRequestsTable.status });
    if (completed?.status !== "completed") {
      throw new Error("Account deletion request was not finalized");
    }

    // Match staging's request→user lock order to avoid cross-flow deadlocks.
    // The surrounding transaction still commits the completed tombstone and
    // user cascade atomically.
    await tx.delete(usersTable).where(eq(usersTable.clerkUserId, clerkUserId));
  });
}

localDeletionFinalizer = finalizeAccountDeletion;

async function attemptPendingDeletion(
  identityHash: string,
  clerkUserId: string,
): Promise<AccountDeletionResult> {
  let claim: DeletionAttemptClaim | null;
  try {
    claim = await claimDeletionAttempt(identityHash);
  } catch {
    return terminalAwarePendingResult(identityHash);
  }
  if (!claim) return terminalAwarePendingResult(identityHash);
  const { leaseToken, subscriptionDeletionStatus } = claim;

  // Treat the durable hash/identity pair as a destructive-operation boundary.
  // Even if a row is corrupted or mis-migrated, never let the retry worker
  // send a deletion request for an identity that does not own this tombstone.
  if (hashClerkIdentity(clerkUserId) !== identityHash) {
    await recordFailure(identityHash, leaseToken, "identity_binding_invalid");
    return terminalAwarePendingResult(identityHash);
  }

  let subscriptionCustomerId: string | null;
  try {
    subscriptionCustomerId = await resolveSubscriptionCustomerId(clerkUserId);
  } catch {
    await recordFailure(
      identityHash,
      leaseToken,
      "subscription_customer_resolve_failed",
    );
    return terminalAwarePendingResult(identityHash);
  }
  if (!subscriptionCustomerId) {
    await recordFailure(
      identityHash,
      leaseToken,
      "subscription_customer_id_unavailable",
    );
    return terminalAwarePendingResult(identityHash);
  }
  if (!isValidRevenueCatAppUserId(subscriptionCustomerId)) {
    await recordFailure(
      identityHash,
      leaseToken,
      "subscription_customer_id_invalid",
    );
    return terminalAwarePendingResult(identityHash);
  }

  try {
    invalidateSubscriptionStatusForUser(subscriptionCustomerId);
  } catch {
    await recordFailure(
      identityHash,
      leaseToken,
      "subscription_cache_invalidation_failed",
    );
    return terminalAwarePendingResult(identityHash);
  }

  if (subscriptionDeletionStatus !== "confirmed") {
    try {
      if (subscriptionDeletionStatus === "queued") {
        // A queued v2 DELETE is nonterminal. Durable state guarantees every
        // retry after it uses only RevenueCat's non-creating customer GET.
        await subscriptionCustomerDeletionPoller(subscriptionCustomerId);
      } else {
        await subscriptionCustomerDeleter(subscriptionCustomerId);
      }
    } catch (error: unknown) {
      // Only our typed RevenueCat 404 for the validated UUID is considered
      // already absent. A plain/misleading 404 remains ambiguous and retryable.
      if (!subscriptionCustomerAlreadyDeleted(error)) {
        const queued =
          error instanceof RevenueCatCustomerDeletionError &&
          error.reason === "deletion_queued";
        await recordFailure(
          identityHash,
          leaseToken,
          sanitizedSubscriptionErrorCode(error),
          queued ? "queued" : undefined,
        );
        return terminalAwarePendingResult(identityHash);
      }
    }

    if (!(await markSubscriptionDeletionConfirmed(identityHash, leaseToken))) {
      return terminalAwarePendingResult(identityHash);
    }
  }

  if (!(await renewDeletionLease(identityHash, leaseToken))) {
    return terminalAwarePendingResult(identityHash);
  }

  try {
    await identityDeleter(clerkUserId);
  } catch (error: unknown) {
    if (!identityAlreadyDeleted(error)) {
      await recordFailure(
        identityHash,
        leaseToken,
        sanitizedIdentityErrorCode(error),
      );
      return terminalAwarePendingResult(identityHash);
    }
  }

  if (!(await renewDeletionLease(identityHash, leaseToken))) {
    return terminalAwarePendingResult(identityHash);
  }

  // Fence any status read completed while either vendor deletion was in
  // progress. Failure remains retryable rather than finalizing with stale data.
  try {
    invalidateSubscriptionStatusForUser(subscriptionCustomerId);
  } catch {
    await recordFailure(
      identityHash,
      leaseToken,
      "subscription_cache_invalidation_failed",
    );
    return terminalAwarePendingResult(identityHash);
  }

  try {
    await localDeletionFinalizer(identityHash, clerkUserId, leaseToken);
    return { status: "completed" };
  } catch {
    await recordFailure(identityHash, leaseToken, "local_finalize_failed");
    return terminalAwarePendingResult(identityHash);
  }
}

async function terminalAwarePendingResult(
  identityHash: string,
): Promise<AccountDeletionResult> {
  try {
    return {
      status:
        (await getDurableDeletionStatus(identityHash)) === "completed"
          ? "completed"
          : "pending",
    };
  } catch {
    return { status: "pending" };
  }
}

/**
 * Tombstone first, delete the RevenueCat customer, delete the external
 * identity, then atomically cascade local data and preserve a completed
 * tombstone. Safe to call repeatedly; none of these operations cancels the
 * user's separately managed Apple subscription.
 */
export async function requestAccountDeletion(
  clerkUserId: string,
): Promise<AccountDeletionResult> {
  const identityHash = hashClerkIdentity(clerkUserId);
  const request = await stageAccountDeletion(clerkUserId, identityHash);
  if (request.status === "completed") return { status: "completed" };

  // Invalidate immediately after the durable pending state exists, including
  // when another worker already owns the lease and this request cannot claim.
  try {
    const subscriptionCustomerId =
      await resolveSubscriptionCustomerId(clerkUserId);
    if (
      subscriptionCustomerId &&
      isValidRevenueCatAppUserId(subscriptionCustomerId)
    ) {
      invalidateSubscriptionStatusForUser(subscriptionCustomerId);
    }
  } catch {
    // The claimed attempt records a stable failure code if this condition is
    // persistent. The durable pending guard already prevents app access.
  }
  return attemptPendingDeletion(identityHash, clerkUserId);
}

/** Retry a bounded batch of durable pending requests for the background worker. */
export async function retryPendingAccountDeletions(
  limit = 10,
): Promise<AccountDeletionRetrySummary> {
  const safeLimit = Number.isInteger(limit)
    ? Math.min(100, Math.max(1, limit))
    : 10;
  const pending = await db
    .select({
      identityHash: accountDeletionRequestsTable.identityHash,
      clerkUserId: accountDeletionRequestsTable.clerkUserId,
    })
    .from(accountDeletionRequestsTable)
    .where(
      and(
        eq(accountDeletionRequestsTable.status, "pending"),
        isNotNull(accountDeletionRequestsTable.clerkUserId),
        sql`(${accountDeletionRequestsTable.leaseToken} IS NULL OR ${accountDeletionRequestsTable.leaseExpiresAt} <= CURRENT_TIMESTAMP)`,
      ),
    )
    // Explicitly prioritize never-attempted work, then the least-recently
    // attempted request, with requestedAt as a stable tie.
    .orderBy(
      sql`${accountDeletionRequestsTable.lastAttemptAt} ASC NULLS FIRST`,
      asc(accountDeletionRequestsTable.requestedAt),
    )
    .limit(safeLimit);

  let completed = 0;
  for (const request of pending) {
    if (!request.clerkUserId) continue;
    const result = await attemptPendingDeletion(
      request.identityHash,
      request.clerkUserId,
    );
    if (result.status === "completed") completed += 1;
  }

  // Measure the complete durable backlog after this batch, including work leased
  // by another replica. These aggregate-only values are safe to send to logs and
  // let provider-neutral alerts detect old or repeatedly failing deletions.
  const [backlog] = await db
    .select({
      pendingBacklogCount: sql<number>`COUNT(*)::integer`,
      oldestPendingAgeSeconds: sql<number | null>`
        CASE
          WHEN COUNT(*) = 0 THEN NULL
          ELSE GREATEST(
            0,
            FLOOR(
              EXTRACT(
                EPOCH FROM (
                  CURRENT_TIMESTAMP - MIN(${accountDeletionRequestsTable.requestedAt})
                )
              )
            )
          )::integer
        END
      `,
      maxPendingAttemptCount: sql<number>`
        COALESCE(MAX(${accountDeletionRequestsTable.attemptCount}), 0)::integer
      `,
    })
    .from(accountDeletionRequestsTable)
    .where(eq(accountDeletionRequestsTable.status, "pending"));

  return {
    processed: pending.length,
    completed,
    pending: pending.length - completed,
    pendingBacklogCount: backlog?.pendingBacklogCount ?? 0,
    oldestPendingAgeSeconds: backlog?.oldestPendingAgeSeconds ?? null,
    maxPendingAttemptCount: backlog?.maxPendingAttemptCount ?? 0,
  };
}
