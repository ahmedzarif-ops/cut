# CUT OS — App Store metadata source of truth

**Status:** Working submission record; not approved for submission

**Updated:** August 4, 2026

This file records the intended App Store answers and the evidence still needed.
`app-store/app-store-submission.json` is its machine-checkable companion; the
draft listing copy and privacy-manifest mapping must remain synchronized. App
Store Connect must be completed from the shipped binary, production
configuration, public policies, and then-current Apple questionnaire. Nothing
here is a substitute for owner, legal, or App Review approval.

## Product and audience

| Field                 | Working position                                                                                          | Release gate                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Product               | CUT OS                                                                                                    | Name clearance and owner approval remain open.                                                     |
| Seller/legal operator | Undecided; no entity is currently confirmed                                                               | Counsel must resolve Apple's sensitive-data/legal-entity guidance before enrollment or submission. |
| Primary audience      | Adults age 18 and older who lift; owner confirmed the 18+ launch position                                 | Must appear consistently in product copy, Terms/EULA, support material, and review notes.          |
| Eligibility policy    | `adult-18-v1`                                                                                             | Server and release-build bypass tests must pass.                                                   |
| Primary category      | Health & Fitness                                                                                          | Owner must confirm against the final feature set.                                                  |
| Made for Kids         | No                                                                                                        | Do not select the Kids category.                                                                   |
| Public description    | Must state that CUT OS is for adults 18+ and provides general wellness/fitness guidance, not medical care | Final copy requires owner, legal, and qualified health/nutrition review.                           |
| Support URL           | Pending; validated in-app configuration is implemented                                                    | Owner must supply and verify a public, functional HTTPS page before submission.                    |
| Privacy Policy URL    | Pending; validated in-app configuration is implemented                                                    | Owner/counsel must publish and verify the required HTTPS policy before submission.                 |
| Terms/EULA            | Pending; validated in-app Terms link is implemented                                                       | Owner/counsel must choose and publish the final 18+ terms/EULA position.                           |
| Age Suitability URL   | Optional; pending owner decision                                                                          | If supplied, it must explain the adults-only policy and self-declared gate accurately.             |

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

**Keywords draft:** weight,meal,protein,macros,lifting,nutrition,weigh-in,tracker,calorie,food,diet,bodybuilding,fiber

**Promotional text draft:** One focused daily check-in for lifters: log a weigh-in, choose a balanced meal, and review today's estimated nutrition totals.

The owner, counsel, and qualified nutrition reviewer must approve this copy
after the final binary and catalog review. StoreKit-localized price and period
must never be typed into this listing until the owner creates and approves the
actual App Store product.

## App Store Connect field inventory

The defaults below are safe working positions for the initial English (U.S.)
1.0 listing. A `null` in the machine-checkable companion is deliberate: it
means the field is unresolved or intentionally omitted, never that Codex should
invent a value.

| App Store Connect field    | Provisional v1 value                         | Release gate                                                                                                                                                                                                                                                                                             |
| -------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App name                   | CUT OS                                       | Name clearance and owner approval remain open.                                                                                                                                                                                                                                                           |
| Bundle ID                  | `com.zarifahmed.cut`                         | Must match the signed archive and existing App Store Connect record.                                                                                                                                                                                                                                     |
| App version                | `1.0.0`                                      | Must match the submitted build.                                                                                                                                                                                                                                                                          |
| Primary language           | English (U.S.) / `en-US`                     | Confirm in App Store Connect.                                                                                                                                                                                                                                                                            |
| Subtitle                   | Daily weigh-ins & meal logging               | Owner/reviewer approval remains open.                                                                                                                                                                                                                                                                    |
| Description                | Focused v1 listing copy above                | Owner, legal, nutrition, and final-binary review remain open.                                                                                                                                                                                                                                            |
| Keywords                   | Draft above                                  | Recheck byte limit and owner approval before submission.                                                                                                                                                                                                                                                 |
| Primary category           | Health & Fitness                             | Owner must confirm against the final feature set.                                                                                                                                                                                                                                                        |
| Secondary category         | None                                         | Safe v1 omission unless the owner selects a supported second category.                                                                                                                                                                                                                                   |
| Made for Kids              | No                                           | Do not select the Kids category.                                                                                                                                                                                                                                                                         |
| Promotional text           | Focused v1 promotional copy above            | Owner/reviewer approval remains open; keep it aligned with verified shipped behavior.                                                                                                                                                                                                                    |
| Marketing URL              | Omit for initial v1                          | Optional; do not add until a public, accurate marketing page exists.                                                                                                                                                                                                                                     |
| What's New                 | Not applicable to the initial 1.0 submission | Supply truthful release notes for later versions.                                                                                                                                                                                                                                                        |
| Support URL                | Unresolved                                   | Owner must supply and verify a public, functional HTTPS page.                                                                                                                                                                                                                                            |
| Privacy Policy URL         | Unresolved                                   | Owner/counsel must publish and verify the required HTTPS policy.                                                                                                                                                                                                                                         |
| Terms/EULA URL             | Unresolved                                   | Owner/counsel must approve and publish the final 18+ terms position.                                                                                                                                                                                                                                     |
| Age Suitability URL        | Omit unless owner approves one               | Optional; if supplied, it must describe the self-declared 18+ gate accurately.                                                                                                                                                                                                                           |
| Seller/legal operator      | Unresolved                                   | Owner and counsel decision; never infer from the bundle ID or repository.                                                                                                                                                                                                                                |
| SKU                        | Unresolved                                   | Owner chooses this immutable account-level identifier before the app record is created.                                                                                                                                                                                                                  |
| Copyright                  | Unresolved                                   | Owner supplies the correct year and rights holder.                                                                                                                                                                                                                                                       |
| Content-rights declaration | Unresolved                                   | Owner/counsel answer from the final catalog, artwork, copy, and licensed content.                                                                                                                                                                                                                        |
| Initial territories        | Unresolved                                   | Owner selects the first storefronts; never infer worldwide availability or regulatory answers. Validate the repository's two-letter storefront codes against `app-store/app-store-connect-territories.json` and reconcile them to Apple's current three-letter App Store Connect API IDs before release. |
| App download price         | Unresolved                                   | Owner chooses free versus paid download; the subscription proposal does not decide this.                                                                                                                                                                                                                 |
| License agreement          | Unresolved                                   | Owner/counsel chooses Apple's standard EULA or an approved custom EULA.                                                                                                                                                                                                                                  |
| App tax category           | Unresolved                                   | Owner/counsel/finance confirms the live App Store Connect value; do not copy the subscription tax category by assumption.                                                                                                                                                                                |
| DSA trader status          | Unresolved                                   | Owner/counsel confirms trader, non-trader, or a documented no-EU-distribution position.                                                                                                                                                                                                                  |
| Server Notifications       | RevenueCat direct; URLs pending              | Use the full dashboard-issued RevenueCat URL in both production and sandbox App Store Connect fields, then retain non-secret evidence.                                                                                                                                                                   |
| Release method             | Manual release                               | Keep manual until the owner explicitly approves both submission and public release in App Store Connect.                                                                                                                                                                                                 |

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

`commercialAndLegal.appleCommerceReadiness` separately keeps Apple Developer
Program membership, Account Holder access, the Paid Apps Agreement, tax forms,
and banking pending until each has a confirmation UTC and controlled non-secret
evidence reference. All five must be confirmed for release. Never store account,
agreement, tax, or banking credentials or values in this record.

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

- the owner selects and approves the exact initial territories;
- legal or a qualified regulatory reviewer checks each applicable regional
  answer;
- the final binary and all health/nutrition claims are verified; and
- the applicable US, EU/EEA, and/or UK declaration is confirmed in the live App
  Store Connect form.

`app-store/app-store-submission.json` keeps initial territories `null` and all
regional declaration approvals false until that evidence exists. Release
validation must fail if Health & Fitness availability intersects one of these
regions without the corresponding confirmed declaration. Product copy must not
claim regulated-device status, diagnosis, treatment, or clinical outcomes
without documented regulatory and legal support.

## Authentication security prelaunch gate

`artifacts/cut-os/AUTH_SECURITY_PRELAUNCH.md` is a public-launch blocker, not a
future hardening suggestion. The App Store recovery route now delegates to
Clerk's documented prebuilt native `AuthView` in sign-in-only mode. CUT's
browser/development fallback still uses one generic message, but it is not the
release architecture and a client-side delay is not an enumeration defense.
The Expo web recovery route also uses Clerk's prebuilt non-transferable sign-in
component and explicitly routes any sign-up link to CUT's guarded `/sign-up`
screen. CUT's remaining custom reset screen is a non-launch fallback.

`app-store/app-store-submission.json` records
`clerk_hosted_or_prebuilt_recovery` with official Clerk documentation and exact
implementation references. Authentication security remains
`pending_supported_recovery_architecture_and_production_evidence`, with every
approval false. Release validation must remain blocked until all of the
following are recorded:

- production Clerk **Attack protection → User enumeration protection →
  Strict**, plus Native API/application registration for the exact build;
- physical-iPhone verification of Clerk's beta native `AuthView`, including
  password recovery, session synchronization, and no sign-up affordance;
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

The machine record leaves the subscription group/product reference names,
immutable product ID, duration, structured U.S. USD price and effective-date
evidence, introductory-offer decision and exact terms, Family Sharing, tax
category, English (U.S.) display copy, and App Name Display Option unresolved.
Release requires App Store Connect confirmation, attachment to version 1.0,
review notes, an uploaded review screenshot whose SHA-256 equals approved shot
07, verified RevenueCat mapping, exact-build StoreKit/Purchase QA/TestFlight
evidence, and attributable owner/App Store Connect/RevenueCat/native-QA
approvals. The U.S. price record also binds the owner decision revision and its
controlled evidence reference.

Before any subscription reference name, product ID, localized display name,
description, or custom app-name value is entered, recheck its current limit in
Apple's official App Store Connect field reference and add field-specific
boundary tests to `scripts/app-store/validate.test.mjs`. This record deliberately
does not guess unverified limits; non-empty validation alone is not evidence
that App Store Connect will accept an oversized value.

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
accessibility evidence exactly.
Internal-only testing is not external TestFlight App Review approval. If the
owner selects external testing, review contact, demo access, notes, and the
selected exact build become mandatory.

Apple's Accessibility Nutrition Label is also exact-build evidence. Test the
recorded common tasks on iPhone and classify all nine Apple features before the
owner saves either verified support or a no-support-indicated decision. Every
feature claimed as supported must list all canonical common tasks in order;
only Captions and Audio Descriptions may use the no-media not-applicable state.
Never infer support from framework use or automated checks. Release requires a
structured `confirmed_in_app_store_connect` record for either decision, with
the saved UTC, controlled evidence reference, and explicit App Store Connect
approval; a drafted decision alone is not evidence that Apple received it.

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
