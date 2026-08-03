# CUT OS — App Store Readiness

**Product promise:** CUT OS tells people who lift what to do next so they can actually finish their cut.

## v1 launch scope

Ship:

- Account and onboarding. Public guidance remains blocked until an
  owner/legal-approved minimum-age policy is required and enforced server-side.
- Separate profile and time-bounded cut-cycle data.
- Today / Next Action.
- Daily weigh-in and trend.
- Curated balanced-meal logging and daily macro totals. Personalized **Best
  Balanced Fit** ships only if authoritative targets, preference filters,
  disclosures, and safety review land; otherwise defer it.
- Workout plan, session/set logging, and PR detection.
- Daily closeout and weekly review.
- Calendar and local reminders.
- Progress.
- RevenueCat monthly/annual subscription, trial, restore, and manage subscription.
- Settings, privacy, support, and in-app account deletion.

Defer until v1.1+:

- HealthKit and wearables.
- Meal-photo recognition.
- AI chat coaching.
- Live delivery-app inventory.
- Social/community features.
- Creator marketplace.
- Android public release.

## Current engineering position

- [x] React Native + Expo native application.
- [x] Express/PostgreSQL server architecture.
- [x] Managed authentication and server-resolved internal user identity.
- [x] Cross-user isolation tests.
- [x] Committed migrations tested from a blank database.
- [x] OpenAPI-generated client and response validators.
- [x] EAS development/preview/production profiles.
- [x] Bundle identifier reserved in config: `com.zarifahmed.cut`.
- [x] First server-backed Next Action and daily weigh-in slice.
- [x] First server-backed curated balanced-meal engineering foundation with daily totals.
- [x] Versioned day/catalog handshake plus durable owner-scoped recovery for
      uncertain meal creates.
- [x] Retry-safe meal deletion and replay tombstones that retain no nutrition
      values and cascade with account deletion.
- [x] pnpm version pin and GitHub CI gates for frozen install, generated
      contract drift, typecheck, and automated tests.
- [x] Engineering privacy data-map draft covering current fitness/nutrition data.
- [x] Unused native location and photo-picker packages removed from the launch dependency set.
- [ ] Verified iOS Simulator boot on the current release branch.
- [ ] Seven-day founder dogfood.
- [ ] Full launch feature scope.
- [ ] RevenueCat integration.
- [x] Account-deletion engineering flow passes the final automated verification run.
- [ ] Account deletion passes real-Clerk, app-kill, poor-network, second-device,
      shared-device, and iOS development-build validation.
- [ ] Privacy manifest and third-party SDK inventory.
- [ ] App Privacy responses.
- [ ] Legal URLs and store metadata.
- [ ] TestFlight internal/external beta.

## Apple submission gates

### Build and account

- [ ] Apple Developer Program membership active.
- [ ] Legal entity, agreements, tax, and banking complete.
- [ ] App record created in App Store Connect.
- [ ] EAS project linked and production credentials verified.
- [ ] Production EAS environment defines and verifies
      `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` and `EXPO_PUBLIC_DOMAIN` for the exact
      Clerk tenant and HTTPS API host used by the submitted binary.
- [ ] Meal-catalog deployments drain old API replicas and run one catalog
      version at a time; mixed-version writers are not allowed by the current
      release procedure.
- [ ] Production upload built with Xcode 26+ and the iOS 26 SDK or later.
- [ ] Valid privacy manifests included for the app and required third-party SDKs.

Apple has required iOS uploads to use the iOS 26 SDK or later since April 28, 2026: [Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/).

### Account and authentication

- [ ] Review account or full demo mode supplied to App Review.
- [ ] Backend stays live during review.
- [ ] Sign in with Apple added if the final primary login mix requires it under Guideline 4.8.
- [ ] Delete Account is easy to find in Settings.
- [ ] Deletion removes associated data not legally required to be retained.
- [ ] A real Clerk development identity is deleted and cannot recreate an
      internal account from a surviving session.
- [ ] Pending deletion age, retry failures, alerts, and manual reconciliation
      are operationally monitored.
- [ ] Tombstone, backup, and legally required retention periods plus deletion
      completion expectations are documented in the public Privacy Policy.
- [ ] Apple sign-in tokens are revoked during deletion, if used.
- [ ] User can manage the Apple subscription before or after deleting the CUT OS account.

Reference: [Offering account deletion in your app](https://developer.apple.com/support/offering-account-deletion-in-your-app/).

### Privacy and health/fitness

- [ ] Privacy Policy is public and accessible in-app.
- [ ] Terms and support URLs are public.
- [ ] Data inventory covers CUT OS and every third-party SDK.
- [ ] Production data inventory is reconciled against `PRIVACY_DATA_MAP.md` and the final binary.
- [ ] App Privacy label matches the production binary and backend.
- [ ] Health/fitness data never enters advertising audiences or marketing data mining.
- [ ] Logs and analytics contain no raw weight, measurements, macros, workouts, allergies, or health conditions.
- [ ] Wellness/medical age-rating and regulated-device declarations are answered accurately.
- [ ] Product/legal owners approve the minimum-age policy; onboarding requires
      the necessary data and the server blocks cut, weight, and meal guidance
      when the policy is not satisfied. Terms and age-rating answers match.
- [ ] Every public meal template has reproducible ingredient quantities and
      yield, nutrition source/methodology, substantiated allergen/dietary
      labels, a qualified reviewer, and a review date.
- [ ] Recommendations and public claims receive qualified professional/legal review.

References: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) and [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/).

### Subscription

- [ ] App Store subscription group created.
- [ ] Working offer approved: $19.99 monthly / $99.99 annual / seven-day trial.
- [ ] RevenueCat products map to one `CUT_OS_PRO` entitlement.
- [ ] Paywall clearly states price, period, trial, auto-renewal, and cancellation.
- [ ] Sandbox purchase, renew, cancel, expire, billing retry, refund, reinstall, and restore pass.
- [ ] Manage Subscription works.
- [ ] Entitlement remains correct on a second device.

RevenueCat's Expo SDK requires a development build for real purchases: [RevenueCat Expo guide](https://www.revenuecat.com/docs/getting-started/installation/expo).

### Store listing and review

- [ ] Name clearance complete.
- [ ] App icon, subtitle, description, keywords, screenshots, support URL, and privacy URL final.
- [ ] Updated age-rating questionnaire complete.
- [ ] Screenshots show real shipped UI: Next Action, balanced food, workouts, weekly review, progress.
- [ ] Review notes explain adaptive guidance, subscriptions, account deletion, and full-access steps.
- [ ] Correct build and subscription products added to the review submission.
- [ ] Owner approves Submit for Review.
- [ ] Release remains manual until production readiness is rechecked.

## TestFlight gates

Internal beta:

- 5–10 trusted testers.
- Current iOS plus the oldest supported iOS version.
- At least two iPhone sizes.
- Purchase lifecycle and poor-network scenarios.
- No P0 and no unresolved P1 in auth, purchase, logging, or deletion.

External beta:

- 25–50 target users.
- First external build passes TestFlight review.
- Activation and seven-day retention measured with privacy-safe events only.

## Stop-the-line release triggers

- Cross-user data exposure.
- Charged purchase without entitlement.
- Entitlement without valid purchase.
- Account deletion failure.
- Silent loss or duplication of food, weight, or workout writes.
- Authentication failures affecting a meaningful share of users.
- Recommendation behavior that could plausibly create health risk.
- Missing or bypassable minimum-age enforcement.
- Unreviewed nutrition, allergen, or dietary claims in the public catalog.

## Release sequence

1. Complete core vertical slices.
2. Seven-day founder dogfood.
3. Internal TestFlight.
4. External TestFlight.
5. Freeze v1 scope.
6. Complete privacy, subscription, listing, and review metadata.
7. Submit for review.
8. Fix only review blockers and P0/P1 defects.
9. Owner approves manual release.
10. Monitor purchases, auth, writes, crashes, and support closely for 24 hours.
