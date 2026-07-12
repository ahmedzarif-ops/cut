import { describe, it, expect, afterEach } from "vitest";
import { createTestContext, type TestContext } from "../test/helpers";
import { provisionUser } from "./userService";

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
