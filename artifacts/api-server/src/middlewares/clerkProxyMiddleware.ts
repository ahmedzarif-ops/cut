/**
 * Clerk Frontend API Proxy Middleware
 *
 * Proxies Clerk Frontend API requests through your domain, enabling Clerk
 * authentication on custom domains and .replit.app deployments without
 * requiring CNAME DNS configuration.
 *
 * AUTH CONFIGURATION: Manage the production instance, login methods, domains,
 * branding, and proxy activation in Clerk's dashboard. Keep the server-only
 * secret key in the API deployment and never expose it to the mobile client.
 *
 * IMPORTANT:
 * - Only active in production (Clerk proxying doesn't work for dev instances)
 * - Must be mounted BEFORE express.json() middleware
 *
 * Usage in app.ts:
 *   import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
 *   app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
 */

import { createProxyMiddleware } from "http-proxy-middleware";
import { isIP } from "node:net";
import type { Request, RequestHandler, Response } from "express";
import type {
  ClientRequest,
  IncomingHttpHeaders,
  ServerResponse,
} from "node:http";
import type { Socket } from "node:net";
import { buildAllowedHosts, normalizeHost } from "../lib/allowedHosts";

const CLERK_FAPI = "https://frontend-api.clerk.dev";
export const CLERK_PROXY_PATH = "/api/__clerk";
export const CLERK_PROXY_TIMEOUT_MS = 10_000;
export const CLERK_MAX_BUFFERED_RESPONSE_BYTES = 1_048_576;

interface ClerkProxyOptions {
  /** Test seam. Production always uses Clerk's fixed Frontend API target. */
  target?: string;
  /** Test seam. Production uses the exported fixed bound. */
  proxyTimeoutMs?: number;
  /** Test seam. Production uses the exported fixed bound. */
  maxBufferedResponseBytes?: number;
}

/**
 * Returns one address only after Express has applied the app's exact, audited
 * one-hop trust-proxy topology. In particular, Express selects the rightmost
 * X-Forwarded-For value behind that one trusted hop, so a client-spoofed
 * leftmost value cannot become the forwarded identity.
 */
export function getTrustedClientIp(
  req: Pick<Request, "app" | "ip" | "ips">,
): string | undefined {
  if (req.app.get("trust proxy") !== 1) return undefined;

  const candidate = req.ip?.trim();
  if (!candidate || isIP(candidate) === 0) return undefined;

  // With exactly one trusted hop, a genuine edge-forwarded request exposes
  // exactly one forwarded IP and selects that same value as req.ip. An empty
  // req.ips means the request did not carry an edge-owned X-Forwarded-For
  // value; forwarding req.ip in that case would incorrectly promote the
  // direct socket address into a trusted client identity.
  if (
    !Array.isArray(req.ips) ||
    req.ips.length !== 1 ||
    req.ips[0] !== candidate
  ) {
    return undefined;
  }

  return candidate;
}

export function forwardTrustedClientIp(
  proxyReq: Pick<ClientRequest, "removeHeader" | "setHeader">,
  req: Pick<Request, "app" | "ip" | "ips">,
): void {
  // http-proxy forwards incoming headers by default. Strip every alternate
  // client-IP claim before adding the single Express-derived value.
  proxyReq.removeHeader("Forwarded");
  proxyReq.removeHeader("X-Forwarded-For");
  proxyReq.removeHeader("X-Forwarded-Host");
  proxyReq.removeHeader("X-Forwarded-Port");
  proxyReq.removeHeader("X-Forwarded-Proto");
  proxyReq.removeHeader("X-Real-IP");

  const clientIp = getTrustedClientIp(req);
  if (clientIp) proxyReq.setHeader("X-Forwarded-For", clientIp);
}

function isServerResponse(
  response: ServerResponse | Socket,
): response is ServerResponse {
  return "writeHead" in response && typeof response.writeHead === "function";
}

function sendProxyFailure(
  req: Pick<Request, "method">,
  res: ServerResponse,
  status: 502 | 504,
): void {
  if (res.writableEnded || res.destroyed) return;
  if (res.headersSent) {
    res.destroy();
    return;
  }

  const body = Buffer.from(
    JSON.stringify({ error: "Authentication service unavailable" }),
  );
  res.writeHead(status, {
    "cache-control": "no-store",
    "content-length": String(body.length),
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
  });
  res.end(req.method === "HEAD" ? undefined : body);
}

/**
 * Returns the effective ALLOWLISTED public hostname for the given request,
 * or undefined when no host header matches the allowlist. The result feeds
 * publishableKeyFromHost (whose own docs require exactly this allowlist
 * check) and the Clerk-Proxy-Url header, so it must never echo an
 * untrusted header value.
 *
 * x-forwarded-host is client-writable and can take three shapes:
 *   - undefined (no proxy involved)
 *   - a single string (one proxy hop)
 *   - a comma-delimited string when an upstream APPENDED rather than
 *     replaced the header (Node folds duplicate headers this way), or a
 *     string[] in some Express typings
 * In the audited one-hop topology, the edge appends the public host, so the
 * rightmost forwarded value is the only edge-owned candidate. A client can
 * spoof an allowlisted leftmost value, so scanning for the first allowlist
 * match would still permit cross-host misbinding. When X-Forwarded-Host is
 * present, use only its rightmost value and fail closed if it is invalid or
 * not allowlisted; fall back to Host only when the forwarded header is absent.
 * Exported so app.ts and this proxy middleware use the same canonical host.
 */
export function getClerkProxyHost(
  req: { headers: IncomingHttpHeaders },
  allowedHosts: ReadonlySet<string>,
): string | undefined {
  const forwarded = req.headers["x-forwarded-host"];
  const forwardedValues = (
    Array.isArray(forwarded) ? forwarded : [forwarded]
  ).flatMap((value) => value?.split(",") ?? []);
  const candidate =
    forwarded === undefined
      ? req.headers.host
      : forwardedValues[forwardedValues.length - 1];
  const hostname = normalizeHost(candidate);
  return hostname !== undefined && allowedHosts.has(hostname)
    ? hostname
    : undefined;
}

export function clerkProxyMiddleware(
  options: ClerkProxyOptions = {},
): RequestHandler {
  // Only run proxy in production — Clerk proxying doesn't work for dev instances
  if (process.env.NODE_ENV !== "production") {
    return (_req, _res, next) => next();
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return (_req, _res, next) => next();
  }

  const allowedHosts = buildAllowedHosts();
  const target = options.target ?? CLERK_FAPI;
  const proxyTimeoutMs = options.proxyTimeoutMs ?? CLERK_PROXY_TIMEOUT_MS;
  const maxBufferedResponseBytes =
    options.maxBufferedResponseBytes ?? CLERK_MAX_BUFFERED_RESPONSE_BYTES;
  const timedOutRequests = new WeakSet<Request>();
  const handledFailures = new WeakSet<Request>();

  return createProxyMiddleware<Request, Response>({
    target,
    changeOrigin: true,
    proxyTimeout: proxyTimeoutMs,
    // Take over the response so it can be re-sent with a Content-Length (see
    // proxyRes); the deployment edge rejects chunked proxied responses.
    selfHandleResponse: true,
    pathRewrite: (path: string) =>
      path.replace(new RegExp(`^${CLERK_PROXY_PATH}`), ""),
    on: {
      proxyReq: (proxyReq, req) => {
        // httpxy emits this before surfacing the ECONNRESET caused by its
        // bounded proxyTimeout, allowing the error handler to return 504.
        proxyReq.once("timeout", () => timedOutRequests.add(req));

        // Scheme is pinned: x-forwarded-proto is client-writable in the same
        // appended-header scenario P1-8 fixed, and the proxy only runs behind
        // TLS — never derive a handshake URL scheme from a request header.
        const protocol = "https";
        const host = getClerkProxyHost(req, allowedHosts);

        // Never preserve client-supplied Clerk control headers. Rebuild the
        // public proxy URL only from the allowlisted hostname below.
        proxyReq.removeHeader("Clerk-Proxy-Url");
        proxyReq.removeHeader("Clerk-Secret-Key");

        // Guard the unknown/empty-host case: never advertise a proxy URL
        // built from an untrusted or missing host — Clerk would redirect
        // browser handshakes to it.
        if (host) {
          proxyReq.setHeader(
            "Clerk-Proxy-Url",
            `${protocol}://${host}${CLERK_PROXY_PATH}`,
          );
        }
        proxyReq.setHeader("Clerk-Secret-Key", secretKey);
        forwardTrustedClientIp(proxyReq, req);
      },
      // Clerk's dynamic Frontend API responses (/v1/environment, /v1/client,
      // JWKS, ...) arrive without a Content-Length, so relaying them would use
      // Transfer-Encoding: chunked — which the deployment edge (Cloud Run)
      // rejects, turning the app's 200 into a 500. Buffer only those so they can
      // be re-sent with a Content-Length; the body is forwarded untouched so
      // Content-Encoding is preserved. Length-known responses (e.g. /npm/*
      // assets) and body-less responses stream through without buffering.
      proxyRes: (proxyRes, req, res) => {
        const headers = { ...proxyRes.headers };
        // Transfer-Encoding/Connection are hop-by-hop (RFC 7230 §6.1).
        delete headers["transfer-encoding"];
        delete headers["connection"];
        delete headers["keep-alive"];

        const status = proxyRes.statusCode ?? 502;
        // Content-Length is forbidden on 1xx/204; HEAD/304 may keep theirs.
        if (status < 200 || status === 204) {
          delete headers["content-length"];
        }

        const bodyless =
          req.method === "HEAD" ||
          status < 200 ||
          status === 204 ||
          status === 304;
        if (headers["content-length"] !== undefined || bodyless) {
          res.writeHead(status, headers);
          // Headers are already sent, so abort the response if the upstream
          // stream errors mid-pipe (e.g. ECONNRESET) rather than leaving an
          // unhandled 'error' or a hung client.
          proxyRes.on("error", () => res.destroy());
          proxyRes.pipe(res);
          return;
        }

        const chunks: Buffer[] = [];
        let bufferedBytes = 0;
        let overflowed = false;
        proxyRes.on("data", (chunk: Buffer) => {
          if (overflowed) return;
          bufferedBytes += chunk.length;
          if (bufferedBytes <= maxBufferedResponseBytes) {
            chunks.push(chunk);
            return;
          }

          overflowed = true;
          chunks.length = 0;
          handledFailures.add(req);
          sendProxyFailure(req, res, 502);
          // End the downstream response first, then abort the oversized
          // upstream. No partial Clerk payload is ever relayed.
          res.once("finish", () => proxyRes.destroy());
        });
        proxyRes.on("end", () => {
          if (overflowed) return;
          const body = Buffer.concat(chunks);
          headers["content-length"] = String(body.length);
          res.writeHead(status, headers);
          res.end(body);
        });
        proxyRes.on("error", () => {
          if (handledFailures.has(req)) return;
          handledFailures.add(req);
          sendProxyFailure(req, res, timedOutRequests.has(req) ? 504 : 502);
        });
      },
      error: (_error, req, response) => {
        if (handledFailures.has(req)) return;
        handledFailures.add(req);
        if (!isServerResponse(response)) {
          response.destroy();
          return;
        }
        sendProxyFailure(req, response, timedOutRequests.has(req) ? 504 : 502);
      },
    },
  }) as RequestHandler;
}
