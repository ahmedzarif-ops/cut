import { createHash } from "node:crypto";
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

export type AccountDeletionStatus = "none" | "pending" | "completed";

export interface AccountDeletionResult {
  status: "pending" | "completed";
}

export interface AccountDeletionRetrySummary {
  processed: number;
  completed: number;
  pending: number;
}

export type IdentityDeleter = (clerkUserId: string) => Promise<void>;
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
) => Promise<void>;

const defaultIdentityDeleter: IdentityDeleter = async (clerkUserId) => {
  await clerkClient.users.deleteUser(clerkUserId);
};

let identityDeleter: IdentityDeleter = defaultIdentityDeleter;
let stageAfterInsertHook: StageAfterInsertHook | null = null;
let statusBeforeFallbackHook: StatusBeforeFallbackHook | null = null;
let localDeletionFinalizer: LocalDeletionFinalizer;

/** Test seam for the external identity operation; pass null to restore Clerk. */
export function setAccountIdentityDeleter(
  deleter: IdentityDeleter | null,
): void {
  identityDeleter = deleter ?? defaultIdentityDeleter;
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

async function recordAttempt(identityHash: string): Promise<boolean> {
  const [request] = await db
    .update(accountDeletionRequestsTable)
    .set({
      attemptCount: sql`${accountDeletionRequestsTable.attemptCount} + 1`,
      lastAttemptAt: new Date(),
      lastErrorCode: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(accountDeletionRequestsTable.identityHash, identityHash),
        eq(accountDeletionRequestsTable.status, "pending"),
      ),
    )
    .returning({ identityHash: accountDeletionRequestsTable.identityHash });
  return Boolean(request);
}

async function recordFailure(
  identityHash: string,
  lastErrorCode: string,
): Promise<void> {
  try {
    await db
      .update(accountDeletionRequestsTable)
      .set({ lastErrorCode, lastAttemptAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(accountDeletionRequestsTable.identityHash, identityHash),
          eq(accountDeletionRequestsTable.status, "pending"),
        ),
      );
  } catch {
    // Best effort only. The durable pending row created before any external
    // call remains the source of truth even if metadata cannot be updated.
  }
}

async function finalizeAccountDeletion(
  identityHash: string,
  clerkUserId: string,
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
        updatedAt: now,
      })
      .where(eq(accountDeletionRequestsTable.identityHash, identityHash))
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
  // Treat the durable hash/identity pair as a destructive-operation boundary.
  // Even if a row is corrupted or mis-migrated, never let the retry worker
  // send a deletion request for an identity that does not own this tombstone.
  if (hashClerkIdentity(clerkUserId) !== identityHash) {
    await recordFailure(identityHash, "identity_binding_invalid");
    return terminalAwarePendingResult(identityHash);
  }

  try {
    const attempted = await recordAttempt(identityHash);
    if (!attempted) {
      return {
        status:
          (await getDurableDeletionStatus(identityHash)) === "completed"
            ? "completed"
            : "pending",
      };
    }
  } catch {
    await recordFailure(identityHash, "local_attempt_failed");
    return terminalAwarePendingResult(identityHash);
  }

  try {
    await identityDeleter(clerkUserId);
  } catch (error: unknown) {
    if (!identityAlreadyDeleted(error)) {
      await recordFailure(identityHash, sanitizedIdentityErrorCode(error));
      return terminalAwarePendingResult(identityHash);
    }
  }

  try {
    await localDeletionFinalizer(identityHash, clerkUserId);
    return { status: "completed" };
  } catch {
    await recordFailure(identityHash, "local_finalize_failed");
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
 * Tombstone first, then delete the external identity, then atomically cascade
 * local data and preserve a completed tombstone. Safe to call repeatedly.
 */
export async function requestAccountDeletion(
  clerkUserId: string,
): Promise<AccountDeletionResult> {
  const identityHash = hashClerkIdentity(clerkUserId);
  const request = await stageAccountDeletion(clerkUserId, identityHash);
  if (request.status === "completed") return { status: "completed" };
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

  return {
    processed: pending.length,
    completed,
    pending: pending.length - completed,
  };
}
