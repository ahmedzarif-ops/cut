import { describe, expect, it, vi } from "vitest";

import {
  confirmServerSubscriptionRefresh,
  ProviderPrincipalGuard,
  resolveAccessRecheck,
  resolvePurchaseVerification,
  resolveRestoreVerification,
  runSignOutWithFeedback,
  runSubscriptionSignOut,
} from "../subscription-provider-state";
import { CUT_OS_PRO_ENTITLEMENT_ID } from "../subscription";
import { SubscriptionAdapterError } from "../subscription-adapter";

const USER_A = "d9428888-122b-4a5f-a4e8-0a0f874235a8";
const USER_B = "7d444840-9dc0-11d1-b245-5ffdce74fad2";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function deferredValue<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function subscriptionStatus(entitled: boolean) {
  return {
    entitled,
    entitlementId: CUT_OS_PRO_ENTITLEMENT_ID,
    expiresAt: null,
    managementUrl: null,
  };
}

describe("subscription provider state", () => {
  it("invalidates a late server refresh token when the account switches", () => {
    const guard = new ProviderPrincipalGuard();
    const tokenA = guard.activate(USER_A);
    expect(guard.isCurrent(tokenA)).toBe(true);

    const tokenB = guard.activate(USER_B);
    expect(guard.isCurrent(tokenA)).toBe(false);
    expect(guard.isCurrent(tokenB)).toBe(true);

    // A late cleanup for A must not deactivate the now-current B session.
    guard.deactivate(tokenA);
    expect(guard.isCurrent(tokenB)).toBe(true);
  });

  it("forces a refresh, commits only the scoped owner, and keeps false pending", async () => {
    const guard = new ProviderPrincipalGuard();
    const token = guard.activate(USER_A);
    const status = subscriptionStatus(false);
    const refresh = vi.fn(async () => status);
    const ownerBCache = subscriptionStatus(true);
    const cache = new Map([[USER_B, ownerBCache]]);
    const commit = vi.fn((owner: string, value: typeof status) => {
      cache.set(owner, value);
    });

    const verified = await confirmServerSubscriptionRefresh({
      owner: USER_A,
      token,
      guard,
      refresh,
      commit,
    });

    expect(refresh).toHaveBeenCalledOnce();
    expect(commit).toHaveBeenCalledWith(USER_A, status);
    expect(cache.get(USER_A)).toBe(status);
    expect(cache.get(USER_B)).toBe(ownerBCache);
    expect(resolveAccessRecheck(verified.entitled)).toBe("pending");
  });

  it("rejects a late refresh after a principal switch without committing access", async () => {
    const guard = new ProviderPrincipalGuard();
    const tokenA = guard.activate(USER_A);
    const operation = deferredValue<ReturnType<typeof subscriptionStatus>>();
    const commit = vi.fn();

    const confirmation = confirmServerSubscriptionRefresh({
      owner: USER_A,
      token: tokenA,
      guard,
      refresh: () => operation.promise,
      commit,
    });
    guard.activate(USER_B);
    operation.resolve(subscriptionStatus(true));

    await expect(confirmation).rejects.toMatchObject({
      name: "SubscriptionAdapterError",
      code: "principal_changed",
    });
    expect(commit).not.toHaveBeenCalled();
  });

  it("never unlocks or commits when the forced refresh fails", async () => {
    const guard = new ProviderPrincipalGuard();
    const token = guard.activate(USER_A);
    const commit = vi.fn();
    const failure = new SubscriptionAdapterError("unavailable");

    await expect(
      confirmServerSubscriptionRefresh({
        owner: USER_A,
        token,
        guard,
        refresh: async () => {
          throw failure;
        },
        commit,
      }),
    ).rejects.toBe(failure);
    expect(commit).not.toHaveBeenCalled();
    expect(resolveAccessRecheck(false)).toBe("pending");
    expect(resolveAccessRecheck(true)).toBe("entitled");
  });

  it("keeps restore confirming when local Pro and server refresh disagree", () => {
    expect(
      resolveRestoreVerification({
        localHasProEntitlement: true,
        serverEntitled: false,
      }),
    ).toBe("pending");
    expect(
      resolveRestoreVerification({
        localHasProEntitlement: true,
        serverEntitled: null,
      }),
    ).toBe("pending");
  });

  it("reports no restored access only after both local and server checks agree", () => {
    expect(
      resolveRestoreVerification({
        localHasProEntitlement: false,
        serverEntitled: false,
      }),
    ).toBe("not_entitled");
    expect(
      resolveRestoreVerification({
        localHasProEntitlement: false,
        serverEntitled: null,
      }),
    ).toBe("pending");
    expect(
      resolveRestoreVerification({
        localHasProEntitlement: false,
        serverEntitled: true,
      }),
    ).toBe("entitled");
  });

  it("never treats a completed purchase as failed while server refresh catches up", () => {
    expect(resolvePurchaseVerification(false)).toBe("pending");
    expect(resolvePurchaseVerification(null)).toBe("pending");
    expect(resolvePurchaseVerification(true)).toBe("entitled");
  });

  it("routes the visible Sign out interaction through one shared callback", async () => {
    const operation = deferred();
    const signOut = vi.fn(() => operation.promise);
    const lock = { current: false };

    const firstPress = runSubscriptionSignOut(lock, signOut);
    const secondPress = runSubscriptionSignOut(lock, signOut);
    expect(signOut).toHaveBeenCalledTimes(1);
    await expect(secondPress).resolves.toBe("ignored");

    operation.resolve();
    await expect(firstPress).resolves.toBe("signed_out");
    expect(lock.current).toBe(false);
  });

  it("shows progress and a retryable error when Sign out fails", async () => {
    const signOut = vi.fn(async () => {
      throw new Error("private provider detail");
    });
    const lock = { current: false };
    const setBusy = vi.fn();
    const setError = vi.fn();

    await expect(
      runSignOutWithFeedback(
        lock,
        signOut,
        { setBusy, setError },
        "CUT OS couldn't sign out. Check your connection and try again.",
      ),
    ).resolves.toBe("failed");

    expect(setError).toHaveBeenNthCalledWith(1, null);
    expect(setError).toHaveBeenNthCalledWith(
      2,
      "CUT OS couldn't sign out. Check your connection and try again.",
    );
    expect(setBusy.mock.calls).toEqual([[true], [false]]);
    expect(lock.current).toBe(false);
  });

  it("keeps a repeated Sign out press inert while the first is pending", async () => {
    const operation = deferred();
    const signOut = vi.fn(() => operation.promise);
    const lock = { current: false };
    const feedback = {
      setBusy: vi.fn(),
      setError: vi.fn(),
    };

    const firstPress = runSignOutWithFeedback(
      lock,
      signOut,
      feedback,
      "Sign out failed.",
    );
    await expect(
      runSignOutWithFeedback(lock, signOut, feedback, "Sign out failed."),
    ).resolves.toBe("ignored");
    expect(signOut).toHaveBeenCalledOnce();

    operation.resolve();
    await expect(firstPress).resolves.toBe("signed_out");
    expect(feedback.setBusy.mock.calls).toEqual([[true], [false]]);
  });
});
