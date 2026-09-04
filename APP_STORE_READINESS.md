# CUT OS — App Store readiness

**Status:** Redesigned source checkpoint in progress; not ready to submit

**Updated:** September 4, 2026

## Honest v1 scope

CUT OS will launch as an adults-only food, training, and progress tracker for
people who lift while cutting or recomping. The exact submitted binary may
advertise only the features verified in that build:

- Today, Food, Training, and Progress navigation plus a center Add action.
- A database-backed free catalog of 35 source-linked foods and 18 balanced
  meals, including 11 Desi/Bengali options.
- Free supported barcode, manual, saved-food, meal, weigh-in, and training
  logging plus nutrition and progress views.
- Optional Pro meal fits based on explicit preferences, direct feedback,
  confirmed history, and remaining daily targets.
- Bounded on-demand Pro meal drafts with a deterministic catalog fallback.
- Cloud account persistence, Restore Purchases, subscription management,
  legal/support links, and in-app account deletion.

Do not advertise provider-backed AI or photo recognition unless the provider,
credential, privacy boundary, spend cap, runtime configuration, and exact-build
behavior are separately approved and verified. HealthKit, social/community,
restaurant delivery, medical guidance, and unshipped features remain outside
the launch claim.

## Engineering position

- [x] Expo SDK 54 / React Native native application with bundle ID
      `com.zarifahmed.cut`.
- [x] Express/PostgreSQL API, generated OpenAPI client/validators, committed
      migrations, internal UUID identity, and cross-user tests.
- [x] Clerk authentication with safe native token transport.
- [x] Server-enforced `adult-18-v1` eligibility before private guidance.
- [x] Durable in-app account deletion foundation with Clerk deletion, local
      cascade, retry worker, and device recovery marker.
- [x] Today/Food/Training/Progress navigation, a 35-food and 18-meal free
      catalog, barcode/manual/saved food paths, retry-safe logging and deletion,
      nutrition totals, weigh-ins, workouts, and progress views.
- [x] PostgreSQL catalog tables and idempotent startup synchronization preserve
      stable catalog IDs, free-tier access, inactive-history safety, and an
      auditable source-of-truth dataset.
- [x] Pro meal fits use only explicit preferences, direct feedback, confirmed
      logs, and remaining targets. Bounded meal creation uses the same catalog
      and falls back without an external provider.
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
- [x] App Store password recovery uses Clerk's documented custom email-code
      flow through CUT's verified same-origin proxy, keeps a generic request
      response, signs out other sessions after a successful reset, and has no
      native `AuthView` override. Public Expo web uses Clerk's prebuilt
      non-transferable `SignIn` with sign-up navigation pinned to CUT's guarded
      `/sign-up` route.
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

- [x] Apple Developer Program membership and Account Holder access are live-
      confirmed with UTC and non-secret controlled evidence under
      `commercialAndLegal.appleCommerceReadiness`.
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
- [x] The owner-accepted Paid Apps Agreement, bank account, and submitted W-9
      are all confirmed `Active`. Only status, UTC, and a non-secret evidence
      reference are recorded—never tax, bank, agreement, or account credentials
      or values.
- [x] Owner approved the first product's immutable Product ID, `P1M` duration,
      $4.99 U.S. monthly price, and no-introductory-offer decision. Any change
      requires coordinated source, release-record, configuration, and test
      updates before a signed build.
- [x] Owner approved a free app download and Family Sharing disabled.
- [x] Owner approved and Apple saved the Standard EULA, Fitness and Health
      parent-app and subscription tax categories, and DSA non-trader/no-EU
      position.
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
      clearance, App Store Connect exact-name acceptance, owner approval, and
      exact-build claims review. Legal and nutrition fields may remain only as
      `owner_deferred_post_launch` under the August 10 risk-acceptance record;
      they must not claim professional approval.
- [ ] Approve App Review submission and later public release.
- [x] United States-only initial availability is owner-approved and saved in
      App Store Connect.
- [x] Public distribution is selected for the iPhone-only v1, with Apple-silicon
      Mac and Apple Vision Pro availability both set to Do Not Make Available.
      These compatibility choices are saved in App Store Connect.

### External services

- [x] RevenueCat development Test Store has entitlement `CUT_OS_PRO`, a
      clearly test-only monthly product (`cut_os_pro_monthly_test`, no trial),
      and the current/default offering. Its public test key is scoped only to
      Expo's development environment.
- [x] The App Store Connect app is verified for `com.zarifahmed.cut`.
- [ ] Attach the existing first auto-renewable subscription and exact build to
      the same first review submission.
- [x] RevenueCat production Apple app `app8feee0dfba` is verified for
      `com.zarifahmed.cut`; its Apple subscription key is valid, product
      `prod66e8dc0083` maps to `CUT_OS_PRO` and `default/$rc_monthly`, and a
      public iOS SDK key is provisioned without recording its value here.
- [x] RevenueCat server API v2 replacement key
      `CUT Replit Production Replacement 2026-08-04` is created with Charts
      no access, Customer Information read/write, and Project Configuration
      read-only permissions. Its value is saved masked in Replit, and the
      owner's exact Decision 3 authorization is recorded. The old unconfigured
      key has not been revoked.
- [x] The corrected, read-only RevenueCat production preflight passed from
      Replit on exact green commit
      `930a70eb4773b534c9d9fa33fb6030bdd6ee5a54`. Customer read/write permission
      is verified from the exact dashboard setting; the preflight proves
      bounded read access without issuing a test write or deletion.
- [x] Record that the optional RevenueCat App Store Connect API sync credential
      was intentionally not created or uploaded after Apple's live key-creation
      flow displayed an internal-use-only attestation that does not permit
      sharing that credential with a third-party service. Do not claim automatic
      product import, price synchronization, or store-status checking. The
      required Apple in-app purchase/subscription key remains valid, and exact
      mapping, customer-deletion permission, restore behavior, and exact-build
      native purchase/restore QA remain mandatory independent gates.
- [x] Record the initial-release omission of optional App Store Server
      Notifications. If configured later, use RevenueCat's production URL and
      retain non-secret evidence; Apple permits the sandbox URL to remain empty
      and route sandbox notifications to the production URL.
- [x] Link the app config to the existing `@zee-digipit/cut` Expo/EAS project.
- [x] Authenticate the local EAS CLI through the owner-approved one-time browser
      flow and verify the linked project and empty iOS build list without
      exposing a token.
- [ ] Create or reuse Apple signing credentials. The read-only production
      credentials view reported **No credentials set up yet**; no Apple login or
      credential mutation was performed.
- [x] Replit provisioned the production database schema during a first publish
      attempt with development-data copying off. The attempt was canceled
      before application bundling or promotion, no production app is running,
      and every application table has zero rows. No billing status is inferred.
- [ ] Deploy the production API/database/Clerk combination using the verified
      masked RevenueCat v2 secret and existing project, app, entitlement, and
      current-offering resource IDs. Source now safely adapts only the exact
      provider-managed read-only `sslmode=require` connection shape to
      `sslmode=verify-full`; live TLS/readiness, public-host, recovery, and
      legal-publication evidence remain required.
- [ ] Configure production EAS values for API domain, live Clerk key/proxy, the
      provisioned RevenueCat public Apple SDK key, Privacy, Terms, and Support.

### Legal, privacy, and content

- [ ] Form/confirm the selling legal entity and public contact information, or
      obtain counsel's written rationale for accepting the Apple review risk of
      an individual seller for this sensitive-data app.
- [x] Publish functional HTTPS Privacy Policy, Terms/EULA, and Support pages.
- [ ] Owner verifies the sign-up Terms assent and Privacy acknowledgment against
      the final public pages and exact build. Qualified counsel review is
      deferred under the bounded August 10 post-launch decision.
- [ ] Initiate qualified counsel review of adults-only eligibility, notice,
      retention, account deletion, subscriptions, launch jurisdictions, and
      store copy within three calendar days after public release.
- [x] Privacy Policy names RevenueCat and explains linked User ID and Purchase
      History, purposes, retention/deletion, and no tracking.
- [x] Final App Privacy answers match the production archive and backend; the
      exact nine-type linked/no-tracking matrix is published in App Store
      Connect.
- [x] Every meal has fixed ingredient quantities/yield, nutrition source and
      calculation method, and bounded common-allergen/dietary labels in the
      exact shipped catalog. No professional approval is claimed.
- [ ] Initiate qualified nutrition/health and legal review of catalog copy,
      estimated-nutrition warning, and non-medical claims within three calendar
      days after public release; record the qualified reviewer and review date
      only after that work occurs, and do not represent this item as approved.
- [ ] Completed identity tombstone, backups, RevenueCat, and support-record
      retention/deletion policies are documented.

### App assets and metadata

- [x] Replace the construction-guide placeholder with an original 1024×1024
      RGB icon candidate and use it for the app icon, splash, and favicon.
- [ ] Verify the icon and splash on the native release build and obtain final
      owner approval.
- [ ] Capture the two selected launch screenshots from the actual release build:
      core use (`01`) and the paid subscription offer (`07`), with shot `07`
      reused for in-app-purchase review. The remaining planned captures are
      optional marketing or internal review aids, not release blockers. Do not
      mock unbuilt screens.
- [ ] Owner/reviewers approve the focused copy in `APP_STORE_METADATA.md`.
- [x] Complete the current age-rating questionnaire truthfully, choose Health &
      Fitness if still accurate, do not mark Made for Kids, and apply the
      owner/legal-approved 18+ override when required.
- [x] Save evidence of the complete current age questionnaire, its version or
      revision, current-system calculated rating, effective post-override 18+
      rating, UTC confirmation time, and App Store Connect state. `Unrated`
      cannot release. The repository's 24 provisional descriptors are not
      approval.
- [x] Confirm the current App Store Connect regulated-medical-device declaration
      for every selected US, EU/EEA, or UK territory. The working position is
      general wellness/not a regulated medical device; owner, final-binary, and
      live App Store Connect confirmation are recorded, while professional
      review remains explicitly deferred rather than claimed.
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
- [x] Record that voluntary Accessibility Nutrition Labels will not be reported
      for the initial release. Do not claim support or fabricate App Store
      Connect evidence. Physical-iPhone accessibility QA remains required. If
      labels are published later, evaluate every common task and applicable
      feature on the exact build and retain attributable evidence.
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
      screenshots, subscription, and listing exact-build claims review. Bind
      accessibility-label evidence only if labels are later published; the
      initial voluntary omission must retain no such evidence. If external
      testers are added, complete TestFlight App Review contact, demo access,
      and notes first.
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
3. Retain the active Apple membership, Paid Apps Agreement, banking, and W-9
   evidence; complete the remaining provider credentials and technical checks.
4. Publish approved legal/support pages and deploy the production backend.
5. Preserve the intentional omission of RevenueCat's optional App Store Connect
   API sync credential, retain the valid Apple in-app purchase/subscription key,
   and complete the remaining server/EAS production values. Reverify the exact
   product-entitlement-offering mapping, customer-deletion permission, restore
   behavior, and exact-build native purchase/restore path. Optional Apple
   notifications may be added later without blocking the first submission.
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
