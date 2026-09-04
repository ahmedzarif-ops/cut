import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  createAppServer,
  parseBuildSha,
  parsePublicAppOrigin,
  parseServerPort,
  parseShutdownTimeoutMs,
} = require("./serve.js");
const {
  APPROVAL_SCOPE,
  buildResourceHashes,
  findBlockedReleaseCopy,
} = require("./legal-publication-gate.js");

const servers = [];
const temporaryDirectories = [];
const DEFAULT_PUBLIC_APP_ORIGIN = "https://preview.cutos.app";
const BUILD_SHA = "0123456789abcdef0123456789abcdef01234567";

async function createStaticRoot() {
  const root = await mkdtemp(join(tmpdir(), "cut-os-server-"));
  temporaryDirectories.push(root);
  await mkdir(join(root, "ios"), { recursive: true });
  await mkdir(join(root, "android"), { recursive: true });
  await writeFile(
    join(root, "ios", "manifest.json"),
    JSON.stringify({ platform: "ios" }),
  );
  await writeFile(
    join(root, "android", "manifest.json"),
    JSON.stringify({ platform: "android" }),
  );
  await writeFile(join(root, "asset.txt"), "static asset");
  return root;
}

function approvedLegalTemplate(
  route,
  label,
  extraCopy = "",
  canonicalUrl = `${DEFAULT_PUBLIC_APP_ORIGIN}${route}`,
) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${label} · APP_NAME_PLACEHOLDER</title>
    <link rel="canonical" href="${canonicalUrl}" />
    <link rel="stylesheet" href="LEGAL_BASE_PATH_PLACEHOLDER/legal.css" />
  </head>
  <body data-publication-status="approved" data-counsel-approved="true">
    <main id="main"><h1>${label}</h1><p>${extraCopy || "Approved public copy."}</p></main>
  </body>
</html>`;
}

async function createApprovedTemplateRoot(options = {}) {
  const root = await mkdtemp(join(tmpdir(), "cut-os-legal-templates-"));
  temporaryDirectories.push(root);
  const appName = options.appName ?? "CUT OS";
  const basePath = options.basePath ?? "";
  const publicAppOrigin = options.publicAppOrigin ?? DEFAULT_PUBLIC_APP_ORIGIN;
  const canonicalUrls = options.canonicalUrls ?? {};
  const canonicalUrl = (route) =>
    canonicalUrls[route] ?? `${publicAppOrigin}${basePath}${route}`;
  const legalCss = "body { color: #111; }\n";
  const legal = {
    "/privacy": approvedLegalTemplate(
      "/privacy",
      "Privacy Policy",
      options.privacyCopy,
      canonicalUrl("/privacy"),
    ),
    "/terms": approvedLegalTemplate(
      "/terms",
      "Terms of Use",
      "",
      canonicalUrl("/terms"),
    ),
    "/support": approvedLegalTemplate(
      "/support",
      "Support",
      "",
      canonicalUrl("/support"),
    ),
  };
  const templates = { legal, legalCss };
  const approvalRecord = {
    schemaVersion: 1,
    publicationStatus: "approved",
    approvalScope: APPROVAL_SCOPE,
    counselApproval: {
      approvedBy: "Qualified Counsel Name",
      approvedAt: "2026-08-03T12:00:00.000Z",
      evidenceReference: "LEGAL-APPROVAL-001",
    },
    rendering: { appName, basePath },
    sha256: buildResourceHashes(templates, appName, basePath),
  };

  await Promise.all([
    writeFile(join(root, "landing-page.html"), "<p>Landing</p>"),
    writeFile(join(root, "legal.css"), legalCss),
    ...Object.entries(legal).map(([route, html]) =>
      writeFile(join(root, `${route.slice(1)}.html`), html),
    ),
    writeFile(
      join(root, "legal-publication-approval.json"),
      JSON.stringify(approvalRecord, null, 2),
    ),
  ]);

  return { root, approvalRecord };
}

async function listen(options = {}) {
  const server = createAppServer({
    publicAppOrigin: DEFAULT_PUBLIC_APP_ORIGIN,
    previewMode: true,
    ...options,
  });
  servers.push(server);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  return { server, port: address.port };
}

function request(port, pathname, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path: pathname,
        method: options.method || "GET",
        headers: options.headers,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    req.once("error", reject);
    req.end();
  });
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise((resolve) => {
          server.close(() => resolve());
        }),
    ),
  );
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("CUT OS public server", () => {
  it("preserves the landing page, Expo manifest, and static asset routes", async () => {
    const staticRoot = await createStaticRoot();
    const { port } = await listen({ staticRoot, appName: "CUT OS" });

    const landing = await request(port, "/");
    expect(landing.status).toBe(200);
    expect(landing.body).toContain("CUT OS");
    expect(landing.body).toContain('href="exps://preview.cutos.app"');
    expect(landing.body).toContain(
      'const deepLink = "exps://preview.cutos.app";',
    );

    const manifest = await request(port, "/manifest", {
      headers: { "expo-platform": "ios" },
    });
    expect(manifest.status).toBe(200);
    expect(manifest.headers["expo-protocol-version"]).toBe("1");
    expect(JSON.parse(manifest.body)).toEqual({ platform: "ios" });

    const rootManifest = await request(port, "/", {
      headers: { "expo-platform": "android" },
    });
    expect(rootManifest.status).toBe(200);
    expect(JSON.parse(rootManifest.body)).toEqual({ platform: "android" });

    const asset = await request(port, "/asset.txt");
    expect(asset.status).toBe(200);
    expect(asset.body).toBe("static asset");
  });

  it("uses only the configured public origin when Host headers are appended or spoofed", async () => {
    const staticRoot = await createStaticRoot();
    const { port } = await listen({ staticRoot, appName: "CUT OS" });

    const response = await request(port, "/", {
      headers: {
        host: "attacker.invalid",
        "x-forwarded-host": "attacker.invalid, preview.cutos.app",
        "x-forwarded-proto": "javascript",
      },
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain('href="exps://preview.cutos.app"');
    expect(response.body).not.toContain("attacker.invalid");
    expect(response.body).not.toContain("javascript:");
  });

  it("serves the CUT launch surface and no Expo preview artifacts in production", async () => {
    const staticRoot = await createStaticRoot();
    const missingStaticRoot = join(staticRoot, "not-built-for-production");
    const { port } = await listen({
      staticRoot: missingStaticRoot,
      appName: "CUT OS",
      previewMode: false,
    });

    const landing = await request(port, "/", {
      headers: { "expo-platform": "ios" },
    });
    expect(landing.status).toBe(200);
    expect(landing.body).toContain('data-app-surface="production"');
    expect(landing.body).toContain("For adults age 18 and over");
    expect(landing.body).toContain(
      '<link rel="canonical" href="https://preview.cutos.app/"',
    );
    expect(landing.body).toContain('href="/privacy"');
    expect(landing.body).not.toContain("Expo Go");
    expect(landing.body).not.toContain("exps://");
    expect(landing.body).not.toMatch(/<script(?:\s|>)/iu);
    expect(landing.headers["content-security-policy"]).toContain(
      "script-src 'none'",
    );
    expect(landing.headers["x-robots-tag"]).toContain("noindex");

    const manifest = await request(port, "/manifest", {
      headers: { "expo-platform": "ios" },
    });
    const directManifest = await request(port, "/ios/manifest.json");
    const asset = await request(port, "/asset.txt");
    expect(manifest.status).toBe(404);
    expect(directManifest.status).toBe(404);
    expect(asset.status).toBe(404);
  });

  it("renders production links beneath the configured base path", async () => {
    const staticRoot = await createStaticRoot();
    const { port } = await listen({
      staticRoot,
      appName: "CUT OS",
      basePath: "/cut/",
      previewMode: false,
    });

    const landing = await request(port, "/cut/");
    expect(landing.status).toBe(200);
    expect(landing.body).toContain(
      '<link rel="canonical" href="https://preview.cutos.app/cut/"',
    );
    expect(landing.body).toContain('href="/cut/privacy"');
  });

  it("rejects every unprefixed public route when a base path is configured", async () => {
    const staticRoot = await createStaticRoot();
    const { port } = await listen({
      staticRoot,
      appName: "CUT OS",
      basePath: "/cut/",
      previewMode: false,
    });

    for (const route of [
      "/",
      "/privacy",
      "/status",
      "/legal.css",
      "/manifest",
      "/ios/manifest.json",
    ]) {
      const response = await request(port, route);
      expect(response.status).toBe(404);
      expect(response.headers["cache-control"]).toBe("no-store");
    }

    expect((await request(port, "/cut/")).status).toBe(200);
    expect((await request(port, "/cut/status")).status).toBe(200);
  });

  it("does not reflect script-shaped Host input and context-escapes the app name", async () => {
    const staticRoot = await createStaticRoot();
    const { port } = await listen({
      staticRoot,
      appName: '$&<img src=x onerror="alert(1)">',
    });

    const response = await request(port, "/", {
      headers: {
        host: "attacker.invalid",
        "x-forwarded-host": "</script><script>alert(1)</script>",
      },
    });

    expect(response.status).toBe(200);
    expect(response.body).not.toContain("</script><script>alert(1)</script>");
    expect(response.body).not.toContain('<img src=x onerror="alert(1)">');
    expect(response.body).toContain(
      "$&amp;&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
    );
  });

  it("adds a nonce-based landing-page CSP without allowing arbitrary inline script", async () => {
    const staticRoot = await createStaticRoot();
    const { port } = await listen({ staticRoot });
    const response = await request(port, "/");

    const nonce = response.body.match(/<style nonce="([^"]+)"/u)?.[1];
    expect(nonce).toBeTruthy();
    expect(response.body).toContain(`<script nonce="${nonce}"`);
    expect(response.body).toContain(
      'integrity="sha384-K7D1ZVqZVEPBKpQrjKR0/pDcFaWHQPzUBKNY5k8RRX5aGtd4WGHXEnO0qso4YowQ"',
    );
    expect(response.body).toContain('crossorigin="anonymous"');
    expect(response.headers["content-security-policy"]).toContain(
      `script-src 'nonce-${nonce}'`,
    );
    expect(response.headers["content-security-policy"]).not.toContain(
      "https://unpkg.com",
    );
    expect(response.headers["content-security-policy"]).toContain(
      `style-src 'nonce-${nonce}'`,
    );
    expect(response.headers["content-security-policy"]).not.toContain(
      "'unsafe-inline'",
    );
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });

  it.each([
    "",
    "http://preview.cutos.app",
    "https://localhost",
    "https://127.0.0.1",
    "https://preview.example",
    "https://preview.cutos.app/path",
    "https://user@preview.cutos.app",
    "https://preview.cutos.app:8443",
    "https://preview.cutos.app?next=evil",
  ])("rejects an unsafe configured public origin: %s", async (origin) => {
    const staticRoot = await createStaticRoot();
    expect(() =>
      createAppServer({ staticRoot, publicAppOrigin: origin }),
    ).toThrow(/PUBLIC_APP_ORIGIN/u);
  });

  it.each(["", "0", "65536", "3000.5", " 3000", "3000 ", "abc"])(
    "rejects an invalid public-server port: %s",
    (port) => {
      expect(() => parseServerPort(port)).toThrow(/PORT/u);
    },
  );

  it("accepts only bounded server ports and shutdown timeouts", () => {
    expect(parseServerPort(undefined)).toBe(3000);
    expect(parseServerPort("1")).toBe(1);
    expect(parseServerPort("65535")).toBe(65_535);
    expect(parseShutdownTimeoutMs(undefined)).toBe(10_000);
    expect(parseShutdownTimeoutMs("1")).toBe(1);
    expect(parseShutdownTimeoutMs("60000")).toBe(60_000);
    for (const value of ["", "0", "60001", "1.5", " 1000", "1000 ", "nope"]) {
      expect(() => parseShutdownTimeoutMs(value)).toThrow(
        /SHUTDOWN_TIMEOUT_MS/u,
      );
    }
  });

  it("rejects a missing public origin instead of deriving one from the request", async () => {
    const staticRoot = await createStaticRoot();
    expect(() => parsePublicAppOrigin(undefined)).toThrow(/PUBLIC_APP_ORIGIN/u);
    expect(() => createAppServer({ staticRoot, publicAppOrigin: "" })).toThrow(
      /PUBLIC_APP_ORIGIN/u,
    );
  });

  it("requires static assets only for preview while templates gate every mode", async () => {
    const staticRoot = await createStaticRoot();
    const { port } = await listen({ staticRoot, appName: "CUT OS" });

    const status = await request(port, "/status");
    expect(status.status).toBe(200);
    expect(status.headers["cache-control"]).toBe("no-store");
    expect(status.headers["content-type"]).toContain("application/json");
    expect(status.headers["x-content-type-options"]).toBe("nosniff");
    expect(JSON.parse(status.body)).toEqual({ status: "ok" });

    const head = await request(port, "/status", { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(head.body).toBe("");

    expect(() =>
      createAppServer({
        staticRoot: join(staticRoot, "missing-static-build"),
        previewMode: true,
      }),
    ).toThrow(/Static build root is not a readable directory/u);
    expect(() =>
      createAppServer({
        staticRoot: join(staticRoot, "missing-static-build"),
        publicAppOrigin: "https://public.cutos.app",
        previewMode: false,
      }),
    ).not.toThrow();
    expect(() =>
      createAppServer({
        staticRoot,
        templateRoot: join(staticRoot, "missing-templates"),
      }),
    ).toThrow();
  });

  it("fails closed on invalid production revisions and exposes the exact BUILD_SHA", async () => {
    const staticRoot = await createStaticRoot();

    expect(parseBuildSha(BUILD_SHA, true)).toBe(BUILD_SHA);
    expect(() => parseBuildSha(undefined, true)).toThrow(/BUILD_SHA/u);
    for (const invalidBuildSha of [
      "",
      "0123456789abcdef0123456789abcdef0123456",
      "0123456789ABCDEF0123456789ABCDEF01234567",
      "0000000000000000000000000000000000000000",
      "refs/heads/main",
    ]) {
      expect(() => parseBuildSha(invalidBuildSha, true)).toThrow(/BUILD_SHA/u);
    }

    const previousNodeEnvironment = process.env.NODE_ENV;
    const previousBuildSha = process.env.BUILD_SHA;
    try {
      process.env.NODE_ENV = "production";
      delete process.env.BUILD_SHA;
      expect(() =>
        createAppServer({
          staticRoot,
          previewMode: false,
          publicAppOrigin: DEFAULT_PUBLIC_APP_ORIGIN,
          requireBuildSha: false,
        }),
      ).toThrow(/BUILD_SHA/u);
    } finally {
      if (previousNodeEnvironment === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previousNodeEnvironment;
      }
      if (previousBuildSha === undefined) {
        delete process.env.BUILD_SHA;
      } else {
        process.env.BUILD_SHA = previousBuildSha;
      }
    }

    const { port } = await listen({
      staticRoot,
      buildSha: BUILD_SHA,
      previewMode: false,
      requireBuildSha: true,
    });
    const status = await request(port, "/status");
    expect(JSON.parse(status.body)).toEqual({
      status: "ok",
      build_sha: BUILD_SHA,
    });
  });

  it.each(["/privacy", "/terms/", "/support"])(
    "keeps %s unavailable with no-store and noindex until publication is enabled",
    async (pathname) => {
      const staticRoot = await createStaticRoot();
      const { port } = await listen({ staticRoot, appName: "CUT OS" });

      const response = await request(port, pathname);
      expect(response.status).toBe(503);
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.headers["x-robots-tag"]).toContain("noindex");
      expect(response.headers["content-security-policy"]).toContain(
        "default-src 'none'",
      );
      expect(response.headers["permissions-policy"]).toContain("camera=()");
      expect(response.headers["permissions-policy"]).toContain(
        "geolocation=()",
      );
      expect(response.body).toContain('data-publication-status="approved"');
      expect(response.body).toContain('data-owner-risk-accepted="true"');
      expect(response.body).not.toContain("data-draft-banner");
      expect(response.body).not.toMatch(/<script(?:\s|>)/iu);
    },
  );

  it("serves the exact owner-deferred publication after the approved-mode switch", async () => {
    const staticRoot = await createStaticRoot();
    const { port } = await listen({
      staticRoot,
      appName: "CUT OS",
      publicationStatus: "approved",
      publicAppOrigin: "https://getcutos.com",
    });

    const response = await request(port, "/privacy");
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toContain("public");
    expect(response.body).toContain('data-publication-status="approved"');
    expect(response.body).toContain('data-counsel-approved="false"');
    expect(response.body).toContain('data-owner-risk-accepted="true"');
    expect(response.body).toContain(
      'data-professional-review-status="owner-deferred-post-launch"',
    );
    expect(response.body).toContain(
      '<link rel="canonical" href="https://getcutos.com/privacy"',
    );
  });

  it("serves legal styles and renders links beneath the configured base path", async () => {
    const staticRoot = await createStaticRoot();
    const { port } = await listen({
      staticRoot,
      basePath: "/cut/",
      appName: "CUT OS",
    });

    const privacy = await request(port, "/cut/privacy");
    expect(privacy.status).toBe(503);
    expect(privacy.body).toContain('href="/cut/terms"');
    expect(privacy.body).toContain('href="/cut/legal.css"');

    const css = await request(port, "/cut/legal.css");
    expect(css.status).toBe(200);
    expect(css.headers["content-type"]).toContain("text/css");

    const manifest = await request(port, "/cut/manifest", {
      headers: { "expo-platform": "ios" },
    });
    expect(manifest.status).toBe(200);
  });

  it("refuses approved mode while any legal publication gate is unresolved", async () => {
    const staticRoot = await createStaticRoot();
    expect(() =>
      createAppServer({
        staticRoot,
        publicationStatus: "approved",
        publicAppOrigin: DEFAULT_PUBLIC_APP_ORIGIN,
      }),
    ).toThrow(/Legal templates are not publication-ready/u);
  });

  it("serves approved pages only when counsel approval matches the exact rendering", async () => {
    const staticRoot = await createStaticRoot();
    const publicAppOrigin = "https://approved.cutos.app";
    const { root: templateRoot } = await createApprovedTemplateRoot({
      appName: "CUT OS",
      basePath: "/cut",
      publicAppOrigin,
    });
    const { port } = await listen({
      staticRoot,
      templateRoot,
      publicationStatus: "approved",
      appName: "CUT OS",
      basePath: "/cut",
      publicAppOrigin,
    });

    for (const route of ["/privacy", "/terms", "/support"]) {
      const response = await request(port, `/cut${route}`);
      expect(response.status).toBe(200);
      expect(response.headers["x-robots-tag"]).toBeUndefined();
      expect(response.body).toContain(
        `<link rel="canonical" href="${publicAppOrigin}/cut${route}" />`,
      );
      expect(response.body).toContain('href="/cut/legal.css"');
    }
  });

  it.each(["/privacy", "/terms", "/support"])(
    "refuses an approved %s canonical URL on a different origin or path",
    async (route) => {
      const staticRoot = await createStaticRoot();
      const publicAppOrigin = "https://approved.cutos.app";
      const { root: templateRoot } = await createApprovedTemplateRoot({
        publicAppOrigin,
        canonicalUrls: {
          [route]: `https://other.cutos.app/wrong${route}`,
        },
      });

      expect(() =>
        createAppServer({
          staticRoot,
          templateRoot,
          publicationStatus: "approved",
          appName: "CUT OS",
          publicAppOrigin,
        }),
      ).toThrow(
        new RegExp(
          `${route} canonical URL does not exactly match the runtime public origin and base path`,
          "u",
        ),
      );
    },
  );

  it("refuses approved mode after an approved page changes", async () => {
    const staticRoot = await createStaticRoot();
    const { root: templateRoot } = await createApprovedTemplateRoot();
    await writeFile(
      join(templateRoot, "privacy.html"),
      approvedLegalTemplate(
        "/privacy",
        "Privacy Policy",
        "Changed after approval.",
      ),
    );

    expect(() =>
      createAppServer({
        staticRoot,
        templateRoot,
        publicationStatus: "approved",
        appName: "CUT OS",
        publicAppOrigin: DEFAULT_PUBLIC_APP_ORIGIN,
      }),
    ).toThrow(
      /privacy content changed after the recorded publication approval/u,
    );
  });

  it("refuses a runtime URL base path that counsel did not approve", async () => {
    const staticRoot = await createStaticRoot();
    const { root: templateRoot } = await createApprovedTemplateRoot({
      basePath: "/approved-path",
    });

    expect(() =>
      createAppServer({
        staticRoot,
        templateRoot,
        publicationStatus: "approved",
        appName: "CUT OS",
        basePath: "/different-path",
        publicAppOrigin: DEFAULT_PUBLIC_APP_ORIGIN,
      }),
    ).toThrow(/runtime base path does not match/u);
  });

  it("allows HEAD but rejects state-changing methods", async () => {
    const staticRoot = await createStaticRoot();
    const { port } = await listen({ staticRoot });

    const head = await request(port, "/privacy", { method: "HEAD" });
    expect(head.status).toBe(503);
    expect(head.body).toBe("");

    const post = await request(port, "/privacy", { method: "POST" });
    expect(post.status).toBe(405);
    expect(post.headers.allow).toBe("GET, HEAD");
  });
});

describe("legal release copy gate", () => {
  it.each([
    "This is a working draft.",
    "This policy is incomplete.",
    "This policy has not been approved.",
    "This section is pending counsel review.",
    "This is not a binding agreement.",
    "Do not publish this page.",
    "The process remains to be defined.",
  ])("blocks unsafe publication wording: %s", (copy) => {
    expect(findBlockedReleaseCopy(copy)).not.toEqual([]);
  });

  it("does not block ordinary final policy wording", () => {
    expect(
      findBlockedReleaseCopy(
        "Contact support to request deletion. Apple billing records are separate.",
      ),
    ).toEqual([]);
  });
});
