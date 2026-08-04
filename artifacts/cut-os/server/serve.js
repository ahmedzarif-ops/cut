/**
 * Standalone public-site server for CUT.
 *
 * Production serves the CUT launch surface and zero-JavaScript legal pages.
 * Expo Go manifests and static preview assets are available only when the
 * server is explicitly running outside production.
 * Draft legal pages intentionally return 503 and noindex. Setting
 * LEGAL_SITE_PUBLICATION_STATUS=approved fails startup unless every template
 * has passed the explicit publication gates in validate-legal-site.mjs.
 *
 * Zero external dependencies — uses only Node.js built-ins (http, fs, path).
 */

const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const {
  APPROVAL_RECORD_FILENAME,
  findBlockedReleaseCopy,
  normalizeBasePath,
  renderLegalTemplate,
  validateApprovalRecord,
} = require("./legal-publication-gate.js");

const DEFAULT_STATIC_ROOT = path.resolve(__dirname, "..", "static-build");
const DEFAULT_TEMPLATE_ROOT = path.resolve(__dirname, "templates");
const DEFAULT_PORT = 3000;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;
const MAX_SHUTDOWN_TIMEOUT_MS = 60_000;
const FULL_GIT_SHA = /^(?!0{40}$)[0-9a-f]{40}$/u;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
};

const LEGAL_ROUTES = {
  "/privacy": "privacy.html",
  "/terms": "terms.html",
  "/support": "support.html",
};

const NON_PUBLIC_DNS_SUFFIXES = [
  ".example",
  ".home",
  ".home.arpa",
  ".internal",
  ".invalid",
  ".lan",
  ".local",
  ".localhost",
  ".onion",
  ".test",
];

function isValidPublicHostname(hostname) {
  const normalized = hostname.toLowerCase();
  const labels = normalized.split(".");
  return Boolean(
    normalized.length <= 253 &&
    labels.length >= 2 &&
    labels.every(
      (label) =>
        label.length > 0 &&
        label.length <= 63 &&
        /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(label),
    ) &&
    !/^\d{1,3}(?:\.\d{1,3}){3}$/u.test(normalized) &&
    !NON_PUBLIC_DNS_SUFFIXES.some((suffix) => normalized.endsWith(suffix)),
  );
}

function parsePublicAppOrigin(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 2048 ||
    value.trim() !== value ||
    /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    throw new Error(
      "PUBLIC_APP_ORIGIN must be an HTTPS origin on a public DNS hostname.",
    );
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      "PUBLIC_APP_ORIGIN must be an HTTPS origin on a public DNS hostname.",
    );
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    !isValidPublicHostname(parsed.hostname)
  ) {
    throw new Error(
      "PUBLIC_APP_ORIGIN must be an HTTPS origin on a public DNS hostname.",
    );
  }

  return Object.freeze({
    origin: parsed.origin,
    hostname: parsed.hostname.toLowerCase(),
    deepLink: `exps://${parsed.hostname.toLowerCase()}`,
  });
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/gu,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
}

function serializeInlineJson(value) {
  return JSON.stringify(value).replace(
    /[<>&\u2028\u2029]/gu,
    (character) =>
      `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

function getAppName() {
  try {
    const appJsonPath = path.resolve(__dirname, "..", "app.json");
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function readTemplate(templateRoot, name) {
  return fs.readFileSync(path.join(templateRoot, name), "utf-8");
}

function validatePublicationStatus(status) {
  if (status !== "draft" && status !== "approved") {
    throw new Error(
      "LEGAL_SITE_PUBLICATION_STATUS must be either draft or approved.",
    );
  }
}

function canonicalHrefs(template) {
  const linkTags =
    template.match(/<link\b(?:(?:"[^"]*"|'[^']*'|[^'">])*)>/giu) ?? [];
  return linkTags.flatMap((tag) => {
    const rel = /\brel\s*=\s*(["'])(.*?)\1/iu.exec(tag)?.[2];
    if (
      !rel?.split(/\s+/u).some((token) => token.toLowerCase() === "canonical")
    ) {
      return [];
    }
    const href = /\bhref\s*=\s*(["'])(.*?)\1/iu.exec(tag)?.[2];
    return [href ?? null];
  });
}

function assertApprovedTemplates(
  templates,
  appName,
  basePath,
  publicAppOrigin,
) {
  const combined = Object.values(templates.legal).join("\n");
  const issues = [];

  if (/\{\{[A-Z0-9_]+\}\}/u.test(combined)) {
    issues.push("unresolved legal placeholders remain");
  }

  for (const [route, template] of Object.entries(templates.legal)) {
    if (!template.includes('data-publication-status="approved"')) {
      issues.push(`${route} is not marked approved`);
    }
    if (!template.includes('data-counsel-approved="true"')) {
      issues.push(`${route} does not record counsel approval`);
    }
    if (
      template.includes("data-draft-banner") ||
      template.includes("data-blocker") ||
      template.includes('content="noindex')
    ) {
      issues.push(`${route} still contains a draft publication control`);
    }
    const renderedTemplate = renderLegalTemplate(template, appName, basePath);
    const expectedCanonicalUrl = `${publicAppOrigin}${basePath}${route}`;
    const renderedCanonicalHrefs = canonicalHrefs(renderedTemplate);
    if (
      renderedCanonicalHrefs.length !== 1 ||
      renderedCanonicalHrefs[0] !== expectedCanonicalUrl
    ) {
      issues.push(
        `${route} canonical URL does not exactly match the runtime public origin and base path`,
      );
    }
    if (
      /<script(?:\s|>)/iu.test(template) ||
      /\s(?:on\w+)\s*=/iu.test(template) ||
      /javascript:/iu.test(template)
    ) {
      issues.push(`${route} is not a zero-JavaScript page`);
    }
    for (const blockedCopy of findBlockedReleaseCopy(template)) {
      issues.push(`${route} still contains ${blockedCopy}`);
    }
  }

  issues.push(
    ...validateApprovalRecord(
      templates.publicationApproval,
      templates,
      appName,
      basePath,
    ),
  );

  if (issues.length > 0) {
    throw new Error(
      `Legal templates are not publication-ready: ${issues.join("; ")}`,
    );
  }
}

function loadTemplates(templateRoot, previewMode) {
  return {
    landing: readTemplate(
      templateRoot,
      previewMode ? "landing-page.html" : "production-landing-page.html",
    ),
    legalCss: readTemplate(templateRoot, "legal.css"),
    legal: Object.fromEntries(
      Object.entries(LEGAL_ROUTES).map(([route, filename]) => [
        route,
        readTemplate(templateRoot, filename),
      ]),
    ),
    publicationApproval: JSON.parse(
      readTemplate(templateRoot, APPROVAL_RECORD_FILENAME),
    ),
  };
}

function assertStaticRoot(staticRoot) {
  let stat;
  try {
    stat = fs.statSync(staticRoot);
    fs.accessSync(staticRoot, fs.constants.R_OK);
  } catch {
    throw new Error(
      `Static build root is not a readable directory: ${staticRoot}`,
    );
  }

  if (!stat.isDirectory()) {
    throw new Error(
      `Static build root is not a readable directory: ${staticRoot}`,
    );
  }
}

function serveManifest(platform, res, staticRoot, requestMethod) {
  const manifestPath = path.join(staticRoot, platform, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(
      requestMethod === "HEAD"
        ? undefined
        : JSON.stringify({
            error: `Manifest not found for platform: ${platform}`,
          }),
    );
    return;
  }

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.writeHead(200, {
    "content-type": "application/json",
    "expo-protocol-version": "1",
    "expo-sfv-version": "0",
  });
  res.end(requestMethod === "HEAD" ? undefined : manifest);
}

function serveLandingPage(
  req,
  res,
  landingPageTemplate,
  appName,
  publicApp,
  basePath,
  previewMode,
  publicationStatus,
) {
  const nonce = crypto.randomBytes(18).toString("base64");
  const canonicalUrl = `${publicApp.origin}${basePath || ""}/`;
  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/gu, () => escapeHtml(publicApp.origin))
    .replace(/PUBLIC_CANONICAL_URL_PLACEHOLDER/gu, () =>
      escapeHtml(canonicalUrl),
    )
    .replace(/PUBLIC_BASE_PATH_PLACEHOLDER/gu, () => escapeHtml(basePath))
    .replace(/DEEP_LINK_ATTRIBUTE_PLACEHOLDER/gu, () =>
      escapeHtml(publicApp.deepLink),
    )
    .replace(/DEEP_LINK_JSON_PLACEHOLDER/gu, () =>
      serializeInlineJson(publicApp.deepLink),
    )
    .replace(/APP_NAME_PLACEHOLDER/gu, () => escapeHtml(appName))
    .replace(/CSP_NONCE_PLACEHOLDER/gu, () => escapeHtml(nonce));

  res.writeHead(200, {
    "cache-control": "no-store",
    "content-security-policy":
      `default-src 'none'; script-src ${previewMode ? `'nonce-${nonce}'` : "'none'"}; ` +
      `style-src 'nonce-${nonce}'; img-src data:; base-uri 'none'; ` +
      "frame-ancestors 'none'; form-action 'none'; object-src 'none'",
    "content-type": "text/html; charset=utf-8",
    "permissions-policy":
      "accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), usb=(), xr-spatial-tracking=()",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    ...(publicationStatus === "approved"
      ? {}
      : { "x-robots-tag": "noindex, nofollow, noarchive" }),
  });
  res.end(req.method === "HEAD" ? undefined : html);
}

function serveLegalPage(
  req,
  res,
  template,
  appName,
  basePath,
  publicationStatus,
) {
  const html = renderLegalTemplate(template, appName, basePath);
  const approved = publicationStatus === "approved";

  res.writeHead(approved ? 200 : 503, {
    "cache-control": approved ? "public, max-age=300" : "no-store",
    "content-security-policy":
      "default-src 'none'; style-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    "content-type": "text/html; charset=utf-8",
    "permissions-policy":
      "accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), usb=(), xr-spatial-tracking=()",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    ...(approved ? {} : { "x-robots-tag": "noindex, nofollow, noarchive" }),
  });
  res.end(req.method === "HEAD" ? undefined : html);
}

function serveLegalCss(req, res, css) {
  res.writeHead(200, {
    "cache-control": "public, max-age=300",
    "content-type": "text/css; charset=utf-8",
    "x-content-type-options": "nosniff",
  });
  res.end(req.method === "HEAD" ? undefined : css);
}

function serveStatus(req, res, buildSha) {
  res.writeHead(200, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
  });
  res.end(
    req.method === "HEAD"
      ? undefined
      : JSON.stringify({
          status: "ok",
          ...(buildSha ? { build_sha: buildSha } : {}),
        }),
  );
}

function parseBuildSha(value, required = false) {
  if (value === undefined && !required) return undefined;
  if (typeof value !== "string" || !FULL_GIT_SHA.test(value)) {
    throw new Error(
      "BUILD_SHA must be an exact non-placeholder lowercase 40-character Git SHA.",
    );
  }
  return value;
}

function serveStaticFile(req, urlPath, res, staticRoot) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/u, "");
  const filePath = path.join(staticRoot, safePath);

  if (!filePath.startsWith(staticRoot)) {
    res.writeHead(403);
    res.end(req.method === "HEAD" ? undefined : "Forbidden");
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end(req.method === "HEAD" ? undefined : "Not Found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const content = fs.readFileSync(filePath);
  res.writeHead(200, { "content-type": contentType });
  res.end(req.method === "HEAD" ? undefined : content);
}

function createRequestHandler(options = {}) {
  const staticRoot = options.staticRoot || DEFAULT_STATIC_ROOT;
  const templateRoot = options.templateRoot || DEFAULT_TEMPLATE_ROOT;
  const basePath = normalizeBasePath(
    options.basePath ?? process.env.BASE_PATH ?? "/",
  );
  const appName = options.appName || getAppName();
  const publicationStatus =
    options.publicationStatus ??
    process.env.LEGAL_SITE_PUBLICATION_STATUS ??
    "draft";
  validatePublicationStatus(publicationStatus);
  const previewMode =
    options.previewMode ?? process.env.NODE_ENV !== "production";
  if (typeof previewMode !== "boolean") {
    throw new Error("previewMode must be a boolean when supplied.");
  }
  if (
    options.requireBuildSha !== undefined &&
    typeof options.requireBuildSha !== "boolean"
  ) {
    throw new Error("requireBuildSha must be a boolean when supplied.");
  }
  const requireBuildSha =
    process.env.NODE_ENV === "production" || options.requireBuildSha === true;
  const buildSha = parseBuildSha(
    options.buildSha ?? process.env.BUILD_SHA,
    requireBuildSha,
  );
  // Expo bundles and manifests exist only for the explicit development preview.
  // The production process serves the source-controlled launch/legal surface
  // and must not depend on a legacy Expo Go static build it will never expose.
  if (previewMode) assertStaticRoot(staticRoot);
  const templates = loadTemplates(templateRoot, previewMode);
  const publicApp = parsePublicAppOrigin(
    options.publicAppOrigin ?? process.env.PUBLIC_APP_ORIGIN,
  );
  if (publicationStatus === "approved") {
    assertApprovedTemplates(templates, appName, basePath, publicApp.origin);
  }

  return (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { allow: "GET, HEAD" });
      res.end("Method Not Allowed");
      return;
    }

    let url;
    try {
      // Only the path is relevant to routing. Never use Host or forwarding
      // headers as a URL base; they are client-controlled at this boundary.
      url = new URL(req.url || "/", "http://localhost");
    } catch {
      res.writeHead(400);
      res.end("Bad Request");
      return;
    }

    let pathname = url.pathname;
    if (basePath) {
      if (pathname !== basePath && !pathname.startsWith(`${basePath}/`)) {
        res.writeHead(404, { "cache-control": "no-store" });
        res.end(req.method === "HEAD" ? undefined : "Not Found");
        return;
      }
      pathname = pathname.slice(basePath.length) || "/";
    }
    const routePath =
      pathname.length > 1 ? pathname.replace(/\/+$/u, "") : pathname;

    if (routePath === "/status") {
      return serveStatus(req, res, buildSha);
    }

    if (previewMode && (routePath === "/" || routePath === "/manifest")) {
      const platform = req.headers["expo-platform"];
      if (platform === "ios" || platform === "android") {
        return serveManifest(platform, res, staticRoot, req.method);
      }

      if (routePath === "/") {
        return serveLandingPage(
          req,
          res,
          templates.landing,
          appName,
          publicApp,
          basePath,
          previewMode,
          publicationStatus,
        );
      }
    }

    if (routePath === "/") {
      return serveLandingPage(
        req,
        res,
        templates.landing,
        appName,
        publicApp,
        basePath,
        previewMode,
        publicationStatus,
      );
    }

    if (Object.hasOwn(templates.legal, routePath)) {
      return serveLegalPage(
        req,
        res,
        templates.legal[routePath],
        appName,
        basePath,
        publicationStatus,
      );
    }

    if (routePath === "/legal.css") {
      return serveLegalCss(req, res, templates.legalCss);
    }

    if (!previewMode) {
      res.writeHead(404, { "cache-control": "no-store" });
      res.end(req.method === "HEAD" ? undefined : "Not Found");
      return;
    }

    serveStaticFile(req, pathname, res, staticRoot);
  };
}

function createAppServer(options = {}) {
  return http.createServer(createRequestHandler(options));
}

function parseServerPort(value = String(DEFAULT_PORT)) {
  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    !/^[1-9]\d*$/u.test(value)
  ) {
    throw new Error("PORT must be an integer from 1 through 65535.");
  }
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port > 65_535) {
    throw new Error("PORT must be an integer from 1 through 65535.");
  }
  return port;
}

function parseShutdownTimeoutMs(value) {
  if (value === undefined) return DEFAULT_SHUTDOWN_TIMEOUT_MS;
  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    !/^[1-9]\d*$/u.test(value)
  ) {
    throw new Error(
      `SHUTDOWN_TIMEOUT_MS must be an integer from 1 through ${MAX_SHUTDOWN_TIMEOUT_MS}.`,
    );
  }
  const timeoutMs = Number(value);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs > MAX_SHUTDOWN_TIMEOUT_MS) {
    throw new Error(
      `SHUTDOWN_TIMEOUT_MS must be an integer from 1 through ${MAX_SHUTDOWN_TIMEOUT_MS}.`,
    );
  }
  return timeoutMs;
}

if (require.main === module) {
  const port = parseServerPort(process.env.PORT);
  const shutdownTimeoutMs = parseShutdownTimeoutMs(
    process.env.SHUTDOWN_TIMEOUT_MS,
  );
  // The executable server is the deployment entry point and is always the
  // production public surface. Tests and local tooling may opt into the Expo
  // preview only through createAppServer({ previewMode: true }).
  const server = createAppServer({ previewMode: false });
  let shuttingDown = false;

  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Stopping CUT public site after ${signal}`);
    const forcedExit = setTimeout(() => {
      console.error("CUT public site shutdown timed out", {
        errorCode: "public_site_shutdown_timeout",
      });
      process.exit(1);
    }, shutdownTimeoutMs);
    forcedExit.unref();
    server.close((error) => {
      clearTimeout(forcedExit);
      if (error) {
        console.error("CUT public site shutdown failed", {
          errorCode: "public_site_shutdown_failed",
        });
        process.exit(1);
      }
      process.exit(0);
    });
    server.closeIdleConnections?.();
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGHUP", () => shutdown("SIGHUP"));
  server.once("error", () => {
    console.error("CUT public site failed to start", {
      errorCode: "public_site_start_failed",
    });
    process.exit(1);
  });
  server.listen(port, "0.0.0.0", () => {
    console.log(`Serving CUT public site on port ${port}`);
  });
}

module.exports = {
  createAppServer,
  createRequestHandler,
  normalizeBasePath,
  parseBuildSha,
  parsePublicAppOrigin,
  parseServerPort,
  parseShutdownTimeoutMs,
};
