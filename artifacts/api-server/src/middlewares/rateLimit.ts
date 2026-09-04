import { rateLimit } from "express-rate-limit";
import type { RequestHandler } from "express";
import {
  API_RATE_LIMIT_MAXIMUM,
  CLERK_RATE_LIMIT_MAXIMUM,
  parseBoundedInteger,
} from "../lib/boundedInteger";

const MINUTE_MS = 60_000;
const API_RATE_LIMIT_DEFAULT = 100;
const CLERK_RATE_LIMIT_DEFAULT = 30;
export const CLERK_RATE_LIMIT_SECURITY_EVENT =
  "clerk_frontend_api_rate_limited";

function safeLimit(
  value: string | undefined,
  defaultValue: number,
  maximum: number,
): number {
  return (
    parseBoundedInteger(value, { minimum: 1, maximum, defaultValue }) ??
    defaultValue
  );
}

// express-rate-limit's default keyGenerator keys by req.ip (IPv6-subnet aware),
// which is the real client IP once `app.set("trust proxy", 1)` is configured.
// The default MemoryStore is deliberately still per-process. Production
// startup therefore requires API_MAX_INSTANCES=1 and rejects any larger
// topology until a real shared store is integrated and this gate is revised.

/**
 * General throttle for /api, keyed by client IP. Mounted BEFORE requireAuth so
 * an unauthenticated flood can't reach the Clerk verify path unthrottled.
 */
export function createApiLimiter(): RequestHandler {
  return rateLimit({
    windowMs: MINUTE_MS,
    limit: safeLimit(
      process.env["API_RATE_LIMIT"],
      API_RATE_LIMIT_DEFAULT,
      API_RATE_LIMIT_MAXIMUM,
    ),
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
    limit: safeLimit(
      process.env["CLERK_RATE_LIMIT"],
      CLERK_RATE_LIMIT_DEFAULT,
      CLERK_RATE_LIMIT_MAXIMUM,
    ),
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      // Record only a fixed event name. Recovery identifiers, reset codes,
      // passwords, Clerk resource IDs, headers, and provider errors must never
      // enter an abuse log.
      req.log?.warn(
        { securityEvent: CLERK_RATE_LIMIT_SECURITY_EVENT },
        "Clerk Frontend API request rate limited",
      );
      res.status(429).json({ error: "Too many requests" });
    },
  });
}
