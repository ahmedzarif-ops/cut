import { afterEach, describe, expect, it, vi } from "vitest";

const { retryPendingAccountDeletions } = vi.hoisted(() => ({
  retryPendingAccountDeletions: vi.fn(),
}));

vi.mock("./accountDeletionService", () => ({
  retryPendingAccountDeletions,
}));

import { startAccountDeletionWorker } from "./accountDeletionWorker";

const idleResult = {
  processed: 0,
  completed: 0,
  pending: 0,
  pendingBacklogCount: 0,
  oldestPendingAgeSeconds: null,
  maxPendingAttemptCount: 0,
};

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("account deletion worker scheduling", () => {
  it.each([1_000.5, 999, 300_001, 2_147_483_648])(
    "rejects an unsafe interval before creating a timer: %s",
    (intervalMs) => {
      expect(() => startAccountDeletionWorker({ intervalMs })).toThrowError(
        "Invalid account deletion retry interval.",
      );
      expect(retryPendingAccountDeletions).not.toHaveBeenCalled();
    },
  );

  it("runs immediately and does not schedule or overlap while startup work is active", async () => {
    vi.useFakeTimers();
    let finishStartupRun: ((value: typeof idleResult) => void) | undefined;
    retryPendingAccountDeletions.mockImplementationOnce(
      () =>
        new Promise<typeof idleResult>((resolve) => {
          finishStartupRun = resolve;
        }),
    );
    const logger = { info: vi.fn(), error: vi.fn() };
    const worker = startAccountDeletionWorker({ intervalMs: 1_000, logger });

    expect(retryPendingAccountDeletions).toHaveBeenCalledTimes(1);
    const joinedStartupRun = worker.runNow();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(retryPendingAccountDeletions).toHaveBeenCalledTimes(1);

    finishStartupRun?.(idleResult);
    await joinedStartupRun;
    expect(logger.info).toHaveBeenCalledOnce();
    expect(logger.info).toHaveBeenCalledWith(
      idleResult,
      "Account deletion retries processed",
    );
    await vi.advanceTimersByTimeAsync(999);
    expect(retryPendingAccountDeletions).toHaveBeenCalledTimes(1);

    retryPendingAccountDeletions.mockResolvedValue(idleResult);
    await vi.advanceTimersByTimeAsync(1);
    expect(retryPendingAccountDeletions).toHaveBeenCalledTimes(2);
    await worker.stop();
  });
});
