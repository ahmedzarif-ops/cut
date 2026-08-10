# CUT OS — App Store metadata source of truth

**Status:** Working submission record; not approved for submission

**Updated:** August 10, 2026

This file records the intended App Store answers and the evidence still needed.
`app-store/app-store-submission.json` is its machine-checkable companion; the
draft listing copy and privacy-manifest mapping must remain synchronized. App
Store Connect must be completed from the shipped binary, production
configuration, public policies, and then-current Apple questionnaire. Nothing
here is a substitute for owner, legal, or App Review approval.

## Product and audience

| Field                 | Working position                                                                                          | Release gate                                                                                                |
| --------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Product               | CUT OS                                                                                                    | Name clearance and owner approval remain open.                                                              |
| Seller/legal operator | Zarif Ahmed; active Individual membership and Account Holder; Texas sole-proprietorship path under review | Verify Apple's eventual public seller display and obtain counsel review of the selected individual path.    |
| Primary audience      | Adults age 18 and older who lift; owner confirmed the 18+ launch position                                 | Must appear consistently in product copy, Terms/EULA, support material, and review notes.                   |
| Eligibility policy    | `adult-18-v1`                                                                                             | Server and release-build bypass tests must pass.                                                            |
| Primary category      | Health & Fitness; saved in App Store Connect                                                              | Owner/reviewers must confirm against the final feature set.                                                 |
| Made for Kids         | No                                                                                                        | Do not select the Kids category.                                                                            |
| Public description    | Must state that CUT OS is for adults 18+ and provides general wellness/fitness guidance, not medical care | Final copy requires owner, legal, and qualified health/nutrition review.                                    |
| Support URL           | `https://getcutos.com/support`; owner-approved source is hash-bound                                       | Publish and verify the exact HTTPS response before submission.                                              |
| Privacy Policy URL    | `https://getcutos.com/privacy`; owner-approved source is hash-bound                                       | Publish and reconcile the exact response with saved App Store privacy answers.                              |
| Terms/EULA            | Apple Standard EULA plus `https://getcutos.com/terms` for the CUT OS service                              | Publish and verify the CUT OS Terms; preserve owner-deferred professional review without claiming approval. |
| Age Suitability URL   | Optional; pending owner decision                                                                          | If supplied, it must explain the adults-only policy and self-declared gate accurately.                      |

A preliminary U.S. knock-out screen on August 4, 2026 found no exact `CUT OS`
result but did find a crowded same-market `CUT` field, including live federal
marks and multiple body-recomposition/nutrition apps. This does not clear the
name. Qualified U.S. trademark review remains required before the App Store
record, domain, or paid campaign is locked.

## Focused v1 listing copy

This is the only launch positioning supported by the current repository scope;
it remains pending verification in the submitted binary. Do not add adaptive
coaching, personalized targets, trends, workouts, reminders, progress,
closeout, or weekly review to the listing or screenshots until those features
ship and are verified.

**Subtitle draft:** Daily weigh-ins & meal logging

**Description draft:**

CUT OS brings daily weigh-ins, balanced meals, and estimated nutrition totals
into one focused check-in for adults who lift.

- See one clear next action for today.
- Log or update one daily weigh-in.
- Choose from six curated balanced-meal options.
- Review ingredients, common allergens, portions, and estimated nutrition.
- Log, edit, or delete meals and see today's estimated nutrition totals.
- Keep account data synced and delete the account in-app.

CUT OS provides general fitness and nutrition information, not medical advice.
Meal nutrition is estimated. Ingredient and common-allergen lists must be
reviewed against the exact products you use and are not an allergen-safety
guarantee.

CUT OS is for adults age 18 and older. Paid access uses an auto-renewable Apple
subscription. The exact localized price and billing period appear before you
confirm purchase. You can restore purchases in the app and manage or cancel the
subscription through Apple.

Terms: https://getcutos.com/terms

**Keywords draft:** weight,meal,protein,macros,lifting,nutrition,weigh-in,tracker,calorie,food,diet,bodybuilding,fiber

**Promotional text draft:** One focused daily check-in for lifters: log a weigh-in, choose a balanced meal, and review today's estimated nutrition totals.

The owner must approve this copy after exact-build review. Professional legal
and nutrition review is explicitly deferred under the August 10 owner-risk
record and must not be represented as completed. The owner has approved the
$4.99 monthly/no-trial offer, but StoreKit-localized price and period must still
come from the real App Store product rather than being typed into the listing.

## App Store Connect field inventory

The defaults below are safe working positions for the initial English (U.S.)
1.0 listing. A `null` in the machine-checkable companion is deliberate: it
means the field is unresolved or intentionally omitted, never that Codex should
invent a value.

| App Store Connect field    | Provisional v1 value                                       | Release gate                                                                                                                    |
| -------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| App name                   | CUT OS; App Store Connect record created                   | Apple accepted the record; name clearance and owner approval remain open.                                                       |
| Bundle ID                  | `com.zarifahmed.cut`                                       | Must match the signed archive and existing App Store Connect record.                                                            |
| App version                | `1.0.0`                                                    | Must match the submitted build.                                                                                                 |
| Primary language           | English (U.S.) / `en-US`; saved                            | Reconfirm against the exact submitted version.                                                                                  |
| Subtitle                   | Daily weigh-ins & meal logging; saved                      | Owner/reviewer and exact-build claims approval remain open.                                                                     |
| Description                | Focused v1 listing copy above                              | Owner, legal, nutrition, and final-binary review remain open.                                                                   |
| Keywords                   | Draft above                                                | Recheck byte limit and owner approval before submission.                                                                        |
| Primary category           | Health & Fitness; saved                                    | Owner/reviewers must confirm against the final feature set.                                                                     |
| Secondary category         | None                                                       | Safe v1 omission unless the owner selects a supported second category.                                                          |
| Made for Kids              | No                                                         | Do not select the Kids category.                                                                                                |
| Promotional text           | Focused v1 promotional copy above                          | Owner/reviewer approval remains open; keep it aligned with verified shipped behavior.                                           |
| Marketing URL              | Omit for initial v1                                        | Optional; do not add until a public, accurate marketing page exists.                                                            |
| What's New                 | Not applicable to the initial 1.0 submission               | Supply truthful release notes for later versions.                                                                               |
| Support URL                | `https://getcutos.com/support`                             | Publish and verify the exact public response.                                                                                   |
| Privacy Policy URL         | `https://getcutos.com/privacy`                             | Publish and reconcile the exact response with the App Store privacy questionnaire.                                              |
| Terms/EULA URL             | `https://getcutos.com/terms`; Apple Standard EULA selected | Publish the CUT OS Terms, include the exact URL in the listing description, and verify the selected Standard EULA path.         |
| Age Suitability URL        | Omit unless owner approves one                             | Optional; if supplied, it must describe the self-declared 18+ gate accurately.                                                  |
| Seller/legal operator      | Zarif Ahmed; active Individual Account Holder              | Verify Apple's eventual public seller display and obtain counsel review before submission.                                      |
| SKU                        | `cut-ios-v1`; immutable app record created                 | Must match the existing App Store Connect record.                                                                               |
| Copyright                  | Unresolved                                                 | Owner supplies the correct year and rights holder.                                                                              |
| Content-rights declaration | Unresolved                                                 | Owner/counsel answer from the final catalog, artwork, copy, and licensed content.                                               |
| Initial territories        | United States only (`US`); saved                           | Controlled evidence retained; keep other storefronts unavailable for v1.                                                        |
| App distribution method    | Public; saved                                              | Controlled evidence retained; signed-build and submission gates remain open.                                                    |
| Apple silicon Mac          | Do Not Make Available; saved                               | Keep disabled until platform-specific QA is approved.                                                                           |
| Apple Vision Pro           | Do Not Make Available; saved                               | Keep disabled until platform-specific QA is approved.                                                                           |
| App download price         | Free download; saved                                       | Paid Apps Agreement, banking, and W-9 are active; subscription release remains open.                                            |
| License agreement          | Unresolved                                                 | Owner/counsel chooses Apple's standard EULA or an approved custom EULA.                                                         |
| App tax category           | Unresolved                                                 | Owner/counsel/finance confirms the value; the subscription inherits it unless an explicit override is approved.                 |
| DSA trader status          | Unresolved                                                 | Owner/counsel confirms trader or non-trader; Apple still requires the declaration when distribution excludes the EU.            |
| Server Notifications       | Omit for initial v1                                        | Optional. If added later, use RevenueCat's full production URL; Apple's sandbox field may be empty and fall back to production. |
| Release method             | Manual release; saved                                      | Keep manual until the owner explicitly approves both submission and public release in App Store Connect.                        |

These three availability choices are explicit because Apple can otherwise make
an iPhone/iPad app available through additional distribution or compatibility
surfaces. CUT's current launch QA is iPhone-only. The machine record therefore
records Public [distribution](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/set-distribution-methods),
[Apple silicon Mac availability](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/manage-availability-of-iphone-and-ipad-apps-on-macs-with-apple-silicon),
and [Apple Vision Pro availability](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/manage-availability-of-iphone-and-ipad-apps-on-apple-vision-pro)
as Do Not Make Available. These distribution and compatibility selections were
saved in App Store Connect on August 4, 2026; controlled non-secret evidence is
retained in
`app-store/evidence/apple-live-configuration-2026-08-04.md#distribution`.

Across the machine records, these URL fields use closed schemas. Support,
Privacy, Terms, Marketing, Accessibility, and Age Suitability URLs must be
public credential-free HTTPS when present; single-label names, IP literals, and
the validator's reserved/non-public suffixes are rejected. Production builds
additionally require the compiled
Privacy, Terms, and Support URLs to exactly match the corresponding committed
listing values. This prevents the reviewed App Store record and the links in the
submitted binary from drifting without printing either value in validation
output.

For release, `listing.legalUrlPlacement` must also record where Apple receives
the exact committed Privacy and Terms URLs. Privacy may use the dedicated App
Store Connect Privacy Policy URL field or the listing description. Terms may use
the listing description, a custom-license-agreement body when
`commercialAndLegal.licenseAgreement` is `custom_eula`, or Apple's standard EULA
selection only when the committed Terms URL is Apple's canonical standard-EULA
URL and the chosen license is `standard_apple_eula`. A description placement
passes only when the literal committed URL appears in the submitted description.
Each placement also records the exact submitted URL and must match the committed
listing URL without normalization. Release and confirmed listing approval also
require `appStoreConnectConfirmation` to be `confirmed` with a UTC verification
time and controlled non-secret evidence reference showing those exact placements
were saved in App Store Connect. The working record keeps both placements
`pending`, both submitted URLs `null`, and that confirmation pending while the
public URLs and license decision remain unresolved.

`listing.approval` remains pending until name clearance, exact-name acceptance
in App Store Connect, owner approval, legal review, qualified nutrition review,
and exact-build claims review are each confirmed with UTC and a controlled,
non-secret evidence reference. The exact-build claims review also carries the
canonical version/build/Git/EAS/App Store Connect identity and must match the
TestFlight record.

`commercialAndLegal.appleCommerceReadiness` records Apple Developer Program
membership, Account Holder access, the Paid Apps Agreement, the U.S. W-9, and
banking as confirmed active. Never store account, agreement, tax, or banking
credentials or values in this record.

## Age rating and questionnaire

The App Store age rating supports storefront disclosure and parental controls.
It is not the in-app eligibility decision. CUT OS separately uses a
self-declared full DOB, processed transiently by the server under
`adult-18-v1`, and stores only the resulting status, policy version, and
decision time. It must not be described as identity or age verification.

Working answers/evidence for the final questionnaire:

- Complete every content descriptor from the final binary and listing; do not
  choose answers merely to obtain a preferred rating.
- The machine record includes all 24 current working descriptors: Parental
  Controls, Age Assurance, Unrestricted Web Access, User-Generated Content,
  Social Media, Social Media Disabled for Users Under 13, Messaging/Chat,
  Advertising, Profanity/Crude Humor, Horror/Fear, Alcohol/Tobacco/Drug
  References, Medical/Treatment Information, Health/Wellness Topics,
  Mature/Suggestive Themes, Sexual Content/Nudity, Graphic Sexual Content and
  Nudity, Cartoon/Fantasy Violence, Realistic Violence, Prolonged Graphic or
  Sadistic Realistic Violence, Guns/Weapons, Gambling, Simulated Gambling,
  Contests, and Loot Boxes. Missing, duplicate, reordered, or unconfirmed
  entries block release.
- **Health or Wellness Topics:** Yes. Current CUT OS behavior includes calorie,
  dieting, fitness, and exercise guidance.
- **Medical or Treatment Information:** Provisional working answer **None**.
  The current launch binary and listing provide general wellness information,
  expressly not diagnosis, treatment, clinical guidance, or personalized
  medical advice. This is not approved: qualified health/nutrition review,
  legal review, owner review, final-binary verification, and confirmation in
  the live App Store Connect questionnaire are mandatory before saving it.
- **Age Assurance:** Provisional working answer **Yes**. This is an inference
  from Apple's current definition because CUT OS asks for a full DOB solely to
  confirm whether the user meets its 18+ requirement. The mechanism is
  self-declared and must never be described as identity verification or
  verified age. Owner, legal, final-binary, and live App Store Connect
  confirmation are mandatory before saving this answer.
- **Social Media:** No for the current v1 scope. Social/community is deferred.
- **User-Generated Content, Messaging/Chat, Advertising, Unrestricted Web
  Access:** No for the current v1 scope, subject to final-binary verification.
- **Made for Kids:** No.
- The owner has confirmed the intended **18+** launch position. Once the final
  Terms/EULA requires age 18, choose **Override to Higher Age Rating → 18+** if
  Apple's calculated rating is lower. Apple says an app whose
  EULA minimum exceeds the calculated rating must override to a rating that
  adheres to the EULA. Verify region- and OS-specific display values before
  submission.
- Record screenshots/PDF evidence of the saved questionnaire, calculated
  rating, override, UTC date, reviewer, and questionnaire version/revision in
  `ageRating.savedQuestionnaireEvidence` and the release record.

The machine record stores the current App Store/iOS 26-and-later global values
(`4+`, `9+`, `13+`, `16+`, `18+`, or `Unrated`), not the legacy value an older
OS may display. Release rejects `Unrated` and requires the saved effective
post-override value to be `18+`; retain any region- or older-OS display mapping
in the controlled evidence reference rather than substituting it into these
fields.

The current questionnaire includes social-media capability questions. Apple
announced that responses are required for new apps and updates beginning in
September 2026; CUT OS should answer No unless the shipped product changes.

## Regulated medical device declaration

[Apple currently requires a regulated-medical-device declaration](https://developer.apple.com/help/app-store-connect/manage-app-information/declare-regulated-medical-device-status)
when an app with a Health & Fitness or Medical category is available in the
United States, European Union/European Economic Area, or United Kingdom. The
live form uses region-specific regulatory positions, not one global checkbox.

The evidence-backed working position for CUT OS is **not a regulated medical
device** in each of those three region groups because current v1 provides
general fitness and nutrition information, not diagnosis, prevention,
monitoring, treatment, clinical guidance, or regulated-device functionality.
This position is provisional, not approved. Do not save it in App Store Connect
until:

- the owner-approved United States territory is confirmed in App Store
  Connect;
- legal or a qualified regulatory reviewer checks each applicable regional
  answer;
- the final binary and all health/nutrition claims are verified; and
- the applicable US, EU/EEA, and/or UK declaration is confirmed in the live App
  Store Connect form.

`app-store/app-store-submission.json` records the owner-approved United States
territory while keeping every regional declaration approval false until that
evidence exists. Release validation must fail if Health & Fitness availability
intersects one of these regions without the corresponding confirmed
declaration. Product copy must not claim regulated-device status, diagnosis,
treatment, or clinical outcomes without documented regulatory and legal
support.

## Authentication security prelaunch gate

`artifacts/cut-os/AUTH_SECURITY_PRELAUNCH.md` is a public-launch blocker, not a
future hardening suggestion. The App Store recovery route now uses Clerk's
documented custom email-code password-reset flow through the same verified
same-origin proxy configured on CUT's `ClerkProvider`. The request step always
shows one generic public notice and never renders raw provider errors. The Expo
web recovery route remains Clerk's prebuilt non-transferable sign-in component
and explicitly routes any sign-up link to CUT's guarded `/sign-up` screen.

`app-store/app-store-submission.json` records
`clerk_supported_server_or_proxy_recovery` with official Clerk documentation and exact
implementation references. Authentication security remains
`pending_supported_recovery_architecture_and_production_evidence`, with every
approval false. Release validation must remain blocked until all of the
following are recorded:

- production Clerk **Attack protection → User enumeration protection →
  Strict**, plus Native API/application registration for the exact build;
- physical-iPhone verification of the proxy-backed reset request, email-code
  verification, new-password completion, session synchronization, and absence
  of any sign-up transfer;
- production Clerk tenant evidence for the same generic public response,
  response-envelope parity, timing parity, enumeration-resistant rate limits,
  provider-failure behavior, and abuse logging that excludes raw reset codes and
  passwords; and
- explicit owner, security-reviewer, provider-support, and production-evidence
  approvals.

Use only non-secret tenant aliases and sanitized evidence references. Do not put
email identifiers, reset codes, passwords, response bodies, raw timings tied to
an identifier, or provider credentials in the repository.

## App Privacy working position

Reconcile this list against the production archive, backend, Clerk, RevenueCat
when added, hosting/database logs and backups, crash reporting, analytics,
support tools, and every embedded SDK:

The following table is a copy-ready **provisional baseline** for the seven
first-party data types in the current app privacy manifest. `Collected` means
the manifest declares the type. It is not final App Store Connect evidence
until the production archive and every vendor are reconciled.

| App Store data type          | Collected | Linked to user | Tracking | Purposes                                   | Current v1 examples/evidence                                                                                                    |
| ---------------------------- | --------- | -------------- | -------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Contact Info — Name          | Yes       | Yes            | No       | App Functionality; Product Personalization | Display name for account setup and the user-directed greeting.                                                                  |
| Contact Info — Email         | Yes       | Yes            | No       | App Functionality                          | Clerk sign-in and account support.                                                                                              |
| Health & Fitness — Health    | Yes       | Yes            | No       | App Functionality; Product Personalization | Start/goal weight, daily weigh-ins, and nutrition records that ship in v1.                                                      |
| Health & Fitness — Fitness   | Yes       | Yes            | No       | App Functionality; Product Personalization | Adults-who-lift goal context and current fitness-related check-in data; no workout logging ships in v1.                         |
| Identifiers — User ID        | Yes       | Yes            | No       | App Functionality                          | Internal user UUID and authentication/account linkage.                                                                          |
| Other Data Types             | Yes       | Yes            | No       | App Functionality; Product Personalization | Eligibility result/version/time, timezone, unit preference, goal, and meal records where the live questionnaire maps them here. |
| Purchases — Purchase History | Yes       | Yes            | No       | App Functionality; Analytics               | Apple/RevenueCat subscription, renewal, expiry, refund, and entitlement state.                                                  |

Do not add workout collection to the v1 answers: the current paid-v1 scope has
no workout logger. Client IP/network metadata is processed for abuse
prevention, request delivery, and Clerk authentication; the final hosting and
Clerk retention/linkage determine whether the live questionnaire maps it to
Identifiers, Diagnostics, or Other Data Types. Diagnostics or Usage Data must
be added only if the final SDK/archive and production configuration collect
them, with their actual purpose and linkage documented. Neither of these
external-service questions is resolved by the app-level manifest alone.

Raw DOB is transmitted only to make the real-time decision and is discarded
immediately. Apple's current App Privacy definition of “collect” focuses on data
retained beyond servicing the request, but the public Privacy Policy and
notice-at-collection must still explain this transient processing. Counsel and
the App Store owner must confirm the live questionnaire treatment. No CUT OS
health, nutrition, weight, workout, or eligibility data is used for tracking or
advertising audiences.

The four required-reason API rows in `privacy.requiredReasonApis` are an exact,
ordered copy of the current `app.json` privacy manifest. Working validation
fails on any type, reason, order, or key drift. Release still requires the final
archive and embedded SDK privacy report because the source manifest alone does
not prove the submitted archive.

## Structured subscription, review, TestFlight, and accessibility gates

The machine record now carries the owner-approved subscription group/product
reference names, immutable product ID, monthly duration, saved U.S. USD
price, no-introductory-offer decision, Family Sharing disabled, English (U.S.)
display names, exact 45-character description, and `use_app_name` selection.
Apple's live reference limits the localizable description to 45 characters; the
initially approved 54-character sentence must not be entered. The exact
corrected offer is bound to its recorded decision by working validation. The
U.S. $4.99 Starting Price record and U.S.-only availability are saved with
controlled evidence; no defensible effective timestamp is recorded and
public/effective revenue status remains pending. The subscription tax category
inherits the required app-level category unless an explicit override is
approved.
RevenueCat production Apple app “app8feee0dfba” is created for
“com.zarifahmed.cut”; its Apple subscription key is valid. Product
“prod66e8dc0083” maps to “CUT_OS_PRO”. The “default” offering uses its
“$rc_monthly” package. A public iOS SDK key is provisioned, but its value is not
recorded here. A RevenueCat server API v2 replacement key named “CUT Replit
Production Replacement 2026-08-04” is created with Charts no access, Customer
Information read/write, and Project Configuration read-only permissions, and
its value is saved masked in Replit. The owner confirmed Decision 3 using the
exact phrase “approve RevenueCat server-key replacement and Decision 3”. The
old unconfigured key remains in place and has not been revoked. A live
source-controlled, read-only preflight passed from Replit on exact green commit
`930a70eb4773b534c9d9fa33fb6030bdd6ee5a54`, verifying bounded customer-read
access and the exact CUT iOS mapping. Customer read/write permission is
verified from the exact dashboard setting without issuing a test write or
deletion. RevenueCat's optional App Store Connect API sync credential is
intentionally omitted after Apple's live authorization attestation limited it
to internal-team use; this omission does not replace native purchase/restore
QA. The exact build, submission, and release remain pending.
Release requires App Store Connect confirmation, attachment to version 1.0,
retention of the already saved credential-free Review Notes, an uploaded review
screenshot whose SHA-256 equals approved shot 07, verified RevenueCat mapping,
exact-build StoreKit/Purchase QA/TestFlight evidence, and attributable owner/App
Store Connect/RevenueCat/native-QA approvals. The U.S. price record also binds
the owner decision revision and its controlled evidence reference.

The working validator now enforces Apple's verified current limits for Product
Reference Name (64), Product ID (100), product Display Name (2–30), and
localizable description (45), with at-limit and one-over regression tests.
Continue to recheck these limits immediately before App Store Connect entry and
do not guess undocumented group-field or custom app-name limits.

App Review requires five purpose-built synthetic account states: full access,
purchase, first adult-gate decision, restricted, and deletion. Each account
must pass a production sign-in within 24 hours of submission and be attested as
non-expiring for the review window with no user MFA or out-of-band delivery
trap. The selected Clerk strategy uses reserved `+clerk_test` accounts and
fixed code `424242` only while production test mode is explicitly enabled for
App Review. Client Trust remains enabled. The exact TestFlight build must prove
the new-device flow. Production test mode must be disabled immediately after
approval, rejection, withdrawal, removal from review, abandonment, or
unexpected reserved-account activity. After approval, the disabled state is
separately evidenced before manual public release. Fresh exact-build evidence
records only account aliases, result, UTC, and evidence reference; credentials
must remain in App Store Connect or approved secret storage. The final text
copied from `APP_REVIEW_RUNBOOK.md` must remain within 4,000 UTF-8 bytes after
every placeholder is resolved. Save only the credential-free template SHA-256
and final measurement/save attestation—never a hash or copy of the resolved
credential-bearing text.

`app-store/testflight-submission.json` separately records beta copy, internal
group configuration, exact version/build/full Git commit/EAS build ID/App Store
Connect build ID, QA references, and approvals. That five-field identity must
match listing claims review, App Review, screenshot, subscription, and
any later published accessibility-label evidence exactly. The initial voluntary
label omission deliberately has no exact-build or App Store Connect label
evidence.
Internal-only testing is not external TestFlight App Review approval. If the
owner selects external testing, review contact, demo access, notes, and the
selected exact build become mandatory.

Apple currently makes Accessibility Nutrition Labels voluntary. CUT's initial
release explicitly leaves them unreported, so the product page may show that
support has not yet been indicated. Do not fabricate an App Store Connect save
or infer support from framework use or automated checks. Physical-iPhone
accessibility QA still applies. If labels are published later, test the recorded
common tasks on the exact iPhone build; every claimed feature must cover all
canonical tasks, with only Captions and Audio Descriptions eligible for the
no-media state, and retain attributable saved evidence.

## App Review notes checklist

- State clearly: “CUT OS is for adults age 18 and older.”
- Explain that DOB is self-declared, processed transiently on the server using
  the UTC `adult-18-v1` rule, and never stored; only the outcome is retained.
- Explain that the first decision is final for that Clerk identity under v1. An
  ineligible person can use Settings, sign out, or delete the account, but
  cannot correct/retry DOB in app; future adult access requires deleting that
  identity/account and creating a new account.
- Provide a current `eligible` adult review account and exact full-access steps.
- Put that primary account's single username/password pair in App Store
  Connect's Sign-in Information. Put any additional purpose-built synthetic
  path-specific accounts in App Review Notes, because Apple exposes only one
  Sign-in Information pair.
- State that a new device may ask for the review code `424242`, that no email is
  delivered for the reserved synthetic accounts, and verify that instruction
  against the exact submitted build before saving the notes.
- Explain the `unverified` (`428`) and `ineligible` (`403`) server behavior and
  provide a controlled under-18 test path without exposing real personal data.
- Explain account deletion, subscription management, and any review-only setup.
- State the exact subscription group/product submitted with the build, where
  the subscription screen appears, how to purchase/restore/manage it, and that
  the app reads localized price and duration from StoreKit.
- Describe paid scope narrowly: one daily next action, daily weigh-in, six
  curated meal choices, meal logging, and daily nutrition totals.
- Keep the production backend and required authentication services live.
- Describe wellness/nutrition limitations accurately; do not imply medical or
  allergen-safety guarantees.

## Submission approvals still required

- **Owner/App Store role:** legal seller choice, metadata, category,
  questionnaire, 18+ override, privacy answers, review account, and Submit for
  Review.
- **Qualified business/App Store counsel:** resolve Guideline 5.1.1(ix), which
  says apps requiring sensitive user information should be submitted by a
  legal entity rather than an individual developer. CUT OS requires linked
  weight, body, fitness, and nutrition information, so an individual seller is
  a material review risk even though rejection is not certain.
- **Qualified privacy/legal counsel:** Terms/EULA, Privacy Policy,
  notice-at-collection, jurisdictions, retention/underage handling, and
  sufficiency of the self-declared assurance method, including permanent
  per-identity ineligibility and the later-new-account path.
- **Support owner:** restricted-account help, deletion/new-account instructions,
  and escalation handling for mistaken or later-adult users.
- **Qualified nutrition/health professional and counsel:** recipes, nutrition,
  allergen/dietary substantiation, claims, warnings, and recommendation scope.
- **Engineering/QA:** production inventory, server enforcement, migration,
  generated contract, automated tests, and native release-build evidence.
- **Security reviewer and owner:** supported password-recovery architecture,
  production-tenant response/timing/rate-limit evidence, safe abuse logging, and
  closure of `AUTH_SECURITY_PRELAUNCH.md` before public launch.

## Current Apple references

- [Set an app age rating](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/)
- [Age ratings values and definitions](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/)
- [App information](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information)
- [Manage app privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/)
- [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple Developer Program enrollment](https://developer.apple.com/programs/enroll/)
- [July 2026 social-media questionnaire update](https://developer.apple.com/news/?id=tlur8uvi)
- [Platform-version information and App Review fields](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information)
- [Auto-renewable subscription information fields](https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/auto-renewable-subscription-information)
- [Accessibility Nutrition Labels](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels/)
- [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/)
