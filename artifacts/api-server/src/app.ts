import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";

const app: Express = express();

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
// raw bytes). Only active in production; a no-op in development.
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

export default app;
