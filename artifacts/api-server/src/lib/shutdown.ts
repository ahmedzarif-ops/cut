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
      if (err) deps.logger.error({ err }, "Error during server close");
      deps
        .closePool()
        .then(() => {
          clearTimeout(timer);
          deps.exit(0);
        })
        .catch((poolErr: unknown) => {
          deps.logger.error({ err: poolErr }, "Error closing DB pool");
          clearTimeout(timer);
          deps.exit(1);
        });
    });
  };
}
