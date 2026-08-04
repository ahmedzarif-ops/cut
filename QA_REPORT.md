# CUT OS — QA Report

> Spec §2: a control counts as implemented only after the interaction was
> exercised in the running iOS simulator; hardware behavior on a real iPhone.
> This report does not claim PASS for anything that was not actually run.

## Current launch addendum — August 4, 2026

- **982/982 automated tests pass:** 86 release operations, 39 App Store, 33
  domain, 4 database, 367 mobile, and 453 API.
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
- Production startup performs a bounded RevenueCat customer-read permission
  check. Customer write/delete permission, both Apple credential settings, and
  restore behavior remain direct dashboard evidence gates, with exact-build
  restore-after-deletion QA required after internal TestFlight upload.
- Database statements, startup migrations, API/public-server shutdown, and
  readiness recovery now have cross-tested timeout boundaries. Metro receives
  an allowlist with dotenv loading disabled instead of the server environment.
- Strict release validation intentionally fails with **285** diagnostics until
  owner, legal, production-service, exact-build, screenshot, and App Store
  Connect evidence is complete.
- App Store password recovery now uses Clerk's prebuilt sign-in-only native
  `AuthView`; public web uses Clerk's prebuilt `SignIn` with sign-up and transfer
  disabled. The development tenant has Strict enumeration protection enabled.
- Authentication remains pending signed physical-iPhone evidence and equivalent
  Strict/Native API configuration in the future production tenant.
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

| Gate item                           | Result             | Evidence                                                                                                                                                                              |
| ----------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript gate                     | PASS               | Root `pnpm run typecheck` passed across libraries, API, mobile, mockup sandbox, and scripts.                                                                                          |
| Automated tests                     | PASS               | 565 tests across 59 files: release operations 15, App Store artifacts 14, domain 33, database 4, mobile 239, API 260.                                                                 |
| Generated API contract              | PASS               | Generated React Query/zod output matches OpenAPI; bearer authentication is global for private operations, while `/healthz` and guarded `/readyz` are explicitly public.               |
| Expo dependency compatibility       | PASS               | `expo install --check` passes after aligning Expo to `54.0.36`.                                                                                                                       |
| Expo Doctor                         | PASS               | Expo Doctor `1.20.1` passes all 18/18 checks.                                                                                                                                         |
| Frozen dependency install           | PASS               | pnpm `10.34.5` accepts the committed lockfile with `--frozen-lockfile`; required esbuild postinstall succeeds.                                                                        |
| Dependency security audit           | PASS (high gate)   | The full runtime-and-build graph has no known high/critical advisories; CI enforces this. Five moderate and two low EAS-CLI-only transitive findings remain monitored.                |
| Production-style iOS export         | PASS               | Expo/Metro bundled 1,756 modules and emitted a 7.37 MB iOS Hermes bundle plus assets in a 17 MB disposable export.                                                                    |
| Release environment preflight       | PASS (automated)   | Production requires all seven public values, a structurally valid live Clerk key, public DNS/HTTPS resources, and the exact same-origin `/api/__clerk` proxy without logging values.  |
| Native release config introspection | PASS (generated)   | Bundle ID resolves; arbitrary loads are disabled; exempt-only encryption is declared; the privacy baseline resolves; disposable native generation sets every iOS target to 17.0.      |
| Auth transport origin isolation     | PASS (automated)   | Getter-supplied and caller-supplied bearer headers are refused before fetch unless the final target matches the configured HTTPS API origin.                                          |
| Legal and support controls          | PASS (fail closed) | Safe destinations and accessible controls are wired; draft validation passes, while production EAS stops before install until approved local and exact live legal bytes both pass.    |
| Clerk launch loading/error states   | PASS (compiled)    | Clerk startup is wrapped by an outer boundary, explicit loading screen, bounded timeout, and retry that remounts only the Clerk provider; native visual behavior remains device QA.   |
| Password recovery                   | SUPERSEDED         | The custom email-code result tests remain useful fallback coverage, but App Store and public-web recovery now use Clerk's prebuilt sign-in-only components; see the current addendum. |
| Authoritative purchase recheck      | PASS (automated)   | Paywall purchase/restore/recheck paths single-flight the server refresh, fence account changes, update only the scoped cache, and never unlock from local StoreKit state alone.       |
| App Store artifact gate             | PASS (fail closed) | The working metadata/privacy/screenshot records validate; release mode rejects 87 unresolved owner, live-service, security, declaration, evidence, and capture requirements.          |
| Deployment evidence gate            | PASS (automated)   | Bounded sanitized probes cover liveness, readiness, auth guards, exact public indexing, internal noindex/robots behavior, redirects, timeouts, and response-size limits.              |
| Database migration                  | PASS               | Blank PGlite builds all current tables; profile minimization, deletion lifecycle/hash, finite nutrition, replay tombstone, retry-index, and baseline reapply checks pass.             |
| Production API readiness            | PASS (automated)   | Startup validates live config/TLS, migrates under a bounded advisory lock, verifies the exact latest revision before bind, and single-flights cached readiness probes.                |
| Today state                         | PASS (automated)   | Request-scoped device-local day, two-device separation, private no-store/vary headers, and deterministic Next Action fixtures.                                                        |
| Device timezone synchronization     | PASS (automated)   | Valid IANA resolution, serialized writes, foreground/one-minute rechecks, retry-loop prevention, response validation, account-switch fencing, and pre-purchase settings are covered.  |
| Timezone/local-midnight behavior    | PENDING NATIVE QA  | A real release build must prove first sync, relaunch persistence, travel/device-zone resync, and correct local-midnight rollover before daily screens unlock.                         |
| Daily weigh-in create/update        | PASS (automated)   | API/service tests save and replace today's weight; the client-reviewed day is required and a stale midnight/travel retry fails before writing.                                        |
| Double-tap duplicate protection     | PASS (automated)   | Repeated same-day writes return the same ID and one row.                                                                                                                              |
| Cross-user weight isolation         | PASS (automated)   | User B's history remains empty after User A logs weight.                                                                                                                              |
| Metric/imperial conversion          | PASS (automated)   | Shared domain conversion round-trip and display rounding tests.                                                                                                                       |
| Curated meal catalog                | PASS (automated)   | Six fixed recipes; exact FDC calculation synchronization, Bengali/Desi presence, ingredients, nutrition, ranking, and ID uniqueness tested. Professional review remains open.         |
| Meal create/retry                   | PASS (automated)   | Identical and simultaneous retries return one snapshot; cross-midnight recovery preserves its day; stale preconditions fail closed.                                                   |
| Meal edit/delete/totals             | PASS (automated)   | Serving updates rescale snapshots; repeat delete is safe; a delayed create cannot resurrect a deleted row; totals return to first-meal state.                                         |
| Cross-user meal isolation           | PASS (automated)   | Another authenticated user cannot list, edit, or delete the owner's entry.                                                                                                            |
| Meal local-day ownership            | PASS (automated)   | Server validates the echoed reviewed day against the request device's IANA timezone and rejects a new stale-day request.                                                              |
| Nutrition snapshot stability        | PASS (automated)   | Logged per-serving values are stored in the entry and daily totals derive from saved snapshots.                                                                                       |
| Native meal helper tests            | PASS               | Serving/preview helpers plus durable owner/session-bound meal intent parsing, persistence ordering, principal-switch guards, and catalog-degraded screen states pass.                 |
| Dark-mode control contrast          | PASS (automated)   | Primary, destructive, and success control foreground/background pairs meet WCAG AA contrast in the dark palette.                                                                      |
| Native app typecheck                | PASS               | Generated hooks, weight/meal flows, legal links, release-config gate, Clerk launch states, Settings, deletion gate, retry states, and principal isolation compile together.           |
| Deletion cascade and isolation      | PASS (automated)   | Profile, weight, and meal rows cascade while another user's rows remain intact.                                                                                                       |
| Tombstone/JIT guard                 | PASS (automated)   | Pre/post-provision checks return `410`; a completed-delete race cannot leave a replacement user or reach the handler.                                                                 |
| Clerk failure and worker retry      | PASS (automated)   | Only a verified Clerk API `404` is terminal; raw-ID/hash mismatches never call Clerk; bounded retry remains durable.                                                                  |
| Deletion concurrency/idempotency    | PASS (automated)   | Concurrent/repeated staging is monotonic, never regresses completed state, and avoids false success.                                                                                  |
| Mobile deletion marker/gate helpers | PASS (automated)   | Owner-scoped markers fail closed; terminal cleanup removes sensitive meal recovery first, stays retryable on SecureStore/sign-out failure, and preserves principal fencing.           |
| Second-session deletion propagation | PASS (automated)   | Normal-endpoint `410` removes private cache immediately; status refreshes on mount, foreground focus, and every 60 active seconds.                                                    |
| Adult UTC date rule                 | PASS (automated)   | Controlled-clock domain tests cover exact 18th birthday, one day short, malformed/future dates, and March 1 treatment of a February 29 birth.                                         |
| Adult API authorization             | PASS (automated)   | API tests prove fail-closed `428` for unverified/stale state, `403` for ineligible, monotonic decisions, and continued deletion/status access.                                        |
| Adult migration and minimization    | PASS (automated)   | Migration/service tests cover existing-user recheck, birth-year removal, email clearing/eligible restore, and schemas without raw-DOB persistence.                                    |
| Adult native eligibility gate       | PENDING NATIVE QA  | Must fail closed before private queries/screens, across offline/relaunch/deep-link/account-switch paths, while preserving deletion/settings access.                                   |
| Principal cache lifecycle           | PENDING NATIVE QA  | The layout implementation compiles; shared-device account switching and query-cache clearing require native exercise.                                                                 |
| Native simulator tap-through        | NOT AUTHORITATIVE  | Full Xcode/Simulator is not installed on this Mac. Regardless, the exact signed TestFlight build on a physical iPhone is the launch acceptance boundary.                              |
| Real iPhone interaction             | BLOCKED            | Device, development build, and owner authentication required.                                                                                                                         |
| Real Clerk account deletion         | BLOCKED            | Requires a configured development tenant/server key plus native app-kill, retry, and second-device exercise.                                                                          |

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
- No simulator/device or real-Clerk deletion QA has been performed in this
  continuation; automated evidence is limited to rows explicitly marked PASS.
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
