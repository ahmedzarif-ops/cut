import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import http from "node:http";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  clerkProxyHealthUrl,
  DeployVerificationError,
  evaluateSurface,
  hasAnchor,
  hasNoindex,
  inSitemap,
  isDisallowed,
  redactUrlForOutput,
  selfCanonical,
  verifyUrl,
} from "./deploy-verify.mjs";
import {
  EasSubmitConfigurationError,
  validateEasSubmitConfig,
} from "./eas-submit-config-verify.mjs";

async function withServer(handler, callback) {
  const server = http.createServer(handler);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  try {
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

test("redacts sensitive URL components and control characters from output", () => {
  assert.equal(
    redactUrlForOutput(
      "https://operator:password@example.com/path?token=secret#fragment",
    ),
    "https://example.com/path",
  );
  assert.equal(
    redactUrlForOutput("https://example.com/safe\nforged?token=secret"),
    "https://example.com/safeforged",
  );
  const malformed =
    "https://operator:password@[]/private?token=secret#fragment";
  const malformedLabel = redactUrlForOutput(malformed);
  assert.equal(malformedLabel, "[invalid-url]");
  assert.doesNotMatch(malformedLabel, /operator|password|token|secret/u);
  assert.equal(
    hasAnchor('<div id="literal[anchor"></div>', "literal[anchor"),
    true,
  );
});

test("evaluates liveness, readiness, and unauthenticated auth guards", () => {
  const ready = evaluateSurface({
    surfaceType: "json-readiness",
    status: 200,
    headers: new Headers({
      "cache-control": "private, no-store",
      "content-type": "application/json; charset=utf-8",
    }),
    body: JSON.stringify({ status: "ok" }),
  });
  assert.equal(ready.allPass, true);

  const authGuard = evaluateSurface({
    surfaceType: "auth-guard",
    status: 401,
    headers: new Headers({ "content-type": "application/json" }),
  });
  assert.equal(authGuard.allPass, true);
});

test("public indexing checks require exact canonical and sitemap URLs", () => {
  assert.equal(
    selfCanonical(
      '<link href="https://example.com/privacy" rel="alternate canonical">',
      "https://example.com/privacy",
    ),
    true,
  );
  assert.equal(
    selfCanonical(
      '<link rel="canonical" href="https://example.com/privacy-malicious">',
      "https://example.com/privacy",
    ),
    false,
  );
  assert.equal(
    selfCanonical(
      '<link rel="canonical" href="https://example.com/privacy"><link rel="canonical" href="https://example.com/other">',
      "https://example.com/privacy",
    ),
    false,
  );

  const sitemap =
    '<?xml version="1.0"?><urlset><url><loc>https://example.com/privacy-old</loc></url><url><loc>https://example.com/privacy</loc></url></urlset>';
  assert.equal(inSitemap(sitemap, "https://example.com/privacy"), true);
  assert.equal(inSitemap(sitemap, "https://example.com/priv"), false);
  assert.equal(
    inSitemap(
      "<sitemapindex><sitemap><loc>https://example.com/privacy</loc></sitemap></sitemapindex>",
      "https://example.com/privacy",
    ),
    false,
  );
});

test("noindex and robots checks require exact wildcard-agent directives", () => {
  assert.equal(
    hasNoindex(new Headers({ "x-robots-tag": "noindex, nofollow" })),
    true,
  );
  assert.equal(
    hasNoindex(new Headers({ "x-robots-tag": "noindexing, nofollow" })),
    false,
  );

  const unrelatedAgent = [
    "User-agent: BadBot",
    "Disallow: /internal",
    "",
    "User-agent: *",
    "Allow: /",
  ].join("\n");
  assert.equal(isDisallowed(unrelatedAgent, "/internal"), false);

  const wildcardAgent = [
    "User-agent: *",
    "Disallow: /internal",
    "Allow: /internal/public",
  ].join("\n");
  assert.equal(isDisallowed(wildcardAgent, "/internal/private"), true);
  assert.equal(isDisallowed(wildcardAgent, "/internal/public/page"), false);
});

test("public and internal surface evaluation rejects substring false positives", () => {
  const publicResult = evaluateSurface({
    surfaceType: "public-indexed",
    status: 200,
    headers: new Headers(),
    body: '<link rel="canonical" href="https://example.com/privacy-malicious">',
    sitemapXml:
      "<urlset><url><loc>https://example.com/privacy-old</loc></url></urlset>",
    expect: {
      url: "https://example.com/privacy",
      path: "/privacy",
    },
  });
  assert.equal(publicResult.allPass, false);
  assert.equal(publicResult.checks[1].pass, false);
  assert.equal(publicResult.checks[2].pass, false);

  const internalResult = evaluateSurface({
    surfaceType: "internal",
    status: 200,
    headers: new Headers({ "x-robots-tag": "noindexing" }),
    robotsTxt: "User-agent: BadBot\nDisallow: /internal",
    expect: {
      url: "https://example.com/internal",
      path: "/internal",
    },
  });
  assert.equal(internalResult.allPass, false);
  assert.equal(internalResult.checks[1].pass, false);
  assert.equal(internalResult.checks[2].pass, false);
});

test("verifies a live JSON readiness endpoint", async () => {
  await withServer(
    (_request, response) => {
      response.writeHead(200, {
        "cache-control": "no-store",
        "content-type": "application/json; charset=utf-8",
      });
      response.end(JSON.stringify({ status: "ok" }));
    },
    async (origin) => {
      const result = await verifyUrl(
        `${origin}/api/readyz?probe=not-logged`,
        "json-readiness",
        {},
        { allowLocalHttp: true },
      );
      assert.equal(result.allPass, true);
    },
  );
});

test("verifies the CUT production root and blocked Expo preview artifacts", async () => {
  await withServer(
    (request, response) => {
      if (request.url === "/cut/") {
        response.writeHead(200, {
          "content-type": "text/html; charset=utf-8",
          "content-security-policy": "default-src 'none'; script-src 'none'",
        });
        response.end(`<!doctype html><html><head>
          <link rel="canonical" href="PUBLIC_ORIGIN/cut/" />
        </head><body data-app-surface="production"><h1>CUT</h1></body></html>`);
        return;
      }
      response.writeHead(404, { "content-type": "text/plain" });
      response.end("Not Found");
    },
    async (origin) => {
      const result = await verifyUrl(
        `${origin}/cut/`,
        "cut-public-root",
        {},
        {
          allowLocalHttp: true,
          fetchImpl: async (target, options) => {
            const response = await fetch(target, options);
            if (new URL(target).pathname !== "/cut/") return response;
            const body = (await response.text()).replace(
              "PUBLIC_ORIGIN",
              origin,
            );
            return new Response(body, {
              status: response.status,
              headers: response.headers,
            });
          },
        },
      );
      assert.equal(result.allPass, true);
      assert.equal(result.checks.length, 14);
    },
  );
});

test("CUT production-root verification checks origin and mounted preview artifacts", async () => {
  await withServer(
    (request, response) => {
      if (request.url === "/cut/") {
        response.writeHead(200, {
          "content-type": "text/html; charset=utf-8",
          "content-security-policy": "default-src 'none'; script-src 'none'",
        });
        response.end(`<!doctype html><html><head>
          <link rel="canonical" href="PUBLIC_ORIGIN/cut/" />
        </head><body data-app-surface="production"><h1>CUT</h1></body></html>`);
        return;
      }
      if (request.url === "/manifest") {
        response.writeHead(200, { "content-type": "application/json" });
        response.end("{}");
        return;
      }
      response.writeHead(404, { "content-type": "text/plain" });
      response.end("Not Found");
    },
    async (origin) => {
      const result = await verifyUrl(
        `${origin}/cut/`,
        "cut-public-root",
        {},
        {
          allowLocalHttp: true,
          fetchImpl: async (target, options) => {
            const response = await fetch(target, options);
            if (new URL(target).pathname !== "/cut/") return response;
            const body = (await response.text()).replace(
              "PUBLIC_ORIGIN",
              origin,
            );
            return new Response(body, {
              status: response.status,
              headers: response.headers,
            });
          },
        },
      );
      assert.equal(result.allPass, false);
      assert.equal(
        result.checks.find(
          ({ name }) => name === "preview artifact blocked /manifest",
        ).pass,
        false,
      );
      assert.equal(
        result.checks.find(
          ({ name }) => name === "preview artifact blocked /cut/manifest",
        ).pass,
        true,
      );
    },
  );
});

test("CUT production-root verification rejects preview content", () => {
  const result = evaluateSurface({
    surfaceType: "cut-public-root",
    status: 200,
    headers: new Headers({
      "content-type": "text/html",
      "content-security-policy": "default-src 'none'; script-src 'none'",
    }),
    body: `<html><head><link rel="canonical" href="https://cut.example.com/" /></head>
      <body data-app-surface="production"><script>open("exps://cut.example.com")</script>
      Open in Expo Go</body></html>`,
    expect: { url: "https://cut.example.com/" },
  });
  assert.equal(result.allPass, false);
  assert.equal(
    result.checks.find(({ name }) => name === "zero JavaScript").pass,
    false,
  );
  assert.equal(
    result.checks.find(({ name }) => name === "no Expo Go copy").pass,
    false,
  );
  assert.equal(
    result.checks.find(({ name }) => name === "no Expo deep link").pass,
    false,
  );
});

test("CUT production-root verification rejects event handlers and JavaScript URLs", () => {
  const result = evaluateSurface({
    surfaceType: "cut-public-root",
    status: 200,
    headers: new Headers({
      "content-type": "text/html",
      "content-security-policy": "default-src 'none'; script-src 'none'",
    }),
    body: `<html><head><link rel="canonical" href="https://cut.example.com/" /></head>
      <body data-app-surface="production" onload="start()">
      <a href="javascript:start()">Start</a></body></html>`,
    expect: { url: "https://cut.example.com/" },
  });
  assert.equal(result.allPass, false);
  assert.equal(
    result.checks.find(({ name }) => name === "zero JavaScript").pass,
    false,
  );
});

test("builds only the canonical CUT Clerk proxy-health target", () => {
  assert.equal(
    clerkProxyHealthUrl("https://api.example.com/api/__clerk", "dmn_live_123")
      .href,
    "https://api.example.com/api/__clerk/v1/proxy-health?domain_id=dmn_live_123",
  );

  for (const invalidTarget of [
    "https://api.example.com/not-clerk",
    "https://api.example.com/api/__clerk/",
    "https://api.example.com/api/__clerk?token=do-not-send",
    "https://api.example.com/api/__clerk#fragment",
  ]) {
    assert.throws(
      () => clerkProxyHealthUrl(invalidTarget, "dmn_live_123"),
      (error) => {
        assert.ok(error instanceof DeployVerificationError);
        assert.equal(error.code, "invalid_clerk_proxy_health_target");
        assert.doesNotMatch(error.message, /do-not-send|token=/u);
        return true;
      },
    );
  }
});

test("verifies Clerk proxy health without returning the echoed client IP", async () => {
  await withServer(
    (request, response) => {
      assert.equal(
        request.url,
        "/api/__clerk/v1/proxy-health?domain_id=dmn_live_123",
      );
      response.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
      });
      response.end(
        JSON.stringify({
          status: "healthy",
          x_forwarded_for: "198.51.100.24",
        }),
      );
    },
    async (origin) => {
      const result = await verifyUrl(
        `${origin}/api/__clerk`,
        "clerk-proxy-health",
        { clerkDomainId: "dmn_live_123" },
        { allowLocalHttp: true },
      );
      assert.equal(result.allPass, true);
      assert.doesNotMatch(JSON.stringify(result), /198\.51\.100\.24/u);
    },
  );
});

test("Clerk proxy health fails closed on unhealthy or incomplete bodies", () => {
  for (const body of [
    JSON.stringify({ status: "unhealthy", x_forwarded_for: "198.51.100.24" }),
    JSON.stringify({ status: "healthy" }),
    "not-json",
  ]) {
    const result = evaluateSurface({
      surfaceType: "clerk-proxy-health",
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      body,
      expect: { clerkDomainId: "dmn_live_123" },
    });
    assert.equal(result.allPass, false);
    assert.doesNotMatch(JSON.stringify(result), /198\.51\.100\.24/u);
  }
});

test("Clerk proxy health keeps its response below the fixed safety ceiling", async () => {
  await withServer(
    (_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end("x".repeat(20_000));
    },
    async (origin) => {
      await assert.rejects(
        verifyUrl(
          `${origin}/api/__clerk`,
          "clerk-proxy-health",
          { clerkDomainId: "dmn_live_123" },
          { allowLocalHttp: true, maxResponseBytes: 1_000_000 },
        ),
        (error) => {
          assert.ok(error instanceof DeployVerificationError);
          assert.equal(error.code, "response_too_large");
          return true;
        },
      );
    },
  );
});

test("EAS submit routing requires a pinned numeric App Store Connect app ID", () => {
  for (const config of [
    {},
    { submit: { production: {} } },
    { submit: { production: { ios: {} } } },
    { submit: { production: { ios: { ascAppId: 1234567890 } } } },
    { submit: { production: { ios: { ascAppId: "placeholder" } } } },
    { submit: { production: { ios: { ascAppId: "0123456789" } } } },
  ]) {
    assert.throws(
      () => validateEasSubmitConfig(config),
      (error) => {
        assert.ok(error instanceof EasSubmitConfigurationError);
        assert.equal(error.code, "production_ios_asc_app_id_not_pinned");
        return true;
      },
    );
  }

  assert.equal(
    validateEasSubmitConfig({
      submit: { production: { ios: { ascAppId: "1234567890" } } },
    }),
    true,
  );
});

test("requires HTTPS unless explicit local HTTP targets loopback", async () => {
  await assert.rejects(
    verifyUrl("http://127.0.0.1:12345/api/healthz", "json-health"),
    (error) => {
      assert.ok(error instanceof DeployVerificationError);
      assert.equal(error.code, "https_required");
      return true;
    },
  );
  await assert.rejects(
    verifyUrl(
      "http://example.com/api/healthz",
      "json-health",
      {},
      { allowLocalHttp: true },
    ),
    (error) => {
      assert.ok(error instanceof DeployVerificationError);
      assert.equal(error.code, "local_http_requires_loopback");
      return true;
    },
  );
});

test("fails with a stable timeout code without exposing the target URL", async () => {
  await withServer(
    (_request, _response) => {
      // Intentionally leave the response open until the verifier aborts it.
    },
    async (origin) => {
      await assert.rejects(
        verifyUrl(
          `${origin}/slow?token=do-not-log`,
          "json-health",
          {},
          {
            timeoutMs: 25,
            allowLocalHttp: true,
          },
        ),
        (error) => {
          assert.ok(error instanceof DeployVerificationError);
          assert.equal(error.code, "request_timeout");
          assert.doesNotMatch(error.message, /do-not-log|token=/u);
          return true;
        },
      );
    },
  );
});

test("stops reading a response after the configured byte limit", async () => {
  await withServer(
    (_request, response) => {
      response.writeHead(200, { "content-type": "text/plain" });
      response.end("response body larger than the test limit");
    },
    async (origin) => {
      await assert.rejects(
        verifyUrl(
          `${origin}/large`,
          "public-indexed",
          {},
          {
            maxResponseBytes: 8,
            allowLocalHttp: true,
          },
        ),
        (error) => {
          assert.ok(error instanceof DeployVerificationError);
          assert.equal(error.code, "response_too_large");
          return true;
        },
      );
    },
  );
});

test("rejects credentials in target URLs before making a request", async () => {
  await assert.rejects(
    verifyUrl("https://user:password@example.com/api/healthz", "json-health"),
    (error) => {
      assert.ok(error instanceof DeployVerificationError);
      assert.equal(error.code, "url_credentials_not_allowed");
      assert.doesNotMatch(error.message, /user|password|example\.com/u);
      return true;
    },
  );
});

test("CLI failures emit only a stable code, never sensitive URL parts", () => {
  const script = fileURLToPath(new URL("./deploy-verify.mjs", import.meta.url));
  const result = spawnSync(
    process.execPath,
    [
      script,
      "https://operator:password@example.com/api/healthz?token=do-not-log",
      "json-health",
    ],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /url_credentials_not_allowed/u);
  assert.doesNotMatch(
    `${result.stdout}${result.stderr}`,
    /operator|password|example\.com|token=|do-not-log/u,
  );
});

test("requires complete CLI option values", () => {
  const script = fileURLToPath(new URL("./deploy-verify.mjs", import.meta.url));
  const result = spawnSync(
    process.execPath,
    [script, "https://example.com", "public-indexed", "--anchor"],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /missing_option_value/u);
});

test("CLI local HTTP flag never permits a non-loopback host", () => {
  const script = fileURLToPath(new URL("./deploy-verify.mjs", import.meta.url));
  const result = spawnSync(
    process.execPath,
    [
      script,
      "http://example.com/api/healthz",
      "json-health",
      "--allow-local-http",
    ],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /local_http_requires_loopback/u);
});

test("caps repeated checks before any network request", async () => {
  await assert.rejects(
    verifyUrl("https://example.com", "public-indexed", {
      images: Array.from({ length: 21 }, (_, index) => `/image-${index}.png`),
    }),
    (error) => {
      assert.ok(error instanceof DeployVerificationError);
      assert.equal(error.code, "too_many_checks");
      return true;
    },
  );
});

test("requires an exact resolved redirect and redacts query details", () => {
  const result = evaluateSurface({
    surfaceType: "redirect",
    status: 302,
    headers: new Headers({
      location: "https://example.com/target?session=secret",
    }),
    expect: {
      url: "https://example.com/source",
      redirectStatus: 302,
      redirectTo: "/target?session=secret",
    },
  });
  assert.equal(result.allPass, true);
  assert.equal(result.checks[1].detail, "https://example.com/target");

  const substringOnly = evaluateSurface({
    surfaceType: "redirect",
    status: 302,
    headers: new Headers({ location: "/target-extra" }),
    expect: {
      url: "https://example.com/source",
      redirectStatus: 302,
      redirectTo: "/target",
    },
  });
  assert.equal(substringOnly.allPass, false);

  const malformedLocation = evaluateSurface({
    surfaceType: "redirect",
    status: 302,
    headers: new Headers({
      location:
        "https://redirect-user:redirect-password@[]/private?token=redirect-secret",
    }),
    expect: {
      url: "https://example.com/source",
      redirectStatus: 302,
      redirectTo: "/target",
    },
  });
  assert.equal(malformedLocation.allPass, false);
  assert.equal(malformedLocation.checks[1].detail, "[invalid-url]");
  assert.doesNotMatch(
    JSON.stringify(malformedLocation),
    /redirect-user|redirect-password|token=|redirect-secret/u,
  );

  assert.throws(
    () =>
      evaluateSurface({
        surfaceType: "redirect",
        status: 302,
        headers: new Headers({ location: "/target" }),
      }),
    (error) => {
      assert.ok(error instanceof DeployVerificationError);
      assert.equal(error.code, "invalid_redirect_expectation");
      return true;
    },
  );
});
