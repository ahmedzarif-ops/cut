import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  inspectBytes,
  scanExportedArchive,
  scanTrackedRepository,
  SecretBoundaryScanError,
} from "./secret-boundary-scan.mjs";

function clerkSecret() {
  return ["sk", "live", "aB3dE5fG7hJ9kL2mN4pQ6rS8tV0xZ1cD"].join("_");
}

function revenueCatSecret() {
  return ["sk", "9aB3dE5fG7hJ2kL4mN6pQ8rS0tV1xZ3c"].join("_");
}

test("tracked scan allows public client values and short placeholders", () => {
  const source = [
    "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_public_value",
    "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_public_value",
    "CLERK_SECRET_KEY=sk_live_short",
  ].join("\n");
  assert.deepEqual(
    inspectBytes(Buffer.from(source), "config.test.ts", "tracked"),
    [],
  );
});

test("tracked scan reports a real-looking key even in a test file", () => {
  const findings = inspectBytes(
    Buffer.from(`CLERK_SECRET_KEY=${clerkSecret()}`),
    "config.test.ts",
    "tracked",
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0].ruleId, "clerk_secret_key");
});

test("credential rules detect URL-safe tokens whose final character is a hyphen", () => {
  const clerk = `${clerkSecret()}-`;
  const revenueCat = `${revenueCatSecret()}-`;
  const findings = inspectBytes(
    Buffer.from(`${clerk}\n${revenueCat}\n`),
    "config.ts",
    "tracked",
  );
  assert.deepEqual(findings.map(({ ruleId }) => ruleId).sort(), [
    "clerk_secret_key",
    "revenuecat_secret_api_key",
  ]);
});

test("tracked scan detects the shortest RevenueCat key shape accepted by production", () => {
  const acceptedRevenueCatSecret = ["sk", "12345678"].join("_");
  const findings = inspectBytes(
    Buffer.from(`REVENUECAT_SECRET_API_KEY=${acceptedRevenueCatSecret}\n`),
    "config.txt",
    "tracked",
  );

  assert.deepEqual(
    findings.map(({ ruleId }) => ruleId),
    ["revenuecat_secret_api_key"],
  );
});

test("tracked scan reports credential material without returning values", () => {
  const credentialedDatabaseUrl = [
    "postgresql://cut_user:",
    "aB3dE5fG7hJ9",
    "@db.cutos.app/cut?sslmode=verify-full",
  ].join("");
  const source = [
    clerkSecret(),
    revenueCatSecret(),
    credentialedDatabaseUrl,
  ].join("\n");
  const findings = inspectBytes(
    Buffer.from(source),
    "src/config.ts",
    "tracked",
  );
  assert.deepEqual(findings.map(({ ruleId }) => ruleId).sort(), [
    "clerk_secret_key",
    "credentialed_postgres_url",
    "revenuecat_secret_api_key",
  ]);
  assert.equal(JSON.stringify(findings).includes(clerkSecret()), false);
  assert.equal(JSON.stringify(findings).includes(revenueCatSecret()), false);
});

test("archive scan reports server-only names even without their values", () => {
  const content = [
    "CLERK_SECRET_KEY",
    "CLERK_PUBLISHABLE_KEY",
    "DATABASE_URL",
    "REVENUECAT_SECRET_API_KEY",
    "REVENUECAT_PROJECT_ID",
    "REVENUECAT_ENTITLEMENT_REST_ID",
    "REVENUECAT_APP_REST_ID",
    "REVENUECAT_OFFERING_REST_ID",
    "CORS_ALLOWED_ORIGINS",
    "PUBLIC_APP_ORIGIN",
    "API_MAX_INSTANCES",
    "ACCOUNT_DELETION_RETRY_INTERVAL_MS",
    "API_RATE_LIMIT",
    "CLERK_RATE_LIMIT",
    "PG_POOL_MAX",
    "LEGAL_SITE_PUBLICATION_STATUS",
    "SHUTDOWN_TIMEOUT_MS",
    "EXPO_TOKEN",
    "APPLE_APP_SPECIFIC_PASSWORD",
  ].join("\n");
  const rules = inspectBytes(
    Buffer.from(content),
    "main.jsbundle",
    "archive",
  ).map(({ ruleId }) => ruleId);
  assert.deepEqual(
    Object.fromEntries(
      [...new Set(rules)]
        .sort()
        .map((ruleId) => [
          ruleId,
          rules.filter((candidate) => candidate === ruleId).length,
        ]),
    ),
    {
      release_credential_name_apple: 1,
      release_credential_name_expo: 1,
      server_configuration_name_api: 9,
      server_configuration_name_clerk: 1,
      server_configuration_name_revenuecat: 4,
      server_secret_name_clerk: 1,
      server_secret_name_database: 1,
      server_secret_name_revenuecat: 1,
    },
  );
});

test("archive scan permits only the explicitly public mobile counterparts", () => {
  const content = [
    "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "EXPO_PUBLIC_DOMAIN",
    "EXPO_PUBLIC_CLERK_PROXY_URL",
    "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY",
    "EXPO_PUBLIC_REVENUECAT_PRODUCT_ID",
    "EXPO_PUBLIC_PRIVACY_POLICY_URL",
    "EXPO_PUBLIC_TERMS_URL",
    "EXPO_PUBLIC_SUPPORT_URL",
    "NODE_ENV",
  ].join("\n");
  assert.deepEqual(
    inspectBytes(Buffer.from(content), "main.jsbundle", "archive"),
    [],
  );
});

test("archive scan never treats fixture-looking credentials as safe", () => {
  const findings = inspectBytes(
    Buffer.from(`CLERK_SECRET_KEY=${clerkSecret()}`),
    "fixture.test.js",
    "archive",
  );
  assert.deepEqual(findings.map(({ ruleId }) => ruleId).sort(), [
    "clerk_secret_key",
    "server_secret_name_clerk",
  ]);
});

test("archive directory scan is recursive and rejects symlinks", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "cut-secret-archive-"));
  await mkdir(path.join(root, "nested"));
  await writeFile(path.join(root, "nested", "main.jsbundle"), clerkSecret());
  const result = await scanExportedArchive(root);
  assert.equal(result.filesScanned, 1);
  assert.equal(result.findings[0].relativePath, "nested/main.jsbundle");
  assert.equal(result.findings[0].ruleId, "clerk_secret_key");

  await symlink(
    path.join(root, "nested", "main.jsbundle"),
    path.join(root, "linked-bundle"),
  );
  await assert.rejects(
    scanExportedArchive(root),
    (error) =>
      error instanceof SecretBoundaryScanError &&
      error.code === "archive_symlink_not_allowed",
  );
});

test("tracked repository scan checks tracked worktree bytes only", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "cut-secret-source-"));
  const initialization = spawnSync("git", ["init", "-q"], { cwd: root });
  assert.equal(initialization.status, 0);
  await writeFile(path.join(root, "tracked.ts"), "export const safe = true;\n");
  assert.equal(
    spawnSync("git", ["add", "tracked.ts"], { cwd: root }).status,
    0,
  );
  await writeFile(path.join(root, "untracked.ts"), clerkSecret());

  const clean = await scanTrackedRepository(root);
  assert.equal(clean.filesScanned, 1);
  assert.deepEqual(clean.findings, []);

  await writeFile(path.join(root, "tracked.ts"), clerkSecret());
  const leaked = await scanTrackedRepository(root);
  assert.equal(leaked.findings.length, 1);
  assert.equal(leaked.findings[0].ruleId, "clerk_secret_key");
});
