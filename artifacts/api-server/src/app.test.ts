/**
 * Locks the app.ts middleware ORDER against the real exported app (not a
 * reconstruction): the IP-keyed apiLimiter must run BEFORE clerkMiddleware
 * (an unauthenticated flood gets 429s, not unthrottled 401s from the auth
 * path), and helmet's headers must be present on /api responses.
 *
 * app.ts calls createApiLimiter() at module-import time, so the rate-limit
 * env override is set BEFORE a dynamic import of the real app.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import type { Express } from "express";

const LIMIT = 5;

let app: Express;

beforeAll(async () => {
  process.env.API_RATE_LIMIT = String(LIMIT);
  process.env.LOG_LEVEL = "silent";
  // Dummy Clerk keys so the REAL clerkMiddleware runs (and, with no session
  // token, resolves signed-out) instead of throwing on missing configuration.
  // The publishable key is `pk_test_` + base64("example.clerk.accounts.dev$").
  process.env.CLERK_PUBLISHABLE_KEY =
    "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk";
  process.env.CLERK_SECRET_KEY = ["sk", "test", "middleware-order-lock"].join(
    "_",
  );
  process.env.CLERK_TELEMETRY_DISABLED = "1";
  app = (await import("./app")).default;
});

afterAll(() => {
  delete process.env.API_RATE_LIMIT;
  delete process.env.CLERK_PUBLISHABLE_KEY;
  delete process.env.CLERK_SECRET_KEY;
  delete process.env.CLERK_TELEMETRY_DISABLED;
});

describe("app middleware order", () => {
  it("rate-limits /api before auth: the flood trips to 429, not 401", async () => {
    const ip = { "x-forwarded-for": "9.9.9.1" };

    // Under the limit, requests reach the real auth stack and are rejected
    // there — proof clerkMiddleware/requireAuth ran for these.
    for (let i = 0; i < LIMIT; i++) {
      const res = await request(app).get("/api/me").set(ip);
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Unauthorized" });
    }

    // Over the limit, the limiter answers BEFORE auth: 429, never 401.
    const blocked = await request(app).get("/api/me").set(ip);
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: "Too many requests" });
  });

  it("keys the /api limiter by client IP (a second client is unaffected)", async () => {
    const res = await request(app)
      .get("/api/me")
      .set({ "x-forwarded-for": "9.9.9.2" });
    expect(res.status).toBe(401);
  });

  it("serves /api responses with helmet security headers", async () => {
    const res = await request(app)
      .get("/api/healthz")
      .set({ "x-forwarded-for": "9.9.9.3" });
    expect(res.status).toBe(200);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["referrer-policy"]).toBe("no-referrer");
    expect(res.headers["strict-transport-security"]).toContain("max-age=");
    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
    // CSP is deliberately disabled for the JSON API.
    expect(res.headers["content-security-policy"]).toBeUndefined();
  });

  it("returns client errors for malformed and oversized JSON bodies", async () => {
    const malformed = await request(app)
      .post("/api/me")
      .set({
        "x-forwarded-for": "9.9.9.4",
        "content-type": "application/json",
      })
      .send('{"broken"');
    expect(malformed.status).toBe(400);
    expect(malformed.body).toEqual({ error: "Invalid request body" });

    const oversized = await request(app)
      .post("/api/me")
      .set({
        "x-forwarded-for": "9.9.9.5",
        "content-type": "application/json",
      })
      .send(JSON.stringify({ value: "x".repeat(110_000) }));
    expect(oversized.status).toBe(413);
    expect(oversized.body).toEqual({ error: "Request body too large" });
  });

  it("serves public, legal, status, and API routes from the same Express app", async () => {
    const landing = await request(app).get("/");
    expect(landing.status).toBe(200);
    expect(landing.text).toContain('data-app-surface="production"');
    expect(landing.text).toContain("For adults age 18 and over");
    expect(landing.headers["content-security-policy"]).toContain(
      "script-src 'none'",
    );

    const status = await request(app).get("/status");
    expect(status.status).toBe(200);
    expect(status.body).toEqual({ status: "ok" });

    for (const route of ["/privacy", "/terms", "/support"]) {
      const draftLegalPage = await request(app).get(route);
      expect(draftLegalPage.status).toBe(503);
      expect(draftLegalPage.headers["x-robots-tag"]).toContain("noindex");
      // The source templates are publication-ready, but the runtime switch
      // remains fail-closed until LEGAL_SITE_PUBLICATION_STATUS is approved.
      expect(draftLegalPage.text).toContain(
        'data-publication-status="approved"',
      );
      expect(draftLegalPage.text).toContain(
        'data-professional-review-status="owner-deferred-post-launch"',
      );
    }

    const apiHealth = await request(app).get("/api/healthz");
    expect(apiHealth.status).toBe(200);

    const protectedApi = await request(app)
      .get("/api/me")
      .set({ "x-forwarded-for": "9.9.9.6" });
    expect(protectedApi.status).toBe(401);
    expect(protectedApi.body).toEqual({ error: "Unauthorized" });
  });
});
