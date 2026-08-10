# Apple build 3 processing, assignment, and age rating — August 10, 2026

- **Verification time:** 2026-08-10T20:56:38Z
- **App:** CUT OS
- **App version:** 1.0.0
- **Bundle ID:** `com.zarifahmed.cut`
- **Release commit:** `08e62232db7f81047eec5b55a184f30fb7d4162a`
- **EAS build:** `1fe435cf-9d8b-4eff-a1d3-bfb893b344a6`
- **App Store Connect build:** `dce1d8df-cd9e-46d7-8607-dcde9570df2e`
- **Build number:** 3

This is a non-secret production-state record. It does not contain an Apple API
issuer, key ID, private key, token, account password, tester address, or review
credential.

## Archive and Apple processing

- The exact signed EAS IPA was downloaded once through its authenticated EAS
  artifact path and retained only under `/tmp` for the bounded upload and
  archive audit.
- Apple's official command-line validation accepted that IPA with zero errors.
- An idle EAS Submit queue item was canceled before direct upload; it had not
  reached Apple and recorded no upload error.
- The same IPA was uploaded directly through Apple's official command-line
  delivery path with the already authorized App Store Connect App Manager key.
- Apple delivery completed with `build-status VALID`, `import-status VALID`,
  `is-on-app-store-connect true`, and `APP_STORE_ELIGIBLE`.
- A direct App Store Connect API recheck reported build 3 as `VALID`, not
  expired, with minimum iOS 17.0. Apple records its upload time as
  2026-08-10T13:42:43-07:00 and expiration as
  2026-11-08T12:42:43-08:00.
- The extracted archive passed strict deep signature verification. Its bundle,
  version, build, release commit, production public configuration, distribution
  signing, and adults-only Declared Age Range entitlement matched the release
  record. `get-task-allow` was false.

No App Review submission or public release occurred during these operations.

## TestFlight and version assignment

- Build 3 is attached to internal group `CUT OS Internal QA`.
- The group has one internal tester, one build, and automatic build-notification
  delivery disabled. The API attachment did not send a tester invite or build
  notification email.
- App Store Connect reports the exact build in internal state
  `IN_BETA_TESTING` and processing state `VALID`.
- Build 3 is also selected for App Store version 1.0.0. A direct relationship
  read returned the same App Store Connect build ID and build number.
- Exact-build physical-iPhone authentication, age, purchase, restore, account
  deletion, accessibility, and screenshot QA remain pending. Assignment is not
  acceptance evidence for those flows.

## Age rating

Apple's current OpenAPI specification was downloaded from the link in the
official App Store Connect API documentation before writing the declaration.
The saved answers match the exact v1 archive and repository scope:

- health or wellness topics: yes;
- age assurance: yes;
- parental controls: no;
- unrestricted web access: no;
- user-generated content, social media, messaging/chat, and advertising: no;
- gambling and loot boxes: no;
- medical or treatment information: none; and
- drug references, profanity, horror, mature themes, sexual content, weapons,
  violence, simulated gambling, and contests: none.

The 18+ higher-age override was saved as `EIGHTEEN_PLUS`. To distinguish
Apple's calculated rating from the product override without relying on an
inference, the API override was temporarily set to `NONE`, the U.S. territory
rating was read as `NINE_PLUS`, and the override was restored immediately. A
second read returned U.S. `EIGHTEEN_PLUS`, and the declaration relationship
confirmed the restored `EIGHTEEN_PLUS` value. No version was under review and
no submission existed during this bounded check.

The owner previously approved the adults-only product and then directed the
launch to proceed as soon as the remaining technical and App Store requirements
are satisfied. Legal and qualified health/nutrition review remain explicitly
deferred post-launch and are not claimed by this record.

## Remaining release boundary

Build processing and the age questionnaire are complete, but this evidence does
not approve or satisfy:

- physical-device exact-build QA;
- listing and subscription review screenshots;
- App Privacy publication;
- content-rights, regulated-medical-device, or DSA owner declarations;
- App Review contact and purpose-built review-account configuration;
- the first-subscription review attachment;
- final owner approval to submit for App Review; or
- final owner approval to manually release after Apple approval.
