# CUT OS — App Store readiness

**Status:** Automated paid-v1 checkpoint complete; not ready to submit

**Updated:** August 4, 2026

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
- [x] App Store password recovery delegates to Clerk's prebuilt native
      sign-in-only `AuthView`; public Expo web uses Clerk's prebuilt
      non-transferable `SignIn` with sign-up navigation pinned to CUT's guarded
      `/sign-up` route, and the custom reset screen is non-launch.
- [x] Purchase access can always be rechecked against the authoritative server;
      local StoreKit state alone never unlocks paid features.
- [x] Production API startup validates live credentials/TLS, applies bundled
      migrations under a bounded advisory lock, verifies the exact schema
      revision before binding, and exposes a single-flight guarded readiness
      probe while keeping liveness dependency-free.
- [x] Full repository typecheck/tests, pinned frozen install, Expo dependency
      check, Expo Doctor, migration drift check, and a non-secret
      production-profile Expo bundle rehearsal pass after subscription
      integration. This is not signing, TestFlight, live-service, or App Store
      evidence. The complete dependency graph has no known high/critical
      advisories, and CI enforces that gate. The clean-commit gate is completed
      by the release checkpoint commit.
- [x] Machine-readable App Store records, screenshot manifest, release-evidence
      template, TestFlight record, full age-questionnaire inventory,
      required-reason API binding, App Review/subscription/accessibility/
      commercial gates, closed listing schema, public-URL/binary binding,
      listing-review evidence, Apple commerce readiness, and fail-closed
      submission validator are wired into CI and the release runbooks.

## Submission blockers

### Owner financial/store decisions

- [ ] Confirm Apple Developer Program membership and Account Holder access, then
      record each confirmation UTC and a non-secret controlled evidence reference
      under `commercialAndLegal.appleCommerceReadiness`.
- [ ] The owner selected an individual Apple seller account and authorized
      `Zarif Ahmed` as the public legal operator for a Texas sole
      proprietorship; the applicable county is retained outside this public
      repository. Before submission, verify Apple's activated personal
      seller name and have qualified counsel review the selected path and any
      assumed-name filing. CUT OS requires linked weight, body, fitness, and
      nutrition information, and App Review Guideline 5.1.1(ix) directs apps
      requiring sensitive user information toward a legal entity. An individual
      submission is not documented here as prohibited, but it is a material
      review risk.
- [ ] Accept the Paid Apps Agreement and complete tax/banking. These are
      sensitive financial actions and remain owner-only; record only each
      confirmation status, UTC, and non-secret evidence reference. Never record
      tax, bank, agreement, or account credentials or values in the repository.
- [x] Owner approved the first product's immutable Product ID, `P1M` duration,
      $4.99 U.S. monthly price, and no-introductory-offer decision. Any change
      requires coordinated source, release-record, configuration, and test
      updates before a signed build.
- [x] Owner approved a free app download and Family Sharing disabled.
- [ ] Approve the standard-versus-custom EULA, app and subscription tax
      categories, and DSA position.
- [x] The Subscription Group Reference Name, Subscription Product Reference
      Name, English (U.S.) group/product display names, exact 45-character
      replacement description, and `use_app_name` option are recorded. The
      owner-approved core offer and routine delegated launch choices are bound
      by the machine validator so they cannot drift silently.
- [x] Apple's live reference now verifies Product Reference Name at 64
      characters, Product ID at 100, product Display Name at 2–30, localizable
      description at 45, and Review Notes at 4,000; at-limit/one-over validator
      tests now enforce the in-app purchase fields. Continue to avoid guessing
      undocumented group-field limits.
- [ ] Complete `listing.approval` only after controlled evidence exists for name
      clearance, App Store Connect exact-name acceptance, owner approval, legal
      review, qualified nutrition review, and exact-build claims review.
- [ ] Approve App Review submission and later public release.
- [x] Owner approved United States-only initial availability. Live App Store
      Connect availability confirmation remains pending.
- [x] Public distribution is selected for the iPhone-only v1, with Apple-silicon
      Mac and Apple Vision Pro availability both set to Do Not Make Available.
      Live App Store Connect confirmation remains pending.

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
- [ ] Configure and verify App Store Server Notifications in App Store Connect;
      record the production and sandbox URLs and non-secret evidence reference.
- [x] Link the app config to the existing `@zee-digipit/cut` Expo/EAS project.
- [ ] Authenticate the local EAS CLI and verify Apple signing credentials.
- [ ] Deploy the production API/database/Clerk combination and server-only
      RevenueCat v2 secret plus project, app, entitlement, and current-offering
      resource IDs.
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
- [ ] Save evidence of the complete current age questionnaire, its version or
      revision, current-system calculated rating, effective post-override 18+
      rating, UTC confirmation time, and App Store Connect state. `Unrated`
      cannot release. The repository's 24 provisional descriptors are not
      approval.
- [ ] Confirm the current App Store Connect regulated-medical-device declaration
      for every selected US, EU/EEA, or UK territory. The working position is
      general wellness/not a regulated medical device, but owner, qualified
      review, final-binary review, and live App Store Connect confirmation are
      still required.
- [ ] Provide an eligible adult review account, exact full-access/purchase
      navigation, and a controlled restricted-path test with no real minor data.
- [ ] Fresh-test the full-access, purchase, adult-gate, restricted, and deletion
      review accounts on the exact submitted build within 24 hours of
      submission; attest that each remains non-expiring for the review window
      and has no user MFA or out-of-band delivery trap. For `app_review`, enable
      Clerk production test mode only for the active review window, retain
      Client Trust, use reserved `+clerk_test` accounts, and prove on a new
      physical device that `424242` completes the email-code challenge without
      delivery. For `public_release`, prove production test mode is disabled
      and Client Trust remains enabled. Disable test mode immediately on
      any exact-submission exit from its authorized waiting/in-review states,
      including Accepted, Pending Developer Release, Rejected, Unresolved
      Issues, Invalid Binary, withdrawal, removal, or abandonment, or on
      unexpected reserved-account activity. The release lead owns the status
      watch, the security owner is backup, and the maximum response is 15
      minutes. Keep credentials outside the repository and record only aliases,
      UTC, and non-secret evidence.
- [ ] Complete the iPhone Accessibility Nutrition Label evaluation across the
      recorded common tasks and all nine Apple feature labels. A supported
      feature must cover every canonical common task; only Captions and Audio
      Descriptions may be not applicable because there is no media. Save the
      verified App Store Connect decision. Record whether verified support or
      support-not-indicated was actually confirmed in App Store Connect, its
      UTC save time, controlled evidence reference, and attributable approval.
      A draft selection does not pass. Do not infer support.
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
- [ ] Complete `app-store/testflight-submission.json` with the exact build,
      including version, Apple build number, full Git commit, EAS build ID, and
      App Store Connect build ID, plus internal group, feedback email, QA
      references, and approvals. Bind that same identity to App Review,
      screenshots, subscription, accessibility, and listing exact-build claims
      review. If external testers are added, complete TestFlight App Review
      contact, demo access, and notes first.
- [ ] Final `.xcarchive` privacy report, embedded SDK inventory, `Info.plist`,
      export-compliance answer, and required-reason APIs are reconciled.
- [ ] Every selected screenshot is an opaque accepted-size PNG whose SHA-256,
      exact-build identity, PII-reviewed SHA-256, and evidence reference match
      the bytes submitted to App Store Connect. The uploaded subscription
      review screenshot SHA-256 must equal approved shot 07.
- [ ] Final App Review Notes are remeasured after replacing placeholders and
      remain within 4,000 UTF-8 bytes. Record the credential-free template hash,
      final byte count, zero placeholders, measurement time, save state, and a
      controlled evidence reference; do not hash or store the resolved
      credential-bearing notes.
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

1. Keep the completed subscription, deletion, auth-recovery, App Store artifact,
   and release-operations gates green on a clean commit.
2. Verify the activated personal seller name and have counsel review the owner's
   selected individual-seller path and intended Texas sole proprietorship,
   including Guideline 5.1.1(ix), before submission.
3. Owner completes financial/store decisions and service credentials.
4. Publish approved legal/support pages and deploy the production backend.
5. Configure App Store products, RevenueCat, EAS, and Apple notifications.
6. Build a native development client; pass Apple Sandbox purchase QA.
7. Upload internal TestFlight; pass the critical matrix on real devices.
8. Finish privacy, nutrition, legal, icon, screenshots, metadata, initial
   territories, regulated-medical-device declarations, and review-account
   evidence. In App Store Connect, select the exact build, choose manual
   release, and save the metadata, privacy, age, accessibility, and App Review
   information.
9. With recorded owner authorization, use **Add for Review** on the app version
   to create or select one submission in **Drafts**. On the first subscription,
   choose **Add for Review**, select that existing draft, and add its unapproved
   subscription group in the submission modal. Verify all three items and
   **Ready for Review**; record the same submission reference, `drafts` section,
   included-item flags, manual-release choice, inactive-review state, UTC, and
   controlled evidence in `appReview.appleWorkflow`; do not submit yet.
10. Finalize immutable `app_review` evidence with its preflighted 15-minute Clerk
    shutdown plan, pass exact-head pull-request CI, and non-force fast-forward
    `main` to that exact SHA. After push-to-`main` CI, remote-SHA confirmation,
    current-clock validation, and fresh production probes, the owner may use the
    separate **Submit for Review** action on that verified draft. Do not use a
    GitHub merge, squash, rebase-and-merge, or merge-queue action.
11. After submission, keep the bounded Clerk review window only while it is
    awaiting or undergoing review. On approval, rejection, withdrawal, removal,
    abandonment, or unexpected reserved-account activity, disable production
    test mode immediately. A rejected/resubmitted candidate repeats the signed
    build and fresh evidence process. Freeze `main` at the App Review evidence
    SHA; any unrelated advance also stops this candidate and closes test mode.
12. For an approved version configured for manual release, confirm **Pending Developer
    Release**, Client Trust on, Clerk production test mode off, healthy probes,
    and unchanged exact-build identity. Finalize and validate the immutable
    `public_release` transition with the same submission in **Completed**, every
    item accepted, no active review, and fresh evidence. `main` must still equal
    the App Review evidence SHA; fast-forward it to the exact public-release SHA,
    wait for push CI, confirm the remote SHA, rerun validation/probes, obtain
    separate owner approval, then release within the evidence window.
13. Monitor purchases, restore failures, auth, writes, deletion, crashes, and
    support closely after launch.

## Official references

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple Developer Program enrollment](https://developer.apple.com/programs/enroll/)
- [Declare regulated medical device status](https://developer.apple.com/help/app-store-connect/manage-app-information/declare-regulated-medical-device-status)
- [Offer auto-renewable subscriptions](https://developer.apple.com/help/app-store-connect/manage-subscriptions/offer-auto-renewable-subscriptions/)
- [Auto-renewable subscription information fields](https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/auto-renewable-subscription-information)
- [Accessibility Nutrition Labels](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels/)
- [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/)
- [Submit an app](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app)
- [Submit an in-app purchase](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-in-app-purchase/)
- [Select an App Store version release option](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/select-an-app-store-version-release-option)
- [Offering account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [RevenueCat Expo installation](https://www.revenuecat.com/docs/getting-started/installation/expo)
- [RevenueCat Apple App Privacy](https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy)
- [FTC Health Breach Notification Rule guidance](https://www.ftc.gov/business-guidance/resources/complying-ftcs-health-breach-notification-rule-0)
- [FTC Health Products Compliance Guidance](https://www.ftc.gov/business-guidance/resources/health-products-compliance-guidance)
