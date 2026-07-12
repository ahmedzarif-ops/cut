import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { errorHandler } from "./middlewares/errorHandler";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import helmet from "helmet";
import {
  createApiLimiter,
  createClerkLimiter,
} from "./middlewares/rateLimit";

const app: Express = express();

// Behind the Replit edge (a single proxy hop): trust it so req.ip is the real
// client IP for rate-limit keying. `1`, not `true` — express-rate-limit rejects
// a fully-permissive trust-proxy setting.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Clerk Frontend API proxy — must be mounted BEFORE body parsers (it streams
// raw bytes). Throttle the unauthenticated proxy per IP before proxying.
// Only active in production; a no-op in development.
app.use(CLERK_PROXY_PATH, createClerkLimiter());
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// Explicit CORS allowlist. Never reflect arbitrary origins with credentials —
// in production the Clerk proxy makes web sessions first-party cookies, so a
// reflected origin would let any site issue credentialed requests to /api/*.
// Native mobile clients send no Origin header and are always allowed.
const allowedOrigins = new Set(
  [
    process.env.REPLIT_DEV_DOMAIN,
    process.env.REPLIT_EXPO_DEV_DOMAIN,
    ...(process.env.CORS_ALLOWED_ORIGINS?.split(",") ?? []),
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    // Normalize bare domains to https and never allow plaintext (http://)
    // origins — credentialed requests must only come over TLS.
    .map((value) => {
      if (value.startsWith("http://")) return null;
      return value.startsWith("https://") ? value : `https://${value}`;
    })
    .filter((value): value is string => value !== null),
);

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      // No Origin => native app / same-origin / non-browser client.
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  }),
);

// Security headers on the API surface. Mounted AFTER the Clerk proxy so proxied
// FAPI bytes are untouched. CSP disabled (JSON API); helmet's defaults still
// emit nosniff, HSTS, X-Frame-Options, and no-referrer.
app.use("/api", helmet({ contentSecurityPolicy: false }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// General per-IP throttle on all /api routes. Mounted before clerkMiddleware
// so an unauthenticated flood can't consume JWT-verification work — the
// limiter is IP-keyed and independent of auth status.
app.use("/api", createApiLimiter());

// Resolve the publishable key from the incoming request host so the same
// server can serve multiple Clerk custom domains, falling back to the env key.
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

// Catch-all error normalizer — must be registered last, after all routes.
app.use(errorHandler);

export default app;
