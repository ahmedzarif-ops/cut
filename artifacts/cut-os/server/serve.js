/**
 * Standalone production server for Expo static builds.
 *
 * Preserves Expo manifest/static routes and adds zero-JavaScript legal pages.
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

function assertApprovedTemplates(templates, appName, basePath) {
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
    if (!/<link rel="canonical" href="https:\/\//u.test(template)) {
      issues.push(`${route} has no public HTTPS canonical URL`);
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

function loadTemplates(templateRoot, publicationStatus, appName, basePath) {
  const templates = {
    landing: readTemplate(templateRoot, "landing-page.html"),
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

  if (publicationStatus === "approved") {
    assertApprovedTemplates(templates, appName, basePath);
  }
  return templates;
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

function serveLandingPage(req, res, landingPageTemplate, appName, publicApp) {
  const nonce = crypto.randomBytes(18).toString("base64");
  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/gu, () => escapeHtml(publicApp.origin))
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
      `default-src 'none'; script-src 'nonce-${nonce}'; ` +
      `style-src 'nonce-${nonce}'; img-src data:; base-uri 'none'; ` +
      "frame-ancestors 'none'; form-action 'none'; object-src 'none'",
    "content-type": "text/html; charset=utf-8",
    "permissions-policy":
      "accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), usb=(), xr-spatial-tracking=()",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
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

function serveStatus(req, res) {
  res.writeHead(200, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
  });
  res.end(req.method === "HEAD" ? undefined : JSON.stringify({ status: "ok" }));
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
  assertStaticRoot(staticRoot);
  const templates = loadTemplates(
    templateRoot,
    publicationStatus,
    appName,
    basePath,
  );
  const publicApp = parsePublicAppOrigin(
    options.publicAppOrigin ?? process.env.PUBLIC_APP_ORIGIN,
  );

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
    if (
      basePath &&
      (pathname === basePath || pathname.startsWith(`${basePath}/`))
    ) {
      pathname = pathname.slice(basePath.length) || "/";
    }
    const routePath =
      pathname.length > 1 ? pathname.replace(/\/+$/u, "") : pathname;

    if (routePath === "/status") {
      return serveStatus(req, res);
    }

    if (routePath === "/" || routePath === "/manifest") {
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
        );
      }
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

    serveStaticFile(req, pathname, res, staticRoot);
  };
}

function createAppServer(options = {}) {
  return http.createServer(createRequestHandler(options));
}

if (require.main === module) {
  const port = Number.parseInt(process.env.PORT || "3000", 10);
  const server = createAppServer();
  server.listen(port, "0.0.0.0", () => {
    console.log(`Serving static Expo build on port ${port}`);
  });
}

module.exports = {
  createAppServer,
  createRequestHandler,
  normalizeBasePath,
  parsePublicAppOrigin,
};
