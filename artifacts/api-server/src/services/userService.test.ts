import { describe, it, expect, afterEach } from "vitest";
import { createTestContext, type TestContext } from "../test/helpers";
import { provisionUser, upsertProfile, getProfile } from "./userService";

let ctx: TestContext;
afterEach(async () => {
  await ctx?.close();
});

describe("provisionUser", () => {
  it("creates a row on first call and returns the same row on the second (idempotent)", async () => {
    ctx = await createTestContext();

    const first = await provisionUser({ clerkUserId: "clerk_abc", email: "a@b.com" });
    const second = await provisionUser({ clerkUserId: "clerk_abc", email: "a@b.com" });

    expect(first?.id).toBeDefined();
    expect(second?.id).toBe(first?.id);
    expect(first?.clerkUserId).toBe("clerk_abc");
  });
});

describe("upsertProfile full-replace", () => {
  it("resets omitted optional fields to null on re-save", async () => {
    ctx = await createTestContext();
    const user = await provisionUser({ clerkUserId: "clerk_p", email: null });

    await upsertProfile(user!.id, {
      goal: "cut",
      heightCm: 180,
      startWeightKg: 90,
      targetDate: "2026-09-01",
    });
    // Second save omits height/weight/targetDate — full replace nulls them.
    await upsertProfile(user!.id, { goal: "maintain" });

    const profile = await getProfile(user!.id);
    expect(profile?.goal).toBe("maintain");
    expect(profile?.heightCm).toBeNull();
    expect(profile?.startWeightKg).toBeNull();
    expect(profile?.targetDate).toBeNull();
  });
});
