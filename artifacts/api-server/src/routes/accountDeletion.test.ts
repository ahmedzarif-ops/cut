import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { ClerkAPIResponseError } from "@clerk/shared/error";
import {
  accountDeletionRequestsTable,
  mealEntryDeletionTombstonesTable,
  mealEntriesTable,
  profilesTable,
  usersTable,
  weightEntriesTable,
} from "@workspace/db";

import {
  hashClerkIdentity,
  retryPendingAccountDeletions,
  setAccountDeletionFinalizer,
  setAccountDeletionStageAfterInsertHook,
  setAccountDeletionStatusBeforeFallbackHook,
  setAccountIdentityDeleter,
} from "../services/accountDeletionService";
import { startAccountDeletionWorker } from "../services/accountDeletionWorker";
import { setRequireAuthAfterDeletionPrecheckHook } from "../middlewares/requireAuth";
import {
  TEST_USER_HEADER,
  createTestContext,
  makeTestUserEligible,
  type TestContext,
} from "../test/helpers";

let ctx: TestContext;
const asUser = (id: string) => ({ [TEST_USER_HEADER]: id });

beforeEach(async () => {
  ctx = await createTestContext();
});

afterEach(async () => {
  setRequireAuthAfterDeletionPrecheckHook(null);
  setAccountDeletionStageAfterInsertHook(null);
  setAccountDeletionStatusBeforeFallbackHook(null);
  setAccountDeletionFinalizer(null);
  setAccountIdentityDeleter(null);
  await ctx.close();
});

async function seedAccount(
  clerkUserId: string,
  clientRequestId: string,
): Promise<string> {
  const headers = asUser(clerkUserId);
  await makeTestUserEligible(ctx, clerkUserId);
  const me = await request(ctx.app).get("/api/me").set(headers);
  expect(me.status).toBe(200);

  const profile = await request(ctx.app)
    .put("/api/me/profile")
    .set(headers)
    .send({ goal: "cut" });
  expect(profile.status).toBe(200);

  const weight = await request(ctx.app)
    .put("/api/me/weight-entries/today")
    .set(headers)
    .send({ weightKg: 88.4 });
  expect(weight.status).toBe(200);

  const options = await request(ctx.app)
    .get("/api/me/meal-options")
    .set(headers);
  expect(options.status).toBe(200);
  const today = await request(ctx.app).get("/api/me/meals/today").set(headers);
  expect(today.status).toBe(200);

  const meal = await request(ctx.app)
    .post("/api/me/meal-entries")
    .set(headers)
    .send({
      clientRequestId,
      catalogVersion: options.body[0].catalogVersion,
      dayKey: today.body.dayKey,
      mealTemplateId: options.body[0].id,
      servings: 1,
    });
  expect(meal.status).toBe(201);

  return me.body.id as string;
}

async function rowsForUser(
  table:
    | typeof profilesTable
    | typeof weightEntriesTable
    | typeof mealEntriesTable
    | typeof mealEntryDeletionTombstonesTable,
  userId: string,
) {
  return ctx.db.select().from(table).where(eq(table.userId, userId));
}

async function deletionRequest(clerkUserId: string) {
  const [row] = await ctx.db
    .select()
    .from(accountDeletionRequestsTable)
    .where(
      eq(
        accountDeletionRequestsTable.identityHash,
        hashClerkIdentity(clerkUserId),
      ),
    );
  return row;
}

async function usersForIdentity(clerkUserId: string) {
  return ctx.db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId));
}

function clerkProviderError(status: number, code: string) {
  return new ClerkAPIResponseError("Clerk request failed", {
    status,
    data: [{ code, message: "Clerk request failed" }],
  });
}

describe("durable account deletion", () => {
  it("requires special auth and reports none without JIT provisioning", async () => {
    expect((await request(ctx.app).delete("/api/me")).status).toBe(401);
    expect(
      (await request(ctx.app).get("/api/me/account-deletion")).status,
    ).toBe(401);

    const clerkUserId = "status_only_identity";
    const status = await request(ctx.app)
      .get("/api/me/account-deletion")
      .set(asUser(clerkUserId));
    expect(status.status).toBe(200);
    expect(status.body).toEqual({ status: "none" });
    expect(await usersForIdentity(clerkUserId)).toEqual([]);
  });

  it("status re-read observes a deletion completed after its first durable lookup", async () => {
    const clerkUserId = "status_completion_race_identity";
    setAccountIdentityDeleter(vi.fn().mockResolvedValue(undefined));

    let reachedFallback!: () => void;
    const fallbackReached = new Promise<void>((resolve) => {
      reachedFallback = resolve;
    });
    let releaseFallback!: () => void;
    const fallbackBarrier = new Promise<void>((resolve) => {
      releaseFallback = resolve;
    });
    setAccountDeletionStatusBeforeFallbackHook(async () => {
      reachedFallback();
      await fallbackBarrier;
    });

    const statusRequest = request(ctx.app)
      .get("/api/me/account-deletion")
      .set(asUser(clerkUserId))
      .then((response) => response);
    await fallbackReached;
    const deletion = await request(ctx.app)
      .delete("/api/me")
      .set(asUser(clerkUserId));
    releaseFallback();
    const status = await statusRequest;

    expect(deletion.status).toBe(204);
    expect(status.status).toBe(200);
    expect(status.body).toEqual({ status: "completed" });
    expect(await usersForIdentity(clerkUserId)).toEqual([]);
  });

  it("post-resolution guard closes a completed-delete race without running the handler", async () => {
    const clerkUserId = "jit_completed_race_identity";
    await makeTestUserEligible(ctx, clerkUserId);
    const deleteIdentity = vi.fn().mockResolvedValue(undefined);
    setAccountIdentityDeleter(deleteIdentity);

    let reachedPreProvision!: () => void;
    const preProvisionReached = new Promise<void>((resolve) => {
      reachedPreProvision = resolve;
    });
    let releasePreProvision!: () => void;
    const preProvisionBarrier = new Promise<void>((resolve) => {
      releasePreProvision = resolve;
    });
    setRequireAuthAfterDeletionPrecheckHook(async () => {
      reachedPreProvision();
      await preProvisionBarrier;
    });

    const staleRequest = request(ctx.app)
      .get("/api/me")
      .set(asUser(clerkUserId))
      .then((response) => response);
    await preProvisionReached;

    const deletion = await request(ctx.app)
      .delete("/api/me")
      .set(asUser(clerkUserId));
    releasePreProvision();
    const staleResponse = await staleRequest;

    expect(deletion.status).toBe(204);
    expect(staleResponse.status).toBe(410);
    expect(deleteIdentity).toHaveBeenCalledOnce();
    expect((await deletionRequest(clerkUserId))?.status).toBe("completed");
    expect(await usersForIdentity(clerkUserId)).toEqual([]);
  });

  it("deletes Clerk and all local rows, preserves another user, and blocks reprovision", async () => {
    const deleteIdentity = vi.fn().mockResolvedValue(undefined);
    setAccountIdentityDeleter(deleteIdentity);
    const ownerClerkId = "durable_delete_owner";
    const ownerId = await seedAccount(
      ownerClerkId,
      "9e321de0-ddbd-422c-af68-f2f167cc7df0",
    );
    const otherId = await seedAccount(
      "durable_delete_other",
      "9723e695-a9a5-4f37-83fd-0fda7a54840d",
    );
    const [ownerMeal] = await ctx.db
      .select({ id: mealEntriesTable.id })
      .from(mealEntriesTable)
      .where(eq(mealEntriesTable.userId, ownerId));
    const removedMeal = await request(ctx.app)
      .delete(`/api/me/meal-entries/${ownerMeal!.id}`)
      .set(asUser(ownerClerkId));
    expect(removedMeal.status).toBe(204);
    expect(
      await rowsForUser(mealEntryDeletionTombstonesTable, ownerId),
    ).toHaveLength(1);

    const deleted = await request(ctx.app)
      .delete("/api/me")
      .set(asUser(ownerClerkId));
    expect(deleted.status).toBe(204);
    expect(deleted.text).toBe("");
    expect(deleteIdentity).toHaveBeenCalledOnce();
    expect(deleteIdentity).toHaveBeenCalledWith(ownerClerkId);

    expect(await usersForIdentity(ownerClerkId)).toEqual([]);
    expect(await rowsForUser(profilesTable, ownerId)).toEqual([]);
    expect(await rowsForUser(weightEntriesTable, ownerId)).toEqual([]);
    expect(await rowsForUser(mealEntriesTable, ownerId)).toEqual([]);
    expect(
      await rowsForUser(mealEntryDeletionTombstonesTable, ownerId),
    ).toEqual([]);

    expect(
      await ctx.db.select().from(usersTable).where(eq(usersTable.id, otherId)),
    ).toHaveLength(1);
    expect(await rowsForUser(profilesTable, otherId)).toHaveLength(1);
    expect(await rowsForUser(weightEntriesTable, otherId)).toHaveLength(1);
    expect(await rowsForUser(mealEntriesTable, otherId)).toHaveLength(1);

    const durable = await deletionRequest(ownerClerkId);
    expect(durable).toMatchObject({
      status: "completed",
      clerkUserId: null,
      attemptCount: 1,
      lastErrorCode: null,
    });

    const specialStatus = await request(ctx.app)
      .get("/api/me/account-deletion")
      .set(asUser(ownerClerkId));
    expect(specialStatus.body).toEqual({ status: "completed" });

    // A still-valid token is tombstoned before normal auth can resolve the user.
    const staleGet = await request(ctx.app)
      .get("/api/me")
      .set(asUser(ownerClerkId));
    const stalePost = await request(ctx.app)
      .post("/api/me/meal-entries")
      .set(asUser(ownerClerkId))
      .send({});
    expect(staleGet.status).toBe(410);
    expect(stalePost.status).toBe(410);
    expect(await usersForIdentity(ownerClerkId)).toEqual([]);

    const repeated = await request(ctx.app)
      .delete("/api/me")
      .set(asUser(ownerClerkId));
    expect(repeated.status).toBe(204);
    expect(deleteIdentity).toHaveBeenCalledOnce();
    expect(await usersForIdentity(ownerClerkId)).toEqual([]);
  });

  it("keeps a failed Clerk deletion pending and locked until a safe retry completes", async () => {
    const clerkUserId = "pending_delete_owner";
    const ownerId = await seedAccount(
      clerkUserId,
      "50bdedbc-a6cd-4442-9e64-b44602de3872",
    );
    const identityFailure = clerkProviderError(503, "service_unavailable");
    const deleteIdentity = vi
      .fn()
      .mockRejectedValueOnce(identityFailure)
      .mockResolvedValueOnce(undefined);
    setAccountIdentityDeleter(deleteIdentity);

    const failed = await request(ctx.app)
      .delete("/api/me")
      .set(asUser(clerkUserId));
    expect(failed.status).toBe(503);
    expect(failed.body.error).toContain("pending");

    const pendingUser = await usersForIdentity(clerkUserId);
    expect(pendingUser).toHaveLength(1);
    expect(pendingUser[0].deletionStatus).toBe("pending");
    expect(await rowsForUser(profilesTable, ownerId)).toHaveLength(1);
    expect(await rowsForUser(weightEntriesTable, ownerId)).toHaveLength(1);
    expect(await rowsForUser(mealEntriesTable, ownerId)).toHaveLength(1);
    expect(await deletionRequest(clerkUserId)).toMatchObject({
      status: "pending",
      clerkUserId,
      attemptCount: 1,
      lastErrorCode: "identity_unavailable",
    });

    const specialStatus = await request(ctx.app)
      .get("/api/me/account-deletion")
      .set(asUser(clerkUserId));
    expect(specialStatus.body).toEqual({ status: "pending" });

    const blockedGet = await request(ctx.app)
      .get("/api/me")
      .set(asUser(clerkUserId));
    const blockedPost = await request(ctx.app)
      .post("/api/me/meal-entries")
      .set(asUser(clerkUserId))
      .send({});
    expect(blockedGet.status).toBe(410);
    expect(blockedPost.status).toBe(410);
    expect(await usersForIdentity(clerkUserId)).toHaveLength(1);

    const retried = await request(ctx.app)
      .delete("/api/me")
      .set(asUser(clerkUserId));
    expect(retried.status).toBe(204);
    expect(deleteIdentity).toHaveBeenCalledTimes(2);
    expect(await usersForIdentity(clerkUserId)).toEqual([]);
    expect(await rowsForUser(profilesTable, ownerId)).toEqual([]);
    expect(await rowsForUser(weightEntriesTable, ownerId)).toEqual([]);
    expect(await rowsForUser(mealEntriesTable, ownerId)).toEqual([]);
    expect(await deletionRequest(clerkUserId)).toMatchObject({
      status: "completed",
      clerkUserId: null,
      attemptCount: 2,
      lastErrorCode: null,
    });
  });

  it("keeps a local-finalization failure pending after Clerk succeeds, then safely completes", async () => {
    const clerkUserId = "local_finalize_retry_owner";
    const ownerId = await seedAccount(
      clerkUserId,
      "857b1e1c-7c0a-42a2-b9f7-5ff964cf65e1",
    );
    const deleteIdentity = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(clerkProviderError(404, "resource_not_found"));
    setAccountIdentityDeleter(deleteIdentity);
    setAccountDeletionFinalizer(async () => {
      throw new Error("database finalization unavailable");
    });

    const failed = await request(ctx.app)
      .delete("/api/me")
      .set(asUser(clerkUserId));
    expect(failed.status).toBe(503);
    expect(await deletionRequest(clerkUserId)).toMatchObject({
      status: "pending",
      attemptCount: 1,
      lastErrorCode: "local_finalize_failed",
    });
    expect(await usersForIdentity(clerkUserId)).toHaveLength(1);
    expect(await rowsForUser(profilesTable, ownerId)).toHaveLength(1);
    expect(await rowsForUser(weightEntriesTable, ownerId)).toHaveLength(1);
    expect(await rowsForUser(mealEntriesTable, ownerId)).toHaveLength(1);

    setAccountDeletionFinalizer(null);
    const retried = await request(ctx.app)
      .delete("/api/me")
      .set(asUser(clerkUserId));
    expect(retried.status).toBe(204);
    expect(deleteIdentity).toHaveBeenCalledTimes(2);
    expect(await usersForIdentity(clerkUserId)).toEqual([]);
    expect(await rowsForUser(profilesTable, ownerId)).toEqual([]);
    expect(await rowsForUser(weightEntriesTable, ownerId)).toEqual([]);
    expect(await rowsForUser(mealEntriesTable, ownerId)).toEqual([]);
    expect(await deletionRequest(clerkUserId)).toMatchObject({
      status: "completed",
      clerkUserId: null,
      attemptCount: 2,
      lastErrorCode: null,
    });
  });

  it("does not trust a plain 404 as Clerk success", async () => {
    const clerkUserId = "untrusted_plain_404_identity";
    const ownerId = await seedAccount(
      clerkUserId,
      "01592ec7-858a-481d-b556-c0c72f10fc8f",
    );
    setAccountIdentityDeleter(
      vi
        .fn()
        .mockRejectedValue(
          Object.assign(new Error("proxy 404"), { status: 404 }),
        ),
    );

    const response = await request(ctx.app)
      .delete("/api/me")
      .set(asUser(clerkUserId));
    expect(response.status).toBe(503);
    expect(await deletionRequest(clerkUserId)).toMatchObject({
      status: "pending",
      lastErrorCode: "identity_transport_failed",
    });
    expect(await usersForIdentity(clerkUserId)).toHaveLength(1);
    expect(await rowsForUser(profilesTable, ownerId)).toHaveLength(1);
    expect(await rowsForUser(weightEntriesTable, ownerId)).toHaveLength(1);
    expect(await rowsForUser(mealEntriesTable, ownerId)).toHaveLength(1);
  });

  it("does not trust a Clerk non-404 with a misleading not-found code", async () => {
    const clerkUserId = "misleading_clerk_code_identity";
    const ownerId = await seedAccount(
      clerkUserId,
      "db7e8a4c-18fc-4c44-a8f9-6d59681ccfe2",
    );
    setAccountIdentityDeleter(
      vi.fn().mockRejectedValue(clerkProviderError(503, "resource_not_found")),
    );

    const response = await request(ctx.app)
      .delete("/api/me")
      .set(asUser(clerkUserId));
    expect(response.status).toBe(503);
    expect(await deletionRequest(clerkUserId)).toMatchObject({
      status: "pending",
      clerkUserId,
      lastErrorCode: "identity_unavailable",
    });
    expect(await usersForIdentity(clerkUserId)).toHaveLength(1);
    expect(await rowsForUser(profilesTable, ownerId)).toHaveLength(1);
    expect(await rowsForUser(weightEntriesTable, ownerId)).toHaveLength(1);
    expect(await rowsForUser(mealEntriesTable, ownerId)).toHaveLength(1);
  });

  it("treats verified Clerk not-found as terminal and handles concurrent-like retries", async () => {
    const notFoundIdentity = "already_deleted_in_clerk";
    await seedAccount(notFoundIdentity, "0d3dc80a-31a4-4680-8cd6-99488810a1d9");
    setAccountIdentityDeleter(
      vi.fn().mockRejectedValue(clerkProviderError(404, "resource_not_found")),
    );
    const notFound = await request(ctx.app)
      .delete("/api/me")
      .set(asUser(notFoundIdentity));
    expect(notFound.status).toBe(204);
    expect((await deletionRequest(notFoundIdentity))?.status).toBe("completed");

    const concurrentIdentity = "concurrent_delete_identity";
    await seedAccount(
      concurrentIdentity,
      "a880ba6f-9894-487a-92cc-ae78019a9ed5",
    );
    const deleteIdentity = vi.fn().mockResolvedValue(undefined);
    setAccountIdentityDeleter(deleteIdentity);
    const concurrent = await Promise.all([
      request(ctx.app).delete("/api/me").set(asUser(concurrentIdentity)),
      request(ctx.app).delete("/api/me").set(asUser(concurrentIdentity)),
    ]);
    expect(concurrent.map((response) => response.status)).toEqual([204, 204]);
    expect((await deletionRequest(concurrentIdentity))?.status).toBe(
      "completed",
    );
    expect(await usersForIdentity(concurrentIdentity)).toEqual([]);
  });

  it("monotonic staging cannot regress a completion at the refresh barrier", async () => {
    const clerkUserId = "monotonic_stage_identity";
    const identityHash = hashClerkIdentity(clerkUserId);
    await makeTestUserEligible(ctx, clerkUserId);
    const initial = await request(ctx.app)
      .get("/api/me")
      .set(asUser(clerkUserId));
    expect(initial.status).toBe(200);
    await ctx.db.insert(accountDeletionRequestsTable).values({
      identityHash,
      clerkUserId,
      status: "pending",
    });
    await ctx.db
      .update(usersTable)
      .set({ deletionStatus: "pending" })
      .where(eq(usersTable.id, initial.body.id));

    const deleteIdentity = vi.fn().mockResolvedValue(undefined);
    setAccountIdentityDeleter(deleteIdentity);
    setAccountDeletionStageAfterInsertHook(async (barrier) => {
      expect(barrier.identityHash).toBe(identityHash);
      await barrier.completeAtBarrier();
    });

    const response = await request(ctx.app)
      .delete("/api/me")
      .set(asUser(clerkUserId));
    expect(response.status).toBe(204);
    expect(deleteIdentity).not.toHaveBeenCalled();
    expect(await deletionRequest(clerkUserId)).toMatchObject({
      status: "completed",
      clerkUserId: null,
    });
    expect(await usersForIdentity(clerkUserId)).toEqual([]);
  });

  it("re-reads a terminal tombstone after an overlapping identity error", async () => {
    const clerkUserId = "identity_error_completion_race";
    const identityHash = hashClerkIdentity(clerkUserId);
    await seedAccount(clerkUserId, "1083b07a-a625-42ce-8e5d-c94ee6828451");
    setAccountIdentityDeleter(async () => {
      await ctx.db.transaction(async (tx) => {
        const completedAt = new Date();
        await tx
          .update(accountDeletionRequestsTable)
          .set({
            status: "completed",
            clerkUserId: null,
            completedAt,
            updatedAt: completedAt,
          })
          .where(eq(accountDeletionRequestsTable.identityHash, identityHash));
        await tx
          .delete(usersTable)
          .where(eq(usersTable.clerkUserId, clerkUserId));
      });
      throw new Error("late transport failure");
    });

    const response = await request(ctx.app)
      .delete("/api/me")
      .set(asUser(clerkUserId));
    expect(response.status).toBe(204);
    expect(await deletionRequest(clerkUserId)).toMatchObject({
      status: "completed",
      clerkUserId: null,
    });
    expect(await usersForIdentity(clerkUserId)).toEqual([]);
  });

  it("prioritizes never-attempted deletion work within a bounded batch", async () => {
    const attemptedOld = "worker_attempted_old";
    const attemptedRecent = "worker_attempted_recent";
    const neverAttempted = "worker_never_attempted";
    await ctx.db.insert(accountDeletionRequestsTable).values([
      {
        identityHash: hashClerkIdentity(attemptedOld),
        clerkUserId: attemptedOld,
        status: "pending",
        requestedAt: new Date("2025-01-01T00:00:00.000Z"),
        updatedAt: new Date("2025-01-02T00:00:00.000Z"),
        attemptCount: 1,
        lastAttemptAt: new Date("2025-01-02T00:00:00.000Z"),
      },
      {
        identityHash: hashClerkIdentity(attemptedRecent),
        clerkUserId: attemptedRecent,
        status: "pending",
        requestedAt: new Date("2025-02-01T00:00:00.000Z"),
        updatedAt: new Date("2025-02-02T00:00:00.000Z"),
        attemptCount: 1,
        lastAttemptAt: new Date("2025-02-02T00:00:00.000Z"),
      },
      {
        identityHash: hashClerkIdentity(neverAttempted),
        clerkUserId: neverAttempted,
        status: "pending",
        requestedAt: new Date("2025-03-01T00:00:00.000Z"),
        updatedAt: new Date("2025-03-01T00:00:00.000Z"),
      },
    ]);
    const deleteIdentity = vi.fn().mockResolvedValue(undefined);
    setAccountIdentityDeleter(deleteIdentity);

    const summary = await retryPendingAccountDeletions(1);

    expect(summary).toEqual({ processed: 1, completed: 1, pending: 0 });
    expect(deleteIdentity).toHaveBeenCalledOnce();
    expect(deleteIdentity).toHaveBeenCalledWith(neverAttempted);
    expect(await deletionRequest(neverAttempted)).toMatchObject({
      status: "completed",
      clerkUserId: null,
      attemptCount: 1,
    });
    expect(await deletionRequest(attemptedOld)).toMatchObject({
      status: "pending",
      clerkUserId: attemptedOld,
      attemptCount: 1,
    });
    expect(await deletionRequest(attemptedRecent)).toMatchObject({
      status: "pending",
      clerkUserId: attemptedRecent,
      attemptCount: 1,
    });
  });

  it("refuses a retry row whose raw identity does not match its tombstone hash", async () => {
    const hashOwner = "worker_hash_owner";
    const mismatchedIdentity = "worker_wrong_identity";
    const identityHash = hashClerkIdentity(hashOwner);
    await ctx.db.insert(accountDeletionRequestsTable).values({
      identityHash,
      clerkUserId: mismatchedIdentity,
      status: "pending",
    });
    const deleteIdentity = vi.fn().mockResolvedValue(undefined);
    setAccountIdentityDeleter(deleteIdentity);

    const summary = await retryPendingAccountDeletions(1);

    expect(summary).toEqual({ processed: 1, completed: 0, pending: 1 });
    expect(deleteIdentity).not.toHaveBeenCalled();
    const [requestRow] = await ctx.db
      .select()
      .from(accountDeletionRequestsTable)
      .where(eq(accountDeletionRequestsTable.identityHash, identityHash));
    expect(requestRow).toMatchObject({
      status: "pending",
      clerkUserId: mismatchedIdentity,
      attemptCount: 0,
      lastErrorCode: "identity_binding_invalid",
    });
  });

  it("worker completes pending deletions without logging raw identity or vendor errors", async () => {
    const clerkUserId = "worker_private_identity";
    const rawVendorError = `failure for ${clerkUserId}`;
    await seedAccount(clerkUserId, "d977969c-676c-4534-a7a9-8f0b18d89615");
    setAccountIdentityDeleter(
      vi.fn().mockRejectedValueOnce(new Error(rawVendorError)),
    );
    const staged = await request(ctx.app)
      .delete("/api/me")
      .set(asUser(clerkUserId));
    expect(staged.status).toBe(503);

    const deleteIdentity = vi.fn().mockResolvedValue(undefined);
    setAccountIdentityDeleter(deleteIdentity);
    const workerLogger = { info: vi.fn(), error: vi.fn() };
    const worker = startAccountDeletionWorker({
      intervalMs: 60_000,
      limit: 5,
      logger: workerLogger,
    });
    try {
      await worker.runNow();
    } finally {
      await worker.stop();
    }

    expect(deleteIdentity).toHaveBeenCalledWith(clerkUserId);
    expect((await deletionRequest(clerkUserId))?.status).toBe("completed");
    expect(await usersForIdentity(clerkUserId)).toEqual([]);
    const serializedLogs = JSON.stringify({
      info: workerLogger.info.mock.calls,
      error: workerLogger.error.mock.calls,
    });
    expect(serializedLogs).not.toContain(clerkUserId);
    expect(serializedLogs).not.toContain(rawVendorError);
  });
});
