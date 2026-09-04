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
    const missingProFit = await request(ctx.app)
      .get("/api/me/pro/meal-fits")
      .set(authenticatedOnly);
    const missingMealDraft = await request(ctx.app)
      .post("/api/me/pro/meal-drafts")
      .set(authenticatedOnly)
      .send({
        goal: "desi",
        mealTime: "dinner",
        maxPrepMinutes: 30,
        availableIngredients: [],
        notes: "",
      });

    for (const response of [
      missingRead,
      invalidRead,
      missingCreate,
      missingProFit,
      missingMealDraft,
    ]) {
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
      request(ctx.app).get("/api/me/food-library"),
      request(ctx.app).get("/api/me/nutrition-preferences"),
      request(ctx.app).put("/api/me/nutrition-preferences").send({}),
      request(ctx.app).delete("/api/me/nutrition-preferences"),
      request(ctx.app).get("/api/me/saved-foods"),
      request(ctx.app).post("/api/me/saved-foods").send({}),
      request(ctx.app).delete(
        "/api/me/saved-foods/4bbc54d0-9976-4f55-bb39-83d3fa96e410",
      ),
      request(ctx.app)
        .put("/api/me/meal-feedback/bengali-chicken-curry-plate")
        .send({ preference: "liked" }),
      request(ctx.app).delete(
        "/api/me/meal-feedback/bengali-chicken-curry-plate",
      ),
      request(ctx.app).get("/api/me/pro/meal-fits"),
      request(ctx.app).post("/api/me/pro/meal-drafts").send({}),
      request(ctx.app).get("/api/me/meals/today"),
      request(ctx.app).post("/api/me/meal-entries").send({}),
      request(ctx.app).post("/api/me/food-entries").send({}),
      request(ctx.app).get("/api/me/foods/barcode/012345678905"),
      request(ctx.app)
        .patch("/api/me/meal-entries/4bbc54d0-9976-4f55-bb39-83d3fa96e410")
        .send({ servings: 1 }),
      request(ctx.app).delete(
        "/api/me/meal-entries/4bbc54d0-9976-4f55-bb39-83d3fa96e410",
      ),
    ]);

    expect(responses.map((response) => response.status)).toEqual([
      401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 401,
      401, 401, 401,
    ]);
  });

  it("searches the free USDA-linked library with Desi aliases", async () => {
    const headers = asUser("food_library_owner");
    await makeTestUserEligible(ctx, "food_library_owner");

    const dal = await request(ctx.app)
      .get("/api/me/food-library?query=dal")
      .set(headers);
    expect(dal.status).toBe(200);
    expect(dal.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "lentils-cooked",
          catalogVersion: "2026-09-04.2",
          servingDescription: "180 g",
          source: "USDA FoodData Central",
          sourceId: 172421,
          caloriesKcal: 209,
          proteinG: 16.2,
        }),
      ]),
    );

    const bengaliRice = await request(ctx.app)
      .get("/api/me/food-library?query=bhaat")
      .set(headers);
    expect(bengaliRice.status).toBe(200);
    expect(bengaliRice.body[0]).toMatchObject({ id: "rice-white-cooked" });

    const invalid = await request(ctx.app)
      .get(`/api/me/food-library?query=${"a".repeat(81)}`)
      .set(headers);
    expect(invalid.status).toBe(400);
  });

  it("returns a bounded adaptive meal set for an entitled user", async () => {
    const headers = asUser("adaptive_route_owner");
    await makeTestUserEligible(ctx, "adaptive_route_owner");

    const response = await request(ctx.app)
      .get("/api/me/pro/meal-fits")
      .set(headers);
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);
    expect(response.body[0]).toMatchObject({
      id: expect.any(String),
      fitReason: "A balanced starting option. Review ingredients and portions.",
      recommendedServings: 1,
    });
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("creates useful review-required meal drafts without sending data when AI is off", async () => {
    const headers = asUser("meal_draft_route_owner");
    await makeTestUserEligible(ctx, "meal_draft_route_owner");

    const response = await request(ctx.app)
      .post("/api/me/pro/meal-drafts")
      .set(headers)
      .send({
        goal: "desi",
        mealTime: "dinner",
        maxPrepMinutes: 30,
        availableIngredients: ["chicken", "rice"],
        notes: "simple",
      });
    expect(response.status).toBe(200);
    expect(response.body.source).toBe("catalog");
    expect(response.body.drafts).toHaveLength(3);
    expect(response.body.drafts[0]).toMatchObject({
      source: "catalog",
      reviewRequired: true,
      caloriesKcal: expect.any(Number),
      proteinG: expect.any(Number),
    });
    expect(response.body.notice).toContain("no data was sent");
    expect(response.headers["cache-control"]).toBe("no-store");

    const fractionalPrep = await request(ctx.app)
      .post("/api/me/pro/meal-drafts")
      .set(headers)
      .send({
        goal: "desi",
        mealTime: "dinner",
        maxPrepMinutes: 30.5,
        availableIngredients: [],
        notes: "",
      });
    expect(fractionalPrep.status).toBe(400);
  });

  it("persists free preferences, saved foods, and direct meal feedback", async () => {
    const headers = asUser("nutrition_data_route_owner");
    await makeTestUserEligible(ctx, "nutrition_data_route_owner");

    const defaults = await request(ctx.app)
      .get("/api/me/nutrition-preferences")
      .set(headers);
    expect(defaults.status).toBe(200);
    expect(defaults.body).toMatchObject({
      dailyCalorieTarget: null,
      dietStyle: "no_preference",
      learningEnabled: true,
    });

    const preferences = await request(ctx.app)
      .put("/api/me/nutrition-preferences")
      .set(headers)
      .send({
        dailyCalorieTarget: 2100,
        dailyProteinTargetG: 170,
        dietStyle: "omnivore",
        preferredCuisines: ["Desi", "Bengali"],
        avoidedIngredients: ["cilantro"],
        learningEnabled: true,
      });
    expect(preferences.status).toBe(200);
    expect(preferences.body.preferredCuisines).toEqual(["Desi", "Bengali"]);

    const savedInput = {
      source: "manual",
      sourceRef: null,
      name: "Chicken keema",
      servingDescription: "1 bowl",
      caloriesKcal: 390,
      proteinG: 38,
      carbsG: 12,
      fatG: 21,
      fiberG: 3,
    };
    const saved = await request(ctx.app)
      .post("/api/me/saved-foods")
      .set(headers)
      .send(savedInput);
    expect(saved.status).toBe(201);
    expect(saved.body).toMatchObject(savedInput);
    const savedList = await request(ctx.app)
      .get("/api/me/saved-foods")
      .set(headers);
    expect(savedList.body).toHaveLength(1);

    const feedback = await request(ctx.app)
      .put("/api/me/meal-feedback/bengali-chicken-curry-plate")
      .set(headers)
      .send({ preference: "liked" });
    expect(feedback.status).toBe(200);
    expect(feedback.body).toMatchObject({
      templateId: "bengali-chicken-curry-plate",
      preference: "liked",
    });

    const fits = await request(ctx.app)
      .get("/api/me/pro/meal-fits")
      .set(headers);
    expect(fits.status).toBe(200);
    expect(fits.body[0].fitReason).toContain("preference");
    expect(fits.body[0].recommendedServings).toBeGreaterThan(0);

    expect(
      (
        await request(ctx.app)
          .delete(`/api/me/saved-foods/${saved.body.id}`)
          .set(headers)
      ).status,
    ).toBe(204);
    expect(
      (
        await request(ctx.app)
          .delete("/api/me/nutrition-preferences")
          .set(headers)
      ).status,
    ).toBe(204);
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

  it("logs a reviewed manual food and keeps identical retries idempotent", async () => {
    const headers = asUser("manual_food_owner");
    await makeTestUserEligible(ctx, "manual_food_owner");
    const reviewedDay = await request(ctx.app)
      .get("/api/me/meals/today")
      .set(headers);
    const input = {
      clientRequestId: "f1a73194-ab12-44aa-b81b-25c248a1b590",
      dayKey: reviewedDay.body.dayKey,
      name: "Greek yogurt and berries",
      servingDescription: "1 bowl",
      servings: 1,
      caloriesKcal: 245,
      proteinG: 24,
      carbsG: 28,
      fatG: 4,
      fiberG: 5,
    };

    const created = await request(ctx.app)
      .post("/api/me/food-entries")
      .set(headers)
      .send(input);
    const retry = await request(ctx.app)
      .post("/api/me/food-entries")
      .set(headers)
      .send(input);

    expect(created.status).toBe(201);
    expect(retry.status).toBe(201);
    expect(retry.body).toEqual(created.body);
    expect(created.body).toMatchObject({
      name: input.name,
      servingDescription: input.servingDescription,
      caloriesKcal: input.caloriesKcal,
      proteinG: input.proteinG,
      templateId: `food:${input.clientRequestId}`,
    });

    const diary = await request(ctx.app)
      .get("/api/me/meals/today")
      .set(headers);
    expect(diary.body.entries).toHaveLength(1);
    expect(diary.body.totals.caloriesKcal).toBe(245);

    const mismatch = await request(ctx.app)
      .post("/api/me/food-entries")
      .set(headers)
      .send({ ...input, caloriesKcal: 300 });
    expect(mismatch.status).toBe(409);
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
