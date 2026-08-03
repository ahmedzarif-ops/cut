# CUT OS — QA Report

> Spec §2: a control counts as implemented only after the interaction was
> exercised in the running iOS simulator; hardware behavior on a real iPhone.
> This report does not claim PASS for anything that was not actually run.

## Codex continuation — August 3, 2026

This is the current local automated checkpoint for the balanced-meal,
durable-account-deletion, and `adult-18-v1` eligibility foundations. It is not
native/App Store acceptance. The post-commit generated-code drift check and
commit SHA are recorded separately.

| Gate item                           | Result            | Evidence                                                                                                                                                                            |
| ----------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript gate                     | PASS              | Root `pnpm run typecheck` passed across libraries, API, mobile, mockup sandbox, and scripts.                                                                                        |
| Automated tests                     | PASS              | 199 tests: domain 31, database 4, mobile 53, API 111.                                                                                                                               |
| Generated API contract              | PASS (compiled)   | Adult eligibility, deletion status/delete, private-endpoint `428`/`403`/`410` responses, generated React Query client, and zod validators compile; post-commit drift check pending. |
| Expo dependency compatibility       | PASS              | `expo install --check` passes after aligning Expo to `54.0.36`.                                                                                                                     |
| Expo Doctor                         | PASS              | Expo Doctor `1.20.1` passes all 18/18 checks.                                                                                                                                       |
| Frozen dependency install           | PASS              | pnpm `10.34.5` accepts the committed lockfile with `--frozen-lockfile`; required esbuild postinstall succeeds.                                                                      |
| Production-style iOS export         | PASS              | Expo/Metro bundled 1,730 modules and emitted a 6.08 MB iOS Hermes bundle plus assets.                                                                                               |
| Database migration                  | PASS              | Blank PGlite builds all current tables; deletion lifecycle/hash, finite nutrition, replay tombstone, retry-index, and baseline reapply checks pass.                                 |
| Today state                         | PASS (automated)  | User-local day and deterministic Next Action fixtures.                                                                                                                              |
| Daily weigh-in create/update        | PASS (automated)  | API/service tests save and replace today's weight.                                                                                                                                  |
| Double-tap duplicate protection     | PASS (automated)  | Repeated same-day writes return the same ID and one row.                                                                                                                            |
| Cross-user weight isolation         | PASS (automated)  | User B's history remains empty after User A logs weight.                                                                                                                            |
| Metric/imperial conversion          | PASS (automated)  | Shared domain conversion round-trip and display rounding tests.                                                                                                                     |
| Curated meal catalog                | PASS (automated)  | Six durable templates; Bengali/Desi presence, ingredients, nutrition, ranking, and ID uniqueness tested.                                                                            |
| Meal create/retry                   | PASS (automated)  | Identical and simultaneous retries return one snapshot; cross-midnight recovery preserves its day; stale preconditions fail closed.                                                 |
| Meal edit/delete/totals             | PASS (automated)  | Serving updates rescale snapshots; repeat delete is safe; a delayed create cannot resurrect a deleted row; totals return to first-meal state.                                       |
| Cross-user meal isolation           | PASS (automated)  | Another authenticated user cannot list, edit, or delete the owner's entry.                                                                                                          |
| Meal local-day ownership            | PASS (automated)  | Server validates the echoed reviewed day against the user's IANA timezone and rejects a new stale-day request.                                                                      |
| Nutrition snapshot stability        | PASS (automated)  | Logged per-serving values are stored in the entry and daily totals derive from saved snapshots.                                                                                     |
| Native meal helper tests            | PASS              | Serving/preview helpers plus durable owner/session-bound meal intent parsing, persistence ordering, and principal-switch guards pass.                                               |
| Native app typecheck                | PASS              | Generated hooks, weight/meal flows, Settings, deletion gate, retry states, and principal cache isolation compile together.                                                          |
| Deletion cascade and isolation      | PASS (automated)  | Profile, weight, and meal rows cascade while another user's rows remain intact.                                                                                                     |
| Tombstone/JIT guard                 | PASS (automated)  | Pre/post-provision checks return `410`; a completed-delete race cannot leave a replacement user or reach the handler.                                                               |
| Clerk failure and worker retry      | PASS (automated)  | Only a verified Clerk API `404` is terminal; raw-ID/hash mismatches never call Clerk; bounded retry remains durable.                                                                |
| Deletion concurrency/idempotency    | PASS (automated)  | Concurrent/repeated staging is monotonic, never regresses completed state, and avoids false success.                                                                                |
| Mobile deletion marker/gate helpers | PASS (automated)  | Owner-scoped markers fail closed; captured auth and snapshotted `410` handlers prevent late user-A work affecting user B.                                                           |
| Second-session deletion propagation | PASS (automated)  | Normal-endpoint `410` removes private cache immediately; status refreshes on mount, foreground focus, and every 60 active seconds.                                                  |
| Adult UTC date rule                 | PASS (automated)  | Controlled-clock domain tests cover exact 18th birthday, one day short, malformed/future dates, and March 1 treatment of a February 29 birth.                                       |
| Adult API authorization             | PASS (automated)  | API tests prove fail-closed `428` for unverified/stale state, `403` for ineligible, monotonic decisions, and continued deletion/status access.                                      |
| Adult migration and minimization    | PASS (automated)  | Migration/service tests cover existing-user recheck, birth-year removal, email clearing/eligible restore, and schemas without raw-DOB persistence.                                  |
| Adult native eligibility gate       | PENDING NATIVE QA | Must fail closed before private queries/screens, across offline/relaunch/deep-link/account-switch paths, while preserving deletion/settings access.                                 |
| Principal cache lifecycle           | PENDING NATIVE QA | The layout implementation compiles; shared-device account switching and query-cache clearing require native exercise.                                                               |
| Native simulator tap-through        | BLOCKED           | Full Xcode/Simulator is not installed on this Mac; a configured Clerk development build is also required.                                                                           |
| Real iPhone interaction             | BLOCKED           | Device, development build, and owner authentication required.                                                                                                                       |
| Real Clerk account deletion         | BLOCKED           | Requires a configured development tenant/server key plus native app-kill, retry, and second-device exercise.                                                                        |

### Required next native script

1. Sign in and complete onboarding.
2. Confirm Today shows **Log your morning weigh-in**.
3. Enter a weight in the selected unit and double-tap Log.
4. Confirm one saved entry, **WEIGH-IN COMPLETE**, and Next changes to **Build your first balanced meal**.
5. Kill/relaunch and confirm the saved weight and new Next Action remain.
6. Update the same day's weight and confirm it replaces rather than duplicates.
7. Sign out and confirm protected data is inaccessible.

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
- The owner approved adults-only policy `adult-18-v1`, and automated
  server/domain/mobile enforcement is implemented and passing. Public launch
  remains blocked until native-device and live-Clerk acceptance pass; Terms,
  Privacy, public support/legal URLs, jurisdictional age-assurance, and Apple
  metadata receive qualified review; live RevenueCat purchase flows pass; and
  reproducible nutrition/allergen professional review is complete.
