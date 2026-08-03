# CUT OS — owner launch decisions

**Updated:** August 3, 2026
**Purpose:** Record only the business, financial, identity, and legal decisions
that engineering must not make for the owner.

## Already confirmed

- Audience: adults age 18 and older.
- Eligibility policy: `adult-18-v1`.
- Bundle ID: `com.zarifahmed.cut`.
- Paid v1 remains the narrow daily check-in, weigh-in, six-meal, meal-log, and
  daily nutrition-total scope documented in `APP_STORE_READINESS.md`.

## Decision 1 — Apple seller and legal operator

**Status:** Awaiting owner and qualified counsel.

Apple App Review Guideline 5.1.1(ix) says apps requiring sensitive user
information should be submitted by a legal entity rather than an individual
developer. CUT OS requires linked weight, body, fitness, and nutrition
information. An individual account may be faster, but it creates a material
review risk and displays the owner's personal legal name as seller.

**Working recommendation:** Use an organization account, pending counsel.

Owner must confirm:

- whether a suitable legal entity already exists;
- whether qualified counsel approves the organization path or a documented
  alternative;
- whether Apple Developer Program membership already exists; and
- who has Account Holder authority.

Do not form an entity, enroll, pay Apple, or accept agreements automatically.

## Decision 2 — first real subscription

**Status:** Awaiting owner approval.

Recommended focused launch configuration:

- Product ID: `com.zarifahmed.cut.pro.monthly` — immutable after creation.
- Subscription Group Reference Name (internal): `CUT OS Pro`.
- Subscription Product Reference Name (internal): `CUT OS Pro Monthly`.
- US English Subscription Group Display Name: `CUT OS Pro`.
- US English Auto-Renewable Subscription Display Name: `CUT OS Pro Monthly`.
- US English description: `Daily check-ins, weigh-ins, and meal logging.`
- Duration: monthly.
- United States price: **$4.99/month**.
- Introductory offer: **no free trial**.
- Launch products: one monthly option.

Exact approval phrase:

> Approve $4.99 monthly, no trial, using
> `com.zarifahmed.cut.pro.monthly`; internal group `CUT OS Pro`; internal product
> `CUT OS Pro Monthly`; US English group display `CUT OS Pro`; US English
> subscription display `CUT OS Pro Monthly`; and description `Daily check-ins,
weigh-ins, and meal logging.`

Do not create the real App Store product until the owner approves these terms.

Apple treats these as separate fields; do not copy one label into every field by
assumption. Any additional locale remains unapproved until its exact display
name and description are reviewed.

## Decision 3 — RevenueCat production authorization

**Status:** Awaiting email confirmation and owner approval.

The RevenueCat account email is not yet confirmed. The owner must use the
original confirmation email or resolve the account directly. After that, the
owner may approve creation of a least-privilege RevenueCat REST v2 server key
limited to the customer access required by CUT OS.

Exact approval phrase:

> RevenueCat email confirmed. Approve the least-privilege server key.

Never paste a secret key into source code, the mobile app, screenshots, support
messages, or this decision record.

## Decision 4 — public legal and support identity

**Status:** Awaiting owner and counsel.

The draft Privacy, Terms, and Support pages cannot be published until the owner
provides and authorizes:

- exact public legal operator/seller name;
- permission to publish that name;
- public support/privacy email and permission to publish it;
- stable production domain or host;
- operator state and country;
- initial App Store territories;
- support mailbox owner and response target; and
- counsel-approved retention periods for deletion tombstones, backups, logs,
  support mail, and pending/failed deletion records.

The personal Gmail address currently recorded in `company.yml` is not treated
as permission to publish it.

## Later explicit approvals

These are intentionally deferred until the prerequisites are ready:

- EAS cloud build if it can consume paid quota or incur cost.
- Apple agreements, tax, and banking.
- Final App Privacy and age-rating answers.
- Submit for Review.
- Manual public release.

Engineering may continue local implementation, tests, drafts, and read-only
service verification without those approvals.
