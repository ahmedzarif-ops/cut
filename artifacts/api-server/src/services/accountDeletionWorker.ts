import { logger as defaultLogger } from "../lib/logger";
import {
  DEFAULT_ACCOUNT_DELETION_RETRY_INTERVAL_MS,
  isValidAccountDeletionRetryInterval,
} from "../lib/accountDeletionRetryInterval";
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
  const intervalMs =
    options.intervalMs ?? DEFAULT_ACCOUNT_DELETION_RETRY_INTERVAL_MS;
  if (!isValidAccountDeletionRetryInterval(intervalMs)) {
    throw new RangeError("Invalid account deletion retry interval.");
  }
  const limit = options.limit ?? 10;
  const logger = options.logger ?? defaultLogger;
  let activeRun: Promise<void> | null = null;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const runNow = (logIdle = false): Promise<void> => {
    if (stopped) return Promise.resolve();
    if (!activeRun) {
      activeRun = (async () => {
        try {
          const result = await retryPendingAccountDeletions(limit);
          if (
            logIdle ||
            result.processed > 0 ||
            result.pendingBacklogCount > 0
          ) {
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

  const scheduleNext = (): void => {
    if (stopped) return;
    timer = setTimeout(() => {
      timer = null;
      void runNow().finally(scheduleNext);
    }, intervalMs);
    (timer as { unref?: () => void }).unref?.();
  };

  // Observe and process durable backlog immediately. The next timeout is only
  // scheduled after this run settles, so slow vendor/database calls cannot
  // create overlapping retries or hide the startup backlog for one interval.
  void runNow(true).finally(scheduleNext);

  return {
    runNow,
    async stop() {
      stopped = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (activeRun) {
        await activeRun;
      }
    },
  };
}
