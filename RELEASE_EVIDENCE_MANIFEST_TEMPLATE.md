# CUT OS — release evidence manifest

> Template: copy this file for one release candidate. Do not put secrets,
> credentials, DSNs, customer/tester identifiers, health/nutrition data, request
> or response bodies, or raw environment/log output in this record.

## Manifest control

- Manifest status: `DRAFT` / `FINAL`
- Release ID: `<unique release ID>`
- Target: `staging` / `internal TestFlight` / `App Review` / `public release`
- Created at (UTC): `<ISO-8601>`
- Finalized at (UTC): `<ISO-8601 or N/A while draft>`
- Release lead: `<name or approved role alias>`
- Business owner: `<name>`
- Supersedes manifest: `<path + SHA-256, or N/A>`
- Scope/issues: `<links or identifiers>`

Finalization rules:

1. Resolve every angle-bracket placeholder. Use `N/A — <reason> — <approver>`
   only when the item genuinely does not apply.
2. Set status to `FINAL`, set the UTC finalization time, and commit this manifest
   with the release evidence.
3. Compute a detached checksum without modifying the finalized file:

   ```sh
   shasum -a 256 <manifest-path> > <manifest-path>.sha256
   ```

4. Commit the `.sha256` file. Record that commit outside this file in the release
   handoff or ticket, because adding it here would invalidate the manifest hash.
5. Never amend a finalized manifest. A correction is a new manifest with a new
   release ID that names and checksums the superseded record.

## Candidate identity

- [ ] Git worktree was clean before build.
- Git commit SHA: `<40-character SHA>`
- Git branch/tag: `<reference>`
- Previous known-good Git SHA: `<SHA>`
- App marketing version: `<version>`
- Apple build number: `<build number>`
- API artifact checksum: `<SHA-256 or evidence link>`
- Candidate release notes: `<non-sensitive summary/link>`

## Automated gates

| Gate                              | Result        | UTC timestamp | Evidence reference |
| --------------------------------- | ------------- | ------------- | ------------------ |
| Frozen install                    | `<PASS/FAIL>` | `<UTC>`       | `<CI step/link>`   |
| High-severity dependency audit    | `<PASS/FAIL>` | `<UTC>`       | `<CI step/link>`   |
| Code-generation drift             | `<PASS/FAIL>` | `<UTC>`       | `<CI step/link>`   |
| Typecheck                         | `<PASS/FAIL>` | `<UTC>`       | `<CI step/link>`   |
| Release-operations tests          | `<PASS/FAIL>` | `<UTC>`       | `<CI step/link>`   |
| Repository tests                  | `<PASS/FAIL>` | `<UTC>`       | `<CI step/link>`   |
| Working App Store artifact check  | `<PASS/FAIL>` | `<UTC>`       | `<CI step/link>`   |
| Production API build              | `<PASS/FAIL>` | `<UTC>`       | `<CI step/link>`   |
| Database generation drift         | `<PASS/FAIL>` | `<UTC>`       | `<CI step/link>`   |
| Expo install check/doctor         | `<PASS/FAIL>` | `<UTC>`       | `<CI step/link>`   |
| Draft legal hosting fail-closed   | `<PASS/FAIL>` | `<UTC>`       | `<CI step/link>`   |
| Production release-config fixture | `<PASS/FAIL>` | `<UTC>`       | `<CI step/link>`   |
| Production iOS export fixture     | `<PASS/FAIL>` | `<UTC>`       | `<CI step/link>`   |

- Exact-commit CI run: `<URL>`
- CI conclusion: `<PASS/FAIL>`
- Unresolved critical/high findings: `<none or references>`

## Approval gates

Approval means an explicit, attributable decision. It does not mean “informed.”

| Gate                                | Decision                 | Approver                      | UTC timestamp | Evidence reference |
| ----------------------------------- | ------------------------ | ----------------------------- | ------------- | ------------------ |
| Paid deployment/build authorization | `<APPROVED/BLOCKED/N/A>` | `<owner>`                     | `<UTC>`       | `<reference>`      |
| Apple seller/legal operator         | `<APPROVED/BLOCKED>`     | `<owner + counsel>`           | `<UTC>`       | `<reference>`      |
| Public legal/support publication    | `<APPROVED/BLOCKED>`     | `<owner + counsel>`           | `<UTC>`       | `<reference>`      |
| Privacy/data map/App Privacy        | `<APPROVED/BLOCKED>`     | `<privacy reviewer + owner>`  | `<UTC>`       | `<reference>`      |
| Health/nutrition content            | `<APPROVED/BLOCKED>`     | `<qualified reviewer>`        | `<UTC>`       | `<reference>`      |
| 18+ age-rating answers/override     | `<APPROVED/BLOCKED>`     | `<owner>`                     | `<UTC>`       | `<reference>`      |
| Initial territories/availability    | `<APPROVED/BLOCKED>`     | `<owner>`                     | `<UTC>`       | `<reference>`      |
| Regional medical-device declaration | `<APPROVED/BLOCKED/N/A>` | `<owner + qualified review>`  | `<UTC>`       | `<reference>`      |
| Authentication recovery security    | `<APPROVED/BLOCKED>`     | `<security reviewer + owner>` | `<UTC>`       | `<reference>`      |
| Subscription product/price/trial    | `<APPROVED/BLOCKED>`     | `<owner>`                     | `<UTC>`       | `<reference>`      |
| Export compliance                   | `<APPROVED/BLOCKED>`     | `<owner/reviewer>`            | `<UTC>`       | `<reference>`      |
| Submit for App Review               | `<APPROVED/BLOCKED/N/A>` | `<owner>`                     | `<UTC>`       | `<reference>`      |
| Manual public release               | `<APPROVED/BLOCKED/N/A>` | `<owner>`                     | `<UTC>`       | `<reference>`      |

## Environment identity — non-secret aliases only

| Component                    | Staging identity     | Production identity               | Verified by/at |
| ---------------------------- | -------------------- | --------------------------------- | -------------- |
| API public origin            | `<HTTPS origin>`     | `<HTTPS origin>`                  | `<name, UTC>`  |
| API provider project/service | `<alias>`            | `<alias>`                         | `<name, UTC>`  |
| Public/legal origin          | `<HTTPS origin>`     | `<HTTPS origin>`                  | `<name, UTC>`  |
| Database provider/project    | `<alias, never DSN>` | `<alias, never DSN>`              | `<name, UTC>`  |
| Clerk instance               | `<test alias>`       | `<production alias>`              | `<name, UTC>`  |
| RevenueCat project           | `<test alias>`       | `<production alias>`              | `<name, UTC>`  |
| Apple app/bundle ID          | `<N/A>`              | `<non-secret app ID / bundle ID>` | `<name, UTC>`  |
| EAS project/profile          | `<internal profile>` | `<production profile>`            | `<name, UTC>`  |

- Authorized staging deploy command/reference: `<command or controlled runbook link>`
- Authorized production deploy command/reference: `<command or controlled runbook link>`
- Production service-set cross-check result: `<PASS/FAIL>`

## Authentication recovery security

Do not include tested email identifiers, reset codes, passwords, response
bodies, provider credentials, or identifier-linked raw timing samples.

- Prelaunch gate source: `artifacts/cut-os/AUTH_SECURITY_PRELAUNCH.md`
- Selected recovery architecture:
  `<clerk_hosted_or_prebuilt_recovery / clerk_supported_server_or_proxy_recovery>`
- Clerk support evidence reference: `<controlled non-secret reference>`
- Exact implementation evidence reference: `<commit/build/config reference>`
- Production Clerk tenant alias: `<non-secret alias>`
- Production-tenant test time (UTC): `<UTC>`

| Required production-tenant evidence        | Result        | Evidence reference                  |
| ------------------------------------------ | ------------- | ----------------------------------- |
| Same generic public response               | `<PASS/FAIL>` | `<sanitized aggregate/reference>`   |
| Accepted/rejected response-envelope parity | `<PASS/FAIL>` | `<sanitized aggregate/reference>`   |
| Accepted/rejected timing parity            | `<PASS/FAIL>` | `<sanitized aggregate/reference>`   |
| Enumeration-resistant rate-limit behavior  | `<PASS/FAIL>` | `<sanitized aggregate/reference>`   |
| Provider-failure behavior                  | `<PASS/FAIL>` | `<sanitized aggregate/reference>`   |
| Abuse logging excludes codes/passwords     | `<PASS/FAIL>` | `<sanitized config/test reference>` |

- App Store artifact authentication-security status: `<approved_for_release/BLOCKED>`
- Owner approval: `<APPROVED/BLOCKED, name, UTC, reference>`
- Security reviewer approval: `<APPROVED/BLOCKED, name, UTC, reference>`
- Clerk-support verification: `<PASS/FAIL, name, UTC, reference>`
- Production-tenant evidence verification: `<PASS/FAIL, name, UTC, reference>`

## Database migration and recovery

- Migration change class: `none` / `additive-compatible` /
  `state-changing` / `destructive-incompatible`
- Expected latest migration tag: `<from readiness.ts>`
- Expected migration created-at value: `<from readiness.ts>`
- Expected migration SHA-256: `<from readiness.ts>`
- Previous production migration: `<tag/timestamp/hash>`
- Previous API compatible after migration: `<YES/NO/UNKNOWN + evidence>`
- Migration rehearsal result: `<PASS/FAIL + evidence>`
- Production migration start/end (UTC): `<timestamps or N/A>`
- Production migration result: `<PASS/FAIL/NOT RUN>`

Recovery evidence:

- Database recovery owner: `<name/role>`
- Backup/PITR mechanism: `<provider feature, no credentials>`
- Final pre-deploy coverage timestamp (UTC): `<UTC>`
- Backup/snapshot evidence reference: `<non-secret provider reference>`
- Last successful restore drill (UTC): `<UTC>`
- Restore-drill evidence: `<reference>`
- Owner-approved RPO: `<value + approver/reference>`
- Owner-approved RTO: `<value + approver/reference>`
- Roll-forward candidate/procedure: `<reference>`
- Coordinated application + database restore procedure: `<reference>`
- Recovery authorization contact: `<name/role>`
- [ ] No concurrent manual migration will run during API startup migration.
- [ ] Previous API rollback is forbidden unless schema compatibility is proven.

## Deployment identity and provenance

| Artifact                         | Identifier            | URL/reference       | SHA-256 if available |
| -------------------------------- | --------------------- | ------------------- | -------------------- |
| Staging API revision             | `<deployment ID>`     | `<provider link>`   | `<hash/N/A>`         |
| Production API revision          | `<deployment ID>`     | `<provider link>`   | `<hash/N/A>`         |
| Previous production API          | `<deployment ID>`     | `<provider link>`   | `<hash/N/A>`         |
| Public/legal deployment          | `<deployment ID>`     | `<provider link>`   | `<hash/N/A>`         |
| Previous public/legal deployment | `<deployment ID>`     | `<provider link>`   | `<hash/N/A>`         |
| EAS build                        | `<build ID>`          | `<EAS link>`        | `<hash/N/A>`         |
| iOS archive                      | `<archive reference>` | `<controlled link>` | `<SHA-256>`          |
| Archive privacy report           | `<report reference>`  | `<controlled link>` | `<SHA-256>`          |

- EAS profile: `<profile>`
- EAS CLI version: `<version>`
- Node/pnpm versions: `<versions>`
- Xcode build image: `<image>`
- Generated minimum iOS version: `<version>`
- `ITSAppUsesNonExemptEncryption` decision/evidence: `<result/reference>`
- Arbitrary network loads disabled: `<PASS/FAIL + evidence>`

## Approved legal publication

- Legal approval record reference: `<reference>`
- Approval scope: `<scope>`
- Counsel approver and approval time: `<name, UTC>`
- Rendering app name/base path: `<values>`
- Privacy resource SHA-256: `<hash>`
- Terms resource SHA-256: `<hash>`
- Support resource SHA-256: `<hash>`
- Stylesheet SHA-256: `<hash>`
- Production Privacy URL: `<public URL without query/fragment>`
- Production Terms URL: `<public URL without query/fragment>`
- Production Support URL: `<public URL without query/fragment>`
- Exact live verifier result/time: `<PASS/FAIL, UTC, evidence>`

## Staging smoke and QA

| Check                                  | Result        | UTC timestamp | Evidence reference               |
| -------------------------------------- | ------------- | ------------- | -------------------------------- |
| API `/api/healthz` `json-health`       | `<PASS/FAIL>` | `<UTC>`       | `<sanitized output/link>`        |
| API `/api/readyz` `json-readiness`     | `<PASS/FAIL>` | `<UTC>`       | `<sanitized output/link>`        |
| Unauthenticated `/api/me` `auth-guard` | `<PASS/FAIL>` | `<UTC>`       | `<sanitized output/link>`        |
| Public `/status` `json-readiness`      | `<PASS/FAIL>` | `<UTC>`       | `<sanitized output/link>`        |
| Exact live legal verification          | `<PASS/FAIL>` | `<UTC>`       | `<sanitized output/link>`        |
| Native critical QA                     | `<PASS/FAIL>` | `<UTC>`       | `<QA_REPORT reference>`          |
| Sandbox purchase/restore               | `<PASS/FAIL>` | `<UTC>`       | `<PURCHASE_QA_REPORT reference>` |
| Account deletion/vendor deletion       | `<PASS/FAIL>` | `<UTC>`       | `<sanitized reference>`          |
| Poor-network/relaunch/shared-device    | `<PASS/FAIL>` | `<UTC>`       | `<QA_REPORT reference>`          |
| VoiceOver/accessibility                | `<PASS/FAIL>` | `<UTC>`       | `<QA_REPORT reference>`          |

- Staging baseline period: `<start/end UTC>`
- Staging observation window: `<approved duration/reference>`
- Baseline summary/dashboard: `<reference>`
- Accepted variance and approver: `<values/reference>`
- Unresolved staging failures: `<none or blockers>`

## Production smoke

| Check                                   | Result        | UTC timestamp | Evidence reference        |
| --------------------------------------- | ------------- | ------------- | ------------------------- |
| API `/api/healthz` `json-health`        | `<PASS/FAIL>` | `<UTC>`       | `<sanitized output/link>` |
| API `/api/readyz` `json-readiness`      | `<PASS/FAIL>` | `<UTC>`       | `<sanitized output/link>` |
| Unauthenticated `/api/me` `auth-guard`  | `<PASS/FAIL>` | `<UTC>`       | `<sanitized output/link>` |
| Public `/status` `json-readiness`       | `<PASS/FAIL>` | `<UTC>`       | `<sanitized output/link>` |
| Exact live legal verification           | `<PASS/FAIL>` | `<UTC>`       | `<sanitized output/link>` |
| Authorized review-account critical flow | `<PASS/FAIL>` | `<UTC>`       | `<sanitized evidence>`    |

- Production deployment start/end (UTC): `<timestamps>`
- Production observation window: `<approved duration/reference>`
- Production readings/dashboard: `<reference>`
- Promotion decision: `<PASS/HOLD/ROLL BACK/ROLL FORWARD>`
- Decision owner/time: `<name, UTC>`

## Monitoring and escalation

Do not invent thresholds here. Record values derived from the approved staging
baseline/provider capacity and the person who approved them.

| Signal                          | Warning threshold/window | Critical threshold/window       | Destination     | Primary/backup owner | Alert test evidence |
| ------------------------------- | ------------------------ | ------------------------------- | --------------- | -------------------- | ------------------- |
| API liveness                    | `<value>`                | `<value>`                       | `<destination>` | `<owners>`           | `<reference>`       |
| API readiness/latency           | `<value>`                | `<value>`                       | `<destination>` | `<owners>`           | `<reference>`       |
| API 5xx/latency                 | `<value>`                | `<value>`                       | `<destination>` | `<owners>`           | `<reference>`       |
| Startup/migration codes         | `<value>`                | `<any critical code>`           | `<destination>` | `<owners>`           | `<reference>`       |
| Auth failures                   | `<value>`                | `<value/access exposure>`       | `<destination>` | `<owners>`           | `<reference>`       |
| Purchase/restore/entitlement    | `<value>`                | `<value/charged-locked report>` | `<destination>` | `<owners>`           | `<reference>`       |
| Account deletion worker/backlog | `<value>`                | `<value>`                       | `<destination>` | `<owners>`           | `<reference>`       |
| Database/pool/backup            | `<value>`                | `<value>`                       | `<destination>` | `<owners>`           | `<reference>`       |
| Mobile crash/hang               | `<value>`                | `<value>`                       | `<destination>` | `<owners>`           | `<reference>`       |
| Legal/support uptime/hash       | `<value>`                | `<unavailable or mismatch>`     | `<destination>` | `<owners>`           | `<reference>`       |
| Privacy/security                | `<any confirmed event>`  | `<any confirmed event>`         | `<destination>` | `<owners>`           | `<reference>`       |

- Escalation/acknowledgment expectations: `<approved values/reference>`
- Approved monitoring/log retention: `<duration + counsel/privacy reference>`
- Monitoring owner confirms live coverage: `<name, UTC, PASS/FAIL>`

## Rollback/roll-forward decision

- Trigger(s): `<none or exact sanitized signal/check>`
- Was the production migration attempted? `<YES/NO>`
- Did it commit state/schema changes? `<YES/NO/UNKNOWN>`
- Selected path: `<hold / app rollback / static rollback / roll forward / coordinated DB+app restore>`
- Why this path is schema-safe: `<evidence>`
- Previous application revision: `<identifier>`
- Previous public/legal revision: `<identifier>`
- Database recovery point: `<non-secret reference>`
- Decision owner/time: `<name, UTC>`
- Execution owner/time: `<name, UTC>`
- Post-action probes: `<PASS/FAIL + evidence>`
- Incident/postmortem reference: `<reference or N/A>`

## TestFlight and App Review handoff

- EAS build ID/URL: `<ID/link>`
- App version/build: `<version/build>`
- Internal TestFlight upload result/time: `<result, UTC>`
- Authorized internal TestFlight group: `<group name>`
- TestFlight QA owner: `<name/role>`
- Tested device model(s)/iOS version(s): `<non-identifying list>`
- `QA_REPORT.md` result/reference: `<PASS/FAIL + reference>`
- `PURCHASE_QA_REPORT.md` result/reference: `<PASS/FAIL + reference>`
- `APP_REVIEW_RUNBOOK.md` review-account/script readiness: `<PASS/FAIL>`
- Review account freshness verified at (UTC): `<UTC; never include credentials>`
- App Privacy/screenshots/metadata exact-build reconciliation: `<PASS/FAIL + reference>`
- Authentication-security artifact/evidence reconciliation: `<PASS/FAIL + reference>`
- Post-capture App Store release validator: `<PASS/FAIL, UTC + reference>`
- Subscription attached to first submission: `<PASS/FAIL/N/A + reference>`
- Production probes immediately before submission: `<PASS/FAIL, UTC>`
- Owner Submit for Review decision: `<APPROVED/BLOCKED, name, UTC, reference>`
- Owner public-release decision: `<APPROVED/BLOCKED/NOT YET REQUESTED, name, UTC, reference>`

## Final release decision

- Final outcome: `PROMOTE` / `HOLD` / `ROLL BACK` / `ROLL FORWARD`
- Decision at (UTC): `<UTC>`
- Decision owner: `<name>`
- Open blockers: `<none or references>`
- Support/incident owner on duty: `<name/role>`
- Next scheduled verification: `<UTC/event>`
- Final non-secret notes: `<summary>`

Detached manifest checksum: `<stored in adjacent .sha256 file after FINAL>`
