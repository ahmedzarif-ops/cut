# CUT OS — Apple live configuration evidence

**Initial verification:** 2026-08-04T21:33:17Z

**Latest live update:** 2026-08-08T21:24:17Z

**Method:** Direct confirmation in the live Apple Developer, App Store Connect,
and exact CUT RevenueCat App Store app interfaces for the latest update, plus
checked-in routing validation. No credential material was recorded.

**Scope:** Non-secret configuration evidence only; this is not submission,
App Review, or public-release approval.

## Membership and account

- Apple Developer Program membership is active as an Individual membership.
- The Account Holder is Zarif Ahmed.
- Team ID: `6JP2ZDM4HC`.
- Membership renewal date shown by Apple: August 4, 2027.
- The Paid Apps Agreement shows an effective period of August 4, 2026 through
  August 3, 2027, with live status `Active`.
- The bank account status is `Active`.
- The United States Form W-9 status is `Active`, submitted August 4, 2026. The
  tax-form gate is confirmed with this non-sensitive live evidence.
- Apple commerce readiness is confirmed from the three live `Active` statuses.

No private address, phone number, agreement response, tax value, banking value,
or account credential is stored in this evidence.

## App and identity

- The explicit App ID is registered for bundle ID `com.zarifahmed.cut` with
  In-App Purchase enabled.
- App Store Connect app: `CUT OS`.
- Apple app ID: `6798020879`.
- The production EAS submit profile is pinned to that exact Apple app ID.
- Version: `1.0.0`, with status `Prepare for Submission`.
- Primary language: English (U.S.).
- Subtitle saved: `Daily weigh-ins & meal logging`.
- Primary category saved: Health & Fitness.
- SKU: `cut-ios-v1`.
- Release method saved: manual release.

Apple accepted the exact working name for this app record. That fact is not a
trademark clearance, owner approval of final listing copy, or legal approval.

## Canonical Apple identifiers

- App Store Connect app ID: `6798020879`.
- Subscription group ID: `22286645`.
- Auto-renewable subscription ID: `6798020349`.

These non-secret numeric identifiers were copied from the live Apple records.
The app ID is also pinned in the production EAS submit profile and validated
against this evidence. They do not prove that a build or subscription has been
submitted.

## Distribution

- App download price saved as `$0.00`.
- The availability table shows the United States as `Available on App Release`
  and the other 174 countries or regions as `Not Available`.
- Distribution method saved as Public.
- Apple-silicon Mac availability disabled.
- Apple Vision Pro availability disabled.
- Apple School Manager reduced pricing disabled.

These facts confirm the saved distribution configuration only. The app is not
submitted, approved, or publicly available.

## Version and review readiness

- Version 1.0.0 remains in `Prepare for Submission`.
- No screenshots are uploaded and no build is selected.
- The Support URL is blank. The Marketing URL still points to the earlier
  Replit origin rather than the approved custom-domain candidate.
- App Review sign-in is marked required, but the review username, password,
  contact fields, and notes are blank.
- Manual release remains selected.
- The App Review page contains no submitted items.
- Content Rights, Age Ratings, the regulated-medical-device declaration, and
  Digital Services Act compliance remain incomplete.

These are current saved-state observations, not approval to fill legal,
credential, health, or sensitive review fields by assumption.

## Subscription

- Subscription group: `CUT OS Pro`; Apple group ID `22286645`.
- Product reference name: `CUT OS Pro Monthly`.
- Product ID: `com.zarifahmed.cut.pro.monthly`.
- Apple subscription ID: `6798020349`.
- Duration: one month.
- Availability: United States only.
- United States price schedule saved at `$4.99` for new subscribers.
- Family Sharing remains off.
- The subscription has zero introductory offers, zero upcoming changes, and no
  free trial.
- Only the United States is selected for availability, and automatic
  availability in future countries or regions is off.
- English (U.S.) group display name: `CUT OS Pro`.
- English (U.S.) product display name: `CUT OS Pro Monthly`.
- English (U.S.) description:
  `Weigh-ins, balanced meals & nutrition totals.`
- App-name display option uses the app name `CUT OS`.
- The group and product both remain in Prepare for Submission.

The price record is saved in App Store Connect, but it is not recorded as
effective for customers because the app and subscription have not been
submitted or released.

## Subscription review notes

- Factual, credential-free Review Notes are saved on Apple subscription ID
  `6798020349`.
- The subscription remains in Prepare for Submission.
- It is not attached to app version 1.0.0 and has not been submitted.
- The required review screenshot has not been uploaded.
- The pricing page labels the schedule as `Starting Price`, but no defensible
  effective timestamp is available. The repository therefore keeps price
  effectiveness pending.

## Signing and Apple credentials

- One Apple distribution certificate is active for the CUT OS team and expires
  August 8, 2027.
- One App Store provisioning profile is active for
  `com.zarifahmed.cut` and expires August 8, 2027.
- No certificate secret, private key, or provisioning-profile contents are
  recorded here.

## Apple API credentials

- Team App Store Connect API access is active. The minimum App Manager key
  named `CUT RevenueCat Sync` exists and showed `Last Used` on August 8, 2026.
- Apple In-App Purchase key access is separately active. The key named
  `CUT RevenueCat Production` showed as downloaded on August 4, 2026.
- No issuer ID, key ID, private-key contents, or downloaded credential is
  recorded here.
- Apple proves that the App Manager key exists and has been used. At that
  intermediate verification point, direct RevenueCat validation was still
  pending. The superseding direct RevenueCat result is recorded below.

## TestFlight internal configuration

- Internal group name: `CUT OS Internal QA`.
- Automatic distribution: off.
- Testers: 1; the Account Holder was directly reverified as an internal tester
  on August 8, 2026.
- Builds: 0.
- The repository beta app description is saved exactly in App Store Connect.
- TestFlight feedback email is saved as the already owner-authorized public
  email `ahmed.zarif@gmail.com`.
- No build is uploaded or assigned to the group, and no TestFlight QA is
  represented as complete.

## RevenueCat

- Project REST ID: `projea0cbd46`.
- Production Apple app REST ID: `app8feee0dfba`.
- Production Apple app bundle ID: `com.zarifahmed.cut`.
- Production Apple product REST ID: `prod66e8dc0083`.
- The production product identifier is
  `com.zarifahmed.cut.pro.monthly`, with product type Subscription.
- The production product is attached to entitlement `CUT_OS_PRO`, whose REST
  ID is `entl8efd6d2c18`; the entitlement now shows one product.
- The default offering REST ID is `ofrngeb5cc4a73c`. Its `$rc_monthly`
  package now includes the production Apple product alongside the isolated Test
  Store product.
- The Apple In-App Purchase subscription key was uploaded through the secured
  file chooser and RevenueCat reports `Valid credentials`.
- At `2026-08-08T21:24:17Z`, exact App Store app `app8feee0dfba` for
  `com.zarifahmed.cut` also showed `Valid credentials` for the owner-authorized
  App Store Connect API credential. The machine status is now `verified`.
- RevenueCat provisioned the production public iOS SDK key. Its value is
  intentionally not stored in this repository.
- Replit directly shows the project, Apple app, entitlement, and offering REST
  IDs as non-secret configurations. Replacement key value transfer was made
  directly into the masked `REVENUECAT_SECRET_API_KEY` secret without printing
  or storing the value in the repository.
- The August 5 record that the optional App Store Connect sync credential had
  not been created was accurate at that verification point. The owner later
  expressly approved the Apple API attestation, key creation, and secure
  RevenueCat upload. Apple now shows the owner-authorized App Manager key as
  active and used. This is distinct from the required valid In-App Purchase
  subscription key.
- The earlier Apple-only check did not establish RevenueCat acceptance and is
  retained as historical context. The direct RevenueCat check above supersedes
  that pending state. Apple server notifications show no notifications received;
  credential validity is not notification-delivery or exact-build purchase QA.
- Replacement API key label:
  `CUT Replit Production Replacement 2026-08-04`.
- API version: v2.
- Customer Information permission: Read & write.
- Project Configuration permission: Read only.
- Charts permission: No access.
- The key value was viewed only to transfer it directly into masked Replit
  Secrets. It was not printed, logged, or stored in the repository.
- Project restore behavior is persisted as `Transfer to new App User ID`.
- The exact production Apple app, product, entitlement, and default monthly
  offering mapping is verified.
- Active default offering `ofrngeb5cc4a73c`, display name `CUT OS Pro`, has one
  `$rc_monthly` package. Apple product `prod66e8dc0083`, exact identifier
  `com.zarifahmed.cut.pro.monthly`, is associated with entitlement `CUT_OS_PRO`
  (`entl8efd6d2c18`) and that default offering. The separate Test Store sibling
  remains test-only and is excluded from production claims.
- RevenueCat reports store status `MISSING_METADATA` and no transactions. This
  is an Apple metadata, TestFlight, and subscription review-screenshot gate,
  not a product-entitlement-offering mapping failure.
- At `2026-08-05T00:46:13Z`, the source-controlled, read-only production
  preflight returned only `{"status":"verified"}`. Replit was then
  fast-forwarded cleanly to then-current green commit
  `930a70eb4773b534c9d9fa33fb6030bdd6ee5a54`, and the same preflight again
  returned only `{"status":"verified"}`. It verified the exact project, app,
  entitlement, CUT iOS product, current offering/package association, and
  bounded customer-read access. RevenueCat's separate Test Store companion
  product was correctly ignored because it belongs to another app.
- Customer Information read/write permission is verified from the exact
  replacement-key dashboard settings. The live preflight proves read access;
  no customer write or deletion was issued merely to test permission.
- Owner authorization of the RevenueCat production connection and **Transfer to
  new App User ID** restore behavior was confirmed at
  `2026-08-05T00:25:43Z`.
- No exact-build native purchase or restore QA has been completed.

## Open gates

- The Apple In-App Purchase subscription credential remains secured outside the
  repository. Apple separately shows the In-App Purchase key as active; its
  contents and storage location are intentionally excluded.
- The owner-authorized App Store Connect API credential and the required Apple
  In-App Purchase key configuration both show `Valid credentials` in the exact
  RevenueCat app. Exact
  mapping, customer-delete permission, **Transfer to new App User ID** restore
  behavior, and controlled exact-build native purchase/delete/restore/server-
  unlock verification remain mandatory. The superseded server key remains
  unconfigured; revocation requires a distinct destructive credential
  confirmation.
- The first subscription must still be attached to version 1.0.0 with the
  approved review screenshot. Its factual credential-free Review Notes are
  already saved.
- Paid Apps Agreement, banking, and W-9 tax readiness are confirmed active.
- Public Privacy, Terms, and Support pages, screenshots, App Review contact and
  sign-in details, content-rights and copyright answers, age-rating answers,
  regulated-medical-device declaration, Digital Services Act compliance, final
  legal and qualified nutrition review, exact signed-build QA, TestFlight, App
  Review submission, and manual public release all remain pending.

This evidence intentionally makes no claim that those open gates are approved
or complete.
