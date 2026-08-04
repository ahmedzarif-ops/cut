import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  chmod,
  mkdtemp,
  mkdir,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  PostBuildEvidenceError,
  validateBuildSha,
  validatePinnedRoutingBytes,
  validateReleaseManifestContent,
  verifyPostBuildEvidenceBoundary,
} from "./post-build-evidence-verify.mjs";

const script = fileURLToPath(
  new URL("./post-build-evidence-verify.mjs", import.meta.url),
);
const releaseManifestTemplate = fileURLToPath(
  new URL("../../RELEASE_EVIDENCE_MANIFEST_TEMPLATE.md", import.meta.url),
);
const releaseManifestPath = "release-evidence/1.0.0-1-20260803T120000Z.md";
const exactBuildIdentity = Object.freeze({
  appVersion: "1.0.0",
  buildNumber: "1",
  easBuildId: "eas-build-01234567",
  appStoreConnectBuildId: "asc-build-01234567",
});
const validationClock = () => new Date("2026-08-04T00:00:00Z");

const automatedGateIds = [
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
];

const approvalIds = [
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
];

const releaseSafetyCheckIds = [
  "production_service_set",
  "limiter_live_abuse",
  "clerk_proxy_activation",
  "authentication_recovery",
  "approved_legal_publication",
  "app_store_exact_build_reconciliation",
];

const stagingSmokeIds = [
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
];

const productionSmokeIds = [
  "api_health",
  "api_readiness",
  "auth_guard",
  "public_status",
  "live_legal",
  "review_account_critical_flow",
];

const monitoringSignalIds = [
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
];

function passingEvidence(id) {
  return {
    status: "PASS",
    atUtc: "2026-08-03T12:30:00Z",
    evidenceReference: `evidence/${id}`,
  };
}

function approved(id) {
  return {
    decision: "APPROVED",
    approver: `${id}-approver`,
    atUtc: "2026-08-03T12:35:00Z",
    evidenceReference: `approvals/${id}`,
    notApplicableReason: null,
  };
}

function completeReleaseControl(buildSha) {
  return {
    schemaVersion: 1,
    status: "FINAL",
    releaseId: "cut-os-1.0.0-1",
    target: "app_review",
    createdAtUtc: "2026-08-03T10:00:00Z",
    finalizedAtUtc: "2026-08-03T13:00:00Z",
    releaseLead: "release-lead",
    businessOwner: "business-owner",
    build: {
      gitSha: buildSha,
      appVersion: exactBuildIdentity.appVersion,
      appleBuildNumber: exactBuildIdentity.buildNumber,
    },
    deployments: {
      stagingApiRevision: "staging-api-r17",
      productionApiRevision: "production-api-r17",
      previousProductionApiRevision: "production-api-r16",
      publicLegalRevision: "public-legal-r9",
      previousPublicLegalRevision: "public-legal-r8",
      easBuildId: exactBuildIdentity.easBuildId,
      appStoreConnectBuildId: exactBuildIdentity.appStoreConnectBuildId,
    },
    automatedGates: Object.fromEntries(
      automatedGateIds.map((id) => [id, passingEvidence(`gate-${id}`)]),
    ),
    releaseSafetyChecks: Object.fromEntries(
      releaseSafetyCheckIds.map((id) => [
        id,
        passingEvidence(`release-safety-${id}`),
      ]),
    ),
    approvals: Object.fromEntries(approvalIds.map((id) => [id, approved(id)])),
    backupRecovery: {
      migrationRehearsal: passingEvidence("migration-rehearsal"),
      databaseReadiness: passingEvidence("database-readiness"),
      backupCoverageAtUtc: "2026-08-03T12:00:00Z",
      backupEvidenceReference: "provider/backups/coverage-17",
      restoreDrillAtUtc: "2026-08-01T15:00:00Z",
      restoreDrillEvidenceReference: "provider/restore-drills/17",
      rpo: "15 minutes",
      rto: "60 minutes",
      recoveryApproval: approved("database-recovery"),
      rollForwardProcedureReference: "runbooks/database-roll-forward",
      coordinatedRestoreProcedureReference:
        "runbooks/coordinated-database-application-restore",
      recoveryOwner: "database-recovery-owner",
      noConcurrentMigrationConfirmed: true,
      schemaRollbackPolicyConfirmed: true,
    },
    smoke: {
      staging: Object.fromEntries(
        stagingSmokeIds.map((id) => [id, passingEvidence(`staging-${id}`)]),
      ),
      production: Object.fromEntries(
        productionSmokeIds.map((id) => [
          id,
          passingEvidence(`production-${id}`),
        ]),
      ),
    },
    monitoring: {
      signals: Object.fromEntries(
        monitoringSignalIds.map((id) => [
          id,
          {
            warningThreshold: `approved warning threshold for ${id}`,
            criticalThreshold: `approved critical threshold for ${id}`,
            destination: "release-operations-alerts",
            primaryOwner: `${id}-primary-owner`,
            backupOwner: `${id}-backup-owner`,
            baselineEvidenceReference: `monitoring/baselines/${id}`,
            alertTest: passingEvidence(`monitoring-alert-test-${id}`),
          },
        ]),
      ),
      escalationEvidenceReference: "monitoring/escalation-policy",
      retentionEvidenceReference: "monitoring/retention-approval",
      coverage: {
        status: "PASS",
        confirmedBy: "monitoring-owner",
        atUtc: "2026-08-03T12:40:00Z",
        evidenceReference: "monitoring/live-coverage",
      },
    },
    rollback: {
      promotionDecision: "PASS",
      selectedPath: "NO_ACTION_HEALTHY",
      decisionOwner: "release-owner",
      decisionAtUtc: "2026-08-03T12:55:00Z",
      schemaSafetyEvidenceReference: "rollback/schema-safety",
      previousApplicationRevision: "production-api-r16",
      previousPublicLegalRevision: "public-legal-r8",
      databaseRecoveryPointReference: "provider/recovery-points/17",
      runbookReference: "runbooks/release-rollback",
      postActionProbes: passingEvidence("post-action-probes"),
    },
  };
}

function completeReleaseManifest(
  buildSha,
  control = completeReleaseControl(buildSha),
) {
  const uploadAcknowledgment =
    control.target === "staging"
      ? "No EAS upload occurred for this staging-only target."
      : "EAS upload ran from clean `BUILD_SHA` before post-build evidence changes.";
  return `# CUT OS — release evidence manifest

## Manifest control

- Manifest status: \`FINAL\`

## Machine-verifiable release control

<!-- CUT_OS_RELEASE_CONTROL_V1_BEGIN -->
\`\`\`json
${JSON.stringify(control, null, 2)}
\`\`\`
<!-- CUT_OS_RELEASE_CONTROL_V1_END -->

## Candidate identity

- [x] Git worktree was clean before build.
- BUILD_SHA — source/routing/build/upload commit: \`${buildSha}\`
- [x] ${uploadAcknowledgment}

## Automated gates

Recorded in the machine-verifiable control.

## Approval gates

Recorded in the machine-verifiable control.

## Environment identity — non-secret aliases only

Recorded in controlled evidence references.

## API limiter topology and live abuse gate

Recorded in controlled evidence references.

## Clerk production proxy activation

Recorded in controlled evidence references.

## Authentication recovery security

Recorded in controlled evidence references.

## Database migration and recovery

- [x] No concurrent manual migration will run during API startup migration.
- [x] Previous API rollback is forbidden unless schema compatibility is proven.

## Deployment identity and provenance

Recorded in the machine-verifiable control.

## Approved legal publication

Recorded in controlled evidence references.

## Staging smoke and QA

Recorded in the machine-verifiable control.

## Production smoke

Recorded in the machine-verifiable control.

## Monitoring and escalation

Recorded in the machine-verifiable control.

## Rollback/roll-forward decision

Recorded in the machine-verifiable control.

## TestFlight and App Review handoff

- BUILD_SHA: \`${buildSha}\`
- EAS build ID: \`${exactBuildIdentity.easBuildId}\`
- App Store Connect build ID: \`${exactBuildIdentity.appStoreConnectBuildId}\`

## Post-commit decisions

The evidence commit identity and later owner decisions are recorded externally.
`;
}

function git(repoRoot, ...args) {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(
    result.status,
    0,
    `git ${args.join(" ")} failed: ${result.stderr}`,
  );
  return result.stdout.trim();
}

async function writeRepoFile(repoRoot, relativePath, contents) {
  const target = path.join(repoRoot, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, contents);
}

async function commitAll(repoRoot, message) {
  git(repoRoot, "add", "--all", "--");
  git(repoRoot, "commit", "-q", "-m", message);
  return git(repoRoot, "rev-parse", "HEAD");
}

async function createRepository(t, { pinnedRouting = true } = {}) {
  const repoRoot = await mkdtemp(
    path.join(os.tmpdir(), "cut-post-build-evidence-"),
  );
  t.after(() => rm(repoRoot, { recursive: true, force: true }));
  git(repoRoot, "init", "-q");
  git(repoRoot, "config", "user.email", "release-test@example.invalid");
  git(repoRoot, "config", "user.name", "Release Test");

  const easConfig = {
    cli: { requireCommit: true },
    submit: pinnedRouting
      ? { production: { ios: { ascAppId: "1234567890" } } }
      : { production: {} },
  };
  const initialFiles = [
    ["artifacts/cut-os/eas.json", `${JSON.stringify(easConfig, null, 2)}\n`],
    ["artifacts/cut-os/app.json", '{"name":"CUT OS"}\n'],
    ["app-store/app-store-submission.json", '{"status":"draft"}\n'],
    [
      "app-store/testflight-submission.json",
      '{"exactBuildEvidence":{"gitCommit":null}}\n',
    ],
    ["app-store/screenshots/manifest.json", '{"shots":[]}\n'],
    ["app-store/app-store-connect-territories.json", "{}\n"],
    [releaseManifestPath, "# Release evidence\n\nStatus: DRAFT\n"],
    ["APP_REVIEW_RUNBOOK.md", "# Review\n"],
    ["PURCHASE_QA_REPORT.md", "# Purchase QA\n"],
    ["QA_REPORT.md", "# QA\n"],
    ["pnpm-lock.yaml", "lockfileVersion: '9.0'\n"],
    [".github/workflows/release.yml", "name: release\n"],
    ["ops/scripts/check.mjs", "export const ready = true;\n"],
  ];
  for (const [relativePath, contents] of initialFiles) {
    await writeRepoFile(repoRoot, relativePath, contents);
  }
  const buildSha = await commitAll(repoRoot, "build candidate");
  return { buildSha, repoRoot };
}

async function writeEvidenceCommit(
  repoRoot,
  buildSha,
  {
    checksumMatches = true,
    manifestReferencesScreenshot = true,
    manifestContents,
    testFlightBuildSha = buildSha,
  } = {},
) {
  const screenshotName = "CUTOS-v1.0.0-b1-en-US-01.png";
  await writeRepoFile(
    repoRoot,
    "app-store/app-store-submission.json",
    '{"status":"evidence-complete"}\n',
  );
  await writeRepoFile(
    repoRoot,
    "app-store/testflight-submission.json",
    `${JSON.stringify({
      exactBuildEvidence: {
        ...exactBuildIdentity,
        gitCommit: testFlightBuildSha,
      },
    })}\n`,
  );
  await writeRepoFile(
    repoRoot,
    "app-store/screenshots/manifest.json",
    `${JSON.stringify({ shots: manifestReferencesScreenshot ? [{ file: screenshotName }] : [] })}\n`,
  );
  await writeRepoFile(
    repoRoot,
    `app-store/screenshots/files/${screenshotName}`,
    Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  );
  const manifest = Buffer.from(
    manifestContents ?? completeReleaseManifest(buildSha),
    "utf8",
  );
  await writeRepoFile(repoRoot, releaseManifestPath, manifest);
  const digest = checksumMatches
    ? createHash("sha256").update(manifest).digest("hex")
    : "0".repeat(64);
  await writeRepoFile(
    repoRoot,
    `${releaseManifestPath}.sha256`,
    `${digest}  ${releaseManifestPath}\n`,
  );
  return commitAll(repoRoot, "post-build evidence");
}

function expectCode(code) {
  return (error) => {
    assert.ok(error instanceof PostBuildEvidenceError);
    assert.equal(error.code, code);
    return true;
  };
}

test("accepts only a full lowercase commit SHA", () => {
  assert.equal(validateBuildSha("a".repeat(40)), "a".repeat(40));
  for (const value of [
    "a".repeat(39),
    "A".repeat(40),
    "--help",
    `${"a".repeat(40)}^{tree}`,
    "; touch /tmp/not-allowed",
  ]) {
    assert.throws(
      () => validateBuildSha(value),
      expectCode("build_sha_must_be_full_lowercase_hex"),
    );
  }
});

test("rejects the checksum-valid legacy four-line release manifest", async (t) => {
  const { buildSha, repoRoot } = await createRepository(t);
  await writeEvidenceCommit(repoRoot, buildSha, {
    manifestContents: `# Release evidence\n\nStatus: FINAL\nBUILD_SHA: ${buildSha}\n`,
  });
  assert.throws(
    () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
    expectCode("release_manifest_not_final"),
  );
});

test("accepts a complete, identity-bound release manifest", () => {
  const buildSha = "a".repeat(40);
  assert.deepEqual(
    validateReleaseManifestContent({
      manifestBytes: Buffer.from(completeReleaseManifest(buildSha)),
      expectedBuildSha: buildSha,
      exactBuildEvidence: {
        ...exactBuildIdentity,
        gitCommit: buildSha,
      },
      clock: validationClock,
    }),
    { releaseId: "cut-os-1.0.0-1", target: "app_review" },
  );
});

test("the release manifest template carries canonical control JSON", () => {
  const template = readFileSync(releaseManifestTemplate, "utf8");
  const beginMarker = "<!-- CUT_OS_RELEASE_CONTROL_V1_BEGIN -->";
  const endMarker = "<!-- CUT_OS_RELEASE_CONTROL_V1_END -->";
  assert.equal(template.split(beginMarker).length, 2);
  assert.equal(template.split(endMarker).length, 2);

  const block = template.slice(
    template.indexOf(beginMarker) + beginMarker.length,
    template.indexOf(endMarker),
  );
  const fencedJson = block.match(/^\s*```json\s*\n([\s\S]*?)\n```\s*$/u);
  assert.ok(fencedJson);
  const control = JSON.parse(fencedJson[1]);
  assert.equal(fencedJson[1], JSON.stringify(control, null, 2));
  assert.deepEqual(Object.keys(control), [
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
  ]);
  const navigation = template.slice(
    template.indexOf(endMarker) + endMarker.length,
  );
  assert.deepEqual(
    [...navigation.matchAll(/<[^>\r\n]+>/gu)].map((match) => match[0]),
    ["<40 lowercase hex SHA>", "<40 lowercase hex SHA>"],
  );
  assert.doesNotMatch(navigation, /<PASS\/FAIL>|<APPROVED\/BLOCKED>/u);
});

test("release manifest content fails closed on incomplete critical evidence", async (t) => {
  const buildSha = "a".repeat(40);
  const exactBuildEvidence = {
    ...exactBuildIdentity,
    gitCommit: buildSha,
  };

  function expectInvalid({ control, manifest, code }) {
    assert.throws(
      () =>
        validateReleaseManifestContent({
          manifestBytes: Buffer.from(
            manifest ?? completeReleaseManifest(buildSha, control),
          ),
          expectedBuildSha: buildSha,
          exactBuildEvidence,
          clock: validationClock,
        }),
      expectCode(code),
    );
  }

  await t.test("unresolved placeholder", () => {
    expectInvalid({
      manifest: `${completeReleaseManifest(buildSha)}\n- Scope: <pending>\n`,
      code: "release_manifest_unresolved_placeholder",
    });
  });

  await t.test("unchecked control", () => {
    expectInvalid({
      manifest: `${completeReleaseManifest(buildSha)}\n- [ ] final owner control\n`,
      code: "release_manifest_required_control_unchecked",
    });
  });

  await t.test("both upload acknowledgments checked", () => {
    expectInvalid({
      manifest: `${completeReleaseManifest(buildSha)}\n- [x] No EAS upload occurred for this staging-only target.\n`,
      code: "release_manifest_required_control_unchecked",
    });
  });

  await t.test("missing required section", () => {
    expectInvalid({
      manifest: completeReleaseManifest(buildSha).replace(
        "## Monitoring and escalation",
        "## Removed monitoring section",
      ),
      code: "release_manifest_required_section_missing",
    });
  });

  await t.test("non-canonical control JSON", () => {
    expectInvalid({
      manifest: completeReleaseManifest(buildSha).replace(
        '"schemaVersion": 1',
        '"schemaVersion":1',
      ),
      code: "release_manifest_control_invalid",
    });
  });

  await t.test("non-passing automated gate", () => {
    const control = completeReleaseControl(buildSha);
    control.automatedGates.typecheck.status = "FAIL";
    expectInvalid({
      control,
      code: "release_manifest_critical_check_not_pass",
    });
  });

  await t.test("missing approval timestamp", () => {
    const control = completeReleaseControl(buildSha);
    delete control.approvals.apple_seller_legal.atUtc;
    expectInvalid({ control, code: "release_manifest_approval_invalid" });
  });

  await t.test("blocked approval", () => {
    const control = completeReleaseControl(buildSha);
    control.approvals.apple_seller_legal.decision = "BLOCKED";
    expectInvalid({
      control,
      code: "release_manifest_approval_not_approved",
    });
  });

  await t.test("missing approver", () => {
    const control = completeReleaseControl(buildSha);
    control.approvals.subscription_product.approver = "";
    expectInvalid({ control, code: "release_manifest_approval_invalid" });
  });

  await t.test("missing backup reference", () => {
    const control = completeReleaseControl(buildSha);
    control.backupRecovery.backupEvidenceReference = "";
    expectInvalid({
      control,
      code: "release_manifest_backup_recovery_invalid",
    });
  });

  await t.test("missing production smoke check", () => {
    const control = completeReleaseControl(buildSha);
    delete control.smoke.production.api_readiness;
    expectInvalid({
      control,
      code: "release_manifest_smoke_evidence_invalid",
    });
  });

  await t.test("missing release-safety check", () => {
    const control = completeReleaseControl(buildSha);
    delete control.releaseSafetyChecks.clerk_proxy_activation;
    expectInvalid({
      control,
      code: "release_manifest_release_safety_invalid",
    });
  });

  await t.test("missing monitoring signal", () => {
    const control = completeReleaseControl(buildSha);
    delete control.monitoring.signals.purchase_entitlement;
    expectInvalid({
      control,
      code: "release_manifest_monitoring_invalid",
    });
  });

  await t.test("non-passing monitoring alert test", () => {
    const control = completeReleaseControl(buildSha);
    control.monitoring.signals.api_liveness.alertTest.status = "FAIL";
    expectInvalid({
      control,
      code: "release_manifest_critical_check_not_pass",
    });
  });

  await t.test("missing rollback procedure", () => {
    const control = completeReleaseControl(buildSha);
    delete control.rollback.runbookReference;
    expectInvalid({ control, code: "release_manifest_rollback_invalid" });
  });

  await t.test("BUILD_SHA mismatch", () => {
    const control = completeReleaseControl(buildSha);
    control.build.gitSha = "b".repeat(40);
    expectInvalid({
      control,
      code: "release_manifest_build_identity_mismatch",
    });
  });

  await t.test("EAS build identity mismatch", () => {
    const control = completeReleaseControl(buildSha);
    control.deployments.easBuildId = "different-eas-build";
    expectInvalid({
      control,
      code: "release_manifest_deployment_identity_mismatch",
    });
  });

  await t.test("evidence timestamp after finalization", () => {
    const control = completeReleaseControl(buildSha);
    control.monitoring.coverage.atUtc = "2026-08-03T13:00:01Z";
    expectInvalid({
      control,
      code: "release_manifest_timestamp_after_finalization",
    });
  });

  await t.test("conflicting human-readable outcome", async (t) => {
    for (const outcome of [
      "FAIL",
      "FAILED",
      "FAILURE",
      "DENIED",
      "did not pass",
    ]) {
      await t.test(outcome, () => {
        expectInvalid({
          manifest: `${completeReleaseManifest(buildSha)}\n- CI conclusion: ${outcome}\n`,
          code: "release_manifest_conflicting_human_outcome",
        });
      });
    }
  });

  await t.test("critical evidence timestamp before record creation", () => {
    const control = completeReleaseControl(buildSha);
    control.automatedGates.typecheck.atUtc = "2026-08-03T09:59:59Z";
    expectInvalid({
      control,
      code: "release_manifest_timestamp_before_creation",
    });
  });

  await t.test("future-dated finalization", () => {
    const control = completeReleaseControl(buildSha);
    control.finalizedAtUtc = "2026-08-04T00:00:00.001Z";
    expectInvalid({
      control,
      code: "release_manifest_finalization_in_future",
    });
  });

  await t.test("restore drill older than the 90-day policy", () => {
    const control = completeReleaseControl(buildSha);
    control.backupRecovery.restoreDrillAtUtc = "2026-04-01T15:00:00Z";
    expectInvalid({
      control,
      code: "release_manifest_restore_drill_too_old",
    });
  });

  await t.test("App Review target without EAS upload approval", () => {
    const control = completeReleaseControl(buildSha);
    control.approvals.eas_upload = {
      decision: "NOT_APPLICABLE",
      approver: "business-owner",
      atUtc: "2026-08-03T12:35:00Z",
      evidenceReference: "approvals/eas-upload",
      notApplicableReason: "No additional paid quota was required",
    };
    expectInvalid({
      control,
      code: "release_manifest_approval_not_approved",
    });
  });
});

test("accepts fractional-second UTC and staging-only no-upload evidence", () => {
  const buildSha = "a".repeat(40);
  const control = completeReleaseControl(buildSha);
  control.target = "staging";
  control.finalizedAtUtc = "2026-08-03T13:00:00.500Z";
  control.automatedGates.typecheck.atUtc = "2026-08-03T12:30:00.125Z";
  control.approvals.eas_upload = {
    decision: "NOT_APPLICABLE",
    approver: "business-owner",
    atUtc: "2026-08-03T12:35:00.250Z",
    evidenceReference: "approvals/eas-upload",
    notApplicableReason: "No upload occurs for this staging-only target",
  };
  assert.deepEqual(
    validateReleaseManifestContent({
      manifestBytes: Buffer.from(completeReleaseManifest(buildSha, control)),
      expectedBuildSha: buildSha,
      exactBuildEvidence: {
        ...exactBuildIdentity,
        gitCommit: buildSha,
      },
      clock: validationClock,
    }),
    { releaseId: "cut-os-1.0.0-1", target: "staging" },
  );
});

test("accepts exactly one clean, content- and checksum-bound evidence child", async (t) => {
  const { buildSha, repoRoot } = await createRepository(t);
  const postBuildEvidenceSha = await writeEvidenceCommit(repoRoot, buildSha);
  assert.deepEqual(verifyPostBuildEvidenceBoundary({ repoRoot }), {
    buildSha,
    postBuildEvidenceSha,
    changedPathCount: 6,
    releaseTarget: "app_review",
  });
});

test("rejects tracked and untracked dirt", async (t) => {
  for (const [label, relativePath] of [
    ["tracked", "app-store/app-store-submission.json"],
    ["untracked", "untracked.txt"],
  ]) {
    await t.test(label, async (t) => {
      const { buildSha, repoRoot } = await createRepository(t);
      await writeRepoFile(repoRoot, relativePath, "dirty\n");
      assert.throws(
        () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
        expectCode("worktree_not_clean"),
      );
    });
  }
});

test("requires the evidence SHA to be the single direct child of BUILD_SHA", async (t) => {
  const { buildSha, repoRoot } = await createRepository(t);
  await writeEvidenceCommit(repoRoot, buildSha);
  await writeRepoFile(
    repoRoot,
    "app-store/app-store-submission.json",
    '{"status":"changed-again"}\n',
  );
  await commitAll(repoRoot, "second evidence commit");
  assert.throws(
    () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
    expectCode("evidence_commit_must_directly_follow_build_sha"),
  );
});

test("rejects a sibling BUILD_SHA", async (t) => {
  const { buildSha, repoRoot } = await createRepository(t);
  await writeRepoFile(repoRoot, "QA_REPORT.md", "sibling\n");
  const siblingSha = await commitAll(repoRoot, "sibling");
  git(repoRoot, "checkout", "-q", "-b", "evidence", buildSha);
  await writeEvidenceCommit(repoRoot, buildSha);
  assert.throws(
    () => verifyPostBuildEvidenceBoundary({ buildSha: siblingSha, repoRoot }),
    expectCode("testflight_build_sha_mismatch"),
  );
});

test("rejects runtime, routing, dependency, workflow, script, and broad QA changes", async (t) => {
  for (const relativePath of [
    "artifacts/cut-os/app.json",
    "artifacts/cut-os/eas.json",
    "pnpm-lock.yaml",
    ".github/workflows/release.yml",
    "ops/scripts/check.mjs",
    "QA_REPORT.md",
    "PURCHASE_QA_REPORT.md",
    "APP_REVIEW_RUNBOOK.md",
  ]) {
    await t.test(relativePath, async (t) => {
      const { buildSha, repoRoot } = await createRepository(t);
      await writeRepoFile(repoRoot, relativePath, "changed after build\n");
      await writeEvidenceCommit(repoRoot, buildSha);
      assert.throws(
        () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
        expectCode("post_build_path_or_operation_not_allowlisted"),
      );
    });
  }
});

test("rejects deletion, rename, executable mode, and symlink evidence", async (t) => {
  await t.test("deletion", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await rm(
      path.join(repoRoot, "app-store/app-store-connect-territories.json"),
    );
    await writeEvidenceCommit(repoRoot, buildSha);
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("post_build_path_or_operation_not_allowlisted"),
    );
  });
  await t.test("rename", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await rename(
      path.join(repoRoot, "app-store/app-store-connect-territories.json"),
      path.join(repoRoot, "app-store/territories-renamed.json"),
    );
    await writeEvidenceCommit(repoRoot, buildSha);
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("post_build_path_or_operation_not_allowlisted"),
    );
  });
  await t.test("executable mode", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await chmod(
      path.join(repoRoot, "app-store/app-store-submission.json"),
      0o755,
    );
    await writeEvidenceCommit(repoRoot, buildSha);
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("post_build_evidence_must_be_regular_non_executable_file"),
    );
  });
  await t.test("symlink screenshot", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    const postBuildEvidenceSha = await writeEvidenceCommit(repoRoot, buildSha);
    git(repoRoot, "reset", "--soft", buildSha);
    const screenshotPath = path.join(
      repoRoot,
      "app-store/screenshots/files/CUTOS-v1.0.0-b1-en-US-01.png",
    );
    await rm(screenshotPath);
    const outsideImage = `${repoRoot}-outside.png`;
    t.after(() => rm(outsideImage, { force: true }));
    await writeFile(outsideImage, "outside\n");
    await symlink(outsideImage, screenshotPath);
    git(repoRoot, "add", "--all", "--");
    git(repoRoot, "commit", "-q", "-C", postBuildEvidenceSha);
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("post_build_evidence_must_be_regular_non_executable_file"),
    );
  });
});

test("binds every added PNG exactly to the screenshot manifest", async (t) => {
  const { buildSha, repoRoot } = await createRepository(t);
  await writeEvidenceCommit(repoRoot, buildSha, {
    manifestReferencesScreenshot: false,
  });
  assert.throws(
    () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
    expectCode("screenshot_evidence_not_exactly_manifest_bound"),
  );
});

test("requires one existing manifest and an exact adjacent checksum", async (t) => {
  const { buildSha, repoRoot } = await createRepository(t);
  await writeEvidenceCommit(repoRoot, buildSha, { checksumMatches: false });
  assert.throws(
    () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
    expectCode("release_manifest_checksum_invalid"),
  );
});

test("cross-checks TestFlight BUILD_SHA", async (t) => {
  const { buildSha, repoRoot } = await createRepository(t);
  await writeEvidenceCommit(repoRoot, buildSha, {
    testFlightBuildSha: "a".repeat(40),
  });
  assert.throws(
    () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
    expectCode("testflight_build_sha_mismatch"),
  );
});

test("requires byte-identical pinned routing and cli.requireCommit", () => {
  const pinned = Buffer.from(
    '{"cli":{"requireCommit":true},"submit":{"production":{"ios":{"ascAppId":"1234567890"}}}}\n',
  );
  assert.doesNotThrow(() =>
    validatePinnedRoutingBytes({ buildBytes: pinned, evidenceBytes: pinned }),
  );
  assert.throws(
    () =>
      validatePinnedRoutingBytes({
        buildBytes: pinned,
        evidenceBytes: Buffer.from(`${pinned.toString("utf8")} `),
      }),
    expectCode("eas_json_changed_since_build"),
  );
  const noCommitLock = Buffer.from(
    '{"cli":{"requireCommit":false},"submit":{"production":{"ios":{"ascAppId":"1234567890"}}}}\n',
  );
  assert.throws(
    () =>
      validatePinnedRoutingBytes({
        buildBytes: noCommitLock,
        evidenceBytes: noCommitLock,
      }),
    expectCode("eas_cli_require_commit_not_enabled"),
  );
  const unpinned = Buffer.from(
    '{"cli":{"requireCommit":true},"submit":{"production":{}}}\n',
  );
  assert.throws(
    () =>
      validatePinnedRoutingBytes({
        buildBytes: unpinned,
        evidenceBytes: unpinned,
      }),
    expectCode("production_ios_asc_app_id_not_pinned"),
  );
});

test("CLI accepts no ref arguments and emits only a stable code", () => {
  const result = spawnSync(
    process.execPath,
    [script, `${"a".repeat(40)}^{tree}`],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /arguments_not_allowed/u);
  assert.doesNotMatch(result.stderr, /\^\{tree\}/u);
});
