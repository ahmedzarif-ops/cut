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
- [x] EAS development/preview/production profiles, production environment
      preflight, Xcode 26 image pin, and baseline app privacy manifest.
- [x] RevenueCat client purchase/restore/listener/principal-isolation flow and
      truthful subscription screen pass automated verification.
- [x] RevenueCat REST v2 server reconciliation independently protects every
      paid API and passes outage, inactive, lifetime, grace, malformed,
      refresh-race, cache, and cross-user tests.
- [x] RevenueCat customer deletion is part of the durable account-deletion
      provider workflow, including validated absence, queued-delete polling,
      multi-worker leases, stale-worker fencing, and cache invalidation.
- [x] Full repository typecheck/tests, pinned frozen install, Expo dependency
      check, Expo Doctor, migration drift check, and production-style iOS
      export pass after subscription integration. The clean-commit gate is
      completed by the release checkpoint commit.

## Submission blockers

### Owner financial/store decisions

- [ ] Confirm Apple Developer Program membership and Account Holder access.
- [ ] Accept the Paid Apps Agreement and complete tax/banking. These are
      sensitive financial actions and remain owner-only.
- [ ] Choose the first product's immutable Product ID, duration, price, and
      whether to offer a trial. Source code does not assume any of them.
- [ ] Approve the subscription group name/localizations and the final StoreKit
      offer. No-trial is the shortest path to the first paid transaction, but
      it is still an owner decision.
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

- [ ] Form/confirm the selling legal entity and public contact information.
- [ ] Publish functional HTTPS Privacy Policy, Terms/EULA, and Support pages.
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
2. Owner completes sign-in, financial/store decisions, and service credentials.
3. Publish legal/support pages and deploy the production backend.
4. Configure App Store products, RevenueCat, EAS, and Apple notifications.
5. Build a native development client; pass Apple Sandbox purchase QA.
6. Upload internal TestFlight; pass the critical matrix on real devices.
7. Finish privacy, nutrition, legal, icon, screenshots, metadata, and review
   account evidence.
8. Attach the first subscription and release build; owner approves Submit for
   Review.
9. Fix only review blockers, re-run critical tests, and release manually after
   final owner approval.
10. Monitor purchases, restore failures, auth, writes, deletion, crashes, and
    support closely after launch.

## Official references

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Offer auto-renewable subscriptions](https://developer.apple.com/help/app-store-connect/manage-subscriptions/offer-auto-renewable-subscriptions/)
- [Submit an in-app purchase](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-in-app-purchase/)
- [Offering account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [RevenueCat Expo installation](https://www.revenuecat.com/docs/getting-started/installation/expo)
- [RevenueCat Apple App Privacy](https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy)
