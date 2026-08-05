# CUT — lean master handoff (in-repo canonical)

> Start here for the current state. Dated history remains in
> [sessions/INDEX.md](sessions/INDEX.md); it is not an active launch plan.

## CURRENT START-HERE

- Working branch: `codex/app-store-v1`.
- Draft pull request: [#9 — harden CUT OS App Store launch path](https://github.com/ahmedzarif-ops/cut/pull/9).
- Resolve the exact remote branch SHA and its required GitHub checks live before
  relying on a checkpoint. A commit ID embedded in this tracked handoff would
  become historical as soon as the handoff itself changes.
- The agent must not self-merge the pull request; the owner merges or explicitly
  overrides that repository rule.
- The current repository checkpoint passes **1,373 automated tests** (300 release
  operations, 61 App Store, 33 domain, 4 database, 438 mobile, and 537 API), all
  TypeScript checks, generated-code drift, working App Store validation,
  changed-file formatting, `.replit`/migration parsing and drift checks, Expo
  dependency health, and the clean zero-JavaScript Replit production-build
  contract. None of those checks are signing, TestFlight, live-service, or App
  Store acceptance evidence.
- Production ingress is pinned to one explicit canonical HTTPS origin and
  excludes Replit development-domain injection. The production public process
  serves a CSP-locked zero-JavaScript CUT page, blocks Expo preview artifacts at
  origin and mounted paths, and has a bounded live verifier.
- RevenueCat startup includes a bounded customer-permission verifier. Its
  corrected source-controlled, read-only live preflight passed from Replit on
  then-current green commit `930a70eb4773b534c9d9fa33fb6030bdd6ee5a54`,
  verifying
  the CUT iOS mapping and bounded customer-read access. Dashboard evidence
  verifies read/write permission without issuing a test write or deletion.
  Customer write/delete behavior and post-upload exact-build restore QA remain
  evidence gates. The optional App Store Connect API sync credential is
  intentionally omitted after Apple's live internal-use-only attestation.
  Decision 3 owner authorization is confirmed.
  Database/migration and shutdown
  timeout relationships are cross-tested, and Metro gets only reviewed public
  values with dotenv loading forced off.
- Malformed StoreKit display data now withholds purchase, and the settled
  one-plan paywall has a tested conservative 6.9-inch layout budget while
  preserving its real offer, account actions, renewal disclosure, legal/support
  links, and accessible targets. Exact signed-device capture remains pending.
- Target-aware strict validation remains closed for `app_review` and
  `public_release`, covering external, owner, legal, exact-build, screenshot,
  and App Store Connect evidence. Recompute counts from the current tree rather
  than copying a historical number.
- Release evidence requires structured monitoring approvals and a closed,
  recovery-bound migration classification; it forbids application-only rollback
  after any completed migration. Native configuration also keeps the dark
  launch-screen status bar readable and excludes Clerk's optional Google
  Sign-In pod.
- Clean Expo iOS prebuild and CocoaPods installation pass with fail-closed scene-
  lifecycle and iOS 17 pod-target plugins. A clean production-only mobile
  install retains all 32 runtime dependencies without direct development links;
  an unsigned generic-iPhone Xcode 27 Release archive and its 118-file secret
  scan also pass. This is a local structural rehearsal, not a signed EAS archive,
  physical-device flow, or full tap-through.
- CUT password recovery now uses Clerk's prebuilt sign-in-only native and web
  flows. The Clerk development tenant has Strict enumeration protection,
  Client Trust, bot protection, and lockout protection enabled. A production
  instance now exists on the free Hobby plan for
  `cut-ahmedzarif1.replit.app`, and its live keys are held only in Replit.
  Production Strict/Native API/iOS-registration evidence, deployed proxy health,
  and signed physical-iPhone evidence remain release gates.
- App Review access is now a target-bound release gate: its controlled window
  requires Clerk production test mode, Client Trust, five reserved synthetic
  accounts, and exact-build new-device proof; public release separately
  requires production test mode off while Client Trust remains on. The verifier
  accepts only `BUILD_SHA -> APP_REVIEW_EVIDENCE_SHA ->
PUBLIC_RELEASE_EVIDENCE_SHA`; it freezes the review account history and every
  non-allowlisted submission field across the transition, freezes release ID
  plus build/deployment identity across target manifests, and rejects a third
  evidence commit. Only root `updated`, target-state Clerk/Apple evidence, and
  the Clerk shutdown-closure triplet may advance in the submission record.
- Sign-up has separate 18+ and provisional Terms/Privacy controls. Legal launch
  gate 3A remains open until counsel approves the exact language and durable
  policy-version/timestamp evidence design.
- Account deletion visibly warns that Apple billing continues and keeps the
  App Store subscription-management action available; a source contract now
  protects that review-critical behavior until exact-build native QA.
- Replit development is imported, database-migrated, secret-configured, and
  preview-verified. The repository no longer overrides Replit's provider-owned
  deployment type. It is fast-forwarded to the latest pushed branch commit with
  a clean tree; the superseded Replit-only workflow change remains in a named
  stash. The live Publishing draft must remain a one-machine Reserved VM and be
  re-verified after every sync.
- The owner approved Replit up to **$20/month before tax**: a $15 Reserved VM
  plus $5 of new usage-based headroom. Phone verification is complete. No
  production app is promoted or running: the first publish was canceled before
  application bundling or promotion. Its no-copy control was off. That attempt
  provisioned the production database schema; every application table has zero
  rows. Replit's read-only connection value currently uses `sslmode=require`,
  and CUT now source-tests a fail-closed adaptation of only that exact supported
  shape to `sslmode=verify-full`. Live TLS/readiness evidence must still pass
  before promotion. This handoff does not assert billing or charge status.
- Apple Developer Program membership is active as an Individual account with
  Zarif Ahmed as Account Holder. App Store Connect access and the CUT OS app
  record are active. Paid Apps shows an August 4, 2026 through August 3, 2027
  effective period with status `Active`; banking and U.S. Form W-9 are also
  `Active`. Apple commerce readiness is confirmed; legal, exact-build,
  submission, and release gates remain open.
  Production EAS submission
  routing is pinned to Apple app ID `6798020879` and validated against
  subscription group ID `22286645` and subscription ID `6798020349`.
- RevenueCat server API v2 replacement key
  `CUT Replit Production Replacement 2026-08-04` is created with Charts no
  access, Customer Information read/write, and Project Configuration read-only
  dashboard settings. Replit now has its value saved masked and the exact CUT
  project, Apple app, entitlement, and offering REST IDs as non-secret
  configurations. The corrected read-only live preflight passed on exact green
  commit `930a70eb4773b534c9d9fa33fb6030bdd6ee5a54`; dashboard evidence verifies
  customer read/write permission and no test write or deletion was issued. The
  old unconfigured key remains and has not been revoked.
  The existing Test Store product remains test-only. The owner-approved real
  offer is a free download with `com.zarifahmed.cut.pro.monthly` at $4.99/month,
  no trial, Family Sharing off, United States only initially, and manual
  release. RevenueCat production Apple app `app8feee0dfba` is created for the
  exact bundle, its subscription key is valid, and product `prod66e8dc0083`
  maps to `CUT_OS_PRO` and `default/$rc_monthly`. A public iOS SDK key is
  provisioned without recording its value. The optional App Store Connect API
  sync credential is intentionally omitted; public-iOS-key/EAS wiring remains
  pending.
  **Transfer to new App User ID** is persisted with controlled non-secret
  dashboard evidence; Decision 3 owner authorization is confirmed, while
  exact-build restore-after-deletion QA remains required.
- TestFlight group `CUT OS Internal QA` is configured with automatic
  distribution off, the authorized public feedback email, the exact beta
  description, 0 testers, and 0 builds. The subscription's credential-free
  Review Notes are saved, but version attachment and its review screenshot are
  pending; no TestFlight QA or submission is claimed.

## RUNNING QUEUE

1. Keep PR #9 draft and require exact GitHub CI success after every new commit;
   never rely on a green run from an older revision and never self-merge.
2. Keep Replit on the exact pushed commit with a clean tree and verify the
   Publishing draft still says Reserved VM after every sync. The cost ceiling is
   approved, but do not republish until the source-tested database adaptation is
   on the exact green commit, the production preflight can pass, and the
   development-data copy setting is rechecked off.
3. Keep the live active Apple membership, Paid Apps, banking, tax, and
   app/subscription evidence current.
4. Preserve the passing bounded RevenueCat live preflight, valid Apple in-app
   purchase key, customer read/write evidence, and intentional omission of the
   optional App Store Connect API sync credential. Place the app REST ID and
   provisioned public iOS SDK key only in their approved server/EAS
   destinations.
5. Validate the provisioned empty Replit production database, Clerk
   proxy/security, and RevenueCat Apple configuration only after their exact
   prerequisites can pass.
6. Build the exact signed TestFlight candidate and complete physical-iPhone
   authentication, recovery, purchase, restore, deletion, accessibility, and
   screenshot evidence before App Review.

## LOCKED SAFETY BOUNDARIES

- Audience is adults age 18 and older under `adult-18-v1`.
- Bundle ID is `com.zarifahmed.cut`.
- The approved v1 subscription identifier is
  `com.zarifahmed.cut.pro.monthly`; runtime fails closed and accepts only one
  $4.99 U.S. `P1M`, no-introductory-offer product mapped to `CUT_OS_PRO`.
  The exact App Store Connect product and U.S. price are saved; first-version
  attachment, review screenshot, and exact-build evidence remain pending. The
  optional RevenueCat App Store Connect API sync credential is intentionally
  omitted. Credential-free Review Notes are
  saved. If the offer changes,
  update and reverify the owner decision, source, configuration, and tests before
  any signed build.
- Local StoreKit/RevenueCat state never grants paid access without the
  server-authoritative entitlement.
- Exactly one always-on API machine is required until rate limiting and deletion
  scheduling are moved to shared infrastructure.
- Ask before recurring, usage-metered, or paid service actions.
- Do not put passwords, verification codes, tax/banking data, or provider
  secrets in source, logs, screenshots, handoffs, or chat.
- Agent-authored pull requests are never self-merged.

## OWNER-CONTROLLED GATES

- Replit approval phrase: **Approve Replit up to $20/month before tax**.
- Final public seller-display verification and qualified-counsel review of the
  individual seller path.
- Standard-versus-custom EULA, app tax category, optional subscription tax
  override, DSA status, copyright holder/year, content-rights declaration, and
  final product-name clearance.
- Qualified legal/privacy and nutrition/allergen review.
- Apple signing/2FA, App Review submission, and manual public release.

## PERSISTENT REFERENCE

- Repository: `github.com/ahmedzarif-ops/cut`.
- Package manager: pnpm `10.34.5`.
- Core verification: `pnpm run codegen:check`, `pnpm run typecheck`,
  `pnpm run test`, and `pnpm run validate:app-store`.
- Release validation intentionally remains fail-closed until owner, provider,
  exact-build, legal, screenshot, and App Store Connect evidence is complete.
- App Store submission truth: `app-store/app-store-submission.json` and
  `APP_STORE_READINESS.md`.
- Current owner decisions: `OWNER_LAUNCH_DECISIONS.md`.
- Authentication gate: `artifacts/cut-os/AUTH_SECURITY_PRELAUNCH.md`.
