import { describe, expect, it, vi } from "vitest";

import {
  clerkOperationSucceeded,
  createExclusiveOperationRunner,
  getPasswordSignInNextStep,
  PASSWORD_RESET_REQUEST_NOTICE,
  requestPasswordResetEmailCode,
  resetSignInAttempt,
  runPasswordSignIn,
  sendSignInEmailCode,
  verifySignInEmailCode,
} from "../auth-flow";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

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

  it("finishes a password sign-in that needs no additional verification", () => {
    expect(
      getPasswordSignInNextStep({
        status: "complete",
        supportedSecondFactors: [],
      }),
    ).toEqual({ kind: "complete" });
  });

  it("continues a new-device sign-in with Clerk's email-code factor", () => {
    expect(
      getPasswordSignInNextStep({
        status: "needs_client_trust",
        supportedSecondFactors: [
          { strategy: "totp" },
          {
            strategy: "email_code",
            safeIdentifier: "a***@example.com",
          },
        ],
      }),
    ).toEqual({
      kind: "email_code",
      safeIdentifier: "a***@example.com",
    });
  });

  it("does not require a display identifier to allow Client Trust email verification", () => {
    expect(
      getPasswordSignInNextStep({
        status: "needs_client_trust",
        supportedSecondFactors: [{ strategy: "email_code" }],
      }),
    ).toEqual({
      kind: "email_code",
      safeIdentifier: null,
    });
  });

  it("continues ordinary MFA only when Clerk offers an email code", () => {
    expect(
      getPasswordSignInNextStep({
        status: "needs_second_factor",
        supportedSecondFactors: [
          { strategy: "phone_code" },
          {
            strategy: "email_code",
            safeIdentifier: "a***@example.com",
          },
        ],
      }),
    ).toEqual({
      kind: "email_code",
      safeIdentifier: "a***@example.com",
    });
  });

  it.each([
    [
      "a non-email Client Trust factor",
      "needs_client_trust",
      [{ strategy: "totp" }],
    ],
    ["no Client Trust factor", "needs_client_trust", []],
    ["non-email MFA", "needs_second_factor", [{ strategy: "phone_code" }]],
    [
      "a first-factor continuation",
      "needs_first_factor",
      [{ strategy: "email_code" }],
    ],
    ["an unknown status", "future_status", [{ strategy: "email_code" }]],
    ["a missing status", null, [{ strategy: "email_code" }]],
  ])("fails closed for %s", (_caseName, status, supportedSecondFactors) => {
    expect(
      getPasswordSignInNextStep({ status, supportedSecondFactors }),
    ).toEqual({ kind: "unsupported" });
  });

  it("keeps an email-code step available after initial delivery fails", async () => {
    const finalize = vi.fn(async () => ({ error: null }));

    await expect(
      runPasswordSignIn({
        authenticate: async () => ({ error: null }),
        getStatus: () => "needs_client_trust",
        getSupportedSecondFactors: () => [
          {
            strategy: "email_code",
            safeIdentifier: "a***@example.com",
          },
        ],
        sendEmailCode: async () => ({ error: new Error("offline") }),
        finalize,
      }),
    ).resolves.toEqual({
      kind: "email_code_send_failed",
      safeIdentifier: "a***@example.com",
    });
    expect(finalize).not.toHaveBeenCalled();
  });

  it("allows a failed email-code send to be retried", async () => {
    const sendEmailCode = vi
      .fn()
      .mockResolvedValueOnce({ error: new Error("offline") })
      .mockResolvedValueOnce({ error: null });

    await expect(sendSignInEmailCode({ sendEmailCode })).resolves.toEqual({
      kind: "failed",
    });
    await expect(sendSignInEmailCode({ sendEmailCode })).resolves.toEqual({
      kind: "sent",
    });
    expect(sendEmailCode).toHaveBeenCalledTimes(2);
  });

  it("verifies an email code only when Clerk reaches complete, then finalizes", async () => {
    let status = "needs_client_trust";
    const verifyEmailCode = vi.fn(async () => {
      status = "complete";
      return { error: null };
    });
    const finalize = vi.fn(async () => ({ error: null }));

    await expect(
      verifySignInEmailCode({
        verifyEmailCode,
        getStatus: () => status,
        finalize,
      }),
    ).resolves.toEqual({ kind: "signed_in" });
    expect(verifyEmailCode).toHaveBeenCalledTimes(1);
    expect(finalize).toHaveBeenCalledTimes(1);

    status = "needs_client_trust";
    finalize.mockClear();
    await expect(
      verifySignInEmailCode({
        verifyEmailCode: async () => ({ error: null }),
        getStatus: () => status,
        finalize,
      }),
    ).resolves.toEqual({ kind: "verification_failed" });
    expect(finalize).not.toHaveBeenCalled();
  });

  it("retries finalize without submitting an already accepted code again", async () => {
    let status = "needs_client_trust";
    const verifyEmailCode = vi.fn(async () => {
      status = "complete";
      return { error: null };
    });
    const finalize = vi
      .fn()
      .mockResolvedValueOnce({ error: new Error("offline") })
      .mockResolvedValueOnce({ error: null });
    const input = {
      verifyEmailCode,
      getStatus: () => status,
      finalize,
    };

    await expect(verifySignInEmailCode(input)).resolves.toEqual({
      kind: "finalize_failed",
    });
    await expect(verifySignInEmailCode(input)).resolves.toEqual({
      kind: "signed_in",
    });
    expect(verifyEmailCode).toHaveBeenCalledTimes(1);
    expect(finalize).toHaveBeenCalledTimes(2);
  });

  it("serializes reset with other sign-in work and reports reset failures", async () => {
    const pending = deferred<string>();
    const busyChanges: boolean[] = [];
    const runner = createExclusiveOperationRunner({
      isActive: () => true,
      onBusyChange: (busy) => busyChanges.push(busy),
    });
    const reset = vi.fn(async () => ({ error: null }));

    const first = runner.run(async () => pending.promise);
    const overlappingReset = await runner.run(({ isCurrent }) =>
      resetSignInAttempt({ reset, isCurrent }),
    );
    expect(overlappingReset).toEqual({ kind: "busy" });
    expect(reset).not.toHaveBeenCalled();

    pending.resolve("done");
    await expect(first).resolves.toEqual({
      kind: "completed",
      value: "done",
    });
    await expect(
      runner.run(({ isCurrent }) => resetSignInAttempt({ reset, isCurrent })),
    ).resolves.toEqual({
      kind: "completed",
      value: { kind: "reset" },
    });
    await expect(
      resetSignInAttempt({
        reset: async () => ({ error: new Error("reset failed") }),
      }),
    ).resolves.toEqual({ kind: "failed" });
    expect(busyChanges).toEqual([true, false, true, false]);
  });

  it("invalidates late work so an abandoned verification cannot finalize", async () => {
    let active = true;
    let status = "needs_client_trust";
    const pendingVerification = deferred<{ error: null }>();
    const busyChanges: boolean[] = [];
    const finalize = vi.fn(async () => ({ error: null }));
    const runner = createExclusiveOperationRunner({
      isActive: () => active,
      onBusyChange: (busy) => busyChanges.push(busy),
    });

    const verification = runner.run(({ isCurrent }) =>
      verifySignInEmailCode({
        verifyEmailCode: async () => {
          const result = await pendingVerification.promise;
          status = "complete";
          return result;
        },
        getStatus: () => status,
        finalize,
        isCurrent,
      }),
    );
    const overlap = await runner.run(async () => "must not run");
    expect(overlap).toEqual({ kind: "busy" });

    active = false;
    runner.invalidate();
    pendingVerification.resolve({ error: null });
    await expect(verification).resolves.toEqual({ kind: "stale" });
    expect(finalize).not.toHaveBeenCalled();
    expect(busyChanges).toEqual([true]);
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
