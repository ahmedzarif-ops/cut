import { describe, it, expect, afterEach } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import { createApiLimiter } from "./rateLimit";

afterEach(() => {
  delete process.env.API_RATE_LIMIT;
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
});
