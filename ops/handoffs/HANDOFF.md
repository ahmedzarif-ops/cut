# CUT — lean master handoff (in-repo canonical)

> Start here for the current state. Dated history remains in
> [sessions/INDEX.md](sessions/INDEX.md); it is not an active launch plan.

## CURRENT START-HERE

- Working branch: `codex/app-store-v1`.
- Draft pull request: [#9 — harden CUT OS App Store launch path](https://github.com/ahmedzarif-ops/cut/pull/9).
- The agent must not self-merge the pull request; the owner merges or explicitly
  overrides that repository rule.
- The current repository checkpoint passes **982 automated tests** (86 release
  operations, 39 App Store, 33 domain, 4 database, 367 mobile, and 453 API), all
  TypeScript checks, generated-code drift, working App Store validation,
  changed-file formatting, `.replit`/migration parsing and drift checks, Expo
  dependency health, and a non-secret production-profile Expo bundle rehearsal.
  That rehearsal is not signing, TestFlight, live-service, or App Store evidence.
- Production ingress is pinned to one explicit canonical HTTPS origin and
  excludes Replit development-domain injection. The production public process
  serves a CSP-locked zero-JavaScript CUT page, blocks Expo preview artifacts at
  origin and mounted paths, and has a bounded live verifier.
- RevenueCat startup now proves bounded customer-read access; customer
  write/delete permission, both Apple keys, restore behavior, and post-upload
  exact-build restore QA remain evidence gates. Database/migration and shutdown
  timeout relationships are cross-tested, and Metro gets only reviewed public
  values with dotenv loading forced off.
- Strict release validation currently rejects **285** unresolved external,
  owner, legal, exact-build, screenshot, and App Store Connect evidence gates.
- CUT password recovery now uses Clerk's prebuilt sign-in-only native and web
  flows. The Clerk development tenant has Strict enumeration protection,
  Client Trust, bot protection, and lockout protection enabled. Production
  Strict/Native API configuration and signed physical-iPhone evidence remain
  release gates.
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
- No Replit production deployment or recurring charge has started. The owner
  must explicitly approve up to **$20/month before tax**: $15 Reserved VM plus
  a $5 usage-based service-shutdown limit, then privately complete Replit phone
  verification.
- The owner reports paying Apple's $99 membership fee. Apple activation and App
  Store Connect access remain pending; do not repeat the purchase.
- RevenueCat is Test Store only. The proposed real offer is a free download with
  `com.zarifahmed.cut.pro.monthly` at $4.99/month, no trial, Family Sharing off,
  United States only initially, and manual release. It is not approved yet.
  Read-only inspection at `2026-08-04T09:06:49Z` showed Project Settings using
  **Transfer to new App User ID** with no separate sandbox override, but
  controlled production evidence and exact-build restore-after-deletion QA
  remain open.

## RUNNING QUEUE

1. Keep PR #9 draft and require exact GitHub CI success after every new commit;
   never rely on a green run from an older revision and never self-merge.
2. Keep Replit on the exact pushed commit with a clean tree and verify the
   Publishing draft still says Reserved VM after every sync. Do not publish or
   start a charge without the owner cost approval.
3. Continue read-only Apple activation checks. After activation, verify the
   actual team/seller type before creating any App Store record.
4. Obtain the owner's exact hosting-cap, paid-offer, seller/legal-identity, and
   public legal contact/domain decisions.
5. Create production Clerk, Replit, App Store Connect, and RevenueCat records
   only after their prerequisites and owner-controlled approvals are satisfied.
6. Build the exact signed TestFlight candidate and complete physical-iPhone
   authentication, recovery, purchase, restore, deletion, accessibility, and
   screenshot evidence before App Review.

## LOCKED SAFETY BOUNDARIES

- Audience is adults age 18 and older under `adult-18-v1`.
- Bundle ID is `com.zarifahmed.cut`.
- The current proposed v1 subscription identifier is
  `com.zarifahmed.cut.pro.monthly`; until the owner approves or changes the
  offer, runtime fails closed and accepts only one `P1M`, no-introductory-offer
  product mapped to `CUT_OS_PRO`. This is an engineering allowlist, not approval
  to create the paid product. If the offer changes, update and reverify the
  source, configuration, and tests before any signed build.
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
- Exact first-offer approval or requested changes.
- Apple seller/team choice after live activation, plus legal entity status.
- Public legal operator, support/privacy email, domain, and state/country.
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
