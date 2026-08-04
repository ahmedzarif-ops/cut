#!/usr/bin/env node

import http from "node:http";
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const workspaceRoot = resolve(import.meta.dirname, "../..");
const builtAppPath = resolve(
  workspaceRoot,
  "artifacts/api-server/dist/app.mjs",
);
const builtConfigurationPath = resolve(
  workspaceRoot,
  "artifacts/api-server/dist/productionConfig.mjs",
);
const packagedTemplateRoot = resolve(
  workspaceRoot,
  "artifacts/api-server/dist/public-site/templates",
);
const requiredProductionTemplates = [
  "production-landing-page.html",
  "privacy.html",
  "terms.html",
  "support.html",
  "legal.css",
  "legal-publication-approval.json",
];

await Promise.all([
  access(builtAppPath),
  access(builtConfigurationPath),
  ...requiredProductionTemplates.map((filename) =>
    access(resolve(packagedTemplateRoot, filename)),
  ),
]).catch(() => {
  throw new Error(
    "Production API code or packaged public-site templates are missing. Run pnpm run build:production first.",
  );
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const canonicalOrigin = "https://dry-run.cutos.app";
const dryRunBuildSha = "0123456789abcdef0123456789abcdef01234567";
const livePublishableKey = `${["pk", "live"].join("_")}_${Buffer.from(
  "clerk.dry-run.cutos.app$",
)
  .toString("base64")
  .replace(/=+$/u, "")}`;

// Use syntactically valid, non-working values so the exact built production
// gates run while every request remains on routes that have no provider or
// database dependency. Nothing here publishes, authenticates, or incurs cost.
Object.assign(process.env, {
  API_RATE_LIMIT: "100",
  API_MAX_INSTANCES: "1",
  BASE_PATH: "/",
  BUILD_SHA: dryRunBuildSha,
  CLERK_PUBLISHABLE_KEY: livePublishableKey,
  CLERK_RATE_LIMIT: "30",
  CLERK_SECRET_KEY: ["sk", "live", "DryRunOnlyNeverValid1234"].join("_"),
  CLERK_TELEMETRY_DISABLED: "1",
  CORS_ALLOWED_ORIGINS: canonicalOrigin,
  DATABASE_URL: [
    "postgresql://dry-run-user",
    "dry-run-password@db.cutos.app/cut?sslmode=verify-full",
  ].join(":"),
  LEGAL_SITE_PUBLICATION_STATUS: "draft",
  LOG_LEVEL: "silent",
  NODE_ENV: "production",
  PG_POOL_MAX: "5",
  PUBLIC_APP_ORIGIN: canonicalOrigin,
  REVENUECAT_APP_REST_ID: "appDryRunOnly1234",
  REVENUECAT_ENTITLEMENT_REST_ID: "entlDryRunOnly1234",
  REVENUECAT_OFFERING_REST_ID: "ofrngDryRunOnly1234",
  REVENUECAT_PROJECT_ID: "projDryRunOnly1234",
  REVENUECAT_SECRET_API_KEY: ["sk", "DryRunOnly1234"].join("_"),
});

const { assertProductionConfiguration, validateProductionConfiguration } =
  await import(
    `${pathToFileURL(builtConfigurationPath).href}?dry-run=${Date.now()}`
  );

const productionIssues = validateProductionConfiguration(process.env);
assert(
  productionIssues.length === 0,
  `Built production preflight rejected synthetic topology fields: ${productionIssues.join(", ")}`,
);
assertProductionConfiguration(process.env);
assert(
  validateProductionConfiguration({
    ...process.env,
    BASE_PATH: "/mounted-app",
  }).includes("BASE_PATH"),
  "Built production preflight accepted a non-root BASE_PATH.",
);
assert(
  validateProductionConfiguration({
    ...process.env,
    PUBLIC_APP_ORIGIN: "https://split-origin.cutos.app",
  }).includes("PUBLIC_APP_ORIGIN"),
  "Built production preflight accepted a split public/API origin.",
);
assert(
  validateProductionConfiguration({
    ...process.env,
    BUILD_SHA: "0123456789ABCDEF0123456789ABCDEF01234567",
  }).includes("BUILD_SHA"),
  "Built production preflight accepted a non-canonical BUILD_SHA.",
);

const { default: app } = await import(
  `${pathToFileURL(builtAppPath).href}?dry-run=${Date.now()}`
);

const server = app.listen(0, "127.0.0.1");

await new Promise((resolvePromise, reject) => {
  server.once("listening", resolvePromise);
  server.once("error", reject);
});

function request(pathname, options = {}) {
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Dry-run server did not expose an ephemeral TCP port.");
  }

  return new Promise((resolvePromise, reject) => {
    const requestHandle = http.request(
      {
        headers: options.headers,
        host: "127.0.0.1",
        method: options.method ?? "GET",
        path: pathname,
        port: address.port,
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          resolvePromise({
            body: Buffer.concat(chunks).toString("utf8"),
            headers: response.headers,
            status: response.statusCode,
          });
        });
      },
    );
    requestHandle.once("error", reject);
    requestHandle.end();
  });
}

try {
  const address = server.address();
  assert(
    server.listening,
    "Built production app did not open a real listener.",
  );
  assert(
    address && typeof address !== "string" && address.address === "127.0.0.1",
    "Dry-run listener escaped the loopback boundary.",
  );
  assert(
    address && typeof address !== "string" && address.port > 0,
    "Dry-run listener did not receive an ephemeral TCP port.",
  );

  const [
    landing,
    status,
    privacy,
    support,
    apiHealth,
    foreignOriginHealth,
    manifest,
  ] = await Promise.all([
    request("/"),
    request("/status"),
    request("/privacy"),
    request("/support"),
    request("/api/healthz", {
      headers: { origin: canonicalOrigin },
    }),
    request("/api/healthz", {
      headers: { origin: "https://untrusted.cutos.app" },
    }),
    request("/manifest"),
  ]);

  assert(landing.status === 200, "Landing route did not return 200.");
  assert(
    landing.body.includes('data-app-surface="production"'),
    "Landing route did not use the production public surface.",
  );
  assert(
    landing.headers["content-security-policy"]?.includes("script-src 'none'"),
    "Landing route lost its no-script production CSP.",
  );
  assert(
    landing.body.includes(`${canonicalOrigin}/`),
    "Landing route did not render the canonical production origin.",
  );
  assert(status.status === 200, "Public status route did not return 200.");
  assert(
    status.body === JSON.stringify({ status: "ok", build_sha: dryRunBuildSha }),
    "Public status route returned an unexpected body.",
  );
  assert(privacy.status === 503, "Draft privacy route did not fail closed.");
  assert(support.status === 503, "Draft support route did not fail closed.");
  assert(apiHealth.status === 200, "API health route did not return 200.");
  assert(
    apiHealth.headers["access-control-allow-origin"] === canonicalOrigin,
    "Canonical production origin was not allowed by API CORS.",
  );
  assert(
    apiHealth.headers["access-control-allow-credentials"] === "true",
    "Canonical API response lost its credentialed CORS contract.",
  );
  assert(
    foreignOriginHealth.headers["access-control-allow-origin"] === undefined,
    "An untrusted production origin received an API CORS grant.",
  );
  assert(
    manifest.status === 404,
    "Production exposed a preview manifest route.",
  );

  console.log(
    "Production topology dry-run passed: built production gates and one loopback listener served the canonical public, legal, status, and API surfaces without provider calls.",
  );
} finally {
  await new Promise((resolvePromise, reject) => {
    server.close((error) => (error ? reject(error) : resolvePromise()));
    server.closeIdleConnections?.();
  });
}
