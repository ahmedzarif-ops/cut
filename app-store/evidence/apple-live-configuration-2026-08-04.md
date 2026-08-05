# CUT OS — Apple live configuration evidence

**Initial verification:** 2026-08-04T21:33:17Z

**Latest live update:** 2026-08-05T00:46:13Z

**Method:** Direct confirmation in the live Apple Developer and App Store
Connect interfaces, direct confirmation in the RevenueCat dashboard, plus
checked-in routing validation.

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
- Version: `1.0.0`.
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

- App download price saved as free.
- Availability saved as United States only.
- Distribution method saved as Public.
- Apple-silicon Mac availability disabled.
- Apple Vision Pro availability disabled.
- Apple School Manager reduced pricing disabled.

These facts confirm the saved distribution configuration only. The app is not
submitted, approved, or publicly available.

## Subscription

- Subscription group: `CUT OS Pro`; Apple group ID `22286645`.
- Product reference name: `CUT OS Pro Monthly`.
- Product ID: `com.zarifahmed.cut.pro.monthly`.
- Apple subscription ID: `6798020349`.
- Duration: one month.
- Availability: United States only.
- United States price schedule saved at `$4.99` for new subscribers.
- Family Sharing remains off.
- No introductory offer or free trial was created.
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

## TestFlight internal configuration

- Internal group name: `CUT OS Internal QA`.
- Automatic distribution: off.
- Testers: 0.
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
- RevenueCat provisioned the production public iOS SDK key. Its value is
  intentionally not stored in this repository.
- Replit directly shows the project, Apple app, entitlement, and offering REST
  IDs as non-secret configurations. Replacement key value transfer was made
  directly into the masked `REVENUECAT_SECRET_API_KEY` secret without printing
  or storing the value in the repository.
- The separate App Store Connect API credential remains unconfigured. This is
  distinct from the valid In-App Purchase subscription key, so automatic
  product import, price synchronization, and RevenueCat store-status checks
  remain unavailable.
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
- Replit was fast-forwarded cleanly to green commit
  `a7cbea360593681e4971fea3b3c05e78cd7604e4`. At
  `2026-08-05T00:46:13Z`, the source-controlled, read-only production preflight
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
  repository. Its contents and storage location are intentionally excluded.
- RevenueCat still needs the separate App Store Connect API credential and
  controlled exact-build native purchase/restore verification. The superseded
  server key remains unconfigured; revocation requires a distinct destructive
  credential confirmation.
- The first subscription must still be attached to version 1.0.0 with the
  approved review screenshot. Its factual credential-free Review Notes are
  already saved.
- Paid Apps Agreement, banking, and W-9 tax readiness are confirmed active.
- Public Privacy, Terms, and Support pages, content-rights and copyright answers,
  age-rating answers, regulated-medical-device declaration, final legal and
  qualified nutrition review, exact signed-build QA, TestFlight, App Review
  submission, and manual public release all remain pending.

This evidence intentionally makes no claim that those open gates are approved
or complete.
