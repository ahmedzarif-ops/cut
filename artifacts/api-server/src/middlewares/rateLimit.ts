import { rateLimit } from "express-rate-limit";
import type { RequestHandler } from "express";

const MINUTE_MS = 60_000;

// express-rate-limit's default keyGenerator keys by req.ip (IPv6-subnet aware),
// which is the real client IP once `app.set("trust proxy", 1)` is configured.
// The in-memory store is per-instance — an acknowledged stopgap on autoscale
// (a shared Redis store is a later item).

/**
 * General throttle for /api, keyed by client IP. Mounted BEFORE requireAuth so
 * an unauthenticated flood can't reach the Clerk verify path unthrottled.
 */
export function createApiLimiter(): RequestHandler {
  return rateLimit({
    windowMs: MINUTE_MS,
    limit: Number(process.env["API_RATE_LIMIT"] ?? 100),
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: "Too many requests" });
    },
  });
}

/** Stricter throttle for the unauthenticated Clerk FAPI proxy (/api/__clerk). */
export function createClerkLimiter(): RequestHandler {
  return rateLimit({
    windowMs: MINUTE_MS,
    limit: Number(process.env["CLERK_RATE_LIMIT"] ?? 30),
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: "Too many requests" });
    },
  });
}
