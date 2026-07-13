import { describe, it, expect, vi } from "vitest";
import { createShutdownHandler } from "./shutdown";

const makeLogger = () => ({ info: vi.fn(), error: vi.fn() });

describe("createShutdownHandler", () => {
  it("drains the server, closes the pool, then exits 0", async () => {
    const exit = vi.fn();
    const closePool = vi.fn().mockResolvedValue(undefined);
    // server.close invokes its callback immediately (nothing in flight).
    const server = { close: vi.fn((cb: (e?: Error) => void) => cb()) };

    const handler = createShutdownHandler({
      server,
      closePool,
      logger: makeLogger(),
      timeoutMs: 5000,
      exit,
    });
    handler("SIGTERM");

    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
    expect(server.close).toHaveBeenCalledTimes(1);
    expect(closePool).toHaveBeenCalledTimes(1);
  });

  it("forces exit 1 when draining exceeds the timeout", () => {
    vi.useFakeTimers();
    const exit = vi.fn();
    // server.close never calls its callback — a hung in-flight request.
    const server = { close: vi.fn() };
    const handler = createShutdownHandler({
      server,
      closePool: vi.fn().mockResolvedValue(undefined),
      logger: makeLogger(),
      timeoutMs: 10_000,
      exit,
    });

    handler("SIGTERM");
    expect(exit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(10_000);
    expect(exit).toHaveBeenCalledWith(1);
    vi.useRealTimers();
  });

  it("logs a server.close error but still drains the pool and exits 0", async () => {
    const exit = vi.fn();
    const logger = makeLogger();
    const closePool = vi.fn().mockResolvedValue(undefined);
    // server.close reports an error (e.g. server was never listening).
    const server = {
      close: vi.fn((cb: (e?: Error) => void) => cb(new Error("close failed"))),
    };

    const handler = createShutdownHandler({
      server,
      closePool,
      logger,
      timeoutMs: 5000,
      exit,
    });
    handler("SIGTERM");

    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
    expect(logger.error).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      "Error during server close",
    );
    // The close error must not skip the pool teardown.
    expect(closePool).toHaveBeenCalledTimes(1);
  });

  it("logs a pool-close rejection and exits 1", async () => {
    const exit = vi.fn();
    const logger = makeLogger();
    const poolErr = new Error("pool teardown failed");
    const closePool = vi.fn().mockRejectedValue(poolErr);
    const server = { close: vi.fn((cb: (e?: Error) => void) => cb()) };

    const handler = createShutdownHandler({
      server,
      closePool,
      logger,
      timeoutMs: 5000,
      exit,
    });
    handler("SIGTERM");

    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));
    expect(exit).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      { err: poolErr },
      "Error closing DB pool",
    );
  });

  it("ignores a second signal (close is called once)", () => {
    const server = { close: vi.fn() };
    const handler = createShutdownHandler({
      server,
      closePool: vi.fn().mockResolvedValue(undefined),
      logger: makeLogger(),
      timeoutMs: 5000,
      exit: vi.fn(),
    });
    handler("SIGTERM");
    handler("SIGINT");
    expect(server.close).toHaveBeenCalledTimes(1);
  });
});
