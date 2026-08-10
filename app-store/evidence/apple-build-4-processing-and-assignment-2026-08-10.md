# Apple build 4 processing and assignment — August 10, 2026

**Latest live verification:** `2026-08-10T23:36:12Z`

## Exact candidate identity

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

## Release boundary

Build 4 supersedes build 3 as the exact release candidate, but processing and
assignment do not prove physical-device behavior. The following remain open:

- installation through TestFlight on the owner's physical iPhone;
- exact-build authentication, age, purchase, entitlement refresh, restore,
  deletion, relaunch, offline, account-switch, and accessibility QA;
- approved 6.9-inch listing screenshots and the private subscription review
  screenshot;
- App Review contact and purpose-built review-account configuration;
- first-subscription attachment and final release-evidence validation;
- explicit owner approval before App Review submission and later manual public
  release.
