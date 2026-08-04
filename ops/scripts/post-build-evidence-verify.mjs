#!/usr/bin/env node

import { createHash } from "node:crypto";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  EasSubmitConfigurationError,
  validateEasSubmitConfig,
} from "./eas-submit-config-verify.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const EAS_JSON_PATH = "artifacts/cut-os/eas.json";
const TESTFLIGHT_RECORD_PATH = "app-store/testflight-submission.json";
const SCREENSHOT_MANIFEST_PATH = "app-store/screenshots/manifest.json";
const FULL_LOWERCASE_GIT_SHA = /^[0-9a-f]{40}$/u;
const MAX_GIT_OUTPUT_BYTES = 8 * 1024 * 1024;
const MAX_RELEASE_MANIFEST_BYTES = 512 * 1024;
const MAX_RESTORE_DRILL_AGE_MS = 90 * 24 * 60 * 60 * 1000;
const RELEASE_CONTROL_BEGIN = "<!-- CUT_OS_RELEASE_CONTROL_V1_BEGIN -->";
const RELEASE_CONTROL_END = "<!-- CUT_OS_RELEASE_CONTROL_V1_END -->";

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
  "Previous API rollback is forbidden unless schema compatibility is proven.",
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
  "production_release_config",
  "production_ios_export",
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
  "app_store_server_notifications",
  "accessibility_label",
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

const REQUIRED_MONITORING_SIGNALS = Object.freeze([
  "api_liveness",
  "api_readiness_latency",
  "api_errors_latency",
  "startup_migration",
  "auth_failures",
  "purchase_entitlement",
  "account_deletion",
  "database_backup",
  "mobile_crash_hang",
  "legal_support",
  "privacy_security",
]);

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
    control.schemaVersion !== 1 ||
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
      "migrationRehearsal",
      "databaseReadiness",
      "backupCoverageAtUtc",
      "backupEvidenceReference",
      "restoreDrillAtUtc",
      "restoreDrillEvidenceReference",
      "rpo",
      "rto",
      "recoveryApproval",
      "rollForwardProcedureReference",
      "coordinatedRestoreProcedureReference",
      "recoveryOwner",
      "noConcurrentMigrationConfirmed",
      "schemaRollbackPolicyConfirmed",
    ],
    backupCode,
  );
  validatePassingEvidence(
    control.backupRecovery.migrationRehearsal,
    backupCode,
  );
  validatePassingEvidence(control.backupRecovery.databaseReadiness, backupCode);
  validateApproval(control.backupRecovery.recoveryApproval);
  if (
    !isUtcTimestamp(control.backupRecovery.backupCoverageAtUtc) ||
    !isResolvedText(control.backupRecovery.backupEvidenceReference) ||
    !isUtcTimestamp(control.backupRecovery.restoreDrillAtUtc) ||
    !isResolvedText(control.backupRecovery.restoreDrillEvidenceReference) ||
    !isResolvedText(control.backupRecovery.rpo) ||
    !isResolvedText(control.backupRecovery.rto) ||
    !isResolvedText(control.backupRecovery.rollForwardProcedureReference) ||
    !isResolvedText(
      control.backupRecovery.coordinatedRestoreProcedureReference,
    ) ||
    !isResolvedText(control.backupRecovery.recoveryOwner) ||
    control.backupRecovery.noConcurrentMigrationConfirmed !== true ||
    control.backupRecovery.schemaRollbackPolicyConfirmed !== true
  ) {
    fail(backupCode);
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
  for (const signal of Object.values(signals)) {
    requireExactKeys(
      signal,
      [
        "warningThreshold",
        "criticalThreshold",
        "destination",
        "primaryOwner",
        "backupOwner",
        "baselineEvidenceReference",
        "alertTest",
      ],
      monitoringCode,
    );
    if (
      ![
        signal.warningThreshold,
        signal.criticalThreshold,
        signal.destination,
        signal.primaryOwner,
        signal.backupOwner,
        signal.baselineEvidenceReference,
      ].every((value) => isResolvedText(value))
    ) {
      fail(monitoringCode);
    }
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
    control.rollback.previousApplicationRevision !==
      control.deployments.previousProductionApiRevision ||
    control.rollback.previousPublicLegalRevision !==
      control.deployments.previousPublicLegalRevision ||
    !isResolvedText(control.rollback.databaseRecoveryPointReference) ||
    !isResolvedText(control.rollback.runbookReference)
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
  clock,
}) {
  const manifestBytes = gitBlob(repoRoot, evidenceCommit, manifestPath);
  const checksumPath = `${manifestPath}.sha256`;
  const checksumBytes = gitBlob(repoRoot, evidenceCommit, checksumPath);
  const digest = createHash("sha256").update(manifestBytes).digest("hex");
  const expected = Buffer.from(`${digest}  ${manifestPath}\n`, "utf8");
  if (!checksumBytes.equals(expected))
    fail("release_manifest_checksum_invalid");
  return validateReleaseManifestContent({
    manifestBytes,
    expectedBuildSha,
    exactBuildEvidence,
    clock,
  });
}

/**
 * Prove that HEAD is the single, clean evidence commit directly after the
 * immutable build/upload SHA. The raw two-tree diff is operation-, mode-, and
 * path-constrained, so runtime changes, reverts, symlinks, and executable blobs
 * cannot be hidden inside the evidence boundary.
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

  const ancestry = runGit(resolvedRoot, [
    "rev-list",
    "--parents",
    "-n",
    "1",
    "HEAD",
    "--",
  ])
    .stdout.toString("utf8")
    .trim()
    .split(/\s+/u);
  if (
    ancestry.length !== 2 ||
    ancestry[0] !== headSha ||
    ancestry[1] !== expectedBuildSha
  ) {
    fail("evidence_commit_must_directly_follow_build_sha");
  }

  const changes = parseNameStatus(
    runGit(resolvedRoot, [
      "diff-tree",
      "--no-commit-id",
      "--name-status",
      "--no-renames",
      "-r",
      "-z",
      expectedBuildSha,
      headSha,
      "--",
    ]).stdout,
  );
  if (changes.length === 0) fail("post_build_evidence_diff_empty");

  const modifiedReleaseManifests = [];
  const addedChecksums = [];
  const addedScreenshots = [];
  for (const change of changes) {
    const buildEntry = treeEntry(resolvedRoot, expectedBuildSha, change.path);
    const evidenceEntry = treeEntry(resolvedRoot, headSha, change.path);
    if (
      POST_BUILD_MUTABLE_EVIDENCE_PATHS.includes(change.path) &&
      change.status === "M"
    ) {
      requireRegularBlob(buildEntry);
      requireRegularBlob(evidenceEntry);
      continue;
    }
    if (SCREENSHOT_EVIDENCE_PATH.test(change.path) && change.status === "A") {
      if (buildEntry !== null)
        fail("post_build_evidence_operation_not_allowed");
      requireRegularBlob(evidenceEntry);
      addedScreenshots.push(change.path);
      continue;
    }
    if (RELEASE_MANIFEST_PATH.test(change.path) && change.status === "M") {
      requireRegularBlob(buildEntry);
      requireRegularBlob(evidenceEntry);
      modifiedReleaseManifests.push(change.path);
      continue;
    }
    if (
      change.path.endsWith(".md.sha256") &&
      RELEASE_MANIFEST_PATH.test(change.path.slice(0, -".sha256".length)) &&
      change.status === "A"
    ) {
      if (buildEntry !== null)
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
  const releaseManifest = verifyReleaseManifest({
    evidenceCommit: headSha,
    manifestPath: modifiedReleaseManifests[0],
    repoRoot: resolvedRoot,
    expectedBuildSha,
    exactBuildEvidence: testFlight.exactBuildEvidence,
    clock,
  });

  const screenshotManifest = parseJsonBlob(
    resolvedRoot,
    headSha,
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

  validatePinnedRoutingBytes({
    buildBytes: gitBlob(resolvedRoot, expectedBuildSha, EAS_JSON_PATH),
    evidenceBytes: gitBlob(resolvedRoot, headSha, EAS_JSON_PATH),
  });

  return Object.freeze({
    buildSha: expectedBuildSha,
    postBuildEvidenceSha: headSha,
    changedPathCount: changes.length,
    releaseTarget: releaseManifest.target,
  });
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  try {
    if (process.argv.length !== 2) fail("arguments_not_allowed");
    verifyPostBuildEvidenceBoundary();
    console.log(
      "PASS  HEAD is the clean, content- and checksum-bound evidence commit directly after BUILD_SHA",
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
