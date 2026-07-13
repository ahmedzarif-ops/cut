import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { usersTable } from "@workspace/db/schema";
import {
  createTestContext,
  TEST_EMAIL_HEADER,
  TEST_USER_HEADER,
  type TestContext,
} from "../test/helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestContext();
});

afterAll(async () => {
  await ctx.close();
});

const asUser = (clerkId: string, email?: string) => {
  const headers: Record<string, string> = { [TEST_USER_HEADER]: clerkId };
  if (email) headers[TEST_EMAIL_HEADER] = email;
  return headers;
};

describe("GET /api/healthz", () => {
  it("returns ok without auth", async () => {
    const res = await request(ctx.app).get("/api/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("auth gate", () => {
  it("rejects unauthenticated /me", async () => {
    const res = await request(ctx.app).get("/api/me");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
  });

  it("rejects unauthenticated /me/profile reads and writes", async () => {
    expect((await request(ctx.app).get("/api/me/profile")).status).toBe(401);
    expect(
      (
        await request(ctx.app)
          .put("/api/me/profile")
          .send({ goal: "cut" })
      ).status,
    ).toBe(401);
  });
});

describe("GET /api/me — JIT provisioning", () => {
  it("provisions an internal user on first access with defaults", async () => {
    const res = await request(ctx.app)
      .get("/api/me")
      .set(asUser("clerk_jit_1", "jit1@example.com"));
    expect(res.status).toBe(200);
    expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body.timezone).toBe("UTC");
    expect(res.body.units).toBe("metric");
    expect(res.body.onboardingComplete).toBe(false);
    expect(res.body.email).toBe("jit1@example.com");
  });

  it("never leaks the Clerk id in the response body", async () => {
    const res = await request(ctx.app)
      .get("/api/me")
      .set(asUser("clerk_jit_leakcheck"));
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain("clerk_jit_leakcheck");
    expect(res.body).not.toHaveProperty("clerkUserId");
  });

  it("is idempotent — repeated and concurrent first requests create one row", async () => {
    const headers = asUser("clerk_jit_2");
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(ctx.app).get("/api/me").set(headers),
      ),
    );
    const ids = new Set(responses.map((r) => r.body.id));
    expect(responses.every((r) => r.status === 200)).toBe(true);
    expect(ids.size).toBe(1);

    const rows = await ctx.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, "clerk_jit_2"));
    expect(rows).toHaveLength(1);
  });

  it("repeated GET /me reads never mutate the row (no write anywhere)", async () => {
    const headers = asUser("clerk_getme_stable", "s@t.com");
    const first = await request(ctx.app).get("/api/me").set(headers);
    const [before] = await ctx.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, "clerk_getme_stable"));

    await request(ctx.app).get("/api/me").set(headers);
    const [after] = await ctx.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, "clerk_getme_stable"));

    expect(first.status).toBe(200);
    expect(first.body.email).toBe("s@t.com");
    expect(after.updatedAt).toEqual(before.updatedAt);
  });
});

describe("PATCH /api/me", () => {
  it("updates timezone and units", async () => {
    const headers = asUser("clerk_patch_1");
    const res = await request(ctx.app)
      .patch("/api/me")
      .set(headers)
      .send({
        timezone: "America/Chicago",
        units: "imperial",
      });
    expect(res.status).toBe(200);
    expect(res.body.timezone).toBe("America/Chicago");
    expect(res.body.units).toBe("imperial");

    const readBack = await request(ctx.app).get("/api/me").set(headers);
    expect(readBack.body.timezone).toBe("America/Chicago");
    expect(readBack.body.units).toBe("imperial");
  });

  it("rejects onboardingComplete=true when the user has no profile (P1-4 invariant)", async () => {
    const res = await request(ctx.app)
      .patch("/api/me")
      .set(asUser("clerk_patch_noprofile"))
      .send({ onboardingComplete: true });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(
      "Cannot complete onboarding before creating a profile",
    );
  });

  it("accepts onboardingComplete=true once a profile exists", async () => {
    const headers = asUser("clerk_patch_withprofile");
    await request(ctx.app)
      .put("/api/me/profile")
      .set(headers)
      .send({ goal: "cut" });
    const res = await request(ctx.app)
      .patch("/api/me")
      .set(headers)
      .send({ onboardingComplete: true });
    expect(res.status).toBe(200);
    expect(res.body.onboardingComplete).toBe(true);
  });

  it("rejects onboardingComplete=false — un-onboarding is not a client operation", async () => {
    const headers = asUser("clerk_patch_unonboard");
    await request(ctx.app)
      .put("/api/me/profile")
      .set(headers)
      .send({ goal: "cut" });
    const res = await request(ctx.app)
      .patch("/api/me")
      .set(headers)
      .send({ onboardingComplete: false });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(
      "Onboarding completion is derived from your profile and cannot be unset",
    );
  });

  it("rejects an invalid units value", async () => {
    const res = await request(ctx.app)
      .patch("/api/me")
      .set(asUser("clerk_patch_2"))
      .send({ units: "stone" });
    expect(res.status).toBe(400);
  });

  it("rejects an empty timezone", async () => {
    const res = await request(ctx.app)
      .patch("/api/me")
      .set(asUser("clerk_patch_3"))
      .send({ timezone: "" });
    expect(res.status).toBe(400);
  });

  it("rejects a syntactically-valid but unknown timezone with 400", async () => {
    const res = await request(ctx.app)
      .patch("/api/me")
      .set(asUser("clerk_patch_4"))
      .send({ timezone: "Not/AZone" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid timezone");
  });

  it("accepts and persists a real IANA timezone", async () => {
    const headers = asUser("clerk_patch_5");
    const res = await request(ctx.app)
      .patch("/api/me")
      .set(headers)
      .send({ timezone: "Asia/Dhaka" });
    expect(res.status).toBe(200);
    expect(res.body.timezone).toBe("Asia/Dhaka");

    const readBack = await request(ctx.app).get("/api/me").set(headers);
    expect(readBack.body.timezone).toBe("Asia/Dhaka");
  });

  it("treats an empty-body PATCH as a no-op returning the current user", async () => {
    const headers = asUser("clerk_patch_6");
    // Seed a known value, then PATCH {} — nothing should change, status 200.
    await request(ctx.app).patch("/api/me").set(headers).send({ units: "imperial" });

    const res = await request(ctx.app).patch("/api/me").set(headers).send({});
    expect(res.status).toBe(200);
    expect(res.body.units).toBe("imperial");
    expect(res.body.onboardingComplete).toBe(false);
  });
});

describe("profile lifecycle", () => {
  it("404s before the profile exists", async () => {
    const res = await request(ctx.app)
      .get("/api/me/profile")
      .set(asUser("clerk_prof_1"));
    expect(res.status).toBe(404);
  });

  it("creates a profile via PUT and reads it back", async () => {
    const headers = asUser("clerk_prof_1");
    const put = await request(ctx.app)
      .put("/api/me/profile")
      .set(headers)
      .send({
        goal: "cut",
        sex: "male",
        displayName: "Test Lifter",
        birthYear: 1995,
        heightCm: 180,
        startWeightKg: 95.5,
        goalWeightKg: 86.2,
        targetDate: "2026-09-26",
        activityLevel: "active",
        trainingExperience: "advanced",
      });
    expect(put.status).toBe(200);
    expect(put.body.goal).toBe("cut");
    expect(put.body.startWeightKg).toBeCloseTo(95.5);
    expect(put.body.targetDate).toBe("2026-09-26");

    const me = await request(ctx.app).get("/api/me").set(headers);
    expect(put.body.userId).toBe(me.body.id);

    const get = await request(ctx.app).get("/api/me/profile").set(headers);
    expect(get.status).toBe(200);
    expect(get.body.displayName).toBe("Test Lifter");
    expect(get.body.heightCm).toBeCloseTo(180);
  });

  it("PUT /me/profile atomically marks onboarding complete (P1-4)", async () => {
    const headers = asUser("clerk_atomic_onboard");
    // Fresh user starts un-onboarded.
    const before = await request(ctx.app).get("/api/me").set(headers);
    expect(before.body.onboardingComplete).toBe(false);
    // A single PUT — with no follow-up PATCH — both creates the profile and
    // marks onboarding done, so the flag and the profile can never disagree.
    const put = await request(ctx.app)
      .put("/api/me/profile")
      .set(headers)
      .send({ goal: "cut" });
    expect(put.status).toBe(200);
    const after = await request(ctx.app).get("/api/me").set(headers);
    expect(after.body.onboardingComplete).toBe(true);
  });

  it("PUT is a full replace — omitted optional fields reset to null", async () => {
    const headers = asUser("clerk_prof_1");
    const put = await request(ctx.app)
      .put("/api/me/profile")
      .set(headers)
      .send({ goal: "maintain" });
    expect(put.status).toBe(200);
    expect(put.body.goal).toBe("maintain");
    // This is the documented server contract that makes client-side prefill
    // mandatory (see the onboarding Edit-plan data-loss fix in cut-os).
    expect(put.body.displayName).toBeNull();
    expect(put.body.heightCm).toBeNull();
    expect(put.body.startWeightKg).toBeNull();
    expect(put.body.goalWeightKg).toBeNull();
    expect(put.body.birthYear).toBeNull();
    expect(put.body.targetDate).toBeNull();
    // Enum fields fall back to their defaults rather than null.
    expect(put.body.sex).toBe("unspecified");
    expect(put.body.activityLevel).toBe("moderate");
    expect(put.body.trainingExperience).toBe("beginner");
  });

  it("validates the body: missing goal and out-of-range values are 400", async () => {
    const headers = asUser("clerk_prof_2");
    expect(
      (await request(ctx.app).put("/api/me/profile").set(headers).send({}))
        .status,
    ).toBe(400);
    expect(
      (
        await request(ctx.app)
          .put("/api/me/profile")
          .set(headers)
          .send({ goal: "cut", heightCm: 10 })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(ctx.app)
          .put("/api/me/profile")
          .set(headers)
          .send({ goal: "cut", targetDate: "September 26" })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(ctx.app)
          .put("/api/me/profile")
          .set(headers)
          .send({ goal: "bulk-forever" })
      ).status,
    ).toBe(400);
  });
});

describe("cross-user isolation", () => {
  it("scopes every read and write to the authenticated identity", async () => {
    const alice = asUser("clerk_alice");
    const bob = asUser("clerk_bob");

    const alicePut = await request(ctx.app)
      .put("/api/me/profile")
      .set(alice)
      .send({ goal: "cut", startWeightKg: 95, displayName: "Alice" });
    expect(alicePut.status).toBe(200);

    // Bob cannot see Alice's profile — he has none of his own yet.
    const bobGet = await request(ctx.app).get("/api/me/profile").set(bob);
    expect(bobGet.status).toBe(404);

    // Distinct internal identities.
    const aliceMe = await request(ctx.app).get("/api/me").set(alice);
    const bobMe = await request(ctx.app).get("/api/me").set(bob);
    expect(aliceMe.body.id).not.toBe(bobMe.body.id);

    // Bob writing his own profile must not touch Alice's.
    await request(ctx.app)
      .put("/api/me/profile")
      .set(bob)
      .send({ goal: "gain", startWeightKg: 70, displayName: "Bob" });

    const aliceAfter = await request(ctx.app)
      .get("/api/me/profile")
      .set(alice);
    expect(aliceAfter.body.displayName).toBe("Alice");
    expect(aliceAfter.body.goal).toBe("cut");
    expect(aliceAfter.body.startWeightKg).toBeCloseTo(95);

    // Bob's PATCH /me must not change Alice's account settings.
    await request(ctx.app)
      .patch("/api/me")
      .set(bob)
      .send({ timezone: "Asia/Dhaka" });
    const aliceMeAfter = await request(ctx.app).get("/api/me").set(alice);
    expect(aliceMeAfter.body.timezone).toBe("UTC");
  });
});
