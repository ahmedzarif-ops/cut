import { logger as defaultLogger } from "../lib/logger";
import { retryPendingAccountDeletions } from "./accountDeletionService";

export interface AccountDeletionWorker {
  runNow(): Promise<void>;
  stop(): Promise<void>;
}

export interface AccountDeletionWorkerOptions {
  intervalMs?: number;
  limit?: number;
  logger?: {
    info(obj: unknown, message?: string): void;
    error(obj: unknown, message?: string): void;
  };
}

/**
 * Start a bounded, non-overlapping retry loop. The timer is unref'd so it never
 * keeps an otherwise-drained process alive; shutdown still stops it explicitly
 * before closing the database pool.
 */
export function startAccountDeletionWorker(
  options: AccountDeletionWorkerOptions = {},
): AccountDeletionWorker {
  const intervalMs = Math.max(1_000, options.intervalMs ?? 60_000);
  const limit = options.limit ?? 10;
  const logger = options.logger ?? defaultLogger;
  let activeRun: Promise<void> | null = null;
  let stopped = false;

  const runNow = (): Promise<void> => {
    if (stopped) return Promise.resolve();
    if (!activeRun) {
      activeRun = (async () => {
        try {
          const result = await retryPendingAccountDeletions(limit);
          if (result.processed > 0) {
            logger.info(result, "Account deletion retries processed");
          }
        } catch {
          // Do not log vendor errors or external identity values. The next
          // interval retries from durable state.
          logger.error(
            { errorCode: "account_deletion_worker_failed" },
            "Account deletion retry worker failed",
          );
        }
      })().finally(() => {
        activeRun = null;
      });
    }
    return activeRun;
  };

  const timer = setInterval(() => void runNow(), intervalMs);
  (timer as { unref?: () => void }).unref?.();

  return {
    runNow,
    async stop() {
      stopped = true;
      clearInterval(timer);
      if (activeRun) {
        await activeRun;
      }
    },
  };
}
