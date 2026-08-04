# CUT OS — release operations runbook

**Updated:** August 4, 2026
**Scope:** Staging, production, database recovery, monitoring, TestFlight, and
App Review handoff for the paid adults-only v1 release.

This runbook is an execution control, not authorization to deploy. The owner,
qualified counsel, privacy reviewer, and health/nutrition reviewer retain every
approval gate in `OWNER_LAUNCH_DECISIONS.md`, `APP_STORE_READINESS.md`, and
`EAS_RELEASE_RUNBOOK.md`. Never enroll, accept an agreement, spend paid quota,
publish legal copy, create a production subscription, upload a build, submit to
App Review, or release publicly without the recorded approval for that action.

## Release invariants

- Build and upload only from a clean, immutable `BUILD_SHA` that pins routing
  and passed the required CI gates. Its App Store evidence history is exactly
  `BUILD_SHA -> APP_REVIEW_EVIDENCE_SHA -> PUBLIC_RELEASE_EVIDENCE_SHA`; each
  evidence commit may contain only its machine-allowlisted non-runtime changes.
- Before establishing `BUILD_SHA`, create distinct `app_review` and
  `public_release` draft copies of `RELEASE_EVIDENCE_MANIFEST_TEMPLATE.md`. They
  represent one release ID, build, combined application deployment, database
  revision, EAS build, and Apple build number at two different evidence targets.
  Missing either pre-created draft after signing requires a new candidate.
- Treat the manifest's canonical `CUT_OS_RELEASE_CONTROL_V2` JSON as the sole
  editable release record. Do not duplicate identities, results, approvals,
  timestamps, or evidence references in the navigation prose below it. Detailed
  operational output belongs in the controlled references named by the JSON.
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

| Property             | Staging                                              | Production                                                |
| -------------------- | ---------------------------------------------------- | --------------------------------------------------------- |
| Purpose              | Production-like rehearsal with test data             | App Review and customers                                  |
| Database             | Isolated, disposable test data; same migration chain | Approved production database with verified recovery       |
| Clerk                | Development/test instance; no FAPI proxy             | Exact production instance and enabled canonical proxy     |
| RevenueCat/StoreKit  | Test/Sandbox configuration                           | Exact approved project and App Store products             |
| Application host     | One stable HTTPS staging host                        | One stable owner-approved HTTPS host                      |
| Public app origin    | One canonical origin shared by app/API/legal         | One owner-approved origin shared by app/API/legal         |
| API process topology | Recorded actual provider minimum and maximum         | Always-on minimum one; maximum one; `API_MAX_INSTANCES=1` |
| Mobile distribution  | Internal development/preview build only              | Production EAS build, then internal TestFlight first      |
| Monitoring           | Same signal names and probes as production           | Approved alert destinations and escalation owner          |

### Clerk no-spend boundary

Clerk paid spend is **not authorized** by a Replit hosting approval or by the
App Store subscription offer approval. Until the owner records a separate,
Clerk-specific approval, the Clerk spend ceiling is `$0`: do not start a free
trial, choose or upgrade a paid plan, add a payment method, accept an automatic
trial conversion or renewal, enable paid add-ons or overages, or accept any
screen that can create a present or future charge. A trial with `$0` due today
still counts as a paid-plan commitment and is blocked.

A free-plan action may continue only when the final confirmation proves all of
the following before the click: `$0` due today, no trial, no automatic paid
conversion or upgrade, no paid overage/add-on commitment, and no payment method
required. If the dashboard does not make every condition explicit, stop. A
future Clerk approval must name the exact plan, charge due immediately,
recurring maximum before tax, tax treatment, renewal/conversion date, trial
terms, overage behavior, and the exact action approved. Never infer that
approval from an overall launch budget.

### Deployment-only production secret and configuration matrix

Replit's development workspace and its live deployment are separate trust
boundaries. Production values must be created only in the live deployment's
secret/environment controls after that deployment is approved. Do not put them
in Replit workspace/development secrets, `.replit`, a tracked or untracked
`.env` file, shell history, chat, screenshots, logs, or a copied environment
dump. Do not assume the deployment inherits a safe value from development.

| Value or group                                                                                                                                                                                                                   | Classification                                    | Replit development workspace                       | Live Replit deployment                                                      | Production EAS/mobile archive                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                                                                                                                                                                   | Server secret                                     | Separate non-production database only              | Exact production TLS DSN; deployment secret only                            | Prohibited                                                                                      |
| `CLERK_SECRET_KEY`                                                                                                                                                                                                               | Server secret                                     | Separate `sk_test_*` instance only                 | Exact `sk_live_*`; deployment secret only                                   | Prohibited                                                                                      |
| `REVENUECAT_SECRET_API_KEY`                                                                                                                                                                                                      | Server secret                                     | Separate non-production server key only, if needed | Exact least-privilege production v2 key; deployment secret only             | Prohibited                                                                                      |
| `CLERK_PUBLISHABLE_KEY`                                                                                                                                                                                                          | Public but environment-bound server configuration | Exact development `pk_test_*`                      | Exact production `pk_live_*` used by the API                                | Use only as the separately named `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`                            |
| `REVENUECAT_PROJECT_ID`, `REVENUECAT_ENTITLEMENT_REST_ID`, `REVENUECAT_APP_REST_ID`, `REVENUECAT_OFFERING_REST_ID`                                                                                                               | Non-secret production identifiers                 | Separate test identifiers only                     | Exact production identifiers; deployment environment only                   | Prohibited; the app receives only its public SDK key and product ID                             |
| `CORS_ALLOWED_ORIGINS`, `PUBLIC_APP_ORIGIN`, `BASE_PATH`, `API_MAX_INSTANCES`, `ACCOUNT_DELETION_RETRY_INTERVAL_MS`, `API_RATE_LIMIT`, `CLERK_RATE_LIMIT`, `PG_POOL_MAX`, `LEGAL_SITE_PUBLICATION_STATUS`, `SHUTDOWN_TIMEOUT_MS` | Non-secret production controls                    | Development values only                            | Exact reviewed production values; provider topology must match the manifest | Prohibited unless an explicit `EXPO_PUBLIC_*` counterpart is listed in `EAS_RELEASE_RUNBOOK.md` |
| `NODE_ENV`                                                                                                                                                                                                                       | Public build-mode marker                          | Development/test value                             | `production`                                                                | Its name may be embedded by Expo tooling; it is not a credential or a server-binding value      |
| Eight `EXPO_PUBLIC_*` values listed in `EAS_RELEASE_RUNBOOK.md`                                                                                                                                                                  | Public, binary-embedded mobile configuration      | Preview/test values only                           | Not a substitute for server values                                          | Production EAS environment only; treat every value as public                                    |
| Apple signing/submission credentials, EAS access tokens, Clerk billing credentials                                                                                                                                               | Release credentials                               | Prohibited                                         | Prohibited                                                                  | Credential manager/provider flow only; never an app variable or archive value                   |
| `PORT` and Replit platform routing metadata                                                                                                                                                                                      | Provider-injected runtime values                  | Provider-managed                                   | Provider-managed; do not copy between environments                          | Not applicable                                                                                  |

Create each approved production entry directly in the live deployment control
plane. Verify only the variable names, deployment alias, and sanitized
pass/fail state in release evidence; never export or compare raw values. Before
traffic, prove the development workspace still points only to development/test
services and prove the live deployment has no `pk_test_*`, `sk_test_*`, Test
Store, preview, or development-database value. A value exposed to the wrong
boundary is an incident: stop, revoke/rotate it at the provider, replace it in
the correct control plane, rebuild every affected mobile artifact, and rerun
the release gates.

`CORS_ALLOWED_ORIGINS` must be one canonical public `https://host` origin in
production: no list, port, path, credentials, query, fragment, or surrounding
whitespace. Provider-injected Replit development domains are ignored at that
boundary. `PUBLIC_APP_ORIGIN` must be that exact same canonical origin, and
production `BASE_PATH` must be absent, empty, or exactly `/`; any mounted path
blocks startup. Development may retain its documented multi-origin and mounted-
preview convenience.

Do not call an environment production-like until its service map, migration
revision, health probes, auth guard, legal resources, and monitoring signals are
recorded. Environment creation, credentials, paid services, and alert routing
remain owner-controlled actions.

The current API limiter uses process-local memory and is not globally enforced
across replicas or restarts. Production startup rejects a missing or invalid
`API_MAX_INSTANCES`, and rejects values above one as
`SHARED_RATE_LIMIT_STORE`. This launch-only control is valid only when the
release record proves the provider maximum is actually one and records the
edge/abuse controls that cover a restart reset. Do not set the variable to `1`
while leaving the provider able to scale higher. Multi-replica release requires
an implemented, tested shared limiter store; no placeholder backend name counts.

The account-deletion retry scheduler is also process-local. The provider must
keep at least one API machine running continuously; an autoscale service that
can reach zero is not launch-safe even if its maximum is one. Record direct
control-plane evidence of both the always-on minimum and the one-machine
maximum. A process environment value, health-check ping, or informal traffic
assumption is not proof of either setting. A scale-to-zero launch requires an
implemented, durable managed scheduler or queue first.

## 1. Open the release record

1. Create the repository-local evidence directory with
   `mkdir -p release-evidence`. For an App Store candidate, copy
   `RELEASE_EVIDENCE_MANIFEST_TEMPLATE.md` to two distinct, uniquely named
   files, one for `app_review` and one for `public_release`. Recommended names:
   `release-evidence/<release-id>-app-review-<UTC>.md` and
   `release-evidence/<release-id>-public-release-<UTC>.md`.
2. Before the remote build number and Apple IDs exist, set both to `DRAFT` with
   the same release ID, their explicit target, release lead, and UTC creation
   time. Leave build, EAS, and App Store Connect identity placeholders to be
   resolved after the remote build; never guess them. Record the candidate Git
   commit and clean-worktree result separately. A non-App-Store target uses one
   uniquely named draft.
3. Link the approved scope and every issue included in the candidate.
4. Record the exact environment aliases and provider deployment commands that
   the authorized owner will use. Do not leave a deploy command to improvisation
   during the release window.
5. Record the previous known-good combined application deployment, the exact
   BUILD_SHA-derived database-migration tuple, its approved recovery point, and
   the previous mobile build. If any required identity is unknown, rollback is
   not ready.

## 2. Local and CI preflight

From the repository root on the candidate commit:

```sh
git status --porcelain
git rev-parse HEAD
node --test ops/scripts/secret-boundary-scan.test.mjs
node ops/scripts/secret-boundary-scan.mjs tracked
pnpm install --frozen-lockfile
pnpm audit --audit-level high
pnpm run codegen:check
pnpm run typecheck
pnpm run test
pnpm run validate:app-store
pnpm run dry-run:production
PUBLIC_APP_ORIGIN=<PUBLIC_ORIGIN> LEGAL_SITE_PUBLICATION_STATUS=<draft-or-approved> pnpm --filter @workspace/cut-os run build
pnpm --filter @workspace/db run generate
git diff --exit-code -- lib/db/migrations
git status --porcelain --untracked-files=all -- lib/db/migrations
pnpm --filter @workspace/cut-os exec expo install --check
pnpm --filter @workspace/cut-os exec expo-doctor
pnpm --filter @workspace/cut-os run validate:legal-site
```

The first command and the migration-scoped status command must print nothing.
The diff command and both secret-boundary commands must pass. The tracked scan
uses Git's tracked-file list, reports rule names and byte offsets only, and
never prints a matched value. It supplements provider secret scanning; it does
not prove that a credential pasted into an external dashboard, chat, log, or
untracked file is safe. Together the migration checks catch both modified and
newly generated untracked migration files. The working App Store validator
keeps the draft metadata, privacy mapping, authentication-security gate,
screenshot plan, and app configuration in sync; it is not the post-capture
release approval. Record the CI run URL and result for the exact commit. Do not
copy CI logs that may contain environment values into the manifest.

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
- a successful restore drill no more than 90 days before manifest finalization,
  with its UTC timestamp and result;
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
3. Deploy the combined application candidate using the recorded provider
   command. Its one listener owns the public, legal, status, Clerk proxy, and
   `/api` routes. Allow its startup migration gate to run once; do not launch a
   concurrent manual migration or a separate public-site service.
4. Confirm the deployed database's newest migration matches the candidate's
   `EXPECTED_MIGRATION` tag, timestamp, and SHA-256 from
   `artifacts/api-server/src/lib/readiness.ts`.
5. Run the read-only smoke checks below using public origins without query
   strings, credentials, or fragments. Staging and production origins must use
   HTTPS. The verifier's local-HTTP escape hatch is only for loopback developer
   tests, requires the explicit `--allow-local-http` flag, and must never appear
   in release evidence:

```sh
pnpm run verify:deploy -- <STAGING_APP_ORIGIN>/api/healthz json-health
pnpm run verify:deploy -- <STAGING_APP_ORIGIN>/api/readyz json-readiness
pnpm run verify:deploy -- <STAGING_APP_ORIGIN>/api/me auth-guard
pnpm run verify:deploy -- <STAGING_APP_ORIGIN>/status json-readiness
pnpm run verify:deploy -- <STAGING_APP_ORIGIN>/ cut-public-root
```

The `cut-public-root` check requires the CUT production marker, exact canonical
URL, no executable JavaScript, a `script-src 'none'` CSP, no Expo Go copy or
deep link, and `404` responses from origin-absolute and mounted
`/manifest`, `/ios/manifest.json`, and `/android/manifest.json` paths. The
automated server contract protects this boundary; the live check proves the
deployed process is actually using production mode.

The Replit production build creates the one combined API/public application
artifact and packages the exact launch/legal templates beside it. The
non-billable `pnpm run dry-run:production` check runs the built production-only
configuration gates and a real ephemeral loopback listener without contacting
Clerk, RevenueCat, PostgreSQL, or Replit Publishing. Production must not start
Metro or generate an Expo `static-build`; `build:preview` is development-only,
and every preview manifest route remains unavailable in production.

6. With the approved staging legal URLs supplied through the normal environment
   mechanism, run:

```sh
pnpm --filter @workspace/cut-os run validate:legal-site:live
```

7. Use test accounts and non-production purchase configuration to complete the
   native QA, poor-network, adult-eligibility, deletion, purchase, restore,
   relaunch, shared-device, and accessibility scripts in `QA_REPORT.md` and
   `PURCHASE_QA_REPORT.md`.
8. Record provider-console evidence that staging and production each keep an
   always-on minimum of one API machine and are capped at one API machine. On
   staging, use two genuinely distinct external client connections; do not
   spoof `X-Forwarded-For`. Prove client A receives `429` at the configured
   threshold while client B retains its own allowance. Then perform one
   authorized API restart, record that the process-local counter resets as
   expected, and prove the limiter re-engages at the threshold after restart.
   Record the provider edge/abuse control that covers this reset gap. A missing
   provider cap, shared client bucket, non-reengaging limiter, or absent edge
   control blocks release.
9. Observe staging for the predeclared window and compare error rate, latency,
   readiness, database pool behavior, provider failures, and worker health with
   the approved staging baseline. Fill the actual baseline and acceptable
   variance in the manifest; this repository intentionally invents neither.
10. Record results and sanitized evidence. Any failed check returns the candidate
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
- the parent listing approval plus all six evidence-backed listing confirmations:
  name clearance, exact-name acceptance, owner, legal, nutrition, and
  exact-build claims identity;
- the parent Apple commerce readiness decision plus confirmed Developer Program
  membership, Account Holder access, Paid Apps Agreement, tax forms, and
  banking evidence;
- production application, database, Clerk, RevenueCat, EAS, and Apple service
  aliases;
- direct, sanitized RevenueCat-dashboard evidence that the exact iOS app has
  its production mapping, App Store Connect API key, Apple in-app
  purchase/subscription key, server-key customer read/write permission, and
  transfer-to-new-App-User-ID restore behavior configured, paired after upload
  with restore-after-deletion, StoreKit, and purchase QA on the exact submitted
  build as defined in `EAS_RELEASE_RUNBOOK.md`;
- the Clerk production instance/domain aliases, non-secret domain ID, exact
  canonical proxy URL, candidate application deployment/Git SHA, audited edge
  trust topology, provider proof that no direct or shorter origin path bypasses the
  edge, exact XFF/XFH overwrite-or-rightmost-append semantics, adversarial
  spoof/missing-XFF regression results, and the planned proxy-activation
  verifier command from `EAS_RELEASE_RUNBOOK.md`;
- database recovery evidence and rollback matrix;
- monitoring owners, destinations, baselines, thresholds, and observation
  window;
- provider-console proof of an always-on one-machine API minimum and maximum,
  the exact `API_MAX_INSTANCES=1` startup setting, staging restart behavior,
  two-distinct-client isolation, and an approved edge control for the restart
  reset gap;
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
The EAS-upload approval may be not applicable only for a staging target where no
upload occurs. Internal TestFlight, App Review, and public-release targets must
carry an attributable `APPROVED` upload decision even when the upload uses free
quota.

## 6. Production deployment and smoke

Use the provider commands recorded and approved in the manifest; the repository
does not guess a hosting command.

1. Announce the change window to the recorded monitoring/incident owner.
2. Confirm the recovery evidence is still current and record the final pre-deploy
   backup/PITR timestamp.
3. Deploy the one combined application candidate. Do not deploy a second
   public/legal process or origin. If the provider supports a no-traffic
   revision or canary, verify it before promotion; otherwise record that
   capability as unavailable rather than pretending a canary occurred.
4. Reconfirm from the provider control plane that the API minimum and maximum
   are both still one and that the running revision has
   `API_MAX_INSTANCES=1`; a value in the process environment is not evidence of
   either provider setting.
5. Watch startup logs for the sanitized migration failure codes listed below.
   Confirm `/api/readyz` succeeds before routing normal traffic.
6. Run the same liveness, readiness, auth-guard, status, and production-surface
   commands used in staging, substituting the one production application
   origin for every route.
7. Complete the fail-closed Clerk production proxy activation gate in
   `EAS_RELEASE_RUNBOOK.md`: enable only the exact deployed canonical URL in the
   production Clerk domain, run the bounded `clerk-proxy-health` check, and
   record the non-secret fields and sanitized pass/fail evidence. The gate must
   also prove there is no direct or shorter origin path around the edge, both
   forwarded headers have the documented edge-owned rightmost semantics,
   spoofed leftmost values cannot win, and missing XFF is omitted so proxy
   health fails closed. Stop on any dashboard mismatch, redirect,
   unhealthy/incomplete body, timeout, ingress bypass, topology mismatch, or
   missing evidence. This provider configuration is production-only and is not
   a staging check.
8. From two approved, genuinely distinct external client connections, perform
   the bounded live limiter isolation check recorded in the manifest. Never use
   a client-supplied forwarding header as evidence of a distinct client.
9. Confirm the same application revision is running the exact
   counsel-approved, hash-bound legal templates with
   `LEGAL_SITE_PUBLICATION_STATUS=approved`; do not copy or publish them through
   a separate static service. Run the live legal verifier, the public `/status`
   readiness check, and the production-surface check on that same origin:

   ```sh
   pnpm run verify:deploy -- <PRODUCTION_APP_ORIGIN>/ cut-public-root
   ```

10. Exercise one controlled, non-review production smoke account from its
    already trusted device without recording credentials or health/nutrition
    response data. Do not use any reserved App Review identity before the
    authorized test-mode window begins.
11. Record owner/security approval for the bounded Clerk App Review access plan.
    Keep production test mode disabled at this stage; the review window and its
    new-device proof cannot begin until the exact internal TestFlight build
    exists. Never add a runtime bypass or Testing Token.
12. Execute the approved password-recovery enumeration battery against the exact
    production Clerk tenant. Record only the non-secret tenant alias and sanitized
    evidence references for generic response parity, response-envelope parity,
    timing parity, rate-limit behavior, provider failures, and safe abuse logging.
    Never record tested email identifiers, reset codes, passwords, response
    bodies, or identifier-linked raw timings.
13. Observe every agreed signal for the predeclared production window. Record the
    actual readings or linked dashboards, not screenshots containing personal
    data.
14. Only after the observation gate passes may the owner authorize the production
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
| Legal/support       | Public legal or support resource unavailable, redirected, draft, or hash-mismatched                                                                   | Stop submission/promotion; restore an approved compatible application revision      |
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
| Candidate has not migrated production                                          | Route no traffic to it; redeploy the previous known-good combined application revision                                                                                                                                       |
| Migration failed before a committed change                                     | Keep candidate out of service; prove database state and use the previous revision only if exact-schema readiness passes                                                                                                      |
| Additive migration completed and compatibility with the prior app is proven    | Re-route to the recorded previous application revision, then verify public/legal/health/readiness/auth and data integrity                                                                                                    |
| State-changing or destructive migration completed, or compatibility is unknown | Do **not** roll back only the application. Stop promotion/traffic or writes as the incident requires, then roll forward with a corrected compatible app or execute the tested coordinated database snapshot plus app restore |
| Combined application's legal surface failed                                    | Stop promotion; use the application/database compatibility matrix before restoring a previous approved application revision, then rerun live legal/hash verification                                                         |
| Internal TestFlight build failed                                               | Stop distribution to additional testers, notify the test owner, fix, increment the build number, and upload a new build; an installed build is not remotely replaced                                                         |
| App Review submission is pending                                               | Owner decides whether to remove/hold the submission in App Store Connect; record the action                                                                                                                                  |
| Public App Store binary is faulty                                              | Owner stops phased/manual promotion where available and prepares an expedited corrected version; a server rollback must still obey database compatibility                                                                    |

After any rollback or roll-forward:

1. Rerun liveness, readiness, auth-guard, static status, `cut-public-root`, and
   live legal checks.
2. Verify database revision and critical write/read behavior with non-sensitive
   evidence.
3. Continue monitoring for the incident observation window chosen by the owner.
4. Create an incident record and a new release manifest for the corrected
   candidate. Never rewrite a finalized manifest to make a failed release appear
   successful.

## TestFlight and App Review handoff

The owner authorizes all Apple actions. Engineering may prepare the evidence:

1. Confirm the App Store Connect app exists, pin its numeric Apple ID at
   `submit.production.ios.ascAppId`, and run
   `node ops/scripts/eas-submit-config-verify.mjs`. Review and commit that exact
   routing change before any signed production build. Require a clean work
   tree, cross-check the numeric ID to bundle ID `com.zarifahmed.cut`, and
   record the full Git SHA as `BUILD_SHA`. A placeholder, guessed value, or
   interactive routing choice is prohibited.
2. Run the production environment and release preflights from that clean exact
   commit. Build it with the production profile only after every preflight
   succeeds. No tracked-file change is allowed before the EAS upload.
3. Record the exact Git SHA, EAS build ID/URL, app version, Apple build number,
   Xcode image, archive checksum, privacy report reference, export-compliance
   evidence, and backend deployment/migration identifiers. The Git SHA in the
   build record must equal the routing-lock SHA.
4. Before upload, check out the same clean `BUILD_SHA`, rerun
   `node ops/scripts/eas-submit-config-verify.mjs`, and stop if `HEAD`, the
   recorded build SHA, or the routing-lock SHA differs. After the owner
   authorizes the exact EAS build ID and upload, run only the
   deterministic command from `EAS_RELEASE_RUNBOOK.md`: production profile,
   explicit `--id`, `--non-interactive`, and `--wait`. Do not use `--latest`,
   `--auto-submit`, a bare submit command, or prompts. Record the command,
   authorization, `BUILD_SHA`, numeric App Store app ID cross-check, and result
   without Apple credentials. This EAS action only uploads the binary to App
   Store Connect; it does not submit it for App Review or release it publicly.
5. Upload to internal TestFlight first, then assign only the owner-approved
   internal group and tester owner. Complete
   `app-store/testflight-submission.json` with the exact build, feedback email,
   group, QA references, and approvals. Internal-only testing is not external
   TestFlight App Review approval; if external testers are selected, finish its
   review contact, demo access, and notes fields before submitting that build.
6. On the internal TestFlight build, confirm production sign-in, session refresh,
   sign-out, and recovery traverse the enabled proxy on a physical device. Record
   only pass/fail, build/device/OS class, UTC, and sanitized evidence; never the
   echoed IP, account identifier, cookie, code, response body, or raw log.
7. Apply the owner/security-approved Clerk App Review window only now: enable
   production test mode, retain Client Trust, and use only the five reserved
   synthetic accounts. From a new physical device running this exact internal
   TestFlight build, prove that `424242` completes the Client Trust email-code
   challenge without delivery. Record only aliases, build/device/OS class, UTC,
   result, and a controlled non-secret evidence reference. Stop on any mismatch.
8. Execute the fixed matrices in `PURCHASE_QA_REPORT.md`, `QA_REPORT.md`, and
   `APP_REVIEW_RUNBOOK.md` on the exact build. Record device model/OS, result,
   timestamp, and tester name or approved alias without device IDs in the
   per-release manifest or controlled references; do not edit these shared
   procedures after `BUILD_SHA`.
9. Confirm `authenticationSecurity` in
   `app-store/app-store-submission.json` names the selected Clerk-supported
   recovery architecture, links every required production-tenant evidence item,
   and has all four attributable approvals. A generic client message alone does
   not satisfy this gate.
10. In App Store Connect, select the exact processed build, choose **Manually
    release this version**, and save every required metadata, privacy, age,
    accessibility, and App Review field. Record only controlled non-secret
    confirmations and stop on any build mismatch.
11. With recorded owner authorization, use **Add for Review** on the app version
    to create or select one submission in **Drafts**. On the first subscription,
    choose **Add for Review**, select that existing draft, and add the unapproved
    subscription group in the submission modal. Verify the exact app version,
    subscription, and group appear together and the app version is **Ready for
    Review**. Do not use **Submit for Review** yet.
12. After the exact-build screenshots are captured, selected, SHA-256 bound,
    reviewed for personal data, the listing exact-build claims review is bound to
    the same TestFlight identity, and every owner-controlled commercial/legal,
    metadata, privacy, full age-questionnaire, App Review account, subscription,
    accessibility, and security field is evidenced and approved, remeasure the
    resolved App Review Notes below 4,000 UTF-8 bytes. Complete the manifest's
    canonical `CUT_OS_RELEASE_CONTROL_V2` JSON block without changing its keys or
    fixed control IDs. This JSON is the sole editable release record; do not add
    parallel human-readable outcome or approval tables. It must bind the
    TestFlight build identities and contain
    passing automated, safety, recovery, smoke, monitoring/alert-test, and
    post-action evidence plus attributable approvals. Resolve every Markdown
    placeholder and required checkbox. In
    `appReview.clerkReviewAccess.shutdownControl`, freeze distinct primary and
    backup owners, prove both have production Clerk access, select
    `exact_app_store_connect_submission` as the status source, enable monitoring
    and escalation, retain the 15-minute SLO, and record a fresh access preflight
    UTC/evidence reference. Keep the trigger, disablement, and closure-evidence
    fields null. Finalize the pre-created App Review
    manifest with target `app_review` and generate its adjacent checksum, then
    commit those with only the existing App Store evidence JSON updates and
    newly added, manifest-referenced `100644` PNGs. Leave the distinct
    pre-created public-release draft byte-identical. This single direct child of
    `BUILD_SHA` is `APP_REVIEW_EVIDENCE_SHA`; captured files must never be
    symlinks. From its clean checkout run:

```sh
pnpm run validate:app-store:release
```

The authoritative target at this commit is `app_review`; the command rejects
`staging` and `internal_testflight`. The general
`pnpm run verify:post-build-evidence` command remains available for
non-App-Store evidence boundaries. Never use a staging target to carry an
upload N/A decision into the App Store gate.

The gate derives `BUILD_SHA` from the committed TestFlight record and accepts
no command-line Git ref. Record `APP_REVIEW_EVIDENCE_SHA` and the result
outside the finalized manifest. The integrated boundary proves
the exact direct-parent relationship, a clean tree, operation/mode-constrained
evidence files, manifest-bound regular PNGs, the release-manifest checksum
and canonical content, required sections and checked controls, complete
passing release evidence, exact TestFlight/deployment identity bindings,
byte-identical `eas.json`, `cli.requireCommit: true`, TestFlight `BUILD_SHA`,
and pinned `ascAppId`. Any runtime, config, dependency, lockfile, migration,
workflow, script, or shared-procedure change requires a new `BUILD_SHA`,
repeated preflights, signed build, and upload.

UTC evidence timestamps may use whole or fractional seconds with `Z`. Except
for the restore-drill timestamp, each must fall between record creation and
finalization. Finalization may not be future-dated, and the restore drill must
be no more than 90 days old at finalization.

CI validates a pull request's exact head in the dedicated **Release evidence
boundary** job because GitHub's synthetic pull-request merge commit is not the
evidence commit. Before signing `BUILD_SHA`, fetch `main`, prove the fetched tip
is an ancestor of the candidate, record that tip externally, and verify branch
protection permits an owner-approved, exact-SHA, non-force fast-forward. Make
**Release evidence boundary** a required status check. Rebase only before
establishing `BUILD_SHA`. If protection blocks that path, stop; only the owner
may authorize a narrowly scoped temporary bypass, and it must be restored after
the exact SHA lands. A merge-button workaround is prohibited.

After signing, preserve the exact
`BUILD_SHA -> APP_REVIEW_EVIDENCE_SHA -> PUBLIC_RELEASE_EVIDENCE_SHA` chain.
Pass exact-head pull-request CI on `APP_REVIEW_EVIDENCE_SHA`, then fast-forward
`main` to that exact SHA without `--force`; do not use GitHub merge-commit,
squash, rebase-and-merge, or merge-queue paths. Wait for push-to-`main` CI and
prove remote `main` equals `APP_REVIEW_EVIDENCE_SHA`. Re-run the current-clock
validator and production probes before the owner may authorize **Submit for
Review**.

Freeze `main` at `APP_REVIEW_EVIDENCE_SHA` throughout review. An unrelated
advance means stop or withdraw, disable Clerk production test mode, and create a
new signed candidate. After approval, create `PUBLIC_RELEASE_EVIDENCE_SHA`
directly on the App Review evidence commit, pass exact-head pull-request CI,
fast-forward `main` from the exact App Review SHA to the exact public-release
SHA, wait for push-to-`main` CI, and prove remote `main` equals the public-release
SHA. Re-run the current-clock validator and production probes before separate
authorization for **Release This Version**. Any force push, amend, intervening
commit, or rewritten SHA requires a new candidate.

13. Re-run the integrated release validator and production probes, including
    `clerk-proxy-health`, immediately before handoff to App Review. The owner must
    use **Submit for Review** within 24 hours of every bounded Clerk, review-
    account, and Apple-workflow timestamp; stale immutable evidence requires a
    new signed candidate.
14. Owner records the Submit for App Review decision in the external handoff,
    confirms the just-run gate still passes, then uses **Submit for Review** on
    the verified draft. Draft assembly, submission, and manual public release
    are separate approvals.
15. After submission, keep production test mode enabled only while the
    authorized submission is awaiting or undergoing review, with authentication
    and reserved-account monitoring active. The release lead owns the App Store
    Connect status watch, the security owner is backup, and the maximum closure
    response is 15 minutes. Disable immediately when the exact submission leaves
    its authorized states, including Accepted, Pending Developer Release,
    Rejected, Unresolved Issues, Invalid Binary, withdrawal, removal, or
    abandonment, or on unexpected reserved-account activity.
    The `app_review` record must already freeze the two owners, their production
    access preflight, exact-submission status source, monitoring, escalation,
    15-minute SLO, and keep the three closure fields null.
    A rejection or resubmission requires a new signed candidate, fresh
    manifests, and a newly authorized review window.
16. If Apple approves the version configured for manual release, verify
    **Pending Developer Release**, unchanged exact-build identity, healthy production probes, Clerk
    production test mode off, and Client Trust on. Preserve the historical App
    Review account attestations. In `app-store/app-store-submission.json`, the
    public transition may advance only root `updated`; Clerk `testModeState`,
    `verifiedAtUtc`, and `evidenceReference`; shutdown `triggerObservedAtUtc`,
    `testModeDisabledAtUtc`, and `shutdownEvidenceReference`; and Apple `state`,
    `appVersionStatus`, `submissionSection`, `allSubmittedItemsAccepted`,
    `verifiedAtUtc`, and `evidenceReference`. The shutdown trigger must be after
    App Review evidence finalization, disablement must follow within 15 minutes,
    and its evidence reference must differ from the access preflight. Preserve
    all other submission fields, including the owners/access plan, Apple
    submission reference, included-item flags, manual-release choice, and
    inactive-review flag. Finalize the distinct pre-created
    `public_release` manifest with the same release ID/build, add its checksum,
    and commit only those changes as the direct child of
    `APP_REVIEW_EVIDENCE_SHA`. From clean `PUBLIC_RELEASE_EVIDENCE_SHA`, rerun
    `pnpm run validate:app-store:release` immediately before the release action.
    Only after it passes may the owner separately authorize **Release This
    Version** and confirm the dialog within 24 hours of the Clerk and Apple
    closure evidence. Stale immutable evidence requires a new candidate.
17. Never amend either finalized evidence manifest or checksum. A correction,
    missing draft, changed runtime/build fact, broken ancestry, or third
    evidence commit requires a new signed candidate.

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
