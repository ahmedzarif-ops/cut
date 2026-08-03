import express from "express";
import pino from "pino";
import pinoHttp from "pino-http";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import healthRouter, { setReadinessCheckForTesting } from "./health";

function testApp() {
  const app = express();
  app.use(pinoHttp({ logger: pino({ level: "silent" }) }));
  app.use("/api", healthRouter);
  return app;
}

afterEach(() => {
  setReadinessCheckForTesting(null);
  vi.restoreAllMocks();
});

describe("API liveness and readiness routes", () => {
  it("keeps healthz as a dependency-free liveness check", async () => {
    setReadinessCheckForTesting(async () => {
      throw new Error("database is down");
    });
    const response = await request(testApp()).get("/api/healthz");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("returns 200 only after readiness dependencies pass", async () => {
    const check = vi.fn(async () => undefined);
    setReadinessCheckForTesting(check);
    const response = await request(testApp()).get("/api/readyz");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(check).toHaveBeenCalledOnce();
  });

  it("single-flights a concurrent flood and then serves the success cache", async () => {
    let completeProbe: (() => void) | undefined;
    const check = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          completeProbe = resolve;
        }),
    );
    setReadinessCheckForTesting(check);
    const app = testApp();

    const firstRequest = request(app)
      .get("/api/readyz")
      .then((response) => response);
    await vi.waitFor(() => expect(check).toHaveBeenCalledOnce());

    const concurrent = await Promise.all(
      Array.from({ length: 25 }, () => request(app).get("/api/readyz")),
    );
    expect(concurrent.every(({ status }) => status === 503)).toBe(true);
    expect(check).toHaveBeenCalledOnce();

    expect(completeProbe).toBeTypeOf("function");
    completeProbe?.();
    expect((await firstRequest).status).toBe(200);
    expect((await request(app).get("/api/readyz")).status).toBe(200);
    expect(check).toHaveBeenCalledOnce();
  });

  it("expires failure and success caches before probing again", async () => {
    let now = 10_000;
    const check = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("database unavailable"))
      .mockResolvedValue(undefined);
    setReadinessCheckForTesting(check, {
      failureTtlMs: 10,
      successTtlMs: 20,
      now: () => now,
    });
    const app = testApp();

    expect((await request(app).get("/api/readyz")).status).toBe(503);
    expect((await request(app).get("/api/readyz")).status).toBe(503);
    expect(check).toHaveBeenCalledOnce();

    now += 11;
    expect((await request(app).get("/api/readyz")).status).toBe(200);
    expect((await request(app).get("/api/readyz")).status).toBe(200);
    expect(check).toHaveBeenCalledTimes(2);

    now += 21;
    expect((await request(app).get("/api/readyz")).status).toBe(200);
    expect(check).toHaveBeenCalledTimes(3);
  });

  it("times out once without re-probing while the database call is stuck", async () => {
    let completeProbe: (() => void) | undefined;
    const check = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          completeProbe = resolve;
        }),
    );
    setReadinessCheckForTesting(check, { responseTimeoutMs: 5 });
    const app = testApp();

    const first = await request(app).get("/api/readyz");
    expect(first.status).toBe(503);
    expect(first.headers["retry-after"]).toBe("1");
    expect((await request(app).get("/api/readyz")).status).toBe(503);
    expect(check).toHaveBeenCalledOnce();

    expect(completeProbe).toBeTypeOf("function");
    completeProbe?.();
    await vi.waitFor(async () => {
      expect((await request(app).get("/api/readyz")).status).toBe(200);
    });
    expect(check).toHaveBeenCalledOnce();
  });

  it("returns a sanitized 503 without leaking readiness errors", async () => {
    const sensitiveError =
      "postgresql://private-user:private-password@db.example.com/cut";
    setReadinessCheckForTesting(async () => {
      throw new Error(sensitiveError);
    });

    const response = await request(testApp()).get("/api/readyz");
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: "unavailable" });
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["retry-after"]).toBe("1");
    expect(response.text).not.toContain("private-user");
    expect(response.text).not.toContain("private-password");
    expect(response.text).not.toContain("db.example.com");
  });
});
