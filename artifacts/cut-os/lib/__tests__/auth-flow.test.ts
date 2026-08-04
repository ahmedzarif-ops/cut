import { describe, expect, it, vi } from "vitest";

import {
  clerkOperationSucceeded,
  createExclusiveOperationRunner,
  getPasswordSignInNextStep,
  getPasswordSignUpNextStep,
  PASSWORD_RESET_REQUEST_NOTICE,
  requestPasswordResetEmailCode,
  resetSignInAttempt,
  resetSignUpAttempt,
  runPasswordSignIn,
  runPasswordSignUp,
  sendSignInEmailCode,
  sendSignUpEmailCode,
  verifySignInEmailCode,
  verifySignUpEmailCode,
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

  it("continues password sign-up only with email verification", () => {
    expect(
      getPasswordSignUpNextStep({
        status: "complete",
        missingFields: [],
        unverifiedFields: [],
      }),
    ).toEqual({ kind: "complete" });
    expect(
      getPasswordSignUpNextStep({
        status: "missing_requirements",
        missingFields: [],
        unverifiedFields: ["email_address"],
      }),
    ).toEqual({ kind: "email_code" });
  });

  it.each([
    ["another missing field", ["first_name"], ["email_address"]],
    ["another unverified field", [], ["email_address", "phone_number"]],
    ["no email verification", [], []],
  ])("fails closed for sign-up with %s", (_caseName, missing, unverified) => {
    expect(
      getPasswordSignUpNextStep({
        status: "missing_requirements",
        missingFields: missing,
        unverifiedFields: unverified,
      }),
    ).toEqual({ kind: "unsupported" });
  });

  it("does not send a sign-up code after account creation fails", async () => {
    const sendEmailCode = vi.fn(async () => ({ error: null }));
    const finalize = vi.fn(async () => ({ error: null }));

    await expect(
      runPasswordSignUp({
        createAccount: async () => ({ error: new Error("not accepted") }),
        getStatus: () => "missing_requirements",
        getMissingFields: () => [],
        getUnverifiedFields: () => ["email_address"],
        sendEmailCode,
        finalize,
      }),
    ).resolves.toEqual({ kind: "account_failed" });
    expect(sendEmailCode).not.toHaveBeenCalled();
    expect(finalize).not.toHaveBeenCalled();
  });

  it("finalizes a complete sign-up without sending a code", async () => {
    const sendEmailCode = vi.fn(async () => ({ error: null }));
    const finalize = vi.fn(async () => ({ error: null }));

    await expect(
      runPasswordSignUp({
        createAccount: async () => ({ error: null }),
        getStatus: () => "complete",
        getMissingFields: () => [],
        getUnverifiedFields: () => [],
        sendEmailCode,
        finalize,
      }),
    ).resolves.toEqual({ kind: "signed_up" });
    expect(sendEmailCode).not.toHaveBeenCalled();
    expect(finalize).toHaveBeenCalledTimes(1);
  });

  it("keeps sign-up verification available after delivery fails", async () => {
    await expect(
      runPasswordSignUp({
        createAccount: async () => ({ error: null }),
        getStatus: () => "missing_requirements",
        getMissingFields: () => [],
        getUnverifiedFields: () => ["email_address"],
        sendEmailCode: async () => ({ error: new Error("offline") }),
        finalize: async () => ({ error: null }),
      }),
    ).resolves.toEqual({ kind: "email_code_send_failed" });
  });

  it("fails closed before sending a code for unsupported sign-up requirements", async () => {
    const sendEmailCode = vi.fn(async () => ({ error: null }));
    const finalize = vi.fn(async () => ({ error: null }));

    await expect(
      runPasswordSignUp({
        createAccount: async () => ({ error: null }),
        getStatus: () => "missing_requirements",
        getMissingFields: () => ["protect_check"],
        getUnverifiedFields: () => ["email_address"],
        sendEmailCode,
        finalize,
      }),
    ).resolves.toEqual({ kind: "unsupported" });
    expect(sendEmailCode).not.toHaveBeenCalled();
    expect(finalize).not.toHaveBeenCalled();
  });

  it("allows sign-up email delivery and reset to be retried", async () => {
    const sendEmailCode = vi
      .fn()
      .mockResolvedValueOnce({ error: new Error("offline") })
      .mockResolvedValueOnce({ error: null });

    await expect(sendSignUpEmailCode({ sendEmailCode })).resolves.toEqual({
      kind: "failed",
    });
    await expect(sendSignUpEmailCode({ sendEmailCode })).resolves.toEqual({
      kind: "sent",
    });
    await expect(
      resetSignUpAttempt({ reset: async () => ({ error: null }) }),
    ).resolves.toEqual({ kind: "reset" });
  });

  it("retries sign-up finalization without verifying an accepted code twice", async () => {
    let status = "missing_requirements";
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

    await expect(verifySignUpEmailCode(input)).resolves.toEqual({
      kind: "finalize_failed",
    });
    await expect(verifySignUpEmailCode(input)).resolves.toEqual({
      kind: "signed_up",
    });
    expect(verifyEmailCode).toHaveBeenCalledTimes(1);
    expect(finalize).toHaveBeenCalledTimes(2);
  });

  it("serializes sign-up and prevents stale account creation from sending a code", async () => {
    let active = true;
    const pendingAccount = deferred<{ error: null }>();
    const sendEmailCode = vi.fn(async () => ({ error: null }));
    const finalize = vi.fn(async () => ({ error: null }));
    const runner = createExclusiveOperationRunner({
      isActive: () => active,
      onBusyChange: () => undefined,
    });

    const signUp = runner.run(({ isCurrent }) =>
      runPasswordSignUp({
        createAccount: () => pendingAccount.promise,
        getStatus: () => "missing_requirements",
        getMissingFields: () => [],
        getUnverifiedFields: () => ["email_address"],
        sendEmailCode,
        finalize,
        isCurrent,
      }),
    );
    await expect(runner.run(async () => "must not run")).resolves.toEqual({
      kind: "busy",
    });

    active = false;
    runner.invalidate();
    pendingAccount.resolve({ error: null });
    await expect(signUp).resolves.toEqual({ kind: "stale" });
    expect(sendEmailCode).not.toHaveBeenCalled();
    expect(finalize).not.toHaveBeenCalled();
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
