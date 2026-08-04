# CUT OS — release operations runbook

**Updated:** August 3, 2026
**Scope:** Staging, production, database recovery, monitoring, TestFlight, and
App Review handoff for the paid adults-only v1 release.

This runbook is an execution control, not authorization to deploy. The owner,
qualified counsel, privacy reviewer, and health/nutrition reviewer retain every
approval gate in `OWNER_LAUNCH_DECISIONS.md`, `APP_STORE_READINESS.md`, and
`EAS_RELEASE_RUNBOOK.md`. Never enroll, accept an agreement, spend paid quota,
publish legal copy, create a production subscription, upload a build, submit to
App Review, or release publicly without the recorded approval for that action.

## Release invariants

- Release only from a clean, immutable Git commit that passed the required CI
  gates.
- Start a new copy of `RELEASE_EVIDENCE_MANIFEST_TEMPLATE.md` before touching a
  shared environment. One manifest represents one candidate Git commit, API
  deployment, database revision, EAS build, and Apple build number.
- Record only non-secret service aliases and evidence links. Never record a DSN,
  token, private key, session cookie, tester password, device identifier, health
  data, or response body.
- Staging must use an isolated database and non-production Clerk and RevenueCat
  configuration. A preview pointed at production services is not staging.
- Production API startup applies committed Drizzle migrations under an advisory
  lock and then requires the database's exact latest migration before binding.
  Do not run a separate migration command concurrently with an API rollout.
- A database migration can make the prior API revision unable to become ready.
  Never assume that rolling back only the application is safe after a migration.
- Promotion stops on any failed gate. A verbal assurance is not evidence.

## Required roles and records

Name these people or functions in the release manifest before staging:

| Role                      | Required responsibility                                          |
| ------------------------- | ---------------------------------------------------------------- |
| Release lead              | Owns the checklist, timestamps, promotion decision, and manifest |
| Database recovery owner   | Verifies backup/PITR and can execute a tested restore            |
| Monitoring/incident owner | Watches the agreed signals and can stop promotion                |
| Mobile QA owner           | Owns native, Sandbox, and TestFlight evidence                    |
| Business owner            | Approves paid actions, Apple actions, submission, and release    |
| Required reviewers        | Counsel, privacy, health/nutrition, and security as applicable   |

The release lead records the exact staging and production service identities in
the manifest before a deploy. Use provider project/service aliases, not secret
connection values. If any identity is ambiguous, stop.

## Environment contract

| Property            | Staging                                              | Production                                           |
| ------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| Purpose             | Production-like rehearsal with test data             | App Review and customers                             |
| Database            | Isolated, disposable test data; same migration chain | Approved production database with verified recovery  |
| Clerk               | Development/test instance                            | Exact owner-approved production instance             |
| RevenueCat/StoreKit | Test/Sandbox configuration                           | Exact approved project and App Store products        |
| API and legal hosts | Stable HTTPS staging hosts                           | Stable owner-approved HTTPS hosts                    |
| Mobile distribution | Internal development/preview build only              | Production EAS build, then internal TestFlight first |
| Monitoring          | Same signal names and probes as production           | Approved alert destinations and escalation owner     |

Do not call an environment production-like until its service map, migration
revision, health probes, auth guard, legal resources, and monitoring signals are
recorded. Environment creation, credentials, paid services, and alert routing
remain owner-controlled actions.

## 1. Open the release record

1. Create the repository-local evidence directory with
   `mkdir -p release-evidence`, then copy
   `RELEASE_EVIDENCE_MANIFEST_TEMPLATE.md` to a new, uniquely named file.
   Recommended name: `release-evidence/<version>-<build>-<UTC timestamp>.md`.
2. Set its status to `DRAFT` and record the release lead, target, UTC creation
   time, Git commit, and clean-worktree result.
3. Link the approved scope and every issue included in the candidate.
4. Record the exact environment aliases and provider deployment commands that
   the authorized owner will use. Do not leave a deploy command to improvisation
   during the release window.
5. Record the previous known-good API deployment, database revision, public-site
   deployment, and mobile build. If any identifier is unknown, rollback is not
   ready.

## 2. Local and CI preflight

From the repository root on the candidate commit:

```sh
git status --porcelain
git rev-parse HEAD
pnpm install --frozen-lockfile
pnpm audit --audit-level high
pnpm run codegen:check
pnpm run typecheck
pnpm run test
pnpm run validate:app-store
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/db run generate
git diff --exit-code -- lib/db/migrations
git status --porcelain --untracked-files=all -- lib/db/migrations
pnpm --filter @workspace/cut-os exec expo install --check
pnpm --filter @workspace/cut-os exec expo-doctor
pnpm --filter @workspace/cut-os run validate:legal-site
```

The first command and the migration-scoped status command must print nothing.
The diff command must pass. Together these checks catch both modified and newly
generated untracked migration files. The working App Store validator keeps the
draft metadata, privacy mapping, authentication-security gate, screenshot plan,
and app configuration in sync; it is not the post-capture release approval.
Record the CI run URL and result for the exact commit. Do not copy CI logs that
may contain environment values into the manifest.

When production EAS environment access is authorized, run the non-secret
preflight in `EAS_RELEASE_RUNBOOK.md`. It validates variable names and reasons,
release configuration, approved legal-source hashes, and live legal resources
without printing values.

## 3. Classify the database change and prove recovery

Read every migration introduced since the previous production deployment and
choose exactly one class in the manifest:

- `none`: no committed migration is new.
- `additive-compatible`: the old and new API revisions can both operate safely
  against the migrated schema; compatibility is demonstrated in tests.
- `state-changing`: a migration updates, backfills, or deletes stored values.
- `destructive/incompatible`: a migration drops or renames a schema element,
  irreversibly changes data, or makes the old API fail its exact-schema gate.

The current chain includes state-changing and destructive work, including
clearing stored email values, dropping `profiles.birth_year`, and neutralizing
legacy profile values. Treat a first deployment of those migrations as
`destructive/incompatible`, even if the intended production database is empty.

Before staging, and again before production, the database recovery owner must
record:

- backup or point-in-time recovery mechanism and non-secret evidence reference;
- backup/PITR coverage timestamp later than the final pre-deploy write cutoff;
- last successful restore-drill timestamp and result;
- owner-approved recovery point and recovery time objectives;
- whether the previous API is compatible with the new schema;
- a roll-forward candidate or a coordinated application-and-database restore
  procedure; and
- the person authorized to start recovery.

If recovery has not been tested, the database contains unbacked writes, or the
restore owner is unavailable, stop. Do not use `drizzle-kit push`, hand-edit the
migration journal, delete migration rows, or apply a down migration during an
incident.

## 4. Stage the exact candidate

Staging infrastructure is an owner/provider prerequisite. Once its isolated
service map and deployment command are recorded:

1. Confirm staging has no production users or production credentials.
2. Capture a staging backup or disposable reset point.
3. Deploy the candidate API using the recorded provider command. Allow its
   startup migration gate to run once; do not launch a concurrent manual
   migration.
4. Confirm the deployed database's newest migration matches the candidate's
   `EXPECTED_MIGRATION` tag, timestamp, and SHA-256 from
   `artifacts/api-server/src/lib/readiness.ts`.
5. Run the read-only smoke checks below using public origins without query
   strings, credentials, or fragments. Staging and production origins must use
   HTTPS. The verifier's local-HTTP escape hatch is only for loopback developer
   tests, requires the explicit `--allow-local-http` flag, and must never appear
   in release evidence:

```sh
pnpm run verify:deploy -- <STAGING_API_ORIGIN>/api/healthz json-health
pnpm run verify:deploy -- <STAGING_API_ORIGIN>/api/readyz json-readiness
pnpm run verify:deploy -- <STAGING_API_ORIGIN>/api/me auth-guard
pnpm run verify:deploy -- <STAGING_PUBLIC_ORIGIN>/status json-readiness
```

6. With the approved staging legal URLs supplied through the normal environment
   mechanism, run:

```sh
pnpm --filter @workspace/cut-os run validate:legal-site:live
```

7. Use test accounts and non-production purchase configuration to complete the
   native QA, poor-network, adult-eligibility, deletion, purchase, restore,
   relaunch, shared-device, and accessibility scripts in `QA_REPORT.md` and
   `PURCHASE_QA_REPORT.md`.
8. Observe staging for the predeclared window and compare error rate, latency,
   readiness, database pool behavior, provider failures, and worker health with
   the approved staging baseline. Fill the actual baseline and acceptable
   variance in the manifest; this repository intentionally invents neither.
9. Record results and sanitized evidence. Any failed check returns the candidate
   to engineering; do not waive it during production deployment.

The verifier has a default 10-second request limit and 1,000,000-byte response
limit. It never prints response bodies or URL credentials/query/fragment. A
release lead may lower those limits with `--timeout-ms` and
`--max-response-bytes`; raising them beyond the script's fixed safety ceiling is
rejected.

## 5. Production readiness hold point

Before any production action, the release lead and business owner review the
manifest together. Every item below must be recorded as pass, approved, or not
applicable with a reason:

- exact-commit CI and staging evidence;
- owner/counsel/privacy/health-nutrition/security gates applicable to the scope;
- public legal/support identity and exact approved publication hashes;
- production API, database, Clerk, RevenueCat, EAS, and Apple service aliases;
- database recovery evidence and rollback matrix;
- monitoring owners, destinations, baselines, thresholds, and observation
  window;
- current review account and App Review instructions;
- one selected Clerk-supported password-recovery architecture, provider-support
  evidence, implementation evidence, and an approved production-tenant test
  protocol for `artifacts/cut-os/AUTH_SECURITY_PRELAUNCH.md`;
- owner-approved initial territories and every applicable US, EU/EEA, or UK
  regulated-medical-device declaration;
- a current reconciliation of each selected two-letter repository storefront
  code to Apple's active three-letter App Store Connect `Territory.id`, recorded
  in `app-store/app-store-connect-territories.json` without adding or inferring
  any territory;
- prior known-good deployment identifiers; and
- explicit authorization for any paid build/upload and production deployment.

If a required field is `TBD`, stop. `N/A` requires a written reason and approver.

## 6. Production deployment and smoke

Use the provider commands recorded and approved in the manifest; the repository
does not guess a hosting command.

1. Announce the change window to the recorded monitoring/incident owner.
2. Confirm the recovery evidence is still current and record the final pre-deploy
   backup/PITR timestamp.
3. Deploy the API candidate. If the provider supports a no-traffic revision or
   canary, verify it before promotion; otherwise record that capability as
   unavailable rather than pretending a canary occurred.
4. Watch startup logs for the sanitized migration failure codes listed below.
   Confirm `/api/readyz` succeeds before routing normal traffic.
5. Run the same API liveness, readiness, and auth-guard commands used in staging,
   substituting the production origin.
6. Publish the exact counsel-approved legal/static candidate only after the
   publication approval is recorded. Run the live legal verifier and the public
   `/status` readiness check.
7. Exercise one authorized production review account without recording its
   credentials or health/nutrition response data.
8. Execute the approved password-recovery enumeration battery against the exact
   production Clerk tenant. Record only the non-secret tenant alias and sanitized
   evidence references for generic response parity, response-envelope parity,
   timing parity, rate-limit behavior, provider failures, and safe abuse logging.
   Never record tested email identifiers, reset codes, passwords, response
   bodies, or identifier-linked raw timings.
9. Observe every agreed signal for the predeclared production window. Record the
   actual readings or linked dashboards, not screenshots containing personal
   data.
10. Only after the observation gate passes may the owner authorize the production
    EAS build and internal TestFlight upload described in
    `EAS_RELEASE_RUNBOOK.md`.

## Monitoring and alert contract

Monitoring configuration and destinations require owner/provider access. They
must exist before production; documentation alone is not monitoring. Derive
numeric warning/critical thresholds from staging and capacity baselines, record
them in the manifest, and name the approver. Until those fields are filled, the
production gate remains closed.

| Signal              | Alert condition to approve before launch                                                                                                              | Required first action                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `/api/healthz`      | Non-200 for `[count/window]`                                                                                                                          | Check process/revision; stop promotion                                              |
| `/api/readyz`       | Non-200 or latency above `[baseline + approved variance]`                                                                                             | Inspect database and migration status; stop traffic increase                        |
| API 5xx and latency | Above `[approved rate/window]` or `[approved percentile]`                                                                                             | Compare with candidate deployment; apply rollback matrix                            |
| API startup         | Any `database_unavailable`, `database_not_ready`, `migration_lock_timeout`, `migration_failed`, `migration_lock_release_failed`, or `startup_failed`  | Do not route candidate; determine whether migration ran                             |
| Authentication      | Unexpected 401/5xx rate or `/api/me` no longer fails closed without auth                                                                              | Stop promotion; contain any access-control exposure                                 |
| Subscription        | `subscription_status_provider_error`, unexpected entitlement state, purchase/restore failure above approved threshold, or a charged-but-locked report | Hold mobile promotion; preserve provider correlation evidence without customer data |
| Account deletion    | `account_deletion_worker_failed`, request failures, or pending age/retry count above approved threshold                                               | Stop promotion; protect deletion records; start worker/provider triage              |
| Database            | Connection/pool saturation, lock pressure, storage, replication, or backup failure beyond provider-approved threshold                                 | Stop writes/promotion as appropriate; engage recovery owner                         |
| Mobile              | Crash/hang rate or critical flow failure above approved baseline                                                                                      | Stop TestFlight/App Store promotion; prepare corrected build                        |
| Legal/support       | Public legal or support resource unavailable, redirected, draft, or hash-mismatched                                                                   | Stop submission/promotion; restore approved static release                          |
| Privacy/security    | Any cross-user access, credential exposure, or sensitive health/nutrition data in logs/analytics                                                      | Immediate containment and incident escalation; no numeric threshold                 |

Alerts must route to a tested destination with a primary and backup owner. Test
the route without using customer data. Record acknowledgment and escalation
expectations, dashboard links, log retention approved by counsel/privacy, and the
date of the alert test in the manifest.

## Rollback triggers and decision matrix

Decide the path from evidence, not pressure. Stop promotion immediately on:

- any privacy, security, cross-user, or credential exposure;
- readiness failure, startup migration failure, or schema mismatch;
- unauthenticated private-route access that does not return 401;
- loss/corruption of writes or an unexplained migration result;
- broken purchase, restore, entitlement, account deletion, or adult-eligibility
  critical flow;
- live legal/support resources that fail exact verification; or
- any approved warning/critical monitoring threshold reached during the release
  window.

| Observed state                                                                 | Safe response                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Candidate has not migrated production                                          | Route no traffic to it; redeploy the previous known-good API revision                                                                                                                                                        |
| Migration failed before a committed change                                     | Keep candidate out of service; prove database state and use the previous revision only if exact-schema readiness passes                                                                                                      |
| Additive migration completed and compatibility with the previous API is proven | Re-route to the recorded previous revision, then verify health/readiness/auth and data integrity                                                                                                                             |
| State-changing or destructive migration completed, or compatibility is unknown | Do **not** roll back only the API. Stop promotion/traffic or writes as the incident requires, then roll forward with a corrected compatible API or execute the tested coordinated database snapshot plus application restore |
| Legal/static deployment failed                                                 | Restore the previous approved static deployment and rerun live legal/hash verification                                                                                                                                       |
| Internal TestFlight build failed                                               | Stop distribution to additional testers, notify the test owner, fix, increment the build number, and upload a new build; an installed build is not remotely replaced                                                         |
| App Review submission is pending                                               | Owner decides whether to remove/hold the submission in App Store Connect; record the action                                                                                                                                  |
| Public App Store binary is faulty                                              | Owner stops phased/manual promotion where available and prepares an expedited corrected version; a server rollback must still obey database compatibility                                                                    |

After any rollback or roll-forward:

1. Rerun liveness, readiness, auth-guard, static status, and live legal checks.
2. Verify database revision and critical write/read behavior with non-sensitive
   evidence.
3. Continue monitoring for the incident observation window chosen by the owner.
4. Create an incident record and a new release manifest for the corrected
   candidate. Never rewrite a finalized manifest to make a failed release appear
   successful.

## TestFlight and App Review handoff

The owner authorizes all Apple actions. Engineering may prepare the evidence:

1. Build from the exact manifest commit with the production profile only after
   the production environment preflight succeeds.
2. Record EAS build ID/URL, app version, Apple build number, Xcode image, archive
   checksum, privacy report reference, export-compliance evidence, and backend
   deployment/migration identifiers.
3. Upload to internal TestFlight first. Record the authorized upload command or
   App Store Connect action and its result; do not store Apple credentials.
4. Assign only the owner-approved internal group and tester owner.
5. Complete `PURCHASE_QA_REPORT.md`, `QA_REPORT.md`, and
   `APP_REVIEW_RUNBOOK.md` on the exact build. Record device model/OS, result,
   timestamp, and tester name or approved alias without device IDs.
6. Confirm `authenticationSecurity` in
   `app-store/app-store-submission.json` names the selected Clerk-supported
   recovery architecture, links every required production-tenant evidence item,
   and has all four attributable approvals. A generic client message alone does
   not satisfy this gate.
7. After the exact-build screenshots are captured, selected, reviewed for
   personal data, and every owner-controlled metadata/privacy/age/security field
   is confirmed, run this from the repository root:

   ```sh
   pnpm run validate:app-store:release
   ```

   Record the result in the evidence manifest. This post-capture gate must pass
   before submission. It intentionally does not run in EAS pre-install because
   release screenshots and their exact build identity do not exist until after
   the build.

8. Re-run production probes immediately before handoff to App Review.
9. Owner signs the manifest's submission decision. Submission and manual public
   release are separate approvals.
10. Finalize and checksum the evidence manifest using its instructions. Any later
    correction creates a superseding manifest.

## Sanitized evidence rules

Allowed evidence includes commit hashes, CI/build/deployment IDs, public URLs
without queries, migration hashes, archive/report checksums, provider project
aliases, timestamps, pass/fail results, sanitized error codes, and approver
names/roles.

Authentication evidence may record aggregate/parity results and controlled
references only. It must never include tested email identifiers, password-reset
codes, passwords, response bodies, provider credentials, or raw timing samples
linked to an identifier.

Never include access tokens, credentials, DSNs, full environment dumps, request
or response bodies, cookies, provider payloads, customer identifiers, DOB,
weight, measurements, calories, macros, meals, deletion identity hashes, raw log
exports, or screenshots containing those values.
