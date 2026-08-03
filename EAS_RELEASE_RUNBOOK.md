# CUT OS — iOS release runbook

**Status:** Engineering-ready checklist; Apple, Expo, production-service, and
public-policy setup still require the owner.

## Release configuration contract

The production EAS environment must contain all of these client-visible values:

| Variable                             | Required value                                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_DOMAIN`                 | Public API hostname only, such as `api.example.com`; no scheme, path, credentials, query, or fragment |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`  | Production Clerk publishable key beginning with `pk_live_`                                            |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | RevenueCat public Apple-platform SDK key; never a secret or Test Store production key                 |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL`     | Owner/counsel-approved public HTTPS Privacy Policy                                                    |
| `EXPO_PUBLIC_TERMS_URL`              | Owner/counsel-approved public HTTPS Terms of Use                                                      |
| `EXPO_PUBLIC_SUPPORT_URL`            | Functional public HTTPS support page with real contact information                                    |
| `EXPO_PUBLIC_CLERK_PROXY_URL`        | Required canonical same-origin route: `https://<EXPO_PUBLIC_DOMAIN>/api/__clerk`                      |

Every `EXPO_PUBLIC_*` value is embedded in the app and must be treated as
public. Never place `CLERK_SECRET_KEY`, `DATABASE_URL`, Apple credentials, or
any other server secret in an `EXPO_PUBLIC_*` variable. The API deployment
separately requires `REVENUECAT_SECRET_API_KEY`, `REVENUECAT_PROJECT_ID`, and
`REVENUECAT_ENTITLEMENT_REST_ID`. The secret is a least-privilege RevenueCat
REST API v2 key with customer read/write access. All three are server-only and
must not be placed in EAS public variables, client source, logs, or support
material. The two resource IDs must be copied from RevenueCat rather than
derived from dashboard URLs or the public `CUT_OS_PRO` lookup key.

The app fails closed when its API hostname or Clerk publishable key is missing
or malformed. Production EAS builds also stop before dependency installation if
any required public resource is missing, the Clerk key is not live, the API is
not public, or the required Clerk proxy is not the exact same-origin server
route.

## One-time owner setup

1. Activate the Apple Developer Program membership and complete the required
   App Store Connect agreements, tax, and banking setup.
2. Create the CUT OS app record using bundle ID `com.zarifahmed.cut`.
3. Link `artifacts/cut-os` to the intended Expo/EAS project. Review the project
   ID change before committing it.
4. In App Store Connect, complete the Paid Apps Agreement/tax/banking, create
   the owner-approved subscription group/product, and keep the first
   subscription attached to the app-version submission.
5. Create the RevenueCat project/iOS app for the exact bundle ID, connect Apple
   credentials, map products to `CUT_OS_PRO`, create the current offering, and
   configure Apple Server Notifications v2 for sandbox and production.
6. Create all seven production EAS variables above and the three server-only
   RevenueCat v2 values (`REVENUECAT_SECRET_API_KEY`,
   `REVENUECAT_PROJECT_ID`, and `REVENUECAT_ENTITLEMENT_REST_ID`) in the API
   deployment.
7. Publish and manually open the Privacy, Terms, and Support pages on a device.
8. Verify the production API, Clerk tenant, and RevenueCat project are the exact
   service set intended for App Review.

## Preflight

From the repository root, run the normal automated gates, then validate the
production EAS environment without copying values into a committed file:

```sh
pnpm run codegen:check
pnpm run typecheck
pnpm run test
eas env:exec --environment production \
  'pnpm --filter @workspace/cut-os run validate:release-config'
```

The validator reports variable names and reasons only; it never prints values.
Stop if any gate fails.

## Build and TestFlight

From `artifacts/cut-os`:

```sh
eas build --platform ios --profile production
```

The production profile is pinned to the Expo SDK 54-compatible Xcode 26 image.
Confirm the build log names `macos-sequoia-15.6-xcode-26.0`, shows the release
configuration preflight passing, and contains no secret values.

Before external TestFlight or App Review:

1. Inspect the generated archive's `Info.plist`: arbitrary network loads must
   be disabled and `ITSAppUsesNonExemptEncryption` must be false only while the
   final binary still uses exempt system encryption exclusively.
2. Generate the archive privacy report. Reconcile every embedded SDK and the
   bundled `PrivacyInfo.xcprivacy` against `PRIVACY_DATA_MAP.md` and App Store
   Connect.
3. Exercise the full adults-only, account-deletion, authentication, poor-network,
   relaunch, shared-device, and VoiceOver scripts in `QA_REPORT.md`, plus every
   Apple Sandbox and TestFlight item in `PURCHASE_QA_REPORT.md`.
4. Keep the production backend and authentication service available to App
   Review and provide a current eligible adult review account plus exact steps.
5. Confirm the paywall uses StoreKit-localized price/period, purchase, Restore,
   Manage Subscription, auto-renew/cancel disclosure, Privacy, Terms, and
   Support. Expo Go preview responses do not count.
6. Upload to internal TestFlight first. Do not submit for review until every
   remaining gate in `APP_STORE_READINESS.md` has an owner and evidence.

## Release ownership boundary

Engineering may prepare and validate builds. Only the owner approves Apple
credentials, public policies, App Privacy answers, export-compliance answers,
the 18+ rating override, subscriptions, App Review submission, and public
release. Qualified counsel/privacy and health/nutrition reviewers retain the
approval gates recorded in `APP_STORE_READINESS.md`.
