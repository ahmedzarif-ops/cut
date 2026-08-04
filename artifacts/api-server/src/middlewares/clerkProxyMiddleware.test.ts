/**
 * getClerkProxyHost feeds publishableKeyFromHost (whose own docs require an
 * allowlist) and the Clerk-Proxy-Url header, so it must never return a host
 * the deployment doesn't own. x-forwarded-host is client-writable: when an
 * upstream APPENDS rather than replaces, the leftmost value is whatever the
 * client sent. These tests lock the allowlist contract (P1-8).
 */
import express, { type Express } from "express";
import http, { type RequestListener, type Server } from "node:http";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
  getTrustedClientIp,
} from "./clerkProxyMiddleware";

const ALLOWED = new Set(["cut.example.com", "dev.replit.dev"]);
const upstreamServers: Server[] = [];

function req(headers: Record<string, string | string[] | undefined>) {
  return { headers };
}

afterEach(async () => {
  delete process.env.NODE_ENV;
  delete process.env.CLERK_SECRET_KEY;
  delete process.env.CORS_ALLOWED_ORIGINS;
  await Promise.all(
    upstreamServers
      .splice(0)
      .map(
        (server) =>
          new Promise<void>((resolve) => server.close(() => resolve())),
      ),
  );
});

async function listenUpstream(listener: RequestListener): Promise<string> {
  const server = http.createServer(listener);
  upstreamServers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected an IP test server address");
  }
  return `http://127.0.0.1:${address.port}`;
}

function proxyApp(
  target: string,
  options: {
    trustProxy?: number | boolean;
    proxyTimeoutMs?: number;
    maxBufferedResponseBytes?: number;
  } = {},
): Express {
  process.env.NODE_ENV = "production";
  process.env.CLERK_SECRET_KEY = "sk_test_proxy-hardening";
  process.env.CORS_ALLOWED_ORIGINS = "https://cut.example.com";

  const app = express();
  app.set("trust proxy", options.trustProxy ?? 1);
  app.use(
    CLERK_PROXY_PATH,
    clerkProxyMiddleware({
      target,
      proxyTimeoutMs: options.proxyTimeoutMs,
      maxBufferedResponseBytes: options.maxBufferedResponseBytes,
    }),
  );
  return app;
}

describe("getClerkProxyHost", () => {
  it("accepts an allowlisted x-forwarded-host", () => {
    const host = getClerkProxyHost(
      req({ "x-forwarded-host": "cut.example.com", host: "10.0.0.5:3000" }),
      ALLOWED,
    );
    expect(host).toBe("cut.example.com");
  });

  it("skips a spoofed leftmost value and takes the trusted appended host", () => {
    // Client sent x-forwarded-host: evil.example; the edge appended the real
    // host instead of replacing. The spoofed leftmost value must lose.
    const host = getClerkProxyHost(
      req({ "x-forwarded-host": "evil.example, cut.example.com" }),
      ALLOWED,
    );
    expect(host).toBe("cut.example.com");
  });

  it("does not let an allowlisted spoofed leftmost host override the edge host", () => {
    const host = getClerkProxyHost(
      req({
        "x-forwarded-host": "cut.example.com, dev.replit.dev",
        host: "10.0.0.5:3000",
      }),
      ALLOWED,
    );
    expect(host).toBe("dev.replit.dev");
  });

  it("fails closed instead of falling back when the edge-owned host is invalid", () => {
    const host = getClerkProxyHost(
      req({
        "x-forwarded-host": "cut.example.com, evil.example",
        host: "cut.example.com",
      }),
      ALLOWED,
    );
    expect(host).toBeUndefined();
  });

  it("rejects a spoofed x-forwarded-host with no allowlisted value", () => {
    const host = getClerkProxyHost(
      req({ "x-forwarded-host": "evil.example", host: "also-evil.example" }),
      ALLOWED,
    );
    expect(host).toBeUndefined();
  });

  it("handles the string[] header shape", () => {
    const host = getClerkProxyHost(
      req({ "x-forwarded-host": ["evil.example", "dev.replit.dev"] }),
      ALLOWED,
    );
    expect(host).toBe("dev.replit.dev");
  });

  it("falls back to an allowlisted Host header when x-forwarded-host is absent", () => {
    const host = getClerkProxyHost(req({ host: "cut.example.com" }), ALLOWED);
    expect(host).toBe("cut.example.com");
  });

  it("rejects a non-allowlisted Host header", () => {
    const host = getClerkProxyHost(req({ host: "evil.example" }), ALLOWED);
    expect(host).toBeUndefined();
  });

  it("returns undefined when no host headers are present at all", () => {
    expect(getClerkProxyHost(req({}), ALLOWED)).toBeUndefined();
    expect(
      getClerkProxyHost(req({ "x-forwarded-host": "", host: "" }), ALLOWED),
    ).toBeUndefined();
  });

  it("returns undefined for everything when the allowlist is empty", () => {
    const host = getClerkProxyHost(
      req({ "x-forwarded-host": "cut.example.com", host: "cut.example.com" }),
      new Set<string>(),
    );
    expect(host).toBeUndefined();
  });

  it("matches case-insensitively and ignores the port", () => {
    const host = getClerkProxyHost(
      req({ "x-forwarded-host": "CUT.Example.com:443" }),
      ALLOWED,
    );
    expect(host).toBe("cut.example.com");
  });
});

describe("getTrustedClientIp", () => {
  const appWithTrustProxy = express();
  appWithTrustProxy.set("trust proxy", 1);

  it("accepts only the one Express-selected edge-forwarded address", () => {
    expect(
      getTrustedClientIp({
        app: appWithTrustProxy,
        ip: "198.51.100.44",
        ips: ["198.51.100.44"],
      }),
    ).toBe("198.51.100.44");
  });

  it("rejects the socket address when no forwarded address exists", () => {
    expect(
      getTrustedClientIp({
        app: appWithTrustProxy,
        ip: "127.0.0.1",
        ips: [],
      }),
    ).toBeUndefined();
  });

  it("rejects ambiguous or mismatched Express forwarding results", () => {
    expect(
      getTrustedClientIp({
        app: appWithTrustProxy,
        ip: "198.51.100.44",
        ips: ["203.0.113.99", "198.51.100.44"],
      }),
    ).toBeUndefined();
    expect(
      getTrustedClientIp({
        app: appWithTrustProxy,
        ip: "198.51.100.44",
        ips: ["203.0.113.99"],
      }),
    ).toBeUndefined();
  });
});

describe("clerkProxyMiddleware transport hardening", () => {
  it("forwards only Express's one-hop client IP, not a spoofed leftmost chain", async () => {
    let receivedForwardedFor: string | string[] | undefined;
    let receivedForwarded: string | string[] | undefined;
    let receivedForwardedHost: string | string[] | undefined;
    let receivedForwardedProto: string | string[] | undefined;
    let receivedRealIp: string | string[] | undefined;
    let receivedClerkProxyUrl: string | string[] | undefined;
    const target = await listenUpstream((upstreamReq, upstreamRes) => {
      receivedForwardedFor = upstreamReq.headers["x-forwarded-for"];
      receivedForwarded = upstreamReq.headers.forwarded;
      receivedForwardedHost = upstreamReq.headers["x-forwarded-host"];
      receivedForwardedProto = upstreamReq.headers["x-forwarded-proto"];
      receivedRealIp = upstreamReq.headers["x-real-ip"];
      receivedClerkProxyUrl = upstreamReq.headers["clerk-proxy-url"];
      upstreamRes.writeHead(200, { "content-type": "application/json" });
      upstreamRes.write('{"ok":');
      upstreamRes.end("true}");
    });
    const app = proxyApp(target);

    const response = await request(app)
      .get(`${CLERK_PROXY_PATH}/v1/environment`)
      .set({
        host: "cut.example.com",
        "clerk-proxy-url": "https://attacker.invalid/api/__clerk",
        forwarded: "for=203.0.113.99",
        "x-real-ip": "203.0.113.99",
        "x-forwarded-for": "203.0.113.99, 198.51.100.44",
        "x-forwarded-host": "attacker.invalid, cut.example.com",
        "x-forwarded-proto": "javascript",
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(response.headers["content-length"]).toBe("11");
    expect(receivedForwardedFor).toBe("198.51.100.44");
    expect(receivedForwarded).toBeUndefined();
    expect(receivedForwardedHost).toBeUndefined();
    expect(receivedForwardedProto).toBeUndefined();
    expect(receivedRealIp).toBeUndefined();
    expect(receivedClerkProxyUrl).toBe("https://cut.example.com/api/__clerk");
  });

  it.each([undefined, ""])(
    "omits X-Forwarded-For when the incoming edge value is absent or empty",
    async (forwardedFor) => {
      let receivedForwardedFor: string | string[] | undefined;
      const target = await listenUpstream((upstreamReq, upstreamRes) => {
        receivedForwardedFor = upstreamReq.headers["x-forwarded-for"];
        upstreamRes.end("ok");
      });
      const app = proxyApp(target);
      const client = request(app)
        .get(`${CLERK_PROXY_PATH}/v1/proxy-health`)
        .set({ host: "cut.example.com" });
      if (forwardedFor !== undefined) {
        client.set("x-forwarded-for", forwardedFor);
      }

      const response = await client;

      expect(response.status).toBe(200);
      expect(receivedForwardedFor).toBeUndefined();
    },
  );

  it("drops a client-supplied Clerk proxy URL when no public host is allowlisted", async () => {
    let receivedClerkProxyUrl: string | string[] | undefined;
    const target = await listenUpstream((upstreamReq, upstreamRes) => {
      receivedClerkProxyUrl = upstreamReq.headers["clerk-proxy-url"];
      upstreamRes.end("ok");
    });
    const app = proxyApp(target);

    const response = await request(app)
      .get(`${CLERK_PROXY_PATH}/v1/environment`)
      .set({
        host: "attacker.invalid",
        "clerk-proxy-url": "https://attacker.invalid/api/__clerk",
      });

    expect(response.status).toBe(200);
    expect(receivedClerkProxyUrl).toBeUndefined();
  });

  it.each([
    [true, "203.0.113.10"],
    [1, "203.0.113.10, not-an-ip"],
  ])(
    "removes client IP headers when trust topology or the derived IP is unsafe",
    async (trustProxy, forwardedFor) => {
      let receivedForwardedFor: string | string[] | undefined;
      const target = await listenUpstream((upstreamReq, upstreamRes) => {
        receivedForwardedFor = upstreamReq.headers["x-forwarded-for"];
        upstreamRes.end("ok");
      });
      const app = proxyApp(target, { trustProxy });

      const response = await request(app)
        .get(`${CLERK_PROXY_PATH}/v1/environment`)
        .set({
          host: "cut.example.com",
          "x-forwarded-for": forwardedFor,
        });

      expect(response.status).toBe(200);
      expect(receivedForwardedFor).toBeUndefined();
    },
  );

  it("returns 502 without relaying a partial body when a chunked response exceeds the buffer ceiling", async () => {
    const target = await listenUpstream((_upstreamReq, upstreamRes) => {
      upstreamRes.write("x".repeat(40));
      upstreamRes.end("y".repeat(40));
    });
    const app = proxyApp(target, { maxBufferedResponseBytes: 32 });

    const response = await request(app)
      .get(`${CLERK_PROXY_PATH}/v1/environment`)
      .set({ host: "cut.example.com" });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      error: "Authentication service unavailable",
    });
    expect(response.text).not.toContain("x");
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("returns a bounded 504 when the Clerk upstream does not respond", async () => {
    const target = await listenUpstream(() => {
      // Intentionally leave the response open until the proxy aborts it.
    });
    const app = proxyApp(target, { proxyTimeoutMs: 25 });

    const response = await request(app)
      .get(`${CLERK_PROXY_PATH}/v1/environment`)
      .set({ host: "cut.example.com" });

    expect(response.status).toBe(504);
    expect(response.body).toEqual({
      error: "Authentication service unavailable",
    });
  });

  it("returns 504 without relaying a buffered partial body when the upstream times out after headers", async () => {
    const target = await listenUpstream((_upstreamReq, upstreamRes) => {
      upstreamRes.writeHead(200, { "content-type": "application/json" });
      upstreamRes.write('{"partial":"do-not-relay"');
      // Intentionally leave this chunked response open until proxyTimeout.
    });
    const app = proxyApp(target, { proxyTimeoutMs: 25 });

    const response = await request(app)
      .get(`${CLERK_PROXY_PATH}/v1/environment`)
      .set({ host: "cut.example.com" });

    expect(response.status).toBe(504);
    expect(response.body).toEqual({
      error: "Authentication service unavailable",
    });
    expect(response.text).not.toContain("do-not-relay");
  });
});
