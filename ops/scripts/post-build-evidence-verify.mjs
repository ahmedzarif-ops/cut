#!/usr/bin/env node

import { createHash } from "node:crypto";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  EasSubmitConfigurationError,
  validateEasSubmitConfig,
} from "./eas-submit-config-verify.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const EAS_JSON_PATH = "artifacts/cut-os/eas.json";
const TESTFLIGHT_RECORD_PATH = "app-store/testflight-submission.json";
const SCREENSHOT_MANIFEST_PATH = "app-store/screenshots/manifest.json";
const DATABASE_MIGRATION_JOURNAL_PATH = "lib/db/migrations/meta/_journal.json";
const FULL_LOWERCASE_GIT_SHA = /^[0-9a-f]{40}$/u;
const MAX_GIT_OUTPUT_BYTES = 8 * 1024 * 1024;
const MAX_RELEASE_MANIFEST_BYTES = 512 * 1024;
const MAX_RESTORE_DRILL_AGE_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_APP_REVIEW_EVIDENCE_AGE_MS = 24 * 60 * 60 * 1000;
const CLERK_SHUTDOWN_STATUS_SOURCE = "exact_app_store_connect_submission";
const CLERK_SHUTDOWN_SLO_MINUTES = 15;
const RELEASE_CONTROL_BEGIN = "<!-- CUT_OS_RELEASE_CONTROL_V2_BEGIN -->";
const RELEASE_CONTROL_END = "<!-- CUT_OS_RELEASE_CONTROL_V2_END -->";
// Keep this release-record ingress rule aligned with
// artifacts/api-server/src/lib/allowedHosts.ts.
const NON_PUBLIC_DNS_SUFFIXES = Object.freeze([
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
]);

const REQUIRED_RELEASE_SECTIONS = Object.freeze([
  "## Manifest control",
  "## Machine-verifiable release control",
  "## Candidate identity",
  "## Automated gates",
  "## Approval gates",
  "## Environment identity — non-secret aliases only",
  "## API limiter topology and live abuse gate",
  "## Clerk production proxy activation",
  "## Authentication recovery security",
  "## Database migration and recovery",
  "## Deployment identity and provenance",
  "## Approved legal publication",
  "## Staging smoke and QA",
  "## Production smoke",
  "## Monitoring and escalation",
  "## Rollback/roll-forward decision",
  "## TestFlight and App Review handoff",
  "## Post-commit decisions",
]);

const REQUIRED_CHECKED_CONTROLS = Object.freeze([
  "Git worktree was clean before build.",
  "No concurrent manual migration will run during API startup migration.",
  "Application-only rollback is forbidden after any completed database migration.",
]);
const UPLOAD_BEARING_CONTROL =
  "EAS upload ran from clean `BUILD_SHA` before post-build evidence changes.";
const STAGING_NO_UPLOAD_CONTROL =
  "No EAS upload occurred for this staging-only target.";
const CONFLICTING_HUMAN_OUTCOME =
  /\b(?:FAIL(?:ED|URE)?|BLOCK(?:ED|ING)?|REJECTED|DENIED|UNSUCCESSFUL|ABORTED|CANCELLED|CANCELED|WAIVED|NOT[\s_-]+(?:RUN|APPROVED|PASS(?:ED)?))\b/iu;

const REQUIRED_AUTOMATED_GATES = Object.freeze([
  "frozen_install",
  "high_severity_dependency_audit",
  "code_generation_drift",
  "typecheck",
  "release_operations_tests",
  "repository_tests",
  "app_store_artifact",
  "production_api_build",
  "database_generation_drift",
  "expo_doctor",
  "legal_hosting_fail_closed",
  "tracked_secret_boundary",
  "production_topology_dry_run",
  "production_release_config",
  "production_ios_export",
  "production_archive_secret_boundary",
]);

const REQUIRED_RELEASE_SAFETY_CHECKS = Object.freeze([
  "production_service_set",
  "limiter_live_abuse",
  "clerk_proxy_activation",
  "authentication_recovery",
  "approved_legal_publication",
  "app_store_exact_build_reconciliation",
]);

const REQUIRED_APPROVALS = Object.freeze([
  "paid_deployment_build",
  "eas_upload",
  "apple_seller_legal",
  "legal_support_publication",
  "privacy_app_privacy",
  "health_nutrition",
  "age_rating",
  "territories_availability",
  "regional_medical_device",
  "authentication_recovery",
  "subscription_product",
  "commercial_config",
  "app_store_server_notifications_decision",
  "accessibility_label_decision",
  "testflight_scope",
  "export_compliance",
]);

const OPTIONAL_APPROVAL_IDS = new Set([
  "paid_deployment_build",
  "regional_medical_device",
]);

const REQUIRED_STAGING_SMOKE_CHECKS = Object.freeze([
  "api_health",
  "api_readiness",
  "auth_guard",
  "public_status",
  "live_legal",
  "native_critical_qa",
  "sandbox_purchase_restore",
  "account_deletion",
  "resilience_shared_device",
  "accessibility",
]);

const REQUIRED_PRODUCTION_SMOKE_CHECKS = Object.freeze([
  "api_health",
  "api_readiness",
  "auth_guard",
  "public_status",
  "live_legal",
  "review_account_critical_flow",
]);

const REQUIRED_APP_REVIEW_ACCOUNT_IDS = Object.freeze([
  "fullAccess",
  "purchase",
  "adultGate",
  "restricted",
  "deletion",
]);

const MONITORING_SIGNAL_RULE_CONTRACTS = Object.freeze({
  api_liveness: Object.freeze({
    non200_count: Object.freeze({
      mode: "numeric",
      comparator: "greater_than_or_equal",
      unit: "count",
    }),
  }),
  api_readiness_latency: Object.freeze({
    non200_event: Object.freeze({ mode: "any_event" }),
    latency_ms: Object.freeze({
      mode: "numeric",
      comparator: "greater_than_or_equal",
      unit: "milliseconds",
    }),
  }),
  api_errors_latency: Object.freeze({
    five_xx_rate: Object.freeze({
      mode: "numeric",
      comparator: "greater_than_or_equal",
      unit: "percent",
    }),
    latency_ms: Object.freeze({
      mode: "numeric",
      comparator: "greater_than_or_equal",
      unit: "milliseconds",
    }),
  }),
  startup_migration: Object.freeze({
    startup_failure_event: Object.freeze({ mode: "any_event" }),
  }),
  auth_failures: Object.freeze({
    unexpected_error_rate: Object.freeze({
      mode: "numeric",
      comparator: "greater_than_or_equal",
      unit: "percent",
    }),
    auth_guard_failure_event: Object.freeze({ mode: "any_event" }),
  }),
  purchase_entitlement: Object.freeze({
    provider_error_event: Object.freeze({ mode: "any_event" }),
    entitlement_anomaly_event: Object.freeze({ mode: "any_event" }),
    purchase_restore_failure_rate: Object.freeze({
      mode: "numeric",
      comparator: "greater_than_or_equal",
      unit: "percent",
    }),
  }),
  account_deletion: Object.freeze({
    worker_failure_event: Object.freeze({ mode: "any_event" }),
    request_failure_rate: Object.freeze({
      mode: "numeric",
      comparator: "greater_than_or_equal",
      unit: "percent",
    }),
    pending_age_seconds: Object.freeze({
      mode: "numeric",
      comparator: "greater_than_or_equal",
      unit: "seconds",
    }),
    retry_count: Object.freeze({
      mode: "numeric",
      comparator: "greater_than_or_equal",
      unit: "count",
    }),
  }),
  database_backup: Object.freeze({
    pool_saturation_ratio: Object.freeze({
      mode: "numeric",
      comparator: "greater_than_or_equal",
      unit: "ratio",
    }),
    lock_wait_ms: Object.freeze({
      mode: "numeric",
      comparator: "greater_than_or_equal",
      unit: "milliseconds",
    }),
    storage_usage_ratio: Object.freeze({
      mode: "numeric",
      comparator: "greater_than_or_equal",
      unit: "ratio",
    }),
    replication_lag_seconds: Object.freeze({
      mode: "numeric",
      comparator: "greater_than_or_equal",
      unit: "seconds",
    }),
    backup_failure_event: Object.freeze({ mode: "any_event" }),
  }),
  mobile_crash_hang: Object.freeze({
    crash_hang_rate: Object.freeze({
      mode: "numeric",
      comparator: "greater_than_or_equal",
      unit: "percent",
    }),
    critical_flow_failure_rate: Object.freeze({
      mode: "numeric",
      comparator: "greater_than_or_equal",
      unit: "percent",
    }),
  }),
  legal_support: Object.freeze({
    resource_failure_event: Object.freeze({ mode: "any_event" }),
  }),
  privacy_security: Object.freeze({
    incident_event: Object.freeze({ mode: "any_event" }),
  }),
});

const REQUIRED_MONITORING_SIGNALS = Object.freeze(
  Object.keys(MONITORING_SIGNAL_RULE_CONTRACTS),
);

const MIGRATION_CLASSIFICATIONS = Object.freeze([
  "none",
  "additive",
  "state_changing",
  "destructive_incompatible",
]);

const MONITORING_THRESHOLD_MODES = Object.freeze(["numeric", "any_event"]);
const MONITORING_THRESHOLD_COMPARATORS = Object.freeze([
  "greater_than_or_equal",
  "less_than_or_equal",
]);
const MONITORING_THRESHOLD_UNITS = Object.freeze([
  "count",
  "percent",
  "ratio",
  "milliseconds",
  "seconds",
  "bytes",
]);
const MAX_MONITORING_WINDOW_SECONDS = 7 * 24 * 60 * 60;

export const POST_BUILD_MUTABLE_EVIDENCE_PATHS = Object.freeze([
  "app-store/app-store-connect-territories.json",
  "app-store/app-store-submission.json",
  SCREENSHOT_MANIFEST_PATH,
  TESTFLIGHT_RECORD_PATH,
]);

const SCREENSHOT_EVIDENCE_PATH =
  /^app-store\/screenshots\/files\/[A-Za-z0-9][A-Za-z0-9._-]{0,180}\.png$/u;
const RELEASE_MANIFEST_PATH =
  /^release-evidence\/[A-Za-z0-9][A-Za-z0-9._-]{0,180}\.md$/u;
const PUBLIC_RELEASE_MUTABLE_EVIDENCE_PATH =
  "app-store/app-store-submission.json";
const APP_STORE_RELEASE_TARGETS = new Set(["app_review", "public_release"]);
const REQUIRED_FINALIZED_LISTING_PATHS = Object.freeze([
  Object.freeze(["supportUrl", "/support"]),
  Object.freeze(["privacyPolicyUrl", "/privacy"]),
  Object.freeze(["termsUrl", "/terms"]),
]);

export class PostBuildEvidenceError extends Error {
  constructor(code) {
    super(`Post-build evidence verification failed: ${code}`);
    this.name = "PostBuildEvidenceError";
    this.code = code;
  }
}

function fail(code) {
  throw new PostBuildEvidenceError(code);
}

export function validateBuildSha(buildSha) {
  if (typeof buildSha !== "string" || !FULL_LOWERCASE_GIT_SHA.test(buildSha)) {
    fail("build_sha_must_be_full_lowercase_hex");
  }
  return buildSha;
}

function runGit(repoRoot, args, acceptedStatuses = [0]) {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: null,
    env: { ...process.env, GIT_NO_REPLACE_OBJECTS: "1" },
    maxBuffer: MAX_GIT_OUTPUT_BYTES,
  });
  if (
    result.error ||
    result.signal ||
    !acceptedStatuses.includes(result.status)
  ) {
    fail("git_command_failed");
  }
  return result;
}

function gitBlob(repoRoot, commit, relativePath) {
  return runGit(repoRoot, ["show", `${commit}:${relativePath}`]).stdout;
}

function databaseMigrationStateAtBuild(
  repoRoot,
  buildSha,
  code = "build_database_migration_identity_invalid",
) {
  try {
    const journalEntry = treeEntry(
      repoRoot,
      buildSha,
      DATABASE_MIGRATION_JOURNAL_PATH,
    );
    if (
      !journalEntry ||
      journalEntry.mode !== "100644" ||
      journalEntry.type !== "blob"
    ) {
      fail(code);
    }
    const journal = JSON.parse(
      gitBlob(repoRoot, buildSha, DATABASE_MIGRATION_JOURNAL_PATH).toString(
        "utf8",
      ),
    );
    if (!isRecord(journal) || !Array.isArray(journal.entries)) fail(code);
    if (journal.entries.length === 0) fail(code);

    let previousWhen = -1;
    const seenTags = new Set();
    for (const [index, entry] of journal.entries.entries()) {
      if (
        !isRecord(entry) ||
        entry.idx !== index ||
        !Number.isSafeInteger(entry.when) ||
        entry.when <= 0 ||
        entry.when <= previousWhen ||
        typeof entry.tag !== "string" ||
        !/^[A-Za-z0-9][A-Za-z0-9_-]{0,180}$/u.test(entry.tag) ||
        seenTags.has(entry.tag)
      ) {
        fail(code);
      }
      previousWhen = entry.when;
      seenTags.add(entry.tag);
    }

    const chain = journal.entries.map((entry) => {
      const migrationPath = `lib/db/migrations/${entry.tag}.sql`;
      const migrationEntry = treeEntry(repoRoot, buildSha, migrationPath);
      if (
        !migrationEntry ||
        migrationEntry.mode !== "100644" ||
        migrationEntry.type !== "blob"
      ) {
        fail(code);
      }
      const migrationBytes = gitBlob(repoRoot, buildSha, migrationPath);
      if (migrationBytes.length === 0) fail(code);
      return Object.freeze({
        tag: entry.tag,
        createdAt: entry.when,
        sha256: createHash("sha256").update(migrationBytes).digest("hex"),
      });
    });
    return Object.freeze({
      revision: chain.at(-1),
      chain: Object.freeze(chain),
    });
  } catch {
    fail(code);
  }
}

function derivePreviousProductionMigrationComparison({ declaredBaseline }) {
  const code = "previous_production_migration_baseline_invalid";
  if (!isRecord(declaredBaseline)) fail(code);

  if (declaredBaseline.state === "deployed") {
    fail("previous_production_migration_deployed_baseline_unsupported_v1");
  }
  if (
    declaredBaseline.state !== "initial_launch" ||
    declaredBaseline.productionApiRevision !== null ||
    declaredBaseline.buildGitSha !== null ||
    declaredBaseline.databaseMigrationRevision !== null
  ) {
    fail(code);
  }
  return Object.freeze({
    state: "initial_launch",
    productionApiRevision: null,
    buildGitSha: null,
    databaseMigrationRevision: null,
    hasNewMigrations: true,
  });
}

function parseJsonBlob(repoRoot, commit, relativePath, errorCode) {
  try {
    return JSON.parse(gitBlob(repoRoot, commit, relativePath).toString("utf8"));
  } catch (error) {
    if (error instanceof PostBuildEvidenceError) throw error;
    fail(errorCode);
  }
}

function parseNameStatus(output) {
  const tokens = output
    .toString("utf8")
    .split("\0")
    .filter((token) => token.length > 0);
  if (tokens.length % 2 !== 0) fail("git_output_invalid");
  const changes = [];
  for (let index = 0; index < tokens.length; index += 2) {
    const status = tokens[index];
    const changedPath = tokens[index + 1];
    if (!/^[AMDT]$/u.test(status) || changedPath.length === 0) {
      fail("git_output_invalid");
    }
    changes.push({ status, path: changedPath });
  }
  return changes;
}

function treeEntry(repoRoot, commit, relativePath) {
  const output = runGit(repoRoot, [
    "ls-tree",
    "-z",
    commit,
    "--",
    relativePath,
  ]).stdout;
  const entries = output
    .toString("utf8")
    .split("\0")
    .filter((entry) => entry.length > 0);
  if (entries.length === 0) return null;
  if (entries.length !== 1) fail("git_output_invalid");
  const separator = entries[0].indexOf("\t");
  if (separator === -1) fail("git_output_invalid");
  const [mode, type, objectId] = entries[0].slice(0, separator).split(" ");
  const returnedPath = entries[0].slice(separator + 1);
  if (
    returnedPath !== relativePath ||
    !mode ||
    !type ||
    !FULL_LOWERCASE_GIT_SHA.test(objectId ?? "")
  ) {
    fail("git_output_invalid");
  }
  return { mode, type, objectId };
}

function requireRegularBlob(entry) {
  if (!entry || entry.mode !== "100644" || entry.type !== "blob") {
    fail("post_build_evidence_must_be_regular_non_executable_file");
  }
}

export function validatePinnedRoutingBytes({ buildBytes, evidenceBytes }) {
  if (!Buffer.isBuffer(buildBytes) || !Buffer.isBuffer(evidenceBytes)) {
    fail("eas_json_unreadable");
  }
  if (!buildBytes.equals(evidenceBytes)) {
    fail("eas_json_changed_since_build");
  }

  let config;
  try {
    config = JSON.parse(evidenceBytes.toString("utf8"));
  } catch {
    fail("eas_json_invalid");
  }
  if (config?.cli?.requireCommit !== true) {
    fail("eas_cli_require_commit_not_enabled");
  }
  try {
    validateEasSubmitConfig(config);
  } catch (error) {
    if (error instanceof EasSubmitConfigurationError) fail(error.code);
    fail("eas_submit_routing_verification_failed");
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireExactKeys(value, expectedKeys, code) {
  if (!isRecord(value)) fail(code);
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  if (
    actualKeys.length !== sortedExpectedKeys.length ||
    actualKeys.some((key, index) => key !== sortedExpectedKeys[index])
  ) {
    fail(code);
  }
}

function isUtcTimestamp(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(value)
  ) {
    return false;
  }
  const parsed = new Date(value);
  return (
    Number.isFinite(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 19) === value.slice(0, 19)
  );
}

function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function currentTimeMilliseconds(clock) {
  try {
    const value = typeof clock === "function" ? clock() : clock;
    const milliseconds =
      value instanceof Date ? value.getTime() : Date.parse(value);
    return Number.isFinite(milliseconds) ? milliseconds : Number.NaN;
  } catch {
    return Number.NaN;
  }
}

function isNotApplicable(value) {
  return (
    typeof value === "string" &&
    /^N\/A\s+—\s+\S[\s\S]*\s+—\s+\S[\s\S]*$/u.test(value.trim())
  );
}

function isResolvedText(value, { allowNotApplicable = false } = {}) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (
    trimmed.length === 0 ||
    trimmed.length > 2048 ||
    /[\u0000-\u001f\u007f]/u.test(trimmed)
  ) {
    return false;
  }
  if (/^N\/A\b/iu.test(trimmed)) {
    return allowNotApplicable && isNotApplicable(trimmed);
  }
  return !/^(?:none|pending|tbd|todo|unknown)$/iu.test(trimmed);
}

function isExactNonSecretProviderIdentifier(value) {
  return (
    isResolvedText(value) && /^[A-Za-z0-9][A-Za-z0-9._-]{0,255}$/u.test(value)
  );
}

function isValidPublicDnsHostname(hostname) {
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

function canonicalHttpsOrigin(value) {
  if (typeof value !== "string") return null;
  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== "https:" ||
      parsed.username !== "" ||
      parsed.password !== "" ||
      parsed.port !== "" ||
      parsed.pathname !== "/" ||
      parsed.search !== "" ||
      parsed.hash !== "" ||
      parsed.origin !== value ||
      !isValidPublicDnsHostname(parsed.hostname)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function validateReplitProductionHosting(value) {
  const code = "release_manifest_replit_hosting_identity_invalid";
  requireExactKeys(
    value,
    [
      "provider",
      "accountAlias",
      "workspaceId",
      "deploymentId",
      "databaseId",
      "providerDeploymentOrigin",
      "publicOrigin",
      "deploymentType",
      "region",
      "machineClass",
      "minimumInstances",
      "maximumInstances",
      "fixedMonthlyCostUsdCentsBeforeTax",
      "usageBasedServiceShutdownLimitUsdCentsBeforeTax",
      "approvedMonthlyCostCeilingUsdCentsBeforeTax",
      "costApprovedBy",
      "costApprovedAtUtc",
      "costApprovalEvidenceReference",
      "configurationVerifiedAtUtc",
      "configurationEvidenceReference",
    ],
    code,
  );

  const providerOrigin = canonicalHttpsOrigin(value.providerDeploymentOrigin);
  const publicOrigin = canonicalHttpsOrigin(value.publicOrigin);
  const fixedMonthlyCost = value.fixedMonthlyCostUsdCentsBeforeTax;
  const usageShutdownLimit =
    value.usageBasedServiceShutdownLimitUsdCentsBeforeTax;
  const approvedMonthlyCeiling =
    value.approvedMonthlyCostCeilingUsdCentsBeforeTax;
  if (
    value.provider !== "replit" ||
    ![
      value.accountAlias,
      value.workspaceId,
      value.deploymentId,
      value.databaseId,
    ].every(isExactNonSecretProviderIdentifier) ||
    providerOrigin === null ||
    !providerOrigin.hostname.endsWith(".replit.app") ||
    publicOrigin === null ||
    value.deploymentType !== "reserved_vm" ||
    !isResolvedText(value.region) ||
    !isResolvedText(value.machineClass) ||
    value.minimumInstances !== 1 ||
    value.maximumInstances !== 1 ||
    !Number.isSafeInteger(fixedMonthlyCost) ||
    fixedMonthlyCost <= 0 ||
    !Number.isSafeInteger(usageShutdownLimit) ||
    usageShutdownLimit < 0 ||
    !Number.isSafeInteger(approvedMonthlyCeiling) ||
    approvedMonthlyCeiling <= 0 ||
    fixedMonthlyCost + usageShutdownLimit > approvedMonthlyCeiling ||
    !isResolvedText(value.costApprovedBy) ||
    !isUtcTimestamp(value.costApprovedAtUtc) ||
    !isResolvedText(value.costApprovalEvidenceReference) ||
    !isUtcTimestamp(value.configurationVerifiedAtUtc) ||
    !isResolvedText(value.configurationEvidenceReference)
  ) {
    fail(code);
  }
}

function validateFinalizedListingOriginBinding(submission, publicOrigin) {
  const code = "release_manifest_listing_origin_binding_invalid";
  if (!isRecord(submission) || !isRecord(submission.listing)) fail(code);
  for (const [field, pathname] of REQUIRED_FINALIZED_LISTING_PATHS) {
    if (submission.listing[field] !== `${publicOrigin}${pathname}`) fail(code);
  }
}

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function requireExactRecordMap(value, requiredIds, code) {
  requireExactKeys(value, requiredIds, code);
  return value;
}

function validatePassingEvidence(value, invalidCode) {
  requireExactKeys(
    value,
    ["status", "atUtc", "evidenceReference"],
    invalidCode,
  );
  if (value.status !== "PASS") {
    fail("release_manifest_critical_check_not_pass");
  }
  if (
    !isUtcTimestamp(value.atUtc) ||
    !isResolvedText(value.evidenceReference)
  ) {
    fail(invalidCode);
  }
}

function validateApproval(value, { allowNotApplicable = false } = {}) {
  const code = "release_manifest_approval_invalid";
  requireExactKeys(
    value,
    [
      "decision",
      "approver",
      "atUtc",
      "evidenceReference",
      "notApplicableReason",
    ],
    code,
  );
  if (!isResolvedText(value.approver) || !isUtcTimestamp(value.atUtc)) {
    fail(code);
  }
  if (!isResolvedText(value.evidenceReference)) fail(code);

  if (value.decision === "APPROVED") {
    if (value.notApplicableReason !== null) fail(code);
    return;
  }
  if (
    value.decision === "NOT_APPLICABLE" &&
    allowNotApplicable &&
    isResolvedText(value.notApplicableReason)
  ) {
    return;
  }
  fail("release_manifest_approval_not_approved");
}

function validateMigrationClassification(value, code) {
  requireExactKeys(
    value,
    ["class", "classifiedBy", "atUtc", "evidenceReference"],
    code,
  );
  if (
    !MIGRATION_CLASSIFICATIONS.includes(value.class) ||
    !isResolvedText(value.classifiedBy) ||
    !isUtcTimestamp(value.atUtc) ||
    !isResolvedText(value.evidenceReference)
  ) {
    fail(code);
  }
}

function validatePreviousProductionMigration(
  value,
  expectedMigrationComparison,
) {
  const code = "release_manifest_previous_production_migration_invalid";
  requireExactKeys(
    value,
    [
      "state",
      "productionApiRevision",
      "buildGitSha",
      "databaseMigrationRevision",
      "verifiedBy",
      "verifiedAtUtc",
      "evidenceReference",
    ],
    code,
  );
  if (
    value.state === "deployed" ||
    expectedMigrationComparison?.state === "deployed"
  ) {
    fail("previous_production_migration_deployed_baseline_unsupported_v1");
  }
  if (
    !isRecord(expectedMigrationComparison) ||
    expectedMigrationComparison.state !== "initial_launch" ||
    expectedMigrationComparison.hasNewMigrations !== true ||
    !isResolvedText(value.verifiedBy) ||
    !isUtcTimestamp(value.verifiedAtUtc) ||
    !isResolvedText(value.evidenceReference) ||
    !isDeepStrictEqual(
      {
        state: value.state,
        productionApiRevision: value.productionApiRevision,
        buildGitSha: value.buildGitSha,
        databaseMigrationRevision: value.databaseMigrationRevision,
      },
      {
        state: expectedMigrationComparison.state,
        productionApiRevision:
          expectedMigrationComparison.productionApiRevision,
        buildGitSha: expectedMigrationComparison.buildGitSha,
        databaseMigrationRevision:
          expectedMigrationComparison.databaseMigrationRevision,
      },
    )
  ) {
    fail(code);
  }
}

function validateNumericMonitoringBoundary(value, code) {
  requireExactKeys(
    value,
    ["comparator", "value", "unit", "windowSeconds"],
    code,
  );
  if (
    !MONITORING_THRESHOLD_COMPARATORS.includes(value.comparator) ||
    !Number.isFinite(value.value) ||
    value.value < 0 ||
    !MONITORING_THRESHOLD_UNITS.includes(value.unit) ||
    !Number.isSafeInteger(value.windowSeconds) ||
    value.windowSeconds <= 0 ||
    value.windowSeconds > MAX_MONITORING_WINDOW_SECONDS ||
    (value.unit === "percent" && value.value > 100) ||
    (value.unit === "ratio" && value.value > 1)
  ) {
    fail(code);
  }
}

function validateMonitoringThresholds(value, { contract, code }) {
  requireExactKeys(value, ["mode", "warning", "critical"], code);
  if (
    !MONITORING_THRESHOLD_MODES.includes(value.mode) ||
    value.mode !== contract.mode
  ) {
    fail(code);
  }

  if (value.mode === "any_event") {
    if (value.warning !== null || value.critical !== null) fail(code);
    return;
  }

  validateNumericMonitoringBoundary(value.warning, code);
  validateNumericMonitoringBoundary(value.critical, code);
  if (
    value.warning.comparator !== contract.comparator ||
    value.warning.unit !== contract.unit ||
    value.warning.comparator !== value.critical.comparator ||
    value.warning.unit !== value.critical.unit ||
    value.warning.windowSeconds !== value.critical.windowSeconds
  ) {
    fail(code);
  }

  const ordered =
    value.warning.comparator === "greater_than_or_equal"
      ? value.critical.value > value.warning.value
      : value.critical.value < value.warning.value;
  if (!ordered) fail(code);
}

function validateMonitoringRules(value, { signalId, code }) {
  const contracts = MONITORING_SIGNAL_RULE_CONTRACTS[signalId];
  const rules = requireExactRecordMap(value, Object.keys(contracts), code);
  for (const [ruleId, thresholds] of Object.entries(rules)) {
    validateMonitoringThresholds(thresholds, {
      contract: contracts[ruleId],
      code,
    });
  }
}

function parseReleaseControl(manifest) {
  const begin = manifest.indexOf(RELEASE_CONTROL_BEGIN);
  const end = manifest.indexOf(RELEASE_CONTROL_END);
  if (
    begin === -1 ||
    end === -1 ||
    begin !== manifest.lastIndexOf(RELEASE_CONTROL_BEGIN) ||
    end !== manifest.lastIndexOf(RELEASE_CONTROL_END) ||
    end <= begin
  ) {
    fail("release_manifest_control_missing");
  }

  const block = manifest.slice(begin + RELEASE_CONTROL_BEGIN.length, end);
  const fencedJson = block.match(/^\s*```json\s*\r?\n([\s\S]*?)\r?\n```\s*$/u);
  if (!fencedJson) fail("release_manifest_control_invalid");
  try {
    const control = JSON.parse(fencedJson[1]);
    if (fencedJson[1] !== JSON.stringify(control, null, 2)) {
      fail("release_manifest_control_invalid");
    }
    return control;
  } catch {
    fail("release_manifest_control_invalid");
  }
}

function validatePreBuildReleaseManifestDraft({
  manifestBytes,
  expectedReleaseId,
  expectedTarget,
}) {
  const code = "release_manifest_build_draft_invalid";
  if (
    !Buffer.isBuffer(manifestBytes) ||
    manifestBytes.length === 0 ||
    manifestBytes.length > MAX_RELEASE_MANIFEST_BYTES
  ) {
    fail(code);
  }
  let manifest;
  try {
    manifest = new TextDecoder("utf-8", { fatal: true }).decode(manifestBytes);
  } catch {
    fail(code);
  }
  if (
    manifest.startsWith("\uFEFF") ||
    manifest.includes("\r") ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(manifest)
  ) {
    fail(code);
  }
  const withoutComments = manifest.replace(/<!--[\s\S]*?-->/gu, "");
  if (
    [...withoutComments.matchAll(/^- Manifest status: `DRAFT`\s*$/gmu)]
      .length !== 1 ||
    /^- Manifest status: `FINAL`\s*$/mu.test(withoutComments)
  ) {
    fail(code);
  }
  let control;
  try {
    control = parseReleaseControl(manifest);
  } catch {
    fail(code);
  }
  if (
    control?.schemaVersion !== 2 ||
    control?.status !== "DRAFT" ||
    control?.releaseId !== expectedReleaseId ||
    control?.target !== expectedTarget
  ) {
    fail(code);
  }
}

function releaseManifestPathsAtCommit(repoRoot, commit) {
  const paths = runGit(repoRoot, [
    "ls-tree",
    "-r",
    "-z",
    "--name-only",
    commit,
    "--",
    "release-evidence",
  ])
    .stdout.toString("utf8")
    .split("\0")
    .filter((candidate) => RELEASE_MANIFEST_PATH.test(candidate));
  if (new Set(paths).size !== paths.length) fail("git_output_invalid");
  return paths;
}

function isMatchingPreBuildDraft({
  repoRoot,
  buildSha,
  manifestPath,
  expectedReleaseId,
  expectedTarget,
}) {
  let manifestBytes;
  let manifest;
  let control;
  try {
    manifestBytes = gitBlob(repoRoot, buildSha, manifestPath);
    manifest = new TextDecoder("utf-8", { fatal: true }).decode(manifestBytes);
    control = parseReleaseControl(manifest);
  } catch {
    return false;
  }
  if (
    control?.releaseId !== expectedReleaseId ||
    control?.target !== expectedTarget
  ) {
    return false;
  }
  const entry = treeEntry(repoRoot, buildSha, manifestPath);
  if (
    !entry ||
    entry.mode !== "100644" ||
    entry.type !== "blob" ||
    treeEntry(repoRoot, buildSha, `${manifestPath}.sha256`) !== null
  ) {
    fail("app_review_paired_public_release_draft_invalid");
  }
  try {
    validatePreBuildReleaseManifestDraft({
      manifestBytes,
      expectedReleaseId,
      expectedTarget,
    });
  } catch {
    fail("app_review_paired_public_release_draft_invalid");
  }
  return true;
}

function validatePairedPublicReleaseDraft({
  repoRoot,
  buildSha,
  appReviewManifestPath,
  releaseId,
}) {
  const matchingPaths = releaseManifestPathsAtCommit(repoRoot, buildSha).filter(
    (manifestPath) =>
      manifestPath !== appReviewManifestPath &&
      isMatchingPreBuildDraft({
        repoRoot,
        buildSha,
        manifestPath,
        expectedReleaseId: releaseId,
        expectedTarget: "public_release",
      }),
  );
  if (matchingPaths.length !== 1) {
    fail("app_review_paired_public_release_draft_invalid");
  }
}

function validateManifestMarkdown(manifest, expectedBuildSha, target) {
  const withoutComments = manifest.replace(/<!--[\s\S]*?-->/gu, "");
  if (!/^- Manifest status: `FINAL`\s*$/mu.test(withoutComments)) {
    fail("release_manifest_not_final");
  }

  for (const heading of REQUIRED_RELEASE_SECTIONS) {
    const headingPattern = new RegExp(
      `^${escapeRegularExpression(heading)}\\s*$`,
      "gmu",
    );
    if ([...withoutComments.matchAll(headingPattern)].length !== 1) {
      fail("release_manifest_required_section_missing");
    }
  }

  if (/^- \[ \] /mu.test(withoutComments)) {
    fail("release_manifest_required_control_unchecked");
  }
  for (const label of REQUIRED_CHECKED_CONTROLS) {
    const controlPattern = new RegExp(
      `^- \\[[xX]\\] ${escapeRegularExpression(label)}\\s*$`,
      "mu",
    );
    if (!controlPattern.test(withoutComments)) {
      fail("release_manifest_required_control_unchecked");
    }
  }
  const uploadBearingPattern = new RegExp(
    `^- \\[[xX]\\] ${escapeRegularExpression(UPLOAD_BEARING_CONTROL)}\\s*$`,
    "gmu",
  );
  const stagingNoUploadPattern = new RegExp(
    `^- \\[[xX]\\] ${escapeRegularExpression(STAGING_NO_UPLOAD_CONTROL)}\\s*$`,
    "gmu",
  );
  const uploadBearingCount = [...withoutComments.matchAll(uploadBearingPattern)]
    .length;
  const stagingNoUploadCount = [
    ...withoutComments.matchAll(stagingNoUploadPattern),
  ].length;
  if (
    (target === "staging" &&
      (stagingNoUploadCount !== 1 || uploadBearingCount !== 0)) ||
    (target !== "staging" &&
      (uploadBearingCount !== 1 || stagingNoUploadCount !== 0))
  ) {
    fail("release_manifest_required_control_unchecked");
  }

  if (/<[^>\r\n]+>/u.test(withoutComments)) {
    fail("release_manifest_unresolved_placeholder");
  }
  if (/\b(?:TBD|TODO|PENDING|UNKNOWN)\b/iu.test(withoutComments)) {
    fail("release_manifest_unresolved_placeholder");
  }
  const controlStart = manifest.indexOf(RELEASE_CONTROL_BEGIN);
  const controlEnd = manifest.indexOf(RELEASE_CONTROL_END);
  const markdownOutsideControl =
    `${manifest.slice(0, controlStart)}${manifest.slice(
      controlEnd + RELEASE_CONTROL_END.length,
    )}`.replace(/<!--[\s\S]*?-->/gu, "");
  if (CONFLICTING_HUMAN_OUTCOME.test(markdownOutsideControl)) {
    fail("release_manifest_conflicting_human_outcome");
  }
  const escapedBuildSha = escapeRegularExpression(expectedBuildSha);
  const candidateBuildSha = new RegExp(
    `^- BUILD_SHA — source/routing/build/upload commit: \`?${escapedBuildSha}\`?\\s*$`,
    "mu",
  );
  const handoffBuildSha = new RegExp(
    `^- BUILD_SHA: \`?${escapedBuildSha}\`?\\s*$`,
    "mu",
  );
  if (
    !candidateBuildSha.test(withoutComments) ||
    !handoffBuildSha.test(withoutComments)
  ) {
    fail("release_manifest_build_identity_mismatch");
  }
}

function validateReleaseControl(
  control,
  expectedBuildSha,
  exactBuildEvidence,
  expectedDatabaseMigrationRevision,
  expectedMigrationComparison,
  validationTimeMilliseconds,
) {
  const controlCode = "release_manifest_control_invalid";
  requireExactKeys(
    control,
    [
      "schemaVersion",
      "status",
      "releaseId",
      "target",
      "createdAtUtc",
      "finalizedAtUtc",
      "releaseLead",
      "businessOwner",
      "build",
      "deployments",
      "automatedGates",
      "releaseSafetyChecks",
      "approvals",
      "backupRecovery",
      "smoke",
      "monitoring",
      "rollback",
    ],
    controlCode,
  );
  if (
    control.schemaVersion !== 2 ||
    control.status !== "FINAL" ||
    !isResolvedText(control.releaseId) ||
    ![
      "staging",
      "internal_testflight",
      "app_review",
      "public_release",
    ].includes(control.target) ||
    !isUtcTimestamp(control.createdAtUtc) ||
    !isUtcTimestamp(control.finalizedAtUtc) ||
    Date.parse(control.finalizedAtUtc) < Date.parse(control.createdAtUtc) ||
    !isResolvedText(control.releaseLead) ||
    !isResolvedText(control.businessOwner)
  ) {
    fail(controlCode);
  }
  if (Date.parse(control.finalizedAtUtc) > validationTimeMilliseconds) {
    fail("release_manifest_finalization_in_future");
  }

  const buildCode = "release_manifest_build_identity_mismatch";
  requireExactKeys(
    control.build,
    ["gitSha", "appVersion", "appleBuildNumber"],
    buildCode,
  );
  if (
    control.build.gitSha !== expectedBuildSha ||
    control.build.appVersion !== exactBuildEvidence?.appVersion ||
    control.build.appleBuildNumber !== exactBuildEvidence?.buildNumber
  ) {
    fail(buildCode);
  }

  const deploymentCode = "release_manifest_deployment_identity_mismatch";
  requireExactKeys(
    control.deployments,
    [
      "stagingApiRevision",
      "productionApiRevision",
      "previousProductionApiRevision",
      "publicLegalRevision",
      "previousPublicLegalRevision",
      "databaseMigrationRevision",
      "previousProductionMigration",
      "replitProductionHosting",
      "easBuildId",
      "appStoreConnectBuildId",
    ],
    deploymentCode,
  );
  for (const field of [
    "stagingApiRevision",
    "productionApiRevision",
    "publicLegalRevision",
    "easBuildId",
    "appStoreConnectBuildId",
  ]) {
    if (!isResolvedText(control.deployments[field])) fail(deploymentCode);
  }
  requireExactKeys(
    control.deployments.databaseMigrationRevision,
    ["tag", "createdAt", "sha256"],
    "release_manifest_database_migration_identity_mismatch",
  );
  if (
    !isRecord(expectedDatabaseMigrationRevision) ||
    !isDeepStrictEqual(
      control.deployments.databaseMigrationRevision,
      expectedDatabaseMigrationRevision,
    )
  ) {
    fail("release_manifest_database_migration_identity_mismatch");
  }
  validatePreviousProductionMigration(
    control.deployments.previousProductionMigration,
    expectedMigrationComparison,
  );
  validateReplitProductionHosting(control.deployments.replitProductionHosting);
  for (const field of [
    "previousProductionApiRevision",
    "previousPublicLegalRevision",
  ]) {
    if (
      !isResolvedText(control.deployments[field], {
        allowNotApplicable: true,
      })
    ) {
      fail(deploymentCode);
    }
  }
  if (
    control.deployments.easBuildId !== exactBuildEvidence?.easBuildId ||
    control.deployments.appStoreConnectBuildId !==
      exactBuildEvidence?.appStoreConnectBuildId ||
    control.deployments.stagingApiRevision ===
      control.deployments.productionApiRevision ||
    (!isNotApplicable(control.deployments.previousProductionApiRevision) &&
      control.deployments.previousProductionApiRevision ===
        control.deployments.productionApiRevision) ||
    (!isNotApplicable(control.deployments.previousPublicLegalRevision) &&
      control.deployments.previousPublicLegalRevision ===
        control.deployments.publicLegalRevision)
  ) {
    fail(deploymentCode);
  }
  if (
    control.deployments.productionApiRevision !==
      control.deployments.publicLegalRevision ||
    control.deployments.previousProductionApiRevision !==
      control.deployments.previousPublicLegalRevision
  ) {
    fail("release_manifest_single_host_revision_mismatch");
  }
  const previousMigrationState =
    control.deployments.previousProductionMigration.state;
  const baselineProductionApiRevision =
    control.deployments.previousProductionMigration.productionApiRevision;
  const previousRevisionIsNotApplicable = isNotApplicable(
    control.deployments.previousProductionApiRevision,
  );
  if (
    (previousMigrationState === "initial_launch" &&
      (!previousRevisionIsNotApplicable ||
        baselineProductionApiRevision !== null)) ||
    (previousMigrationState === "deployed" &&
      (previousRevisionIsNotApplicable ||
        baselineProductionApiRevision !==
          control.deployments.previousProductionApiRevision))
  ) {
    fail("release_manifest_previous_production_migration_state_mismatch");
  }

  const automatedGates = requireExactRecordMap(
    control.automatedGates,
    REQUIRED_AUTOMATED_GATES,
    "release_manifest_automated_gates_invalid",
  );
  for (const gate of Object.values(automatedGates)) {
    validatePassingEvidence(gate, "release_manifest_automated_gates_invalid");
  }

  const releaseSafetyChecks = requireExactRecordMap(
    control.releaseSafetyChecks,
    REQUIRED_RELEASE_SAFETY_CHECKS,
    "release_manifest_release_safety_invalid",
  );
  for (const safetyCheck of Object.values(releaseSafetyChecks)) {
    validatePassingEvidence(
      safetyCheck,
      "release_manifest_release_safety_invalid",
    );
  }

  const approvals = requireExactRecordMap(
    control.approvals,
    REQUIRED_APPROVALS,
    "release_manifest_approval_invalid",
  );
  for (const [id, approval] of Object.entries(approvals)) {
    validateApproval(approval, {
      allowNotApplicable:
        OPTIONAL_APPROVAL_IDS.has(id) ||
        (id === "eas_upload" && control.target === "staging"),
    });
  }

  const backupCode = "release_manifest_backup_recovery_invalid";
  requireExactKeys(
    control.backupRecovery,
    [
      "migrationClassification",
      "migrationRehearsal",
      "databaseReadiness",
      "productionMigrationWindow",
      "writesQuiesced",
      "backupCoverageAtUtc",
      "backupEvidenceReference",
      "recoveryPoint",
      "restoreDrillAtUtc",
      "restoreDrillEvidenceReference",
      "rpo",
      "rto",
      "recoveryApproval",
      "previousApiCompatible",
      "previousApiCompatibilityEvidenceReference",
      "rollForwardProcedure",
      "coordinatedRestoreProcedure",
      "recoveryOwner",
      "noConcurrentMigrationConfirmed",
      "schemaRollbackPolicyConfirmed",
    ],
    backupCode,
  );
  validateMigrationClassification(
    control.backupRecovery.migrationClassification,
    backupCode,
  );
  validatePassingEvidence(
    control.backupRecovery.migrationRehearsal,
    backupCode,
  );
  validatePassingEvidence(control.backupRecovery.databaseReadiness, backupCode);
  const migrationWindowCode =
    "release_manifest_production_migration_window_invalid";
  requireExactKeys(
    control.backupRecovery.productionMigrationWindow,
    [
      "productionApiRevision",
      "buildGitSha",
      "databaseId",
      "databaseMigrationRevision",
      "startedAtUtc",
      "completedAtUtc",
      "evidenceReference",
    ],
    migrationWindowCode,
  );
  requireExactKeys(
    control.backupRecovery.writesQuiesced,
    ["mode", "atUtc", "verifiedBy", "evidenceReference"],
    backupCode,
  );
  validatePassingEvidence(
    control.backupRecovery.rollForwardProcedure,
    backupCode,
  );
  validatePassingEvidence(
    control.backupRecovery.coordinatedRestoreProcedure,
    backupCode,
  );
  validateApproval(control.backupRecovery.recoveryApproval);
  requireExactKeys(
    control.backupRecovery.recoveryPoint,
    ["atUtc", "evidenceReference"],
    backupCode,
  );
  const migrationClass = control.backupRecovery.migrationClassification.class;
  if (migrationClass !== "destructive_incompatible") {
    fail("release_manifest_migration_classification_mismatch");
  }
  const writesQuiescedAt = Date.parse(
    control.backupRecovery.writesQuiesced.atUtc,
  );
  const backupCoverage = Date.parse(control.backupRecovery.backupCoverageAtUtc);
  const recoveryPoint = Date.parse(control.backupRecovery.recoveryPoint.atUtc);
  const productionMigrationStarted = Date.parse(
    control.backupRecovery.productionMigrationWindow.startedAtUtc,
  );
  const productionMigrationCompleted = Date.parse(
    control.backupRecovery.productionMigrationWindow.completedAtUtc,
  );
  const databaseReadinessAt = Date.parse(
    control.backupRecovery.databaseReadiness.atUtc,
  );
  if (
    !isUtcTimestamp(
      control.backupRecovery.productionMigrationWindow.startedAtUtc,
    ) ||
    !isUtcTimestamp(
      control.backupRecovery.productionMigrationWindow.completedAtUtc,
    ) ||
    !isResolvedText(
      control.backupRecovery.productionMigrationWindow.evidenceReference,
    ) ||
    control.backupRecovery.productionMigrationWindow.productionApiRevision !==
      control.deployments.productionApiRevision ||
    control.backupRecovery.productionMigrationWindow.buildGitSha !==
      expectedBuildSha ||
    control.backupRecovery.productionMigrationWindow.databaseId !==
      control.deployments.replitProductionHosting.databaseId ||
    !isDeepStrictEqual(
      control.backupRecovery.productionMigrationWindow
        .databaseMigrationRevision,
      expectedDatabaseMigrationRevision,
    ) ||
    backupCoverage >= productionMigrationStarted ||
    productionMigrationStarted > productionMigrationCompleted ||
    productionMigrationCompleted > databaseReadinessAt
  ) {
    fail(migrationWindowCode);
  }
  if (
    control.backupRecovery.writesQuiesced.mode !==
      "initial_launch_no_prior_writes" ||
    !isUtcTimestamp(control.backupRecovery.writesQuiesced.atUtc) ||
    !isResolvedText(control.backupRecovery.writesQuiesced.verifiedBy) ||
    !isResolvedText(control.backupRecovery.writesQuiesced.evidenceReference) ||
    !isUtcTimestamp(control.backupRecovery.backupCoverageAtUtc) ||
    !isResolvedText(control.backupRecovery.backupEvidenceReference) ||
    !isUtcTimestamp(control.backupRecovery.recoveryPoint.atUtc) ||
    !isResolvedText(control.backupRecovery.recoveryPoint.evidenceReference) ||
    !isUtcTimestamp(control.backupRecovery.restoreDrillAtUtc) ||
    !isResolvedText(control.backupRecovery.restoreDrillEvidenceReference) ||
    !isResolvedText(control.backupRecovery.rpo) ||
    !isResolvedText(control.backupRecovery.rto) ||
    typeof control.backupRecovery.previousApiCompatible !== "boolean" ||
    !isResolvedText(
      control.backupRecovery.previousApiCompatibilityEvidenceReference,
    ) ||
    !isResolvedText(control.backupRecovery.recoveryOwner) ||
    control.backupRecovery.noConcurrentMigrationConfirmed !== true ||
    control.backupRecovery.schemaRollbackPolicyConfirmed !== true ||
    backupCoverage <= writesQuiescedAt ||
    recoveryPoint <= writesQuiescedAt ||
    recoveryPoint > backupCoverage ||
    Date.parse(control.backupRecovery.recoveryApproval.atUtc) <=
      recoveryPoint ||
    control.backupRecovery.previousApiCompatible !== false ||
    control.backupRecovery.rollForwardProcedure.evidenceReference ===
      control.backupRecovery.coordinatedRestoreProcedure.evidenceReference
  ) {
    fail(backupCode);
  }
  const preMigrationRecoveryEvidenceTimestamps = [
    control.deployments.previousProductionMigration.verifiedAtUtc,
    control.backupRecovery.migrationClassification.atUtc,
    control.backupRecovery.migrationRehearsal.atUtc,
    control.backupRecovery.restoreDrillAtUtc,
    control.backupRecovery.recoveryApproval.atUtc,
    control.backupRecovery.rollForwardProcedure.atUtc,
    control.backupRecovery.coordinatedRestoreProcedure.atUtc,
  ];
  if (
    preMigrationRecoveryEvidenceTimestamps.some(
      (timestamp) => Date.parse(timestamp) > productionMigrationStarted,
    )
  ) {
    fail("release_manifest_pre_migration_recovery_evidence_late");
  }

  const smokeCode = "release_manifest_smoke_evidence_invalid";
  requireExactKeys(control.smoke, ["staging", "production"], smokeCode);
  const stagingSmoke = requireExactRecordMap(
    control.smoke.staging,
    REQUIRED_STAGING_SMOKE_CHECKS,
    smokeCode,
  );
  const productionSmoke = requireExactRecordMap(
    control.smoke.production,
    REQUIRED_PRODUCTION_SMOKE_CHECKS,
    smokeCode,
  );
  for (const smokeCheck of [
    ...Object.values(stagingSmoke),
    ...Object.values(productionSmoke),
  ]) {
    validatePassingEvidence(smokeCheck, smokeCode);
  }
  if (
    productionMigrationCompleted >
    Date.parse(control.smoke.production.api_readiness.atUtc)
  ) {
    fail(migrationWindowCode);
  }

  const monitoringCode = "release_manifest_monitoring_invalid";
  requireExactKeys(
    control.monitoring,
    [
      "signals",
      "escalationEvidenceReference",
      "retentionEvidenceReference",
      "coverage",
    ],
    monitoringCode,
  );
  const signals = requireExactRecordMap(
    control.monitoring.signals,
    REQUIRED_MONITORING_SIGNALS,
    monitoringCode,
  );
  for (const [signalId, signal] of Object.entries(signals)) {
    requireExactKeys(
      signal,
      [
        "rules",
        "destination",
        "primaryOwner",
        "backupOwner",
        "baselineEvidenceReference",
        "approval",
        "alertTest",
      ],
      monitoringCode,
    );
    if (
      ![
        signal.destination,
        signal.primaryOwner,
        signal.backupOwner,
        signal.baselineEvidenceReference,
      ].every((value) => isResolvedText(value)) ||
      signal.primaryOwner === signal.backupOwner
    ) {
      fail(monitoringCode);
    }
    validateMonitoringRules(signal.rules, {
      signalId,
      code: monitoringCode,
    });
    validateApproval(signal.approval);
    validatePassingEvidence(signal.alertTest, monitoringCode);
  }
  requireExactKeys(
    control.monitoring.coverage,
    ["status", "confirmedBy", "atUtc", "evidenceReference"],
    monitoringCode,
  );
  if (control.monitoring.coverage.status !== "PASS") {
    fail("release_manifest_critical_check_not_pass");
  }
  if (
    !isResolvedText(control.monitoring.escalationEvidenceReference) ||
    !isResolvedText(control.monitoring.retentionEvidenceReference) ||
    !isResolvedText(control.monitoring.coverage.confirmedBy) ||
    !isUtcTimestamp(control.monitoring.coverage.atUtc) ||
    !isResolvedText(control.monitoring.coverage.evidenceReference)
  ) {
    fail(monitoringCode);
  }

  const rollbackCode = "release_manifest_rollback_invalid";
  requireExactKeys(
    control.rollback,
    [
      "promotionDecision",
      "selectedPath",
      "decisionOwner",
      "decisionAtUtc",
      "schemaSafetyEvidenceReference",
      "previousApplicationRevision",
      "previousPublicLegalRevision",
      "databaseRecoveryPointReference",
      "runbookReference",
      "postActionProbes",
    ],
    rollbackCode,
  );
  if (control.rollback.promotionDecision !== "PASS") {
    fail("release_manifest_critical_check_not_pass");
  }
  if (
    control.rollback.selectedPath !== "NO_ACTION_HEALTHY" ||
    !isResolvedText(control.rollback.decisionOwner) ||
    !isUtcTimestamp(control.rollback.decisionAtUtc) ||
    !isResolvedText(control.rollback.schemaSafetyEvidenceReference) ||
    control.rollback.schemaSafetyEvidenceReference !==
      control.backupRecovery.previousApiCompatibilityEvidenceReference ||
    control.rollback.previousApplicationRevision !==
      control.deployments.previousProductionApiRevision ||
    control.rollback.previousPublicLegalRevision !==
      control.deployments.previousPublicLegalRevision ||
    !isResolvedText(control.rollback.databaseRecoveryPointReference) ||
    control.rollback.databaseRecoveryPointReference !==
      control.backupRecovery.recoveryPoint.evidenceReference ||
    !isResolvedText(control.rollback.runbookReference) ||
    Date.parse(control.rollback.decisionAtUtc) < productionMigrationCompleted
  ) {
    fail(rollbackCode);
  }
  validatePassingEvidence(control.rollback.postActionProbes, rollbackCode);

  const finalizedAt = Date.parse(control.finalizedAtUtc);
  const createdAt = Date.parse(control.createdAtUtc);
  const pending = [control];
  while (pending.length > 0) {
    const value = pending.pop();
    if (Array.isArray(value)) {
      pending.push(...value);
      continue;
    }
    if (!isRecord(value)) continue;
    for (const [key, child] of Object.entries(value)) {
      if (
        (key === "atUtc" || key.endsWith("AtUtc")) &&
        isUtcTimestamp(child) &&
        Date.parse(child) > finalizedAt
      ) {
        fail("release_manifest_timestamp_after_finalization");
      }
      if (
        (key === "atUtc" || key.endsWith("AtUtc")) &&
        key !== "restoreDrillAtUtc" &&
        isUtcTimestamp(child) &&
        Date.parse(child) < createdAt
      ) {
        fail("release_manifest_timestamp_before_creation");
      }
      pending.push(child);
    }
  }
  if (
    finalizedAt - Date.parse(control.backupRecovery.restoreDrillAtUtc) >
    MAX_RESTORE_DRILL_AGE_MS
  ) {
    fail("release_manifest_restore_drill_too_old");
  }
}

export function validateReleaseManifestContent({
  manifestBytes,
  expectedBuildSha,
  exactBuildEvidence,
  expectedDatabaseMigrationRevision,
  expectedMigrationComparison,
  clock = () => new Date(),
}) {
  if (
    !Buffer.isBuffer(manifestBytes) ||
    manifestBytes.length === 0 ||
    manifestBytes.length > MAX_RELEASE_MANIFEST_BYTES ||
    !FULL_LOWERCASE_GIT_SHA.test(expectedBuildSha ?? "")
  ) {
    fail("release_manifest_content_invalid");
  }

  let manifest;
  try {
    manifest = new TextDecoder("utf-8", { fatal: true }).decode(manifestBytes);
  } catch {
    fail("release_manifest_content_invalid");
  }
  if (
    manifest.startsWith("\uFEFF") ||
    manifest.includes("\r") ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(manifest)
  ) {
    fail("release_manifest_content_invalid");
  }

  const validationTimeMilliseconds = currentTimeMilliseconds(clock);
  if (!Number.isFinite(validationTimeMilliseconds)) {
    fail("release_manifest_validation_clock_invalid");
  }

  if (!/^- Manifest status: `FINAL`\s*$/mu.test(manifest)) {
    fail("release_manifest_not_final");
  }
  const control = parseReleaseControl(manifest);
  validateManifestMarkdown(manifest, expectedBuildSha, control.target);
  validateReleaseControl(
    control,
    expectedBuildSha,
    exactBuildEvidence,
    expectedDatabaseMigrationRevision,
    expectedMigrationComparison,
    validationTimeMilliseconds,
  );
  return Object.freeze({
    releaseId: control.releaseId,
    target: control.target,
  });
}

function verifyReleaseManifest({
  evidenceCommit,
  manifestPath,
  repoRoot,
  expectedBuildSha,
  exactBuildEvidence,
  expectedDatabaseMigrationState,
  clock,
}) {
  const manifestBytes = gitBlob(repoRoot, evidenceCommit, manifestPath);
  const checksumPath = `${manifestPath}.sha256`;
  const checksumBytes = gitBlob(repoRoot, evidenceCommit, checksumPath);
  const digest = createHash("sha256").update(manifestBytes).digest("hex");
  const expected = Buffer.from(`${digest}  ${manifestPath}\n`, "utf8");
  if (!checksumBytes.equals(expected))
    fail("release_manifest_checksum_invalid");
  const control = parseReleaseControl(manifestBytes.toString("utf8"));
  const expectedMigrationComparison =
    derivePreviousProductionMigrationComparison({
      declaredBaseline: control?.deployments?.previousProductionMigration,
    });
  const releaseManifest = validateReleaseManifestContent({
    manifestBytes,
    expectedBuildSha,
    exactBuildEvidence,
    expectedDatabaseMigrationRevision: expectedDatabaseMigrationState.revision,
    expectedMigrationComparison,
    clock,
  });
  return Object.freeze({
    ...releaseManifest,
    finalizedAtUtc: control.finalizedAtUtc,
    immutableIdentity: Object.freeze({
      releaseId: control.releaseId,
      build: control.build,
      deployments: control.deployments,
    }),
  });
}

function singleCommitParent(repoRoot, commit) {
  const ancestry = runGit(repoRoot, [
    "rev-list",
    "--parents",
    "-n",
    "1",
    commit,
    "--",
  ])
    .stdout.toString("utf8")
    .trim()
    .split(/\s+/u);
  if (
    ancestry.length !== 2 ||
    ancestry[0] !== commit ||
    !FULL_LOWERCASE_GIT_SHA.test(ancestry[1])
  ) {
    fail("evidence_commit_must_directly_follow_build_sha");
  }
  return ancestry[1];
}

function publicReleaseSubmissionInvariant(value) {
  if (!isRecord(value) || !isRecord(value.appReview)) {
    fail("public_release_submission_transition_invalid");
  }
  return {
    ...value,
    updated: null,
    appReview: {
      ...value.appReview,
      clerkReviewAccess: null,
      appleWorkflow: null,
    },
  };
}

function publicReleaseClerkInvariant(value) {
  if (!isRecord(value)) {
    fail("public_release_submission_transition_invalid");
  }
  return {
    ...value,
    testModeState: null,
    verifiedAtUtc: null,
    evidenceReference: null,
    shutdownControl: isRecord(value.shutdownControl)
      ? {
          ...value.shutdownControl,
          triggerObservedAtUtc: null,
          testModeDisabledAtUtc: null,
          shutdownEvidenceReference: null,
        }
      : value.shutdownControl,
  };
}

function publicReleaseAppleWorkflowInvariant(value) {
  if (!isRecord(value)) {
    fail("public_release_submission_transition_invalid");
  }
  return {
    ...value,
    state: null,
    appVersionStatus: null,
    submissionSection: null,
    allSubmittedItemsAccepted: null,
    verifiedAtUtc: null,
    evidenceReference: null,
  };
}

function isFreshAtFinalization(value, finalizedAtMilliseconds) {
  if (!isUtcTimestamp(value)) return false;
  const timestamp = Date.parse(value);
  return (
    timestamp <= finalizedAtMilliseconds &&
    finalizedAtMilliseconds - timestamp <= MAX_APP_REVIEW_EVIDENCE_AGE_MS
  );
}

function validateAppReviewSubmissionSnapshot(
  submission,
  manifestFinalizedAtUtc,
) {
  const finalizedAtMilliseconds = Date.parse(manifestFinalizedAtUtc ?? "");
  const appReview = submission?.appReview;
  const clerkReviewAccess = appReview?.clerkReviewAccess;
  const shutdownControl = clerkReviewAccess?.shutdownControl;
  const appleWorkflow = appReview?.appleWorkflow;
  if (
    !Number.isFinite(finalizedAtMilliseconds) ||
    !isRecord(appReview) ||
    appReview.status !== "ready_for_review" ||
    !isRecord(clerkReviewAccess) ||
    clerkReviewAccess.strategy !==
      "clerk_production_test_mode_reserved_email_code" ||
    clerkReviewAccess.clientTrustEnabled !== true ||
    clerkReviewAccess.allReviewAccountsUseReservedTestEmail !== true ||
    clerkReviewAccess.fixedCodePolicy !== "clerk_reserved_424242" ||
    clerkReviewAccess.exactBuildClientTrustFlowVerified !== true ||
    clerkReviewAccess.testModeState !== "enabled_for_app_review" ||
    !isFreshAtFinalization(
      clerkReviewAccess.verifiedAtUtc,
      finalizedAtMilliseconds,
    ) ||
    typeof clerkReviewAccess.evidenceReference !== "string" ||
    clerkReviewAccess.evidenceReference.trim().length === 0 ||
    !isRecord(shutdownControl) ||
    typeof shutdownControl.primaryOwner !== "string" ||
    shutdownControl.primaryOwner.trim().length === 0 ||
    typeof shutdownControl.backupOwner !== "string" ||
    shutdownControl.backupOwner.trim().length === 0 ||
    shutdownControl.primaryOwner.trim() ===
      shutdownControl.backupOwner.trim() ||
    shutdownControl.bothHaveProductionClerkAccess !== true ||
    shutdownControl.statusSource !== CLERK_SHUTDOWN_STATUS_SOURCE ||
    shutdownControl.statusMonitoringConfigured !== true ||
    shutdownControl.escalationConfigured !== true ||
    shutdownControl.closureSloMinutes !== CLERK_SHUTDOWN_SLO_MINUTES ||
    !isFreshAtFinalization(
      shutdownControl.accessPreflightAtUtc,
      finalizedAtMilliseconds,
    ) ||
    typeof shutdownControl.accessPreflightEvidenceReference !== "string" ||
    shutdownControl.accessPreflightEvidenceReference.trim().length === 0 ||
    shutdownControl.triggerObservedAtUtc !== null ||
    shutdownControl.testModeDisabledAtUtc !== null ||
    shutdownControl.shutdownEvidenceReference !== null ||
    !isRecord(appReview.accountStates) ||
    !isRecord(appleWorkflow) ||
    appleWorkflow.state !== "ready_for_review" ||
    typeof appleWorkflow.submissionReference !== "string" ||
    appleWorkflow.submissionReference.trim().length === 0 ||
    appleWorkflow.appVersionIncluded !== true ||
    appleWorkflow.subscriptionIncluded !== true ||
    appleWorkflow.subscriptionGroupIncluded !== true ||
    appleWorkflow.manualReleaseSelected !== true ||
    appleWorkflow.appVersionStatus !== "ready_for_review" ||
    appleWorkflow.submissionSection !== "drafts" ||
    appleWorkflow.reviewActive !== false ||
    appleWorkflow.allSubmittedItemsAccepted !== false ||
    !isFreshAtFinalization(
      appleWorkflow.verifiedAtUtc,
      finalizedAtMilliseconds,
    ) ||
    typeof appleWorkflow.evidenceReference !== "string" ||
    appleWorkflow.evidenceReference.trim().length === 0
  ) {
    fail("app_review_evidence_snapshot_invalid");
  }
  for (const id of REQUIRED_APP_REVIEW_ACCOUNT_IDS) {
    const account = appReview.accountStates[id];
    if (
      !isRecord(account) ||
      account.status !== "verified_fresh" ||
      account.nonExpiring !== true ||
      account.noMfaOrOutOfBandTrap !== true ||
      !isFreshAtFinalization(account.testedAtUtc, finalizedAtMilliseconds) ||
      typeof account.evidenceReference !== "string" ||
      account.evidenceReference.trim().length === 0
    ) {
      fail("app_review_evidence_snapshot_invalid");
    }
  }
}

function validatePublicReleaseSubmissionTransition({
  appReviewSubmission,
  publicReleaseSubmission,
  appReviewManifestFinalizedAtUtc,
  publicReleaseManifestFinalizedAtUtc,
}) {
  if (
    !isDeepStrictEqual(
      publicReleaseSubmissionInvariant(appReviewSubmission),
      publicReleaseSubmissionInvariant(publicReleaseSubmission),
    )
  ) {
    fail("public_release_submission_changed_immutable_fields");
  }

  const appReviewAccess = appReviewSubmission.appReview.clerkReviewAccess;
  const publicReleaseAccess =
    publicReleaseSubmission.appReview.clerkReviewAccess;
  const appReviewWorkflow = appReviewSubmission.appReview.appleWorkflow;
  const publicReleaseWorkflow = publicReleaseSubmission.appReview.appleWorkflow;
  if (
    !isDeepStrictEqual(
      publicReleaseClerkInvariant(appReviewAccess),
      publicReleaseClerkInvariant(publicReleaseAccess),
    )
  ) {
    fail("public_release_clerk_transition_changed_immutable_fields");
  }
  if (
    !isDeepStrictEqual(
      publicReleaseAppleWorkflowInvariant(appReviewWorkflow),
      publicReleaseAppleWorkflowInvariant(publicReleaseWorkflow),
    )
  ) {
    fail("public_release_apple_workflow_changed_immutable_fields");
  }
  if (
    appReviewAccess.testModeState !== "enabled_for_app_review" ||
    appReviewAccess.clientTrustEnabled !== true ||
    appReviewAccess.allReviewAccountsUseReservedTestEmail !== true ||
    appReviewAccess.exactBuildClientTrustFlowVerified !== true
  ) {
    fail("public_release_transition_app_review_state_invalid");
  }
  if (
    publicReleaseAccess.testModeState !== "disabled_for_public_release" ||
    publicReleaseAccess.clientTrustEnabled !== true
  ) {
    fail("public_release_transition_state_invalid");
  }
  if (
    appReviewWorkflow.state !== "ready_for_review" ||
    appReviewWorkflow.appVersionStatus !== "ready_for_review" ||
    appReviewWorkflow.submissionSection !== "drafts" ||
    appReviewWorkflow.reviewActive !== false ||
    appReviewWorkflow.allSubmittedItemsAccepted !== false
  ) {
    fail("public_release_transition_app_review_apple_workflow_invalid");
  }
  if (
    publicReleaseWorkflow.state !== "approved_pending_developer_release" ||
    publicReleaseWorkflow.appVersionStatus !== "pending_developer_release" ||
    publicReleaseWorkflow.submissionSection !== "completed" ||
    publicReleaseWorkflow.reviewActive !== false ||
    publicReleaseWorkflow.allSubmittedItemsAccepted !== true
  ) {
    fail("public_release_apple_workflow_state_invalid");
  }

  validateAppReviewSubmissionSnapshot(
    appReviewSubmission,
    appReviewManifestFinalizedAtUtc,
  );

  const appReviewFinalizedAt = Date.parse(
    appReviewManifestFinalizedAtUtc ?? "",
  );
  const publicReleaseFinalizedAt = Date.parse(
    publicReleaseManifestFinalizedAtUtc ?? "",
  );
  const publicReleaseVerifiedAt = Date.parse(
    publicReleaseAccess.verifiedAtUtc ?? "",
  );
  const appReviewEvidenceReference = appReviewAccess.evidenceReference;
  const publicReleaseEvidenceReference = publicReleaseAccess.evidenceReference;
  const publicReleaseAppleVerifiedAt = Date.parse(
    publicReleaseWorkflow.verifiedAtUtc ?? "",
  );
  const publicReleaseShutdown = publicReleaseAccess.shutdownControl;
  const triggerObservedAt = Date.parse(
    publicReleaseShutdown?.triggerObservedAtUtc ?? "",
  );
  const testModeDisabledAt = Date.parse(
    publicReleaseShutdown?.testModeDisabledAtUtc ?? "",
  );
  const appReviewAppleEvidenceReference = appReviewWorkflow.evidenceReference;
  const publicReleaseAppleEvidenceReference =
    publicReleaseWorkflow.evidenceReference;
  if (
    !Number.isFinite(appReviewFinalizedAt) ||
    !Number.isFinite(publicReleaseFinalizedAt) ||
    !Number.isFinite(publicReleaseVerifiedAt) ||
    !isFreshAtFinalization(
      publicReleaseAccess.verifiedAtUtc,
      publicReleaseFinalizedAt,
    ) ||
    publicReleaseVerifiedAt <= appReviewFinalizedAt ||
    publicReleaseVerifiedAt > publicReleaseFinalizedAt ||
    typeof appReviewEvidenceReference !== "string" ||
    typeof publicReleaseEvidenceReference !== "string" ||
    appReviewEvidenceReference.trim().length === 0 ||
    publicReleaseEvidenceReference.trim().length === 0 ||
    publicReleaseEvidenceReference.trim() ===
      appReviewEvidenceReference.trim() ||
    !isIsoDate(appReviewSubmission.updated) ||
    !isIsoDate(publicReleaseSubmission.updated) ||
    publicReleaseSubmission.updated < appReviewSubmission.updated
  ) {
    fail("public_release_transition_evidence_not_advanced");
  }
  if (
    !isRecord(publicReleaseShutdown) ||
    !isUtcTimestamp(publicReleaseShutdown.triggerObservedAtUtc) ||
    !isUtcTimestamp(publicReleaseShutdown.testModeDisabledAtUtc) ||
    !isFreshAtFinalization(
      publicReleaseShutdown.testModeDisabledAtUtc,
      publicReleaseFinalizedAt,
    ) ||
    typeof publicReleaseShutdown.shutdownEvidenceReference !== "string" ||
    publicReleaseShutdown.shutdownEvidenceReference.trim().length === 0 ||
    publicReleaseShutdown.shutdownEvidenceReference.trim() ===
      publicReleaseShutdown.accessPreflightEvidenceReference?.trim() ||
    Date.parse(publicReleaseShutdown.accessPreflightAtUtc ?? "") >
      triggerObservedAt ||
    triggerObservedAt <= appReviewFinalizedAt ||
    triggerObservedAt > publicReleaseFinalizedAt ||
    testModeDisabledAt < triggerObservedAt ||
    testModeDisabledAt - triggerObservedAt >
      CLERK_SHUTDOWN_SLO_MINUTES * 60 * 1000 ||
    testModeDisabledAt > publicReleaseFinalizedAt ||
    testModeDisabledAt > publicReleaseVerifiedAt
  ) {
    fail("public_release_clerk_shutdown_evidence_invalid");
  }
  if (
    !Number.isFinite(publicReleaseAppleVerifiedAt) ||
    !isFreshAtFinalization(
      publicReleaseWorkflow.verifiedAtUtc,
      publicReleaseFinalizedAt,
    ) ||
    publicReleaseAppleVerifiedAt <= appReviewFinalizedAt ||
    publicReleaseAppleVerifiedAt > publicReleaseFinalizedAt ||
    typeof appReviewAppleEvidenceReference !== "string" ||
    typeof publicReleaseAppleEvidenceReference !== "string" ||
    appReviewAppleEvidenceReference.trim().length === 0 ||
    publicReleaseAppleEvidenceReference.trim().length === 0 ||
    publicReleaseAppleEvidenceReference.trim() ===
      appReviewAppleEvidenceReference.trim()
  ) {
    fail("public_release_apple_workflow_evidence_not_advanced");
  }
}

function verifyEvidenceCommit({
  evidenceCommit,
  parentCommit,
  repoRoot,
  expectedBuildSha,
  exactBuildEvidence,
  expectedDatabaseMigrationState,
  clock,
  phase,
  priorEvidence = null,
}) {
  const changes = parseNameStatus(
    runGit(repoRoot, [
      "diff-tree",
      "--no-commit-id",
      "--name-status",
      "--no-renames",
      "-r",
      "-z",
      parentCommit,
      evidenceCommit,
      "--",
    ]).stdout,
  );
  if (changes.length === 0) fail("post_build_evidence_diff_empty");

  const modifiedReleaseManifests = [];
  const addedChecksums = [];
  const addedScreenshots = [];
  let publicReleaseSubmissionChanged = false;
  for (const change of changes) {
    const parentEntry = treeEntry(repoRoot, parentCommit, change.path);
    const evidenceEntry = treeEntry(repoRoot, evidenceCommit, change.path);
    if (
      phase === "initial" &&
      POST_BUILD_MUTABLE_EVIDENCE_PATHS.includes(change.path) &&
      change.status === "M"
    ) {
      requireRegularBlob(parentEntry);
      requireRegularBlob(evidenceEntry);
      continue;
    }
    if (
      phase === "public_release" &&
      change.path === PUBLIC_RELEASE_MUTABLE_EVIDENCE_PATH &&
      change.status === "M"
    ) {
      requireRegularBlob(parentEntry);
      requireRegularBlob(evidenceEntry);
      publicReleaseSubmissionChanged = true;
      continue;
    }
    if (
      phase === "initial" &&
      SCREENSHOT_EVIDENCE_PATH.test(change.path) &&
      change.status === "A"
    ) {
      if (parentEntry !== null)
        fail("post_build_evidence_operation_not_allowed");
      requireRegularBlob(evidenceEntry);
      addedScreenshots.push(change.path);
      continue;
    }
    if (RELEASE_MANIFEST_PATH.test(change.path) && change.status === "M") {
      requireRegularBlob(parentEntry);
      requireRegularBlob(evidenceEntry);
      modifiedReleaseManifests.push(change.path);
      continue;
    }
    if (
      change.path.endsWith(".md.sha256") &&
      RELEASE_MANIFEST_PATH.test(change.path.slice(0, -".sha256".length)) &&
      change.status === "A"
    ) {
      if (parentEntry !== null)
        fail("post_build_evidence_operation_not_allowed");
      requireRegularBlob(evidenceEntry);
      addedChecksums.push(change.path);
      continue;
    }
    fail("post_build_path_or_operation_not_allowlisted");
  }

  if (
    modifiedReleaseManifests.length !== 1 ||
    addedChecksums.length !== 1 ||
    addedChecksums[0] !== `${modifiedReleaseManifests[0]}.sha256`
  ) {
    fail("exact_release_manifest_and_checksum_required");
  }
  if (phase === "public_release" && !publicReleaseSubmissionChanged) {
    fail("public_release_submission_transition_required");
  }

  const releaseManifest = verifyReleaseManifest({
    evidenceCommit,
    manifestPath: modifiedReleaseManifests[0],
    repoRoot,
    expectedBuildSha,
    exactBuildEvidence,
    expectedDatabaseMigrationState,
    clock,
  });
  const shouldReadEvidenceSubmission =
    phase === "public_release" ||
    APP_STORE_RELEASE_TARGETS.has(releaseManifest.target);
  const evidenceSubmission = shouldReadEvidenceSubmission
    ? parseJsonBlob(
        repoRoot,
        evidenceCommit,
        PUBLIC_RELEASE_MUTABLE_EVIDENCE_PATH,
        phase === "public_release"
          ? "public_release_submission_transition_invalid"
          : "app_review_submission_snapshot_invalid",
      )
    : null;
  if (APP_STORE_RELEASE_TARGETS.has(releaseManifest.target)) {
    validateFinalizedListingOriginBinding(
      evidenceSubmission,
      releaseManifest.immutableIdentity.deployments.replitProductionHosting
        .publicOrigin,
    );
  }
  const buildDraftEntry = treeEntry(
    repoRoot,
    expectedBuildSha,
    modifiedReleaseManifests[0],
  );
  if (
    !buildDraftEntry ||
    buildDraftEntry.mode !== "100644" ||
    buildDraftEntry.type !== "blob" ||
    treeEntry(
      repoRoot,
      expectedBuildSha,
      `${modifiedReleaseManifests[0]}.sha256`,
    ) !== null
  ) {
    fail("release_manifest_build_draft_invalid");
  }
  validatePreBuildReleaseManifestDraft({
    manifestBytes: gitBlob(
      repoRoot,
      expectedBuildSha,
      modifiedReleaseManifests[0],
    ),
    expectedReleaseId: releaseManifest.releaseId,
    expectedTarget: releaseManifest.target,
  });

  if (phase === "initial" && releaseManifest.target === "app_review") {
    validatePairedPublicReleaseDraft({
      repoRoot,
      buildSha: expectedBuildSha,
      appReviewManifestPath: modifiedReleaseManifests[0],
      releaseId: releaseManifest.releaseId,
    });
  }

  if (phase === "initial" && releaseManifest.target === "app_review") {
    validateAppReviewSubmissionSnapshot(
      evidenceSubmission,
      releaseManifest.finalizedAtUtc,
    );
  }

  if (phase === "initial") {
    const screenshotManifest = parseJsonBlob(
      repoRoot,
      evidenceCommit,
      SCREENSHOT_MANIFEST_PATH,
      "screenshot_manifest_invalid",
    );
    const referencedScreenshots = new Set(
      (Array.isArray(screenshotManifest?.shots) ? screenshotManifest.shots : [])
        .filter((shot) => typeof shot?.file === "string")
        .map((shot) => `app-store/screenshots/files/${shot.file}`),
    );
    if (
      addedScreenshots.some(
        (screenshot) => !referencedScreenshots.has(screenshot),
      ) ||
      [...referencedScreenshots].some(
        (screenshot) => !addedScreenshots.includes(screenshot),
      )
    ) {
      fail("screenshot_evidence_not_exactly_manifest_bound");
    }
  } else {
    validatePublicReleaseSubmissionTransition({
      appReviewSubmission: parseJsonBlob(
        repoRoot,
        parentCommit,
        PUBLIC_RELEASE_MUTABLE_EVIDENCE_PATH,
        "public_release_submission_transition_invalid",
      ),
      publicReleaseSubmission: evidenceSubmission,
      appReviewManifestFinalizedAtUtc: priorEvidence?.finalizedAtUtc,
      publicReleaseManifestFinalizedAtUtc: releaseManifest.finalizedAtUtc,
    });
  }

  validatePinnedRoutingBytes({
    buildBytes: gitBlob(repoRoot, expectedBuildSha, EAS_JSON_PATH),
    evidenceBytes: gitBlob(repoRoot, evidenceCommit, EAS_JSON_PATH),
  });

  return Object.freeze({
    changedPathCount: changes.length,
    manifestPath: modifiedReleaseManifests[0],
    releaseId: releaseManifest.releaseId,
    releaseTarget: releaseManifest.target,
    finalizedAtUtc: releaseManifest.finalizedAtUtc,
    immutableIdentity: releaseManifest.immutableIdentity,
  });
}

/**
 * Prove that HEAD is either the single App Review evidence commit directly
 * after the immutable build/upload SHA or the single constrained public-release
 * transition directly after that App Review commit. Each raw two-tree diff is
 * operation-, mode-, and path-constrained, so runtime changes, reverts,
 * symlinks, and executable blobs cannot be hidden inside the evidence chain.
 */
export function verifyPostBuildEvidenceBoundary({
  buildSha,
  repoRoot = REPOSITORY_ROOT,
  clock = () => new Date(),
} = {}) {
  const resolvedRoot = path.resolve(repoRoot);

  const worktree = runGit(resolvedRoot, [
    "status",
    "--porcelain=v1",
    "-z",
    "--untracked-files=all",
  ]).stdout;
  if (worktree.length > 0) fail("worktree_not_clean");

  const headSha = runGit(resolvedRoot, ["rev-parse", "--verify", "HEAD"])
    .stdout.toString("utf8")
    .trim();
  if (!FULL_LOWERCASE_GIT_SHA.test(headSha)) fail("git_output_invalid");

  const testFlight = parseJsonBlob(
    resolvedRoot,
    headSha,
    TESTFLIGHT_RECORD_PATH,
    "testflight_record_invalid",
  );
  const recordedBuildSha = testFlight?.exactBuildEvidence?.gitCommit;
  validateBuildSha(recordedBuildSha);
  if (buildSha !== undefined) {
    validateBuildSha(buildSha);
    if (buildSha !== recordedBuildSha) fail("testflight_build_sha_mismatch");
  }
  const expectedBuildSha = recordedBuildSha;

  const buildLookup = runGit(
    resolvedRoot,
    ["cat-file", "-e", `${expectedBuildSha}^{commit}`],
    [0, 1, 128],
  );
  if (buildLookup.status !== 0) fail("build_sha_not_a_commit");
  const expectedDatabaseMigrationState = databaseMigrationStateAtBuild(
    resolvedRoot,
    expectedBuildSha,
  );

  const parentSha = singleCommitParent(resolvedRoot, headSha);
  let evidence;
  if (parentSha === expectedBuildSha) {
    evidence = verifyEvidenceCommit({
      evidenceCommit: headSha,
      parentCommit: expectedBuildSha,
      repoRoot: resolvedRoot,
      expectedBuildSha,
      exactBuildEvidence: testFlight.exactBuildEvidence,
      expectedDatabaseMigrationState,
      clock,
      phase: "initial",
    });
    if (evidence.releaseTarget === "public_release") {
      fail("public_release_requires_app_review_evidence_parent");
    }
  } else {
    const appReviewEvidenceSha = parentSha;
    if (
      singleCommitParent(resolvedRoot, appReviewEvidenceSha) !==
      expectedBuildSha
    ) {
      fail("evidence_commit_must_directly_follow_build_sha");
    }
    const appReviewTestFlight = parseJsonBlob(
      resolvedRoot,
      appReviewEvidenceSha,
      TESTFLIGHT_RECORD_PATH,
      "testflight_record_invalid",
    );
    if (
      appReviewTestFlight?.exactBuildEvidence?.gitCommit !== expectedBuildSha ||
      !isDeepStrictEqual(
        appReviewTestFlight.exactBuildEvidence,
        testFlight.exactBuildEvidence,
      )
    ) {
      fail("public_release_transition_build_identity_mismatch");
    }

    const appReviewEvidence = verifyEvidenceCommit({
      evidenceCommit: appReviewEvidenceSha,
      parentCommit: expectedBuildSha,
      repoRoot: resolvedRoot,
      expectedBuildSha,
      exactBuildEvidence: appReviewTestFlight.exactBuildEvidence,
      expectedDatabaseMigrationState,
      clock,
      phase: "initial",
    });
    if (appReviewEvidence.releaseTarget !== "app_review") {
      fail("public_release_requires_app_review_evidence_parent");
    }

    evidence = verifyEvidenceCommit({
      evidenceCommit: headSha,
      parentCommit: appReviewEvidenceSha,
      repoRoot: resolvedRoot,
      expectedBuildSha,
      exactBuildEvidence: testFlight.exactBuildEvidence,
      expectedDatabaseMigrationState,
      clock,
      phase: "public_release",
      priorEvidence: appReviewEvidence,
    });
    if (evidence.releaseTarget !== "public_release") {
      fail("public_release_transition_target_required");
    }
    if (
      evidence.releaseId !== appReviewEvidence.releaseId ||
      evidence.manifestPath === appReviewEvidence.manifestPath
    ) {
      fail("public_release_transition_manifest_identity_invalid");
    }
    if (
      !isDeepStrictEqual(
        evidence.immutableIdentity,
        appReviewEvidence.immutableIdentity,
      )
    ) {
      fail("public_release_transition_control_identity_mismatch");
    }
  }

  return Object.freeze({
    buildSha: expectedBuildSha,
    postBuildEvidenceSha: headSha,
    changedPathCount: evidence.changedPathCount,
    releaseTarget: evidence.releaseTarget,
  });
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  try {
    if (process.argv.length !== 2) fail("arguments_not_allowed");
    verifyPostBuildEvidenceBoundary();
    console.log(
      "PASS  HEAD is the clean, content- and checksum-bound evidence state for BUILD_SHA",
    );
  } catch (error) {
    const code =
      error instanceof PostBuildEvidenceError
        ? error.code
        : "verification_failed";
    console.error(`FAIL  post-build evidence boundary is invalid  (${code})`);
    process.exitCode = 1;
  }
}
