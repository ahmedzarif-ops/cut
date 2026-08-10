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

## Privacy archive and vendor reconciliation

The exact uploaded IPA has SHA-256
`9b75a01f4e541c98aea56efa93d2f431c8137117410bad80170e411944938b49`.
Its app-level privacy manifest has SHA-256
`6f68287b8b8883e5b02705dd94370c54cc0024e037b4255d901cd8df8eab4091`.
The extracted signed bundle contains 12 privacy manifests: the app-level
manifest plus Expo Constants, Expo File System, Expo System UI, PhoneNumberKit,
PurchasesHybridCommon, React Core, React cxxreact, RevenueCat, and the three
React Native dependency resource bundles for Boost, Folly, and glog.

The app-level manifest matches the committed release configuration exactly:

- tracking is false and tracking domains are empty;
- collected first-party types are Name, Email Address, Health, Fitness, User
  ID, Other Data Types, and Purchase History;
- every first-party row is linked to the account and not used for tracking; and
- required-reason API declarations cover File Timestamp, Disk Space, User
  Defaults, and System Boot Time with the committed approved reasons.

RevenueCat's embedded manifest declares unlinked Purchase History for App
Functionality and no tracking. The exact archive has no general crash-reporting
or product-analytics SDK. Clerk's native bundle is present but does not include
its own privacy manifest in this candidate. Apple requires the App Store privacy
answers to include third-party partner practices even when those practices are
not represented by an embedded SDK manifest. Clerk's current DPA says its
configured service may process IP addresses, device identifiers, and usage
data. Its current production analytics documentation describes sign-ups,
sign-ins, active usage, and retention.

The copy-ready working position therefore adds two conservative partner rows to
the seven first-party rows:

- **Identifiers — Device ID:** linked, no tracking, App Functionality; covers
  Clerk device identifiers and trusted client IP used for authentication,
  security, and abuse prevention.
- **Usage Data — Product Interaction:** linked, no tracking, App Functionality
  and Analytics; covers Clerk authentication and session activity.

No Crash Data, Performance Data, or Other Diagnostic Data is declared because
the exact archive contains no such SDK and CUT's production application logs
use fixed coarse operational fields rather than user-linked device diagnostics.
Raw date of birth remains excluded because CUT discards it immediately after
the eligibility decision and neither CUT nor its partners retain it. These
classifications formed the owner-approved App Store questionnaire. At
`2026-08-10T21:42:15Z`, App Store Connect showed all nine data types published
as linked to the user, with the exact purposes above and no tracking.

Authoritative references:

- <https://developer.apple.com/app-store/app-privacy-details/>
- <https://developer.apple.com/documentation/bundleresources/privacy-manifest-files>
- <https://clerk.com/legal/dpa>
- <https://clerk.com/docs/guides/dashboard/analytics>

## Owner-approved App Store declarations

The owner replied **approve all** after receiving one bounded list of the exact
prepared decisions. App Store Connect was then changed only within that scope:

- Content Rights: **No**, the app does not contain, show, or access third-party
  content.
- License Agreement: Apple's Standard License Agreement remains selected.
- Regulated Medical Device: **No** in every country or region.
- Digital Services Act: **not a trader or not planning EU distribution**; the
  DSA agreement record became active without publishing trader contact data.
- Parent-app tax category: **Fitness and Health**.
- CUT OS Pro Monthly tax category: **Fitness and Health**.
- App Privacy: the nine exact data types were published as linked to the user,
  for their recorded functionality, personalization, and analytics purposes,
  with tracking set to No.

No app version or subscription was added for review, no App Review submission
was created, and manual public release remains separately owner-controlled.

## Current subscription price and age-questionnaire recheck

At `2026-08-10T22:06:07Z`, App Store Connect showed CUT OS Pro Monthly's
**Current Pricing for New Subscribers** as **United States (USD) — $4.99**.
The product remained available in exactly 1 of 175 countries or regions,
Family Sharing remained off, and the current pricing table showed zero
introductory offers and zero upcoming changes. This is current-price evidence,
not a purchase or proceeds claim.

The same live checkpoint walked all seven age-rating steps without changing an
answer. The newly surfaced capability questions were already saved as no
unrestricted web access, no public user-generated content, no social media, no
under-13 social-media mode, no messaging or chat, and no advertising. Age
Assurance remained yes; Health or Wellness Topics remained yes; Medical or
Treatment Information and every mature, sexual, violent, gambling, contest,
and loot-box frequency remained none/no. The calculated rating remained 9+,
the higher-age override remained Age 18+, and the saved App Information result
remained 18+ in 173 countries or regions and 19+ in Korea. The final Save
button was disabled because the stored answers already matched this review.

Direct RevenueCat verification already recorded in the Apple live evidence
shows the production mapping, Apple subscription key, App Store Connect
credential, entitlement, and current default offering as valid. The distinct
native purchase, entitlement refresh, and restore-after-deletion QA gates
remain pending.

## Internal TestFlight access check

At the same checkpoint, internal group `CUT OS Internal QA` contained one
tester and exact build `1.0.0 (3)`, which showed **Testing** with 90 days
remaining. The tester row nevertheless showed **No Builds Available**, and the
owner-provided iPhone screenshot showed TestFlight's generic **Ready To Test**
screen rather than CUT OS. Apple did not expose or require a redemption code
for this internal setup. No invitation or notification email was sent during
that initial check. The owner later confirmed the iPhone Media & Purchases
Apple Account matched the tester record and explicitly approved exactly one
Apple invitation email. The same internal Account Holder tester was removed
and re-added; App Store Connect reported that one tester was added to the
group. The owner subsequently reported that no invitation had arrived. A live
read-only recheck at `2026-08-10T21:55:27Z` confirmed that the group lists exact
build `1.0.0 (3)` as Testing and the build detail lists the internal group with
one tester, but the tester row still says **No Builds Available**. No second
email was sent. Apple-side availability, invitation acceptance, and exact-build
installation remain pending. No additional email is authorized by this
evidence.

## Remaining release boundary

Build processing and the age questionnaire are complete, but this evidence does
not approve or satisfy:

- physical-device exact-build QA;
- listing and subscription review screenshots;
- App Review contact and purpose-built review-account configuration;
- the first-subscription review attachment;
- final owner approval to submit for App Review; or
- final owner approval to manually release after Apple approval.
