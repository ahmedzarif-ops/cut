# CUT OS — Privacy data map

**Status:** Engineering draft for App Store privacy review

**Updated:** August 10, 2026

This inventory describes the current repository, not a completed legal disclosure. The production binary, backend configuration, vendor contracts, retention policy, and public Privacy Policy must be checked again immediately before App Store submission.

## Production vendor reconciliation checkpoint

This checkpoint separates verified engineering behavior from the remaining
legal, vendor-retention, and exact-archive decisions. Detailed infrastructure
and commerce evidence remains in
`app-store/evidence/production-launch-infrastructure-2026-08-08.md` and
`app-store/evidence/apple-live-configuration-2026-08-04.md`. Exact build 3
archive evidence is in
`app-store/evidence/apple-build-3-and-age-rating-2026-08-10.md`; those records
are linked here instead of duplicated.

| Processor or surface                      | Verified engineering evidence                                                                                                                                                                                                                                                                                                                                                                               | Still unresolved before submission                                                                                                                                                                                                                                                |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CUT API and production database on Replit | The exact backend deployment is public on the approved Reserved VM, the production database is connected, development-data copy is off, application-to-database TLS verification passes, and app-owned logs use fixed sanitized fields. Point-in-time recovery is on with a seven-day in-place restore window; no restore was exercised.                                                                    | Replit/provider access-log fields and retention, support-access controls, backup deletion/expiry treatment, and contractual/regional processing terms require vendor and legal confirmation. A production restore remains destructive and needs a separately approved drill plan. |
| Clerk production identity                 | The replacement production tenant, primary domain, five DNS records, same-origin proxy, Native API registration, Strict enumeration posture, and Client Trust are configured. CUT forwards the trusted client IP only through the bounded Clerk proxy and does not log provider bodies or credentials. Clerk's DPA and analytics documentation support conservative Device ID and Product Interaction rows. | Vendor retention, support access, public-policy wording, and exact signed-build recovery/deletion QA remain pending. The App Store working matrix treats both partner rows as linked, no tracking.                                                                                |
| RevenueCat and Apple commerce             | The production Apple app, monthly product, entitlement, and default offering are mapped; both Apple credential configurations validate. The exact archive contains RevenueCat's privacy manifest. CUT identifies RevenueCat customers only by the internal CUT UUID. No production transactions exist yet.                                                                                                  | Exact purchase/restore/account-deletion behavior, transaction retention, and the subscription review screenshot require exact TestFlight evidence.                                                                                                                                |
| Apple, TestFlight, and App Store Connect  | Exact version 1.0.0 build 3 is processed as valid, assigned to internal TestFlight, and selected for the app version. Its age questionnaire is saved at an effective 18+. Apple retains its own transaction and platform records.                                                                                                                                                                           | App Privacy answers are not saved or published. Review access, physical-device QA, screenshots, and final owner approvals remain pending.                                                                                                                                         |
| Expo/EAS build service                    | Exact EAS production build 3 is complete from the release commit. The signed IPA, app-level privacy manifest, 11 embedded SDK/resource privacy manifests, signature, entitlements, required-reason APIs, and production public configuration were inspected directly.                                                                                                                                       | Build-provider retention is separate from the runtime user-data path. Any replacement candidate must repeat the archive audit rather than inherit this evidence.                                                                                                                  |
| Support and crash/usage tooling           | The exact archive contains no general product-analytics or crash-reporting SDK. Privacy, Terms, and Support routes are live under the owner-deferred professional-review decision; CUT has no in-app support-ticket database.                                                                                                                                                                               | Support correspondence retention and any future crash/analytics provider require separate disclosure review before activation.                                                                                                                                                    |

This table is evidence preparation only. The archive, IP/device mapping, and
usage-data gates are now engineering-verified in the machine record. It does
not approve or publish an App Store answer.

## Current data inventory

| Data                    | Examples                                                                                                   | Source                 | Purpose                                                                                                | Current system of record                                | Logging rule                                                                                                           | Deletion expectation                                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Account identifiers     | Internal user UUID, Clerk user ID, onboarding state, account created/updated timestamps                    | Clerk/server           | Authentication, account linking, and setup state                                                       | Clerk + `users` + `account_deletion_requests`           | Never log tokens; identifier-only operational logs must be minimized                                                   | Delete Clerk identity and local user row; completed identity tombstone follows the approved retention policy         |
| Contact information     | Email                                                                                                      | Clerk session claim    | Sign-in/account support                                                                                | Clerk + nullable `users.email`                          | Do not include in routine request logs                                                                                 | Delete with account unless legally retained                                                                          |
| Profile information     | Display name and goal                                                                                      | User                   | Greeting, account setup, and user-directed goal display                                                | `profiles`                                              | Never log request bodies                                                                                               | Cascade with user                                                                                                    |
| Network/security data   | Client IP, request time, route/method/status, and short-lived rate-limit key                               | Device, hosting edge   | Deliver and protect the service, rate-limit abuse, and support Clerk authentication                    | One-minute in-memory limiter plus hosting/Clerk systems | Never combine routine logs with body, nutrition, DOB, tokens, or request bodies; forwarded IP goes only to Clerk proxy | In-app limiter expires after one minute; hosting and Clerk retention/linkage require production vendor confirmation  |
| Transient age evidence  | Full DOB in strict `YYYY-MM-DD` form                                                                       | User                   | Reach one terminal `adult-18-v1` eligibility decision; retry only when no terminal result is confirmed | Memory only; no system of record                        | Never log, cache, place in URLs/errors, add to Clerk, or send to analytics                                             | Destroy immediately after each response decision; never persist                                                      |
| Adult eligibility       | `unverified`/`eligible`/`ineligible`, policy version, decision timestamp                                   | Server decision        | Fail-closed authorization for adults-only features                                                     | `users`                                                 | Status-only operational logging must be minimized; never log DOB                                                       | Delete with user; exact backups/operational retention requires policy and legal approval                             |
| Body and fitness data   | Start/goal weight and daily weigh-ins                                                                      | User                   | Daily weigh-in check-in and user-directed profile context                                              | `profiles`, `weight_entries`                            | Never log values or include them in URLs                                                                               | Cascade with user                                                                                                    |
| Account preferences     | IANA timezone preference, request-scoped device timezone, metric/imperial display units                    | User/device            | Resolve each device's local day and display stored measurements in the chosen units                    | `users` for preference; request timezone is transient   | Do not log the request timezone or combine it with body/nutrition values                                               | Stored preference deletes with user; transient value is discarded after the request                                  |
| Nutrition data          | Chosen meal, serving amount, calories, protein, carbohydrates, fat, fiber                                  | User + curated catalog | Daily meal tracking and Next Action                                                                    | `meal_entries`                                          | Never log values or include them in URLs                                                                               | Cascade with user                                                                                                    |
| Deleted-write safeguard | Opaque meal request UUID and deletion timestamp                                                            | Server                 | Prevent a delayed retry from recreating a deleted meal                                                 | `meal_entry_deletion_tombstones`                        | Never log or send to analytics                                                                                         | Cascade with user; stores no template, serving, or nutrition values                                                  |
| Device/session data     | Clerk session token in secure token cache                                                                  | Clerk SDK              | Maintain authenticated session                                                                         | Device secure storage + Clerk                           | Never print, persist in app logs, or send to analytics                                                                 | Expected to be cleared/revoked during deletion/sign-out; verify in native QA                                         |
| Deletion coordination   | SHA-256 identity hash; raw Clerk ID while pending; status, timestamps, attempt count, sanitized error code | Server                 | Prevent account recreation and resume partial failures                                                 | `account_deletion_requests`                             | Never log the raw Clerk ID or vendor error; minimize hash-only operational logging                                     | Raw Clerk ID is nulled at completion; tombstone/metadata retention is not yet approved                               |
| Device recovery marker  | Owner Clerk ID, opaque request ID, requested timestamp                                                     | Native app             | Recover a pending deletion on the same device                                                          | SecureStore                                             | Never print or send to analytics                                                                                       | Remove after terminal server completion; owner isolation and removal require native QA                               |
| Meal write recovery     | Owner Clerk ID, request UUID, meal/template name, catalog version, local day, servings, timestamp          | Native app             | Resolve an uncertain meal create without duplication                                                   | SecureStore                                             | Never print or send to analytics                                                                                       | Remove after confirmed/rejected recovery and during terminal account deletion; verify app-kill/shared-device cleanup |
| Subscription identity   | Internal user UUID only                                                                                    | CUT OS server          | Link one account across Apple devices in RevenueCat                                                    | RevenueCat customer                                     | Never send Clerk ID, email, DOB, or health/fitness attributes                                                          | Delete the RevenueCat customer during durable account deletion; does not cancel Apple's subscription                 |
| Purchase history        | Product, purchase/renewal/expiry/refund state, entitlement and management URL                              | Apple + RevenueCat     | Paid access, restore, support, and subscription analytics                                              | Apple + RevenueCat; short status cache in API memory    | Never log receipts, raw provider payloads, keys, or management URLs                                                    | Delete CUT-linked RevenueCat customer data; Apple retains transaction records under its own obligations              |

CUT OS currently has no advertising SDK or general product-analytics SDK in
the application dependency list. RevenueCat provides purchase/subscription
analytics and is disclosed separately above. The inventory was checked against
exact signed build 3. Any replacement candidate must repeat that check.

## App privacy manifest baseline

The Expo iOS configuration now produces an app-level privacy manifest with
tracking disabled and no tracking domains. Its current first-party collected
data entries are Name, Email Address, Health, Fitness, User ID, Other Data Types,
and Purchase History. Every entry is linked to the account and not used for
tracking. Purchase History is used for App Functionality and Analytics; the
first-party fields involved in adapting the experience also declare Product
Personalization.

The root manifest also aggregates required-reason API declarations found in the
installed native dependency set because static CocoaPod manifests may not all be
parsed by Apple:

- File Timestamp: `0A2A.1`, `3B52.1`, `C617.1`.
- Disk Space: `85F4.1`, `E174.1`.
- User Defaults: `CA92.1`.
- System Boot Time: `35F9.1`.

`app-store/app-store-submission.json` repeats these four rows in
`privacy.requiredReasonApis`. The working validator binds their exact ordered
types and reason arrays to `artifacts/cut-os/app.json`; a missing, added,
reordered, or changed reason fails validation. That drift check does not replace
the final archive/embedded-SDK review.

Exact build 3 contains 12 privacy manifests and matches this first-party
baseline. Clerk's native bundle does not contain its own manifest, so its
current DPA and analytics documentation are used for the conservative partner
rows below. Public-policy wording and App Store Connect answers remain pending.
Raw DOB remains excluded under the implemented immediate-discard behavior.

## App Store disclosure working position

Apple's final questionnaire must be answered from the shipped behavior and
every third-party SDK. The table below is the copy-ready working position
represented by the app manifest, exact build 3, production behavior, and current
vendor documentation. It is deliberately exact rather than a list of possible
categories.

| App Store data type              | Manifest type                               | Collected | Linked | Tracking | Purposes                                   | Current v1 data                                                                                         |
| -------------------------------- | ------------------------------------------- | --------- | ------ | -------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Contact Info — Name              | `NSPrivacyCollectedDataTypeName`            | Yes       | Yes    | No       | App Functionality; Product Personalization | Display name used for account setup and the user-directed greeting.                                     |
| Contact Info — Email Address     | `NSPrivacyCollectedDataTypeEmailAddress`    | Yes       | Yes    | No       | App Functionality                          | Clerk sign-in and account support.                                                                      |
| Health & Fitness — Health        | `NSPrivacyCollectedDataTypeHealth`          | Yes       | Yes    | No       | App Functionality; Product Personalization | Start/goal weight, daily weigh-ins, and nutrition records that ship in v1.                              |
| Health & Fitness — Fitness       | `NSPrivacyCollectedDataTypeFitness`         | Yes       | Yes    | No       | App Functionality; Product Personalization | Adults-who-lift goal context and current fitness-related check-in data; no workout logger ships.        |
| Identifiers — User ID            | `NSPrivacyCollectedDataTypeUserID`          | Yes       | Yes    | No       | App Functionality                          | Internal user UUID and authentication/account linkage.                                                  |
| Identifiers — Device ID          | Partner evidence; no Clerk manifest         | Yes       | Yes    | No       | App Functionality                          | Clerk device identifiers and trusted client IP used for authentication, security, and abuse prevention. |
| Other Data Types                 | `NSPrivacyCollectedDataTypeOtherDataTypes`  | Yes       | Yes    | No       | App Functionality; Product Personalization | Eligibility result/version/time, timezone, unit preference, goal, and records mapped here.              |
| Purchases — Purchase History     | `NSPrivacyCollectedDataTypePurchaseHistory` | Yes       | Yes    | No       | App Functionality; Analytics               | Apple/RevenueCat subscription, renewal, expiry, refund, and entitlement state.                          |
| Usage Data — Product Interaction | Partner evidence; no Clerk manifest         | Yes       | Yes    | No       | App Functionality; Analytics               | Clerk production sign-ups, sign-ins, active session usage, and retention activity.                      |

Paid v1 does not collect workout logs. Do not add workout collection to the
questionnaire merely because the audience lifts or because Apple groups Health
and Fitness data together. Paid v1 also no longer collects sex, height,
activity level, training experience, or target date; migration
`0010_minimize_v1_profile.sql` clears any legacy values before launch.

Client IP/network metadata is processed for service delivery, one-minute abuse
throttling, and Clerk authentication. The working App Store position maps it
conservatively with Clerk device identifiers to linked Device ID for App
Functionality. Clerk production session analytics is mapped to linked Product
Interaction for App Functionality and Analytics. Neither row is tracking.

Do not add Crash Data, Performance Data, or Other Diagnostic Data unless the
candidate or production configuration changes. Exact build 3 has no general
crash/analytics SDK and CUT-owned logs contain fixed coarse operational fields,
not user-linked device diagnostics.

If the live App Store questionnaire maps any current user-entered meal or
fitness record to User Content rather than the manifest baseline above, stop,
document that mapping, update the machine-readable file and app manifest as
needed, and re-run validation before submission.

Raw DOB is transmitted only to service the real-time decision and is discarded
immediately. Apple's current App Privacy definition focuses on data retained
beyond servicing a request; counsel and the App Store owner must confirm the
live questionnaire treatment. Public notice must explain the transient
processing even if raw DOB is not a Privacy Nutrition Label data type.

Do not mark data as used for tracking. Do not use health, fitness, meal, weight, allergy, or workout data for advertising audiences, third-party marketing, or data mining.

Primary Apple references:

- [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- [Manage App Privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/)
- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

## Native SDK inventory gate

Exact build 3 completed the first-candidate gate:

1. The production IPA and its 12 privacy manifests were inventoried directly.
2. Every included privacy manifest and required-reason API declaration was
   parsed and matched to the committed configuration.
3. Keep unused native packages out of the binary. `expo-location`,
   `expo-image-picker`, `expo-blur`, `expo-glass-effect`, `expo-image`,
   `expo-linear-gradient`, `expo-symbols`, `expo-auth-session`,
   `@react-native-async-storage/async-storage`, and `react-native-svg` were
   removed from the app's direct dependency set on August 3, 2026 because the
   current product does not use them. Exact build 3 contains none of these
   packages as direct app features.
4. Exact build permissions and entitlements were checked; it does not request
   location, camera, or photo access.
5. Clerk and RevenueCat collection were reconciled to the working matrix. CUT
   sends RevenueCat only the internal UUID and no customer attributes containing
   health, fitness, DOB, name, or email.

The production checkpoint above now records the bounded engineering state for
database recovery, CUT-owned application logs, Clerk, RevenueCat, support, and
the absence of a direct crash/analytics SDK. Exact build 3 now establishes the
transitive archive contents and privacy manifests. It does **not** establish
provider retention, Clerk event retention, support-correspondence retention, or
backup deletion treatment. Those remain public-policy and post-launch
professional-review items under the owner's explicit deferral.

Apple reference: [Adding a privacy manifest](https://developer.apple.com/documentation/bundleresources/adding-a-privacy-manifest-to-your-app-or-third-party-sdk).

## Account deletion implementation status

The repository contains an automated server-tombstone, Clerk-deletion,
local-cascade, retry-worker, Settings-confirmation, and native-recovery
engineering foundation. It is not launch-complete until real-device/real-Clerk
scenarios pass and retention, monitoring, and public-policy decisions are
approved. Launch still requires verified native/production evidence that the
workflow:

1. Re-authenticates or clearly confirms the destructive action.
2. Deletes/revokes the Clerk identity so a valid session cannot recreate the internal user through just-in-time provisioning.
3. Deletes the RevenueCat customer linked by the internal UUID through a durable,
   retryable provider step. This removes CUT-linked vendor data but does not
   cancel or erase Apple's own subscription transaction record.
4. Deletes the internal `users` row so profile, weigh-in, meal, and future cascade-linked data are removed.
5. Handles partial failure visibly and retryably across app restarts and devices.
6. Explains that deleting a CUT OS account does not automatically cancel an App Store subscription and provides subscription-management access.
7. Retains only the minimal pseudonymous deletion-coordination metadata allowed
   by an approved tombstone/backups retention policy; counsel must classify it
   under applicable privacy law rather than assume it is non-personal data.
8. Alerts on old pending requests and has an owner-approved manual reconciliation path.
9. Clears the owner-scoped account-deletion marker and pending meal-write
   recovery record, plus shared in-memory private data, before terminal signout.

The completed tombstone cannot be cleaned up sooner than the maximum period in
which CUT OS will accept a stale Clerk session/token capable of reaching JIT
provisioning. The exact minimum and maximum retention periods still require
identity-provider verification and legal approval; indefinite retention is not
the default.

Apple reference: [Offering account deletion in your app](https://developer.apple.com/support/offering-account-deletion-in-your-app/).

## Recommendation and allergen boundary

- The first balanced-meal catalog is general wellness content ranked by protein, fiber, and a practical calorie range.
- Nutrition is explicitly labeled as estimated.
- Ingredients and template-listed common allergens are displayed with a reminder to review every ingredient and package label.
- The product must not say an option is "safe" for an allergy or medical condition.
- Allergy exclusions, dietary restrictions, and personalized calorie/protein targets must not affect recommendations until their source data, deterministic hard filters, failure behavior, privacy disclosures, and safety tests are implemented.
- **Public-launch blocker:** every template needs fixed ingredient quantities
  and yield, a named nutrition source/calculation methodology, substantiated
  allergen and dietary labels, a qualified reviewer, and a recorded review
  date. Estimated copy does not replace this evidence.
- Qualified nutrition and legal review remains a pre-release gate for public recommendation claims.

## Adults-only boundary

The owner-approved policy is adults age 18 and older, versioned
`adult-18-v1`; the complete decision is in `ADR_003_ADULT_ELIGIBILITY.md`.

- A full DOB is submitted transiently to the server. The server uses its UTC
  calendar and an injected clock; a February 29 birth reaches 18 on March 1 in
  a non-leap 18th year. Raw DOB is never persisted, logged, cached, returned,
  placed in Clerk metadata, or sent to analytics/crash reporting.
- Only the self-declared eligibility outcome, policy version, and decision time
  are linked to the user. `eligible` must not be described as verified age.
- New and existing users are `unverified` until they complete the current
  policy. Legacy birth year is not evidence. Private APIs fail with `428` for
  unverified/stale eligible state and `403` for ineligible state;
  deletion/status, restricted Settings, and sign-out remain available. Public
  Terms, Privacy, and Support links still need to be added before launch.
- If an ineligible person created a Clerk/CUT OS account, they receive no
  guidance or purchase path and can open restricted Settings, sign out, or
  delete the account. The first decision is permanent for that Clerk identity
  under v1; there is no DOB correction/retry path. Later adult access requires
  deleting that identity/account and creating a new account. A notice and local
  precheck may appear before sign-up to minimize unnecessary collection, but
  only the server decision authorizes access.
- The adult-eligibility migration drops every legacy profile birth year and
  clears the nullable local `users.email` copy. Email is restored from the Clerk
  claim only after an eligible recheck; unverified/ineligible local rows retain
  no email. A policy-version change makes stale eligible accounts fail closed for
  review/recheck; permanent ineligibility changes only through a separately
  approved policy and migration.

Before public launch, qualified privacy/legal counsel must approve the Terms and
Privacy wording, notice timing, lawful basis, account/status retention,
underage-attempt handling, launch jurisdictions, vendor treatment, and whether
self-declaration provides sufficient age assurance. Counsel and Support must
also approve the permanent per-identity decision and later-new-account path.
App Store rating and questionnaire answers must match the shipped app but do
not replace this gate.

## Engineering regression gates

- Request logging excludes bodies, authorization headers, meal values, weights, and raw query data.
- Unhandled-error logging serializes only a sanitized error name/code; a regression test proves that messages, database details, request bodies, weights, and nutrition values are excluded.
- Every user-owned domain query scopes by the server-resolved internal user ID.
  Deletion coordination is the explicit identity-hash exception and must never
  expose or accept a client-selected account identifier.
- Every user-owned domain table uses `ON DELETE CASCADE` to the internal user
  unless a documented retention rule requires otherwise. The independent
  deletion tombstone is a deliberate exception whose retention remains a
  launch gate.
- Cross-user isolation and deletion-cascade tests must run from committed migrations.
- Database checks enforce the deletion request's lowercase SHA-256 key and
  pending/completed lifecycle. The retry path verifies that the raw pending
  Clerk ID hashes to the same key before any external deletion call.
- No health or nutrition values appear in analytics event properties without explicit privacy review.
- Raw DOB never appears in a database row, migration backfill, generated
  response, query cache, device store, Clerk metadata, log/error/URL, analytics
  event, support payload, or crash report. Automated redaction/absence checks
  and native inspection are required release evidence.
- Existing users begin the active policy as `unverified`; neither a legacy
  birth year nor `onboardingComplete` can bypass the server decision. Migration
  tests prove legacy birth year is dropped and local email is cleared until an
  eligible recheck restores it from Clerk.
