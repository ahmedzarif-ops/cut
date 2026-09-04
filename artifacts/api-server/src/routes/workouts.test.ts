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

describe("Workout API", () => {
  it("saves, lists, and deletes a private strength session", async () => {
    const owner = "clerk_workout_owner";
    const other = "clerk_workout_other";
    await makeTestUserEligible(ctx, owner);
    await makeTestUserEligible(ctx, other);
    const reviewed = await request(ctx.app)
      .get("/api/me/today")
      .set(asUser(owner));
    const body = {
      clientRequestId: "2357fe90-b18b-429f-9491-25a6c2455fa2",
      dayKey: reviewed.body.dayKey,
      kind: "strength",
      name: "Push day",
      notes: "Felt strong",
      exercises: [
        {
          name: "Bench press",
          sets: 3,
          reps: 8,
          loadKg: 80,
          durationMinutes: null,
          distanceKm: null,
          caloriesKcal: null,
        },
        {
          name: "Shoulder press",
          sets: 3,
          reps: 10,
          loadKg: 24,
          durationMinutes: null,
          distanceKm: null,
          caloriesKcal: null,
        },
      ],
    };

    const first = await request(ctx.app)
      .post("/api/me/workouts")
      .set(asUser(owner))
      .send(body);
    const repeated = await request(ctx.app)
      .post("/api/me/workouts")
      .set(asUser(owner))
      .send(body);

    expect(first.status).toBe(201);
    expect(repeated.status).toBe(201);
    expect(repeated.body.id).toBe(first.body.id);
    expect(first.body).toMatchObject({
      loggedOn: reviewed.body.dayKey,
      kind: "strength",
      name: "Push day",
      notes: "Felt strong",
    });
    expect(first.body.exercises).toHaveLength(2);
    expect(first.body.exercises[0]).toMatchObject({
      position: 0,
      name: "Bench press",
      sets: 3,
      reps: 8,
      loadKg: 80,
    });

    const ownerHistory = await request(ctx.app)
      .get("/api/me/workouts?limit=20")
      .set(asUser(owner));
    const otherHistory = await request(ctx.app)
      .get("/api/me/workouts")
      .set(asUser(other));
    expect(ownerHistory.status).toBe(200);
    expect(ownerHistory.body).toHaveLength(1);
    expect(ownerHistory.headers["cache-control"]).toContain("no-store");
    expect(otherHistory.body).toEqual([]);

    const otherDelete = await request(ctx.app)
      .delete(`/api/me/workouts/${first.body.id}`)
      .set(asUser(other));
    expect(otherDelete.status).toBe(404);
    const ownerDelete = await request(ctx.app)
      .delete(`/api/me/workouts/${first.body.id}`)
      .set(asUser(owner));
    expect(ownerDelete.status).toBe(204);
    const after = await request(ctx.app)
      .get("/api/me/workouts")
      .set(asUser(owner));
    expect(after.body).toEqual([]);
  });

  it("validates the reviewed day and workout-specific fields", async () => {
    const user = "clerk_workout_validation";
    await makeTestUserEligible(ctx, user);
    const headers = asUser(user);
    const reviewed = await request(ctx.app).get("/api/me/today").set(headers);
    const base = {
      clientRequestId: "9c5f7f51-0ac7-4337-adca-89c53ab0e69f",
      dayKey: reviewed.body.dayKey,
      kind: "strength",
      name: "Leg day",
      notes: null,
      exercises: [
        {
          name: "Squat",
          sets: 3,
          reps: null,
          loadKg: 100,
          durationMinutes: null,
          distanceKm: null,
          caloriesKcal: null,
        },
      ],
    };

    const incompleteStrength = await request(ctx.app)
      .post("/api/me/workouts")
      .set(headers)
      .send(base);
    expect(incompleteStrength.status).toBe(400);
    expect(incompleteStrength.body.error).toContain("sets and reps");

    const stale = await request(ctx.app)
      .post("/api/me/workouts")
      .set(headers)
      .send({
        ...base,
        clientRequestId: "6379f522-62a6-4ffb-b328-45aa9848633a",
        dayKey: "1900-01-01",
        exercises: [{ ...base.exercises[0], reps: 8 }],
      });
    expect(stale.status).toBe(412);

    const missingTimezone = await request(ctx.app)
      .post("/api/me/workouts")
      .set({ [TEST_USER_HEADER]: user })
      .send({ ...base, exercises: [{ ...base.exercises[0], reps: 8 }] });
    expect(missingTimezone.status).toBe(400);

    const fractionalLimit = await request(ctx.app)
      .get("/api/me/workouts?limit=1.5")
      .set(headers);
    expect(fractionalLimit.status).toBe(400);
  });

  it("supports cardio and recovery without inventing strength fields", async () => {
    const user = "clerk_workout_kinds";
    await makeTestUserEligible(ctx, user);
    const headers = asUser(user);
    const reviewed = await request(ctx.app).get("/api/me/today").set(headers);
    const cardio = await request(ctx.app)
      .post("/api/me/workouts")
      .set(headers)
      .send({
        clientRequestId: "ed5825c3-f8c0-4807-8164-922dbd6ca29c",
        dayKey: reviewed.body.dayKey,
        kind: "cardio",
        name: "Evening run",
        notes: null,
        exercises: [
          {
            name: "Running",
            sets: null,
            reps: null,
            loadKg: null,
            durationMinutes: 30,
            distanceKm: 5,
            caloriesKcal: 320,
          },
        ],
      });
    const recovery = await request(ctx.app)
      .post("/api/me/workouts")
      .set(headers)
      .send({
        clientRequestId: "2b3cbb90-23a5-4ee1-a59e-c2f4c35458e4",
        dayKey: reviewed.body.dayKey,
        kind: "recovery",
        name: "Recovery day",
        notes: "Walked and rested",
        exercises: [],
      });
    expect(cardio.status).toBe(201);
    expect(cardio.body.exercises[0]).toMatchObject({
      durationMinutes: 30,
      distanceKm: 5,
      caloriesKcal: 320,
    });
    expect(recovery.status).toBe(201);
    expect(recovery.body.exercises).toEqual([]);
  });
});
