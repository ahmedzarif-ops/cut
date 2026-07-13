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
import { buildAllowedHosts, buildAllowedOrigins } from "./lib/allowedHosts";

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
// Built from the shared allowlist source (lib/allowedHosts.ts) that also
// gates Clerk host resolution below.
const allowedOrigins = buildAllowedOrigins();
const allowedHosts = buildAllowedHosts();

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
// server can serve multiple Clerk custom domains. Only ALLOWLISTED hosts
// participate (x-forwarded-host is client-writable); an unknown or missing
// host falls back to the env key — never to a header-derived one. The
// fallback also bypasses publishableKeyFromHost, which throws on an empty
// host when the fallback key is a live (pk_live_) key.
app.use(
  clerkMiddleware((req) => {
    const host = getClerkProxyHost(req, allowedHosts);
    return {
      publishableKey: host
        ? publishableKeyFromHost(host, process.env.CLERK_PUBLISHABLE_KEY)
        : process.env.CLERK_PUBLISHABLE_KEY,
    };
  }),
);

app.use("/api", router);

// Catch-all error normalizer — must be registered last, after all routes.
app.use(errorHandler);

export default app;
