import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createAppServer } = require("./serve.js");
const {
  APPROVAL_SCOPE,
  buildResourceHashes,
  findBlockedReleaseCopy,
} = require("./legal-publication-gate.js");

const servers = [];
const temporaryDirectories = [];

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

function approvedLegalTemplate(route, label, extraCopy = "") {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${label} · APP_NAME_PLACEHOLDER</title>
    <link rel="canonical" href="https://www.cutos.app${route}" />
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
  const legalCss = "body { color: #111; }\n";
  const legal = {
    "/privacy": approvedLegalTemplate(
      "/privacy",
      "Privacy Policy",
      options.privacyCopy,
    ),
    "/terms": approvedLegalTemplate("/terms", "Terms of Use"),
    "/support": approvedLegalTemplate("/support", "Support"),
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
  const server = createAppServer(options);
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

  it("reports ready only after the static build and templates initialize", async () => {
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
      }),
    ).toThrow(/Static build root is not a readable directory/u);
    expect(() =>
      createAppServer({
        staticRoot,
        templateRoot: join(staticRoot, "missing-templates"),
      }),
    ).toThrow();
  });

  it.each(["/privacy", "/terms/", "/support"])(
    "serves %s as a zero-JavaScript blocked draft",
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
      expect(response.body).toContain('data-publication-status="draft"');
      expect(response.body).toContain("Draft only");
      expect(response.body).not.toMatch(/<script(?:\s|>)/iu);
    },
  );

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
      createAppServer({ staticRoot, publicationStatus: "approved" }),
    ).toThrow(/Legal templates are not publication-ready/u);
  });

  it("serves approved pages only when counsel approval matches the exact rendering", async () => {
    const staticRoot = await createStaticRoot();
    const { root: templateRoot } = await createApprovedTemplateRoot({
      appName: "CUT OS",
      basePath: "/cut",
    });
    const { port } = await listen({
      staticRoot,
      templateRoot,
      publicationStatus: "approved",
      appName: "CUT OS",
      basePath: "/cut",
    });

    const response = await request(port, "/cut/privacy");
    expect(response.status).toBe(200);
    expect(response.headers["x-robots-tag"]).toBeUndefined();
    expect(response.body).toContain("Privacy Policy · CUT OS");
    expect(response.body).toContain('href="/cut/legal.css"');
  });

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
      }),
    ).toThrow(/privacy content changed after the recorded counsel approval/u);
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
