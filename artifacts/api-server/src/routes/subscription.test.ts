import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { setAccountIdentityDeleter } from "../services/accountDeletionService";
import {
  REVENUECAT_ENTITLEMENT_ID,
  setSubscriptionStatusProviderForTesting,
  type SubscriptionStatusProvider,
} from "../services/revenueCatSubscriptionService";
import {
  createTestContext,
  makeTestUserEligible,
  TEST_USER_HEADER,
  type TestContext,
} from "../test/helpers";

const CLERK_USER_ID = "subscription_route_user";
const headers = { [TEST_USER_HEADER]: CLERK_USER_ID };
const inactiveStatus = {
  entitled: false,
  entitlementId: REVENUECAT_ENTITLEMENT_ID,
  expiresAt: "2026-01-01T00:00:00.000Z",
  managementUrl: "https://apps.apple.com/account/subscriptions",
} as const;

let ctx: TestContext;
let internalUserId: string;
const getStatus = vi.fn().mockResolvedValue(inactiveStatus);
const inactiveProvider: SubscriptionStatusProvider = { getStatus };

beforeAll(async () => {
  ctx = await createTestContext({
    subscriptionStatusProvider: inactiveProvider,
  });
  await makeTestUserEligible(ctx, CLERK_USER_ID);
  const me = await request(ctx.app).get("/api/me").set(headers);
  expect(me.status).toBe(200);
  internalUserId = me.body.id as string;
});

afterAll(async () => {
  setAccountIdentityDeleter(null);
  await ctx.close();
});

describe("subscription status endpoints", () => {
  it("requires authentication without calling RevenueCat", async () => {
    getStatus.mockClear();

    const get = await request(ctx.app).get("/api/me/subscription");
    const refresh = await request(ctx.app).post("/api/me/subscription/refresh");

    expect(get.status).toBe(401);
    expect(refresh.status).toBe(401);
    expect(getStatus).not.toHaveBeenCalled();
  });

  it("returns the exact normalized status using the internal user UUID", async () => {
    getStatus.mockClear();

    const response = await request(ctx.app)
      .get("/api/me/subscription")
      .set(headers);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(inactiveStatus);
    expect(Object.keys(response.body).sort()).toEqual(
      ["entitled", "entitlementId", "expiresAt", "managementUrl"].sort(),
    );
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(getStatus).toHaveBeenCalledWith(internalUserId, undefined);
    expect(getStatus).not.toHaveBeenCalledWith(
      CLERK_USER_ID,
      expect.anything(),
    );
  });

  it("forces a provider refresh without requiring an active subscription", async () => {
    getStatus.mockClear();

    const response = await request(ctx.app)
      .post("/api/me/subscription/refresh")
      .set(headers);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(inactiveStatus);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(getStatus).toHaveBeenCalledWith(internalUserId, { refresh: true });
  });

  it("returns a sanitized 503 when provider status cannot be verified", async () => {
    setSubscriptionStatusProviderForTesting({
      getStatus: vi
        .fn()
        .mockRejectedValue(new Error("Bearer provider-secret raw payload")),
    });

    const statusResponse = await request(ctx.app)
      .get("/api/me/subscription")
      .set(headers);
    const paidResponse = await request(ctx.app)
      .get("/api/me/today")
      .set(headers);
    setSubscriptionStatusProviderForTesting(inactiveProvider);

    const expected = {
      error: "Subscription status is temporarily unavailable",
      code: "subscription_status_unavailable",
    };
    expect(statusResponse.status).toBe(503);
    expect(statusResponse.body).toEqual(expected);
    expect(statusResponse.headers["cache-control"]).toBe("no-store");
    expect(paidResponse.status).toBe(503);
    expect(paidResponse.body).toEqual(expected);
    expect(
      JSON.stringify([statusResponse.body, paidResponse.body]),
    ).not.toContain("provider-secret");
  });
});

describe("paid route boundary", () => {
  const paidRequests: Array<[string, () => request.Test]> = [
    [
      "PATCH /me",
      () => request(ctx.app).patch("/api/me").set(headers).send({}),
    ],
    [
      "GET /me/profile",
      () => request(ctx.app).get("/api/me/profile").set(headers),
    ],
    [
      "PUT /me/profile",
      () => request(ctx.app).put("/api/me/profile").set(headers).send({}),
    ],
    ["GET /me/today", () => request(ctx.app).get("/api/me/today").set(headers)],
    [
      "GET /me/weight-entries",
      () => request(ctx.app).get("/api/me/weight-entries").set(headers),
    ],
    [
      "PUT /me/weight-entries/today",
      () =>
        request(ctx.app)
          .put("/api/me/weight-entries/today")
          .set(headers)
          .send({}),
    ],
    [
      "GET /me/meal-options",
      () => request(ctx.app).get("/api/me/meal-options").set(headers),
    ],
    [
      "GET /me/meals/today",
      () => request(ctx.app).get("/api/me/meals/today").set(headers),
    ],
    [
      "POST /me/meal-entries",
      () => request(ctx.app).post("/api/me/meal-entries").set(headers).send({}),
    ],
    [
      "PATCH /me/meal-entries/:id",
      () =>
        request(ctx.app)
          .patch("/api/me/meal-entries/not-an-id")
          .set(headers)
          .send({}),
    ],
    [
      "DELETE /me/meal-entries/:id",
      () =>
        request(ctx.app).delete("/api/me/meal-entries/not-an-id").set(headers),
    ],
  ];

  it.each(paidRequests)(
    "blocks %s before handler validation",
    async (_name, makeRequest) => {
      const response = await makeRequest();

      expect(response.status).toBe(402);
      expect(response.body).toEqual({
        error: "An active CUT OS Pro subscription is required",
        code: "subscription_required",
      });
      expect(response.headers["cache-control"]).toBe("no-store");
    },
  );

  it("keeps GET /me and adult/deletion status available", async () => {
    const me = await request(ctx.app).get("/api/me").set(headers);
    const eligibility = await request(ctx.app)
      .get("/api/me/adult-eligibility")
      .set(headers);
    const deletion = await request(ctx.app)
      .get("/api/me/account-deletion")
      .set(headers);

    expect(me.status).toBe(200);
    expect(eligibility.status).toBe(200);
    expect(deletion.status).toBe(200);
  });

  it("keeps DELETE /me available without checking subscription status", async () => {
    getStatus.mockClear();
    setAccountIdentityDeleter(vi.fn().mockResolvedValue(undefined));

    const response = await request(ctx.app)
      .delete("/api/me")
      .set({ [TEST_USER_HEADER]: "subscription_delete_without_user" });

    expect(response.status).toBe(204);
    expect(getStatus).not.toHaveBeenCalled();
  });
});
