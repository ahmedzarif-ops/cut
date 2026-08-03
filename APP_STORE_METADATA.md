# CUT OS — App Store metadata source of truth

**Status:** Working submission record; not approved for submission

**Updated:** August 3, 2026

This file records the intended App Store answers and the evidence still needed.
App Store Connect must be completed from the shipped binary, production
configuration, public policies, and then-current Apple questionnaire. Nothing
here is a substitute for owner, legal, or App Review approval.

## Product and audience

| Field               | Working position                                                                                          | Release gate                                                                              |
| ------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Product             | CUT OS                                                                                                    | Name clearance and owner approval remain open.                                            |
| Primary audience    | Adults age 18 and older who lift                                                                          | Must appear consistently in product copy, Terms/EULA, support material, and review notes. |
| Eligibility policy  | `adult-18-v1`                                                                                             | Server and release-build bypass tests must pass.                                          |
| Primary category    | Health & Fitness                                                                                          | Owner must confirm against the final feature set.                                         |
| Made for Kids       | No                                                                                                        | Do not select the Kids category.                                                          |
| Public description  | Must state that CUT OS is for adults 18+ and provides general wellness/fitness guidance, not medical care | Final copy requires owner, legal, and qualified health/nutrition review.                  |
| Support URL         | Pending                                                                                                   | Public, functional URL required before submission.                                        |
| Privacy Policy URL  | Pending                                                                                                   | Apple requires a public Privacy Policy URL for iOS.                                       |
| Terms/EULA          | Pending                                                                                                   | Must set a minimum age of 18 and match the product gate and rating override.              |
| Age Suitability URL | Optional; pending owner decision                                                                          | If supplied, it must explain the adults-only policy and self-declared gate accurately.    |

## Age rating and questionnaire

The App Store age rating supports storefront disclosure and parental controls.
It is not the in-app eligibility decision. CUT OS separately uses a
self-declared full DOB, processed transiently by the server under
`adult-18-v1`, and stores only the resulting status, policy version, and
decision time. It must not be described as identity or age verification.

Working answers/evidence for the final questionnaire:

- Complete every content descriptor from the final binary and listing; do not
  choose answers merely to obtain a preferred rating.
- **Health or Wellness Topics:** Yes. Current CUT OS behavior includes calorie,
  dieting, fitness, and exercise guidance.
- **Medical or Treatment Information:** Answer from final claims and features.
  The launch target is general wellness, not diagnosis or treatment; qualified
  review must confirm the binary and metadata stay inside that boundary.
- **Age Assurance:** Do not answer until owner/legal review confirms how Apple's
  then-current definition applies to this self-declared, non-ID-verified flow.
- **Social Media:** No for the current v1 scope. Social/community is deferred.
- **User-Generated Content, Messaging/Chat, Advertising, Unrestricted Web
  Access:** No for the current v1 scope, subject to final-binary verification.
- **Made for Kids:** No.
- Once the final Terms/EULA requires age 18, choose **Override to Higher Age
  Rating → 18+** if Apple's calculated rating is lower. Apple says an app whose
  EULA minimum exceeds the calculated rating must override to a rating that
  adheres to the EULA. Verify region- and OS-specific display values before
  submission.
- Record screenshots/PDF evidence of the saved questionnaire, calculated
  rating, override, date, reviewer, and questionnaire version in the release
  record.

The current questionnaire includes social-media capability questions. Apple
announced that responses are required for new apps and updates beginning in
September 2026; CUT OS should answer No unless the shipped product changes.

## Regulated medical device declaration

Because Health & Fitness/Medical categorization or frequent medical/treatment
content can trigger Apple's declaration, the App Store owner must complete it
from the final product and distribution regions. Product copy must not claim
regulated-device status, diagnosis, treatment, or clinical outcomes without
documented regulatory and legal support.

## App Privacy working position

Reconcile this list against the production archive, backend, Clerk, RevenueCat
when added, hosting/database logs and backups, crash reporting, analytics,
support tools, and every embedded SDK:

- Contact Info — email address, linked to the user, App Functionality.
- Identifiers — account/user identifier, linked to the user, App Functionality.
- Health & Fitness — profile, body, weight, nutrition, and workout data that
  actually ships; linked to the user; App Functionality and any truthful Product
  Personalization use.
- Other Data Types — adult eligibility status, policy version, and decision
  timestamp; linked to the user; App Functionality.
- Purchases — subscription/purchase history once the shipped RevenueCat/App
  Store implementation makes it available to CUT OS.
- Diagnostics/Usage Data — only if the final SDK and production configuration
  collect them; declare the actual purpose and linkage.

Raw DOB is transmitted only to make the real-time decision and is discarded
immediately. Apple's current App Privacy definition of “collect” focuses on data
retained beyond servicing the request, but the public Privacy Policy and
notice-at-collection must still explain this transient processing. Counsel and
the App Store owner must confirm the live questionnaire treatment. No CUT OS
health, nutrition, weight, workout, or eligibility data is used for tracking or
advertising audiences.

## App Review notes checklist

- State clearly: “CUT OS is for adults age 18 and older.”
- Explain that DOB is self-declared, processed transiently on the server using
  the UTC `adult-18-v1` rule, and never stored; only the outcome is retained.
- Explain that the first decision is final for that Clerk identity under v1. An
  ineligible person can use Settings, sign out, or delete the account, but
  cannot correct/retry DOB in app; future adult access requires deleting that
  identity/account and creating a new account.
- Provide a current `eligible` adult review account and exact full-access steps.
- Explain the `unverified` (`428`) and `ineligible` (`403`) server behavior and
  provide a controlled under-18 test path without exposing real personal data.
- Explain account deletion, subscription management, and any review-only setup.
- Keep the production backend and required authentication services live.
- Describe wellness/nutrition limitations accurately; do not imply medical or
  allergen-safety guarantees.

## Submission approvals still required

- **Owner/App Store role:** metadata, category, questionnaire, 18+ override,
  privacy answers, review account, and Submit for Review.
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

## Current Apple references

- [Set an app age rating](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/)
- [Age ratings values and definitions](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/)
- [App information](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information)
- [Manage app privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/)
- [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [July 2026 social-media questionnaire update](https://developer.apple.com/news/?id=tlur8uvi)
