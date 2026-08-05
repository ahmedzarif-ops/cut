# CUT OS — Work Status

**Updated:** August 4, 2026

**Working branch:** `codex/app-store-v1`

**Base:** `origin/main` at `70dc1cf`

**Adult policy:** Owner-approved adults-only 18+ policy `adult-18-v1`.
Automated server/domain/mobile implementation is complete. Legal/privacy,
native-device and live-service QA, and App Store completion remain open; this is
not a public-launch readiness claim.

## What now works

- The previously reviewed P1-9/10 and P1-4 branches are integrated locally:
  - zod 4 and UUID response validation.
  - generated-code drift protection.
  - atomic, server-owned onboarding completion.
- Local Apple Silicon development no longer excludes esbuild's required native binary.
- Vitest and Orval configurations load without the previous TypeScript-config runner hang.
- The onboarding client no longer makes the redundant second PATCH after saving a profile.
- Paid-v1 onboarding and its API now collect only the profile fields the current
  Today experience displays: display name, goal, and start/goal weight. Unused
  sex, height, activity, training-experience, and target-date inputs are
  rejected, and a committed prelaunch migration clears legacy values.
- A real daily weigh-in vertical slice is implemented:
  - a signed-in eligible account synchronizes a validated named device timezone
    before daily screens unlock, including before purchase; writes are
    serialized and fenced across retries, zone changes, and account switches;
  - every daily read/write also carries a validated request-scoped device
    timezone, so concurrent devices cannot overwrite one shared calendar-day
    boundary; foreground and 60-second rechecks lock the flow during changes;
  - one server-owned weigh-in per user-local day;
  - duplicate-safe update on repeated taps, with the displayed day echoed and
    stale-day retries rejected before a midnight/travel retry can create a
    second historical entry;
  - authenticated weight history scoped to the current user;
  - Today endpoint with deterministic Next Action;
  - Today advances from **Log your morning weigh-in** to **Build your first balanced meal** immediately after save;
  - metric storage with kg/lb display conversion;
  - migration, OpenAPI contract, generated client/validators, API service/routes, native UI, and tests.
- A server-backed balanced-meal engineering foundation is implemented and
  automated; native acceptance remains pending:
  - six versioned simple options, including Bengali and Desi meals;
  - visible ingredients, dietary tags, template-listed common allergens, an
    ingredient/package-label review warning, and estimated nutrition;
  - transparent general ordering based on protein, fiber, and a practical calorie range;
  - server-validated user-local day, versioned catalog handshake, and canonical
    nutrition snapshots;
  - durable owner-scoped create intent, captured session/token, cross-midnight
    recovery, simultaneous-retry coverage, and conflict detection;
  - idempotent delete plus an opaque request tombstone that prevents delayed
    retries from recreating a removed meal;
  - authenticated log, serving edit, confirmed delete, daily totals, and cross-user isolation;
  - Today opens the meal flow and advances from **Build your first balanced meal** to **Review today’s meals**;
  - accessible native selection, portion preview, loading/error/retry states, cache refresh, and haptics;
  - architecture decision and App Store privacy data-map drafts.
- Unexpected server errors now log only sanitized error name/code metadata, not error messages, stacks, request bodies, or database details that could contain health data.
- A durable account-deletion engineering foundation is implemented and
  automated; native and real-Clerk acceptance remain pending:
  - a server-authoritative pending/completed tombstone that survives the user cascade;
  - normal API access blocked before and after JIT provisioning for tombstoned identities;
  - backend-owned Clerk deletion, local cascade finalization, and bounded retry worker;
  - monotonic deletion state, database-enforced lifecycle/hash constraints,
    fair retry ordering, strict Clerk-error handling, and raw-ID/hash binding
    checks before any destructive external retry;
  - Settings confirmation, App Store subscription-management warning/link, and
    owner-scoped SecureStore recovery state, including terminal cleanup of the
    pending meal intent;
  - authenticated-route gating, immediate private-cache removal on `410`,
    foreground refresh plus 60-second active polling, and React Query cache
    clearing across Clerk principal transitions.
- A server-authoritative adults-only eligibility foundation is implemented and
  automated under policy `adult-18-v1`; native acceptance remains pending:
  - strict transient full-DOB input evaluated against an injected UTC clock,
    including the conservative March 1 rule for February 29 births;
  - no raw-DOB database field or API response, with only eligibility status,
    policy version, and decision timestamp retained;
  - monotonic eligible/ineligible decisions, existing-account recheck, legacy
    birth-year removal, and email clearing until an eligible recheck;
  - typed fail-closed `428`/`403` private-API enforcement while deletion/status,
    restricted Settings, and sign-out remain available;
  - owner-scoped native query state, an eligibility form/restricted screen, and
    cache-clearing guards for stale data and Clerk principal transitions.
- The iOS release configuration now has a tested fail-closed baseline:
  - production EAS builds require a clean commit, the intended production
    environment, a live Clerk publishable key, a canonical same-origin Clerk
    proxy, and public Privacy, Terms, and Support destinations;
  - native startup rejects malformed release configuration without initializing
    Clerk or the API client and shows explicit loading/error states instead of a
    blank authentication screen;
  - bearer credentials can be sent only to the configured matching HTTPS API
    origin, including when a caller supplies the header directly;
  - OpenAPI declares bearer authentication for private operations and keeps only
    the health check public;
  - validated, accessible Privacy, Terms, and Support controls appear during
    sign-up, adult eligibility, normal Settings, and restricted Settings;
  - the native privacy-manifest baseline, exempt-encryption declaration, and
    disabled arbitrary network loads resolve in Expo introspection.
- A focused paid-v1 subscription foundation is implemented and automated:
  - RevenueCat uses only the opaque internal user UUID and never receives Clerk
    IDs, email, or health/profile attributes;
  - the native purchase, restore, StoreKit-localized offer, listener, account
    switch, and sign-out flows fail closed until the server confirms access;
  - every paid API route independently verifies exact `CUT_OS_PRO` access via
    RevenueCat REST v2 and returns typed `402`/`503` responses;
  - provider pagination, response/body timeout, bounded cache, forced refresh,
    ambiguous `404`, lifetime, grace, malformed, and outage paths are covered;
  - account deletion persists RevenueCat `not_started`/`queued`/`confirmed`
    phases, polls queued deletes with GET only, and uses database leases plus
    stale-worker fencing before local completion;
  - all API calls have a bounded whole-request deadline, and failed sign-out
    actions provide visible retryable feedback.
- Native account recovery now supports Clerk's email-code password reset while
  returning the same request notice whether an account exists or delivery
  succeeds, and sign-up checks Clerk result objects before advancing.
- The paywall always offers a server-authoritative purchase-access recheck,
  including when StoreKit is unavailable, and the recheck is single-flight,
  account-fenced, and fail closed.
- App Store submission metadata, privacy answers, age/declaration approvals,
  initial territories, and screenshot evidence now have machine-readable source
  files. Working records validate in CI; the release validator intentionally
  refuses submission until every owner, live App Store Connect, qualified
  review, and real-capture gate is complete.
- Each release candidate must create both App Store target manifests in `DRAFT`
  before `BUILD_SHA`; the verifier enforces the exact
  `BUILD_SHA -> app_review -> public_release` evidence chain. The public
  submission transition may advance only root `updated`; the three top-level
  Clerk closure fields; the three shutdown-closure fields; and the six
  target-state Apple fields. All other submission data is frozen. Across the
  two manifests, release ID, build identity, and deployment identity are
  immutable while target-specific evidence may be finalized in its own phase.
  Staging/production/rollback procedures and bounded sanitized probes cover
  health, readiness, auth guards, indexing, redirects, and internal routes.
- Malformed and oversized JSON requests now return sanitized `400`/`413`
  responses rather than becoming generic server errors.
- pnpm is pinned to `10.34.5`, and GitHub CI now runs frozen install, generated
  contract drift, typecheck, all tests, tracked-source secret scanning, the
  single-host production dry-run, and production iOS archive scanning on pull
  requests and `main`.
- The mobile workspace now classifies all 32 runtime/native/workspace packages
  as production dependencies while keeping 11 build/test-only packages in
  development dependencies. A clean production-only install proves every
  runtime package remains linked without direct development-package links.
- The native archive secret scanner narrowly permits only RevenueCat's two exact
  terminated receipt-request event names while continuing to detect realistic
  secret keys and prefixed/suffixed variants.
- Production is source-locked to one always-on API process serving the landing,
  Privacy, Terms, Support, status, Clerk proxy, and API routes on one canonical
  HTTPS origin. Split hosts, non-root production paths, competing Replit
  production services, unpackaged legal templates, or mismatched canonical
  URLs fail closed before release.
- One canonical subscription identity now binds the iOS bundle, RevenueCat
  entitlement/offering, and App Store product across mobile, API, App Store,
  and production release validation.
- StoreKit display fields now fail closed before purchase when they are blank,
  padded, controlled, oversized, or lack a localized decimal digit. The compact
  settled-offer layout keeps the real title, description, price, controls,
  renewal disclosure, and legal/support links within a conservative 6.9-inch
  screenshot budget while smaller or larger-text devices remain scrollable.
- The owner authorized `Zarif Ahmed` as the public legal operator for the
  selected individual/Texas-sole-proprietor path. The applicable county was
  supplied privately and is not committed to this public repository; Apple's
  activated seller-name verification and qualified-counsel review remain open.

## Verification

The current local automated checkpoint includes the balanced-meal,
durable-account-deletion, and adults-only eligibility foundations. It is not
native/App Store acceptance.

- `pnpm run typecheck`: **PASS**.
- `pnpm run test`: **PASS — 1,341 tests** (release operations 300, App Store
  artifacts 60, domain 33, database 4, mobile 438, API 506).
- Expo dependency compatibility check: **PASS** with Expo `54.0.36`.
- Expo Doctor `1.20.1`: **PASS — 18/18 checks**.
- Frozen pnpm `10.34.5` install: **PASS** with the committed lockfile.
- Production-configured Expo iOS bundle rehearsal: **PASS — 1,771 modules;
  7.48 MB Hermes bundle; 17 MB disposable export**. The archive boundary scan
  checked 62 files with zero findings. This was not a signed native archive or
  App Store build.
- Combined production topology: **PASS** — the API build packages the legal
  templates, enforces one canonical origin, and the production loopback dry-run
  serves public, legal, status, and API surfaces from one listener without live
  provider or database calls. The public-site build remains zero-JavaScript and
  does not generate or require the development-only `static-build` preview.
- App Store records: **PASS** in working mode; target-aware strict validation
  intentionally remains closed for `app_review` and `public_release`, covering
  owner, provider, legal, screenshot, exact-build, and App Store Connect
  evidence. Recompute the diagnostic count from the current tree rather than
  copying a historical number.
- Native release configuration: **PASS** — the generated iOS Info.plist uses a
  light-content status bar over the dark splash, Clerk Expo is pinned to 4.2.0,
  and Apple autolinking contains `ClerkExpo` without the optional Google Sign-In
  pod.
- Secret boundaries: **PASS** — 13 scanner tests and the tracked repository had
  zero findings at the recorded run. Recount and rescan the exact candidate
  rather than relying on a hard-coded file total. A fresh unsigned
  generic-iPhone Release archive also passed its
  118-file native app scan with zero findings.
- Production release-environment preflight: **PASS** with representative
  non-secret values; missing, malformed, private, reserved, cross-origin, and
  insecure configurations fail closed in automated coverage.
- Expo native-config introspection: **PASS** for bundle ID, privacy-manifest
  baseline, exempt-only encryption declaration, and disabled arbitrary loads.
- Blank-database migrations, including paid-v1 profile minimization, deletion
  lifecycle/hash constraints, finite nutrition checks, retry index, and meal
  deletion tombstones: **PASS**.
- Baseline adoption-safe migration test: **PASS**.
- Cross-user weight isolation: **PASS**.
- Cross-user meal read/edit/delete isolation: **PASS**.
- Double-save idempotency: **PASS**.
- Meal retry idempotency and mismatched-key conflict: **PASS**.
- Cross-midnight recovery, stale day/catalog rejection, repeated delete, and
  deleted-request replay protection: **PASS**.
- Deletion cascade, other-user isolation, pre/post-provision tombstone guard,
  monotonic concurrency, strict provider-error handling, corrupt identity-pair
  rejection, failure recovery, and bounded-worker retry: **PASS (automated)**.
- Owner-scoped deletion marker, fail-closed status-gate helpers, captured auth,
  and late-response principal isolation: **PASS (automated)**.
- Adult UTC calendar evaluation, monotonic eligibility decisions,
  `428`/`403` private authorization, existing-account recheck, birth-year
  removal, email minimization, and native fail-closed helper regressions:
  **PASS (automated)**.
- User-local day calculation, concurrent-device separation, private-cache
  controls, and device-timezone synchronization races: **PASS (automated);
  native local-midnight/travel acceptance pending**.
- Native iOS scene launch: **PARTIAL LOCAL** — an unsigned Xcode 27 Release app
  compiled, installed, and remained alive on iOS 27 with an active
  `UIWindowScene`. Full product flows and runtime deep-link delivery were not
  exercised; the exact signed TestFlight build remains authoritative.
- Real-device interaction: **not yet verified**.
- Account deletion against a real Clerk identity: **not yet verified**.
- RevenueCat purchase, restore, entitlement, and customer-deletion behavior:
  **implemented and automated; not yet verified with Apple Sandbox/TestFlight
  and production service credentials**.

## Known environment fact

The Desktop folder originally provided was an incomplete export: it lacked Git
objects and the tracked `artifacts/*` application source. A clean working copy
was recovered from its configured canonical origin,
`github.com/ahmedzarif-ops/cut`, without overwriting the incomplete folder. Xcode
27 beta and an iOS 27 simulator are now available for unsigned local rehearsal;
physical-iPhone testing of the exact signed TestFlight build remains an explicit
launch gate.

## Current live launch setup

- Source routing: draft pull request #9 remains unmerged on
  `codex/app-store-v1`. Resolve the remote SHA and latest exact-head required
  checks live; do not treat a commit embedded in this tracked file as current
  release evidence.
- Apple Developer Program membership is active as an Individual account for
  Account Holder Zarif Ahmed. The explicit bundle ID, CUT OS App Store Connect
  app, free U.S.-only Public distribution, iPhone-only compatibility choices,
  manual release, and exact $4.99 monthly/no-trial subscription are saved. App
  ID `6798020879`, subscription group ID `22286645`, and subscription ID
  `6798020349` are evidence-bound, and production EAS submission routing is
  pinned to the app ID. Credential-free subscription Review Notes are saved,
  while first-version attachment, review screenshot, price-effective timestamp,
  exact build, submission, and release remain pending. Apple's commerce page
  shows the Paid Apps Agreement effective August 4, 2026 through August 3, 2027
  with status `Active`, banking `Active`, and U.S. Form W-9 `Active` after its
  August 4 submission. Apple commerce readiness is confirmed; legal gates
  remain open.
- TestFlight feedback email and the exact beta description are saved. Internal
  group `CUT OS Internal QA` exists with automatic distribution off, 0 testers,
  and 0 builds; no build assignment or QA is claimed.
- Replit hosting is owner-approved up to **$20/month before tax** and phone
  verification is complete. The clean workspace matches the exact source
  checkpoint. The one-machine $15 Reserved VM remains stopped and unpublished,
  so its recurring server charge has not started. The provider UI reset the
  development-data-copy option on and it was directly returned to off at
  `2026-08-04T23:54:24Z`; production database creation and its exact TLS mode
  remain unverified until publish.
- Clerk production exists on the free Hobby plan for
  `cut-ahmedzarif1.replit.app`; live keys were transferred directly into Replit
  without entering source. Proxy health and exact production security/iOS
  settings remain post-deployment and signed-device evidence gates.
- Replit contains the exact CUT project, Apple app, entitlement, and offering
  REST IDs as non-secret configurations and the RevenueCat server API v2
  replacement secret saved masked. Replacement key
  `CUT Replit Production Replacement 2026-08-04` has Charts no access,
  Customer Information read/write, and Project Configuration read-only
  dashboard settings. Production Apple app `app8feee0dfba` is created for
  `com.zarifahmed.cut`, its subscription key is valid, and product
  `prod66e8dc0083` maps to `CUT_OS_PRO` and `default/$rc_monthly`. A public iOS
  SDK key is provisioned without recording its value. Decision 3 owner
  authorization is confirmed by the exact phrase
  `approve RevenueCat server-key replacement and Decision 3`; the old
  unconfigured key remains and has not been revoked. The corrected,
  source-controlled read-only preflight passed from Replit on exact green
  commit `a7cbea360593681e4971fea3b3c05e78cd7604e4`, verifying the exact CUT iOS
  mapping and bounded customer-read access. Dashboard evidence verifies
  customer read/write permission without issuing a test write or deletion. The
  separate App Store Connect API credential and exact-build native restore QA
  remain pending, and production continues to fail closed.
  The dashboard restore behavior is evidence-bound as Transfer to new App User
  ID.

## Highest-priority next slice

Close the public-launch safety and native acceptance gates before collecting
more sensitive preference data:

1. With the bounded RevenueCat live preflight now passing, connect and directly
   verify RevenueCat's separate App Store Connect API credential. Place the
   production app REST ID and provisioned public iOS SDK key only in their
   approved server/EAS destinations.
2. Retain the confirmed active Paid Apps Agreement, banking, and W-9 evidence.
   Have qualified counsel review the selected individual-seller/Texas-sole-
   proprietor path before submission.
3. Publish owner/counsel-approved Privacy, Terms, and Support pages and supply
   their final HTTPS destinations to the production EAS environment.
4. Complete the still-provisional age-rating and regulated-medical-device
   answers only after legal, qualified health/nutrition, and final-binary review.
5. Link the intended Apple and Expo/EAS projects, configure the validated
   production values, and upload a build into the already configured internal
   TestFlight group after the remaining RevenueCat API-key configuration and
   public legal URLs are ready.
6. Complete native-device acceptance for `adult-18-v1`, including deep links,
   offline/relaunch, shared-device account switching, stale-cache clearing,
   deletion in every eligibility state, legal/support links, and VoiceOver.
7. Produce reproducible recipes, nutrition methodology/sources, allergen
   substantiation, and qualified review records for every public meal template.
8. Exercise success, cancellation, timeout, app-kill, retry, second-device, and
   shared-device account-switch scenarios with a real Clerk development identity
   in an iOS development build.
9. Have qualified counsel approve adults-18+ Terms/EULA, Privacy Policy,
   notice-at-collection, retention/underage handling, launch jurisdictions, and
   sufficiency of the self-declared assurance method and permanent
   ineligible-identity workflow.
10. Define tombstone/backups retention—including the maximum accepted lifetime
    of stale Clerk sessions/tokens—deletion completion expectations, production
    monitoring, alerting, and manual reconciliation.
11. Inventory privacy manifests and required-reason APIs in the generated iOS
    archive; reconcile `APP_STORE_METADATA.md`, complete the current Apple
    questionnaire truthfully, and apply the higher 18+ override once the
    Terms/EULA minimum is final.
12. Add dietary preferences/allergy exclusions only after the deletion and privacy paths exist.
13. Add authoritative calorie/protein targets and deterministic hard filters before using the product name **Best Balanced Fit**.
14. Then advance Today to training and closeout actions.

## Owner actions required for the next external step

The local paid-v1 engineering checkpoint is complete. The owner selected an
individual Apple seller, authorized `Zarif Ahmed` as the public legal operator,
and approved the free-download, U.S.-only $4.99 monthly/no-trial,
Family-Sharing-off, manual-release offer. The corrected 45-character
description, `use_app_name`, Public distribution, and iPhone-only Mac/Vision
opt-outs are recorded under the standing delegated launch instruction. The
seller path and intended Texas sole proprietorship require eventual public
seller-display verification and counsel review because Guideline 5.1.1(ix) directs
sensitive-data apps toward legal-entity submission. Preliminary name screening
also found a crowded same-market `CUT` field, so qualified `CUT OS` clearance
remains open. Apple's Paid Apps Agreement, banking, and U.S. Form W-9 are active
and evidence-confirmed. RevenueCat Decision 3 owner authorization is also
confirmed. Apple signing, RevenueCat's separate App Store Connect API
credential, EAS/Apple authentication, TestFlight build/QA, distribution, App
Store questionnaire/privacy publication, Submit for Review, and public release
remain owner-controlled gates. The owner has confirmed an
18+ launch position; the final rating questionnaire and legal policy still need
owner/counsel approval. Terms/Privacy and jurisdictional age-assurance remain
qualified-counsel gates, and nutrition/health claims remain qualified
professional/legal review gates.
