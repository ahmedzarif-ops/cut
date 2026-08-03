import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { BALANCED_MEAL_CATALOG_VERSION } from "@workspace/domain";

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

describe("Balanced meal API", () => {
  it("fails closed when meal-day timezone context is missing or invalid", async () => {
    const clerkUserId = "meal_route_timezone_required";
    const authenticatedOnly = { [TEST_USER_HEADER]: clerkUserId };
    await makeTestUserEligible(ctx, clerkUserId);

    const missingRead = await request(ctx.app)
      .get("/api/me/meals/today")
      .set(authenticatedOnly);
    const invalidRead = await request(ctx.app)
      .get("/api/me/meals/today")
      .set(authenticatedOnly)
      .set("X-CUT-Device-Timezone", "Not/AZone");
    const missingCreate = await request(ctx.app)
      .post("/api/me/meal-entries")
      .set(authenticatedOnly)
      .send({});

    for (const response of [missingRead, invalidRead, missingCreate]) {
      expect(response.status).toBe(400);
      expect(response.body.code).toBe("device_timezone_required");
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.headers.vary).toContain("X-CUT-Device-Timezone");
    }
  });

  it("keeps concurrent devices on independent meal days during account timezone churn", async () => {
    const clerkUserId = "meal_route_two_devices";
    await makeTestUserEligible(ctx, clerkUserId);
    const west = asUser(clerkUserId, "Etc/GMT+12");
    const east = asUser(clerkUserId, "Pacific/Kiritimati");
    const options = await request(ctx.app)
      .get("/api/me/meal-options")
      .set(west);
    const [westDay, eastDay] = await Promise.all([
      request(ctx.app).get("/api/me/meals/today").set(west),
      request(ctx.app).get("/api/me/meals/today").set(east),
    ]);
    expect(westDay.body.dayKey).not.toBe(eastDay.body.dayKey);

    const baseInput = {
      catalogVersion: options.body[0].catalogVersion,
      mealTemplateId: options.body[0].id,
      servings: 1,
    };
    const [westCreate, _accountUpdate, eastCreate] = await Promise.all([
      request(ctx.app)
        .post("/api/me/meal-entries")
        .set(west)
        .send({
          ...baseInput,
          clientRequestId: "144c9db7-f29c-46c1-b65c-7e4091215797",
          dayKey: westDay.body.dayKey,
        }),
      request(ctx.app)
        .patch("/api/me")
        .set(asUser(clerkUserId, "Asia/Dhaka"))
        .send({ timezone: "Asia/Dhaka" }),
      request(ctx.app)
        .post("/api/me/meal-entries")
        .set(east)
        .send({
          ...baseInput,
          clientRequestId: "51c6b0d3-aa01-478c-ae61-796ce991184a",
          dayKey: eastDay.body.dayKey,
        }),
    ]);
    expect(westCreate.status).toBe(201);
    expect(eastCreate.status).toBe(201);
    expect(westCreate.headers["cache-control"]).toBe("no-store");
    expect(westCreate.headers.vary).toContain("X-CUT-Device-Timezone");

    const [westAfter, eastAfter] = await Promise.all([
      request(ctx.app).get("/api/me/meals/today").set(west),
      request(ctx.app).get("/api/me/meals/today").set(east),
    ]);
    expect(
      westAfter.body.entries.map((entry: { id: string }) => entry.id),
    ).toEqual([westCreate.body.id]);
    expect(
      eastAfter.body.entries.map((entry: { id: string }) => entry.id),
    ).toEqual([eastCreate.body.id]);
  });

  it("requires authentication for every meal endpoint", async () => {
    const responses = await Promise.all([
      request(ctx.app).get("/api/me/meal-options"),
      request(ctx.app).get("/api/me/meals/today"),
      request(ctx.app).post("/api/me/meal-entries").send({}),
      request(ctx.app)
        .patch("/api/me/meal-entries/4bbc54d0-9976-4f55-bb39-83d3fa96e410")
        .send({ servings: 1 }),
      request(ctx.app).delete(
        "/api/me/meal-entries/4bbc54d0-9976-4f55-bb39-83d3fa96e410",
      ),
    ]);

    expect(responses.map((response) => response.status)).toEqual([
      401, 401, 401, 401, 401,
    ]);
  });

  it("validates create and update inputs and rejects an unknown template", async () => {
    const headers = asUser("meal_route_invalid");
    await makeTestUserEligible(ctx, "meal_route_invalid");
    const malformed = await request(ctx.app)
      .post("/api/me/meal-entries")
      .set(headers)
      .send({
        clientRequestId: "not-a-uuid",
        catalogVersion: "old",
        mealTemplateId: "anything",
        servings: 0.1,
      });
    expect(malformed.status).toBe(400);

    const today = await request(ctx.app)
      .get("/api/me/meals/today")
      .set(headers);
    expect(today.status).toBe(200);

    const unknown = await request(ctx.app)
      .post("/api/me/meal-entries")
      .set(headers)
      .send({
        clientRequestId: "d00ac79a-af4c-4674-bfa9-34c6013913a9",
        catalogVersion: BALANCED_MEAL_CATALOG_VERSION,
        dayKey: today.body.dayKey,
        mealTemplateId: "not-in-the-catalog",
        servings: 1,
      });
    expect(unknown.status).toBe(404);

    const invalidUpdate = await request(ctx.app)
      .patch("/api/me/meal-entries/4bbc54d0-9976-4f55-bb39-83d3fa96e410")
      .set(headers)
      .send({ servings: 5 });
    expect(invalidUpdate.status).toBe(400);
  });

  it("rejects unknown create and update fields instead of stripping them", async () => {
    const headers = asUser("meal_route_unknown_fields");
    await makeTestUserEligible(ctx, "meal_route_unknown_fields");
    const createWithUnknownKey = await request(ctx.app)
      .post("/api/me/meal-entries")
      .set(headers)
      .send({
        clientRequestId: "4c181684-f0a9-4823-a3f1-8bfb5dc36f3d",
        catalogVersion: BALANCED_MEAL_CATALOG_VERSION,
        dayKey: "2026-08-03",
        mealTemplateId: "anything",
        servings: 1,
        notes: "must not be silently ignored",
      });
    expect(createWithUnknownKey.status).toBe(400);

    const updateWithUnknownKey = await request(ctx.app)
      .patch("/api/me/meal-entries/4bbc54d0-9976-4f55-bb39-83d3fa96e410")
      .set(headers)
      .send({ servings: 1, notes: "must not be silently ignored" });
    expect(updateWithUnknownKey.status).toBe(400);
  });

  it("supports an isolated create, retry, update, total, and delete lifecycle", async () => {
    const ownerHeaders = asUser("meal_route_owner");
    const otherHeaders = asUser("meal_route_other");
    await makeTestUserEligible(ctx, "meal_route_owner");
    await makeTestUserEligible(ctx, "meal_route_other");

    await request(ctx.app).get("/api/me").set(ownerHeaders);
    await request(ctx.app)
      .put("/api/me/profile")
      .set(ownerHeaders)
      .send({ goal: "cut" });
    const reviewedToday = await request(ctx.app)
      .get("/api/me/today")
      .set(ownerHeaders);
    await request(ctx.app)
      .put("/api/me/weight-entries/today")
      .set(ownerHeaders)
      .send({ dayKey: reviewedToday.body.dayKey, weightKg: 91.2 });

    const options = await request(ctx.app)
      .get("/api/me/meal-options")
      .set(ownerHeaders);
    expect(options.status).toBe(200);
    expect(options.body.length).toBeGreaterThan(2);
    expect(options.body[0]).toMatchObject({
      id: expect.any(String),
      description: expect.any(String),
      fitReason: expect.stringContaining("per serving"),
      caloriesKcal: expect.any(Number),
      catalogVersion: expect.any(String),
    });
    const reviewedDay = await request(ctx.app)
      .get("/api/me/meals/today")
      .set(ownerHeaders);
    expect(reviewedDay.status).toBe(200);

    const input = {
      clientRequestId: "7b06942b-cdc7-4eb2-af37-2ec340da465d",
      catalogVersion: options.body[0].catalogVersion,
      dayKey: reviewedDay.body.dayKey,
      mealTemplateId: options.body[0].id,
      servings: 1,
    };
    const created = await request(ctx.app)
      .post("/api/me/meal-entries")
      .set(ownerHeaders)
      .send(input);
    const retry = await request(ctx.app)
      .post("/api/me/meal-entries")
      .set(ownerHeaders)
      .send(input);
    expect(created.status).toBe(201);
    expect(retry.status).toBe(201);
    expect(retry.body).toEqual(created.body);
    expect(created.body.catalogVersion).toBe(input.catalogVersion);

    const mismatch = await request(ctx.app)
      .post("/api/me/meal-entries")
      .set(ownerHeaders)
      .send({ ...input, servings: 1.5 });
    expect(mismatch.status).toBe(409);

    const stale = await request(ctx.app)
      .post("/api/me/meal-entries")
      .set(ownerHeaders)
      .send({
        ...input,
        clientRequestId: "e6bb0dbc-d56d-427f-aebb-2016a280a671",
        catalogVersion: "2026-08-02.9",
      });
    expect(stale.status).toBe(412);

    const afterStale = await request(ctx.app)
      .get("/api/me/meals/today")
      .set(ownerHeaders);
    expect(afterStale.body.entries).toHaveLength(1);

    const otherToday = await request(ctx.app)
      .get("/api/me/meals/today")
      .set(otherHeaders);
    expect(otherToday.body.entries).toEqual([]);
    expect(otherToday.body.totals.caloriesKcal).toBe(0);

    const otherUpdate = await request(ctx.app)
      .patch(`/api/me/meal-entries/${created.body.id}`)
      .set(otherHeaders)
      .send({ servings: 2 });
    const otherDelete = await request(ctx.app)
      .delete(`/api/me/meal-entries/${created.body.id}`)
      .set(otherHeaders);
    expect(otherUpdate.status).toBe(404);
    expect(otherDelete.status).toBe(204);

    const updated = await request(ctx.app)
      .patch(`/api/me/meal-entries/${created.body.id}`)
      .set(ownerHeaders)
      .send({ servings: 2 });
    expect(updated.status).toBe(200);
    expect(updated.body.servings).toBe(2);
    expect(updated.body.caloriesKcal).toBe(created.body.caloriesKcal * 2);

    const today = await request(ctx.app)
      .get("/api/me/meals/today")
      .set(ownerHeaders);
    expect(today.body.entries).toHaveLength(1);
    expect(today.body.totals.caloriesKcal).toBe(updated.body.caloriesKcal);

    const todayState = await request(ctx.app)
      .get("/api/me/today")
      .set(ownerHeaders);
    expect(todayState.body.nextAction.kind).toBe("review_meals");
    expect(todayState.body.nextAction.title).toBe("Review today’s meals");
    expect(todayState.body.mealCount).toBe(1);
    expect(todayState.body.nutritionTotals.caloriesKcal).toBe(
      updated.body.caloriesKcal,
    );

    const deleted = await request(ctx.app)
      .delete(`/api/me/meal-entries/${created.body.id}`)
      .set(ownerHeaders);
    expect(deleted.status).toBe(204);
    expect(deleted.text).toBe("");
    const repeatedDelete = await request(ctx.app)
      .delete(`/api/me/meal-entries/${created.body.id}`)
      .set(ownerHeaders);
    expect(repeatedDelete.status).toBe(204);
    const delayedCreateReplay = await request(ctx.app)
      .post("/api/me/meal-entries")
      .set(ownerHeaders)
      .send(input);
    expect(delayedCreateReplay.status).toBe(412);

    const empty = await request(ctx.app)
      .get("/api/me/meals/today")
      .set(ownerHeaders);
    expect(empty.body.entries).toEqual([]);
    expect(empty.body.totals.caloriesKcal).toBe(0);

    const resetTodayState = await request(ctx.app)
      .get("/api/me/today")
      .set(ownerHeaders);
    expect(resetTodayState.body.nextAction.kind).toBe("first_meal");
    expect(resetTodayState.body.mealCount).toBe(0);
    expect(resetTodayState.body.nutritionTotals).toEqual({
      caloriesKcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
    });
  });
});
