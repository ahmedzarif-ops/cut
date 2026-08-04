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

**Status:** Owner selected an individual seller account and supplied the public
legal-operator name; Apple activation, activated seller-name verification, and
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

**Owner decision recorded August 4, 2026:** Proceed with the Apple membership as
an **individual** seller. The owner reports that no separate legal entity
currently exists and intends to operate through a Texas sole proprietorship.
This records the selected account path; it does not invent an operator name,
form an entity, or resolve Apple's sensitive-information review guidance.

**Owner identity supplied August 4, 2026:** The exact public legal-operator name
is **Zarif Ahmed**, and the owner privately supplied the applicable Texas county
for the sole-proprietorship/DBA review. The owner supplied the name in response
to the request for the name as it should appear publicly. This authorizes that
exact spelling for the working App Store and legal-page records; it does not
authorize publishing the county or claim that Apple has activated or will
display the identical seller name.

Texas Secretary of State guidance says a sole proprietorship generally does not
need a state formation filing. If the business operates as `CUT OS` rather than
under the owner's surname, the guidance directs a sole proprietor to file an
assumed-name certificate with the county clerk where the business premise is
maintained (or where business is conducted if there is no Texas business
premise). The exact county, filing need, name-clearance work, and attorney/tax
review remain pending; do not use the Secretary of State's entity Form 503 as a
substitute for the applicable county process. See the official
[business-structure guidance](https://www.sos.state.tx.us/corp/businessstructure.shtml)
and [assumed-name FAQ](https://www.sos.state.tx.us/corp/namefilingsfaqs.shtml).

Still required before submission:

- confirmation of the personal legal seller name Apple activates and displays;
- whether the applicable Texas county requires a `CUT OS` assumed-name filing
  and the exact county process;
- whether qualified counsel approves the selected individual path or documents
  an alternative;
- who has Account Holder authority.

If the owner chooses an individual membership for speed, Apple will display the
owner's personal legal name as the seller. The organization path instead needs
a legal entity, D-U-N-S Number, organization-domain email and website, and a
person with authority to bind the organization.

Do not form an entity, repeat the Apple payment, or accept agreements
automatically. When Apple activates the membership, record the actual seller
name and individual/organization team type before creating the app record.

## Decision 2 — first real subscription

**Status:** Core offer owner-approved August 4, 2026; one shortened customer
description, App Store Connect creation, and live price evidence remain pending.

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

**Recorded owner decision:** Approved the exact free-download, one-product
United States launch with **$4.99 USD per month**, no trial, Family Sharing off,
and manual public release. The approved immutable Product ID and internal and
customer-facing names are the values above. This approval does not claim that
the product or price has been created or accepted in App Store Connect.

**Field-limit correction found August 4, 2026:** Apple's live App Store Connect
reference limits the localizable In-App Purchase description to 45 characters.
The initially approved sentence is 54 characters and must not be entered. The
45-character candidate `Weigh-ins, balanced meals & nutrition totals.` is
pending explicit owner approval. All other offer decisions above remain
approved.

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

The production project must also use RevenueCat's **Transfer to new App User
ID** restore behavior. This is still **pending direct dashboard verification**.
It is required so an Apple subscription that continues after CUT account
deletion can move to a replacement CUT account after Restore, without leaving
the deleted account's old App User ID entitled. The dashboard setting and the
full exact-build purchase → delete → replacement account → Restore →
server-confirmed unlock test require separate evidence; neither is currently
approved or verified. See RevenueCat's
[Restore Behavior](https://www.revenuecat.com/docs/projects/restore-behavior)
documentation.

Exact approval phrase:

> Approve the CUT App Store connection, RevenueCat Transfer to new App User ID
> restore behavior, and least-privilege RevenueCat server key after the exact
> Apple app and subscription identifiers are verified.

Never paste a secret key into source code, the mobile app, screenshots, support
messages, or this decision record.

## Decision 4 — public legal and support identity

**Status:** Owner supplied and authorized the public operator name and contact;
domain/host approval, retention decisions, and counsel approval remain pending.

**Owner facts recorded August 4, 2026:**

- no separate legal entity currently exists;
- intended structure: Texas sole proprietorship;
- exact public legal operator: `Zarif Ahmed`;
- operator location: Texas, United States; applicable county retained outside
  the public repository;
- public support/privacy email authorized for publication:
  `ahmed.zarif@gmail.com`; and
- no custom domain currently exists.

Use only the owner-supplied spelling `Zarif Ahmed`; do not substitute the app
name, GitHub account, or email display name. The stable Replit provider address
also remains unapproved as the public domain until the hosting choice is
explicit.

The draft Privacy, Terms, and Support pages cannot be published until the
remaining identity, hosting, operating, and legal gates are complete:

- stable production domain or host;
- support mailbox owner and response target; and
- counsel-approved retention periods for deletion tombstones, backups, logs,
  support mail, and pending/failed deletion records.

The owner has explicitly authorized both the legal-operator name and Gmail
address above for public legal/support/privacy use. That approval does not fill
the still-missing public host, mailbox response commitment, or retention
decisions.

## Decision 5 — App Store commercial and legal configuration

**Status:** Owner approved the free-download, United States-only, manual-release
commercial shape; EULA, tax, DSA, counsel, and App Store Connect confirmation
remain pending.

The owner must explicitly choose and record:

- Apple's standard EULA or a counsel-approved custom EULA;
- the app tax category and the auto-renewable subscription tax category;
- the Digital Services Act trader/non-trader position, or a documented
  not-applicable position if EU distribution is excluded;
- the full dashboard-issued RevenueCat Apple Server Notification URL after the
  live iOS app is configured, saved identically in Apple's production and
  sandbox fields; and
- evidence that each choice was saved in App Store Connect.

The working records contain the approved free-download, United States-only,
manual-release choices while keeping the unresolved EULA, tax, DSA, counsel,
notification, and App Store Connect evidence fields `null` or pending.
Engineering has fixed the v1 delivery architecture to RevenueCat direct because
the API does not implement an Apple notification receiver; the exact dashboard
URL and saved App Store Connect evidence remain pending. Do not infer the EULA,
tax category, DSA status, or live notification endpoint from source code or the
approved monthly subscription.

**Working recommendation for the fastest narrow U.S. launch, pending owner,
counsel, and tax review:** free app download; Apple's standard EULA; app tax
category `App Store software`; subscription tax category `Match to parent app`;
United States distribution only; no EU distribution and the corresponding
documented DSA not-applicable position; and manual release after approval.
Use RevenueCat's full Apple Server Notification URL identically for production
and sandbox rather than inventing API endpoints that CUT does not serve.

**Recorded owner decision:** The app itself is a free download, initial
availability is United States only, and release remains manual. The EULA, both
tax-category selections, and documented no-EU DSA position are still separate
legal/tax decisions and are not inferred from the territory choice.

## Decision 6 — subscription display and accessibility disclosure

**Status:** No trial and Family Sharing off are owner-approved; the corrected
45-character subscription description, App Name Display Option, accessibility
labels, and exact-build review remain pending.

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

**Status:** Provider sign-in and live price inspection are complete; unambiguous
owner cost approval and private phone verification remain pending.

The API's current rate limits and account-deletion retry scheduler are
process-local. The fastest safe launch topology therefore keeps exactly one API
machine running continuously: provider minimum one, provider maximum one, and
the matching `API_MAX_INSTANCES=1` runtime assertion. An autoscale service that
can reach zero is not sufficient for the deletion retry guarantee even if its
maximum is one.

Production also requires managed PostgreSQL with verified TLS, backups or
point-in-time recovery, and a successful restore drill. No production host or
database has been purchased or deployed yet.

**Verified August 4, 2026:** Replit's live publishing screen offers a public
North America Reserved VM with 0.5 vCPU and 2 GiB for **$15 USD per month** at
`cut-ahmedzarif1.replit.app`. The production PostgreSQL database and excess
outbound transfer are separate usage-based services. Replit supports a
service-shutdown limit for those variable services and requires private owner
phone verification before publishing. No phone number was entered, no code was
sent, and no recurring deployment was started.

**Working recommendation:** use one stable HTTPS host for the API, Clerk proxy,
landing page, Privacy, Terms, and Support. A stable `.replit.app` address is
technically sufficient for the narrow U.S. launch if the owner and counsel
approve it; a custom domain is not an engineering prerequisite. The recommended
launch authorization is the $15 Reserved VM plus a **$5/month usage-based
service-shutdown limit**, for a combined maximum of **$20/month before tax**.
Reaching the variable limit can suspend the database or app until the next
billing cycle, so usage must be monitored after launch.

Do not change a paid plan, add a payment method, create a paid database, or
start a billable deployment until the owner explicitly says: **Approve Replit
up to $20/month before tax**.

The August 4 owner response included both “approve up to $20/month before tax”
and “do not approve” separated by a slash. It is therefore recorded as
ambiguous, not as spend authorization. No paid hosting action may start until
one choice is stated without the alternative.

## Decision 8 — Clerk production plan and billing

**Status:** Existing development workspace verified on Hobby; production cost
and feature fit remain pending read-only inspection.

The live Clerk dashboard currently identifies the owner's Personal Workspace as
**Hobby** and the CUT OS instance as **development**. Signing up with GitHub and
opening the production-instance flow do not authorize a paid plan, free trial,
billing method, or upgrade.

Engineering may create no Clerk trial, paid production plan, or billing change
unless the exact required feature and current total monthly cost are shown to
the owner and the owner supplies a separate explicit cost cap. If the launch
requirements fit the existing no-cost plan, record that live evidence without
inventing a paid approval.

## Decision 9 — App Store distribution and compatibility surfaces

**Status:** Pending owner decision and App Store Connect confirmation.

Apple records the app's distribution method separately from territory
availability and can make an iPhone/iPad app available on Apple-silicon Macs and
Apple Vision Pro unless those compatibility surfaces are explicitly opted out.
CUT's current acceptance plan is iPhone-only; no Mac or Vision Pro QA has been
performed.

**Working recommendation for the first-revenue launch:** Public App Store
distribution, United States only, with Apple-silicon Mac and Apple Vision Pro
availability both set to **Do not make available** until device-specific QA is
completed. This prevents an untested platform from silently joining v1 while
preserving the intended public iPhone launch.

Exact approval phrase:

> Approve public App Store distribution and opt out of Mac and Vision Pro for
> v1.

The machine record keeps all three decisions pending until that choice is
explicit. After App Store Connect becomes available, retain the saved values,
UTC, and non-secret evidence reference for each field.

## Decision 10 — public product name

**Status:** `CUT OS` remains the working name; preliminary U.S. screening found
meaningful same-market risk, and owner/counsel clearance remains pending.

**Read-only screen completed August 4, 2026:** No exact `CUT OS` result appeared
in the preliminary USPTO full-mark or U.S. App Store searches, but `CUT` is
crowded across fitness, body-recomposition, calorie, macro, and nutrition
products. Relevant live federal records include `CALCUT`, `FITCUT`, and `GET
CUT`; close App Store names include `Body Recomp Tracker - Cut`, `Cut
Lifestyle`, `CutLog`, `CutWise`, and `CutCoach`. The suffix `OS` may not be
enough to avoid similarity in meaning or commercial impression. This is a
knock-out screen, not legal clearance.

Do not buy a domain, commission paid branding, file a mark, or treat App Store
name acceptance as trademark clearance. Before the app record or campaign is
locked, qualified U.S. trademark counsel should search federal/state/common-law
variants and advise whether to keep `CUT OS` or adopt a more distinctive primary
brand. See the USPTO's
[federal trademark searching guidance](https://www.uspto.gov/trademarks/search/federal-trademark-searching).

## Later explicit approvals

These are intentionally deferred until the prerequisites are ready:

- EAS cloud build if it can consume paid quota or incur cost.
- Production hosting/database provider and exact recurring cost cap (still
  awaiting an unambiguous selection).
- Any Clerk trial, billing method, or paid-plan upgrade if production cannot use
  the existing no-cost plan.
- Apple agreements, tax, and banking.
- EULA, tax categories, DSA status, App Store Server Notifications, and
  subscription App Name Display Option. The free-download choice is approved.
- Public/private distribution and explicit Mac and Vision Pro compatibility
  availability.
- Accessibility Nutrition Label decision and any external TestFlight review.
- Final `CUT OS` name-clearance decision or owner-approved replacement name.
- Final App Privacy and age-rating answers.
- Submit for Review.
- Manual public release.

Engineering may continue local implementation, tests, drafts, and read-only
service verification without those approvals.
