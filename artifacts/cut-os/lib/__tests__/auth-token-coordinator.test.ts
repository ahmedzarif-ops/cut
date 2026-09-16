import { describe, expect, it, vi } from "vitest";

import type { AuthTokenGetter } from "@workspace/api-client-react";

import { AuthTokenCoordinator } from "../auth-token-coordinator";

describe("AuthTokenCoordinator", () => {
  it("single-flights parallel startup reads and briefly reuses the result", async () => {
    const provider = vi.fn(async () => "startup-token");
    const now = vi.fn(() => 1_000);
    const coordinator = new AuthTokenCoordinator(provider, now, 10_000);

    await expect(
      Promise.all([
        coordinator.getToken(),
        coordinator.getToken(),
        coordinator.getToken(),
      ]),
    ).resolves.toEqual(["startup-token", "startup-token", "startup-token"]);
    await expect(coordinator.getToken()).resolves.toBe("startup-token");
    expect(provider).toHaveBeenCalledOnce();
  });

  it("expires the bounded in-memory reuse window", async () => {
    let currentMs = 1_000;
    const provider = vi
      .fn()
      .mockResolvedValueOnce("first-token")
      .mockResolvedValueOnce("second-token");
    const coordinator = new AuthTokenCoordinator(
      provider,
      () => currentMs,
      10_000,
    );

    await expect(coordinator.getToken()).resolves.toBe("first-token");
    currentMs = 11_001;
    await expect(coordinator.getToken()).resolves.toBe("second-token");
    expect(provider).toHaveBeenCalledTimes(2);
  });

  it("bypasses the reusable token for an explicit refresh", async () => {
    const provider = vi
      .fn()
      .mockResolvedValueOnce("cached-token")
      .mockResolvedValueOnce("refreshed-token");
    const coordinator = new AuthTokenCoordinator(provider);

    await expect(coordinator.getToken()).resolves.toBe("cached-token");
    await expect(coordinator.getToken({ skipCache: true })).resolves.toBe(
      "refreshed-token",
    );
    expect(provider).toHaveBeenNthCalledWith(1, undefined);
    expect(provider).toHaveBeenNthCalledWith(2, { skipCache: true });
  });

  it("prepares one native session refresh before parallel forced reads", async () => {
    let releasePreparation!: () => void;
    const preparation = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          releasePreparation = resolve;
        }),
    );
    const provider = vi.fn(async () => "refreshed-token");
    const coordinator = new AuthTokenCoordinator(
      provider,
      Date.now,
      10_000,
      preparation,
    );

    const first = coordinator.getToken({ skipCache: true });
    const second = coordinator.getToken({ skipCache: true });
    await vi.waitFor(() => expect(preparation).toHaveBeenCalledOnce());
    expect(provider).not.toHaveBeenCalled();

    releasePreparation();
    await expect(Promise.all([first, second])).resolves.toEqual([
      "refreshed-token",
      "refreshed-token",
    ]);
    expect(provider).toHaveBeenCalledOnce();
  });

  it("still asks Clerk for a refreshed token when session touch fails", async () => {
    const preparation = vi.fn(async () => {
      throw new Error("touch failed");
    });
    const provider = vi.fn(async () => "provider-token");
    const coordinator = new AuthTokenCoordinator(
      provider,
      Date.now,
      10_000,
      preparation,
    );

    await expect(coordinator.getToken({ skipCache: true })).resolves.toBe(
      "provider-token",
    );
    expect(preparation).toHaveBeenCalledOnce();
    expect(provider).toHaveBeenCalledWith({ skipCache: true });
  });

  it("uses the latest provider implementation without replacing the coordinator", async () => {
    let currentMs = 1_000;
    let provider: AuthTokenGetter = vi.fn(async () => "initial-token");
    const stableProvider = (options?: { skipCache?: boolean }) =>
      provider(options);
    const coordinator = new AuthTokenCoordinator(
      stableProvider,
      () => currentMs,
      10_000,
    );

    await expect(coordinator.getToken()).resolves.toBe("initial-token");

    provider = vi.fn(async () => "updated-token");
    currentMs = 11_001;

    await expect(coordinator.getToken()).resolves.toBe("updated-token");
    expect(provider).toHaveBeenCalledOnce();
  });

  it("returns no token after principal cleanup", async () => {
    const provider = vi.fn(async () => "private-token");
    const coordinator = new AuthTokenCoordinator(provider);
    await coordinator.getToken();

    coordinator.dispose();

    await expect(coordinator.getToken()).resolves.toBeNull();
    expect(provider).toHaveBeenCalledOnce();
  });
});
