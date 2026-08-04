# CUT OS — owner launch decisions

**Updated:** August 4, 2026
**Purpose:** Record only the business, financial, identity, and legal decisions
that engineering must not make for the owner.

## Already confirmed

- Audience: adults age 18 and older.
- Eligibility policy: `adult-18-v1`.
- Bundle ID: `com.zarifahmed.cut`.
- Paid v1 remains the narrow daily check-in, weigh-in, six-meal, meal-log, and
  daily nutrition-total scope documented in `APP_STORE_READINESS.md`.

## Decision 1 — Apple seller and legal operator

**Status:** Apple payment submitted; activation, seller verification, and
qualified-counsel review remain pending.

**Verified August 4, 2026:** The owner reports completing Apple's **$99 USD per
membership year** payment. Apple's live account page recognizes the enrollment
but still says purchase processing may take up to 48 hours. App Store Connect
does not yet expose My Apps, and its business area currently redirects to an
invalid-user state. Do not repeat the purchase while activation is pending.

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
- who has Account Holder authority.

If the owner chooses an individual membership for speed, Apple will display the
owner's personal legal name as the seller. The organization path instead needs
a legal entity, D-U-N-S Number, organization-domain email and website, and a
person with authority to bind the organization.

Do not form an entity, repeat the Apple payment, or accept agreements
automatically. When Apple activates the membership, record the actual seller
name and individual/organization team type before creating the app record.

## Decision 2 — first real subscription

**Status:** Awaiting owner approval.

Recommended focused launch configuration:

- Product ID: `com.zarifahmed.cut.pro.monthly` — immutable after creation.
- Subscription Group Reference Name (internal): `CUT OS Pro`.
- Subscription Product Reference Name (internal): `CUT OS Pro Monthly`.
- US English Subscription Group Display Name: `CUT OS Pro`.
- US English Auto-Renewable Subscription Display Name: `CUT OS Pro Monthly`.
- US English description: `Daily weigh-ins, balanced meals, and nutrition totals.`
- Duration: monthly.
- United States price: **$4.99/month**.
- Introductory offer: **no free trial**.
- Launch products: one monthly option.

Exact approval phrase:

> Approve $4.99 monthly, no trial, using
> `com.zarifahmed.cut.pro.monthly`; internal group `CUT OS Pro`; internal product
> `CUT OS Pro Monthly`; US English group display `CUT OS Pro`; US English
> subscription display `CUT OS Pro Monthly`; and description `Daily weigh-ins,
balanced meals, and nutrition totals.`

Do not create the real App Store product until the owner approves these terms.

Apple treats these as separate fields; do not copy one label into every field by
assumption. Any additional locale remains unapproved until its exact display
name and description are reviewed.

## Decision 3 — RevenueCat production authorization

**Status:** Awaiting production App Store configuration and owner approval.

**Verified August 3, 2026:** The CUT RevenueCat project is accessible, but it is
still configured only with RevenueCat's Test Store. It has no real App Store
product mapping and cannot collect live subscription revenue yet. After the
Apple app and subscription exist, the owner may approve the real iOS app
connection and creation of a least-privilege RevenueCat REST v2 server key
limited to the customer access required by CUT OS.

Exact approval phrase:

> Approve the CUT App Store connection and least-privilege RevenueCat server
> key after the exact Apple app and subscription identifiers are verified.

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

## Decision 5 — App Store commercial and legal configuration

**Status:** Awaiting owner, counsel, and App Store Connect confirmation.

The owner must explicitly choose and record:

- whether the app itself is a free download or paid download;
- Apple's standard EULA or a counsel-approved custom EULA;
- the app tax category and the auto-renewable subscription tax category;
- the Digital Services Act trader/non-trader position, or a documented
  not-applicable position if EU distribution is excluded;
- the full dashboard-issued RevenueCat Apple Server Notification URL after the
  live iOS app is configured, saved identically in Apple's production and
  sandbox fields; and
- evidence that each choice was saved in App Store Connect.

The working records keep every owner/legal item `null` or pending. Engineering
has fixed the v1 delivery architecture to RevenueCat direct because the API
does not implement an Apple notification receiver; the exact dashboard URL and
saved App Store Connect evidence remain pending. Do not infer a free app, EULA,
tax category, DSA status, or live notification endpoint from the source code or
the proposed monthly subscription.

**Working recommendation for the fastest narrow U.S. launch, pending owner,
counsel, and tax review:** free app download; Apple's standard EULA; app tax
category `App Store software`; subscription tax category `Match to parent app`;
United States distribution only; no EU distribution and the corresponding
documented DSA not-applicable position; and manual release after approval.
Use RevenueCat's full Apple Server Notification URL identically for production
and sandbox rather than inventing API endpoints that CUT does not serve.

## Decision 6 — subscription display and accessibility disclosure

**Status:** Awaiting owner and exact-build review.

Before creating the subscription, the owner must also select the App Name
Display Option for the English (U.S.) localization: use the existing app name,
or approve an exact custom name. Family Sharing and introductory-offer choices
must be explicit even when the selected value is disabled or none.

**Working recommendation:** use the existing app name, disable Family Sharing
for v1, use no introductory offer or trial, and keep TestFlight internal-only
until purchase, restoration, deletion, privacy, and accessibility QA pass.
Family Sharing cannot be turned off after it is enabled for a subscription.

Apple's Accessibility Nutrition Labels are based on common tasks in the exact
shipping build. A qualified reviewer must test the recorded iPhone tasks and
all nine Apple feature labels, then the owner must decide whether to publish
verified support or indicate no supported feature for the initial release. Do
not claim support from automated tests or development builds alone.

For TestFlight, the owner must approve the feedback email and distribution
scope. Internal-only testing does not require external TestFlight App Review;
adding external testers does, including review contact, demo access, notes, and
review of the selected build. Credentials remain only in App Store Connect or
approved secret storage.

## Decision 7 — production hosting and database spend

**Status:** Awaiting provider sign-in, live price inspection, and owner approval.

The API's current rate limits and account-deletion retry scheduler are
process-local. The fastest safe launch topology therefore keeps exactly one API
machine running continuously: provider minimum one, provider maximum one, and
the matching `API_MAX_INSTANCES=1` runtime assertion. An autoscale service that
can reach zero is not sufficient for the deletion retry guarantee even if its
maximum is one.

Production also requires managed PostgreSQL with verified TLS, backups or
point-in-time recovery, and a successful restore drill. No production host or
database has been purchased or deployed yet.

**Working recommendation:** use one stable HTTPS host for the API, Clerk proxy,
landing page, Privacy, Terms, and Support. A stable `.replit.app` address is
technically sufficient for the narrow U.S. launch if the owner and counsel
approve it; a custom domain is not an engineering prerequisite. Inspect the
provider's exact recurring price before choosing the always-on topology and
database.

Do not change a paid plan, add a payment method, create a paid database, or
start a billable deployment until the owner approves the exact provider,
configuration, and recurring cost cap shown at checkout.

## Later explicit approvals

These are intentionally deferred until the prerequisites are ready:

- EAS cloud build if it can consume paid quota or incur cost.
- Production hosting/database provider and exact recurring cost cap.
- Apple agreements, tax, and banking.
- App download price, EULA, tax categories, DSA status, App Store Server
  Notifications, and subscription App Name Display Option.
- Accessibility Nutrition Label decision and any external TestFlight review.
- Final App Privacy and age-rating answers.
- Submit for Review.
- Manual public release.

Engineering may continue local implementation, tests, drafts, and read-only
service verification without those approvals.
