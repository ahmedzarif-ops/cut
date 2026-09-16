# CUT OS — release evidence manifest

> Template: use one copy per evidence target. Before an App Store `BUILD_SHA`,
> create distinct draft copies for `app_review` and `public_release`; reserve the
> same release ID and explicit targets, then bind both to the exact build when
> its remote identities exist. Do not put secrets, credentials, DSNs,
> customer/tester identifiers, health/nutrition data, request or response
> bodies, or raw environment/log output in either record.

## Manifest control

- Manifest status: `DRAFT`

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
exactly match the TestFlight evidence record. The
`app_store_server_notifications_decision` and `accessibility_label_decision`
approvals authorize the matching machine-recorded decision. For the initial
voluntary omissions, their evidence references point to attributable owner
authorization for omission; they must not claim a configured notification URL,
an Accessibility Nutrition Label save, or provider evidence that does not exist.

Use UTC ISO-8601 timestamps with `Z`; whole seconds or fractional seconds are
accepted. Except for `restoreDrillAtUtc`, every evidence timestamp must be on or
after `createdAtUtc` and no later than `finalizedAtUtc`. Finalization cannot be
future-dated. The restore drill may predate record creation but must be no more
than 90 days old at finalization.

<!-- CUT_OS_RELEASE_CONTROL_V2_BEGIN -->

```json
{
  "schemaVersion": 2,
  "status": "DRAFT",
  "releaseId": "cut-os-1.0.0-1",
  "target": "public_release",
  "createdAtUtc": "2026-08-05T01:20:46Z",
  "finalizedAtUtc": "<UTC ISO-8601>",
  "releaseLead": "Zarif Ahmed",
  "businessOwner": "Zarif Ahmed",
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
    "databaseMigrationRevision": {
      "tag": "<latest BUILD_SHA Drizzle migration tag>",
      "createdAt": "<latest BUILD_SHA Drizzle journal epoch milliseconds>",
      "sha256": "<lowercase SHA-256 of the latest BUILD_SHA migration SQL>"
    },
    "previousProductionMigration": {
      "state": "initial_launch",
      "productionApiRevision": null,
      "buildGitSha": null,
      "databaseMigrationRevision": null,
      "verifiedBy": "<name or approved role alias>",
      "verifiedAtUtc": "<UTC>",
      "evidenceReference": "<initial-launch approval evidence>"
    },
    "replitProductionHosting": {
      "provider": "replit",
      "accountAlias": "<non-secret Replit account or team alias>",
      "workspaceId": "<exact Replit workspace ID>",
      "deploymentId": "<exact Replit production deployment ID>",
      "databaseId": "<exact Replit production database ID>",
      "providerDeploymentOrigin": "<canonical https Replit deployment origin>",
      "publicOrigin": "<canonical public https origin>",
      "deploymentType": "reserved_vm",
      "region": "<exact Replit deployment region>",
      "machineClass": "<exact Replit machine configuration>",
      "minimumInstances": 1,
      "maximumInstances": 1,
      "fixedMonthlyCostUsdCentsBeforeTax": "<positive integer cents>",
      "usageBasedServiceShutdownLimitUsdCentsBeforeTax": "<nonnegative integer cents>",
      "approvedMonthlyCostCeilingUsdCentsBeforeTax": "<positive integer cents>",
      "costApprovedBy": "<name or approved role alias>",
      "costApprovedAtUtc": "<UTC>",
      "costApprovalEvidenceReference": "<reference>",
      "configurationVerifiedAtUtc": "<UTC>",
      "configurationEvidenceReference": "<reference>"
    },
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
    "tracked_secret_boundary": {
      "status": "<PASS>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>"
    },
    "production_topology_dry_run": {
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
    },
    "production_archive_secret_boundary": {
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
    "app_store_server_notifications_decision": {
      "decision": "<APPROVED>",
      "approver": "<name/role>",
      "atUtc": "<UTC>",
      "evidenceReference": "<owner authorization for the recorded omission or configured-endpoint decision>",
      "notApplicableReason": null
    },
    "accessibility_label_decision": {
      "decision": "<APPROVED>",
      "approver": "<name/role>",
      "atUtc": "<UTC>",
      "evidenceReference": "<owner authorization for the recorded voluntary-omission or publication decision>",
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
    "migrationClassification": {
      "class": "destructive_incompatible",
      "classifiedBy": "<name/role>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>"
    },
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
    "productionMigrationWindow": {
      "productionApiRevision": "<exact deployments.productionApiRevision>",
      "buildGitSha": "<exact 40 lowercase hex BUILD_SHA>",
      "databaseId": "<exact replitProductionHosting.databaseId>",
      "databaseMigrationRevision": {
        "tag": "<exact deployments.databaseMigrationRevision.tag>",
        "createdAt": "<exact deployments.databaseMigrationRevision.createdAt integer>",
        "sha256": "<exact deployments.databaseMigrationRevision.sha256>"
      },
      "startedAtUtc": "<UTC>",
      "completedAtUtc": "<UTC>",
      "evidenceReference": "<sanitized production startup-migration evidence>"
    },
    "writesQuiesced": {
      "mode": "initial_launch_no_prior_writes",
      "atUtc": "<UTC>",
      "verifiedBy": "<name or approved role alias>",
      "evidenceReference": "<controlled evidence that production has no prior writes>"
    },
    "backupCoverageAtUtc": "<UTC>",
    "backupEvidenceReference": "<reference>",
    "recoveryPoint": {
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>"
    },
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
    "previousApiCompatible": false,
    "previousApiCompatibilityEvidenceReference": "<reference>",
    "rollForwardProcedure": {
      "status": "<PASS>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>"
    },
    "coordinatedRestoreProcedure": {
      "status": "<PASS>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>"
    },
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
        "rules": {
          "non200_count": {
            "mode": "numeric",
            "warning": {
              "comparator": "greater_than_or_equal",
              "value": "<nonnegative number>",
              "unit": "count",
              "windowSeconds": "<positive integer>"
            },
            "critical": {
              "comparator": "greater_than_or_equal",
              "value": "<nonnegative number greater than warning>",
              "unit": "count",
              "windowSeconds": "<same positive integer as warning>"
            }
          }
        },
        "destination": "<destination>",
        "primaryOwner": "<owner>",
        "backupOwner": "<owner>",
        "baselineEvidenceReference": "<reference>",
        "approval": {
          "decision": "<APPROVED>",
          "approver": "<name/role>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>",
          "notApplicableReason": null
        },
        "alertTest": {
          "status": "<PASS>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>"
        }
      },
      "api_readiness_latency": {
        "rules": {
          "non200_event": {
            "mode": "any_event",
            "warning": null,
            "critical": null
          },
          "latency_ms": {
            "mode": "numeric",
            "warning": {
              "comparator": "greater_than_or_equal",
              "value": "<nonnegative number>",
              "unit": "milliseconds",
              "windowSeconds": "<positive integer>"
            },
            "critical": {
              "comparator": "greater_than_or_equal",
              "value": "<nonnegative number greater than warning>",
              "unit": "milliseconds",
              "windowSeconds": "<same positive integer as warning>"
            }
          }
        },
        "destination": "<destination>",
        "primaryOwner": "<owner>",
        "backupOwner": "<owner>",
        "baselineEvidenceReference": "<reference>",
        "approval": {
          "decision": "<APPROVED>",
          "approver": "<name/role>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>",
          "notApplicableReason": null
        },
        "alertTest": {
          "status": "<PASS>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>"
        }
      },
      "api_errors_latency": {
        "rules": {
          "five_xx_rate": {
            "mode": "numeric",
            "warning": {
              "comparator": "greater_than_or_equal",
              "value": "<nonnegative number>",
              "unit": "percent",
              "windowSeconds": "<positive integer>"
            },
            "critical": {
              "comparator": "greater_than_or_equal",
              "value": "<number greater than warning and at most 100>",
              "unit": "percent",
              "windowSeconds": "<same positive integer as warning>"
            }
          },
          "latency_ms": {
            "mode": "numeric",
            "warning": {
              "comparator": "greater_than_or_equal",
              "value": "<nonnegative number>",
              "unit": "milliseconds",
              "windowSeconds": "<positive integer>"
            },
            "critical": {
              "comparator": "greater_than_or_equal",
              "value": "<nonnegative number greater than warning>",
              "unit": "milliseconds",
              "windowSeconds": "<same positive integer as warning>"
            }
          }
        },
        "destination": "<destination>",
        "primaryOwner": "<owner>",
        "backupOwner": "<owner>",
        "baselineEvidenceReference": "<reference>",
        "approval": {
          "decision": "<APPROVED>",
          "approver": "<name/role>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>",
          "notApplicableReason": null
        },
        "alertTest": {
          "status": "<PASS>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>"
        }
      },
      "startup_migration": {
        "rules": {
          "startup_failure_event": {
            "mode": "any_event",
            "warning": null,
            "critical": null
          }
        },
        "destination": "<destination>",
        "primaryOwner": "<owner>",
        "backupOwner": "<owner>",
        "baselineEvidenceReference": "<reference>",
        "approval": {
          "decision": "<APPROVED>",
          "approver": "<name/role>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>",
          "notApplicableReason": null
        },
        "alertTest": {
          "status": "<PASS>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>"
        }
      },
      "auth_failures": {
        "rules": {
          "unexpected_error_rate": {
            "mode": "numeric",
            "warning": {
              "comparator": "greater_than_or_equal",
              "value": "<nonnegative number>",
              "unit": "percent",
              "windowSeconds": "<positive integer>"
            },
            "critical": {
              "comparator": "greater_than_or_equal",
              "value": "<number greater than warning and at most 100>",
              "unit": "percent",
              "windowSeconds": "<same positive integer as warning>"
            }
          },
          "auth_guard_failure_event": {
            "mode": "any_event",
            "warning": null,
            "critical": null
          }
        },
        "destination": "<destination>",
        "primaryOwner": "<owner>",
        "backupOwner": "<owner>",
        "baselineEvidenceReference": "<reference>",
        "approval": {
          "decision": "<APPROVED>",
          "approver": "<name/role>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>",
          "notApplicableReason": null
        },
        "alertTest": {
          "status": "<PASS>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>"
        }
      },
      "purchase_entitlement": {
        "rules": {
          "provider_error_event": {
            "mode": "any_event",
            "warning": null,
            "critical": null
          },
          "entitlement_anomaly_event": {
            "mode": "any_event",
            "warning": null,
            "critical": null
          },
          "purchase_restore_failure_rate": {
            "mode": "numeric",
            "warning": {
              "comparator": "greater_than_or_equal",
              "value": "<nonnegative number>",
              "unit": "percent",
              "windowSeconds": "<positive integer>"
            },
            "critical": {
              "comparator": "greater_than_or_equal",
              "value": "<number greater than warning and at most 100>",
              "unit": "percent",
              "windowSeconds": "<same positive integer as warning>"
            }
          }
        },
        "destination": "<destination>",
        "primaryOwner": "<owner>",
        "backupOwner": "<owner>",
        "baselineEvidenceReference": "<reference>",
        "approval": {
          "decision": "<APPROVED>",
          "approver": "<name/role>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>",
          "notApplicableReason": null
        },
        "alertTest": {
          "status": "<PASS>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>"
        }
      },
      "account_deletion": {
        "rules": {
          "worker_failure_event": {
            "mode": "any_event",
            "warning": null,
            "critical": null
          },
          "request_failure_rate": {
            "mode": "numeric",
            "warning": {
              "comparator": "greater_than_or_equal",
              "value": "<nonnegative number>",
              "unit": "percent",
              "windowSeconds": "<positive integer>"
            },
            "critical": {
              "comparator": "greater_than_or_equal",
              "value": "<number greater than warning and at most 100>",
              "unit": "percent",
              "windowSeconds": "<same positive integer as warning>"
            }
          },
          "pending_age_seconds": {
            "mode": "numeric",
            "warning": {
              "comparator": "greater_than_or_equal",
              "value": "<nonnegative number>",
              "unit": "seconds",
              "windowSeconds": "<positive integer>"
            },
            "critical": {
              "comparator": "greater_than_or_equal",
              "value": "<nonnegative number greater than warning>",
              "unit": "seconds",
              "windowSeconds": "<same positive integer as warning>"
            }
          },
          "retry_count": {
            "mode": "numeric",
            "warning": {
              "comparator": "greater_than_or_equal",
              "value": "<nonnegative number>",
              "unit": "count",
              "windowSeconds": "<positive integer>"
            },
            "critical": {
              "comparator": "greater_than_or_equal",
              "value": "<nonnegative number greater than warning>",
              "unit": "count",
              "windowSeconds": "<same positive integer as warning>"
            }
          }
        },
        "destination": "<destination>",
        "primaryOwner": "<owner>",
        "backupOwner": "<owner>",
        "baselineEvidenceReference": "<reference>",
        "approval": {
          "decision": "<APPROVED>",
          "approver": "<name/role>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>",
          "notApplicableReason": null
        },
        "alertTest": {
          "status": "<PASS>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>"
        }
      },
      "database_backup": {
        "rules": {
          "pool_saturation_ratio": {
            "mode": "numeric",
            "warning": {
              "comparator": "greater_than_or_equal",
              "value": "<number from 0 through 1>",
              "unit": "ratio",
              "windowSeconds": "<positive integer>"
            },
            "critical": {
              "comparator": "greater_than_or_equal",
              "value": "<number greater than warning and at most 1>",
              "unit": "ratio",
              "windowSeconds": "<same positive integer as warning>"
            }
          },
          "lock_wait_ms": {
            "mode": "numeric",
            "warning": {
              "comparator": "greater_than_or_equal",
              "value": "<nonnegative number>",
              "unit": "milliseconds",
              "windowSeconds": "<positive integer>"
            },
            "critical": {
              "comparator": "greater_than_or_equal",
              "value": "<nonnegative number greater than warning>",
              "unit": "milliseconds",
              "windowSeconds": "<same positive integer as warning>"
            }
          },
          "storage_usage_ratio": {
            "mode": "numeric",
            "warning": {
              "comparator": "greater_than_or_equal",
              "value": "<number from 0 through 1>",
              "unit": "ratio",
              "windowSeconds": "<positive integer>"
            },
            "critical": {
              "comparator": "greater_than_or_equal",
              "value": "<number greater than warning and at most 1>",
              "unit": "ratio",
              "windowSeconds": "<same positive integer as warning>"
            }
          },
          "replication_lag_seconds": {
            "mode": "numeric",
            "warning": {
              "comparator": "greater_than_or_equal",
              "value": "<nonnegative number>",
              "unit": "seconds",
              "windowSeconds": "<positive integer>"
            },
            "critical": {
              "comparator": "greater_than_or_equal",
              "value": "<nonnegative number greater than warning>",
              "unit": "seconds",
              "windowSeconds": "<same positive integer as warning>"
            }
          },
          "backup_failure_event": {
            "mode": "any_event",
            "warning": null,
            "critical": null
          }
        },
        "destination": "<destination>",
        "primaryOwner": "<owner>",
        "backupOwner": "<owner>",
        "baselineEvidenceReference": "<reference>",
        "approval": {
          "decision": "<APPROVED>",
          "approver": "<name/role>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>",
          "notApplicableReason": null
        },
        "alertTest": {
          "status": "<PASS>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>"
        }
      },
      "mobile_crash_hang": {
        "rules": {
          "crash_hang_rate": {
            "mode": "numeric",
            "warning": {
              "comparator": "greater_than_or_equal",
              "value": "<nonnegative number>",
              "unit": "percent",
              "windowSeconds": "<positive integer>"
            },
            "critical": {
              "comparator": "greater_than_or_equal",
              "value": "<number greater than warning and at most 100>",
              "unit": "percent",
              "windowSeconds": "<same positive integer as warning>"
            }
          },
          "critical_flow_failure_rate": {
            "mode": "numeric",
            "warning": {
              "comparator": "greater_than_or_equal",
              "value": "<nonnegative number>",
              "unit": "percent",
              "windowSeconds": "<positive integer>"
            },
            "critical": {
              "comparator": "greater_than_or_equal",
              "value": "<number greater than warning and at most 100>",
              "unit": "percent",
              "windowSeconds": "<same positive integer as warning>"
            }
          }
        },
        "destination": "<destination>",
        "primaryOwner": "<owner>",
        "backupOwner": "<owner>",
        "baselineEvidenceReference": "<reference>",
        "approval": {
          "decision": "<APPROVED>",
          "approver": "<name/role>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>",
          "notApplicableReason": null
        },
        "alertTest": {
          "status": "<PASS>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>"
        }
      },
      "legal_support": {
        "rules": {
          "resource_failure_event": {
            "mode": "any_event",
            "warning": null,
            "critical": null
          }
        },
        "destination": "<destination>",
        "primaryOwner": "<owner>",
        "backupOwner": "<owner>",
        "baselineEvidenceReference": "<reference>",
        "approval": {
          "decision": "<APPROVED>",
          "approver": "<name/role>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>",
          "notApplicableReason": null
        },
        "alertTest": {
          "status": "<PASS>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>"
        }
      },
      "privacy_security": {
        "rules": {
          "incident_event": {
            "mode": "any_event",
            "warning": null,
            "critical": null
          }
        },
        "destination": "<destination>",
        "primaryOwner": "<owner>",
        "backupOwner": "<owner>",
        "baselineEvidenceReference": "<reference>",
        "approval": {
          "decision": "<APPROVED>",
          "approver": "<name/role>",
          "atUtc": "<UTC>",
          "evidenceReference": "<reference>",
          "notApplicableReason": null
        },
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
    "schemaSafetyEvidenceReference": "<must equal backupRecovery.previousApiCompatibilityEvidenceReference>",
    "previousApplicationRevision": "<must equal deployments.previousProductionApiRevision>",
    "previousPublicLegalRevision": "<must equal deployments.previousPublicLegalRevision>",
    "databaseRecoveryPointReference": "<must equal backupRecovery.recoveryPoint.evidenceReference>",
    "runbookReference": "<reference>",
    "postActionProbes": {
      "status": "<PASS>",
      "atUtc": "<UTC>",
      "evidenceReference": "<reference>"
    }
  }
}
```

<!-- CUT_OS_RELEASE_CONTROL_V2_END -->

Finalization rules:

1. Resolve every angle-bracket placeholder in the canonical JSON and the two
   required `BUILD_SHA` acknowledgment lines below. Use
   `N/A — reason — approver` only where the JSON schema permits it.
   Replace both quoted current-migration `createdAt` placeholders with the same
   positive Drizzle journal integer, and replace all three quoted hosting cost
   placeholders with integer-cent literals. Replace every numeric monitoring
   `value` and `windowSeconds` placeholder with a JSON number; do not leave
   numeric fields as strings. This v1 manifest accepts only the true
   `initial_launch` state: leave all three previous-production identity fields
   as JSON `null`, name the accountable initial-launch verifier, and retain
   controlled initial-launch evidence. Do not select or type a `deployed`
   baseline. A later schema must bind that state to an immutable prior finalized
   public-release record before it can be accepted.
2. In the one target manifest being finalized, set its human-readable status
   line and canonical JSON `status` to `FINAL`, set `finalizedAtUtc` to the
   actual current UTC time, and change both recovery confirmation booleans to
   `true`. Leave the other App Store target manifest in `DRAFT` until its own
   phase. Set `previousApiCompatible` to `true` only when the closed migration
   class is `none`; every completed migration class requires `false`. Do not
   future-date finalization.
3. Keep release-event evidence timestamps between `createdAtUtc` and
   `finalizedAtUtc`. `restoreDrillAtUtc` may predate creation, but it must be no
   more than 90 days old at finalization. The attributable
   `writesQuiesced.atUtc` evidence must precede both the approved recovery point
   and proven backup coverage. The recovery point must be no later than backup
   coverage, and backup coverage must strictly precede
   `productionMigrationWindow.startedAtUtc`. Recovery approval must be recorded
   strictly after recovery-point selection and no later than migration start.
   Migration completion must be no earlier than its start and no later than
   both database-readiness and production API-readiness evidence. Baseline
   verification, migration classification/rehearsal, restore drill, recovery
   approval, and both roll-forward and coordinated-restore procedure evidence
   must all be dated no later than migration start. The migration-window record
   must repeat the exact production API revision, `BUILD_SHA`, Replit database
   ID, and current migration tuple from the canonical deployment fields.
4. Choose and check exactly one target-appropriate upload acknowledgment below,
   then delete the other line.
5. From the repository root, compute the adjacent checksum using the exact
   repository-relative manifest path, without modifying the finalized file:

   ```sh
   shasum -a 256 RELEASE_MANIFEST_PATH > RELEASE_MANIFEST_PATH.sha256
   ```

6. For `app_review`, stage the finalized App Review manifest, its `.sha256`, the
   allowlisted App Store JSON evidence, and manifest-referenced PNG captures
   together. Commit them once as the direct child of `BUILD_SHA`; this is
   `APP_REVIEW_EVIDENCE_SHA`. Leave the pre-existing public-release draft
   manifest byte-identical and do not add its checksum yet.
7. The release lead owns the exact App Store Connect version/submission status
   watch and the security owner is backup. Before finalizing `app_review`, freeze
   distinct owners in `appReview.clerkReviewAccess.shutdownControl`, prove both
   have production Clerk access, set status source
   `exact_app_store_connect_submission`, enable monitoring and escalation, keep
   the fixed 15-minute SLO, and record a fresh access-preflight UTC/evidence
   reference. Keep its trigger, disablement, and closure-evidence fields null.
   Disable Clerk production test
   mode immediately, and no later than 15 minutes, whenever it leaves the
   authorized waiting/in-review states, including Accepted, Pending Developer
   Release, Rejected, Unresolved Issues, Invalid Binary, withdrawal, removal, or
   abandonment, or on unexpected reserved-account activity. For
   `public_release`, additionally require Apple approval, no active review
   session, and **Pending Developer Release**. Retain Client Trust. In
   `app-store/app-store-submission.json`, advance only root `updated`; Clerk
   `testModeState`, `verifiedAtUtc`, and `evidenceReference`; shutdown
   `triggerObservedAtUtc`, `testModeDisabledAtUtc`, and
   `shutdownEvidenceReference`; and Apple `state`, `appVersionStatus`,
   `submissionSection`, `allSubmittedItemsAccepted`, `verifiedAtUtc`, and
   `evidenceReference`. Preserve all other submission fields. The shutdown
   trigger must follow App Review evidence finalization, disablement must follow
   within 15 minutes and precede public finalization, and closure evidence must
   differ from access-preflight evidence. Keep
   the five App Review account attestations as immutable historical evidence of
   the completed review-access window. Finalize the distinct public-release
   manifest and add its adjacent checksum. Commit
   only those changes as the direct child of `APP_REVIEW_EVIDENCE_SHA`; this is
   `PUBLIC_RELEASE_EVIDENCE_SHA`. Do not modify the finalized App Review
   manifest/checksum, TestFlight record, screenshots, territory record, or any
   runtime/procedure file.
   Before submission, pass exact-head CI on `APP_REVIEW_EVIDENCE_SHA`,
   non-force fast-forward `main` to that exact SHA, wait for push CI, confirm the
   remote SHA, and rerun current-clock validation/probes. Freeze `main` there
   throughout review. After approval, pass exact-head CI on
   `PUBLIC_RELEASE_EVIDENCE_SHA`, fast-forward `main` directly from A to P, wait
   for push CI, confirm the remote SHA, and rerun validation/probes before
   release. GitHub merge, squash, rebase-and-merge, merge-queue, force-push, and
   intervening-commit paths are prohibited for both evidence commits.
8. A `staging` or `internal_testflight` record uses one target manifest and the
   general evidence verifier as a direct child of its build SHA; it cannot pass
   the App Store release validator or enter the two-target App Store chain.
9. Run the integrated post-build/release validator from the clean target commit
   and record its SHA, result, time, and owner decision outside the manifest. A
   commit cannot contain its own SHA, and modifying a manifest after
   checksumming would invalidate the checksum.
10. Never amend a finalized manifest. A correction, missing pre-created target
    manifest, changed build/runtime fact, or non-fast-forward history requires a
    new build candidate and new manifests whose controlled evidence names the
    superseded record.

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
recorded only in the external handoff. Approval of
`app_store_server_notifications_decision` or `accessibility_label_decision`
means the owner approved the exact configured-or-omitted decision in the App
Store submission record. When that record selects an initial voluntary omission,
the approval evidence proves authorization of the omission only and is not App
Store Connect or provider-configuration evidence.

## Environment identity — non-secret aliases only

The canonical deployment fields machine-bind the one Replit production service:
the exact non-secret account, workspace, deployment, database, provider origin,
public origin, Reserved VM shape, and before-tax cost controls live in
`deployments.replitProductionHosting`. Its fixed monthly cost plus the
usage-based service-shutdown limit must not exceed the attributable
owner-approved monthly ceiling. `productionApiRevision` and `publicLegalRevision`
must be the same current single-process revision, and their previous revisions
must also match. `releaseSafetyChecks.production_service_set` points to the
sanitized provider proof for those values; do not duplicate the record or put
credentials in it. For `app_review` and `public_release`, the integrated
verifier reads the exact evidence commit's App Store listing bytes and requires
`supportUrl`, `privacyPolicyUrl`, and `termsUrl` to equal the recorded public
origin plus `/support`, `/privacy`, and `/terms`, respectively.

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

The canonical `deployments.databaseMigrationRevision` tuple binds the latest
Drizzle journal tag, epoch, and SQL bytes at immutable `BUILD_SHA`.
`deployments.previousProductionMigration` is closed to `initial_launch` in this
v1 schema. All three identity fields must be JSON `null`, `verifiedBy` must
identify the approver of the initial-launch evidence, both previous production
revision fields must use attributable `N/A — reason — approver` values, and the
class must be `destructive_incompatible`. A caller-selected `deployed` state is
rejected. Supporting a later release requires a schema that selects and verifies
an immutable prior finalized public-release record; an opaque reference or a
self-consistent revision/SHA pair is not machine proof of what Replit served.

The `backupRecovery.databaseReadiness` and production API-readiness smoke
evidence prove the deployed database matches the current tuple; the rest of
`backupRecovery` is the backup, restore, RPO/RTO, and recovery-approval record.
`productionMigrationWindow` binds sanitized production startup evidence to the
exact production API revision, current `BUILD_SHA`, Replit database ID, and
current migration tuple. `writesQuiesced` is attributable evidence with the
closed `initial_launch_no_prior_writes` mode, not a bare timestamp. The verifier
requires write quiescence before the approved recovery point and proven backup
coverage, requires coverage strictly before migration start, requires recovery
approval strictly after recovery-point selection and no later than migration
start, then requires migration completion before database readiness and the
production readiness smoke check. A post-migration recovery point is not
launch-safe evidence for a destructive change. The previous-baseline
verification, migration classification, rehearsal, restore drill, recovery
approval, roll-forward procedure, and coordinated restore procedure are
prerequisites and must each be recorded at or before migration start.

The accepted first production launch always uses
`destructive_incompatible`, even for an empty database, and records
`previousApiCompatible: false`. Application-only rollback is forbidden after
migration completion. Bind the rollback record to the same compatibility
evidence and approved recovery-point evidence used here.

- [ ] No concurrent manual migration will run during API startup migration.
- [ ] Application-only rollback is forbidden after any completed database migration.

## Deployment identity and provenance

The canonical `deployments` object is the sole deployment-identity record. The
API, landing page, status, Privacy, Terms, and Support routes must resolve to the
same `productionApiRevision` / `publicLegalRevision` value. Archive,
privacy-report, build-image, and export-compliance details live in its
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
retention, escalation, and live-coverage record. Each signal has an exact closed
`rules` map; all 24 atomic rules must remain present. Every numeric rule's
comparator and unit are fixed by its ID, warning and critical use the same
positive window, and critical must be strictly more severe. Zero-tolerance rules
use `any_event` with null boundaries. Every signal requires distinct
primary/backup owners and its own attributable approval covering every rule in
that signal. Do not invent thresholds or add a second outcome table here.

## Rollback/roll-forward decision

The canonical `rollback` object is the sole promotion and recovery-path record.
The immutable passing release uses `NO_ACTION_HEALTHY`; any corrective action
requires a new candidate and controlled incident record. Its `decisionAtUtc` is
the observed post-migration outcome and cannot predate migration completion; it
does not replace the pre-migration `recoveryApproval` or procedure evidence.

## TestFlight and App Review handoff

- BUILD_SHA: `<40 lowercase hex SHA>`

The canonical `build` and `deployments` fields must match
`app-store/testflight-submission.json`. Exact EAS and App Store Connect IDs,
version/build, QA, purchase, accessibility, privacy, commercial, age-rating,
review-account, screenshot, and subscription evidence remain in the controlled
references and allowlisted App Store JSON. Record the post-build evidence SHA and
integrated-validator outcome only in the external handoff.

## Post-commit decisions

This immutable target manifest ends when its checksum and allowlisted evidence
are committed as `APP_REVIEW_EVIDENCE_SHA` or
`PUBLIC_RELEASE_EVIDENCE_SHA`. Record the integrated-validator result, that SHA,
final probes, App Review submission decision/outcome, manual public-release
decision, and any later incident in the controlled external handoff. Never
amend either target manifest; the App Store chain permits the one constrained
public-release child after App Review and rejects any third evidence commit.
