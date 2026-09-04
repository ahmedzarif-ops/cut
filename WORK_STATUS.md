# CUT OS — Work Status

**Updated:** September 4, 2026

**Working branch:** `codex/app-store-v1`

**Remote branch checkpoint:** `origin/codex/app-store-v1` at `b4871b8`

**Adult policy:** Owner-approved adults-only 18+ policy `adult-18-v1`.
Automated server/domain/mobile implementation is complete. Legal/privacy,
native-device and live-service QA, and App Store completion remain open; this is
not a public-launch readiness claim.

## Current product and launch checkpoint — 2026-09-04

- The database-catalog candidate is the local commit containing this checkpoint,
  directly after redesigned app commit `917237a`. Resolve the current local SHA
  before use. Nothing in this candidate has been pushed, deployed, migrated in
  production, uploaded to Apple, submitted for review, or released.
- CUT now has a database-backed, source-audited nutrition catalog: 35 foods and
  18 meal templates, including 11 Desi or Bengali options. Every current catalog
  item is free to search, customize, save, and log. Migration 0014 creates the
  global catalog tables, and startup synchronization is idempotent and retains
  removed IDs as inactive so historical logs keep their meaning.
- Pro adds adaptive meal fits and on-demand meal drafts based on goals, targets,
  food preferences, direct liked/not-for-me feedback, confirmed meal history,
  and the current day's remaining calories and protein. The server constrains
  model output to active catalog IDs and gram amounts and calculates nutrition
  itself. No generated result is auto-logged.
- Provider-backed AI remains disabled. It requires a separate owner-approved
  hard spend limit and CUT-only credential before configuration or use. The
  deterministic private-catalog fallback is functional without a provider.
- The current candidate passes 1,470/1,470 automated tests, the full TypeScript
  check, generated-code drift check, production build, working App Store
  validator, non-billable production topology dry run, and `git diff --check`.
  These results do not prove signed-in visual behavior, production deployment,
  TestFlight, App Review, or public-release acceptance.
- Native camera permission is limited to barcode scanning. The unused
  microphone and Android audio-recording permissions are disabled, and no
  photo-library permission is requested. Photo-AI remains unshipped.
- The latest signed Apple build is build 5, EAS ID
  `be50e881-c04e-4710-9a28-e218cc6f2e38`, from old source commit `b4871b8`.
  Apple processed it as App Store Connect build
  `8b59459f-ff7e-40a6-8db5-2439be1dd643`, status **Ready to Submit**, and it is
  assigned to the internal QA group. It is not the redesigned database-catalog
  candidate and must not be submitted.
- App Store version 1.0.0 still selects build 4 and has no uploaded listing
  screenshot. The subscription still has no review screenshot. Its live
  description names free features as the paid value, so local release source
  now selects the 45-character correction `Adaptive meal fits and on-demand
  meal drafts.` and resets the Review Notes gate pending an approved Apple
  metadata update.
- Production remains on the older deployed commit
  `08e62232db7f81047eec5b55a184f30fb7d4162a`. Production migration 0014 and
  the redesigned app require an explicitly approved deployment/build cycle.
- A locally signed Release Simulator app launches without a crash on two iOS 27
  simulators. Signed-in visual tap-through remains pending; the owner must sign
  in personally in Simulator and confirm that state without sharing a password.
- Legal and privacy text remains draft pending qualified review. No lawyer,
  dietitian, provider, or other external party was contacted during this work.
- The current Apple, EAS, GitHub, and production read-only snapshot is recorded
  in
  [apple-live-readonly-2026-09-04.md](app-store/evidence/apple-live-readonly-2026-09-04.md).

## Historical App Store launch checkpoint — 2026-08-11T00:09:20Z

- Exact EAS production build 4 for version 1.0.0 is signed from repaired commit
  `b6d135dc334937c61f7e1f4847ec9b04d2fd6cd4`. Apple processed it as **Ready
  to Submit**, assigned it to `CUT OS Internal QA` with automatic notifications
  off, and saved it as the selected build for App Store version 1.0.0. Build 4
  supersedes build 3 as the exact signed QA candidate. It is not the final
  immutable submission build because two documentation checkpoints follow its
  build commit; the no-rewrite path is to finish device QA, then cut the final
  build from the stabilized head with the paired evidence drafts already
  present. See
  [apple-build-4-processing-and-assignment-2026-08-10.md](app-store/evidence/apple-build-4-processing-and-assignment-2026-08-10.md).
- Build 4's canonical **What to Test** copy is now saved in App Store Connect.
  Immediately after that metadata save, the same internal tester row advanced
  from `No Builds Available` to `Invited` while the group retained one tester
  and builds 3 and 4. Apple Developer Support case `20000133994444` remains
  open as the record of the earlier contradictory state. With explicit owner
  approval, Apple's `Reinvite` action was used once without removing the tester
  or either build. No support follow-up, tester replacement, external-beta
  invitation, App Review submission, or public release occurred. Acceptance,
  installation, and physical-device QA remain pending.
- The exact build 4 IPA now passes strict signature/profile/entitlement,
  privacy-manifest, public-configuration, legal-URL, and archive secret-boundary
  inspection. The listing's exact-build claims review is confirmed against that
  signed artifact; physical-device behavior, owner brand/name approval, and
  submission approval remain separate.

- Exact EAS production build 3 for version 1.0.0 is signed from commit
  `08e62232db7f81047eec5b55a184f30fb7d4162a`, processed by Apple as `VALID`
  and `APP_STORE_ELIGIBLE`, assigned to `CUT OS Internal QA`, and selected for
  App Store version 1.0.0. Automatic internal build notifications remain off;
  no invite or build-notification email was sent.
- App Store Connect now stores the exact public Support, Privacy, Marketing,
  description, keyword, promotional, subtitle, beta-description, and
  What-to-Test metadata. The processed build and metadata are not an App Review
  submission or public release.
- Apple's current age questionnaire is saved from the exact v1 scope. The
  calculated U.S. rating is 9+ before the higher-age override and 18+ after the
  owner-approved adults-only override. The override was restored and re-read
  as `EIGHTEEN_PLUS`. A later read-only pass rechecked all seven questionnaire
  steps, including the 2026 social-media questions, and found the stored
  answers unchanged.
- The exact monthly subscription now shows current U.S. pricing of $4.99,
  availability in 1 of 175 storefronts, zero introductory offers, and zero
  upcoming price changes. RevenueCat's Apple credentials and catalog mapping
  are technically verified; real TestFlight purchase, entitlement, and restore
  evidence remains pending.
- The owner-approved nine-type App Privacy matrix is published as linked to the
  user and not used for tracking. Content Rights is saved as no third-party
  content; Standard EULA remains selected; the app is declared not a regulated
  medical device; DSA is active as non-trader/no planned EU distribution; and
  both parent-app and monthly-subscription tax categories are Fitness and
  Health.
- Replit serves the exact release commit, and `/`, `/status`, `/api/readyz`,
  `/privacy`, `/terms`, `/support`, and the canonical Clerk proxy pass. Detailed
  build and age evidence is in
  [apple-build-3-and-age-rating-2026-08-10.md](app-store/evidence/apple-build-3-and-age-rating-2026-08-10.md).
- Remaining gates are exact-build physical-iPhone authentication, age,
  purchase/restore, deletion, and accessibility QA; 6.9-inch listing and
  subscription screenshots; review-account/contact configuration; first-
  subscription attachment; and explicit confirmation before App Review
  submission and later manual public release. After a notification-free build
  rebind left the tester at `No Builds Available`, the owner approved exactly
  one Apple invitation email. The same internal Account Holder tester was
  removed and re-added, and App Store Connect reported that one tester was
  added. The owner then reported that no invitation had arrived, and the live
  tester row still showed `No Builds Available` even though the group and exact
  build each cross-referenced the other. Saving build 4's previously blank but
  already-approved canonical **What to Test** copy advanced that row to
  `Invited` at `2026-08-11T00:09:20Z` without changing the assignment. After a
  stale invitation link failed, the owner approved one fresh email and Apple's
  `Reinvite` action was used once without removing the tester or builds. No
  second tester addition occurred. Invitation acceptance and exact-build
  installation remain pending. With explicit owner approval, Apple
  Developer Support case
  `20000133994444` was submitted at `2026-08-10T22:22:22Z`; Apple will reply by
  email and gave no response-time guarantee. The case requested repair or
  diagnosis of the contradictory internal tester/build relationship and did
  not send another invitation or change App Store state.
- A later authenticated simulator regression proved that build 3's source
  lacks the session-refresh repair needed after a short-lived Clerk bearer
  token is rejected. A local candidate now refreshes the same active Clerk
  session before the single allowed 401 replay. It stayed on the real `$4.99
per month` paywall beyond token expiry and returned to that screen after a
  cold relaunch, with 462/462 mobile tests, 64/64 App Store/screenshot tests,
  the working validator, and the full TypeScript check passing. Build 3 remains
  valid historical Apple processing evidence but is no longer an eligible
  release candidate. Build 4 now contains the committed, green repair and is
  the exact signed QA candidate. See
  [local-auth-refresh-candidate-2026-08-10.md](app-store/evidence/local-auth-refresh-candidate-2026-08-10.md).
- The credential-free App Review Notes template now pre-resolves every stable
  build, category, product, price, URL, and network fact. It is 3,156 UTF-8
  bytes with 12 placeholders remaining only for sensitive contact/review-
  account data and the verified entitlement method; it is not saved in App
  Store Connect. A dedicated iPhone 17 Pro Max / iOS
  27.0 simulator preflight produced the accepted 6.9-inch `1320 × 2868` capture
  size, and a locally signed release-style app launched to the empty sign-in
  screen without a crash or clipped control. That app is not build 3's
  App Store-signed TestFlight binary; no CUT OS listing or review image was
  captured or approved.

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
- `pnpm run test`: **PASS — 1,417 tests** (release operations 303, App Store
  artifacts 62, domain 33, database 4, mobile 459, API 556).
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
  `codex/app-store-v1`. The exact code commit verified and deployed at this
  checkpoint is `08e62232db7f81047eec5b55a184f30fb7d4162a`; GitHub Actions run
  `31425815282` reports **Success** for both **CI verify** and **Release evidence
  boundary** on that commit. Documentation-only commits may move the branch and
  pull-request head without changing the deployed build, so re-resolve all three
  identities and checks before the next publish.
- Apple Developer Program membership is active as an Individual account for
  Account Holder Zarif Ahmed. The explicit bundle ID, CUT OS App Store Connect
  app, free U.S.-only Public distribution, iPhone-only compatibility choices,
  manual release, and exact $4.99 monthly/no-trial subscription are saved. App
  ID `6798020879`, subscription group ID `22286645`, and subscription ID
  `6798020349` are evidence-bound, and production EAS submission routing is
  pinned to the app ID. Credential-free subscription Review Notes are saved,
  while first-version subscription attachment, review screenshot, price-
  effective timestamp, submission, and release remain pending. Exact signed
  build 3 is selected for version 1.0.0. Apple's commerce page
  shows the Paid Apps Agreement effective August 4, 2026 through August 3, 2027
  with status `Active`, banking `Active`, and U.S. Form W-9 `Active` after its
  August 4 submission. Apple commerce readiness is confirmed; legal gates
  remain open.
- TestFlight feedback email and the exact beta description are saved. Internal
  group `CUT OS Internal QA` exists with automatic distribution off, the
  Account Holder assigned as its one internal tester, and exact build 3
  assigned. Apple reports the build `VALID` and `IN_BETA_TESTING`; physical-
  iPhone exact-build QA is not yet claimed.
- Replit hosting is owner-approved up to **$20/month before tax** and phone
  verification is complete. Replit is now serving exact source commit
  `08e62232db7f81047eec5b55a184f30fb7d4162a` as Reserved VM deployment
  `78b1854c`. After publish, development-data copy remained off, critical-
  vulnerability publish blocking remained on, and the production database was
  connected. The corrected startup logged direct client-side TLS attestation
  **PASS** at August 10, 2026, 12:47:01.28 PM America/Chicago. Exact-build
  `/status`, `/`, `/api/readyz`, and canonical Clerk proxy checks returned 200;
  `/privacy`, `/terms`, and `/support` are public and each returns 200 under the
  owner-deferred professional-review decision. Point-in-time recovery is on
  with a seven-day
  window. Replit Support confirmed its restore is in-place only, has no isolated
  target, leaves app code unchanged, and cannot roll forward. The destructive
  control remains untouched pending a separately approved recovery plan. The
  read-only provider-proxy incident and sanitized TLS
  evidence are recorded once in the
  [production infrastructure evidence](app-store/evidence/production-launch-infrastructure-2026-08-08.md).
  No billing or charge status is asserted here.
- Clerk production now uses the replacement free-Hobby application
  `app_3HeFFYD0GpUEjcPIlOwNYXAKUmo`, production instance
  `ins_3HeFLfOAbfStrVB4eW5b7sYOeAq`, and domain
  `dmn_3HeFLeuWzWg9xKNeG4o6PUUVHlb` for `getcutos.com`. Email/password with
  required email-code verification, Strict enumeration, lockout, Device Trust,
  bot protection, Native API, the exact iOS registration, and
  `https://getcutos.com/api/__clerk` are configured. Masked keys are active in
  Replit and EAS production, and bounded proxy health passes. The zero-user
  provider-domain tenant remains only for rollback and is not claimed revoked
  or deleted. No Clerk card, trial, paid-plan change, or new billing action was
  used. A Release-style iOS 27 dedicated zero-user simulator build, installed
  with Xcode **Sign to Run Locally**, passed a credential-safe equality check
  against the current EAS production Clerk publishable key and launched the real
  `Welcome back` UI without a new keychain error. This remains local-only:
  `clerk.getcutos.com` was NXDOMAIN during that rehearsal. Superseding public
  DNS verification at `2026-08-08T21:21:47Z` confirmed all five Clerk CNAMEs
  through an authoritative nameserver, Cloudflare, and Google; Clerk now shows
  the primary domain, DNS configuration, and proxy as Verified. No apex A, TXT,
  or DMARC record changed and no charge was incurred. At approximately
  `2026-08-08T21:27Z`, a user-provided simulator
  observation confirmed real signup-email delivery, successful user entry of
  the verification code, and an authenticated session reaching
  `Apple age check needed`; no account detail is recorded. The authenticated
  JavaScript path worked. A
  superseding EAS-production-environment arm64 Release simulator build, signed
  locally, linked and resolved `CutDeclaredAgeRange`, preserved the authenticated
  session to the DOB gate, and returned `not_required` from `getStatusAsync()`
  without a crash or fatal configuration, module, or keychain error. No DOB or
  account data was entered. The `/tmp` screenshot is ephemeral, not release
  evidence. `ios-simulator` and `production` share the pinned 26.4 EAS image,
  and the targeted native configuration suite passes 15/15. Native password
  recovery plus physical-device/TestFlight Apple Declared Age Range entitlement
  and API validation remain open. A bounded recheck at
  `2026-08-10T07:27:51Z` proved the canonical proxy still returns HTTP 200 with
  a valid certificate while the native SDK's direct Frontend API host
  `clerk.getcutos.com` fails during the TLS handshake before serving a
  certificate. Clerk shows the primary domain, DNS, and proxy as Verified but
  marks that direct host Optional. An existing Clerk ticket titled **Native
  AuthView TLS error** was acknowledged on August 9. On August 10, Clerk Support
  supplied public preview package `@clerk/expo@cfb6495`, upstream head
  `cfb64951dc6a2a47af7971bbff2b18dd66b59326`; CUT installed that exact snapshot
  and retired the local 4.2.0 patch. No reply was sent. Do not remove the working
  proxy or change the instance. The native
  route now avoids that failing direct-host path by resolving to Clerk's
  documented custom email-code flow through CUT's verified proxy. Source-level
  regression coverage and a production-environment iOS Hermes export confirm
  the custom flow is bundled and the removed native instructions are absent;
  exact signed-device request, code, password, session, and no-sign-up-transfer
  QA remains pending. At `2026-08-10T08:30:11Z`, an EAS-production-environment
  arm64 Release simulator build based on `d8cd698` plus the candidate patch
  verified a
  reproducible `@clerk/expo` patch that forwards CUT's existing proxy URL into
  the native iOS and Android Clerk SDK bootstrap. On a newly created zero-user
  iOS 27 simulator, the app opened the real `Welcome back` UI; process-specific
  logs showed successful TLS and HTTP 200 through
  `getcutos.com/api/__clerk`, with no direct-host request or TLS failure. The
  complete mobile suite passes 445/445. No email, code, password, account
  identifier, or external message was entered or sent. This is local
  Sign-to-Run-Locally evidence only. The snapshot exposed and enabled repair of
  token-refresh and same-principal route-remount races. A later
  EAS-production-environment arm64 Release simulator build reached the real CUT
  OS Pro Monthly `$4.99 per month` screen and remained alive on the same screen
  for more than 70 seconds. Authenticated requests remain no-store; tokens are
  never persisted or logged. A later cold-relaunch regression required the
  same-session refresh repair recorded above. Physical-device/TestFlight reset
  and purchase QA remain pending. Build 3 remains assigned in TestFlight but is
  ineligible for release; no current Apple-processed release candidate exists.
- Replit contains the exact CUT project, Apple app, entitlement, and offering
  REST IDs as non-secret configurations and the RevenueCat server API v2
  replacement secret saved masked. Replacement key
  `CUT Replit Production Replacement 2026-08-04` has Charts no access,
  Customer Information read/write, and Project Configuration read-only
  dashboard settings. Production Apple app `app8feee0dfba` is created for
  `com.zarifahmed.cut`, its subscription key is valid, and product
  `prod66e8dc0083` maps to `CUT_OS_PRO` (`entl8efd6d2c18`) and active default
  offering `ofrngeb5cc4a73c` (`CUT OS Pro`), which has one `$rc_monthly`
  package. Store status `MISSING_METADATA` and no transactions are Apple
  metadata, review-screenshot, and TestFlight gates rather than a mapping
  failure; the Test Store sibling is excluded from production claims. A public
  iOS SDK key is provisioned without recording its value. Decision 3 owner
  authorization is confirmed by the exact phrase
  `approve RevenueCat server-key replacement and Decision 3`; the old
  unconfigured key remains and has not been revoked. Apple has approved App
  Store Connect API access and the minimum App Manager team key intended only
  for RevenueCat product/price synchronization has been generated. Its private
  file remains outside the repository and has not been read or recorded here;
  direct RevenueCat inspection on August 8 now shows **Valid credentials** for
  both the In-App Purchase key configuration and App Store Connect API
  credential for exact app `app8feee0dfba`. The corrected,
  source-controlled read-only preflight passed from Replit on exact green
  commit `930a70eb4773b534c9d9fa33fb6030bdd6ee5a54`, verifying the exact CUT iOS
  mapping and bounded customer-read access. Dashboard evidence verifies
  customer read/write permission without issuing a test write or deletion.
  Apple server notifications show no notifications received. Exact-build native
  purchase and restore QA remain pending, and production continues to fail
  closed.
  The dashboard restore behavior is evidence-bound as Transfer to new App User
  ID.

## Highest-priority next slice

1. Keep the authenticated-session refresh repair and exact build 4 identity
   green and unchanged. After Apple makes the assigned build available, use it
   for the physical-iPhone authentication, age, purchase, restore, deletion,
   accessibility, relaunch, offline, and account-switch matrix. Resolve any
   issue, then cut the fresh final immutable build from the stabilized head; do
   not rewrite the pushed branch history.
2. Capture the final-build 6.9-inch listing set and subscription review image,
   inspect every image for personal data, and upload only approved PNG bytes.
3. Keep the published App Privacy and approved content, medical, tax, DSA, and
   EULA declarations bound to the replacement exact build. Complete only the
   remaining App Review contact/review-account access without claiming
   professional approval.
4. Attach the first subscription to version 1.0.0 only after its review image
   and exact-build purchase/restore evidence are complete.
5. Resolve every release validator error, obtain explicit owner confirmation,
   and only then submit the app-version and first subscription together for App
   Review. Preserve manual release after Apple approval.
6. Initiate legal and nutrition review within three calendar days after public
   release under the owner-deferred decision and stop-sales triggers. Do not
   send any outreach without separate owner confirmation.

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
confirmed. Apple signing and EAS/Apple authentication are complete; build 4 is
processed, assigned to internal TestFlight, and selected for version 1.0.0,
while Apple tester availability, physical-iPhone QA, screenshots, review
access, Submit for Review, and public release remain
owner-controlled gates. The approved App Privacy, content-rights, medical,
tax, DSA, and Standard-EULA decisions are now live. The owner has confirmed an
18+ launch position and App Store Connect now returns an effective 18+ rating.
Legal and nutrition review remain explicitly deferred until the first three
calendar days after public release and are not claimed complete.
