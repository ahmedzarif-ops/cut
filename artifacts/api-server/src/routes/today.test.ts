import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

import {
  TEST_USER_HEADER,
  createTestContext,
  makeTestUserEligible,
  type TestContext,
} from "../test/helpers";

let ctx: TestContext;
const asUser = (id: string) => ({ [TEST_USER_HEADER]: id });

beforeAll(async () => {
  ctx = await createTestContext();
});

afterAll(async () => {
  await ctx.close();
});

describe("Today weigh-in API", () => {
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

    const invalid = await request(ctx.app)
      .put("/api/me/weight-entries/today")
      .set(headers)
      .send({ weightKg: 10 });
    expect(invalid.status).toBe(400);

    const first = await request(ctx.app)
      .put("/api/me/weight-entries/today")
      .set(headers)
      .send({ weightKg: 95.25 });
    const second = await request(ctx.app)
      .put("/api/me/weight-entries/today")
      .set(headers)
      .send({ weightKg: 95.1 });
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

  it("does not expose another user's weigh-in", async () => {
    await makeTestUserEligible(ctx, "clerk_today_other");
    const other = await request(ctx.app)
      .get("/api/me/weight-entries")
      .set(asUser("clerk_today_other"));
    expect(other.status).toBe(200);
    expect(other.body).toEqual([]);
  });
});
