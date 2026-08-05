# CUT OS — Purchase QA evidence

**Status:** Automated implementation verification complete; native purchase
acceptance not yet run

**Updated:** August 4, 2026

This is an evidence log, not a promise. Check an item only after recording the
build, environment, tester, date, and result. Expo Go preview mode cannot satisfy
any Apple Sandbox or TestFlight item.

## Configuration evidence

- [x] App configuration and automated native introspection use bundle ID
      `com.zarifahmed.cut`.
- [ ] Subscription group, product IDs, durations, localizations, and structured
      U.S. USD price/effective date are recorded with the owner decision
      revision and evidence reference.
- [ ] The introductory-offer decision and, when enabled, exact duration,
      periods, price, eligibility, and evidence are recorded.
- [ ] The App Store Connect review screenshot upload records shot
      `07-subscription-offer`, its approved SHA-256, upload UTC, and evidence
      reference; the hash matches the actual approved PNG.
- [x] RevenueCat production Apple app `app8feee0dfba` uses bundle ID
      `com.zarifahmed.cut`; its Apple subscription key is valid and a public iOS
      SDK key is provisioned without recording its value here.
- [x] Product `prod66e8dc0083` maps to exact entitlement `CUT_OS_PRO` and the
      current `default/$rc_monthly` offering package.
- [x] RevenueCat server API v2 replacement key
      `CUT Replit Production Replacement 2026-08-04` is created with Charts
      no access, Customer Information read/write, and Project Configuration
      read-only permissions, and is saved masked in Replit. Decision 3 owner
      authorization is confirmed by the exact phrase
      `approve RevenueCat server-key replacement and Decision 3`. The old
      unconfigured key is not revoked.
- [ ] Correct the live verifier assumption mismatch and rerun the bounded
      preflight before marking customer permission technically verified.
- [ ] The separate RevenueCat App Store Connect API key is directly verified.
- [x] RevenueCat **Project settings → General → Restore behavior** is directly
      verified as **Transfer to new App User ID** for production; any enabled
      sandbox override uses the same behavior. Record UTC and controlled,
      non-secret dashboard evidence.
- [ ] Production build contains only the Apple public SDK key; no RevenueCat
      secret, Apple `.p8`, shared secret, or App Store Connect key is embedded.
- [x] Development uses RevenueCat Test Store or Apple Sandbox credentials;
      production does not contain a Test Store key.
- [x] Optional App Store Server Notifications are explicitly omitted for the
      initial release. If added later, production uses RevenueCat's full URL;
      sandbox may fall back to that production URL.
- [ ] Archive privacy report and SDK inventory are attached to the release.

## Automated gates

- [x] Runtime rejects a missing/malformed RevenueCat public SDK key without
      logging its value.
- [x] Release preflight requires the public SDK key for production.
- [x] Exact entitlement active, expired, lifetime, grace-period, missing, and
      malformed responses are covered.
- [x] Server returns `402 subscription_required` for every paid route when
      eligible but unpaid.
- [x] Server returns `503 subscription_status_unavailable` on safe provider
      failure and never leaks provider data or secrets.
- [x] Deletion and adult-eligibility responses take precedence over paid access.
- [x] A late RevenueCat response/listener for person A cannot unlock person B.
- [x] Purchase/restore does not unlock until server refresh confirms entitlement.
- [x] Account deletion remains immediate and durable if RevenueCat cleanup must
      retry, and does not claim to cancel Apple billing.

## Native development build / Apple Sandbox

Record: build ID ___, commit ___, device/iOS ___, sandbox account ___, tester
___, date ___

- [ ] Current offering loads and every visible price/period matches Apple's
      localized product data.
- [ ] Purchase success unlocks once and the server accepts paid endpoints.
- [ ] User cancellation returns quietly to the subscription screen.
- [ ] Store error and interrupted/pending purchase preserve locked state and
      show a retryable, non-sensitive message.
- [ ] Restore with an active purchase unlocks; restore with none stays locked.
- [ ] The required restore-after-account-deletion transfer scenario below
      passes on the exact release candidate.
- [ ] Reinstall and second-device login restore the same internal UUID access.
- [ ] Account switch on one device never carries entitlement across users.
- [ ] Foreground refresh observes purchase, renewal, expiry, refund, and
      externally changed subscription state.
- [ ] Billing retry and configured grace period preserve access only while
      RevenueCat reports the entitlement active.
- [ ] Offline/unknown state fails closed without exposing cached private data.
- [ ] Manage Subscription opens the provider/Apple destination.
- [ ] Privacy, Terms, Support, Restore, price, duration, auto-renew, and cancel
      disclosures are visible and work with VoiceOver and large text.

## TestFlight

Record: TestFlight build ___, commit ___, device/iOS ___, tester ___, date ___

Exact-build evidence: App Store Connect build ID ___, app version/build ___,
EAS build ID ___, full Git commit ___, installed-build verification ___

- [ ] Fresh purchase through TestFlight sandbox.
- [ ] Restore after reinstall and on second device.
- [ ] Renewal, cancellation, expiration, billing retry/grace, and refund.
- [ ] App kill during purchase and immediately after Apple confirmation.
- [ ] Charged-but-locked recovery through Restore + server refresh.
- [ ] Delete account before purchase, with active subscription, and after
      cancellation. Every path explains that Apple billing is separate.
- [ ] The full-access review account was freshly tested on this exact build
      within 24 hours of external submission; private evidence records its
      alias, required state, tester, UTC time, and result.
- [ ] VoiceOver and large text complete the common tasks on this exact build:
      sign-in, adult gate, purchase/restore, weigh-in, meal log/edit/delete,
      Settings/legal links, and account deletion. Record focus order, labels,
      contrast, control usability, device/iOS, tester, date, and result.
- [ ] App Review demo access and the exact navigation steps reproduce full
      access on this exact build.
- [ ] No username, password, verification code, receipt, secret, or other
      credential is stored in this repository or evidence attachments; use the
      approved secret manager and App Store Connect fields.

## Required restore after CUT account deletion

Record: TestFlight build ___, full commit ___, App Store Connect build ID ___,
device/iOS ___, Apple Sandbox account alias ___, original CUT account alias ___,
replacement CUT account alias ___, tester ___, UTC ___, evidence reference ___

Run this as one continuous exact-build acceptance test. Apple billing continues
independently when a CUT account is deleted; deleting the CUT account must not
claim to cancel, refund, or otherwise change the Apple subscription.

1. [ ] With original CUT account A and the controlled Apple Sandbox account,
       purchase the monthly product. Confirm RevenueCat and the CUT server both
       report `CUT_OS_PRO`, and a paid server endpoint succeeds for A.
2. [ ] Delete CUT account A in-app. Confirm deletion reaches its terminal state
       while Apple's subscription remains active in the sandbox subscription
       manager.
3. [ ] Confirm A's old internal App User ID has no RevenueCat entitlement and
       cannot authorize any CUT paid server endpoint. Record only sanitized
       aliases/evidence, never the Apple receipt or credentials.
4. [ ] Create eligible replacement CUT account B while the same Apple Sandbox
       account remains signed in. Confirm B is locked before restore.
5. [ ] Tap **Restore Purchases** as B. Confirm the SDK restore completes, CUT's
       server refresh independently reports `CUT_OS_PRO`, and a paid server
       endpoint succeeds for B.
6. [ ] Re-check A's old App User ID after B unlocks. Confirm the entitlement was
       transferred rather than shared: B has access and A remains without
       RevenueCat or CUT server access.

Do not set
`subscription.revenueCat.restoreAfterAccountDeletion.dashboardBehavior` to
`transfer_to_new_app_user_id` until the exact production project setting has
direct dashboard evidence. Do not set its `nativeQaStatus` to `verified` until
all six checks above pass on the exact release candidate with UTC and controlled
evidence. RevenueCat documents that this project-level behavior is the default
and recommended account-based restore choice, applies to restores and new
purchases, and transfers access so only the new App User ID retains it:
[RevenueCat Restore Behavior](https://www.revenuecat.com/docs/projects/restore-behavior).

### TestFlight Test Information draft

Internal-only TestFlight testing does not require TestFlight App Review. Before
inviting external testers, complete the external Test Information in App Store
Connect, verify it against the exact selected build, and submit that build for
TestFlight App Review. Do not treat internal-test acceptance as external-review
approval.

Copy the following two fields into App Store Connect after confirming they still
match the selected build:

```text
Beta App Description

CUT OS is an adults-only daily cut check-in for people who lift. Testers can
record a daily weigh-in, choose and log one of six curated balanced meals, view
estimated nutrition totals, and manage their account and CUT OS Pro
subscription. It provides general fitness and nutrition information, not
medical advice. Nutrition and common-allergen information is estimated.

What to Test

Use the purpose-built beta account supplied through the approved tester channel.
Please test sign-in and the 18+ gate; purchase, cancellation, restore, and
subscription management; daily weigh-in; balanced-meal selection and logging;
serving adjustment and meal deletion; relaunch and account switching; legal and
support links; and in-app account deletion. Verify that paid screens open only
after server-confirmed access, prices and periods match Apple's purchase sheet,
and deleting the CUT OS account does not claim to cancel Apple billing. Also
complete these common tasks with VoiceOver and large text and report any unclear
label, focus-order issue, clipped text, low contrast, or unusable control.

When reporting an issue, include the selected TestFlight version/build,
device/iOS, account-state alias, steps, expected result, and observed result.
Do not include passwords, verification codes, receipts, personal data, or
secrets.
```

The following external App Store Connect configuration remains **pending** and
must not be filled with guessed values or committed credentials:

- Feedback email.
- TestFlight review contact name, phone, and email.
- Sign-in-required selection and purpose-built demo-account information for
  external TestFlight App Review. Store credentials only in App Store Connect
  and the approved secret manager.
- Final confirmation that the copy above and review navigation match the exact
  build selected for external testing.

## Stop-the-line defects

Do not submit or release with any of these:

- A charge without recoverable entitlement.
- Entitlement without a valid RevenueCat/Apple purchase state.
- Cross-user entitlement or private-data exposure.
- Purchase UI reachable before current adult eligibility.
- A hardcoded or mismatched price, duration, currency, or trial.
- Missing Restore, legal links, auto-renew disclosure, or subscription
  management.
- Any RevenueCat/Apple secret in the binary, logs, API response, or repository.
- Account deletion that cannot complete or incorrectly promises to cancel
  Apple billing.
- Restore after account deletion that fails to unlock the replacement account,
  shares access with the old App User ID, or bypasses server entitlement
  confirmation.
