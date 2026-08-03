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
  setAccountSubscriptionCustomerDeletionPoller,
  setAccountSubscriptionCustomerDeleter,
} from "../services/accountDeletionService";
import {
  REVENUECAT_ENTITLEMENT_ID,
  RevenueCatCustomerDeletionError,
  setSubscriptionStatusProviderForTesting,
} from "../services/revenueCatSubscriptionService";
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
  setAccountSubscriptionCustomerDeletionPoller(null);
  setAccountSubscriptionCustomerDeleter(null);
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

  it("deletes the RevenueCat customer by internal UUID before Clerk and local data", async () => {
    const calls: string[] = [];
    const deleteSubscriptionCustomer = vi.fn(async (internalUserId: string) => {
      calls.push(`subscription:${internalUserId}`);
    });
    const deleteIdentity = vi.fn(async (clerkUserId: string) => {
      calls.push(`identity:${clerkUserId}`);
    });
    setAccountSubscriptionCustomerDeleter(deleteSubscriptionCustomer);
    setAccountIdentityDeleter(deleteIdentity);
    const clerkUserId = "subscription_delete_order_owner";
    const ownerId = await seedAccount(
      clerkUserId,
      "7a31855d-cdb0-4d3c-a863-03a424743031",
    );

    const response = await request(ctx.app)
      .delete("/api/me")
      .set(asUser(clerkUserId));

    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    expect(deleteSubscriptionCustomer).toHaveBeenCalledWith(ownerId);
    expect(deleteSubscriptionCustomer).not.toHaveBeenCalledWith(clerkUserId);
    expect(calls).toEqual([
      `subscription:${ownerId}`,
      `identity:${clerkUserId}`,
    ]);
    expect(await usersForIdentity(clerkUserId)).toEqual([]);
  });

  it("keeps ambiguous RevenueCat failures pending without deleting Clerk", async () => {
    const clerkUserId = "subscription_ambiguous_delete_owner";
    const ownerId = await seedAccount(
      clerkUserId,
      "4cbbd9c8-2c3e-4ddb-b681-20947046664c",
    );
    const rawError = new Error(
      `RevenueCat raw failure for ${ownerId} with Bearer secret`,
    );
    const deleteSubscriptionCustomer = vi
      .fn()
      .mockRejectedValueOnce(rawError)
      .mockResolvedValueOnce(undefined);
    const deleteIdentity = vi.fn().mockResolvedValue(undefined);
    setAccountSubscriptionCustomerDeleter(deleteSubscriptionCustomer);
    setAccountIdentityDeleter(deleteIdentity);

    const failed = await request(ctx.app)
      .delete("/api/me")
      .set(asUser(clerkUserId));

    expect(failed.status).toBe(503);
    expect(failed.body).toEqual({
      error: "Account deletion is pending and will be retried",
    });
    expect(JSON.stringify(failed.body)).not.toContain(ownerId);
    expect(JSON.stringify(failed.body)).not.toContain("Bearer");
    expect(deleteIdentity).not.toHaveBeenCalled();
    expect(await deletionRequest(clerkUserId)).toMatchObject({
      status: "pending",
      attemptCount: 1,
      lastErrorCode: "subscription_transport_failed",
    });
    expect((await usersForIdentity(clerkUserId))[0]).toMatchObject({
      id: ownerId,
      deletionStatus: "pending",
    });

    const retried = await request(ctx.app)
      .delete("/api/me")
      .set(asUser(clerkUserId));
    expect(retried.status).toBe(204);
    expect(deleteSubscriptionCustomer).toHaveBeenCalledTimes(2);
    expect(deleteSubscriptionCustomer).toHaveBeenLastCalledWith(ownerId);
    expect(deleteIdentity).toHaveBeenCalledOnce();
    expect(await usersForIdentity(clerkUserId)).toEqual([]);
  });

  it("trusts only the typed RevenueCat not-found result for an already absent UUID", async () => {
    const trustedIdentity = "subscription_trusted_not_found";
    const trustedOwnerId = await seedAccount(
      trustedIdentity,
      "82a8da30-11ea-427e-8dcb-6eff9b3894e8",
    );
    const deleteIdentity = vi.fn().mockResolvedValue(undefined);
    const trustedDelete = vi
      .fn()
      .mockRejectedValue(new RevenueCatCustomerDeletionError("not_found"));
    setAccountSubscriptionCustomerDeleter(trustedDelete);
    setAccountIdentityDeleter(deleteIdentity);

    const trusted = await request(ctx.app)
      .delete("/api/me")
      .set(asUser(trustedIdentity));
    expect(trusted.status).toBe(204);
    expect(trustedDelete).toHaveBeenCalledWith(trustedOwnerId);
    expect(deleteIdentity).toHaveBeenCalledWith(trustedIdentity);

    const untrustedIdentity = "subscription_plain_not_found";
    const untrustedOwnerId = await seedAccount(
      untrustedIdentity,
      "e81ecf3f-2d0e-4175-8c73-d35d5091ba83",
    );
    const plainDelete = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error("proxy 404"), { status: 404 }),
      );
    deleteIdentity.mockClear();
    setAccountSubscriptionCustomerDeleter(plainDelete);

    const untrusted = await request(ctx.app)
      .delete("/api/me")
      .set(asUser(untrustedIdentity));
    expect(untrusted.status).toBe(503);
    expect(plainDelete).toHaveBeenCalledWith(untrustedOwnerId);
    expect(deleteIdentity).not.toHaveBeenCalled();
    expect(await deletionRequest(untrustedIdentity)).toMatchObject({
      status: "pending",
      lastErrorCode: "subscription_transport_failed",
    });
  });

  it("persists RevenueCat confirmation when Clerk fails and does not delete twice", async () => {
    const clerkUserId = "subscription_deleted_before_clerk_retry";
    const ownerId = await seedAccount(
      clerkUserId,
      "2827ebfc-ebcf-413f-a9f5-88cfabde384c",
    );
    const deleteSubscriptionCustomer = vi.fn().mockResolvedValueOnce(undefined);
    const deleteIdentity = vi
      .fn()
      .mockRejectedValueOnce(clerkProviderError(503, "service_unavailable"))
      .mockResolvedValueOnce(undefined);
    setAccountSubscriptionCustomerDeleter(deleteSubscriptionCustomer);
    setAccountIdentityDeleter(deleteIdentity);

    const first = await request(ctx.app)
      .delete("/api/me")
      .set(asUser(clerkUserId));
    expect(first.status).toBe(503);
    expect(await deletionRequest(clerkUserId)).toMatchObject({
      status: "pending",
      attemptCount: 1,
      lastErrorCode: "identity_unavailable",
    });

    const second = await request(ctx.app)
      .delete("/api/me")
      .set(asUser(clerkUserId));
    expect(second.status).toBe(204);
    expect(deleteSubscriptionCustomer).toHaveBeenCalledOnce();
    expect(deleteSubscriptionCustomer).toHaveBeenCalledWith(ownerId);
    expect(deleteIdentity).toHaveBeenCalledTimes(2);
    expect(await usersForIdentity(clerkUserId)).toEqual([]);
  });

  it("persists a queued RevenueCat phase and uses GET-only polling across retries", async () => {
    const clerkUserId = "subscription_queued_delete_owner";
    const ownerId = await seedAccount(
      clerkUserId,
      "fbc35bf8-df1e-491f-8d91-b0cbe87380af",
    );
    const deleteSubscriptionCustomer = vi
      .fn()
      .mockRejectedValue(
        new RevenueCatCustomerDeletionError("deletion_queued"),
      );
    const pollSubscriptionCustomer = vi
      .fn()
      .mockRejectedValueOnce(
        new RevenueCatCustomerDeletionError("deletion_queued"),
      )
      .mockResolvedValueOnce(undefined);
    const deleteIdentity = vi.fn().mockResolvedValue(undefined);
    setAccountSubscriptionCustomerDeleter(deleteSubscriptionCustomer);
    setAccountSubscriptionCustomerDeletionPoller(pollSubscriptionCustomer);
    setAccountIdentityDeleter(deleteIdentity);

    const queued = await request(ctx.app)
      .delete("/api/me")
      .set(asUser(clerkUserId));
    expect(queued.status).toBe(503);
    expect(deleteSubscriptionCustomer).toHaveBeenCalledOnce();
    expect(pollSubscriptionCustomer).not.toHaveBeenCalled();
    expect(await deletionRequest(clerkUserId)).toMatchObject({
      status: "pending",
      subscriptionDeletionStatus: "queued",
      lastErrorCode: "subscription_deletion_queued",
      leaseToken: null,
      leaseExpiresAt: null,
    });

    // Replacing the function simulates a fresh worker process: the database,
    // rather than in-memory client state, must select the GET-only path.
    const repeatedDelete = vi.fn().mockRejectedValue(new Error("must not run"));
    setAccountSubscriptionCustomerDeleter(repeatedDelete);
    const stillQueued = await request(ctx.app)
      .delete("/api/me")
      .set(asUser(clerkUserId));
    expect(stillQueued.status).toBe(503);
    expect(repeatedDelete).not.toHaveBeenCalled();
    expect(pollSubscriptionCustomer).toHaveBeenCalledOnce();
    expect(deleteIdentity).not.toHaveBeenCalled();

    const completed = await request(ctx.app)
      .delete("/api/me")
      .set(asUser(clerkUserId));
    expect(completed.status).toBe(204);
    expect(repeatedDelete).not.toHaveBeenCalled();
    expect(pollSubscriptionCustomer).toHaveBeenCalledTimes(2);
    expect(pollSubscriptionCustomer).toHaveBeenLastCalledWith(ownerId);
    expect(deleteIdentity).toHaveBeenCalledOnce();
    expect(await deletionRequest(clerkUserId)).toMatchObject({
      status: "completed",
      subscriptionDeletionStatus: "confirmed",
      lastErrorCode: null,
    });
  });

  it("allows only one live lease holder to execute vendor deletion", async () => {
    const clerkUserId = "single_vendor_executor_owner";
    const ownerId = await seedAccount(
      clerkUserId,
      "c5b87fbf-730a-47c0-9347-c903474fed43",
    );
    const invalidate = vi.fn();
    setSubscriptionStatusProviderForTesting({
      async getStatus() {
        return {
          entitled: true,
          entitlementId: REVENUECAT_ENTITLEMENT_ID,
          expiresAt: null,
          managementUrl: null,
        };
      },
      invalidate,
    });
    let reachedVendor!: () => void;
    const vendorReached = new Promise<void>((resolve) => {
      reachedVendor = resolve;
    });
    let releaseVendor!: () => void;
    const vendorBarrier = new Promise<void>((resolve) => {
      releaseVendor = resolve;
    });
    const deleteSubscriptionCustomer = vi.fn(async () => {
      reachedVendor();
      await vendorBarrier;
    });
    const deleteIdentity = vi.fn().mockResolvedValue(undefined);
    setAccountSubscriptionCustomerDeleter(deleteSubscriptionCustomer);
    setAccountIdentityDeleter(deleteIdentity);

    const firstRequest = request(ctx.app)
      .delete("/api/me")
      .set(asUser(clerkUserId))
      .then((response) => response);
    await vendorReached;
    const overlapping = await request(ctx.app)
      .delete("/api/me")
      .set(asUser(clerkUserId));

    expect(overlapping.status).toBe(503);
    expect(deleteSubscriptionCustomer).toHaveBeenCalledOnce();
    expect(deleteIdentity).not.toHaveBeenCalled();
    expect(invalidate.mock.calls).toEqual([[ownerId], [ownerId], [ownerId]]);
    releaseVendor();
    expect((await firstRequest).status).toBe(204);
    expect(deleteSubscriptionCustomer).toHaveBeenCalledOnce();
    expect(deleteIdentity).toHaveBeenCalledOnce();
    expect(invalidate).toHaveBeenCalledTimes(4);
  });

  it("fences an expired claimant from regressing a newer confirmed completion", async () => {
    const clerkUserId = "stale_deletion_claim_owner";
    const identityHash = hashClerkIdentity(clerkUserId);
    await seedAccount(clerkUserId, "564d5d7d-b056-4125-a058-ff2b0b3b1a2b");
    let reachedVendor!: () => void;
    const vendorReached = new Promise<void>((resolve) => {
      reachedVendor = resolve;
    });
    let releaseVendor!: () => void;
    const vendorBarrier = new Promise<void>((resolve) => {
      releaseVendor = resolve;
    });
    const deleteSubscriptionCustomer = vi
      .fn()
      .mockImplementationOnce(async () => {
        reachedVendor();
        await vendorBarrier;
        throw new RevenueCatCustomerDeletionError("deletion_queued");
      })
      .mockResolvedValueOnce(undefined);
    const deleteIdentity = vi.fn().mockResolvedValue(undefined);
    setAccountSubscriptionCustomerDeleter(deleteSubscriptionCustomer);
    setAccountIdentityDeleter(deleteIdentity);

    const staleRequest = request(ctx.app)
      .delete("/api/me")
      .set(asUser(clerkUserId))
      .then((response) => response);
    await vendorReached;
    await ctx.db
      .update(accountDeletionRequestsTable)
      .set({ leaseExpiresAt: new Date(0) })
      .where(eq(accountDeletionRequestsTable.identityHash, identityHash));

    const replacement = await request(ctx.app)
      .delete("/api/me")
      .set(asUser(clerkUserId));
    expect(replacement.status).toBe(204);
    expect(deleteSubscriptionCustomer).toHaveBeenCalledTimes(2);
    expect(deleteIdentity).toHaveBeenCalledOnce();

    releaseVendor();
    expect((await staleRequest).status).toBe(204);
    expect(await deletionRequest(clerkUserId)).toMatchObject({
      status: "completed",
      subscriptionDeletionStatus: "confirmed",
      attemptCount: 2,
      lastErrorCode: null,
      leaseToken: null,
      leaseExpiresAt: null,
    });
  });

  it("invalidates subscription status at staging and immediately before completion", async () => {
    const clerkUserId = "subscription_cache_invalidation_owner";
    const ownerId = await seedAccount(
      clerkUserId,
      "ef0a7da7-aea4-46d7-892f-ab3108cb88c7",
    );
    const invalidate = vi.fn();
    setSubscriptionStatusProviderForTesting({
      async getStatus() {
        return {
          entitled: true,
          entitlementId: REVENUECAT_ENTITLEMENT_ID,
          expiresAt: null,
          managementUrl: null,
        };
      },
      invalidate,
    });
    setAccountIdentityDeleter(vi.fn().mockResolvedValue(undefined));

    const response = await request(ctx.app)
      .delete("/api/me")
      .set(asUser(clerkUserId));

    expect(response.status).toBe(204);
    expect(invalidate).toHaveBeenCalledTimes(3);
    expect(invalidate.mock.calls).toEqual([[ownerId], [ownerId], [ownerId]]);
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
            subscriptionDeletionStatus: "confirmed",
            leaseToken: null,
            leaseExpiresAt: null,
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
    await ctx.db.insert(usersTable).values([
      { clerkUserId: attemptedOld, deletionStatus: "pending" },
      { clerkUserId: attemptedRecent, deletionStatus: "pending" },
      { clerkUserId: neverAttempted, deletionStatus: "pending" },
    ]);
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
      attemptCount: 1,
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
