import { describe, expect, it, vi } from "vitest";

import {
  clerkOperationSucceeded,
  PASSWORD_RESET_REQUEST_NOTICE,
  requestPasswordResetEmailCode,
} from "../auth-flow";

describe("authentication flows", () => {
  it("treats returned Clerk errors and thrown failures as unsuccessful", async () => {
    await expect(
      clerkOperationSucceeded(async () => ({ error: null })),
    ).resolves.toBe(true);
    await expect(
      clerkOperationSucceeded(async () => ({ error: new Error("rejected") })),
    ).resolves.toBe(false);
    await expect(
      clerkOperationSucceeded(async () => {
        throw new Error("offline");
      }),
    ).resolves.toBe(false);
  });

  it("does not send a sign-up follow-up operation after a Clerk error", async () => {
    const nextOperation = vi.fn(async () => ({ error: null }));
    const firstOperationSucceeded = await clerkOperationSucceeded(async () => ({
      error: new Error("not accepted"),
    }));

    if (firstOperationSucceeded) {
      await clerkOperationSucceeded(nextOperation);
    }

    expect(firstOperationSucceeded).toBe(false);
    expect(nextOperation).not.toHaveBeenCalled();
  });

  it.each([
    ["unknown identifier", { error: new Error("not found") }, null],
    ["delivery failure", { error: null }, { error: new Error("offline") }],
    ["successful delivery", { error: null }, { error: null }],
  ])(
    "exposes the same password-reset result for %s",
    async (_caseName, createResult, sendResult) => {
      const sendCode = vi.fn(async () => sendResult ?? { error: null });

      await expect(
        requestPasswordResetEmailCode({
          createSignIn: async () => createResult,
          sendCode,
        }),
      ).resolves.toBeUndefined();

      expect(PASSWORD_RESET_REQUEST_NOTICE).toBe(
        "If an account matches that email and delivery succeeds, a password reset code will arrive shortly. Check your inbox and spam folder.",
      );
      expect(sendCode).toHaveBeenCalledTimes(createResult.error ? 0 : 1);
    },
  );
});
