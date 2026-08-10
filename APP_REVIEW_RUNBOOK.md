# CUT OS — App Review runbook

**Status:** Working review package; not approved or ready for submission

**Updated:** August 10, 2026

Use this runbook to prepare the exact CUT OS 1.0 review path, capture truthful
screenshots from the release build, and write the App Review notes. It does not
prove that an App Store Connect record, Apple subscription, production service,
review account, legal approval, screenshot, native build, or native QA result
exists. Record those items only after direct verification.

## Launch truth in one paragraph

CUT OS is an adults-only daily cut check-in for people who lift. The paid iOS
v1 contains one deterministic next action, one daily weigh-in create/update,
six curated balanced-meal choices, ingredient/common-allergen and estimated
nutrition information, meal log/edit/delete, today's estimated nutrition
totals, cloud persistence, subscription purchase/restore/manage controls,
legal/support links, sign-out, and in-app account deletion. Do not describe or
show adaptive coaching, personalized calorie or protein targets, trends,
workouts, reminders, progress, closeout, weekly review, AI, photo recognition,
restaurant guidance, chat, or social features.

## Current audit

| Surface            | Repository evidence                                                                                                                                                                                            | Current release position                                                                                                                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native identity    | App Store Connect app `6798020879` is CUT OS with bundle ID `com.zarifahmed.cut`; exact version 1.0.0 build 3 is processed, valid, assigned to internal TestFlight, and selected for the version               | The processed build is not an App Review submission or public release. Physical-iPhone exact-build QA remains pending.                                                                                          |
| Seller             | Apple Developer membership is active as an Individual; `getcutos.com` is the canonical public domain; the owner explicitly deferred professional review until after launch                                     | Preserve the owner-deferred record without claiming counsel approval. Do not add a different legal operator or publish private address information.                                                             |
| Routes             | Sign in, sign up, adult eligibility, subscription, onboarding, Today, balanced meals, and Settings exist under `artifacts/cut-os/app`                                                                          | The navigation scripts below use only these built routes.                                                                                                                                                       |
| Paid scope         | `ADR_004_SUBSCRIPTIONS.md` and `APP_STORE_READINESS.md` define the narrow v1 scope                                                                                                                             | Keep listing copy, screenshots, and review notes inside that boundary.                                                                                                                                          |
| Purchases          | Apple stores the exact one-month `com.zarifahmed.cut.pro.monthly` product at $4.99 in the U.S. only, with no trial, no introductory offer, and Family Sharing off; RevenueCat credentials and mapping validate | Exact TestFlight purchase, entitlement refresh, restore-after-deletion, and the subscription review screenshot remain required.                                                                                 |
| Adults only        | The server-authoritative `adult-18-v1` gate ships in build 3; Apple's current questionnaire is saved with an effective 18+ higher-age override                                                                 | Physical-device Declared Age Range behavior and the exact-build adult/restricted flows remain pending.                                                                                                          |
| Privacy            | The nine-type linked-to-user, no-tracking App Privacy disclosure is published; Privacy, Terms, and Support are live at the canonical domain                                                                    | Exact-build account deletion, native recovery, archive/privacy verification, and final owner review remain pending.                                                                                             |
| Category           | Health & Fitness is saved as the primary category; Made for Kids is No; Content Rights is No; regulated medical device is No; DSA is active as non-trader/no EU distribution                                   | Final listing/owner approval remains pending; do not infer professional approval from these saved Apple fields.                                                                                                 |
| Icon               | `artifacts/cut-os/assets/images/icon-v2.png` is a 1024×1024, 8-bit RGB PNG with no alpha; SHA-256 `58e807c4772180bb7a6b157d421ac77c8d4106c606c6fe3ad80b62569c22c07a`                                           | Technically suitable as a candidate and configured for icon/splash/favicon. Native appearance and owner approval remain open.                                                                                   |
| Minimum iOS        | The exact build 3 archive passed the release configuration, signature, and entitlement checks with the iOS 17 minimum required by the configured native Clerk SDK                                              | Reconfirm the same behavior on a physical supported iPhone through TestFlight.                                                                                                                                  |
| Screenshots        | The validated 6.9-inch capture plan selects the Today next-action screen and the real subscription offer; no release image is captured or uploaded                                                             | Capture only from exact build 3 after TestFlight access works, then bind PII review and upload evidence to the exact PNG hashes.                                                                                |
| Review credentials | No credentials belong in this repository                                                                                                                                                                       | Put the primary account in App Store Connect's Sign-in Information. Apple provides only one username/password pair there, so put additional purpose-built review accounts in App Review Notes as Apple directs. |
| TestFlight access  | Internal group `CUT OS Internal QA` shows one tester and build 3 as Testing, while the tester row still says No Builds Available; Apple Developer Support case `20000133994444` is pending                     | Do not resend invitations or mutate the group while Apple investigates. Installation and every exact-build device result remain pending.                                                                        |

### Corrected copy requiring native verification

The source audit found that onboarding previously promised daily calorie and
training targets, which are outside the truthful v1 scope. The source now uses
**Set up your profile**, says “Save the basics for your CUT OS profile,” and
tells incomplete users to finish the profile and start the daily check-in.
Verify those exact truthful strings in the release build before capturing
screenshots or submitting.

## Review-account matrix

Create purpose-specific synthetic accounts in the exact production Clerk/API/
RevenueCat environment used by the submitted build. Do not use an employee,
customer, child, or other person's data. Store credentials in the approved
secret manager. Put the Full-access account in App Store Connect's Sign-in
Information username/password fields. Because Apple provides only one pair
there, put the additional Purchase, Adult-gate, Restricted, and Deletion
review-account credentials in the final App Review Notes. Never put any review
credential in this file, source control, screenshots, or support tickets, and
never reuse a production, owner, employee, or customer credential.

| Account            | Required state immediately before submission                                                                                                                                                                                                                                                                                  | Purpose                                                                                                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full-access review | Email verified; reserved `+clerk_test` address; no user MFA; fixed Client Trust code works without out-of-band delivery; current `adult-18-v1` status `eligible`; `CUT_OS_PRO` active through the real server-authoritative RevenueCat path; onboarding complete; display name `Reviewer`; empty current-day weight and meals | Primary product tour and the exact daily flow. The entitlement must not be a client or API bypass. Record `[ENTITLEMENT_PROVISIONING_METHOD]` in the private release record. |
| Purchase review    | Email verified; reserved `+clerk_test` address; no user MFA; fixed Client Trust code works without out-of-band delivery; current adult status `eligible`; no `CUT_OS_PRO`; onboarding incomplete; no stale Apple/RevenueCat entitlement                                                                                       | Apple purchase, secure server refresh, and first onboarding.                                                                                                                 |
| Adult-gate review  | Email verified; reserved `+clerk_test` address; no user MFA; fixed Client Trust code works without out-of-band delivery; adult status `unverified`; no entitlement; onboarding incomplete                                                                                                                                     | Self-declared 18+ path. Recreate/reset only through an approved test process because the first decision is permanent for that identity under v1.                             |
| Restricted review  | Email verified; reserved `+clerk_test` address; no user MFA; fixed Client Trust code works without out-of-band delivery; adult status `ineligible`; no entitlement; no private health/nutrition data                                                                                                                          | Adults-only stop screen, restricted Settings, legal/support, sign-out, and deletion availability.                                                                            |
| Deletion review    | Email verified; reserved `+clerk_test` address; no user MFA; fixed Client Trust code works without out-of-band delivery; `eligible`; any entitlement state is documented; synthetic profile only                                                                                                                              | Destructive account-deletion review without destroying another review account.                                                                                               |

### Clerk review-access lifecycle

The selected fastest review strategy uses Clerk's documented production test
mode only during the bounded submission window: it begins after
owner/security approval when the exact internal TestFlight build is ready for
pre-submission review-access QA, and continues only while that authorized
submission awaits or undergoes App Review. On a new physical device, sign in
with each reserved review account and enter `424242` when Client Trust requests
the email code. No verification email should be delivered. If any account,
factor, or code behaves differently, stop and do not submit.

The `app_review` evidence commit must attest the enabled review-window state,
Client Trust, all five reserved accounts, the exact-build new-device result,
UTC, and a controlled non-secret evidence reference. Monitor authentication and
reserved-account activity throughout the window. Before finalizing it, populate
`appReview.clerkReviewAccess.shutdownControl` with distinct primary and backup
owners, proof both can access the production Clerk instance, status source
`exact_app_store_connect_submission`, active status monitoring and escalation,
the fixed 15-minute SLO, and a fresh UTC access preflight plus controlled
evidence reference. Keep `triggerObservedAtUtc`, `testModeDisabledAtUtc`, and
`shutdownEvidenceReference` null. The release lead owns the status watch, the
security owner is backup, and the authoritative source is the exact version and
submission in App Store Connect's **Drafts** section. Disable production test
mode immediately, and no later than 15 minutes, whenever that submission leaves
its authorized waiting/in-review states, including Accepted, Pending Developer
Release, Rejected, Unresolved Issues, Invalid Binary, developer withdrawal or
removal, or abandonment; also disable it on unexpected reserved-account
activity. Contain and investigate unexpected activity before any later attempt.

For an approved version configured for manual release, wait for **Pending
Developer Release**, then prepare the distinct pre-created `public_release` manifest as
the direct child of the immutable App Review evidence commit. That target must
prove test mode is off and Client Trust remains on while retaining the five
account attestations as historical review-window evidence. Preserve the entire
shutdown plan and fill only its closure triplet: the observed App Store Connect
trigger time, the Clerk disablement time no more than 15 minutes later, and a
distinct controlled closure-evidence reference. Both times must follow App
Review evidence finalization and precede public-release finalization. A
rejection or resubmission requires a new signed candidate and fresh authorized
review window; never leave or re-enable test mode merely for convenience.

For each account, perform a real sign-in from the submitted build within 24
hours of submission. Confirm that credentials do not expire during review and
that email verification, CAPTCHA, MFA, rate limits, IP rules, or a first-login
challenge cannot trap App Review. Keep the backend, Clerk, RevenueCat, and
public legal/support pages available for the full review window.

Before every review attempt, restore the account states above. In particular,
clear only the full-access account's current-day weigh-in/meals through the
approved test process so the primary script starts at “Log your morning
weigh-in.” Never reset production data with an undocumented manual database
edit.

Record each successful production sign-in no more than 24 hours before
submission and attest that the account is non-expiring for the review window,
has no user-configured MFA or out-of-band delivery trap, and completes the
fixed-code Client Trust challenge. A stale timestamp or any missing attestation
blocks release.

## Exact reviewer navigation scripts

These labels match the current source. Re-run every script on the submitted
TestFlight build and update the wording if the native UI changes.

Before the scripts, run the device-timezone/local-day acceptance in
`QA_REPORT.md` on a non-UTC physical iPhone. The app must synchronize the named
device zone and bind every daily request to its current validated zone before
Today, weigh-in, or meal data unlocks; this must also work for the eligible
unpaid Purchase account without consulting RevenueCat. Repeat after relaunch,
foreground and one-minute travel detection, two concurrent devices in different
zones, account switching during a slow request, and across local midnight. Any
UTC-default, stale-principal/cache, or wrong-day result stops submission.

### 1. Primary full-access tour

Precondition: the Full-access review account matches the matrix and has no
weigh-in or meal for the current server-resolved day.

1. Launch CUT OS. On **Welcome back**, enter the credentials supplied in App
   Store Connect and tap **Sign in**.
2. CUT OS opens **Today**. Under **NEXT**, verify **Log your morning weigh-in**
   and the **Today's weight** field are visible.
3. Enter the approved synthetic value `[REVIEW_WEIGHT_AND_UNIT]` and tap **Log
   weigh-in**.
4. Verify the next card changes to **Build your first balanced meal**. Tap
   **Open balanced meals**.
5. On **Build your first balanced meal**, review the six cards under **Balanced
   options**. Each card shows a cuisine, description, estimated calories,
   protein, carbohydrates, fat, fiber, ingredients, common-allergen wording,
   and fit reason.
6. Select **Lemon Herb Chicken Grain Bowl**. Under **YOUR MEAL**, adjust
   **Servings** only if desired and tap **Log Lemon Herb Chicken Grain Bowl**.
7. CUT OS returns to **Today**. Verify **NUTRITION LOGGED**, calorie/protein
   totals, meal count, and fiber are visible.
8. Tap **Review logged meals**. Verify the logged meal exposes **Adjust
   serving** and **Delete**. Do not delete it during the primary tour.
9. Tap the back control (VoiceOver label **Back to Today**), then **Settings**.
   Verify the active subscription state, **Restore purchases**, **Manage App
   Store subscription**, Privacy Policy, Terms of Use, Support, and **Delete
   account** are reachable.

### 2. New purchase and onboarding

Precondition: the Purchase review account matches the matrix and the submitted
Apple product is cleared for review with the build.

1. Sign out, then sign in with the Purchase review credentials supplied in App
   Store Connect.
2. CUT OS opens **CUT OS PRO** with the heading **Make the next choice
   simple.**
3. Wait until the real StoreKit plan card appears. Confirm its title,
   localized price, period, and any introductory text exactly match App Store
   Connect. If no card appears, stop; do not submit.
4. Select the intended plan and tap the button beginning **Continue —**. Confirm
   the purchase in Apple's system sheet.
5. After Apple's confirmation, wait for CUT OS's secure server verification.
   A temporary “waiting for secure access verification” message is not proof
   of access; the app must proceed only after the server recognizes
   `CUT_OS_PRO`.
6. The onboarding screen must open with **Set up your profile**. Use only
   synthetic values: display name **Reviewer**, goal **Cut**, start weight **85
   kg**, and goal weight **78 kg**. Confirm that v1 does not ask for sex, height,
   activity level, training experience, or a target date. Tap **Save profile**.
7. Verify **Today** opens. Repeat the primary tour from step 2 as needed.

If the purchase is cancelled in Apple's sheet, CUT OS should remain on the
subscription screen without presenting cancellation as an error. Record a
charged-but-locked result as a stop-the-line defect and follow the recovery
matrix in `PURCHASE_QA_REPORT.md`.

### 3. Restore and manage subscription

1. Sign in with an eligible account whose Apple receipt and RevenueCat customer
   state are prepared for the exact restore case being tested.
2. If the account is unpaid, use **Restore purchases** on **CUT OS PRO**. If it
   is already active, open **Settings** and tap **Restore purchases**.
3. Verify active access opens only after the server confirms `CUT_OS_PRO`. For
   the no-purchase case, verify the app says no active CUT OS Pro purchase was
   found and remains locked.
4. Open **Settings** and tap **Manage App Store subscription**. Verify Apple's
   subscription-management surface opens for the current Apple ID.

### 4. Adult 18+ and restricted paths

Adult declaration:

1. Sign in with the Adult-gate review account.
2. Verify **Confirm you're 18 or older**, **Your date is not saved**, and the
   Privacy Policy link appear before any private health, nutrition, or purchase
   screen.
3. Enter `[APPROVED_SYNTHETIC_ADULT_DOB]` in Month/Day/Year and tap **Confirm
   age**.
4. In **Confirm your date of birth**, verify the displayed date, then tap
   **Confirm date**.
5. Verify the account proceeds to **CUT OS PRO** and that the date fields are
   cleared. Do not claim identity or document-based age verification; this is
   a self-declared server decision.

Restricted account:

1. Sign out and sign in with the Restricted review account.
2. Verify **CUT OS is for adults** explains that the account remains locked and
   offers **Manage or delete account** and **Sign out**. No private guidance or
   purchase options may appear.
3. Tap **Manage or delete account**. Verify restricted **Settings** provides
   legal/support links, account deletion, subscription management, and a path
   back to the age requirement without exposing private data.

### 5. Account deletion

Use only the Deletion review account; this path is destructive.

1. Sign in, open **Settings**, and first read the notice that deleting CUT OS
   does not cancel Apple billing.
2. If the test account has an active subscription, tap **Manage App Store
   subscription** and inspect/cancel it separately as the test plan requires.
3. Tap **Delete account**. In **Delete your CUT OS account?**, verify the
   warning covers permanent CUT OS data deletion and separate App Store
   billing, then tap the destructive **Delete account** confirmation.
4. Verify the durable deletion flow completes, local recovery state clears,
   and the app signs out. Record Clerk, database, RevenueCat-customer, device,
   and retry-worker evidence under `QA_REPORT.md` and
   `PURCHASE_QA_REPORT.md`.

## Screenshot capture plan

Capture raw screenshots only from the exact submitted TestFlight/release build
on a supported physical iPhone after native QA passes. Retain each raw capture
in controlled evidence outside `app-store/screenshots/files/`. Use synthetic
data, a non-identifying display name, the real StoreKit-localized offer, and the
final public legal URLs. Do not use Expo Go, the web mockup, a reconstructed
mock, placeholder prices, a debug overlay, personal data, or a screen from
another build.

Use one canonical build identity everywhere: app version, Apple build number,
full Git commit, EAS build ID, and App Store Connect build ID. The TestFlight,
App Review, screenshot, and subscription records must match all five fields.
If accessibility labels are later evaluated and published, their records must
also match all five fields; voluntary omission has no accessibility-label build
identity to bind. For every screenshot PII approval, record the reviewed file's
SHA-256; changing the bytes invalidates the approval. The App Store Connect IAP
review upload must use the approved bytes for shot `07-subscription-offer` and
record that same hash.

Apple accepts no screenshot alpha channel. The controlled preparation command
decodes and re-encodes every source so unknown metadata and trailing compressed
payloads cannot reach the upload. Only an exact canonical sRGB declaration may
survive; any embedded color profile requires a separate reviewed conversion. If
the source is RGBA, the command may strip only a fully opaque alpha channel
after proving every decoded alpha sample is 255 and that the output RGB pixels
are identical. Any true transparency, unsupported encoding, resizing,
cropping, compositing, or overwrite fails closed. Follow `app-store/README.md`,
retain the raw capture plus its JSON preparation report, and bind the manifest,
PII review, listing upload, and IAP review upload to the prepared opaque bytes.

### Naming and evidence placeholders

Use this exact filename pattern for every retained raw capture:

```text
CUTOS-v[APP_VERSION]-b[BUILD_NUMBER]-[ASC_DEVICE_SLOT]-[CAPTURE_DEVICE]-[LOCALE]-[NN]-[SHOT_SLUG].png
```

Replace spaces with hyphens. Complete this record before capture:

| Field                                                | Value                                       |
| ---------------------------------------------------- | ------------------------------------------- |
| App Store Connect screenshot slot                    | `[ASC_DEVICE_SLOT]`                         |
| Required pixel dimensions shown by App Store Connect | `[ASC_REQUIRED_PIXEL_DIMENSIONS]`           |
| Physical capture device/model                        | `[CAPTURE_DEVICE]`                          |
| Device OS                                            | `[IOS_VERSION]`                             |
| Submitted app version/build                          | `[APP_VERSION]` / `[BUILD_NUMBER]`          |
| EAS build URL/ID                                     | `[EAS_BUILD_URL_OR_ID]`                     |
| Locale                                               | `[LOCALE]`                                  |
| Appearance                                           | `[LIGHT_OR_DARK]`                           |
| Capture operator/date                                | `[CAPTURE_OPERATOR]` / `[CAPTURE_DATE_UTC]` |
| Release-account state record                         | `[ACCOUNT_STATE_EVIDENCE_LINK]`             |

Do not infer device slots or dimensions from this repository. Read them from
the then-current App Store Connect upload surface and confirm every exported
file's pixel dimensions before upload.

### Shot list

| Order/slug                   | Built route and prepared state                                        | Required visible evidence                                                                                                                                                                                        | Intended use                                            |
| ---------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `01-today-next-action`       | `/today`; full-access account, onboarding complete, empty current day | Greeting with display name `Reviewer`, **NEXT**, **Log your morning weigh-in**, weight field, **Settings**                                                                                                       | Listing candidate and review evidence                   |
| `02-today-weigh-in-complete` | `/today`; current-day synthetic weigh-in saved, no meals              | **Build your first balanced meal**, **Open balanced meals**, and **WEIGH-IN COMPLETE**                                                                                                                           | Optional listing candidate                              |
| `03-balanced-options`        | `/meal-one`; no pending recovery marker                               | **Build your first balanced meal**, **Balanced options**, and only the actual curated meal cards                                                                                                                 | Optional listing candidate                              |
| `04-meal-preview`            | `/meal-one`; **Lemon Herb Chicken Grain Bowl** selected               | **YOUR MEAL**, serving control, estimated calories/protein/carbs/fat/fiber, estimate warning, and log button                                                                                                     | Optional listing candidate                              |
| `05-today-nutrition-logged`  | `/today`; one synthetic meal logged                                   | **NUTRITION LOGGED**, actual estimated totals, meal count/fiber, and **Review logged meals**                                                                                                                     | Optional listing candidate                              |
| `06-logged-meal-controls`    | `/meal-one`; one meal logged                                          | **Logged today**, actual totals, meal name, serving, **Adjust serving**, and **Delete**                                                                                                                          | Optional listing candidate                              |
| `07-subscription-offer`      | `/subscription`; eligible unpaid account and StoreKit catalog loaded  | **Make the next choice simple.**, real plan title/localized price/period, introductory text when applicable (none for approved v1), **Continue —**, Restore, Manage, renewal disclosure, and legal/support links | Selected listing and IAP review screenshot              |
| `08-adult-eligibility`       | `/adult-eligibility`; unverified account, empty fields                | **Confirm you're 18 or older**, transient-date disclosure, date fields, Privacy Policy, **Confirm age**, account/sign-out controls                                                                               | Review evidence; listing only after owner approval      |
| `09-settings-controls`       | `/settings`; active full-access account                               | Active Pro state, Restore, Manage, legal/support links, separate-billing deletion warning, **Delete account**                                                                                                    | Review evidence                                         |
| `10-sign-up-18plus`          | `/sign-up`; no text entered                                           | **Create your account**, 18+ notice/checkbox, Terms, Privacy, and disabled create action                                                                                                                         | Optional review evidence; never expose an email or code |

Select the final public screenshot subset only after checking the current App
Store Connect slot count and owner-approved ordering. The v1 workflow does not
add a marketing caption, frame, device chrome, or other visual alteration.
Keep the raw captures and preparation reports in controlled release evidence;
the prepared opaque files in the manifest are the exact uploaded and
PII-reviewed bytes. Any future captioned-asset workflow requires its own
validated file, hash, PII review, and truthful owner approval.

Before freezing the submitted build, rehearse shot `07-subscription-offer` at
the exact required App Store Connect viewport. Its heading, real offer details,
purchase action, Restore, Manage, renewal disclosure, and legal/support links
must all fit in one truthful raw screenshot. If they do not, adjust and rebuild
the screen before capture; never composite, stitch, or mock the evidence.

For the fastest truthful v1 submission, the manifest selects two public
screenshots—01 for core use and 07 for the paid offer—and reuses shot 07 as the
required in-app-purchase review screenshot. Shots 02 through 06 are optional
marketing candidates; 08 through 10 are optional internal review aids. Their
absence cannot block submission.

## App Review notes draft

Replace every bracketed placeholder with verified submission facts. Put only
the primary Full-access username/password pair in App Store Connect's Sign-in
Information fields. Replace the additional-account placeholders below only in
the final App Review Notes, using purpose-built synthetic review credentials as
Apple directs. Never commit the completed notes or retain those credentials in
screenshots or release artifacts. If any placeholder remains, stop the
submission.

```text
CUT OS is an adults-only daily cut check-in for people who lift. It provides
general fitness and nutrition information, not medical advice. Nutrition and
allergen information is estimated, not an allergen-safety guarantee.

Build under review: version 1.0.0, build 3
Bundle ID: com.zarifahmed.cut
Primary category: Health & Fitness
Review contact: [REVIEW_CONTACT_NAME], [REVIEW_CONTACT_PHONE],
[REVIEW_CONTACT_EMAIL]

ACCESS
Primary credentials are in App Store Connect's Sign-in Information. That
account is email verified, has no user MFA, is adult eligible and onboarded,
has CUT_OS_PRO through [VERIFIED_ENTITLEMENT_PROVISIONING_METHOD], and starts
with no current-day weigh-in or meal. If Client Trust asks for an email code
after the password, enter 424242. This is the fixed code for the reserved
synthetic review accounts; no email is delivered.

Additional purpose-built review accounts:
Purchase: username [PURCHASE_REVIEW_USERNAME], password [PURCHASE_REVIEW_PASSWORD]
Adult gate: username [ADULT_GATE_REVIEW_USERNAME], password [ADULT_GATE_REVIEW_PASSWORD]
Restricted: username [RESTRICTED_REVIEW_USERNAME], password [RESTRICTED_REVIEW_PASSWORD]
Deletion: username [DELETION_REVIEW_USERNAME], password [DELETION_REVIEW_PASSWORD]

PRIMARY PATH
1. Sign in; Today opens at Log your morning weigh-in.
2. Enter 180 lb and tap Log weigh-in.
3. Open balanced meals, select Lemon Herb Chicken Grain Bowl, and log it.
4. Today shows estimated nutrition totals. Review logged meals allows serving
   adjustment and deletion. Settings provides Restore purchases, Manage App
   Store subscription, legal/support links, and Delete account.

SUBSCRIPTION
Product ID: com.zarifahmed.cut.pro.monthly; duration: one month; introductory
offer: none. StoreKit supplies the localized price, period,
and eligible offer through RevenueCat; none is hardcoded. Use the Purchase
account, select the plan on CUT OS PRO, and tap Continue —
$4.99 per month. Paid screens open only after server
verification of CUT_OS_PRO. Restore is on the offer and Settings; Manage App
Store subscription opens Apple's management page.

ADULT 18+
The gate is a self-declaration, not identity verification. The server uses the
DOB only for its UTC adult-18-v1 decision, then discards it and retains status,
policy version, and decision time. Use the Adult-gate account with
January 1, 1990. The Restricted account opens CUT OS is for
adults with only account management/deletion and sign-out; it exposes no
private guidance or purchase option.

ACCOUNT DELETION
Use only the Deletion account. Settings > Delete account deletes the Clerk
login, CUT OS profile/weight/meal rows, and linked RevenueCat customer after
terminal completion. A minimal coordination record may remain for the approved
retention period. Account deletion does not cancel Apple billing; Manage App
Store subscription is provided separately.

Production API: https://getcutos.com
Privacy: https://getcutos.com/privacy
Terms/EULA: https://getcutos.com/terms
Support: https://getcutos.com/support
Backend, authentication, entitlement service, and public pages remain available
during review. Network/VPN setup: none.
```

## Age, privacy, and category checks

### Age

- [ ] Owner/legal confirms the public Terms/EULA minimum age is 18 and the
      store copy says adults 18+ consistently.
- [ ] Complete every current age-rating descriptor from the final binary.
      Record the saved questionnaire version, answers, calculated rating,
      region-specific display, date, and approver.
- [ ] Mark health/wellness topics truthfully. Decide medical/treatment answers
      from the final claims with qualified review; general-wellness intent does
      not replace the questionnaire.
- [ ] Confirm No for social media, user-generated content, chat/messaging,
      advertising, and unrestricted web access only while the submitted binary
      still has none of those features.
- [ ] Do not select Made for Kids or a Kids category.
- [ ] If the calculated rating is below the Terms/EULA minimum, apply the
      owner/legal-approved higher-age override to 18+ or the applicable current
      regional value. Capture evidence; do not assume the override from this
      runbook.
- [ ] Re-run both the adult and restricted scripts on the submitted build and
      prove no health, nutrition, or purchase screen appears before a current
      eligible decision.

### Privacy

- [ ] Qualified counsel approves the seller/legal-operator position under App
      Review Guideline 5.1.1(ix); the owner accepts any documented residual
      review risk before enrollment or submission.
- [ ] Public Privacy Policy, Terms/EULA, and Support URLs are approved,
      functional over HTTPS, and open from sign-up, adult gate, subscription,
      and Settings as applicable.
- [ ] Reconcile the final archive privacy report, required-reason APIs, SDK
      inventory, backend/database/logs/backups, Clerk, RevenueCat, hosting,
      analytics/crash, and support tools against `PRIVACY_DATA_MAP.md`.
- [ ] App Privacy answers cover the data actually collected, including linked
      name/display name, email, internal user ID, profile/body/weight/nutrition
      data, adult-eligibility result, and purchase history with their actual
      purposes and linkage.
- [ ] Confirm tracking remains off in the binary, vendor settings, and answers;
      no health/fitness/eligibility data is used for ads or tracking audiences.
- [ ] Explain transient raw-DOB processing accurately. Do not call it retained
      DOB or verified age, and do not omit it from the public notice merely
      because it is discarded after the request.
- [ ] Qualified privacy/legal review approves retention/deletion, account
      tombstones, backups, underage attempts, RevenueCat records, support
      records, jurisdictions, and notice timing.
- [ ] No personal data, production/reused credential, DOB, body metric, meal
      value, receipt, or internal user ID appears in screenshots or App Review
      Notes. The only permitted credentials in Notes are the additional
      purpose-built synthetic review accounts Apple needs to inspect the paths
      above.

### Category, claims, and content

- [ ] Owner confirms Health & Fitness remains the correct primary category for
      the submitted feature set.
- [ ] Listing and screenshots use only the launch-truth paragraph above.
- [x] Remove the onboarding claim about daily calorie and training targets from
      source and align the Today/domain setup action with the truthful v1 scope.
- [x] Remove unused sex, height, activity-level, training-experience, and hidden
      target-date collection from the paid-v1 form/API; add a prelaunch
      migration that clears legacy values while preserving the start/goal
      weights the app displays.
- [ ] Verify the corrected onboarding and Today copy in the release build before
      capture.
- [ ] Qualified nutrition/health and legal reviewers approve the six recipes,
      ingredient quantities/yields, nutrition source/calculation, common-
      allergen/dietary substantiation, estimate warning, and non-medical claims.
- [ ] Do not claim diagnosis, treatment, clinical outcomes, guaranteed weight
      loss, adaptive coaching, personalization that is not built, or allergen
      safety.
- [ ] Owner confirms the product name, subtitle, description, keywords, icon,
      and any screenshot captions against the final binary.

## Stop-the-line submission checklist

Every item must be checked with evidence. A single open item means **do not tap
Submit for Review**.

- [ ] Apple Developer membership, Account Holder access, agreements, tax, and
      banking are active and verified by the owner.
- [ ] The App Store Connect app record uses bundle ID `com.zarifahmed.cut`; the
      owner-approved category, territories, availability, and 18+ answers are
      saved.
- [ ] The immutable product ID, group, duration, price, localizations, and trial
      decision are owner-approved, exactly configured, and recorded.
- [ ] With recorded owner authorization, **Add for Review** assembled the exact
      release build in one submission under **Drafts**. On the first
      subscription, **Add for Review** selected that existing draft, and its
      unapproved subscription group was added in the submission modal. The
      version is **Ready for Review**, and **Submit for Review** has not been
      used before final evidence validation.
- [ ] `appReview.appleWorkflow` records that exact submission reference,
      `submissionSection: "drafts"`, all three included items, manual release,
      **Ready for Review**, no active review, UTC, and controlled evidence no
      more than 24 hours old.
- [ ] Exact-head CI passes for `APP_REVIEW_EVIDENCE_SHA`; `main` is non-force
      fast-forwarded to that exact SHA without a GitHub merge/squash/rebase/
      merge-queue action; push-to-`main` CI passes; remote `main` equals that
      SHA; and current-clock validation plus production probes are fresh before
      **Submit for Review**.
- [ ] RevenueCat's Apple app/bundle, required valid Apple in-app purchase/
      subscription key, exact product mapping, `CUT_OS_PRO`, current offering/
      package, public iOS key, customer-delete permission, restore behavior, and
      server v2 key/resource IDs are verified. The optional App Store Connect
      API sync credential was intentionally not created or uploaded after
      Apple's live internal-use-only attestation and is not represented as
      automatic import, price-sync, store-status, purchase, deletion, restore,
      or native-QA evidence. Optional App Store Server Notifications are not
      configured for initial release and are not represented as evidence.
- [ ] The production API/database/Clerk/RevenueCat combination is deployed,
      migration-current, monitored, and available; no development, test-store,
      or placeholder value is in the release build.
- [ ] A clean production EAS build passed release configuration validation,
      repository tests/typecheck/codegen, Expo dependency/Doctor checks,
      archive inspection, export compliance, privacy report, and secret scan.
- [ ] A supported physical iPhone and TestFlight passed every applicable native
      item in `QA_REPORT.md` and `PURCHASE_QA_REPORT.md`, including purchase,
      cancellation, interruption, restore active/none, renewal, cancellation,
      expiration, refund, billing retry/grace, reinstall, second device,
      account switch, offline, VoiceOver, large text, and deletion.
- [ ] On the exact submitted version/build, a supported physical iPhone passed
      the common tasks with VoiceOver, large text, sufficient contrast, clear
      focus order, and usable controls: sign-in, adult gate, purchase/restore,
      weigh-in, meal log/edit/delete, Settings/legal links, and account
      deletion. The evidence records build, device/iOS, tester, date, and result.
- [ ] The exact release build passed the non-UTC first-sync, unpaid-account,
      relaunch, foreground/one-minute travel detection, two-device different-
      zone behavior, stale weigh-in retry, slow-request/account-switch, and
      local-midnight script without unlocking or caching a wrong daily key.
- [ ] No charge-without-access, unrecoverable entitlement, client-only paid
      protection, price/period/trial mismatch, cross-user leak, age-gate bypass,
      private-cache exposure, deletion failure, or embedded/logged secret
      remains.
- [ ] The corrected onboarding copy and every other metadata/binary claim are
      verified in the exact submitted build.
- [ ] Public Privacy, Terms/EULA, and Support pages are approved, live, linked,
      and consistent with final App Privacy answers and account deletion.
- [ ] Sign-up uses the counsel-approved Terms assent and Privacy acknowledgment
      design; an age-only confirmation is not treated as Terms acceptance.
- [ ] Legal/privacy and qualified nutrition/health approvals are recorded; no
      unsupported medical, nutrition, allergen, dietary, or outcome claim
      remains.
- [ ] The icon is approved after native inspection. Every uploaded screenshot
      follows the capture record, matches required dimensions, comes from the
      exact submitted build, contains no personal data, and shows no unbuilt
      feature or placeholder offer.
- [ ] All review accounts pass fresh sign-in, have the required exact states,
      remain available for the full review window, and are documented only in
      secret storage and Apple's designated Sign-in Information/App Review
      Notes fields.
- [ ] For the `app_review` target, Clerk production test mode is enabled only
      for the active review window, Client Trust remains enabled, all five
      accounts use reserved `+clerk_test` addresses, and the exact TestFlight
      build completes the new-device code flow with `424242` and no delivery.
      After approval and before manual public release, production test mode is
      disabled and the separate `public_release` evidence proves it remains
      disabled while Client Trust remains enabled. Its Apple workflow evidence
      must prove the same submission now appears in **Completed**, every
      submitted item was accepted, no review is active, and the app is **Pending
      Developer Release**.
- [ ] `shutdownControl` freezes distinct primary/backup owners, both owners'
      production Clerk access preflight, exact-submission status source,
      monitoring, escalation, and the 15-minute SLO. Its closure triplet is null
      at `app_review`; `public_release` records the observed trigger, disablement
      within 15 minutes, and distinct closure evidence without changing the
      frozen plan.
- [ ] `main` remains frozen at `APP_REVIEW_EVIDENCE_SHA` throughout review. For
      manual release, `PUBLIC_RELEASE_EVIDENCE_SHA` is its direct child, passes
      exact-head CI, is non-force fast-forwarded from exact A to exact P, passes
      push CI, equals remote `main`, and has fresh validation/probes before
      **Release This Version**.
- [ ] Every review account was freshly tested on the exact submitted
      version/build within 24 hours of submission; the private evidence records
      account alias, required state, build, tester, UTC time, and result without
      recording a username, password, code, or other credential in the
      repository.
- [ ] The final App Review Notes contain no bracketed placeholder, personal or
      production/reused credential, unsupported claim, stale navigation label,
      or unverified external-state assertion. Additional credentials are
      purpose-built synthetic review accounts only.
- [ ] The final App Review Notes remain below App Store Connect's 4,000-byte
      UTF-8 limit after the synthetic credentials and verified facts are added;
      measure the final pasted text, not this template.
- [ ] The machine record contains the credential-free template SHA-256, final
      byte count, zero-placeholder result, measurement UTC, saved-in-App-Store-
      Connect flag, and controlled evidence reference. Do not store or hash the
      resolved credential-bearing notes.
- [ ] Owner approves the metadata, privacy answers, age rating/override,
      subscription, build, App Review submission, and manual public release.
- [ ] Release remains manual, and post-launch monitoring/support coverage is
      active before the owner releases the approved version.

## Evidence index

- Focused metadata and questionnaire: `APP_STORE_METADATA.md`
- Release/build procedure: `EAS_RELEASE_RUNBOOK.md`
- Submission blockers and launch sequence: `APP_STORE_READINESS.md`
- Purchase test matrix: `PURCHASE_QA_REPORT.md`
- Native/security/account-deletion matrix: `QA_REPORT.md`
- Privacy inventory: `PRIVACY_DATA_MAP.md`
- Adults-only design: `ADR_003_ADULT_ELIGIBILITY.md`
- Subscription authorization: `ADR_004_SUBSCRIPTIONS.md`
- [Apple platform-version information and review fields](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information)
- [Apple auto-renewable subscription information fields](https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/auto-renewable-subscription-information)
