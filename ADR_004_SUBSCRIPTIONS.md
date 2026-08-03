# ADR 004 — RevenueCat subscription authorization

**Status:** Accepted for the focused iOS v1

**Date:** August 3, 2026

## Decision

CUT OS Pro is an Apple auto-renewable subscription mediated by RevenueCat.
The exact RevenueCat entitlement identifier is `CUT_OS_PRO`. Apple StoreKit is
the commercial transaction surface and RevenueCat is the entitlement source of
truth. The database must not invent, extend, or independently revoke paid
access.

The first App Store submission will sell only behavior that is already present
in the binary: an adults-only daily cut check-in, one next action, one daily
weigh-in, six curated balanced-meal choices, meal logging/editing/deletion,
daily nutrition totals, cloud persistence, and account controls. Adaptive
targets, trends, workouts, reminders, progress, closeout, and weekly review are
not launch claims until they ship.

Pricing, subscription duration options, and any introductory offer are owner
decisions made in App Store Connect. The app reads localized price, duration,
and introductory-offer data from StoreKit through RevenueCat. It never embeds
a dollar amount, currency, or assumed trial in source code.

## Authorization order

The fail-closed order is:

1. Clerk authentication.
2. Durable account-deletion status.
3. Server-authoritative `adult-18-v1` eligibility.
4. Resolve the internal `users.id` UUID.
5. RevenueCat customer identification and entitlement reconciliation.
6. Paid onboarding, Today, weigh-in, and meal routes.

RevenueCat is never initialized and a purchase is never offered while deletion
or adult eligibility is unresolved, stale, ineligible, offline, or failed.
Settings, legal/support links, subscription restore/manage, sign-out, and
account deletion remain reachable through their explicit restricted paths.

## Identity and isolation

The RevenueCat App User ID is the opaque internal `users.id` UUID. Clerk IDs,
email addresses, names, DOB, weight, measurements, calories, macros, meal data,
and other health/fitness values are never RevenueCat identifiers or customer
attributes.

On principal change, the client clears entitlement/offering state before any
asynchronous identify call. Listener and network results are accepted only for
the owner generation that started them. A late response for person A can never
unlock person B on a shared device. Because CUT always supplies a non-anonymous
internal UUID, account switches identify the next UUID directly and never call
RevenueCat `logOut()`, which would create an anonymous intermediary. Sign-out
and terminal account deletion detach listeners and clear app query state.

## Client enforcement

The native app uses `react-native-purchases` with only the platform public SDK
key. It checks the exact active entitlement, listens for CustomerInfo changes,
and refreshes on foreground, purchase, and restore. `willRenew=false`, a
detected cancellation, or a billing issue does not revoke access by itself;
RevenueCat's active entitlement status, including any valid billing grace
period, controls access.

The subscription screen must show what is unlocked, the StoreKit-localized
price and period, auto-renewal/cancellation disclosure, Restore Purchases,
Manage Subscription, Privacy Policy, Terms of Use, and Support. User-cancelled
purchase UI is a neutral outcome, not an error. Unknown or malformed state
fails closed.

Expo Go preview purchase responses are not release evidence. Real acceptance
requires a fresh native development build, Apple Sandbox, and TestFlight.

## Server enforcement

Client navigation is not an authorization boundary. Every paid API operation
runs adult/deletion authentication first and then verifies `CUT_OS_PRO` for the
server-resolved internal UUID through RevenueCat REST API v2. The noncreating
customer/active-entitlement endpoints avoid accidentally recreating a deleted
RevenueCat customer. The server compares the configured `entl...` REST resource
ID while continuing to expose the stable product-facing lookup key
`CUT_OS_PRO`.

- Inactive access returns HTTP `402` with code `subscription_required`.
- Provider outage, missing server configuration, timeout, or malformed data
  returns HTTP `503` with code `subscription_status_unavailable`.
- `GET /me`, subscription status/refresh, adult eligibility, deletion status,
  and account deletion are the narrow unpaid allowlist.
- `POST /me/subscription/refresh` ignores client identity input and bypasses the
  short server cache after purchase or restore.
- A least-privilege v2 key with customer read/write access, the `proj...`
  project resource ID, and the `entl...` entitlement resource ID remain
  server-only and are never logged or returned.
- A customer or active-entitlements `404` is treated as absence only after a
  project-scoped read proves that the configured key can access the exact
  project. Ambiguous configuration and provider failures remain fail-closed.
- Provider reads use bounded response/body timeouts, validated same-origin
  pagination, a short bounded cache, and explicit cache invalidation during
  account deletion.

## Account deletion

Deleting a CUT OS account does not cancel Apple billing. Settings must explain
that distinction and link to Apple's subscription management. The user may
still choose immediate account deletion. CUT must remove the RevenueCat
customer data associated with its internal UUID as part of the durable
provider-deletion workflow, while Apple retains its own transaction records as
required by Apple.

RevenueCat deletion is a durable three-phase state machine:
`not_started → queued → confirmed`. A synchronous `200` deletion receipt or a
project-validated absent customer can confirm deletion. A `202` response is
stored as `queued`; every later attempt performs only the non-creating customer
GET until absence is confirmed and never repeats DELETE from that durable
phase. Database-time leases permit one live vendor worker, and lease-token
fencing prevents an expired worker from overwriting a newer result. Local
completion is allowed only after the provider phase is `confirmed`.

## Privacy

The production App Privacy answers and public Privacy Policy disclose
RevenueCat, linked User ID, and linked Purchase History used for App
Functionality and Analytics, with tracking disabled. The archive privacy report
and actual production SDK configuration remain the final evidence.

## Required external configuration

- App Store Connect app for bundle ID `com.zarifahmed.cut`.
- Active Paid Apps Agreement, tax, and banking.
- One subscription group and the owner-approved products/prices.
- RevenueCat iOS app, Apple credentials, `CUT_OS_PRO` entitlement, current
  offering/packages, and Apple Server Notifications v2.
- Production EAS public RevenueCat SDK key and server-only RevenueCat v2 key,
  project resource ID, and entitlement resource ID.
- First subscription submitted together with the app version.

## References

- [RevenueCat Expo installation](https://www.revenuecat.com/docs/getting-started/installation/expo)
- [RevenueCat CustomerInfo](https://www.revenuecat.com/docs/customers/customer-info)
- [RevenueCat customer identification](https://www.revenuecat.com/docs/customers/identifying-customers)
- [RevenueCat REST API v2](https://www.revenuecat.com/docs/api-v2)
- [RevenueCat API authentication](https://www.revenuecat.com/docs/projects/authentication)
- [Apple auto-renewable subscriptions](https://developer.apple.com/help/app-store-connect/manage-subscriptions/offer-auto-renewable-subscriptions/)
- [Submit an in-app purchase](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-in-app-purchase/)
- [Apple account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
