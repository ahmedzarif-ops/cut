# CUT OS — App Store Readiness

**Product promise:** CUT OS tells people who lift what to do next so they can actually finish their cut.

## v1 launch scope

Ship:

- Account and adult onboarding.
- Separate profile and time-bounded cut-cycle data.
- Today / Next Action.
- Daily weigh-in and trend.
- Balanced food logging, saved meals, macros, and Best Balanced Fit.
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
- [ ] Verified iOS Simulator boot on the current release branch.
- [ ] Seven-day founder dogfood.
- [ ] Full launch feature scope.
- [ ] RevenueCat integration.
- [ ] Account deletion.
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
- [ ] Production upload built with Xcode 26+ and the iOS 26 SDK or later.
- [ ] Valid privacy manifests included for the app and required third-party SDKs.

Apple has required iOS uploads to use the iOS 26 SDK or later since April 28, 2026: [Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/).

### Account and authentication

- [ ] Review account or full demo mode supplied to App Review.
- [ ] Backend stays live during review.
- [ ] Sign in with Apple added if the final primary login mix requires it under Guideline 4.8.
- [ ] Delete Account is easy to find in Settings.
- [ ] Deletion removes associated data not legally required to be retained.
- [ ] Apple sign-in tokens are revoked during deletion, if used.
- [ ] User can manage the Apple subscription before or after deleting the CUT OS account.

Reference: [Offering account deletion in your app](https://developer.apple.com/support/offering-account-deletion-in-your-app/).

### Privacy and health/fitness

- [ ] Privacy Policy is public and accessible in-app.
- [ ] Terms and support URLs are public.
- [ ] Data inventory covers CUT OS and every third-party SDK.
- [ ] App Privacy label matches the production binary and backend.
- [ ] Health/fitness data never enters advertising audiences or marketing data mining.
- [ ] Logs and analytics contain no raw weight, measurements, macros, workouts, allergies, or health conditions.
- [ ] Wellness/medical age-rating and regulated-device declarations are answered accurately.
- [ ] Recommendations and public claims receive qualified professional/legal review.

References: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) and [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/).

### Subscription

- [ ] App Store subscription group created.
- [ ] Working offer approved: $19.99 monthly / $99.99 annual / seven-day trial.
- [ ] RevenueCat products map to one `cut_os_pro` entitlement.
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
