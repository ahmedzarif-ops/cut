# CUT OS — Privacy data map

**Status:** Engineering draft for App Store privacy review

**Updated:** August 3, 2026

This inventory describes the current repository, not a completed legal disclosure. The production binary, backend configuration, vendor contracts, retention policy, and public Privacy Policy must be checked again immediately before App Store submission.

## Current data inventory

| Data                    | Examples                                                                                                   | Source                 | Purpose                                                | Current system of record                      | Logging rule                                                                       | Deletion expectation                                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------ | --------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Account identifiers     | Internal user UUID, Clerk user ID                                                                          | Clerk/server           | Authentication and account linking                     | Clerk + `users` + `account_deletion_requests` | Never log tokens; identifier-only operational logs must be minimized               | Delete Clerk identity and local user row; completed identity tombstone follows the approved retention policy         |
| Contact information     | Email                                                                                                      | Clerk session claim    | Sign-in/account support                                | Clerk + nullable `users.email`                | Do not include in routine request logs                                             | Delete with account unless legally retained                                                                          |
| Profile information     | Display name, birth year, sex, activity level, training experience                                         | User                   | Onboarding and plan personalization                    | `profiles`                                    | Never log request bodies                                                           | Cascade with user                                                                                                    |
| Body and fitness data   | Height, start/goal weight, daily weigh-ins                                                                 | User                   | Progress and fitness guidance                          | `profiles`, `weight_entries`                  | Never log values or include them in URLs                                           | Cascade with user                                                                                                    |
| Nutrition data          | Chosen meal, serving amount, calories, protein, carbohydrates, fat, fiber                                  | User + curated catalog | Daily meal tracking and Next Action                    | `meal_entries`                                | Never log values or include them in URLs                                           | Cascade with user                                                                                                    |
| Deleted-write safeguard | Opaque meal request UUID and deletion timestamp                                                            | Server                 | Prevent a delayed retry from recreating a deleted meal | `meal_entry_deletion_tombstones`              | Never log or send to analytics                                                     | Cascade with user; stores no template, serving, or nutrition values                                                  |
| Device/session data     | Clerk session token in secure token cache                                                                  | Clerk SDK              | Maintain authenticated session                         | Device secure storage + Clerk                 | Never print, persist in app logs, or send to analytics                             | Expected to be cleared/revoked during deletion/sign-out; verify in native QA                                         |
| Deletion coordination   | SHA-256 identity hash; raw Clerk ID while pending; status, timestamps, attempt count, sanitized error code | Server                 | Prevent account recreation and resume partial failures | `account_deletion_requests`                   | Never log the raw Clerk ID or vendor error; minimize hash-only operational logging | Raw Clerk ID is nulled at completion; tombstone/metadata retention is not yet approved                               |
| Device recovery marker  | Owner Clerk ID, opaque request ID, requested timestamp                                                     | Native app             | Recover a pending deletion on the same device          | SecureStore                                   | Never print or send to analytics                                                   | Remove after terminal server completion; owner isolation and removal require native QA                               |
| Meal write recovery     | Owner Clerk ID, request UUID, meal/template name, catalog version, local day, servings, timestamp          | Native app             | Resolve an uncertain meal create without duplication   | SecureStore                                   | Never print or send to analytics                                                   | Remove after confirmed/rejected recovery and during terminal account deletion; verify app-kill/shared-device cleanup |

CUT OS currently has no advertising SDK and no product-analytics SDK in the application dependency list. That must be rechecked against the final production archive rather than assumed from this document.

## App Store disclosure working position

Apple's final questionnaire should be answered from the shipped behavior and every third-party SDK. Likely categories for the current design include:

- Contact Info: email address, for app functionality/account management.
- User Content or Other User Content: user-entered fitness and nutrition records, if the current questionnaire maps them there.
- Health & Fitness: body measurements, weight, activity/training profile, and nutrition-related fitness data currently implemented. Add workouts only if workout collection ships.
- Identifiers: user/account identifiers used for authentication and app functionality.

Do not mark data as used for tracking. Do not use health, fitness, meal, weight, allergy, or workout data for advertising audiences, third-party marketing, or data mining.

Primary Apple references:

- [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- [Manage App Privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/)
- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

## Native SDK inventory gate

Before the first TestFlight upload:

1. Generate the native iOS project/production archive and inventory embedded SDKs.
2. Verify every required privacy manifest and required-reason API declaration.
3. Keep unused native packages out of the binary. `expo-location` and `expo-image-picker` were removed on August 3, 2026 because the current product does not use them.
4. Confirm permissions shown in the built `Info.plist`; the app must not request location, camera, or photo access without a shipped feature and clear purpose string.
5. Reconcile vendor data handling for Clerk, the hosting/database provider, RevenueCat when added, crash reporting when added, email/support tooling, and any analytics provider.

The current draft does not yet inventory database backups, hosting request
logs, Clerk records/events, support tooling, crash reporting, or build/archive
diagnostics. Each must be reconciled against production configuration and vendor
terms before TestFlight/App Store disclosures are finalized.

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
3. Deletes the internal `users` row so profile, weigh-in, meal, and future cascade-linked data are removed.
4. Handles partial failure visibly and retryably across app restarts and devices.
5. Explains that deleting a CUT OS account does not automatically cancel an App Store subscription and provides subscription-management access.
6. Retains only the minimal non-sensitive evidence allowed by an approved tombstone/backups retention policy.
7. Alerts on old pending requests and has an owner-approved manual reconciliation path.
8. Clears the owner-scoped account-deletion marker and pending meal-write
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

## Minimum-age boundary

The repository does not yet enforce an approved minimum age. Birth year is
optional and must not be represented as an age gate. Before public cut, weight,
or meal guidance is enabled, product/legal owners must approve a policy, align
the Terms and App Store age-rating answers, and require and enforce that policy
server-side. The data inventory and retention rules must then be reviewed for
the chosen age/consent model.

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
