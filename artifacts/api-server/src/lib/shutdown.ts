import { parseBoundedInteger } from "./boundedInteger";

export const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;
export const MAX_SHUTDOWN_TIMEOUT_MS = 60_000;
export const MIN_SHUTDOWN_TIMEOUT_MS = 1;

/**
 * Resolve the shutdown grace period without accepting ambiguous or unbounded
 * timer values. The error names only the setting and its safe range, never the
 * supplied value.
 */
export function parseShutdownTimeout(value: string | undefined): number {
  const parsed = parseBoundedInteger(value, {
    minimum: MIN_SHUTDOWN_TIMEOUT_MS,
    maximum: MAX_SHUTDOWN_TIMEOUT_MS,
    defaultValue: DEFAULT_SHUTDOWN_TIMEOUT_MS,
  });

  if (parsed === null) {
    throw new Error(
      `SHUTDOWN_TIMEOUT_MS must be an integer from ${MIN_SHUTDOWN_TIMEOUT_MS} through ${MAX_SHUTDOWN_TIMEOUT_MS}.`,
    );
  }

  return parsed;
}

export interface ShutdownDeps {
  server: { close(cb: (err?: Error) => void): unknown };
  closePool: () => Promise<void>;
  logger: {
    info(obj: unknown, msg?: string): void;
    error(obj: unknown, msg?: string): void;
  };
  timeoutMs: number;
  exit: (code: number) => void;
}

/**
 * Build a signal handler that drains in-flight requests, closes the DB pool,
 * then exits. A hard timeout forces a non-zero exit if draining hangs so the
 * platform's SIGKILL grace period isn't wasted. Pure/injected deps so the
 * happy path and the timeout path are unit-testable without a real process.
 */
export function createShutdownHandler(
  deps: ShutdownDeps,
): (signal: string) => void {
  let started = false;
  return (signal: string) => {
    if (started) return; // a second signal during shutdown is a no-op
    started = true;
    deps.logger.info({ signal }, "Shutting down");

    const timer = setTimeout(() => {
      deps.logger.error({ signal }, "Shutdown timed out; forcing exit");
      deps.exit(1);
    }, deps.timeoutMs);
    // Don't let the timer keep the event loop alive.
    (timer as { unref?: () => void }).unref?.();

    deps.server.close((err?: Error) => {
      if (err) {
        deps.logger.error(
          { errorCode: "server_close_failed" },
          "Error during server close",
        );
      }
      deps
        .closePool()
        .then(() => {
          clearTimeout(timer);
          deps.exit(0);
        })
        .catch(() => {
          deps.logger.error(
            { errorCode: "db_pool_close_failed" },
            "Error closing DB pool",
          );
          clearTimeout(timer);
          deps.exit(1);
        });
    });
  };
}
