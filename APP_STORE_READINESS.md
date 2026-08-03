# CUT OS — App Store readiness

**Status:** Automated paid-v1 checkpoint complete; not ready to submit

**Updated:** August 3, 2026

## Honest v1 scope

CUT OS will launch as an adults-only daily cut check-in for people who lift.
The paid binary may advertise only:

- One deterministic next action for today.
- One daily weigh-in create/update.
- Six curated balanced-meal options with portions, ingredients, common
  allergens, and estimated nutrition.
- Meal log/edit/delete and today's estimated nutrition totals.
- Cloud account persistence, Restore Purchases, subscription management,
  legal/support links, and in-app account deletion.

Do not advertise adaptive coaching, personalized calorie/protein targets,
weight trends, workouts, sets, PRs, reminders, calendar, progress, daily
closeout, weekly review, restaurant guidance, photo recognition, AI chat, or
social features. Those are backlog, not submission truth.

## Engineering position

- [x] Expo SDK 54 / React Native native application with bundle ID
      `com.zarifahmed.cut`.
- [x] Express/PostgreSQL API, generated OpenAPI client/validators, committed
      migrations, internal UUID identity, and cross-user tests.
- [x] Clerk authentication with safe native token transport.
- [x] Server-enforced `adult-18-v1` eligibility before private guidance.
- [x] Durable in-app account deletion foundation with Clerk deletion, local
      cascade, retry worker, and device recovery marker.
- [x] Daily Next Action, weigh-in, six-meal catalog, retry-safe meal logging,
      editing/deletion, and nutrition totals.
- [x] Paid-v1 profile data is minimized to the fields the shipped experience
      displays; unused sex, height, activity, training-experience, and target-
      date inputs are rejected and legacy stored values have a prelaunch purge
      migration.
- [x] EAS development/preview/production profiles, production environment
      preflight, Xcode 26 image pin, baseline app privacy manifest, and the
      Clerk native config plugin that explicitly raises the iOS deployment
      target to Clerk's required iOS 17 while leaving unused Apple sign-in off.
- [x] RevenueCat client purchase/restore/listener/principal-isolation flow and
      truthful subscription screen pass automated verification.
- [x] RevenueCat REST v2 server reconciliation independently protects every
      paid API and passes outage, inactive, lifetime, grace, malformed,
      refresh-race, cache, and cross-user tests.
- [x] RevenueCat customer deletion is part of the durable account-deletion
      provider workflow, including validated absence, queued-delete polling,
      multi-worker leases, stale-worker fencing, and cache invalidation.
- [x] Production API startup validates live credentials/TLS, applies bundled
      migrations under a bounded advisory lock, verifies the exact schema
      revision before binding, and exposes a single-flight guarded readiness
      probe while keeping liveness dependency-free.
- [x] Full repository typecheck/tests, pinned frozen install, Expo dependency
      check, Expo Doctor, migration drift check, and production-style iOS
      export pass after subscription integration. The complete dependency
      graph has no known high/critical advisories, and CI enforces that gate.
      The clean-commit gate is completed by the release checkpoint commit.

## Submission blockers

### Owner financial/store decisions

- [ ] Confirm Apple Developer Program membership and Account Holder access.
- [ ] Resolve the Apple seller type with qualified counsel before enrollment or
      submission. CUT OS requires linked weight, body, fitness, and nutrition
      information, and App Review Guideline 5.1.1(ix) says apps requiring
      sensitive user information should be submitted by a legal entity rather
      than an individual developer. An individual submission is not documented
      here as prohibited, but it is a material review risk.
- [ ] Accept the Paid Apps Agreement and complete tax/banking. These are
      sensitive financial actions and remain owner-only.
- [ ] Approve the first product's immutable Product ID, duration, price, and
      trial decision. Source code does not assume any of them.
- [ ] Separately approve the Subscription Group Reference Name, Subscription
      Product Reference Name, and each localized group display name,
      subscription display name, and description. No-trial is the shortest
      path to the first paid transaction, but it is still an owner decision.
- [ ] Approve App Review submission and later public release.

### External services

- [x] RevenueCat development Test Store has entitlement `CUT_OS_PRO`, a
      clearly test-only monthly product (`cut_os_pro_monthly_test`, no trial),
      and the current/default offering. Its public test key is scoped only to
      Expo's development environment.
- [ ] Create/verify the App Store Connect app for `com.zarifahmed.cut`.
- [ ] Create the first auto-renewable subscription and group, then attach both
      the product and build to the same first review submission.
- [ ] Create/verify the RevenueCat iOS app, Apple credentials, product mapping,
      exact `CUT_OS_PRO` entitlement, current/default offering, and Apple Server
      Notifications v2 sandbox/production URLs.
- [x] Link the app config to the existing `@zee-digipit/cut` Expo/EAS project.
- [ ] Authenticate the local EAS CLI and verify Apple signing credentials.
- [ ] Deploy the production API/database/Clerk combination and server-only
      RevenueCat v2 secret, project resource ID, and entitlement resource ID.
- [ ] Configure production EAS values for API domain, live Clerk key/proxy,
      RevenueCat public Apple SDK key, Privacy, Terms, and Support.

### Legal, privacy, and content

- [ ] Form/confirm the selling legal entity and public contact information, or
      obtain counsel's written rationale for accepting the Apple review risk of
      an individual seller for this sensitive-data app.
- [ ] Publish functional HTTPS Privacy Policy, Terms/EULA, and Support pages.
- [ ] Counsel approves the sign-up Terms assent and Privacy acknowledgment
      design; the current age confirmation alone is not documented consent to
      the Terms.
- [ ] Qualified counsel approves adults-only eligibility, notice, retention,
      account deletion, subscriptions, launch jurisdictions, and store copy.
- [ ] Privacy Policy names RevenueCat and explains linked User ID and Purchase
      History, purposes, retention/deletion, and no tracking.
- [ ] Final App Privacy answers match the production archive and backend.
- [ ] Every meal has fixed ingredient quantities/yield, nutrition source and
      calculation method, substantiated common-allergen/dietary labels,
      qualified reviewer, and review date.
- [ ] Qualified nutrition/health and legal reviewers approve catalog copy,
      estimated-nutrition warning, and non-medical claims.
- [ ] Completed identity tombstone, backups, RevenueCat, and support-record
      retention/deletion policies are documented.

### App assets and metadata

- [x] Replace the construction-guide placeholder with an original 1024×1024
      RGB icon candidate and use it for the app icon, splash, and favicon.
- [ ] Verify the icon and splash on the native release build and obtain final
      owner approval.
- [ ] Capture screenshots from the actual release build: adult gate,
      subscription screen, Today/next action, weigh-in, meal choices/log, and
      Settings. Do not mock unbuilt screens.
- [ ] Owner/reviewers approve the focused copy in `APP_STORE_METADATA.md`.
- [ ] Complete the current age-rating questionnaire truthfully, choose Health &
      Fitness if still accurate, do not mark Made for Kids, and apply the
      owner/legal-approved 18+ override when required.
- [ ] Provide an eligible adult review account, exact full-access/purchase
      navigation, and a controlled restricted-path test with no real minor data.
- [ ] Keep the production backend, Clerk, RevenueCat, and public pages live
      throughout review.

### Native purchase and release evidence

- [ ] Fresh EAS development build installs on a real supported iPhone.
- [ ] On a non-UTC physical iPhone, a fresh eligible account synchronizes the
      named device timezone before any daily screen unlocks; unpaid accounts can
      complete the settings write without a RevenueCat check.
- [ ] Relaunch persistence, foreground and one-minute device-zone/travel
      rechecks, two-device different-zone behavior, slow-request/account-switch
      fencing, and local-midnight/daylight-saving rollover all pass the exact
      script in `QA_REPORT.md`.
- [ ] Apple Sandbox matrix in `PURCHASE_QA_REPORT.md` passes: product loading,
      localized price/period, success, user cancellation, error/interruption,
      restore active/none, renewal, cancellation, expiration, refund, billing
      retry/grace, reinstall, second device, account switch, offline, and manage.
- [ ] Charged-but-locked recovery works through Restore + server refresh.
- [ ] Deletion with an active subscription warns that Apple billing is
      separate, offers Manage Subscription, and still permits immediate delete.
- [ ] TestFlight repeats the critical purchase, restore, account-switch,
      deletion, poor-network, VoiceOver, and large-text paths.
- [ ] Final `.xcarchive` privacy report, embedded SDK inventory, `Info.plist`,
      export-compliance answer, and required-reason APIs are reconciled.
- [ ] No P0/P1 issue remains; build and first subscription are submitted
      together; release stays manual until final owner approval.

## Stop-the-line defects

- Cross-user account, health, meal, or entitlement exposure.
- Charge without recoverable entitlement, or entitlement without valid
  RevenueCat/Apple status.
- Client-only subscription protection or a paid API that omits the server gate.
- Purchase UI before current adult eligibility, or private cached data visible
  when deletion/eligibility/subscription state is unknown.
- Hardcoded or mismatched price, currency, duration, or trial.
- Missing Restore, subscription management, auto-renew/cancel disclosure,
  Privacy, Terms, Support, or account deletion.
- Daily data unlocked before the current device timezone is established, or a
  stale timezone response/cache changes another account/day.
- An ambiguous weigh-in retry can move to a new local day without an explicit
  stale-day review.
- RevenueCat/Apple/Clerk/server secret embedded in the app, repository, logs, or
  responses.
- Account deletion failure or a claim that deleting CUT cancels Apple billing.
- Raw DOB, weight, measurements, calories, macros, or meal details in URLs,
  logs, analytics, crash metadata, or RevenueCat customer attributes.
- App Store copy/screenshots advertising any unbuilt feature.
- Unreviewed nutrition, allergen, medical, or outcome claim.

## Release sequence

1. Finish subscription client, server gate, and vendor deletion; pass automated
   tests from a clean commit.
2. Owner and counsel resolve the legal operator and Apple seller type, including
   Guideline 5.1.1(ix), before Developer Program enrollment or submission.
3. Owner completes financial/store decisions and service credentials.
4. Publish approved legal/support pages and deploy the production backend.
5. Configure App Store products, RevenueCat, EAS, and Apple notifications.
6. Build a native development client; pass Apple Sandbox purchase QA.
7. Upload internal TestFlight; pass the critical matrix on real devices.
8. Finish privacy, nutrition, legal, icon, screenshots, metadata, and review
   account evidence.
9. Attach the first subscription and release build; owner approves Submit for
   Review.
10. Fix only review blockers, re-run critical tests, and release manually after
    final owner approval.
11. Monitor purchases, restore failures, auth, writes, deletion, crashes, and
    support closely after launch.

## Official references

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple Developer Program enrollment](https://developer.apple.com/programs/enroll/)
- [Offer auto-renewable subscriptions](https://developer.apple.com/help/app-store-connect/manage-subscriptions/offer-auto-renewable-subscriptions/)
- [Auto-renewable subscription information fields](https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/auto-renewable-subscription-information)
- [Submit an in-app purchase](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-in-app-purchase/)
- [Offering account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [RevenueCat Expo installation](https://www.revenuecat.com/docs/getting-started/installation/expo)
- [RevenueCat Apple App Privacy](https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy)
- [FTC Health Breach Notification Rule guidance](https://www.ftc.gov/business-guidance/resources/complying-ftcs-health-breach-notification-rule-0)
- [FTC Health Products Compliance Guidance](https://www.ftc.gov/business-guidance/resources/health-products-compliance-guidance)
