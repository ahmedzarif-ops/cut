import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import http from "node:http";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
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
