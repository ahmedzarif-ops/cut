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
- The current repository checkpoint passes **1,322 automated tests** (298 release
  operations, 60 App Store, 33 domain, 4 database, 431 mobile, and 496 API), all
  TypeScript checks, generated-code drift, working App Store validation,
  changed-file formatting, `.replit`/migration parsing and drift checks, Expo
  dependency health, and the clean zero-JavaScript Replit production-build
  contract. None of those checks are signing, TestFlight, live-service, or App
  Store acceptance evidence.
- Production ingress is pinned to one explicit canonical HTTPS origin and
  excludes Replit development-domain injection. The production public process
  serves a CSP-locked zero-JavaScript CUT page, blocks Expo preview artifacts at
  origin and mounted paths, and has a bounded live verifier.
- RevenueCat startup now proves bounded customer-read access; customer
  write/delete permission, both Apple keys, restore behavior, and post-upload
  exact-build restore QA remain evidence gates. Database/migration and shutdown
  timeout relationships are cross-tested, and Metro gets only reviewed public
  values with dotenv loading forced off.
- Malformed StoreKit display data now withholds purchase, and the settled
  one-plan paywall has a tested conservative 6.9-inch layout budget while
  preserving its real offer, account actions, renewal disclosure, legal/support
  links, and accessible targets. Exact signed-device capture remains pending.
- Target-aware strict validation currently rejects **216** unresolved gates for
  `app_review` and **215** for `public_release`, covering external, owner, legal,
  exact-build, screenshot, and App Store Connect evidence.
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
  Replit production deployment or $15 recurring server charge has started; the
  one-machine draft remains stopped and unpublished, with development-data copy
  off and subject to an immediate pre-publish recheck.
- The owner reports paying Apple's $99 membership fee. Apple activation and App
  Store Connect access remain pending; do not repeat the purchase.
- RevenueCat now has a least-privilege server API v2 key plus the exact CUT
  project, entitlement, and offering REST IDs configured directly in Replit.
  The existing Test Store product remains test-only. The owner-approved real
  offer is a free download with `com.zarifahmed.cut.pro.monthly` at $4.99/month,
  no trial, Family Sharing off, United States only initially, and manual
  release. The real Apple app, product mapping, and iOS SDK key remain pending
  Apple activation. The dashboard currently shows **Transfer to new App User
  ID**, but controlled production evidence and exact-build
  restore-after-deletion QA remain required.

## RUNNING QUEUE

1. Keep PR #9 draft and require exact GitHub CI success after every new commit;
   never rely on a green run from an older revision and never self-merge.
2. Keep Replit on the exact pushed commit with a clean tree and verify the
   Publishing draft still says Reserved VM after every sync. The cost ceiling is
   approved, but do not publish until the Apple/RevenueCat/database production
   preflight can pass and the development-data copy setting is rechecked off.
3. Continue read-only Apple activation checks. After activation, verify the
   actual team/seller type before creating any App Store record.
4. After Apple activates, create the exact App Store Connect app/subscription
   records and RevenueCat Apple app mapping; do not request the already-recorded
   offer, seller path, operator, public email, U.S.-only/manual-release, or
   iPhone-only choices again.
5. Complete Replit production database, Clerk proxy/security, and RevenueCat
   Apple configuration only after their exact prerequisites can pass.
6. Build the exact signed TestFlight candidate and complete physical-iPhone
   authentication, recovery, purchase, restore, deletion, accessibility, and
   screenshot evidence before App Review.

## LOCKED SAFETY BOUNDARIES

- Audience is adults age 18 and older under `adult-18-v1`.
- Bundle ID is `com.zarifahmed.cut`.
- The approved v1 subscription identifier is
  `com.zarifahmed.cut.pro.monthly`; runtime fails closed and accepts only one
  $4.99 U.S. `P1M`, no-introductory-offer product mapped to `CUT_OS_PRO`.
  App Store Connect creation remains pending Apple activation. If the offer
  changes, update and reverify the owner decision, source, configuration, and
  tests before any signed build.
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
- Activated Apple seller-name verification and Account Holder access.
- Standard-versus-custom EULA, app tax category, optional subscription tax
  override, DSA status, copyright holder/year, content-rights declaration, and
  final product-name clearance.
- Qualified legal/privacy and nutrition/allergen review.
- Apple agreements, tax/banking, signing/2FA, App Review submission, and manual
  public release.

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
