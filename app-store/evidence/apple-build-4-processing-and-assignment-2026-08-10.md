# Apple build 4 processing and assignment — August 10, 2026

**Latest live verification:** `2026-08-10T23:36:12Z`

## Exact signed QA-candidate identity

- **App version:** `1.0.0`
- **Build number:** `4`
- **Release commit:** `b6d135dc334937c61f7e1f4847ec9b04d2fd6cd4`
- **EAS build ID:** `dc2c2bfa-bec6-4112-bedd-eafbb81f4bc4`
- **App Store Connect build ID:** `0b6ff58a-d236-4469-b471-8216cf5a91ee`
- **Bundle ID:** `com.zarifahmed.cut`

## EAS build

- Expo billing showed the Free plan at `$0/month`, one iOS build used before
  this build, and an upcoming bill of `$0.00`. Starting build 4 did not require
  a plan purchase or create a known new charge.
- EAS used the existing Apple distribution certificate and provisioning
  profile. No new certificate, provisioning profile, key, Apple sign-in, or
  financial action was required.
- The production build completed at `2026-08-10T23:16:02.536Z` from the exact
  release commit above.

## Apple processing and draft selection

- Apple processed build 4 and App Store Connect showed it as **Ready to
  Submit** within its 90-day testing window.
- Build 4 is assigned to internal group `CUT OS Internal QA`. Automatic
  distribution and automatic tester notifications remain off; assigning the
  build did not send an invitation or build-notification email.
- The internal group now contains one tester and two assigned builds. Build 3
  remains assigned only while Apple Developer Support case `20000133994444`
  investigates the contradictory tester availability state.
- App Store version 1.0.0 was changed from build 3 to build 4 and saved. The
  version draft re-read showed build 4. No App Review submission, external beta
  distribution, or public release occurred.

## Persistent TestFlight defect

After build 4 was assigned, the same eligible Account Holder tester row still
showed **No Builds Available**. This reproduces the Apple-side issue with a
second valid assigned build and keeps the existing support case relevant. No
follow-up message was sent to Apple without a separate owner confirmation.

## Exact signed archive inspection

At `2026-08-10T23:50:21Z`, the exact EAS build artifact above was downloaded
from its authenticated build record and inspected locally without installing it
or exposing credentials.

- IPA SHA-256:
  `0f37cabd290e7ee45f796feff22ffaacceaff9e701cf706f9bd57abb939188a1`.
- The extracted app reports bundle `com.zarifahmed.cut`, version `1.0.0`, build
  `4`, minimum iOS `17.0`, and executable `CUTOS`.
- `codesign --verify --deep --strict` passed. The designated identifier and
  signed application identifier match the bundle and Apple team; the embedded
  App Store profile expires August 8, 2027.
- `get-task-allow` is false. The declared-age-range entitlement is true, the
  `CutDeclaredAgeRangeModule` native symbol is linked, and no push entitlement
  is present.
- The app-level privacy-manifest SHA-256 is
  `6f68287b8b8883e5b02705dd94370c54cc0024e037b4255d901cd8df8eab4091`.
  The bundle contains the expected 12 privacy manifests. The app manifest
  remains no-tracking and declares the seven first-party data types and four
  required-reason API categories already reconciled with App Store Connect;
  RevenueCat's embedded manifest remains unlinked Purchase History for App
  Functionality and no tracking.
- A credential-safe equality check confirmed that all five current EAS
  production public settings are embedded in `main.jsbundle`: canonical domain,
  Clerk publishable key, Clerk proxy URL, RevenueCat public iOS SDK key, and the
  exact subscription product ID. No values were printed or retained.
- The exact public Privacy, Terms, and Support URLs are present in the bundle.
- The archive secret-boundary scanner inspected 123 files and returned zero
  findings. No server secret name, private key, Clerk secret, RevenueCat secret,
  database credential, GitHub token, AWS key, or release credential name was
  found.
- The configured 1024-pixel opaque source icon remains hash-bound by
  `app-store/icon-manifest.json`, and the signed bundle contains opaque compiled
  app icons. This is technical archive evidence only; owner brand approval is
  still pending.

Together with the passing exact-head metadata/claim validation, this confirms
that build 4 contains the public v1 product scope represented in the listing.
It does not substitute for physical-device behavior, purchase/restore evidence,
name clearance, brand approval, or owner submission approval.

## Backend compatibility recheck

At `2026-08-10T23:54:08Z`, the candidate-to-backend source boundary and live
production surface were rechecked:

- The diff from deployed backend source
  `08e62232db7f81047eec5b55a184f30fb7d4162a` to build 4 source
  `b6d135dc334937c61f7e1f4847ec9b04d2fd6cd4` contains no change under the API
  server, database library, package lock, or Replit runtime configuration. The
  release-relevant code delta is mobile-side session refresh plus evidence and
  validation records.
- Live `/status` still reports the deployed backend source above and status
  `ok`.
- `/`, `/api/readyz`, `/privacy`, `/terms`, and `/support` each returned HTTP
  200 over verified HTTPS.
- The canonical same-origin Clerk client proxy returned HTTP 200 with the
  expected production-domain headers.

The existing Replit deployment therefore remains the matching backend for
build 4; a republish would not add the mobile repair and is not required for
candidate compatibility. This read-only recheck did not change the deployment,
database, development-data-copy setting, Clerk configuration, or billing.

## Release boundary

Build 4 supersedes build 3 as the exact signed QA candidate, but it is not the
final immutable submission build. The repository recorded two documentation
checkpoints after build 4's source commit; CUT's release-integrity rule permits
only one machine-allowlisted App Review evidence commit directly after a final
`BUILD_SHA`. No history rewrite is authorized. Use build 4 to expose and fix
physical-device issues, then cut a fresh final build from the stabilized green
head containing the pre-created paired App Review/public-release evidence
drafts. After that build, allow only the single evidence commit specified by
the release runbook.

Processing and assignment also do not prove physical-device behavior. The
following remain open:

- installation through TestFlight on the owner's physical iPhone and, after
  this QA stabilizes the runtime, creation of the final immutable build;
- exact-build authentication, age, purchase, entitlement refresh, restore,
  deletion, relaunch, offline, account-switch, and accessibility QA;
- approved 6.9-inch listing screenshots and the private subscription review
  screenshot;
- App Review contact and purpose-built review-account configuration;
- first-subscription attachment and final release-evidence validation;
- explicit owner approval before App Review submission and later manual public
  release.
