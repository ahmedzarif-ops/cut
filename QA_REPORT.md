# CUT OS — QA Report

> Spec §2: a control counts as implemented only after the interaction was
> exercised in the running iOS simulator; hardware behavior on a real iPhone.
> This report does not claim PASS for anything that was not actually run.

## Current launch addendum — August 10, 2026

The following live checkpoint supersedes earlier build/deployment counts in this
section:

- Exact EAS production build `dc2c2bfa-bec6-4112-bedd-eafbb81f4bc4`
  produced version 1.0.0 build 4 from repaired commit
  `b6d135dc334937c61f7e1f4847ec9b04d2fd6cd4`. Apple processed App Store
  Connect build `0b6ff58a-d236-4469-b471-8216cf5a91ee` as **Ready to Submit**.
  Build 4 is assigned to the internal group with notifications off and saved
  on the version 1.0.0 draft. It supersedes build 3 as the release candidate.
- The tester still shows `No Builds Available` after build 4 assignment. This
  independently reproduces the Apple-side TestFlight defect covered by support
  case `20000133994444`. No new invitation or support follow-up was sent.

- GitHub PR #9 is draft/open. Release code commit
  `08e62232db7f81047eec5b55a184f30fb7d4162a` has successful required checks and
  is the exact commit served by Replit; later evidence-only branch commits do
  not change that deployed build. The root,
  status, readiness, canonical Clerk proxy, Privacy, Terms, and Support routes
  pass.
- EAS production build `1fe435cf-9d8b-4eff-a1d3-bfb893b344a6` produced version
  1.0.0 build 3. Apple validated the same IPA, processed App Store Connect build
  `dce1d8df-cd9e-46d7-8607-dcde9570df2e` as `VALID` and
  `APP_STORE_ELIGIBLE`, attached it to the internal TestFlight group with
  automatic notifications off, and selected it for App Store version 1.0.0.
- The exact archive passes strict signature and entitlement checks. Apple now
  stores the v1 age questionnaire, calculates 9+ before the higher-age override,
  and returns an effective 18+ rating after the restored adults-only override.
- The exact nine-type, linked-to-user, no-tracking App Privacy disclosure is
  published. Content rights is No, the Standard Apple EULA remains selected,
  the parent app and monthly subscription use Fitness and Health tax treatment,
  the regulated-medical-device declaration is No, and the DSA record is active
  as non-trader/no planned EU distribution.
- Exact build 1.0.0 (3) is assigned to the internal group. After a
  notification-free rebind left the tester at `No Builds Available`, the owner
  approved exactly one Apple invitation email and the same internal Account
  Holder tester was re-added. App Store Connect reported one tester added, but
  the owner then reported no invitation received and the live tester row still
  showed `No Builds Available` despite bidirectional group/build assignment. No
  second email was sent. With explicit owner approval, Apple Developer Support
  case `20000133994444` was submitted at `2026-08-10T22:22:22Z` to request
  repair or diagnosis of that contradictory internal tester/build state. Apple
  will reply by email and provided no response-time guarantee. Apple-side
  availability, acceptance, and exact-build installation remain pending.
- Physical-iPhone exact-build authentication, purchase, restore, age, deletion,
  accessibility, and screenshot QA remain open. No App Review submission or
  public release is claimed.

- **1,417/1,417 automated tests pass:** 303 release operations, 62 App Store, 33
  domain, 4 database, 459 mobile, and 556 API.
- Root TypeScript, generated-code drift, working App Store validation,
  changed-file formatting, `.replit` parsing, migration drift, Expo dependency
  health, and a non-secret production-profile Expo bundle rehearsal pass. The
  rehearsal is not a signed EAS build, live-legal preflight, TestFlight build,
  or App Store acceptance.
- Production now accepts one explicit canonical HTTPS browser/Clerk ingress;
  provider-injected Replit development domains cannot widen it.
- The production public server exposes a zero-JavaScript, CSP-locked CUT launch
  page and blocks both origin and mounted Expo preview artifacts; the bounded
  live verifier checks the same contract.
- Production startup includes a bounded RevenueCat customer-permission check.
  Replacement API v2 key `CUT Replit Production Replacement 2026-08-04` has
  controlled non-secret dashboard evidence for Customer Information
  read/write, Project Configuration read-only, and Charts no-access settings.
  The corrected source-controlled, read-only live preflight passed from Replit
  on then-current green commit
  `930a70eb4773b534c9d9fa33fb6030bdd6ee5a54`,
  verifying the exact CUT iOS mapping and bounded customer-read access.
  Dashboard evidence verifies customer read/write permission without issuing a
  test write or deletion. At `2026-08-08T21:24:17Z`, direct RevenueCat
  inspection of app `app8feee0dfba` for `com.zarifahmed.cut` showed **Valid
  credentials** for both the required In-App Purchase key configuration and the
  owner-authorized App Store Connect API credential. Its machine status is now
  `verified`. Apple server notifications show no notifications received, and
  exact-build purchase, restore, and TestFlight evidence remains pending.
  Production write/delete behavior and exact-build restore-after-deletion QA
  remain open gates.
- Replit now has the exact RevenueCat project, Apple app, entitlement, and
  offering REST IDs as non-secret configurations and the replacement server
  API secret saved masked. Production Apple app `app8feee0dfba` is created for
  `com.zarifahmed.cut`, its subscription key is valid, and product
  `prod66e8dc0083` maps to `CUT_OS_PRO` and `default/$rc_monthly`. A public iOS
  SDK key is provisioned without recording its value. Active default offering
  `ofrngeb5cc4a73c` (`CUT OS Pro`) has one `$rc_monthly` package; the production
  Apple product is associated with `CUT_OS_PRO` (`entl8efd6d2c18`) and that
  offering. Store status `MISSING_METADATA` and zero transactions remain Apple
  metadata, review-screenshot, and TestFlight gates, not a mapping failure. The
  Test Store sibling remains excluded from production claims. Decision 3 owner
  authorization is confirmed; the old unconfigured RevenueCat key remains and
  has not been revoked. The production-shaped cross-app association and nullable
  duration verifier mismatch is resolved. Exact-build native purchase and
  restore QA remain pending, so production continues to fail closed.
- Replit now serves exact source commit
  `08e62232db7f81047eec5b55a184f30fb7d4162a` as Reserved VM deployment
  `78b1854c`. Exact-head GitHub Actions run `31425815282` reports both required
  checks successful. Post-publish development-data copy remained off, critical-
  vulnerability blocking remained on, and the production database was
  connected. Corrected startup TLS attestation and the exact-build status,
  readiness, root, and canonical Clerk proxy checks pass; legal routes now
  return 200 under the owner-deferred review decision. Replit Support confirmed
  PITR is in-place only and cannot
  roll forward; the destructive restore remains unexercised. See the
  [production infrastructure evidence](app-store/evidence/production-launch-infrastructure-2026-08-08.md)
  for the read-only provider-proxy incident and fixed, sanitized attestation
  result. No billing or charge status is asserted by this evidence.
- App Store Connect app ID `6798020879`, subscription group ID `22286645`, and
  subscription ID `6798020349` are evidence-bound in the machine record. The
  factual credential-free subscription Review Notes are saved, but the product
  remains Prepare for Submission, unattached to version 1.0.0, without the
  review screenshot, and without a defensible price-effective timestamp.
- The `CUT OS Internal QA` TestFlight group is configured with automatic
  distribution off, the approved public feedback email, and the repository beta
  description. The Account Holder is its one internal tester and exact build
  1.0.0 (3) is assigned. The one owner-approved tester re-add was performed, but
  Apple has not yet surfaced the build or delivered an invitation according to
  the owner's latest check. No second email was sent; acceptance, installation,
  and exact-build QA are not yet claimed.
- Database statements, startup migrations, API/public-server shutdown, and
  readiness recovery now have cross-tested timeout boundaries. Metro receives
  an allowlist with dotenv loading disabled instead of the server environment.
- Target-aware strict validation intentionally remains fail closed until owner,
  legal, production-service, exact-build, screenshot, and App Store Connect
  evidence is complete.
- Release evidence now rejects prose-only monitoring thresholds and unsafe
  application-only rollback after any completed migration. It binds a closed
  migration class, pre-deploy write cutoff, covered recovery point, prior-API
  compatibility, distinct tested recovery procedures, structured alert
  thresholds, approvals, and owners.
- The evidence verifier now accepts only the immutable
  `BUILD_SHA -> APP_REVIEW_EVIDENCE_SHA -> PUBLIC_RELEASE_EVIDENCE_SHA` chain.
  The transition preserves the first manifest, build/deployment identity,
  screenshots, account attestations, and every submission field except root
  `updated`, the target-state Clerk/Apple evidence fields, and the three Clerk
  shutdown-closure fields.
- Clean Expo iOS prebuild is idempotent with the CUT scene-lifecycle and pod-
  target plugins. The generated Podfile passes Ruby parsing and CocoaPods 1.16.2;
  installation resolves 98 dependencies and 99 total pods, all 222 current pod
  deployment-target settings resolve to iOS 17.0, a simulated future 19.0
  requirement remains 19.0, and unknown expressions fail closed.
- A fresh clean rehearsal also passed a production-only mobile install with all
  32 runtime packages and no direct development-package links, Expo Doctor
  18/18, a generic-iPhone unsigned Release archive, and a 118-file native app
  secret scan with zero findings. This is structural evidence only, not a signed
  EAS/TestFlight archive or physical-device result.
- An unsigned Xcode 27 Release simulator compile and iOS 27 scene-launch
  rehearsal pass. A separately produced Hermes release bundle was installed in
  that app; the process remained running with an active `UIWindowScene`, and the
  prior missing-scene launch assertion did not recur. This is not a signed
  archive, EAS build, TestFlight build, physical-iPhone result, or full product
  tap-through.
- A subsequent Release-style build was installed on a dedicated iOS 27
  zero-user simulator with Xcode **Sign to Run Locally**. A value-free equality
  check confirmed the exact current EAS production Clerk publishable key was in
  the bundle. The app launched the real `Welcome back` UI and produced no new
  keychain error during the observed launch at `2026-08-08T21:07:02Z`. The
  non-durable local screenshot reference and fingerprint are recorded in
  [production launch infrastructure evidence](app-store/evidence/production-launch-infrastructure-2026-08-08.md#bounded-local-ios-simulator-rehearsal).
  This is local simulator evidence, not signed/TestFlight QA. Native Clerk
  recovery remained blocked during this rehearsal because
  `clerk.getcutos.com` was NXDOMAIN. Superseding public DNS verification at
  `2026-08-08T21:21:47Z` confirmed all five required Clerk CNAMEs through an
  authoritative nameserver, Cloudflare, and Google; Clerk now shows its primary
  domain, DNS configuration, and proxy as Verified. No apex A, TXT, or DMARC
  record changed and no charge was incurred. DNS verification alone did not
  prove direct-host TLS, email, or code behavior. At approximately
  `2026-08-08T21:27Z`, a user-provided simulator observation confirmed real
  signup-email delivery, successful user entry of its verification code, and an
  authenticated session reaching `Apple age check needed`; no account detail is
  recorded. This closes signup email/code acceptance, not password recovery or
  age verification. The authenticated JavaScript path worked. At
  `2026-08-10T07:27:51Z`, the canonical proxy returned HTTP 200 with a valid
  certificate while `clerk.getcutos.com` failed its TLS handshake before
  serving a certificate. The Clerk dashboard shows the primary domain, DNS, and
  proxy as Verified but the direct host as Optional. This blocks native
  recovery; it does not invalidate the working proxy or authenticated
  JavaScript path. No proxy or instance change was made.
- A superseding EAS-production-environment arm64 Release simulator build, signed
  locally, linked and resolved `CutDeclaredAgeRange`, preserved the authenticated
  session to the DOB gate, and returned `not_required` from `getStatusAsync()`
  on the simulator. It produced no crash or fatal configuration, module, or
  keychain error, and no DOB or account data was entered. Its `/tmp` screenshot
  is ephemeral and is not durable release evidence. `ios-simulator` and
  `production` both pin `macos-tahoe-26.4-xcode-26.4`; the targeted native
  release-configuration suite passes 15/15. Native password recovery and exact
  physical-device/TestFlight Apple Declared Age Range entitlement/API
  validation remain pending.
- Native configuration keeps the dark launch screen's status bar readable and
  uses Clerk Support's exact public `@clerk/expo@cfb6495` preview, upstream head
  `cfb64951dc6a2a47af7971bbff2b18dd66b59326`, without the optional Google
  Sign-In package or pod. The prior local 4.2.0 patch is retired. Expo
  introspection and native autolinking checks enforce both conditions.
- App Store password recovery now resolves to Clerk's documented custom
  email-code flow on native and uses CUT's verified same-origin Clerk proxy;
  the direct-host native `AuthView` override has been removed. Public web keeps
  Clerk's prebuilt `SignIn` with sign-up and transfer disabled. Source and
  auth-flow regression tests pass. A production-environment iOS Hermes export
  also contains the generic custom-recovery and session-isolation code while
  excluding the removed native instructions; this is an unsigned structural
  rehearsal, not TestFlight evidence. An exact signed physical-device reset
  remains pending. The development tenant has Strict enumeration protection enabled.
- A later EAS-production-environment arm64 Release simulator build based on
  `d8cd698` plus the candidate patch applies a reproducible pnpm repair to
  `@clerk/expo` 4.2.0 so
  the configured same-origin proxy reaches both native Clerk SDK bridges. On a
  newly created zero-user iOS 27 simulator, CUT opened the real `Welcome back`
  UI. Exact-process logs showed successful TLS and HTTP 200 through
  `getcutos.com/api/__clerk`, with no request to the failing direct host. A
  prior disposable simulator's invalid local session received HTTP 401 and was
  deleted; the preserved release-QA simulator and server account were not
  changed. No email, code, password, account identifier, or external message
  was entered or sent. Proxy/recovery tests pass 8/8 and the mobile suite passes
  445/445. This remains local Sign-to-Run-Locally evidence, not a completed
  reset, signed EAS archive, TestFlight result, or physical-device result.
- Clerk Support's snapshot fixed native proxy propagation. Follow-on runtime QA
  exposed and enabled repair of token-refresh and same-principal route-remount
  races. A final EAS-production-environment arm64 Release simulator build
  reached the real CUT OS Pro Monthly `$4.99 per month` screen and remained
  alive on that screen for more than 70 seconds. Tokens were neither logged nor
  persisted, and authenticated traffic remains no-store. This closes the local
  `Account check needed` loop only; exact signed-device password recovery,
  purchase/restore, Apple age API, and TestFlight QA remain pending. No reply was
  sent to Clerk.
- A stronger cold-relaunch check later exposed the remaining failure after the
  short-lived Clerk bearer token had expired. The candidate now clears and
  touches only the same active Clerk session before the coordinator's single
  cache-bypassing refresh and safe GET replay. Installed over the preserved
  authenticated simulator without an uninstall, it reached the `$4.99 per
month` paywall, stayed there beyond token expiry, and returned there after a
  cold relaunch. The complete mobile suite passes 462/462, the App Store and
  screenshot suite passes 64/64, root TypeScript passes, and no fatal or crash
  line was observed. Build 3 predates this repair and is ineligible; exact build
  4 contains the repair and is now processed and assigned. Physical TestFlight
  acceptance remains required. See
  [local-auth-refresh-candidate-2026-08-10.md](app-store/evidence/local-auth-refresh-candidate-2026-08-10.md).
- Clerk production now uses free-Hobby application
  `app_3HeFFYD0GpUEjcPIlOwNYXAKUmo`, production instance
  `ins_3HeFLfOAbfStrVB4eW5b7sYOeAq`, and domain record
  `dmn_3HeFLeuWzWg9xKNeG4o6PUUVHlb` for `getcutos.com`. Email/password with
  required email-code verification, Strict enumeration, lockout, Device Trust,
  bot protection, Native API, exact iOS registration, and same-origin proxy are
  configured. Masked keys are active in Replit and EAS production; bounded
  proxy health passes. The original provider-domain tenant had zero users and
  remains only as rollback, with no revocation or deletion claim. No Clerk card,
  trial, paid-plan change, or new billing action occurred. Every pre-cutover
  binary is ineligible, exact build 3 is assigned in internal TestFlight, and
  signed physical-iPhone QA remains pending.
- The exact $4.99 monthly/no-trial/Family-Sharing-off offer is now bound to the
  recorded names, identifiers, U.S. price, 45-character description, and
  `use_app_name` choice. Working validation rejects changes even if a matching
  decision object is edited in the same patch.
- StoreKit offer loading now fails closed on empty, whitespace-padded,
  control-character, oversized, or digit-free display fields and withholds the
  purchase package. Legitimate localized Unicode prices remain byte-for-byte
  unchanged.
- The settled one-plan paywall has a conservative 6.9-inch vertical budget and
  keeps the real StoreKit title, description, price, purchase/recheck/restore/
  manage controls, renewal disclosure, legal/support links, and sign-out
  visible with 44-point-or-larger targets. Exact-build viewport capture remains
  a signed-device evidence gate.
- Public iPhone-only distribution is saved in App Store Connect with Mac and
  Vision Pro opted out. The configured 1024px opaque icon is SHA-256-bound and
  technically inspected by the release validator.
- Apple's live commerce page now shows the Paid Apps Agreement effective August
  4, 2026 through August 3, 2027 with status `Active`, banking `Active`, and U.S.
  Form W-9 `Active` after its August 4 submission. All three Apple commerce
  readiness gates are confirmed.
- Light/dark status-bar contrast now follows the active surface from launch
  through the loaded app. The audited onboarding, Today, Settings,
  subscription-management, and recovery controls now expose explicit roles,
  labels, disabled states, and minimum target sizes where applicable.
- Sign-up has separate 18+ and provisional Terms/Privacy controls. Durable
  counsel-approved assent evidence remains an open legal gate.
- The Settings source contract protects the visible warning that deleting CUT
  does not cancel Apple billing, the App Store subscription-management route,
  and the explicit destructive confirmation action.
- Replit native/simulator wording in the historical table below is not the
  launch acceptance boundary. The authoritative native gate is the exact signed
  TestFlight build on a physical iPhone.

## Historical automated checkpoint — August 3, 2026

This was the August 3 local automated checkpoint for the balanced-meal,
durable-account-deletion, `adult-18-v1` eligibility, and iOS release-configuration
foundations. It is not native/App Store acceptance. The post-commit
generated-code drift check and commit SHA are recorded separately.

| Gate item                           | Result             | Evidence                                                                                                                                                                                                        |
| ----------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript gate                     | PASS               | Root `pnpm run typecheck` passed across libraries, API, mobile, mockup sandbox, and scripts.                                                                                                                    |
| Automated tests                     | PASS               | 565 tests across 59 files: release operations 15, App Store artifacts 14, domain 33, database 4, mobile 239, API 260.                                                                                           |
| Generated API contract              | PASS               | Generated React Query/zod output matches OpenAPI; bearer authentication is global for private operations, while `/healthz` and guarded `/readyz` are explicitly public.                                         |
| Expo dependency compatibility       | PASS               | `expo install --check` passes after aligning Expo to `54.0.36`.                                                                                                                                                 |
| Expo Doctor                         | PASS               | Expo Doctor `1.20.1` passes all 18/18 checks.                                                                                                                                                                   |
| Frozen dependency install           | PASS               | pnpm `10.34.5` accepts the committed lockfile with `--frozen-lockfile`; required esbuild postinstall succeeds.                                                                                                  |
| Dependency security audit           | PASS (high gate)   | The full runtime-and-build graph has no known high/critical advisories; CI enforces this. Five moderate and two low EAS-CLI-only transitive findings remain monitored.                                          |
| Expo iOS bundle rehearsal           | PASS               | Expo/Metro bundled 1,756 modules and emitted a 7.37 MB iOS Hermes bundle plus assets in a 17 MB disposable export. This was not a native archive or App Store build.                                            |
| Release environment preflight       | PASS (automated)   | Production requires all seven public values, a structurally valid live Clerk key, public DNS/HTTPS resources, and the exact same-origin `/api/__clerk` proxy without logging values.                            |
| Native release config introspection | PASS (generated)   | Bundle ID resolves; arbitrary loads are disabled; exempt-only encryption is declared; the privacy baseline resolves; disposable native generation sets every iOS target to 17.0.                                |
| Auth transport origin isolation     | PASS (automated)   | Getter-supplied and caller-supplied bearer headers are refused before fetch unless the final target matches the configured HTTPS API origin.                                                                    |
| Legal and support controls          | PASS (fail closed) | Safe destinations and accessible controls are wired; draft validation passes, while production EAS stops before install until approved local and exact live legal bytes both pass.                              |
| Clerk launch loading/error states   | PASS (compiled)    | Clerk startup is wrapped by an outer boundary, explicit loading screen, bounded timeout, and retry that remounts only the Clerk provider; native visual behavior remains device QA.                             |
| Password recovery                   | SUPERSEDED         | The custom email-code result tests remain useful fallback coverage, but App Store and public-web recovery now use Clerk's prebuilt sign-in-only components; see the current addendum.                           |
| Authoritative purchase recheck      | PASS (automated)   | Paywall purchase/restore/recheck paths single-flight the server refresh, fence account changes, update only the scoped cache, and never unlock from local StoreKit state alone.                                 |
| App Store artifact gate             | PASS (fail closed) | The working metadata/privacy/screenshot records validate; release mode rejects 64 unresolved exact-build QA, screenshot, review-account, security, submission, and evidence requirements.                       |
| Deployment evidence gate            | PASS (automated)   | Bounded sanitized probes cover liveness, readiness, auth guards, exact public indexing, internal noindex/robots behavior, redirects, timeouts, and response-size limits.                                        |
| Database migration                  | PASS               | Blank PGlite builds all current tables; profile minimization, deletion lifecycle/hash, finite nutrition, replay tombstone, retry-index, and baseline reapply checks pass.                                       |
| Production API readiness            | PASS (automated)   | Exact-head startup tests enforce configuration normalization before pool creation and migration, readiness, then direct TLS attestation before bind; current live evidence is linked in the addendum.           |
| Today state                         | PASS (automated)   | Request-scoped device-local day, two-device separation, private no-store/vary headers, and deterministic Next Action fixtures.                                                                                  |
| Device timezone synchronization     | PASS (automated)   | Valid IANA resolution, serialized writes, foreground/one-minute rechecks, retry-loop prevention, response validation, account-switch fencing, and pre-purchase settings are covered.                            |
| Timezone/local-midnight behavior    | PENDING NATIVE QA  | A real release build must prove first sync, relaunch persistence, travel/device-zone resync, and correct local-midnight rollover before daily screens unlock.                                                   |
| Daily weigh-in create/update        | PASS (automated)   | API/service tests save and replace today's weight; the client-reviewed day is required and a stale midnight/travel retry fails before writing.                                                                  |
| Double-tap duplicate protection     | PASS (automated)   | Repeated same-day writes return the same ID and one row.                                                                                                                                                        |
| Cross-user weight isolation         | PASS (automated)   | User B's history remains empty after User A logs weight.                                                                                                                                                        |
| Metric/imperial conversion          | PASS (automated)   | Shared domain conversion round-trip and display rounding tests.                                                                                                                                                 |
| Curated meal catalog                | PASS (automated)   | Six fixed recipes; exact FDC calculation synchronization, Bengali/Desi presence, ingredients, nutrition, ranking, and ID uniqueness tested. Professional review remains open.                                   |
| Meal create/retry                   | PASS (automated)   | Identical and simultaneous retries return one snapshot; cross-midnight recovery preserves its day; stale preconditions fail closed.                                                                             |
| Meal edit/delete/totals             | PASS (automated)   | Serving updates rescale snapshots; repeat delete is safe; a delayed create cannot resurrect a deleted row; totals return to first-meal state.                                                                   |
| Cross-user meal isolation           | PASS (automated)   | Another authenticated user cannot list, edit, or delete the owner's entry.                                                                                                                                      |
| Meal local-day ownership            | PASS (automated)   | Server validates the echoed reviewed day against the request device's IANA timezone and rejects a new stale-day request.                                                                                        |
| Nutrition snapshot stability        | PASS (automated)   | Logged per-serving values are stored in the entry and daily totals derive from saved snapshots.                                                                                                                 |
| Native meal helper tests            | PASS               | Serving/preview helpers plus durable owner/session-bound meal intent parsing, persistence ordering, principal-switch guards, and catalog-degraded screen states pass.                                           |
| Dark-mode control contrast          | PASS (automated)   | Primary, destructive, and success control foreground/background pairs meet WCAG AA contrast in the dark palette.                                                                                                |
| Native app typecheck                | PASS               | Generated hooks, weight/meal flows, legal links, release-config gate, Clerk launch states, Settings, deletion gate, retry states, and principal isolation compile together.                                     |
| Deletion cascade and isolation      | PASS (automated)   | Profile, weight, and meal rows cascade while another user's rows remain intact.                                                                                                                                 |
| Tombstone/JIT guard                 | PASS (automated)   | Pre/post-provision checks return `410`; a completed-delete race cannot leave a replacement user or reach the handler.                                                                                           |
| Clerk failure and worker retry      | PASS (automated)   | Only a verified Clerk API `404` is terminal; raw-ID/hash mismatches never call Clerk; bounded retry remains durable.                                                                                            |
| Deletion concurrency/idempotency    | PASS (automated)   | Concurrent/repeated staging is monotonic, never regresses completed state, and avoids false success.                                                                                                            |
| Mobile deletion marker/gate helpers | PASS (automated)   | Owner-scoped markers fail closed; terminal cleanup removes sensitive meal recovery first, stays retryable on SecureStore/sign-out failure, and preserves principal fencing.                                     |
| Second-session deletion propagation | PASS (automated)   | Normal-endpoint `410` removes private cache immediately; status refreshes on mount, foreground focus, and every 60 active seconds.                                                                              |
| Adult UTC date rule                 | PASS (automated)   | Controlled-clock domain tests cover exact 18th birthday, one day short, malformed/future dates, and March 1 treatment of a February 29 birth.                                                                   |
| Adult API authorization             | PASS (automated)   | API tests prove fail-closed `428` for unverified/stale state, `403` for ineligible, monotonic decisions, and continued deletion/status access.                                                                  |
| Adult migration and minimization    | PASS (automated)   | Migration/service tests cover existing-user recheck, birth-year removal, email clearing/eligible restore, and schemas without raw-DOB persistence.                                                              |
| Adult native eligibility gate       | PENDING NATIVE QA  | Must fail closed before private queries/screens, across offline/relaunch/deep-link/account-switch paths, while preserving deletion/settings access.                                                             |
| Principal cache lifecycle           | PENDING NATIVE QA  | The layout implementation compiles; shared-device account switching and query-cache clearing require native exercise.                                                                                           |
| Native simulator tap-through        | PARTIAL LOCAL      | Xcode 27 and iOS 27 Simulator compiled and kept an unsigned scene-enabled Release app alive. Full flows were not exercised; the exact signed TestFlight build on a physical iPhone remains the launch boundary. |
| Real iPhone interaction             | BLOCKED            | Device, development build, and owner authentication required.                                                                                                                                                   |
| Real Clerk account deletion         | BLOCKED            | Requires a configured development tenant/server key plus native app-kill, retry, and second-device exercise.                                                                                                    |

### Required next native script

1. Sign in and complete onboarding.
2. Confirm Today shows **Log your morning weigh-in**.
3. Enter a weight in the selected unit and double-tap Log.
4. Confirm one saved entry, **WEIGH-IN COMPLETE**, and Next changes to **Build your first balanced meal**.
5. Kill/relaunch and confirm the saved weight and new Next Action remain.
6. Update the same day's weight and confirm it replaces rather than duplicates.
7. Sign out and confirm protected data is inaccessible.

### Required device-timezone and local-day script

1. On a supported physical iPhone set to a non-UTC zone, sign in with a fresh
   eligible account whose server timezone is still `UTC` and has no
   subscription. Confirm the app synchronizes the named device timezone before
   exposing any daily paid screen; the account-settings PATCH must work without
   consulting RevenueCat or exposing paid data.
2. With the timezone PATCH delayed, offline, or failed, confirm Today, weigh-in,
   and meals remain locked behind **Local day needed** while Settings, retry,
   sign-out, deletion, and legal/support controls remain reachable.
3. Restore connectivity and tap retry. Confirm the successful response matches
   the current internal account and target timezone, then verify the correct
   purchase/daily gate opens. Kill and relaunch; confirm the server value
   persists and no unnecessary write loop occurs.
4. Change the device to a different real IANA zone as a travel simulation,
   keep the app foregrounded for at least one minute, then background/foreground
   and relaunch it. Confirm each path detects the new zone, locks daily data,
   synchronizes, and reopens only with the new request context. Repeat during a
   deliberately slow prior request and confirm an older response cannot
   overwrite the newer target.
5. Switch accounts while a timezone request is in flight. Confirm the late
   prior-account response cannot update the new account's cache or unlock its
   private screens.
6. Sign in to the same synthetic account on two devices set to zones on opposite
   calendar days. Confirm each device reads and saves only its own local day,
   even while both remain active and the account preference changes.
7. Exercise both sides of local midnight in a zone with daylight-saving rules.
   Confirm Today, weigh-ins, meal creation/recovery, and daily totals read and
   write the same correct local calendar day, then roll to exactly one new day
   after local midnight.
8. Simulate a lost weigh-in response immediately before midnight or a device-
   zone change. Retry the unchanged screen and confirm the server rejects the
   stale reviewed day, refreshes Today, and never creates a second-day entry
   without a new review/save.

### Required balanced-meal native script

1. Complete onboarding and today's weigh-in; tap **Open balanced meals**.
2. Confirm six options load, including Bengali and Desi choices, and ingredient/allergen/estimate disclosures are visible.
3. With VoiceOver, confirm the selected radio state, serving controls, meal preview, and save button are announced in order.
4. Change servings, double-tap Log rapidly, and confirm exactly one meal is saved.
5. Confirm Today shows nutrition totals and Next changes to **Review today’s meals**.
6. Relaunch and confirm the entry persists; adjust the serving and confirm totals rescale.
7. Force-close after sending but before confirmation; relaunch and verify the
   exact saved request before any other meal control becomes available.
8. Cross local midnight with a saved recovery intent and confirm it cannot move
   into the new day. Delete the meal, repeat delete/replay, and confirm it does
   not reappear.
9. Repeat loading/error/retry checks with a poor connection, plus light/dark mode and large text.

### Required account-deletion native script

1. Use a Clerk development user with saved profile, weigh-in, and meal data;
   confirm another user also has data that must remain untouched.
2. Open **Settings → Delete account**. Confirm the subscription warning and
   Apple management link are visible; cancel once and confirm nothing changes.
3. Start deletion with a poor/offline connection. Confirm private screens remain
   gated, the pending/retry state is visible, and killing/relaunching the app
   resumes safely without reporting false success.
4. Restore connectivity and retry. Confirm terminal completion signs the user
   out and clears both owner-scoped device recovery records plus in-memory
   query state.
5. Confirm Clerk no longer contains the identity; the internal user, profile,
   weigh-ins, and meals are gone; the completed tombstone contains no raw Clerk
   ID; the other user's rows are unchanged.
6. Attempt access from a surviving second-device session. Confirm normal APIs
   reject access (`401` if Clerk invalidates the session, otherwise `410` from
   the tombstone guard), private cached data disappears immediately after a
   `410`, and a foreground idle screen detects status within the 60-second poll
   window without JIT-provisioning a replacement account.
7. Sign in as the other user on the shared first device. Confirm no prior user's
   marker, cached values, or deletion state appears.
8. Verify deleting CUT OS did not silently cancel an App Store subscription and
   the Apple subscription-management path remains available.

### Required adults-only native script

1. Before sign-up, confirm the adults-18+ notice/local precheck appears if that
   defense-in-depth flow ships. Confirm it does not claim to verify identity or
   authorize server access.
2. Create/sign in to a new account. Before entering DOB, deep-link to Today,
   profile, weight, and meal screens and exercise offline/relaunch paths. Confirm
   no private screen, cached health data, guidance, paywall, trial, or purchase
   path appears; private APIs return `428`.
3. Submit a malformed, impossible, missing, and future DOB. Confirm each fails
   without echoing or retaining the input and the account remains unverified.
4. Using controlled synthetic dates and a test server clock, confirm one day
   short returns/stays ineligible (`403`) and the exact UTC 18th birthday becomes
   eligible. Confirm a February 29 birth becomes eligible March 1 in a non-leap
   18th year.
5. For an ineligible account, confirm only the adults-only stop screen,
   restricted Settings, Terms, Privacy, Support, sign out, account-deletion
   status, and Delete Account remain available. Confirm there is no DOB
   correction/retry, guidance, private data, or subscription path. After a later
   synthetic 18th birthday, confirm the identity remains ineligible; deletion
   plus a new account/identity is the only v1 adult-access path.
6. Inspect device storage, network responses, server/database state, Clerk
   metadata, logs, analytics/crash tooling, and support payloads. Raw DOB must
   not appear anywhere after the transient decision; only status, policy
   version, and decision time may persist.
7. Start with a pre-policy existing account whose profile has birth year and
   whose onboarding flag is true. Confirm migration drops birth year, clears the
   local email copy, and forces a recheck; no grandfathering is allowed. Confirm
   an eligible decision restores email from Clerk while unverified/ineligible
   local rows retain no email.
8. Switch among eligible, unverified, and ineligible users on one device. Confirm
   private query state and transient form memory never cross principals. Repeat
   after kill/relaunch, offline launch, foregrounding, and reinstall.
9. Complete eligible onboarding and the normal Today/weight/meal happy path.
   Confirm account deletion still works in every eligibility state.
10. Repeat the full flow with VoiceOver, large text, light/dark mode, poor
    network, and the exact release build supplied to App Review.

## Historical Phase 0 audit

Historical Phase 0 findings remain in `PHASE_0_CLAUDE_AUDIT.md`. The current
verification table above supersedes its test counts and environment status; do
not use the historical snapshot as release evidence.

## Known limitations

- Email on the internal user record depends on an `email` claim in the Clerk
  session token; default session tokens may not include it (audit finding
  P1-2 in PHASE_0_CLAUDE_AUDIT.md).
- Local simulator evidence is limited to an unsigned scene-launch rehearsal;
  no signed-build physical-device flow or real-Clerk deletion QA has been
  performed. Automated and local evidence is limited to rows explicitly marked
  PASS or PARTIAL LOCAL.
- The configured privacy manifest is an engineering baseline. It must still be
  reconciled against the signed `.xcarchive`, every embedded SDK, production
  service behavior, the public policy, and App Store Connect answers.
- The full dependency audit has no high/critical findings. Five moderate and
  two low findings remain only in pinned EAS CLI transitive dependencies
  (`uuid` old-major paths and `ts-deepmerge`). Forcing their patched major
  versions could break the release CLI, so they remain tracked until an
  upstream-compatible EAS release clears the workspace's 24-hour package-age
  gate.
- The owner approved adults-only policy `adult-18-v1`, and automated
  server/domain/mobile enforcement is implemented and passing. Public launch
  remains blocked until native-device and live-Clerk acceptance pass; Terms,
  Privacy, public support/legal URLs, jurisdictional age-assurance, and Apple
  metadata receive qualified review; live RevenueCat purchase flows pass; and
  reproducible nutrition/allergen professional review is complete.
