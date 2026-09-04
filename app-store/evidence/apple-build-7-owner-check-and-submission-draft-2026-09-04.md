# CUT OS build 7 owner check and App Review draft — September 4, 2026

**Verification time:** 2026-09-04T18:45:22Z
**Scope:** authenticated read/write App Store Connect checks and owner TestFlight
confirmation; no App Review submission or public release

## Exact build

- App version: `1.0.0`
- Build number: `7`
- Git commit: `64c0790c659f1c4b3c9c5de96c125db095eaee5a`
- EAS build ID: `e2d8b719-0f50-41c5-94ec-ae6e7304437f`
- App Store Connect build ID: `130301db-7ea1-451b-8578-5ccd34213129`
- EAS submission ID: `744c31b6-24ad-4d0b-904d-f381ba3944d4`

Apple reported build 7 as `VALID` and App Store eligible. The build is assigned
to the `CUT OS Internal QA` group and is selected on App Store version 1.0.0.
The version remains `PREPARE_FOR_SUBMISSION` with manual release selected.

## Owner check and beta feedback

After installing and checking build 7, the owner reported that it opened and
was good to continue toward launch. The owner also supplied a friend's design
feedback. The feedback was positive overall and suggested reducing text
density, adding more imagery, and using stronger color grouping. Those items
are post-submission design improvements, not defects that block this exact
build's launch path.

This confirmation is an owner smoke check. It does not claim completion of the
full purchase, restore, account-deletion, accessibility, or multi-account App
Review QA matrix.

## Listing and review draft

- The current en-US listing copy was pushed through EAS Metadata.
- One opaque 1320 by 2868 iPhone screenshot was uploaded to the
  `APP_IPHONE_67` set. Apple reported the asset delivery state as `COMPLETE`.
- The screenshot SHA-256 is
  `77df03275efe88abd1ace008649e5a94a6a5306bc9f72bf5b0343b097c8d16aa`.
- App Review draft ID `9e67ea26-89d8-4c0c-85fa-135e5e9f9b45` exists in
  `READY_FOR_REVIEW`. Nothing was submitted for review.

## Subscription

The subscription remains:

- product ID `com.zarifahmed.cut.pro.monthly`;
- one month;
- U.S. $4.99;
- no trial or introductory offer; and
- Family Sharing off.

The en-US product description was updated to `Adaptive meal fits and on-demand
meal drafts.` and the credential-free review note was updated to match the
current free and Pro scopes. Apple still reports `MISSING_METADATA` because the
required subscription review screenshot has not been uploaded.

## Exact remaining submission blockers

1. Capture and upload the real subscription offer as the subscription review
   screenshot.
2. Configure a purpose-built, non-expiring App Review login and verify it in
   build 7 without an out-of-band email trap.
3. Add the App Review contact phone and final credential-bearing review notes
   only inside App Store Connect.
4. Add the app version, subscription group, and subscription to the same draft,
   then submit that draft for App Review.

No credential, private phone number, private county, bank detail, or Apple API
key is stored in this evidence.
