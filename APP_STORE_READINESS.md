# CUT OS — App Store Readiness

**Product promise:** CUT OS tells people who lift what to do next so they can actually finish their cut.

## v1 launch scope

Ship:

- Adults-only account and onboarding under policy `adult-18-v1`. Public
  guidance and purchases are protected by the implemented server-enforced
  eligibility gate, existing-account recheck, and generated contract. Native
  acceptance and release/legal review remain incomplete.
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
- [x] Profiles explicitly bind their matching EAS environments; production is
      pinned to the Expo SDK 54-compatible Xcode 26 image and requires a clean
      commit.
- [x] Production release configuration fails before install when the public API,
      live Clerk key, or required public legal/support URLs are missing or unsafe.
- [x] Runtime configuration and the API transport fail closed; authorization is
      never attached to an unresolved, non-HTTPS, or non-matching API origin.
- [x] OpenAPI declares bearer authentication for all private operations and
      explicitly keeps health public.
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
- [x] Owner approved an adults-only 18+ product policy and the
      `adult-18-v1` engineering design in `ADR_003_ADULT_ELIGIBILITY.md`.
- [x] Adult eligibility is implemented across domain, database, API/generated
      contract, and mobile with automated verification.
- [ ] Adult eligibility passes native-device, live-Clerk, offline/relaunch,
      deep-link, shared-device, accessibility, and release-build acceptance.
- [ ] Verified iOS Simulator boot on the current release branch.
- [ ] Seven-day founder dogfood.
- [ ] Full launch feature scope.
- [ ] RevenueCat integration.
- [x] Account-deletion engineering flow passes the final automated verification run.
- [ ] Account deletion passes real-Clerk, app-kill, poor-network, second-device,
      shared-device, and iOS development-build validation.
- [x] App-level privacy-manifest baseline and installed-package required-reason
      API inventory; collection entries match the current engineering data map.
- [ ] Final `.xcarchive` privacy report and embedded third-party SDK inventory.
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
      `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_DOMAIN`, and the public
      Privacy, Terms, and Support URLs for the exact services used by the
      submitted binary. The Clerk proxy must be the canonical same-origin
      `/api/__clerk` route.
- [ ] Meal-catalog deployments drain old API replicas and run one catalog
      version at a time; mixed-version writers are not allowed by the current
      release procedure.
- [ ] Production upload built with Xcode 26+ and the iOS 26 SDK or later.
- [ ] Valid privacy manifests included for the app and required third-party SDKs.
- [x] Native config resolves with arbitrary network loads disabled and the
      current exempt-only encryption declaration; both require final-archive
      verification before submission.

Apple has required iOS uploads to use the iOS 26 SDK or later since April 28, 2026: [Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/).

### Account and authentication

- [ ] A current `eligible` adult review account, full-access steps, and a
      controlled under-18 gate test path are supplied to App Review.
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
- [x] Validated Privacy, Terms, and Support controls are implemented in normal
      and adult-restricted paths and fail closed when release values are absent.
- [ ] Data inventory covers CUT OS and every third-party SDK.
- [ ] Production data inventory is reconciled against `PRIVACY_DATA_MAP.md` and the final binary.
- [ ] App Privacy label matches the production binary and backend.
- [ ] Health/fitness data never enters advertising audiences or marketing data mining.
- [ ] Logs and analytics contain no raw weight, measurements, macros, workouts, allergies, or health conditions.
- [ ] Wellness/medical age-rating and regulated-device declarations are answered accurately.
- [x] Owner approved adults-only policy `adult-18-v1`.
- [x] A transient full DOB is evaluated only by the server against the UTC
      calendar; raw DOB is never stored, logged, cached, returned, added to
      Clerk, or sent to analytics. Only `unverified`/`eligible`/`ineligible`,
      policy version, and decision time are retained in the implemented and
      automated design.
- [x] Every new and existing account fails closed until it has a current
      `adult-18-v1` result. Normal private APIs return `428` for unverified or
      stale policy state and `403` for ineligible state; deletion/status,
      restricted Settings, and sign-out remain usable in automated coverage.
- [ ] The preceding transient-DOB and fail-closed controls pass native-device,
      live-Clerk, archive inspection, and production observability verification.
- [ ] Owner-supplied public Terms, Privacy, and Support destinations are verified
      from both normal and adult-restricted Settings in the submitted build.
- [ ] The permanent v1 ineligible-identity behavior is reviewed: no in-app DOB
      correction/retry; later adult access requires account/identity deletion
      and a new account. Settings/deletion/sign-out and support instructions work.
- [ ] Terms/EULA and Privacy Policy wording, notice-at-collection, retention,
      underage handling, launch jurisdictions, and sufficiency of self-declared
      age assurance receive qualified legal/privacy review.
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
- [ ] `APP_STORE_METADATA.md` is reconciled against the final binary and approved.
- [ ] The current age-rating questionnaire is completed truthfully: health or
      wellness topics, medical/treatment content, age-assurance behavior,
      social-media capability, and every other descriptor match the shipped app.
- [ ] The app is not marked Made for Kids. Once the Terms/EULA minimum is 18,
      a higher-age override to 18+ is applied if Apple's calculated rating is
      lower, with region/OS-specific results recorded.
- [ ] The App Store description and review notes say CUT OS is for adults 18+
      and distinguish the storefront rating from in-app self-declared eligibility.
- [ ] Screenshots show real shipped UI: Next Action, balanced food, workouts, weekly review, progress.
- [ ] Review notes explain adaptive guidance, subscriptions, account deletion, and full-access steps.
- [ ] Correct build and subscription products added to the review submission.
- [ ] Owner approves Submit for Review.
- [ ] Release remains manual until production readiness is rechecked.

## TestFlight gates

Internal beta:

- 5–10 trusted adult testers. Controlled under-18 test identities are used only
  to verify the restricted path and contain no real minor data.
- Current iOS plus the oldest supported iOS version.
- At least two iPhone sizes.
- Purchase lifecycle and poor-network scenarios.
- No P0 and no unresolved P1 in auth, purchase, logging, or deletion.

External beta:

- 25–50 adult target users.
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
- Raw DOB stored, logged, cached, returned, added to Clerk/analytics, or
  otherwise retained beyond the transient eligibility decision.
- Guidance, private cached data, or a purchase path visible while eligibility
  is unverified, stale, ineligible, offline, or unavailable.
- Terms/Privacy/App Store age statements that do not match `adult-18-v1`.
- Ineligible users offered DOB correction/retry, or unable to reach Settings,
  sign out, account deletion, or the approved later-adult support instructions.
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
