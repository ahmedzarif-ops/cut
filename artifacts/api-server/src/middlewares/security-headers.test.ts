import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import helmet from "helmet";

describe("helmet security headers on /api", () => {
  const app = express();
  app.use("/api", helmet({ contentSecurityPolicy: false }));
  app.get("/api/ping", (_req, res) => {
    res.json({ ok: true });
  });

  it("sets standard hardening headers and omits CSP for the JSON API", async () => {
    const res = await request(app).get("/api/ping");
    expect(res.status).toBe(200);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["referrer-policy"]).toBe("no-referrer");
    expect(res.headers["strict-transport-security"]).toContain("max-age=");
    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(res.headers["content-security-policy"]).toBeUndefined();
  });
});
