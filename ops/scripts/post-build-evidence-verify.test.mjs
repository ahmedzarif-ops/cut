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
const ciWorkflow = fileURLToPath(
  new URL("../../.github/workflows/ci.yml", import.meta.url),
);
const rootPackageJson = fileURLToPath(
  new URL("../../package.json", import.meta.url),
);
const appReviewReleaseManifestPath =
  "release-evidence/1.0.0-1-app-review-20260803T120000Z.md";
const publicReleaseManifestPath =
  "release-evidence/1.0.0-1-public-release-20260803T120000Z.md";
const releaseManifestPath = appReviewReleaseManifestPath;
const exactBuildIdentity = Object.freeze({
  appVersion: "1.0.0",
  buildNumber: "1",
  easBuildId: "eas-build-01234567",
  appStoreConnectBuildId: "asc-build-01234567",
});
const databaseMigrationSql = "select 1;\n";
const previousDatabaseMigrationSql = "select 0;\n";
const previousDatabaseMigrationRevision = Object.freeze({
  tag: "0009_previous_migration",
  createdAt: 1785790799000,
  sha256: createHash("sha256")
    .update(Buffer.from(previousDatabaseMigrationSql, "utf8"))
    .digest("hex"),
});
const databaseMigrationRevision = Object.freeze({
  tag: "0010_minimize_v1_profile",
  createdAt: 1785790800000,
  sha256: createHash("sha256")
    .update(Buffer.from(databaseMigrationSql, "utf8"))
    .digest("hex"),
});
const syntheticPreviousBuildSha = "b".repeat(40);
const initialLaunchMigrationComparison = Object.freeze({
  state: "initial_launch",
  productionApiRevision: null,
  buildGitSha: null,
  databaseMigrationRevision: null,
  hasNewMigrations: true,
});
const validationClock = () => new Date("2026-08-04T00:00:00Z");
const productionPublicOrigin = "https://cut-production-public.com";

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
  "tracked_secret_boundary",
  "production_topology_dry_run",
  "production_release_config",
  "production_ios_export",
  "production_archive_secret_boundary",
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
  "app_store_server_notifications_decision",
  "accessibility_label_decision",
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

const monitoringSignalRuleContracts = {
  api_liveness: {
    non200_count: ["numeric", "count"],
  },
  api_readiness_latency: {
    non200_event: ["any_event"],
    latency_ms: ["numeric", "milliseconds"],
  },
  api_errors_latency: {
    five_xx_rate: ["numeric", "percent"],
    latency_ms: ["numeric", "milliseconds"],
  },
  startup_migration: {
    startup_failure_event: ["any_event"],
  },
  auth_failures: {
    unexpected_error_rate: ["numeric", "percent"],
    auth_guard_failure_event: ["any_event"],
  },
  purchase_entitlement: {
    provider_error_event: ["any_event"],
    entitlement_anomaly_event: ["any_event"],
    purchase_restore_failure_rate: ["numeric", "percent"],
  },
  account_deletion: {
    worker_failure_event: ["any_event"],
    request_failure_rate: ["numeric", "percent"],
    pending_age_seconds: ["numeric", "seconds"],
    retry_count: ["numeric", "count"],
  },
  database_backup: {
    pool_saturation_ratio: ["numeric", "ratio"],
    lock_wait_ms: ["numeric", "milliseconds"],
    storage_usage_ratio: ["numeric", "ratio"],
    replication_lag_seconds: ["numeric", "seconds"],
    backup_failure_event: ["any_event"],
  },
  mobile_crash_hang: {
    crash_hang_rate: ["numeric", "percent"],
    critical_flow_failure_rate: ["numeric", "percent"],
  },
  legal_support: {
    resource_failure_event: ["any_event"],
  },
  privacy_security: {
    incident_event: ["any_event"],
  },
};
const monitoringSignalIds = Object.keys(monitoringSignalRuleContracts);

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

function numericThresholds({
  comparator = "greater_than_or_equal",
  warningValue = 2,
  criticalValue = 5,
  unit = "count",
  windowSeconds = 300,
} = {}) {
  return {
    mode: "numeric",
    warning: {
      comparator,
      value: warningValue,
      unit,
      windowSeconds,
    },
    critical: {
      comparator,
      value: criticalValue,
      unit,
      windowSeconds,
    },
  };
}

function anyEventThresholds() {
  return {
    mode: "any_event",
    warning: null,
    critical: null,
  };
}

function monitoringRules(signalId) {
  return Object.fromEntries(
    Object.entries(monitoringSignalRuleContracts[signalId]).map(
      ([ruleId, [mode, unit]]) => [
        ruleId,
        mode === "any_event"
          ? anyEventThresholds()
          : numericThresholds({
              unit,
              warningValue: unit === "ratio" ? 0.7 : 2,
              criticalValue: unit === "ratio" ? 0.9 : 5,
            }),
      ],
    ),
  );
}

function completeReleaseControl(
  buildSha,
  target = "app_review",
  _previousBuildSha = syntheticPreviousBuildSha,
) {
  const noPreviousRevision = "N/A — initial production launch — release-owner";
  return {
    schemaVersion: 2,
    status: "FINAL",
    releaseId: "cut-os-1.0.0-1",
    target,
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
      productionApiRevision: "production-service-r17",
      previousProductionApiRevision: noPreviousRevision,
      publicLegalRevision: "production-service-r17",
      previousPublicLegalRevision: noPreviousRevision,
      databaseMigrationRevision: { ...databaseMigrationRevision },
      previousProductionMigration: {
        state: "initial_launch",
        productionApiRevision: null,
        buildGitSha: null,
        databaseMigrationRevision: null,
        verifiedBy: "database-recovery-owner",
        verifiedAtUtc: "2026-08-03T11:40:00Z",
        evidenceReference: "provider/previous-production-migration",
      },
      replitProductionHosting: {
        provider: "replit",
        accountAlias: "cut-release-owner",
        workspaceId: "cut-production-workspace",
        deploymentId: "cut-production-deployment",
        databaseId: "cut-production-database",
        providerDeploymentOrigin: "https://cut-production.replit.app",
        publicOrigin: productionPublicOrigin,
        deploymentType: "reserved_vm",
        region: "North America",
        machineClass: "0.5 vCPU / 2 GiB",
        minimumInstances: 1,
        maximumInstances: 1,
        fixedMonthlyCostUsdCentsBeforeTax: 1500,
        usageBasedServiceShutdownLimitUsdCentsBeforeTax: 500,
        approvedMonthlyCostCeilingUsdCentsBeforeTax: 2000,
        costApprovedBy: "business-owner",
        costApprovedAtUtc: "2026-08-03T12:20:00Z",
        costApprovalEvidenceReference: "approvals/replit-cost-ceiling",
        configurationVerifiedAtUtc: "2026-08-03T12:25:00Z",
        configurationEvidenceReference: "provider/replit-production-config",
      },
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
      migrationClassification: {
        class: "destructive_incompatible",
        classifiedBy: "database-recovery-owner",
        atUtc: "2026-08-03T11:45:00Z",
        evidenceReference: "database/migration-classification",
      },
      migrationRehearsal: {
        ...passingEvidence("migration-rehearsal"),
        atUtc: "2026-08-03T11:42:00Z",
      },
      databaseReadiness: passingEvidence("database-readiness"),
      productionMigrationWindow: {
        productionApiRevision: "production-service-r17",
        buildGitSha: buildSha,
        databaseId: "cut-production-database",
        databaseMigrationRevision: { ...databaseMigrationRevision },
        startedAtUtc: "2026-08-03T12:05:00Z",
        completedAtUtc: "2026-08-03T12:10:00Z",
        evidenceReference: "database/production-migration-window",
      },
      writesQuiesced: {
        mode: "initial_launch_no_prior_writes",
        atUtc: "2026-08-03T11:50:00Z",
        verifiedBy: "database-recovery-owner",
        evidenceReference: "database/initial-launch-writes-quiesced",
      },
      backupCoverageAtUtc: "2026-08-03T12:00:00Z",
      backupEvidenceReference: "provider/backups/coverage-17",
      recoveryPoint: {
        atUtc: "2026-08-03T11:55:00Z",
        evidenceReference: "provider/recovery-points/17",
      },
      restoreDrillAtUtc: "2026-08-01T15:00:00Z",
      restoreDrillEvidenceReference: "provider/restore-drills/17",
      rpo: "15 minutes",
      rto: "60 minutes",
      recoveryApproval: {
        ...approved("database-recovery"),
        atUtc: "2026-08-03T12:02:00Z",
      },
      previousApiCompatible: false,
      previousApiCompatibilityEvidenceReference:
        "database/previous-api-compatibility",
      rollForwardProcedure: {
        ...passingEvidence("database-roll-forward-procedure"),
        atUtc: "2026-08-03T11:43:00Z",
      },
      coordinatedRestoreProcedure: {
        ...passingEvidence(
          "coordinated-database-application-restore-procedure",
        ),
        atUtc: "2026-08-03T11:44:00Z",
      },
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
            rules: monitoringRules(id),
            destination: "release-operations-alerts",
            primaryOwner: `${id}-primary-owner`,
            backupOwner: `${id}-backup-owner`,
            baselineEvidenceReference: `monitoring/baselines/${id}`,
            approval: approved(`monitoring-threshold-${id}`),
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
      schemaSafetyEvidenceReference: "database/previous-api-compatibility",
      previousApplicationRevision: noPreviousRevision,
      previousPublicLegalRevision: noPreviousRevision,
      databaseRecoveryPointReference: "provider/recovery-points/17",
      runbookReference: "runbooks/release-rollback",
      postActionProbes: passingEvidence("post-action-probes"),
    },
  };
}

function selectUnsupportedDeployedBaseline(
  control,
  previousBuildSha = syntheticPreviousBuildSha,
) {
  control.deployments.previousProductionApiRevision = "production-service-r16";
  control.deployments.previousPublicLegalRevision = "production-service-r16";
  control.deployments.previousProductionMigration = {
    state: "deployed",
    productionApiRevision: "production-service-r16",
    buildGitSha: previousBuildSha,
    databaseMigrationRevision: { ...previousDatabaseMigrationRevision },
    verifiedBy: "database-recovery-owner",
    verifiedAtUtc: "2026-08-03T11:40:00Z",
    evidenceReference: "provider/previous-production-migration",
  };
  control.rollback.previousApplicationRevision = "production-service-r16";
  control.rollback.previousPublicLegalRevision = "production-service-r16";
  return control;
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

<!-- CUT_OS_RELEASE_CONTROL_V2_BEGIN -->
\`\`\`json
${JSON.stringify(control, null, 2)}
\`\`\`
<!-- CUT_OS_RELEASE_CONTROL_V2_END -->

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
- [x] Application-only rollback is forbidden after any completed database migration.

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

function draftReleaseManifest(target, releaseId = "cut-os-1.0.0-1") {
  const control = completeReleaseControl("BUILD_SHA_PENDING", target);
  control.status = "DRAFT";
  control.releaseId = releaseId;
  return completeReleaseManifest("BUILD_SHA_PENDING", control).replace(
    "- Manifest status: `FINAL`",
    "- Manifest status: `DRAFT`",
  );
}

function submissionForClerkState(
  testModeState,
  { updated = "2026-08-03" } = {},
) {
  return {
    status: "approved_for_submission",
    updated,
    listing: {
      appName: "CUT OS",
      releaseMethod: "manual",
      supportUrl: `${productionPublicOrigin}/support`,
      privacyPolicyUrl: `${productionPublicOrigin}/privacy`,
      termsUrl: `${productionPublicOrigin}/terms`,
    },
    appReview: {
      status: "ready_for_review",
      clerkReviewAccess: {
        strategy: "clerk_production_test_mode_reserved_email_code",
        clientTrustEnabled: true,
        allReviewAccountsUseReservedTestEmail: true,
        fixedCodePolicy: "clerk_reserved_424242",
        exactBuildClientTrustFlowVerified: true,
        testModeState,
        verifiedAtUtc:
          testModeState === "enabled_for_app_review"
            ? "2026-08-03T12:45:00Z"
            : "2026-08-03T13:15:00Z",
        evidenceReference:
          testModeState === "enabled_for_app_review"
            ? "clerk/app-review-access"
            : "clerk/public-release-access",
        shutdownControl: {
          primaryOwner: "release-lead",
          backupOwner: "security-owner",
          bothHaveProductionClerkAccess: true,
          statusSource: "exact_app_store_connect_submission",
          statusMonitoringConfigured: true,
          escalationConfigured: true,
          closureSloMinutes: 15,
          accessPreflightAtUtc: "2026-08-03T12:40:00Z",
          accessPreflightEvidenceReference: "clerk/shutdown-access-preflight",
          triggerObservedAtUtc:
            testModeState === "enabled_for_app_review"
              ? null
              : "2026-08-03T13:05:00Z",
          testModeDisabledAtUtc:
            testModeState === "enabled_for_app_review"
              ? null
              : "2026-08-03T13:10:00Z",
          shutdownEvidenceReference:
            testModeState === "enabled_for_app_review"
              ? null
              : "clerk/test-mode-shutdown",
        },
      },
      appleWorkflow:
        testModeState === "enabled_for_app_review"
          ? {
              state: "ready_for_review",
              submissionReference: "asc-submission-v1",
              appVersionIncluded: true,
              subscriptionIncluded: true,
              subscriptionGroupIncluded: true,
              manualReleaseSelected: true,
              appVersionStatus: "ready_for_review",
              submissionSection: "drafts",
              reviewActive: false,
              allSubmittedItemsAccepted: false,
              verifiedAtUtc: "2026-08-03T12:50:00Z",
              evidenceReference: "apple/app-review-draft-ready",
            }
          : {
              state: "approved_pending_developer_release",
              submissionReference: "asc-submission-v1",
              appVersionIncluded: true,
              subscriptionIncluded: true,
              subscriptionGroupIncluded: true,
              manualReleaseSelected: true,
              appVersionStatus: "pending_developer_release",
              submissionSection: "completed",
              reviewActive: false,
              allSubmittedItemsAccepted: true,
              verifiedAtUtc: "2026-08-03T13:20:00Z",
              evidenceReference: "apple/public-release-approved",
            },
      accountStates: Object.fromEntries(
        ["fullAccess", "purchase", "adultGate", "restricted", "deletion"].map(
          (id) => [
            id,
            {
              status: "verified_fresh",
              nonExpiring: true,
              noMfaOrOutOfBandTrap: true,
              testedAtUtc: "2026-08-03T12:45:00Z",
              evidenceReference: `accounts/app-review-${id}`,
            },
          ],
        ),
      ),
    },
  };
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

async function createRepository(
  t,
  {
    pinnedRouting = true,
    appReviewDraftTarget = "app_review",
    publicReleaseDraftTarget = "public_release",
    appReviewDraftReleaseId = "cut-os-1.0.0-1",
    publicReleaseDraftReleaseId = "cut-os-1.0.0-1",
    appReviewDraftContents,
    publicReleaseDraftContents,
    includePublicReleaseDraft = true,
    includeMigrationJournal = true,
    migrationJournalContents,
    migrationSqlContents = databaseMigrationSql,
    candidateAddsMigration = true,
    additionalInitialFiles = [],
  } = {},
) {
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
  const previousJournal = {
    version: "7",
    dialect: "postgresql",
    entries: [
      {
        idx: 0,
        version: "7",
        when: previousDatabaseMigrationRevision.createdAt,
        tag: previousDatabaseMigrationRevision.tag,
        breakpoints: true,
      },
    ],
  };
  await writeRepoFile(
    repoRoot,
    "lib/db/migrations/meta/_journal.json",
    `${JSON.stringify(previousJournal, null, 2)}\n`,
  );
  await writeRepoFile(
    repoRoot,
    `lib/db/migrations/${previousDatabaseMigrationRevision.tag}.sql`,
    previousDatabaseMigrationSql,
  );
  const previousBuildSha = await commitAll(
    repoRoot,
    "previous production build",
  );

  const candidateJournal = {
    ...previousJournal,
    entries: candidateAddsMigration
      ? [
          ...previousJournal.entries,
          {
            idx: 1,
            version: "7",
            when: databaseMigrationRevision.createdAt,
            tag: databaseMigrationRevision.tag,
            breakpoints: true,
          },
        ]
      : previousJournal.entries,
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
    [
      releaseManifestPath,
      appReviewDraftContents ??
        draftReleaseManifest(appReviewDraftTarget, appReviewDraftReleaseId),
    ],
    ...(includePublicReleaseDraft
      ? [
          [
            publicReleaseManifestPath,
            publicReleaseDraftContents ??
              draftReleaseManifest(
                publicReleaseDraftTarget,
                publicReleaseDraftReleaseId,
              ),
          ],
        ]
      : []),
    ...(includeMigrationJournal
      ? [
          [
            "lib/db/migrations/meta/_journal.json",
            migrationJournalContents ??
              `${JSON.stringify(candidateJournal, null, 2)}\n`,
          ],
        ]
      : []),
    ...(candidateAddsMigration
      ? [
          [
            `lib/db/migrations/${databaseMigrationRevision.tag}.sql`,
            migrationSqlContents,
          ],
        ]
      : []),
    ["APP_REVIEW_RUNBOOK.md", "# Review\n"],
    ["PURCHASE_QA_REPORT.md", "# Purchase QA\n"],
    ["QA_REPORT.md", "# QA\n"],
    ["pnpm-lock.yaml", "lockfileVersion: '9.0'\n"],
    [".github/workflows/release.yml", "name: release\n"],
    ["ops/scripts/check.mjs", "export const ready = true;\n"],
    ...additionalInitialFiles,
  ];
  for (const [relativePath, contents] of initialFiles) {
    await writeRepoFile(repoRoot, relativePath, contents);
  }
  if (!includeMigrationJournal) {
    await rm(path.join(repoRoot, "lib/db/migrations/meta/_journal.json"));
  }
  const buildSha = await commitAll(repoRoot, "build candidate");
  return { buildSha, previousBuildSha, repoRoot };
}

async function writeEvidenceCommit(
  repoRoot,
  buildSha,
  {
    checksumMatches = true,
    manifestReferencesScreenshot = true,
    manifestContents,
    manifestPath = releaseManifestPath,
    releaseTarget = "app_review",
    submission = submissionForClerkState("enabled_for_app_review"),
    testFlightBuildSha = buildSha,
  } = {},
) {
  const screenshotName = "CUTOS-v1.0.0-b1-en-US-01.png";
  const previousBuildSha = git(repoRoot, "rev-parse", `${buildSha}^`);
  await writeRepoFile(
    repoRoot,
    "app-store/app-store-submission.json",
    `${JSON.stringify(submission, null, 2)}\n`,
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
    manifestContents ??
      completeReleaseManifest(
        buildSha,
        completeReleaseControl(buildSha, releaseTarget, previousBuildSha),
      ),
    "utf8",
  );
  await writeRepoFile(repoRoot, manifestPath, manifest);
  const digest = checksumMatches
    ? createHash("sha256").update(manifest).digest("hex")
    : "0".repeat(64);
  await writeRepoFile(
    repoRoot,
    `${manifestPath}.sha256`,
    `${digest}  ${manifestPath}\n`,
  );
  return commitAll(repoRoot, "post-build evidence");
}

async function writePublicReleaseTransition(
  repoRoot,
  buildSha,
  {
    manifestPath = publicReleaseManifestPath,
    releaseId = "cut-os-1.0.0-1",
    releaseTarget = "public_release",
    finalizedAtUtc = "2026-08-03T13:30:00Z",
    mutateControl,
    submission = submissionForClerkState("disabled_for_public_release", {
      updated: "2026-08-04",
    }),
  } = {},
) {
  const previousBuildSha = git(repoRoot, "rev-parse", `${buildSha}^`);
  await writeRepoFile(
    repoRoot,
    "app-store/app-store-submission.json",
    `${JSON.stringify(submission, null, 2)}\n`,
  );
  const control = completeReleaseControl(
    buildSha,
    releaseTarget,
    previousBuildSha,
  );
  control.releaseId = releaseId;
  control.finalizedAtUtc = finalizedAtUtc;
  if (typeof mutateControl === "function") mutateControl(control);
  const manifest = Buffer.from(
    completeReleaseManifest(buildSha, control),
    "utf8",
  );
  await writeRepoFile(repoRoot, manifestPath, manifest);
  const digest = createHash("sha256").update(manifest).digest("hex");
  await writeRepoFile(
    repoRoot,
    `${manifestPath}.sha256`,
    `${digest}  ${manifestPath}\n`,
  );
  return commitAll(repoRoot, "public release evidence");
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
    expectCode("release_manifest_control_missing"),
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
      expectedDatabaseMigrationRevision: databaseMigrationRevision,
      expectedMigrationComparison: initialLaunchMigrationComparison,
      clock: validationClock,
    }),
    { releaseId: "cut-os-1.0.0-1", target: "app_review" },
  );
});

test("the release manifest template carries canonical control JSON", () => {
  const template = readFileSync(releaseManifestTemplate, "utf8");
  const beginMarker = "<!-- CUT_OS_RELEASE_CONTROL_V2_BEGIN -->";
  const endMarker = "<!-- CUT_OS_RELEASE_CONTROL_V2_END -->";
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
  assert.equal(control.schemaVersion, 2);
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
  assert.deepEqual(Object.keys(control.deployments.databaseMigrationRevision), [
    "tag",
    "createdAt",
    "sha256",
  ]);
  assert.deepEqual(
    Object.keys(control.deployments.previousProductionMigration),
    [
      "state",
      "productionApiRevision",
      "buildGitSha",
      "databaseMigrationRevision",
      "verifiedBy",
      "verifiedAtUtc",
      "evidenceReference",
    ],
  );
  assert.equal(
    control.deployments.previousProductionMigration.productionApiRevision,
    null,
  );
  assert.equal(
    control.deployments.previousProductionMigration.buildGitSha,
    null,
  );
  assert.equal(
    control.deployments.previousProductionMigration.databaseMigrationRevision,
    null,
  );
  assert.deepEqual(Object.keys(control.deployments.replitProductionHosting), [
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
  ]);
  assert.deepEqual(Object.keys(control.backupRecovery), [
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
  ]);
  assert.deepEqual(
    Object.keys(control.backupRecovery.migrationClassification),
    ["class", "classifiedBy", "atUtc", "evidenceReference"],
  );
  assert.deepEqual(Object.keys(control.backupRecovery.recoveryPoint), [
    "atUtc",
    "evidenceReference",
  ]);
  assert.deepEqual(
    Object.keys(control.backupRecovery.productionMigrationWindow),
    [
      "productionApiRevision",
      "buildGitSha",
      "databaseId",
      "databaseMigrationRevision",
      "startedAtUtc",
      "completedAtUtc",
      "evidenceReference",
    ],
  );
  assert.deepEqual(Object.keys(control.backupRecovery.writesQuiesced), [
    "mode",
    "atUtc",
    "verifiedBy",
    "evidenceReference",
  ]);
  assert.deepEqual(Object.keys(control.monitoring.signals.api_liveness), [
    "rules",
    "destination",
    "primaryOwner",
    "backupOwner",
    "baselineEvidenceReference",
    "approval",
    "alertTest",
  ]);
  assert.deepEqual(
    Object.keys(control.monitoring.signals),
    monitoringSignalIds,
  );
  for (const [signalId, contracts] of Object.entries(
    monitoringSignalRuleContracts,
  )) {
    assert.deepEqual(
      Object.keys(control.monitoring.signals[signalId].rules),
      Object.keys(contracts),
    );
  }
  assert.deepEqual(
    Object.keys(control.monitoring.signals.api_liveness.rules.non200_count),
    ["mode", "warning", "critical"],
  );
  assert.deepEqual(
    Object.keys(
      control.monitoring.signals.api_liveness.rules.non200_count.warning,
    ),
    ["comparator", "value", "unit", "windowSeconds"],
  );
  assert.equal(
    Object.values(monitoringSignalRuleContracts).reduce(
      (total, contracts) => total + Object.keys(contracts).length,
      0,
    ),
    24,
  );
  assert.deepEqual(Object.keys(control.approvals), approvalIds);
  assert.deepEqual(Object.keys(control.automatedGates), automatedGateIds);
  const navigation = template.slice(
    template.indexOf(endMarker) + endMarker.length,
  );
  assert.deepEqual(
    [...navigation.matchAll(/<[^>\r\n]+>/gu)].map((match) => match[0]),
    ["<40 lowercase hex SHA>", "<40 lowercase hex SHA>"],
  );
  assert.doesNotMatch(navigation, /<PASS\/FAIL>|<APPROVED\/BLOCKED>/u);
});

test("release-evidence CI retains full history and proves current-base ancestry", () => {
  const workflow = readFileSync(ciWorkflow, "utf8");
  const releaseEvidenceJob = workflow.slice(
    workflow.indexOf("release-evidence:"),
  );
  assert.match(releaseEvidenceJob, /fetch-depth:\s*0\b/u);
  assert.match(
    releaseEvidenceJob,
    /ref:\s*\$\{\{ github\.event_name == 'pull_request' && github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/u,
  );
  assert.match(releaseEvidenceJob, /github\.event\.pull_request\.base\.sha/u);
  assert.match(releaseEvidenceJob, /github\.event\.pull_request\.base\.ref/u);
  assert.match(releaseEvidenceJob, /github\.event\.before/u);
  assert.match(releaseEvidenceJob, /GIT_REF:\s*\$\{\{ github\.ref \}\}/u);
  assert.match(
    releaseEvidenceJob,
    /node ops\/scripts\/release-main-ancestry-verify\.mjs/u,
  );
});

test("CI and release-operations execute every machine-recorded local gate", () => {
  const workflow = readFileSync(ciWorkflow, "utf8");
  const trackedTest = workflow.indexOf(
    "node --test ops/scripts/secret-boundary-scan.test.mjs",
  );
  const trackedScan = workflow.indexOf(
    "node ops/scripts/secret-boundary-scan.mjs tracked",
  );
  const install = workflow.indexOf("pnpm install --frozen-lockfile");
  const topologyDryRun = workflow.indexOf("pnpm run dry-run:production");
  const iosExport = workflow.indexOf("expo export --platform ios");
  const archiveScan = workflow.indexOf(
    'node ops/scripts/secret-boundary-scan.mjs archive "$RUNNER_TEMP/cut-ios-export"',
  );
  assert.ok(trackedTest >= 0);
  assert.ok(trackedScan > trackedTest);
  assert.ok(install > trackedScan);
  assert.ok(topologyDryRun > install);
  assert.ok(iosExport > topologyDryRun);
  assert.ok(archiveScan > iosExport);

  const rootPackage = JSON.parse(readFileSync(rootPackageJson, "utf8"));
  assert.match(
    rootPackage.scripts["test:release-ops"],
    /(?:^|\s)ops\/scripts\/secret-boundary-scan\.test\.mjs(?:\s|$)/u,
  );
});

test("release manifest content fails closed on incomplete critical evidence", async (t) => {
  const buildSha = "a".repeat(40);
  const exactBuildEvidence = {
    ...exactBuildIdentity,
    gitCommit: buildSha,
  };

  function expectInvalid({
    control,
    manifest,
    code,
    expectedMigrationComparison = initialLaunchMigrationComparison,
  }) {
    assert.throws(
      () =>
        validateReleaseManifestContent({
          manifestBytes: Buffer.from(
            manifest ?? completeReleaseManifest(buildSha, control),
          ),
          expectedBuildSha: buildSha,
          exactBuildEvidence,
          expectedDatabaseMigrationRevision: databaseMigrationRevision,
          expectedMigrationComparison,
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
        '"schemaVersion": 2',
        '"schemaVersion":2',
      ),
      code: "release_manifest_control_invalid",
    });
  });

  await t.test("legacy release-control schema", () => {
    const control = completeReleaseControl(buildSha);
    control.schemaVersion = 1;
    expectInvalid({ control, code: "release_manifest_control_invalid" });
  });

  await t.test("non-passing automated gate", () => {
    const control = completeReleaseControl(buildSha);
    control.automatedGates.typecheck.status = "FAIL";
    expectInvalid({
      control,
      code: "release_manifest_critical_check_not_pass",
    });
  });

  for (const gateId of [
    "tracked_secret_boundary",
    "production_topology_dry_run",
    "production_archive_secret_boundary",
  ]) {
    await t.test(`missing ${gateId} automated gate`, () => {
      const control = completeReleaseControl(buildSha);
      delete control.automatedGates[gateId];
      expectInvalid({
        control,
        code: "release_manifest_automated_gates_invalid",
      });
    });

    await t.test(`non-passing ${gateId} automated gate`, () => {
      const control = completeReleaseControl(buildSha);
      control.automatedGates[gateId].status = "FAIL";
      expectInvalid({
        control,
        code: "release_manifest_critical_check_not_pass",
      });
    });
  }

  await t.test("unexpected automated gate", () => {
    const control = completeReleaseControl(buildSha);
    control.automatedGates.unreviewed_gate = passingEvidence("unreviewed");
    expectInvalid({
      control,
      code: "release_manifest_automated_gates_invalid",
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

  for (const [decisionId, legacyId] of [
    [
      "app_store_server_notifications_decision",
      "app_store_server_notifications",
    ],
    ["accessibility_label_decision", "accessibility_label"],
  ]) {
    await t.test(`legacy ${legacyId} approval ID is rejected`, () => {
      const control = completeReleaseControl(buildSha);
      control.approvals[legacyId] = control.approvals[decisionId];
      delete control.approvals[decisionId];
      expectInvalid({ control, code: "release_manifest_approval_invalid" });
    });
  }

  await t.test("missing backup reference", () => {
    const control = completeReleaseControl(buildSha);
    control.backupRecovery.backupEvidenceReference = "";
    expectInvalid({
      control,
      code: "release_manifest_backup_recovery_invalid",
    });
  });

  await t.test("write quiescence is explicit and attributable", () => {
    const invalidMutators = [
      (control) => {
        control.backupRecovery.writesQuiesced.mode = "manual_cutoff";
      },
      (control) => {
        control.backupRecovery.writesQuiesced.atUtc = "not-a-timestamp";
      },
      (control) => {
        control.backupRecovery.writesQuiesced.verifiedBy = "";
      },
      (control) => {
        control.backupRecovery.writesQuiesced.evidenceReference = "";
      },
    ];
    for (const mutate of invalidMutators) {
      const control = completeReleaseControl(buildSha);
      mutate(control);
      expectInvalid({
        control,
        code: "release_manifest_backup_recovery_invalid",
      });
    }
  });

  await t.test("production migration window binds all live identities", () => {
    const mismatchMutators = [
      (control) => {
        control.backupRecovery.productionMigrationWindow.productionApiRevision =
          "other-production-revision";
      },
      (control) => {
        control.backupRecovery.productionMigrationWindow.buildGitSha =
          "c".repeat(40);
      },
      (control) => {
        control.backupRecovery.productionMigrationWindow.databaseId =
          "other-production-database";
      },
      (control) => {
        control.backupRecovery.productionMigrationWindow.databaseMigrationRevision.sha256 =
          "0".repeat(64);
      },
    ];
    for (const mutate of mismatchMutators) {
      const control = completeReleaseControl(buildSha);
      mutate(control);
      expectInvalid({
        control,
        code: "release_manifest_production_migration_window_invalid",
      });
    }
  });

  await t.test("unknown migration classification", () => {
    const control = completeReleaseControl(buildSha);
    control.backupRecovery.migrationClassification.class = "compatible";
    expectInvalid({
      control,
      code: "release_manifest_backup_recovery_invalid",
    });
  });

  await t.test("unexpected migration recovery field", () => {
    const control = completeReleaseControl(buildSha);
    control.backupRecovery.unreviewedShortcut = true;
    expectInvalid({
      control,
      code: "release_manifest_backup_recovery_invalid",
    });
  });

  await t.test(
    "completed migration cannot claim previous API compatibility",
    () => {
      const control = completeReleaseControl(buildSha);
      control.backupRecovery.previousApiCompatible = true;
      expectInvalid({
        control,
        code: "release_manifest_backup_recovery_invalid",
      });
    },
  );

  await t.test("new migration cannot be mislabeled none", () => {
    const control = completeReleaseControl(buildSha);
    control.backupRecovery.migrationClassification.class = "none";
    control.backupRecovery.previousApiCompatible = true;
    expectInvalid({
      control,
      code: "release_manifest_migration_classification_mismatch",
    });
  });

  await t.test("deployed baseline is unsupported in v1", () => {
    const control = completeReleaseControl(buildSha);
    selectUnsupportedDeployedBaseline(control);
    expectInvalid({
      control,
      code: "previous_production_migration_deployed_baseline_unsupported_v1",
      expectedMigrationComparison: {
        state: "deployed",
        productionApiRevision: "production-service-r16",
        buildGitSha: syntheticPreviousBuildSha,
        databaseMigrationRevision: previousDatabaseMigrationRevision,
        hasNewMigrations: true,
      },
    });
  });

  await t.test("previous production migration verifier is attributable", () => {
    const control = completeReleaseControl(buildSha);
    control.deployments.previousProductionMigration.verifiedBy = "";
    expectInvalid({
      control,
      code: "release_manifest_previous_production_migration_invalid",
    });
  });

  await t.test("initial launch cannot retain a deployed prior revision", () => {
    const control = completeReleaseControl(buildSha);
    control.deployments.previousProductionApiRevision =
      "production-service-r16";
    control.deployments.previousPublicLegalRevision = "production-service-r16";
    expectInvalid({
      control,
      code: "release_manifest_previous_production_migration_state_mismatch",
      expectedMigrationComparison: {
        state: "initial_launch",
        productionApiRevision: null,
        buildGitSha: null,
        databaseMigrationRevision: null,
        hasNewMigrations: true,
      },
    });
  });

  await t.test("initial launch is forced to destructive", () => {
    const control = completeReleaseControl(buildSha);
    control.backupRecovery.migrationClassification.class = "none";
    control.backupRecovery.previousApiCompatible = true;
    expectInvalid({
      control,
      code: "release_manifest_migration_classification_mismatch",
      expectedMigrationComparison: {
        state: "initial_launch",
        productionApiRevision: null,
        buildGitSha: null,
        databaseMigrationRevision: null,
        hasNewMigrations: true,
      },
    });
  });

  await t.test(
    "a caller cannot inject an unchanged deployed comparison",
    () => {
      const control = completeReleaseControl(buildSha);
      selectUnsupportedDeployedBaseline(control);
      expectInvalid({
        control,
        code: "previous_production_migration_deployed_baseline_unsupported_v1",
        expectedMigrationComparison: {
          state: "deployed",
          productionApiRevision: "production-service-r16",
          buildGitSha: syntheticPreviousBuildSha,
          databaseMigrationRevision,
          hasNewMigrations: false,
        },
      });
    },
  );

  await t.test("backup coverage must follow write quiescence", () => {
    const control = completeReleaseControl(buildSha);
    control.backupRecovery.backupCoverageAtUtc =
      control.backupRecovery.writesQuiesced.atUtc;
    expectInvalid({
      control,
      code: "release_manifest_backup_recovery_invalid",
    });
  });

  await t.test("recovery point must follow write quiescence", () => {
    const control = completeReleaseControl(buildSha);
    control.backupRecovery.recoveryPoint.atUtc =
      control.backupRecovery.writesQuiesced.atUtc;
    expectInvalid({
      control,
      code: "release_manifest_backup_recovery_invalid",
    });
  });

  await t.test("recovery point cannot exceed proven backup coverage", () => {
    const control = completeReleaseControl(buildSha);
    control.backupRecovery.recoveryPoint.atUtc = "2026-08-03T12:00:01Z";
    expectInvalid({
      control,
      code: "release_manifest_backup_recovery_invalid",
    });
  });

  await t.test("recovery approval must follow recovery-point selection", () => {
    const control = completeReleaseControl(buildSha);
    control.backupRecovery.recoveryApproval.atUtc =
      control.backupRecovery.recoveryPoint.atUtc;
    expectInvalid({
      control,
      code: "release_manifest_backup_recovery_invalid",
    });
  });

  await t.test(
    "recovery point and coverage cannot follow migration start",
    () => {
      const control = completeReleaseControl(buildSha);
      control.backupRecovery.recoveryPoint.atUtc = "2026-08-03T12:05:00Z";
      control.backupRecovery.backupCoverageAtUtc = "2026-08-03T12:05:00Z";
      expectInvalid({
        control,
        code: "release_manifest_production_migration_window_invalid",
      });
    },
  );

  await t.test("migration completion cannot precede its start", () => {
    const control = completeReleaseControl(buildSha);
    control.backupRecovery.productionMigrationWindow.startedAtUtc =
      "2026-08-03T12:11:00Z";
    expectInvalid({
      control,
      code: "release_manifest_production_migration_window_invalid",
    });
  });

  await t.test("database readiness must follow migration completion", () => {
    const control = completeReleaseControl(buildSha);
    control.backupRecovery.productionMigrationWindow.completedAtUtc =
      "2026-08-03T12:31:00Z";
    expectInvalid({
      control,
      code: "release_manifest_production_migration_window_invalid",
    });
  });

  await t.test(
    "production readiness smoke must follow migration completion",
    () => {
      const control = completeReleaseControl(buildSha);
      control.backupRecovery.productionMigrationWindow.completedAtUtc =
        "2026-08-03T12:31:00Z";
      control.backupRecovery.databaseReadiness.atUtc = "2026-08-03T12:32:00Z";
      expectInvalid({
        control,
        code: "release_manifest_production_migration_window_invalid",
      });
    },
  );

  await t.test(
    "every recovery prerequisite must exist before migration starts",
    () => {
      const lateTimestamp = "2026-08-03T12:05:01Z";
      const lateEvidenceMutators = [
        (control) => {
          control.deployments.previousProductionMigration.verifiedAtUtc =
            lateTimestamp;
        },
        (control) => {
          control.backupRecovery.migrationClassification.atUtc = lateTimestamp;
        },
        (control) => {
          control.backupRecovery.migrationRehearsal.atUtc = lateTimestamp;
        },
        (control) => {
          control.backupRecovery.restoreDrillAtUtc = lateTimestamp;
        },
        (control) => {
          control.backupRecovery.recoveryApproval.atUtc = lateTimestamp;
        },
        (control) => {
          control.backupRecovery.rollForwardProcedure.atUtc = lateTimestamp;
        },
        (control) => {
          control.backupRecovery.coordinatedRestoreProcedure.atUtc =
            lateTimestamp;
        },
      ];
      for (const mutate of lateEvidenceMutators) {
        const control = completeReleaseControl(buildSha);
        mutate(control);
        expectInvalid({
          control,
          code: "release_manifest_pre_migration_recovery_evidence_late",
        });
      }
    },
  );

  await t.test(
    "healthy rollback outcome cannot be predeclared before migration completes",
    () => {
      const control = completeReleaseControl(buildSha);
      control.rollback.decisionAtUtc = "2026-08-03T12:09:59Z";
      expectInvalid({
        control,
        code: "release_manifest_rollback_invalid",
      });
    },
  );

  await t.test("recovery procedures require distinct passing evidence", () => {
    const control = completeReleaseControl(buildSha);
    control.backupRecovery.coordinatedRestoreProcedure.evidenceReference =
      control.backupRecovery.rollForwardProcedure.evidenceReference;
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

  await t.test("legacy prose monitoring thresholds are rejected", () => {
    const control = completeReleaseControl(buildSha);
    const signal = control.monitoring.signals.api_liveness;
    delete signal.rules;
    signal.warningThreshold = "approved warning threshold";
    signal.criticalThreshold = "approved critical threshold";
    expectInvalid({ control, code: "release_manifest_monitoring_invalid" });
  });

  await t.test("unexpected monitoring rule is rejected", () => {
    const control = completeReleaseControl(buildSha);
    control.monitoring.signals.api_liveness.rules.unreviewedShortcut =
      numericThresholds();
    expectInvalid({ control, code: "release_manifest_monitoring_invalid" });
  });

  await t.test("missing atomic monitoring rule is rejected", () => {
    const control = completeReleaseControl(buildSha);
    delete control.monitoring.signals.api_readiness_latency.rules.non200_event;
    expectInvalid({ control, code: "release_manifest_monitoring_invalid" });
  });

  await t.test(
    "numeric monitoring thresholds require critical ordering",
    () => {
      const control = completeReleaseControl(buildSha);
      control.monitoring.signals.api_liveness.rules.non200_count.critical.value = 1;
      expectInvalid({ control, code: "release_manifest_monitoring_invalid" });
    },
  );

  await t.test(
    "numeric monitoring threshold boundaries must be comparable",
    () => {
      const control = completeReleaseControl(buildSha);
      control.monitoring.signals.api_liveness.rules.non200_count.critical.unit =
        "percent";
      expectInvalid({ control, code: "release_manifest_monitoring_invalid" });
    },
  );

  await t.test("zero-tolerance monitoring signals require any_event", () => {
    const control = completeReleaseControl(buildSha);
    control.monitoring.signals.privacy_security.rules.incident_event =
      numericThresholds();
    expectInvalid({ control, code: "release_manifest_monitoring_invalid" });
  });

  await t.test("any_event monitoring cannot carry numeric boundaries", () => {
    const control = completeReleaseControl(buildSha);
    control.monitoring.signals.startup_migration.rules.startup_failure_event.warning =
      {
        comparator: "greater_than_or_equal",
        value: 1,
        unit: "count",
        windowSeconds: 60,
      };
    expectInvalid({ control, code: "release_manifest_monitoring_invalid" });
  });

  await t.test("atomic monitoring rules enforce their approved unit", () => {
    const control = completeReleaseControl(buildSha);
    const latency =
      control.monitoring.signals.api_readiness_latency.rules.latency_ms;
    latency.warning.unit = "percent";
    latency.critical.unit = "percent";
    expectInvalid({ control, code: "release_manifest_monitoring_invalid" });
  });

  await t.test(
    "atomic monitoring rules enforce their approved comparator",
    () => {
      const control = completeReleaseControl(buildSha);
      const rate =
        control.monitoring.signals.api_errors_latency.rules.five_xx_rate;
      rate.warning.comparator = "less_than_or_equal";
      rate.critical.comparator = "less_than_or_equal";
      rate.warning.value = 5;
      rate.critical.value = 2;
      expectInvalid({ control, code: "release_manifest_monitoring_invalid" });
    },
  );

  await t.test("monitoring threshold approval is mandatory", () => {
    const control = completeReleaseControl(buildSha);
    delete control.monitoring.signals.api_liveness.approval;
    expectInvalid({ control, code: "release_manifest_monitoring_invalid" });
  });

  await t.test("monitoring threshold approval must be approved", () => {
    const control = completeReleaseControl(buildSha);
    control.monitoring.signals.api_liveness.approval.decision = "BLOCKED";
    expectInvalid({
      control,
      code: "release_manifest_approval_not_approved",
    });
  });

  await t.test("monitoring primary and backup owners must be distinct", () => {
    const control = completeReleaseControl(buildSha);
    control.monitoring.signals.api_liveness.backupOwner =
      control.monitoring.signals.api_liveness.primaryOwner;
    expectInvalid({ control, code: "release_manifest_monitoring_invalid" });
  });

  await t.test("missing rollback procedure", () => {
    const control = completeReleaseControl(buildSha);
    delete control.rollback.runbookReference;
    expectInvalid({ control, code: "release_manifest_rollback_invalid" });
  });

  await t.test(
    "rollback must bind the classified schema-safety evidence",
    () => {
      const control = completeReleaseControl(buildSha);
      control.rollback.schemaSafetyEvidenceReference =
        "rollback/unbound-schema";
      expectInvalid({ control, code: "release_manifest_rollback_invalid" });
    },
  );

  await t.test(
    "rollback must bind the approved database recovery point",
    () => {
      const control = completeReleaseControl(buildSha);
      control.rollback.databaseRecoveryPointReference =
        "provider/recovery-points/unbound";
      expectInvalid({ control, code: "release_manifest_rollback_invalid" });
    },
  );

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

  await t.test("missing Replit production hosting record", () => {
    const control = completeReleaseControl(buildSha);
    delete control.deployments.replitProductionHosting;
    expectInvalid({
      control,
      code: "release_manifest_deployment_identity_mismatch",
    });
  });

  await t.test("incomplete Replit production hosting record", () => {
    const control = completeReleaseControl(buildSha);
    delete control.deployments.replitProductionHosting.databaseId;
    expectInvalid({
      control,
      code: "release_manifest_replit_hosting_identity_invalid",
    });
  });

  for (const [field, value] of [
    ["provider", "another-provider"],
    ["accountAlias", "account alias with spaces"],
    ["workspaceId", "none"],
    ["deploymentId", "https://cut-production.replit.app"],
    ["databaseId", ""],
    ["providerDeploymentOrigin", "https://replit.example.com"],
    ["publicOrigin", "http://cut.example.com"],
    ["publicOrigin", "https://cut.example.com/path"],
    ["deploymentType", "autoscale"],
    ["region", "none"],
    ["machineClass", ""],
    ["minimumInstances", 0],
    ["maximumInstances", 2],
    ["fixedMonthlyCostUsdCentsBeforeTax", 0],
    ["fixedMonthlyCostUsdCentsBeforeTax", 15.5],
    ["usageBasedServiceShutdownLimitUsdCentsBeforeTax", -1],
    ["approvedMonthlyCostCeilingUsdCentsBeforeTax", 0],
    ["costApprovedBy", "none"],
    ["costApprovedAtUtc", "2026-08-03"],
    ["costApprovalEvidenceReference", ""],
    ["configurationVerifiedAtUtc", "not-a-timestamp"],
    ["configurationEvidenceReference", "none"],
  ]) {
    await t.test(`invalid Replit hosting ${field}: ${String(value)}`, () => {
      const control = completeReleaseControl(buildSha);
      control.deployments.replitProductionHosting[field] = value;
      expectInvalid({
        control,
        code: "release_manifest_replit_hosting_identity_invalid",
      });
    });
  }

  for (const field of ["providerDeploymentOrigin", "publicOrigin"]) {
    for (const origin of [
      "https://localhost",
      "https://cut.localhost",
      "https://192.0.2.1",
      "https://[2001:db8::1]",
      "https://cut",
      "https://cut.example",
      "https://cut.home",
      "https://cut.home.arpa",
      "https://cut.internal",
      "https://cut.invalid",
      "https://cut.lan",
      "https://cut.local",
      "https://cut.onion",
      "https://cut.test",
      "https://-cut.com",
      "https://cut-.com",
    ]) {
      await t.test(`non-public Replit hosting ${field}: ${origin}`, () => {
        const control = completeReleaseControl(buildSha);
        control.deployments.replitProductionHosting[field] = origin;
        expectInvalid({
          control,
          code: "release_manifest_replit_hosting_identity_invalid",
        });
      });
    }
  }

  await t.test("Replit configured maximum exceeds the approved ceiling", () => {
    const control = completeReleaseControl(buildSha);
    control.deployments.replitProductionHosting.approvedMonthlyCostCeilingUsdCentsBeforeTax = 1999;
    expectInvalid({
      control,
      code: "release_manifest_replit_hosting_identity_invalid",
    });
  });

  await t.test(
    "production API and public routes must share one revision",
    () => {
      const control = completeReleaseControl(buildSha);
      control.deployments.publicLegalRevision = "split-public-revision";
      expectInvalid({
        control,
        code: "release_manifest_single_host_revision_mismatch",
      });
    },
  );

  await t.test("previous API and public routes must share one revision", () => {
    const control = completeReleaseControl(buildSha);
    control.deployments.previousPublicLegalRevision =
      "split-previous-public-revision";
    control.rollback.previousPublicLegalRevision =
      "split-previous-public-revision";
    expectInvalid({
      control,
      code: "release_manifest_single_host_revision_mismatch",
    });
  });

  for (const [field, value] of [
    ["tag", "0009_previous_migration"],
    ["createdAt", databaseMigrationRevision.createdAt - 1],
    ["sha256", "0".repeat(64)],
  ]) {
    await t.test(`database migration ${field} mismatch`, () => {
      const control = completeReleaseControl(buildSha);
      control.deployments.databaseMigrationRevision[field] = value;
      expectInvalid({
        control,
        code: "release_manifest_database_migration_identity_mismatch",
      });
    });
  }

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

test("accepts only the safe closed v1 migration contract", async (t) => {
  const buildSha = "a".repeat(40);
  const exactBuildEvidence = {
    ...exactBuildIdentity,
    gitCommit: buildSha,
  };

  function expectValid(
    control,
    expectedMigrationComparison = initialLaunchMigrationComparison,
  ) {
    assert.doesNotThrow(() =>
      validateReleaseManifestContent({
        manifestBytes: Buffer.from(completeReleaseManifest(buildSha, control)),
        expectedBuildSha: buildSha,
        exactBuildEvidence,
        expectedDatabaseMigrationRevision: databaseMigrationRevision,
        expectedMigrationComparison,
        clock: validationClock,
      }),
    );
  }

  await t.test("first launch can record destructive migration recovery", () => {
    const control = completeReleaseControl(buildSha);
    expectValid(control);
  });

  await t.test("deployed baseline cannot be caller-selected", () => {
    const control = completeReleaseControl(buildSha);
    selectUnsupportedDeployedBaseline(control);
    assert.throws(
      () =>
        validateReleaseManifestContent({
          manifestBytes: Buffer.from(
            completeReleaseManifest(buildSha, control),
          ),
          expectedBuildSha: buildSha,
          exactBuildEvidence,
          expectedDatabaseMigrationRevision: databaseMigrationRevision,
          expectedMigrationComparison: {
            state: "deployed",
            productionApiRevision: "production-service-r16",
            buildGitSha: syntheticPreviousBuildSha,
            databaseMigrationRevision: databaseMigrationRevision,
            hasNewMigrations: false,
          },
          clock: validationClock,
        }),
      expectCode(
        "previous_production_migration_deployed_baseline_unsupported_v1",
      ),
    );
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
      expectedDatabaseMigrationRevision: databaseMigrationRevision,
      expectedMigrationComparison: initialLaunchMigrationComparison,
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

test("App Review binds the finalized listing URLs to the manifest public origin", async (t) => {
  await t.test("exact origin and route paths", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    assert.doesNotThrow(() =>
      verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
    );
  });

  for (const [label, mutateSubmission] of [
    [
      "support origin",
      (submission) => {
        submission.listing.supportUrl =
          "https://other-production-host.com/support";
      },
    ],
    [
      "privacy path",
      (submission) => {
        submission.listing.privacyPolicyUrl = `${productionPublicOrigin}/privacy-policy`;
      },
    ],
    [
      "terms query",
      (submission) => {
        submission.listing.termsUrl = `${productionPublicOrigin}/terms?version=1`;
      },
    ],
    [
      "missing support URL",
      (submission) => {
        delete submission.listing.supportUrl;
      },
    ],
  ]) {
    await t.test(label, async (t) => {
      const { buildSha, repoRoot } = await createRepository(t);
      const submission = submissionForClerkState("enabled_for_app_review");
      mutateSubmission(submission);
      await writeEvidenceCommit(repoRoot, buildSha, { submission });
      assert.throws(
        () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
        expectCode("release_manifest_listing_origin_binding_invalid"),
      );
    });
  }

  await t.test("manifest origin differs from listing bytes", async (t) => {
    const { buildSha, previousBuildSha, repoRoot } = await createRepository(t);
    const control = completeReleaseControl(
      buildSha,
      "app_review",
      previousBuildSha,
    );
    control.deployments.replitProductionHosting.publicOrigin =
      "https://other-production-host.com";
    await writeEvidenceCommit(repoRoot, buildSha, {
      manifestContents: completeReleaseManifest(buildSha, control),
    });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("release_manifest_listing_origin_binding_invalid"),
    );
  });
});

test("release evidence derives the exact database migration from BUILD_SHA", async (t) => {
  await t.test("missing migration journal", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t, {
      includeMigrationJournal: false,
    });
    await writeEvidenceCommit(repoRoot, buildSha);
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("build_database_migration_identity_invalid"),
    );
  });

  await t.test("malformed migration journal", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t, {
      migrationJournalContents: '{"entries":[]}\n',
    });
    await writeEvidenceCommit(repoRoot, buildSha);
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("build_database_migration_identity_invalid"),
    );
  });

  await t.test("migration SQL bytes", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t, {
      migrationSqlContents: "select 2;\n",
    });
    await writeEvidenceCommit(repoRoot, buildSha);
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("release_manifest_database_migration_identity_mismatch"),
    );
  });

  await t.test(
    "initial launch migration cannot be mislabeled none",
    async (t) => {
      const { buildSha, previousBuildSha, repoRoot } =
        await createRepository(t);
      const control = completeReleaseControl(
        buildSha,
        "app_review",
        previousBuildSha,
      );
      control.backupRecovery.migrationClassification.class = "none";
      control.backupRecovery.previousApiCompatible = true;
      await writeEvidenceCommit(repoRoot, buildSha, {
        manifestContents: completeReleaseManifest(buildSha, control),
      });
      assert.throws(
        () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
        expectCode("release_manifest_migration_classification_mismatch"),
      );
    },
  );

  await t.test(
    "initial launch remains destructive when candidate adds no migration",
    async (t) => {
      const { buildSha, previousBuildSha, repoRoot } = await createRepository(
        t,
        {
          candidateAddsMigration: false,
        },
      );
      const control = completeReleaseControl(
        buildSha,
        "app_review",
        previousBuildSha,
      );
      control.deployments.databaseMigrationRevision = {
        ...previousDatabaseMigrationRevision,
      };
      control.backupRecovery.productionMigrationWindow.databaseMigrationRevision =
        { ...previousDatabaseMigrationRevision };
      await writeEvidenceCommit(repoRoot, buildSha, {
        manifestContents: completeReleaseManifest(buildSha, control),
      });
      assert.doesNotThrow(() =>
        verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      );
    },
  );

  await t.test("initial launch remains fail-closed and valid", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    const control = completeReleaseControl(buildSha);
    await writeEvidenceCommit(repoRoot, buildSha, {
      manifestContents: completeReleaseManifest(buildSha, control),
    });
    assert.doesNotThrow(() =>
      verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
    );
  });

  await t.test(
    "deployed baseline is rejected before trusting caller ancestry",
    async (t) => {
      const { buildSha, previousBuildSha, repoRoot } =
        await createRepository(t);
      git(
        repoRoot,
        "checkout",
        "-q",
        "-b",
        "unrelated-baseline",
        previousBuildSha,
      );
      await writeRepoFile(repoRoot, "unrelated.txt", "not deployed\n");
      const unrelatedBuildSha = await commitAll(repoRoot, "unrelated build");
      git(repoRoot, "checkout", "-q", buildSha);
      const control = completeReleaseControl(
        buildSha,
        "app_review",
        unrelatedBuildSha,
      );
      selectUnsupportedDeployedBaseline(control, unrelatedBuildSha);
      await writeEvidenceCommit(repoRoot, buildSha, {
        manifestContents: completeReleaseManifest(buildSha, control),
      });
      assert.throws(
        () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
        expectCode(
          "previous_production_migration_deployed_baseline_unsupported_v1",
        ),
      );
    },
  );

  await t.test(
    "deployed baseline is rejected before trusting its tuple",
    async (t) => {
      const { buildSha, previousBuildSha, repoRoot } =
        await createRepository(t);
      const control = completeReleaseControl(
        buildSha,
        "app_review",
        previousBuildSha,
      );
      selectUnsupportedDeployedBaseline(control, previousBuildSha);
      control.deployments.previousProductionMigration.databaseMigrationRevision.sha256 =
        "0".repeat(64);
      await writeEvidenceCommit(repoRoot, buildSha, {
        manifestContents: completeReleaseManifest(buildSha, control),
      });
      assert.throws(
        () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
        expectCode(
          "previous_production_migration_deployed_baseline_unsupported_v1",
        ),
      );
    },
  );

  await t.test(
    "deployed baseline is rejected before trusting its API revision",
    async (t) => {
      const { buildSha, previousBuildSha, repoRoot } =
        await createRepository(t);
      const control = completeReleaseControl(
        buildSha,
        "app_review",
        previousBuildSha,
      );
      selectUnsupportedDeployedBaseline(control, previousBuildSha);
      control.deployments.previousProductionMigration.productionApiRevision =
        "undeployed-api-revision";
      await writeEvidenceCommit(repoRoot, buildSha, {
        manifestContents: completeReleaseManifest(buildSha, control),
      });
      assert.throws(
        () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
        expectCode(
          "previous_production_migration_deployed_baseline_unsupported_v1",
        ),
      );
    },
  );

  await t.test(
    "deployed baseline is rejected before trusting history",
    async (t) => {
      const { buildSha, previousBuildSha, repoRoot } = await createRepository(
        t,
        {
          additionalInitialFiles: [
            [
              `lib/db/migrations/${previousDatabaseMigrationRevision.tag}.sql`,
              "select 'rewritten';\n",
            ],
          ],
        },
      );
      const control = completeReleaseControl(buildSha);
      selectUnsupportedDeployedBaseline(control, previousBuildSha);
      await writeEvidenceCommit(repoRoot, buildSha, {
        manifestContents: completeReleaseManifest(buildSha, control),
      });
      assert.throws(
        () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
        expectCode(
          "previous_production_migration_deployed_baseline_unsupported_v1",
        ),
      );
    },
  );
});

test("both release manifests must be declared DRAFT at BUILD_SHA", async (t) => {
  await t.test("missing paired public-release draft", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t, {
      includePublicReleaseDraft: false,
    });
    await writeEvidenceCommit(repoRoot, buildSha);
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("app_review_paired_public_release_draft_invalid"),
    );
  });

  await t.test("duplicate paired public-release drafts", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t, {
      additionalInitialFiles: [
        [
          "release-evidence/duplicate-public-release.md",
          draftReleaseManifest("public_release"),
        ],
      ],
    });
    await writeEvidenceCommit(repoRoot, buildSha);
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("app_review_paired_public_release_draft_invalid"),
    );
  });

  await t.test("App Review draft", async (t) => {
    const invalidDraft = draftReleaseManifest("app_review").replace(
      "- Manifest status: `DRAFT`",
      "- Manifest status: `FINAL`",
    );
    const { buildSha, repoRoot } = await createRepository(t, {
      appReviewDraftContents: invalidDraft,
    });
    await writeEvidenceCommit(repoRoot, buildSha);
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("release_manifest_build_draft_invalid"),
    );
  });

  await t.test("public-release draft", async (t) => {
    const invalidDraft = draftReleaseManifest("public_release").replace(
      '"status": "DRAFT"',
      '"status": "FINAL"',
    );
    const { buildSha, repoRoot } = await createRepository(t, {
      publicReleaseDraftContents: invalidDraft,
    });
    await writeEvidenceCommit(repoRoot, buildSha);
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("app_review_paired_public_release_draft_invalid"),
    );
  });
});

test("App Review evidence is fresh at its immutable manifest finalization", async (t) => {
  await t.test("Clerk review-window evidence", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    const submission = submissionForClerkState("enabled_for_app_review");
    submission.appReview.clerkReviewAccess.verifiedAtUtc =
      "2026-08-03T13:00:01Z";
    await writeEvidenceCommit(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("app_review_evidence_snapshot_invalid"),
    );
  });

  await t.test("Clerk review-window state", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    const submission = submissionForClerkState("enabled_for_app_review");
    submission.appReview.clerkReviewAccess.testModeState =
      "disabled_for_public_release";
    await writeEvidenceCommit(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("app_review_evidence_snapshot_invalid"),
    );
  });

  await t.test("Clerk shutdown-access preflight", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    const submission = submissionForClerkState("enabled_for_app_review");
    submission.appReview.clerkReviewAccess.shutdownControl.backupOwner =
      "release-lead";
    await writeEvidenceCommit(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("app_review_evidence_snapshot_invalid"),
    );
  });

  await t.test("Clerk preflight must be fresh at finalization", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    const submission = submissionForClerkState("enabled_for_app_review");
    submission.appReview.clerkReviewAccess.shutdownControl.accessPreflightAtUtc =
      "2026-08-02T12:59:59Z";
    await writeEvidenceCommit(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("app_review_evidence_snapshot_invalid"),
    );
  });

  await t.test("Clerk preflight cannot follow finalization", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    const submission = submissionForClerkState("enabled_for_app_review");
    submission.appReview.clerkReviewAccess.shutdownControl.accessPreflightAtUtc =
      "2026-08-03T13:00:01Z";
    await writeEvidenceCommit(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("app_review_evidence_snapshot_invalid"),
    );
  });

  await t.test("Clerk closure fields must remain empty", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    const submission = submissionForClerkState("enabled_for_app_review");
    submission.appReview.clerkReviewAccess.shutdownControl.triggerObservedAtUtc =
      "2026-08-03T12:50:00Z";
    await writeEvidenceCommit(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("app_review_evidence_snapshot_invalid"),
    );
  });

  await t.test("Clerk calendar timestamp", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    const submission = submissionForClerkState("enabled_for_app_review");
    submission.appReview.clerkReviewAccess.verifiedAtUtc =
      "2026-02-30T12:45:00Z";
    await writeEvidenceCommit(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("app_review_evidence_snapshot_invalid"),
    );
  });

  await t.test("review-account evidence", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    const submission = submissionForClerkState("enabled_for_app_review");
    submission.appReview.accountStates.fullAccess.testedAtUtc =
      "2026-08-03T13:00:01Z";
    await writeEvidenceCommit(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("app_review_evidence_snapshot_invalid"),
    );
  });

  await t.test("Apple Drafts-section evidence", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    const submission = submissionForClerkState("enabled_for_app_review");
    submission.appReview.appleWorkflow.verifiedAtUtc = "2026-08-03T13:00:01Z";
    await writeEvidenceCommit(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("app_review_evidence_snapshot_invalid"),
    );
  });

  await t.test("Apple Drafts-section endpoint", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    const submission = submissionForClerkState("enabled_for_app_review");
    submission.appReview.appleWorkflow.reviewActive = true;
    await writeEvidenceCommit(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("app_review_evidence_snapshot_invalid"),
    );
  });

  await t.test("Apple calendar timestamp", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    const submission = submissionForClerkState("enabled_for_app_review");
    submission.appReview.appleWorkflow.verifiedAtUtc = "2026-08-03T24:00:00Z";
    await writeEvidenceCommit(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("app_review_evidence_snapshot_invalid"),
    );
  });
});

test("accepts one constrained public-release transition after App Review", async (t) => {
  const { buildSha, repoRoot } = await createRepository(t);
  const appReviewEvidenceSha = await writeEvidenceCommit(repoRoot, buildSha);
  const postBuildEvidenceSha = await writePublicReleaseTransition(
    repoRoot,
    buildSha,
  );

  assert.equal(
    git(repoRoot, "rev-parse", `${postBuildEvidenceSha}^`),
    appReviewEvidenceSha,
  );
  assert.equal(
    git(repoRoot, "rev-parse", `${appReviewEvidenceSha}^`),
    buildSha,
  );
  assert.deepEqual(verifyPostBuildEvidenceBoundary({ repoRoot }), {
    buildSha,
    postBuildEvidenceSha,
    changedPathCount: 3,
    releaseTarget: "public_release",
  });
});

test("public release requires a separate App Review evidence parent", async (t) => {
  await t.test("direct public-release evidence", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha, {
      manifestPath: publicReleaseManifestPath,
      releaseTarget: "public_release",
      submission: submissionForClerkState("disabled_for_public_release"),
    });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("public_release_requires_app_review_evidence_parent"),
    );
  });

  await t.test("non-App-Review evidence parent", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t, {
      appReviewDraftTarget: "staging",
    });
    await writeEvidenceCommit(repoRoot, buildSha, {
      releaseTarget: "staging",
    });
    await writePublicReleaseTransition(repoRoot, buildSha);
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("public_release_requires_app_review_evidence_parent"),
    );
  });
});

test("public-release transition preserves immutable submission and build evidence", async (t) => {
  await t.test(
    "submission fields outside updated and Clerk access",
    async (t) => {
      const { buildSha, repoRoot } = await createRepository(t);
      await writeEvidenceCommit(repoRoot, buildSha);
      const submission = submissionForClerkState(
        "disabled_for_public_release",
        { updated: "2026-08-04" },
      );
      submission.listing.appName = "Changed after App Review";
      await writePublicReleaseTransition(repoRoot, buildSha, { submission });
      assert.throws(
        () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
        expectCode("public_release_submission_changed_immutable_fields"),
      );
    },
  );

  await t.test("historical review account evidence", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    const submission = submissionForClerkState("disabled_for_public_release", {
      updated: "2026-08-04",
    });
    submission.appReview.accountStates.fullAccess.testedAtUtc =
      "2026-08-04T13:15:00Z";
    await writePublicReleaseTransition(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("public_release_submission_changed_immutable_fields"),
    );
  });

  await t.test("TestFlight build identity", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    const testFlight = JSON.parse(
      git(repoRoot, "show", `HEAD:${"app-store/testflight-submission.json"}`),
    );
    testFlight.exactBuildEvidence.easBuildId = "changed-eas-build";
    await writeRepoFile(
      repoRoot,
      "app-store/testflight-submission.json",
      `${JSON.stringify(testFlight)}\n`,
    );
    await writePublicReleaseTransition(repoRoot, buildSha);
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("public_release_transition_build_identity_mismatch"),
    );
  });

  await t.test("production deployment identity", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    await writePublicReleaseTransition(repoRoot, buildSha, {
      mutateControl: (control) => {
        control.deployments.productionApiRevision = "production-service-r18";
        control.deployments.publicLegalRevision = "production-service-r18";
        control.backupRecovery.productionMigrationWindow.productionApiRevision =
          "production-service-r18";
      },
    });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("public_release_transition_control_identity_mismatch"),
    );
  });

  await t.test("Replit hosting identity and cost ceiling", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    await writePublicReleaseTransition(repoRoot, buildSha, {
      mutateControl: (control) => {
        control.deployments.replitProductionHosting.deploymentId =
          "different-production-deployment";
        control.deployments.replitProductionHosting.approvedMonthlyCostCeilingUsdCentsBeforeTax = 2500;
      },
    });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("public_release_transition_control_identity_mismatch"),
    );
  });

  await t.test("listing-only public-origin transition", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    const submission = submissionForClerkState("disabled_for_public_release", {
      updated: "2026-08-04",
    });
    submission.listing.supportUrl = "https://other-production-host.com/support";
    await writePublicReleaseTransition(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("release_manifest_listing_origin_binding_invalid"),
    );
  });

  await t.test("manifest-only public-origin transition", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    await writePublicReleaseTransition(repoRoot, buildSha, {
      mutateControl: (control) => {
        control.deployments.replitProductionHosting.publicOrigin =
          "https://other-production-host.com";
      },
    });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("release_manifest_listing_origin_binding_invalid"),
    );
  });

  await t.test(
    "coordinated manifest and listing rebind remains immutable",
    async (t) => {
      const { buildSha, repoRoot } = await createRepository(t);
      await writeEvidenceCommit(repoRoot, buildSha);
      const otherOrigin = "https://other-production-host.com";
      const submission = submissionForClerkState(
        "disabled_for_public_release",
        { updated: "2026-08-04" },
      );
      submission.listing.supportUrl = `${otherOrigin}/support`;
      submission.listing.privacyPolicyUrl = `${otherOrigin}/privacy`;
      submission.listing.termsUrl = `${otherOrigin}/terms`;
      await writePublicReleaseTransition(repoRoot, buildSha, {
        submission,
        mutateControl: (control) => {
          control.deployments.replitProductionHosting.publicOrigin =
            otherOrigin;
        },
      });
      assert.throws(
        () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
        expectCode("public_release_submission_changed_immutable_fields"),
      );
    },
  );

  await t.test("database migration identity", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    await writePublicReleaseTransition(repoRoot, buildSha, {
      mutateControl: (control) => {
        control.deployments.databaseMigrationRevision.sha256 = "0".repeat(64);
      },
    });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("release_manifest_database_migration_identity_mismatch"),
    );
  });
});

test("public-release transition has a strict target, identity, and path surface", async (t) => {
  await t.test("Clerk test mode must be disabled", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    await writePublicReleaseTransition(repoRoot, buildSha, {
      submission: submissionForClerkState("enabled_for_app_review", {
        updated: "2026-08-04",
      }),
    });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("public_release_transition_state_invalid"),
    );
  });

  await t.test("Client Trust must remain enabled", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    const submission = submissionForClerkState("disabled_for_public_release", {
      updated: "2026-08-04",
    });
    submission.appReview.clerkReviewAccess.clientTrustEnabled = false;
    await writePublicReleaseTransition(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("public_release_clerk_transition_changed_immutable_fields"),
    );
  });

  await t.test("Clerk strategy is immutable", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    const submission = submissionForClerkState("disabled_for_public_release", {
      updated: "2026-08-04",
    });
    submission.appReview.clerkReviewAccess.fixedCodePolicy = "changed";
    await writePublicReleaseTransition(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("public_release_clerk_transition_changed_immutable_fields"),
    );
  });

  await t.test("Clerk shutdown owners are immutable", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    const submission = submissionForClerkState("disabled_for_public_release", {
      updated: "2026-08-04",
    });
    submission.appReview.clerkReviewAccess.shutdownControl.primaryOwner =
      "changed-release-lead";
    await writePublicReleaseTransition(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("public_release_clerk_transition_changed_immutable_fields"),
    );
  });

  await t.test("Clerk shutdown preflight is immutable", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    const submission = submissionForClerkState("disabled_for_public_release", {
      updated: "2026-08-04",
    });
    submission.appReview.clerkReviewAccess.shutdownControl.accessPreflightEvidenceReference =
      "changed/preflight";
    await writePublicReleaseTransition(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("public_release_clerk_transition_changed_immutable_fields"),
    );
  });

  await t.test("Clerk shutdown accepts exactly 15 minutes", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    const submission = submissionForClerkState("disabled_for_public_release", {
      updated: "2026-08-04",
    });
    const access = submission.appReview.clerkReviewAccess;
    access.shutdownControl.triggerObservedAtUtc = "2026-08-03T13:00:01Z";
    access.shutdownControl.testModeDisabledAtUtc = "2026-08-03T13:15:01Z";
    access.verifiedAtUtc = "2026-08-03T13:20:00Z";
    await writePublicReleaseTransition(repoRoot, buildSha, { submission });
    assert.doesNotThrow(() =>
      verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
    );
  });

  await t.test("Clerk shutdown rejects 15 minutes plus 1 ms", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    const submission = submissionForClerkState("disabled_for_public_release", {
      updated: "2026-08-04",
    });
    const access = submission.appReview.clerkReviewAccess;
    access.shutdownControl.triggerObservedAtUtc = "2026-08-03T13:00:01Z";
    access.shutdownControl.testModeDisabledAtUtc = "2026-08-03T13:15:01.001Z";
    access.verifiedAtUtc = "2026-08-03T13:20:00Z";
    await writePublicReleaseTransition(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("public_release_clerk_shutdown_evidence_invalid"),
    );
  });

  await t.test("Clerk shutdown exceeds the 15-minute SLO", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    const submission = submissionForClerkState("disabled_for_public_release", {
      updated: "2026-08-04",
    });
    const access = submission.appReview.clerkReviewAccess;
    access.shutdownControl.triggerObservedAtUtc = "2026-08-03T13:00:01Z";
    access.shutdownControl.testModeDisabledAtUtc = "2026-08-03T13:16:01Z";
    access.verifiedAtUtc = "2026-08-03T13:20:00Z";
    await writePublicReleaseTransition(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("public_release_clerk_shutdown_evidence_invalid"),
    );
  });

  await t.test("Clerk shutdown timestamps cannot be inverted", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    const submission = submissionForClerkState("disabled_for_public_release", {
      updated: "2026-08-04",
    });
    submission.appReview.clerkReviewAccess.shutdownControl.triggerObservedAtUtc =
      "2026-08-03T13:11:00Z";
    await writePublicReleaseTransition(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("public_release_clerk_shutdown_evidence_invalid"),
    );
  });

  await t.test("Clerk shutdown trigger must follow App Review", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    const submission = submissionForClerkState("disabled_for_public_release", {
      updated: "2026-08-04",
    });
    submission.appReview.clerkReviewAccess.shutdownControl.triggerObservedAtUtc =
      "2026-08-03T12:59:00Z";
    await writePublicReleaseTransition(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("public_release_clerk_shutdown_evidence_invalid"),
    );
  });

  await t.test("Clerk shutdown must precede public finalization", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    const submission = submissionForClerkState("disabled_for_public_release", {
      updated: "2026-08-04",
    });
    const access = submission.appReview.clerkReviewAccess;
    access.shutdownControl.triggerObservedAtUtc = "2026-08-03T13:20:00Z";
    access.shutdownControl.testModeDisabledAtUtc = "2026-08-03T13:30:01Z";
    access.verifiedAtUtc = "2026-08-03T13:30:00Z";
    await writePublicReleaseTransition(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("public_release_clerk_shutdown_evidence_invalid"),
    );
  });

  await t.test("Clerk shutdown requires closure evidence", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    const submission = submissionForClerkState("disabled_for_public_release", {
      updated: "2026-08-04",
    });
    submission.appReview.clerkReviewAccess.shutdownControl.shutdownEvidenceReference =
      null;
    await writePublicReleaseTransition(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("public_release_clerk_shutdown_evidence_invalid"),
    );
  });

  await t.test(
    "Clerk shutdown evidence reference must be distinct",
    async (t) => {
      const { buildSha, repoRoot } = await createRepository(t);
      await writeEvidenceCommit(repoRoot, buildSha);
      const submission = submissionForClerkState(
        "disabled_for_public_release",
        {
          updated: "2026-08-04",
        },
      );
      const shutdown = submission.appReview.clerkReviewAccess.shutdownControl;
      shutdown.shutdownEvidenceReference =
        shutdown.accessPreflightEvidenceReference;
      await writePublicReleaseTransition(repoRoot, buildSha, { submission });
      assert.throws(
        () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
        expectCode("public_release_clerk_shutdown_evidence_invalid"),
      );
    },
  );

  await t.test("Clerk shutdown timestamps must be fresh", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    const submission = submissionForClerkState("disabled_for_public_release", {
      updated: "2026-08-04",
    });
    submission.appReview.clerkReviewAccess.verifiedAtUtc =
      "2026-08-04T13:15:00Z";
    await writePublicReleaseTransition(repoRoot, buildSha, {
      finalizedAtUtc: "2026-08-04T13:30:00Z",
      submission,
    });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("public_release_clerk_shutdown_evidence_invalid"),
    );
  });

  await t.test("Clerk closure evidence must advance", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    const submission = submissionForClerkState("disabled_for_public_release", {
      updated: "2026-08-04",
    });
    submission.appReview.clerkReviewAccess.verifiedAtUtc =
      "2026-08-03T12:45:00Z";
    await writePublicReleaseTransition(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("public_release_transition_evidence_not_advanced"),
    );
  });

  await t.test(
    "Clerk closure evidence must use a distinct reference",
    async (t) => {
      const { buildSha, repoRoot } = await createRepository(t);
      await writeEvidenceCommit(repoRoot, buildSha);
      const submission = submissionForClerkState(
        "disabled_for_public_release",
        { updated: "2026-08-04" },
      );
      submission.appReview.clerkReviewAccess.evidenceReference =
        " clerk/app-review-access ";
      await writePublicReleaseTransition(repoRoot, buildSha, { submission });
      assert.throws(
        () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
        expectCode("public_release_transition_evidence_not_advanced"),
      );
    },
  );

  await t.test("calendar-only transition dates must be real", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    const submission = submissionForClerkState("disabled_for_public_release", {
      updated: "2026-09-31",
    });
    await writePublicReleaseTransition(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("public_release_transition_evidence_not_advanced"),
    );
  });

  await t.test("Apple submission identity is immutable", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    const submission = submissionForClerkState("disabled_for_public_release", {
      updated: "2026-08-04",
    });
    submission.appReview.appleWorkflow.submissionReference =
      "asc-different-draft";
    await writePublicReleaseTransition(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("public_release_apple_workflow_changed_immutable_fields"),
    );
  });

  await t.test("manual release selection is immutable", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    const submission = submissionForClerkState("disabled_for_public_release", {
      updated: "2026-08-04",
    });
    submission.appReview.appleWorkflow.manualReleaseSelected = false;
    await writePublicReleaseTransition(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("public_release_apple_workflow_changed_immutable_fields"),
    );
  });

  await t.test("Apple Completed section must be exact", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    const submission = submissionForClerkState("disabled_for_public_release", {
      updated: "2026-08-04",
    });
    submission.appReview.appleWorkflow.submissionSection = "drafts";
    await writePublicReleaseTransition(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("public_release_apple_workflow_state_invalid"),
    );
  });

  await t.test("Apple approval evidence must advance", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    const submission = submissionForClerkState("disabled_for_public_release", {
      updated: "2026-08-04",
    });
    submission.appReview.appleWorkflow.verifiedAtUtc = "2026-08-03T12:59:59Z";
    await writePublicReleaseTransition(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("public_release_apple_workflow_evidence_not_advanced"),
    );
  });

  await t.test("Apple approval evidence reference must advance", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    const submission = submissionForClerkState("disabled_for_public_release", {
      updated: "2026-08-04",
    });
    submission.appReview.appleWorkflow.evidenceReference =
      " apple/app-review-draft-ready ";
    await writePublicReleaseTransition(repoRoot, buildSha, { submission });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("public_release_apple_workflow_evidence_not_advanced"),
    );
  });

  await t.test(
    "Clerk closure evidence must be fresh at finalization",
    async (t) => {
      const { buildSha, repoRoot } = await createRepository(t);
      await writeEvidenceCommit(repoRoot, buildSha);
      await writePublicReleaseTransition(repoRoot, buildSha, {
        finalizedAtUtc: "2026-08-04T13:30:00Z",
      });
      assert.throws(
        () =>
          verifyPostBuildEvidenceBoundary({
            buildSha,
            repoRoot,
            clock: () => new Date("2026-08-05T00:00:00Z"),
          }),
        expectCode("public_release_transition_evidence_not_advanced"),
      );
    },
  );

  await t.test("release target", async (t) => {
    const invalidTargetManifestPath =
      "release-evidence/second-app-review-target.md";
    const { buildSha, repoRoot } = await createRepository(t, {
      additionalInitialFiles: [
        [invalidTargetManifestPath, draftReleaseManifest("app_review")],
      ],
    });
    await writeEvidenceCommit(repoRoot, buildSha);
    await writePublicReleaseTransition(repoRoot, buildSha, {
      manifestPath: invalidTargetManifestPath,
      releaseTarget: "app_review",
    });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("public_release_transition_target_required"),
    );
  });

  await t.test("release ID", async (t) => {
    const differentReleaseId = "cut-os-1.0.0-1-different";
    const differentReleaseManifestPath =
      "release-evidence/different-public-release.md";
    const { buildSha, repoRoot } = await createRepository(t, {
      additionalInitialFiles: [
        [
          differentReleaseManifestPath,
          draftReleaseManifest("public_release", differentReleaseId),
        ],
      ],
    });
    await writeEvidenceCommit(repoRoot, buildSha);
    await writePublicReleaseTransition(repoRoot, buildSha, {
      manifestPath: differentReleaseManifestPath,
      releaseId: differentReleaseId,
    });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("public_release_transition_manifest_identity_invalid"),
    );
  });

  await t.test("non-transition evidence file", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    await writeRepoFile(
      repoRoot,
      "app-store/app-store-connect-territories.json",
      '{"changed":true}\n',
    );
    await writePublicReleaseTransition(repoRoot, buildSha);
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("post_build_path_or_operation_not_allowlisted"),
    );
  });

  await t.test("public-release manifest must exist at BUILD_SHA", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    await writePublicReleaseTransition(repoRoot, buildSha, {
      manifestPath:
        "release-evidence/1.0.0-1-public-release-created-too-late.md",
    });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("post_build_path_or_operation_not_allowlisted"),
    );
  });

  await t.test("App Review manifest remains immutable", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await writeEvidenceCommit(repoRoot, buildSha);
    await writePublicReleaseTransition(repoRoot, buildSha, {
      manifestPath: appReviewReleaseManifestPath,
    });
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("post_build_path_or_operation_not_allowlisted"),
    );
  });
});

test("rejects a third post-build evidence commit", async (t) => {
  const { buildSha, repoRoot } = await createRepository(t);
  await writeEvidenceCommit(repoRoot, buildSha);
  await writePublicReleaseTransition(repoRoot, buildSha);
  await writeRepoFile(
    repoRoot,
    "app-store/app-store-submission.json",
    `${JSON.stringify(
      submissionForClerkState("disabled_for_public_release", {
        updated: "2026-08-05",
      }),
      null,
      2,
    )}\n`,
  );
  await commitAll(repoRoot, "third evidence commit");
  assert.throws(
    () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
    expectCode("evidence_commit_must_directly_follow_build_sha"),
  );
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

test("rejects an incomplete second evidence commit", async (t) => {
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
    expectCode("exact_release_manifest_and_checksum_required"),
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
