# CUT OS — Purchase QA evidence

**Status:** Automated implementation verification complete; native purchase
acceptance not yet run

**Updated:** August 3, 2026

This is an evidence log, not a promise. Check an item only after recording the
build, environment, tester, date, and result. Expo Go preview mode cannot satisfy
any Apple Sandbox or TestFlight item.

## Configuration evidence

- [x] App configuration and automated native introspection use bundle ID
      `com.zarifahmed.cut`.
- [ ] Subscription group, product IDs, durations, localizations, price, and
      review screenshot are recorded.
- [ ] RevenueCat Apple app uses the same bundle ID.
- [ ] Products map to exact entitlement `CUT_OS_PRO` and the current offering.
- [ ] Production build contains only the Apple public SDK key; no RevenueCat
      secret, Apple `.p8`, shared secret, or App Store Connect key is embedded.
- [x] Development uses RevenueCat Test Store or Apple Sandbox credentials;
      production does not contain a Test Store key.
- [ ] Apple Server Notifications v2 sandbox and production URLs are configured.
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

- [ ] Fresh purchase through TestFlight sandbox.
- [ ] Restore after reinstall and on second device.
- [ ] Renewal, cancellation, expiration, billing retry/grace, and refund.
- [ ] App kill during purchase and immediately after Apple confirmation.
- [ ] Charged-but-locked recovery through Restore + server refresh.
- [ ] Delete account before purchase, with active subscription, and after
      cancellation. Every path explains that Apple billing is separate.
- [ ] App Review demo account and exact navigation steps reproduce full access.

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
