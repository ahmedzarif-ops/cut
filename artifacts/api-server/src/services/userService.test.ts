import { describe, it, expect, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import { usersTable } from "@workspace/db/schema";
import { createTestContext, type TestContext } from "../test/helpers";
import {
  provisionUser,
  getUserByClerkId,
  upsertProfile,
  getProfile,
} from "./userService";
import { decideAdultEligibility } from "./adultEligibilityService";

let ctx: TestContext;
afterEach(async () => {
  await ctx?.close();
});

describe("provisionUser", () => {
  it("creates a row on first call and returns the same row on the second (idempotent)", async () => {
    ctx = await createTestContext();

    const first = await provisionUser({
      clerkUserId: "clerk_abc",
      email: "a@b.com",
    });
    const second = await provisionUser({
      clerkUserId: "clerk_abc",
      email: "a@b.com",
    });

    expect(first?.id).toBeDefined();
    expect(second?.id).toBe(first?.id);
    expect(first?.clerkUserId).toBe("clerk_abc");
    expect(first?.email).toBeNull();
    expect(first?.adultEligibilityStatus).toBe("unverified");
  });
});

describe("provisionUser — select-first idempotency", () => {
  it("does not modify the row on a returning user's request", async () => {
    ctx = await createTestContext();
    await provisionUser({ clerkUserId: "clerk_nowrite", email: "n@w.com" });
    const [before] = await ctx.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, "clerk_nowrite"));

    await provisionUser({ clerkUserId: "clerk_nowrite", email: "n@w.com" });
    const [after] = await ctx.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, "clerk_nowrite"));

    // Old code bumped updated_at on every call; select-first leaves it alone.
    expect(after.updatedAt).toEqual(before.updatedAt);
  });

  it("getUserByClerkId returns the row, or undefined when unknown", async () => {
    ctx = await createTestContext();
    const created = await provisionUser({
      clerkUserId: "clerk_byid",
      email: null,
    });
    expect((await getUserByClerkId("clerk_byid"))?.id).toBe(created?.id);
    expect(await getUserByClerkId("clerk_absent")).toBeUndefined();
  });
});

describe("upsertProfile full-replace", () => {
  it("resets omitted optional fields to null on re-save", async () => {
    ctx = await createTestContext();
    const decision = await decideAdultEligibility({
      clerkUserId: "clerk_p",
      email: null,
      dateOfBirth: "1990-01-01",
      policyVersion: "adult-18-v1",
    });

    await upsertProfile(decision.userId, {
      goal: "cut",
      heightCm: 180,
      startWeightKg: 90,
      targetDate: "2026-09-01",
    });
    // Second save omits height/weight/targetDate — full replace nulls them.
    await upsertProfile(decision.userId, { goal: "maintain" });

    const profile = await getProfile(decision.userId);
    expect(profile?.goal).toBe("maintain");
    expect(profile?.heightCm).toBeNull();
    expect(profile?.startWeightKg).toBeNull();
    expect(profile?.targetDate).toBeNull();
  });
});

describe("upsertProfile — atomic onboarding (P1-4)", () => {
  it("marks the user onboarded in the same transaction as the profile write", async () => {
    ctx = await createTestContext();
    const decision = await decideAdultEligibility({
      clerkUserId: "clerk_atomic",
      email: null,
      dateOfBirth: "1990-01-01",
      policyVersion: "adult-18-v1",
    });
    const before = await getUserByClerkId("clerk_atomic");
    expect(before?.onboardingComplete).toBe(false);

    await upsertProfile(decision.userId, { goal: "cut" });

    const [after] = await ctx.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, decision.userId));
    // Flag flips true alongside the profile row — never a second, separable write.
    expect(after.onboardingComplete).toBe(true);
    // A profile row exists for that user — the flag now reflects reality.
    expect(await getProfile(decision.userId)).toBeDefined();
  });

  it("rejects an unverified direct service call without creating a profile", async () => {
    ctx = await createTestContext();
    const user = await provisionUser({
      clerkUserId: "clerk_unverified_profile",
      email: null,
    });

    await expect(
      upsertProfile(user!.id, { goal: "cut" }),
    ).rejects.toMatchObject({
      statusCode: 428,
      code: "adult_eligibility_required",
    });

    expect(await getProfile(user!.id)).toBeUndefined();
    const after = await getUserByClerkId("clerk_unverified_profile");
    expect(after?.onboardingComplete).toBe(false);
  });
});
