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

describe("provisionUser — no hot-path write", () => {
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
    const created = await provisionUser({ clerkUserId: "clerk_byid", email: null });
    expect((await getUserByClerkId("clerk_byid"))?.id).toBe(created?.id);
    expect(await getUserByClerkId("clerk_absent")).toBeUndefined();
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
