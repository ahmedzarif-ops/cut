import { describe, it, expect, afterEach } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import { createApiLimiter, createClerkLimiter } from "./rateLimit";

afterEach(() => {
  delete process.env.API_RATE_LIMIT;
  delete process.env.CLERK_RATE_LIMIT;
});

function appWithLimit(limit: number): Express {
  process.env.API_RATE_LIMIT = String(limit);
  const app = express();
  app.set("trust proxy", 1);
  app.use(createApiLimiter());
  app.get("/ping", (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe("createApiLimiter", () => {
  it("allows up to the limit, then returns a JSON 429", async () => {
    const app = appWithLimit(3);
    for (let i = 0; i < 3; i++) {
      expect((await request(app).get("/ping")).status).toBe(200);
    }
    const blocked = await request(app).get("/ping");
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: "Too many requests" });
  });

  it("keys by client IP from x-forwarded-for under trust proxy", async () => {
    const app = appWithLimit(1);
    const ip1 = { "x-forwarded-for": "1.1.1.1" };
    const ip2 = { "x-forwarded-for": "2.2.2.2" };
    expect((await request(app).get("/ping").set(ip1)).status).toBe(200);
    expect((await request(app).get("/ping").set(ip1)).status).toBe(429);
    // A different client IP still has its own allowance.
    expect((await request(app).get("/ping").set(ip2)).status).toBe(200);
  });

  it("does not pretend the MemoryStore allowance is shared across instances", async () => {
    const firstReplica = appWithLimit(1);
    const secondReplica = appWithLimit(1);
    const ip = { "x-forwarded-for": "1.1.1.10" };

    expect((await request(firstReplica).get("/ping").set(ip)).status).toBe(200);
    expect((await request(firstReplica).get("/ping").set(ip)).status).toBe(429);
    expect((await request(secondReplica).get("/ping").set(ip)).status).toBe(
      200,
    );
  });

  it.each(["NaN", "0", "-1", "1.5", "10001", " 3"])(
    "uses the safe default instead of malformed or excessive API_RATE_LIMIT %s",
    async (value) => {
      process.env.API_RATE_LIMIT = value;
      const app = express();
      app.use(createApiLimiter());
      app.get("/ping", (_req, res) => res.json({ ok: true }));
      for (let requestNumber = 0; requestNumber < 100; requestNumber += 1) {
        expect((await request(app).get("/ping")).status).toBe(200);
      }
      expect((await request(app).get("/ping")).status).toBe(429);
    },
  );
});

function clerkProxyApp(limit?: number): Express {
  if (limit !== undefined) process.env.CLERK_RATE_LIMIT = String(limit);
  const app = express();
  app.set("trust proxy", 1);
  app.use("/api/__clerk", createClerkLimiter());
  app.get("/api/__clerk/v1/environment", (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe("createClerkLimiter", () => {
  it("allows up to the limit on /api/__clerk, then returns a JSON 429", async () => {
    const app = clerkProxyApp(2);
    const path = "/api/__clerk/v1/environment";
    for (let i = 0; i < 2; i++) {
      expect((await request(app).get(path)).status).toBe(200);
    }
    const blocked = await request(app).get(path);
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: "Too many requests" });
  });

  it("defaults to 30 per minute when CLERK_RATE_LIMIT is unset", async () => {
    const app = clerkProxyApp();
    const path = "/api/__clerk/v1/environment";
    for (let i = 0; i < 30; i++) {
      expect((await request(app).get(path)).status).toBe(200);
    }
    expect((await request(app).get(path)).status).toBe(429);
  });

  it("keys by client IP from x-forwarded-for under trust proxy", async () => {
    const app = clerkProxyApp(1);
    const path = "/api/__clerk/v1/environment";
    const ip1 = { "x-forwarded-for": "3.3.3.3" };
    const ip2 = { "x-forwarded-for": "4.4.4.4" };
    expect((await request(app).get(path).set(ip1)).status).toBe(200);
    expect((await request(app).get(path).set(ip1)).status).toBe(429);
    // A different client IP still has its own allowance.
    expect((await request(app).get(path).set(ip2)).status).toBe(200);
  });

  it.each(["NaN", "0", "-1", "1.5", "1001", " 2"])(
    "uses the safe default instead of malformed or excessive CLERK_RATE_LIMIT %s",
    async (value) => {
      process.env.CLERK_RATE_LIMIT = value;
      const app = clerkProxyApp();
      const path = "/api/__clerk/v1/environment";
      for (let requestNumber = 0; requestNumber < 30; requestNumber += 1) {
        expect((await request(app).get(path)).status).toBe(200);
      }
      expect((await request(app).get(path)).status).toBe(429);
    },
  );
});
