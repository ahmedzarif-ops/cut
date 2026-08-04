# CUT OS — release evidence manifest

> Template: copy this file for one release candidate. Do not put secrets,
> credentials, DSNs, customer/tester identifiers, health/nutrition data, request
> or response bodies, or raw environment/log output in this record.

## Manifest control

- Manifest status: `DRAFT` / `FINAL`

The canonical JSON below is the sole editable release record. Do not duplicate
release IDs, targets, timestamps, identities, gate outcomes, approvals, or
evidence references elsewhere in this manifest. Operational detail belongs in
the controlled references named by the JSON. The prose sections after the JSON
are navigation and fixed safety acknowledgments only.

## Machine-verifiable release control

Keep both marker comments, the JSON fence, every key, and every listed control
ID exactly as written. Resolve every placeholder before finalization. Every
automated gate, smoke check, monitoring-coverage check, recovery check, and
post-action probe must be `PASS`. Every approval must be `APPROVED`, except
`paid_deployment_build` and `regional_medical_device`, which may be
`NOT_APPLICABLE` with a specific `notApplicableReason`, attributable approver,
UTC timestamp, and evidence reference. `eas_upload` may be `NOT_APPLICABLE` only
for a `staging` target where no upload occurred; every upload-bearing target
requires `APPROVED`. The deployment EAS and App Store Connect build IDs must
exactly match the TestFlight evidence record.

Use UTC ISO-8601 timestamps with `Z`; whole seconds or fractional seconds are
accepted. Except for `restoreDrillAtUtc`, every evidence timestamp must be on or
after `createdAtUtc` and no later than `finalizedAtUtc`. Finalization cannot be
future-dated. The restore drill may predate record creation but must be no more
than 90 days old at finalization.

<!-- CUT_OS_RELEASE_CONTROL_V1_BEGIN -->

```json
{
  "schemaVersion": 1,
  "status": "DRAFT",
  "releaseId": "<unique release ID>",
  "target": "<staging | internal_testflight | app_review | public_release>",
  "createdAtUtc": "<UTC ISO-8601>",
  "finalizedAtUtc": "<UTC ISO-8601>",
  "releaseLead": "<name or approved role alias>",
  "businessOwner": "<name or approved role alias>",
  "build": {
    "gitSha": "<40 lowercase hex BUILD_SHA>",
    "appVersion": "<TestFlight app version>",
    "appleBuildNumber": "<TestFlight Apple build number>"
  },
  "deployments": {
    "stagingApiRevision": "<deployment ID>",
    "productionApiRevision": "<deployment ID>",
    "previousProductionApiRevision": "<deployment ID or N/A — reason — approver>",
    "publicLegalRevision": "<deployment ID>",
    "previousPublicLegalRevision": "<deployment ID or N/A — reason — approver>",
    "easBuildId": "<TestFlight EAS build ID>",
    "appStoreConnectBuildId": "<TestFlight App Store Connect build ID>"
  },
  "automatedGates": {
    "frozen_install": {
      "status": "<PASS>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>"
    },
    "high_severity_dependency_audit": {
      "status": "<PASS>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>"
    },
    "code_generation_drift": {
      "status": "<PASS>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>"
    },
    "typecheck": {
      "status": "<PASS>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>"
    },
    "release_operations_tests": {
      "status": "<PASS>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>"
    },
    "repository_tests": {
      "status": "<PASS>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>"
    },
    "app_store_artifact": {
      "status": "<PASS>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>"
    },
    "production_api_build": {
      "status": "<PASS>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>"
    },
    "database_generation_drift": {
      "status": "<PASS>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>"
    },
    "expo_doctor": {
      "status": "<PASS>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>"
    },
    "legal_hosting_fail_closed": {
      "status": "<PASS>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>"
    },
    "production_release_config": {
      "status": "<PASS>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>"
    },
    "production_ios_export": {
      "status": "<PASS>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>"
    }
  },
  "releaseSafetyChecks": {
    "production_service_set": {
      "status": "<PASS>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>"
    },
    "limiter_live_abuse": {
      "status": "<PASS>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>"
    },
    "clerk_proxy_activation": {
      "status": "<PASS>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>"
    },
    "authentication_recovery": {
      "status": "<PASS>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>"
    },
    "approved_legal_publication": {
      "status": "<PASS>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>"
    },
    "app_store_exact_build_reconciliation": {
      "status": "<PASS>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>"
    }
  },
  "approvals": {
    "paid_deployment_build": {
      "decision": "<APPROVED or NOT_APPLICABLE>",
      "approver": "<name/role>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>",
      "notApplicableReason": null
    },
    "eas_upload": {
      "decision": "<APPROVED or NOT_APPLICABLE>",
      "approver": "<name/role>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>",
      "notApplicableReason": null
    },
    "apple_seller_legal": {
      "decision": "<APPROVED>",
      "approver": "<name/role>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>",
      "notApplicableReason": null
    },
    "legal_support_publication": {
      "decision": "<APPROVED>",
      "approver": "<name/role>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>",
      "notApplicableReason": null
    },
    "privacy_app_privacy": {
      "decision": "<APPROVED>",
      "approver": "<name/role>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>",
      "notApplicableReason": null
    },
    "health_nutrition": {
      "decision": "<APPROVED>",
      "approver": "<name/role>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>",
      "notApplicableReason": null
    },
    "age_rating": {
      "decision": "<APPROVED>",
      "approver": "<name/role>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>",
      "notApplicableReason": null
    },
    "territories_availability": {
      "decision": "<APPROVED>",
      "approver": "<name/role>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>",
      "notApplicableReason": null
    },
    "regional_medical_device": {
      "decision": "<APPROVED or NOT_APPLICABLE>",
      "approver": "<name/role>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>",
      "notApplicableReason": null
    },
    "authentication_recovery": {
      "decision": "<APPROVED>",
      "approver": "<name/role>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>",
      "notApplicableReason": null
    },
    "subscription_product": {
      "decision": "<APPROVED>",
      "approver": "<name/role>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>",
      "notApplicableReason": null
    },
    "commercial_config": {
      "decision": "<APPROVED>",
      "approver": "<name/role>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>",
      "notApplicableReason": null
    },
    "app_store_server_notifications": {
      "decision": "<APPROVED>",
      "approver": "<name/role>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>",
      "notApplicableReason": null
    },
    "accessibility_label": {
      "decision": "<APPROVED>",
      "approver": "<name/role>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>",
      "notApplicableReason": null
    },
    "testflight_scope": {
      "decision": "<APPROVED>",
      "approver": "<name/role>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>",
      "notApplicableReason": null
    },
    "export_compliance": {
      "decision": "<APPROVED>",
      "approver": "<name/role>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>",
      "notApplicableReason": null
    }
  },
  "backupRecovery": {
    "migrationRehearsal": {
      "status": "<PASS>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>"
    },
    "databaseReadiness": {
      "status": "<PASS>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>"
    },
    "backupCoverageAtUtc": "<UTC>",
    "backupEvidenceReference": "<reference>",
    "restoreDrillAtUtc": "<UTC>",
    "restoreDrillEvidenceReference": "<reference>",
    "rpo": "<approved value>",
    "rto": "<approved value>",
    "recoveryApproval": {
      "decision": "<APPROVED>",
      "approver": "<name/role>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>",
      "notApplicableReason": null
    },
    "rollForwardProcedureReference": "<reference>",
    "coordinatedRestoreProcedureReference": "<reference>",
    "recoveryOwner": "<name/role>",
    "noConcurrentMigrationConfirmed": false,
    "schemaRollbackPolicyConfirmed": false
  },
  "smoke": {
    "staging": {
      "api_health": {
        "status": "<PASS>",
        "atUtc": "<UTC>",
        "evidenceReference": "<reference>"
      },
      "api_readiness": {
        "status": "<PASS>",
        "atUtc": "<UTC>",
        "evidenceReference": "<reference>"
      },
      "auth_guard": {
        "status": "<PASS>",
        "atUtc": "<UTC>",
        "evidenceReference": "<reference>"
      },
      "public_status": {
        "status": "<PASS>",
        "atUtc": "<UTC>",
        "evidenceReference": "<reference>"
      },
      "live_legal": {
        "status": "<PASS>",
        "atUtc": "<UTC>",
        "evidenceReference": "<reference>"
      },
      "native_critical_qa": {
        "status": "<PASS>",
        "atUtc": "<UTC>",
        "evidenceReference": "<reference>"
      },
      "sandbox_purchase_restore": {
        "status": "<PASS>",
        "atUtc": "<UTC>",
        "evidenceReference": "<reference>"
      },
      "account_deletion": {
        "status": "<PASS>",
        "atUtc": "<UTC>",
        "evidenceReference": "<reference>"
      },
      "resilience_shared_device": {
        "status": "<PASS>",
        "atUtc": "<UTC>",
        "evidenceReference": "<reference>"
      },
      "accessibility": {
        "status": "<PASS>",
        "atUtc": "<UTC>",
        "evidenceReference": "<reference>"
      }
    },
    "production": {
      "api_health": {
        "status": "<PASS>",
        "atUtc": "<UTC>",
        "evidenceReference": "<reference>"
      },
      "api_readiness": {
        "status": "<PASS>",
        "atUtc": "<UTC>",
        "evidenceReference": "<reference>"
      },
      "auth_guard": {
        "status": "<PASS>",
        "atUtc": "<UTC>",
        "evidenceReference": "<reference>"
      },
      "public_status": {
        "status": "<PASS>",
        "atUtc": "<UTC>",
        "evidenceReference": "<reference>"
      },
      "live_legal": {
        "status": "<PASS>",
        "atUtc": "<UTC>",
        "evidenceReference": "<reference>"
      },
      "review_account_critical_flow": {
        "status": "<PASS>",
        "atUtc": "<UTC>",
        "evidenceReference": "<reference>"
      }
    }
  },
  "monitoring": {
    "signals": {
      "api_liveness": {
        "warningThreshold": "<value/window>",
        "criticalThreshold": "<value/window>",
        "destination": "<destination>",
        "primaryOwner": "<owner>",
        "backupOwner": "<owner>",
        "baselineEvidenceReference": "<reference>",
        "alertTest": {
          "status": "<PASS>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>"
        }
      },
      "api_readiness_latency": {
        "warningThreshold": "<value/window>",
        "criticalThreshold": "<value/window>",
        "destination": "<destination>",
        "primaryOwner": "<owner>",
        "backupOwner": "<owner>",
        "baselineEvidenceReference": "<reference>",
        "alertTest": {
          "status": "<PASS>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>"
        }
      },
      "api_errors_latency": {
        "warningThreshold": "<value/window>",
        "criticalThreshold": "<value/window>",
        "destination": "<destination>",
        "primaryOwner": "<owner>",
        "backupOwner": "<owner>",
        "baselineEvidenceReference": "<reference>",
        "alertTest": {
          "status": "<PASS>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>"
        }
      },
      "startup_migration": {
        "warningThreshold": "<value/window>",
        "criticalThreshold": "<value/window>",
        "destination": "<destination>",
        "primaryOwner": "<owner>",
        "backupOwner": "<owner>",
        "baselineEvidenceReference": "<reference>",
        "alertTest": {
          "status": "<PASS>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>"
        }
      },
      "auth_failures": {
        "warningThreshold": "<value/window>",
        "criticalThreshold": "<value/window>",
        "destination": "<destination>",
        "primaryOwner": "<owner>",
        "backupOwner": "<owner>",
        "baselineEvidenceReference": "<reference>",
        "alertTest": {
          "status": "<PASS>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>"
        }
      },
      "purchase_entitlement": {
        "warningThreshold": "<value/window>",
        "criticalThreshold": "<value/window>",
        "destination": "<destination>",
        "primaryOwner": "<owner>",
        "backupOwner": "<owner>",
        "baselineEvidenceReference": "<reference>",
        "alertTest": {
          "status": "<PASS>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>"
        }
      },
      "account_deletion": {
        "warningThreshold": "<value/window>",
        "criticalThreshold": "<value/window>",
        "destination": "<destination>",
        "primaryOwner": "<owner>",
        "backupOwner": "<owner>",
        "baselineEvidenceReference": "<reference>",
        "alertTest": {
          "status": "<PASS>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>"
        }
      },
      "database_backup": {
        "warningThreshold": "<value/window>",
        "criticalThreshold": "<value/window>",
        "destination": "<destination>",
        "primaryOwner": "<owner>",
        "backupOwner": "<owner>",
        "baselineEvidenceReference": "<reference>",
        "alertTest": {
          "status": "<PASS>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>"
        }
      },
      "mobile_crash_hang": {
        "warningThreshold": "<value/window>",
        "criticalThreshold": "<value/window>",
        "destination": "<destination>",
        "primaryOwner": "<owner>",
        "backupOwner": "<owner>",
        "baselineEvidenceReference": "<reference>",
        "alertTest": {
          "status": "<PASS>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>"
        }
      },
      "legal_support": {
        "warningThreshold": "<value/window>",
        "criticalThreshold": "<value/window>",
        "destination": "<destination>",
        "primaryOwner": "<owner>",
        "backupOwner": "<owner>",
        "baselineEvidenceReference": "<reference>",
        "alertTest": {
          "status": "<PASS>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>"
        }
      },
      "privacy_security": {
        "warningThreshold": "<value/window>",
        "criticalThreshold": "<value/window>",
        "destination": "<destination>",
        "primaryOwner": "<owner>",
        "backupOwner": "<owner>",
        "baselineEvidenceReference": "<reference>",
        "alertTest": {
          "status": "<PASS>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>"
        }
      }
    },
    "escalationEvidenceReference": "<reference>",
    "retentionEvidenceReference": "<reference>",
    "coverage": {
      "status": "<PASS>",
      "confirmedBy": "<name/role>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>"
    }
  },
  "rollback": {
    "promotionDecision": "<PASS>",
    "selectedPath": "<NO_ACTION_HEALTHY>",
    "decisionOwner": "<name/role>",
    "decisionAtUtc": "<UTC>",
    "schemaSafetyEvidenceReference": "<reference>",
    "previousApplicationRevision": "<must equal deployments.previousProductionApiRevision>",
    "previousPublicLegalRevision": "<must equal deployments.previousPublicLegalRevision>",
    "databaseRecoveryPointReference": "<reference>",
    "runbookReference": "<reference>",
    "postActionProbes": {
      "status": "<PASS>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>"
    }
  }
}
```

<!-- CUT_OS_RELEASE_CONTROL_V1_END -->

Finalization rules:

1. Resolve every angle-bracket placeholder in the canonical JSON and the two
   required `BUILD_SHA` acknowledgment lines below. Use
   `N/A — reason — approver` only where the JSON schema permits it.
2. Set both manifest statuses to `FINAL`, set `finalizedAtUtc` to the actual
   current UTC time, and change both recovery confirmation booleans to `true`.
   Do not future-date finalization.
3. Keep release-event evidence timestamps between `createdAtUtc` and
   `finalizedAtUtc`. `restoreDrillAtUtc` may predate creation, but it must be
   no more than 90 days old at finalization.
4. Choose and check exactly one target-appropriate upload acknowledgment below,
   then delete the other line.
5. From the repository root, compute the adjacent checksum using the exact
   repository-relative manifest path, without modifying the finalized file:

   ```sh
   shasum -a 256 RELEASE_MANIFEST_PATH > RELEASE_MANIFEST_PATH.sha256
   ```

6. Stage the finalized manifest, its `.sha256`, the allowlisted App Store JSON
   evidence, and manifest-referenced PNG captures together. Commit them once as
   the direct child of `BUILD_SHA`; this is `POST_BUILD_EVIDENCE_SHA`.
7. Run the integrated post-build/release validator from that clean commit and
   record `POST_BUILD_EVIDENCE_SHA`, the result, time, and owner decision outside
   this file. A commit cannot contain its own SHA, and modifying this file after
   checksumming would invalidate the checksum.
8. Never amend a finalized manifest. A correction requires a new build candidate
   and a new manifest whose controlled evidence names the superseded record.

## Candidate identity

- [ ] Git worktree was clean before build.
- BUILD_SHA — source/routing/build/upload commit: `<40 lowercase hex SHA>`
- [ ] EAS upload ran from clean `BUILD_SHA` before post-build evidence changes.
- [ ] No EAS upload occurred for this staging-only target.

All remaining candidate and deployment identity is recorded once in the
canonical `build` and `deployments` objects. The evidence commit SHA and
integrated-validator result are recorded in the external handoff after commit.

## Automated gates

The canonical `automatedGates` object is the sole result record. Do not add a
second result table here.

## Approval gates

The canonical `approvals` object is the sole approval record. An upload-bearing
target requires `approvals.eas_upload.decision` to be `APPROVED`. Submit for
App Review and manual public release remain separate post-commit owner decisions
recorded only in the external handoff.

## Environment identity — non-secret aliases only

The canonical deployment fields and `releaseSafetyChecks.production_service_set`
evidence reference identify the approved non-secret service map. Detailed
provider aliases stay in that controlled reference, never in a second manifest
record.

## API limiter topology and live abuse gate

The canonical `releaseSafetyChecks.limiter_live_abuse` record is authoritative.
Its controlled evidence must cover the provider always-on one-machine minimum
and one-machine maximum, live two-client isolation, restart-reset behavior, and
the approved edge control.
Never include client IPs, forwarding headers, raw logs, or response bodies here.

## Clerk production proxy activation

The canonical `releaseSafetyChecks.clerk_proxy_activation` record is
authoritative. Its controlled evidence must cover the exact production tenant,
proxy URL, trust topology, ingress-bypass checks, adversarial header checks,
bounded health verification, and physical-device authentication.

## Authentication recovery security

The canonical recovery safety check and approval are authoritative. Their
controlled evidence must name the selected Clerk-supported architecture and the
approved production-tenant enumeration-resistance battery without identifiers,
codes, passwords, response bodies, or raw timing samples.

## Database migration and recovery

The canonical `backupRecovery` object is the sole migration, backup, restore,
RPO/RTO, and recovery-approval record.

- [ ] No concurrent manual migration will run during API startup migration.
- [ ] Previous API rollback is forbidden unless schema compatibility is proven.

## Deployment identity and provenance

The canonical `deployments` object is the sole deployment-identity record.
Archive, privacy-report, build-image, and export-compliance details live in its
controlled evidence references.

## Approved legal publication

The canonical legal publication safety check and approval are authoritative.
Approved hashes, public URLs, rendering identity, and live-verifier output live
in their controlled evidence references.

## Staging smoke and QA

The canonical `smoke.staging` object is the sole staging result record. Its
references contain the sanitized observation-window and exact-build QA evidence.

## Production smoke

The canonical `smoke.production` object is the sole production result record.
Its references contain sanitized deployment-window readings and review-account
evidence.

## Monitoring and escalation

The canonical `monitoring` object is the sole threshold, ownership, alert-test,
retention, escalation, and live-coverage record. Do not invent thresholds or add
a second outcome table here.

## Rollback/roll-forward decision

The canonical `rollback` object is the sole promotion and recovery-path record.
The immutable passing release uses `NO_ACTION_HEALTHY`; any corrective action
requires a new candidate and controlled incident record.

## TestFlight and App Review handoff

- BUILD_SHA: `<40 lowercase hex SHA>`

The canonical `build` and `deployments` fields must match
`app-store/testflight-submission.json`. Exact EAS and App Store Connect IDs,
version/build, QA, purchase, accessibility, privacy, commercial, age-rating,
review-account, screenshot, and subscription evidence remain in the controlled
references and allowlisted App Store JSON. Record the post-build evidence SHA and
integrated-validator outcome only in the external handoff.

## Post-commit decisions

The immutable repository manifest ends when its checksum and the allowlisted
evidence are committed as `POST_BUILD_EVIDENCE_SHA`. Record the integrated
release-validator result, that SHA, final probes, Submit for App Review decision,
App Review outcome, manual public-release decision, and any later incident in the
controlled external handoff. Do not amend this file or add another post-build
evidence commit.
