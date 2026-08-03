import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

import {
  TEST_USER_HEADER,
  createTestContext,
  makeTestUserEligible,
  type TestContext,
} from "../test/helpers";

let ctx: TestContext;
const asUser = (id: string, deviceTimeZone = "UTC") => ({
  [TEST_USER_HEADER]: id,
  "X-CUT-Device-Timezone": deviceTimeZone,
});

beforeAll(async () => {
  ctx = await createTestContext();
});

afterAll(async () => {
  await ctx.close();
});

describe("Today weigh-in API", () => {
  it("fails closed when daily timezone context is missing or invalid", async () => {
    const clerkUserId = "clerk_today_timezone_required";
    const authenticatedOnly = { [TEST_USER_HEADER]: clerkUserId };
    await makeTestUserEligible(ctx, clerkUserId);

    const missingRead = await request(ctx.app)
      .get("/api/me/today")
      .set(authenticatedOnly);
    const invalidRead = await request(ctx.app)
      .get("/api/me/today")
      .set(authenticatedOnly)
      .set("X-CUT-Device-Timezone", "Mars/Phobos");
    const missingWrite = await request(ctx.app)
      .put("/api/me/weight-entries/today")
      .set(authenticatedOnly)
      .send({ weightKg: 90 });

    for (const response of [missingRead, invalidRead, missingWrite]) {
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "A valid device timezone is required for daily data",
        code: "device_timezone_required",
      });
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.headers.vary).toContain("X-CUT-Device-Timezone");
    }

    const history = await request(ctx.app)
      .get("/api/me/weight-entries")
      .set(authenticatedOnly);
    expect(history.body).toEqual([]);
  });

  it("isolates concurrent daily writes from two devices in different zones", async () => {
    const clerkUserId = "clerk_today_two_devices";
    await makeTestUserEligible(ctx, clerkUserId);
    const west = asUser(clerkUserId, "Etc/GMT+12");
    const east = asUser(clerkUserId, "Pacific/Kiritimati");
    const [westReviewed, eastReviewed] = await Promise.all([
      request(ctx.app).get("/api/me/today").set(west),
      request(ctx.app).get("/api/me/today").set(east),
    ]);

    const [westWrite, eastWrite] = await Promise.all([
      request(ctx.app)
        .put("/api/me/weight-entries/today")
        .set(west)
        .send({ dayKey: westReviewed.body.dayKey, weightKg: 91 }),
      request(ctx.app)
        .put("/api/me/weight-entries/today")
        .set(east)
        .send({ dayKey: eastReviewed.body.dayKey, weightKg: 92 }),
    ]);

    expect(westWrite.status).toBe(200);
    expect(eastWrite.status).toBe(200);
    expect(westWrite.headers["cache-control"]).toBe("no-store");
    expect(westWrite.headers.vary).toContain("X-CUT-Device-Timezone");
    expect(westWrite.body.recordedOn).not.toBe(eastWrite.body.recordedOn);

    const [westToday, eastToday] = await Promise.all([
      request(ctx.app).get("/api/me/today").set(west),
      request(ctx.app).get("/api/me/today").set(east),
    ]);
    expect(westToday.body.dayKey).toBe(westWrite.body.recordedOn);
    expect(eastToday.body.dayKey).toBe(eastWrite.body.recordedOn);
    expect(westToday.body.weightEntry.weightKg).toBe(91);
    expect(eastToday.body.weightEntry.weightKg).toBe(92);
  });

  it("moves Next Action forward and makes repeated saves idempotent", async () => {
    const headers = asUser("clerk_today_route");
    await makeTestUserEligible(ctx, "clerk_today_route");
    await request(ctx.app).get("/api/me").set(headers);
    await request(ctx.app)
      .put("/api/me/profile")
      .set(headers)
      .send({ goal: "cut" });

    const before = await request(ctx.app).get("/api/me/today").set(headers);
    expect(before.status).toBe(200);
    expect(before.body.nextAction.kind).toBe("weigh_in");
    expect(before.body.weightEntry).toBeNull();

    const missingReviewedDay = await request(ctx.app)
      .put("/api/me/weight-entries/today")
      .set(headers)
      .send({ weightKg: 95.25 });
    expect(missingReviewedDay.status).toBe(400);

    const invalid = await request(ctx.app)
      .put("/api/me/weight-entries/today")
      .set(headers)
      .send({ dayKey: before.body.dayKey, weightKg: 10 });
    expect(invalid.status).toBe(400);

    const first = await request(ctx.app)
      .put("/api/me/weight-entries/today")
      .set(headers)
      .send({ dayKey: before.body.dayKey, weightKg: 95.25 });
    const second = await request(ctx.app)
      .put("/api/me/weight-entries/today")
      .set(headers)
      .send({ dayKey: before.body.dayKey, weightKg: 95.1 });
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);

    const after = await request(ctx.app).get("/api/me/today").set(headers);
    expect(after.body.nextAction.kind).toBe("first_meal");
    expect(after.body.weightEntry.weightKg).toBeCloseTo(95.1);

    const history = await request(ctx.app)
      .get("/api/me/weight-entries?limit=14")
      .set(headers);
    expect(history.status).toBe(200);
    expect(history.body).toHaveLength(1);

    const fractionalLimit = await request(ctx.app)
      .get("/api/me/weight-entries?limit=1.5")
      .set(headers);
    expect(fractionalLimit.status).toBe(400);
  });

  it("returns 412 without writing when the reviewed day is no longer current", async () => {
    const headers = asUser("clerk_today_stale_review");
    await makeTestUserEligible(ctx, "clerk_today_stale_review");

    const stale = await request(ctx.app)
      .put("/api/me/weight-entries/today")
      .set(headers)
      .send({ dayKey: "1900-01-01", weightKg: 95.25 });

    expect(stale.status).toBe(412);
    expect(stale.body).toEqual({
      error: "Today changed. Refresh and review your weigh-in before saving",
    });
    const history = await request(ctx.app)
      .get("/api/me/weight-entries")
      .set(headers);
    expect(history.body).toEqual([]);
  });

  it("does not expose another user's weigh-in", async () => {
    await makeTestUserEligible(ctx, "clerk_today_other");
    const other = await request(ctx.app)
      .get("/api/me/weight-entries")
      .set(asUser("clerk_today_other"));
    expect(other.status).toBe(200);
    expect(other.body).toEqual([]);
  });
});
