# CUT OS — iOS release runbook

**Status:** Engineering-ready checklist; Apple, Expo, production-service, and
public-policy setup still require the owner.

## Release configuration contract

The production EAS environment must contain all of these client-visible values:

| Variable                            | Required value                                                                                        |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_DOMAIN`                | Public API hostname only, such as `api.example.com`; no scheme, path, credentials, query, or fragment |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Production Clerk publishable key beginning with `pk_live_`                                            |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL`    | Owner/counsel-approved public HTTPS Privacy Policy                                                    |
| `EXPO_PUBLIC_TERMS_URL`             | Owner/counsel-approved public HTTPS Terms of Use                                                      |
| `EXPO_PUBLIC_SUPPORT_URL`           | Functional public HTTPS support page with real contact information                                    |
| `EXPO_PUBLIC_CLERK_PROXY_URL`       | Required canonical same-origin route: `https://<EXPO_PUBLIC_DOMAIN>/api/__clerk`                      |

Every `EXPO_PUBLIC_*` value is embedded in the app and must be treated as
public. Never place `CLERK_SECRET_KEY`, `DATABASE_URL`, Apple credentials, or
any other server secret in an `EXPO_PUBLIC_*` variable.

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
4. Create all six production EAS variables above.
5. Publish and manually open the Privacy, Terms, and Support pages on a device.
6. Verify the production API and Clerk tenant are the exact pair intended for
   App Review.

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
   relaunch, shared-device, and VoiceOver scripts in `QA_REPORT.md`.
4. Keep the production backend and authentication service available to App
   Review and provide a current eligible adult review account plus exact steps.
5. Upload to internal TestFlight first. Do not submit for review until every
   remaining gate in `APP_STORE_READINESS.md` has an owner and evidence.

## Release ownership boundary

Engineering may prepare and validate builds. Only the owner approves Apple
credentials, public policies, App Privacy answers, export-compliance answers,
the 18+ rating override, subscriptions, App Review submission, and public
release. Qualified counsel/privacy and health/nutrition reviewers retain the
approval gates recorded in `APP_STORE_READINESS.md`.
