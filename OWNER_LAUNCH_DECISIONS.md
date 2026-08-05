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

**Status:** Apple's Individual membership and Account Holder access are active;
the personal seller path and legal operator are recorded, while qualified-
counsel review remains pending.

**Verified August 4, 2026:** Apple's live account shows an active Individual
membership for Account Holder Zarif Ahmed, Team ID `6JP2ZDM4HC`, renewing
August 4, 2027. App Store Connect access is active and the exact CUT OS app
record has been created. The non-secret live configuration evidence is in
`app-store/evidence/apple-live-configuration-2026-08-04.md`; private membership
contact information is deliberately excluded.

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
authorize publishing the county or resolve qualified-counsel review of the
individual seller path.

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

- whether the applicable Texas county requires a `CUT OS` assumed-name filing
  and the exact county process;
- whether qualified counsel approves the selected individual path or documents
  an alternative.

If the owner chooses an individual membership for speed, Apple will display the
owner's personal legal name as the seller. The organization path instead needs
a legal entity, D-U-N-S Number, organization-domain email and website, and a
person with authority to bind the organization.

Do not form an entity, repeat the Apple payment, or accept agreements
automatically. Paid Apps now shows an August 4, 2026 through August 3, 2027
effective period with status `Active`; banking and the U.S. Form W-9 are also
`Active`. The Apple commerce gates are confirmed. Seller-path and counsel
decisions remain owner controlled.

## Decision 2 — first real subscription

**Status:** The exact launch offer, App Store Connect subscription, U.S. price,
availability, and credential-free Review Notes are saved; the exact RevenueCat
Apple app/product/entitlement/default-offering mapping is verified. The
first-version attachment, review screenshot, exact-build QA, submission, and
release remain pending.

Recommended focused launch configuration:

- Product ID: `com.zarifahmed.cut.pro.monthly` — immutable after creation.
- Subscription Group Reference Name (internal): `CUT OS Pro`.
- Subscription Product Reference Name (internal): `CUT OS Pro Monthly`.
- US English Subscription Group Display Name: `CUT OS Pro`.
- US English Auto-Renewable Subscription Display Name: `CUT OS Pro Monthly`.
- US English description: `Weigh-ins, balanced meals & nutrition totals.`
- Duration: monthly.
- United States price: **$4.99/month**.
- Introductory offer: **no free trial**.
- Launch products: one monthly option.

**Recorded owner decision:** Approved the exact free-download, one-product
United States launch with **$4.99 USD per month**, no trial, Family Sharing off,
and manual public release. The approved immutable Product ID and internal and
customer-facing names are the values above. This approval is now matched by the
saved App Store Connect records documented in
`app-store/evidence/apple-live-configuration-2026-08-04.md#subscription`.

**Field-limit correction recorded August 4, 2026:** Apple's live App Store
Connect reference limits the localizable In-App Purchase description to 45
characters. The initially approved sentence is 54 characters and must not be
entered. Under the owner's standing instruction to continue launch execution
without pausing for non-financial, non-sensitive routine choices, the exact
45-character replacement `Weigh-ins, balanced meals & nutrition totals.` and
the `use_app_name` display option are selected. The machine record binds every
offer term to this decision so changing price, duration, names, trial, Family
Sharing, description, or app-name display fails validation.

Do not create a different App Store product or price. The exact record exists;
retain the saved Apple values and non-secret evidence, and do not attach or
submit a different product.

Apple treats these as separate fields; do not copy one label into every field by
assumption. Any additional locale remains unapproved until its exact display
name and description are reviewed.

## Decision 3 — RevenueCat production authorization

**Status:** Owner ratification, the least-privilege replacement server key, and
the exact production Apple mapping and restore behavior are complete. The
separate App Store Connect API credential and exact-build native purchase and
restore evidence remain pending.

**Verified August 5, 2026 UTC:** The owner explicitly approved RevenueCat
server-key replacement and Decision 3. A replacement secret RevenueCat API v2
key named `CUT Replit Production Replacement 2026-08-04` was created with
Charts set to no access, Customer info set to Read & write, and Project
configuration set to Read only. Its value was transferred directly into the
masked Replit secret `REVENUECAT_SECRET_API_KEY` without entering source, chat,
shell output, or this record. Replit also holds the exact CUT project, Apple
app, entitlement, and default offering REST IDs as non-secret configurations.
The existing Test Store product remains test-only and cannot collect the
approved live subscription revenue.

The RevenueCat Apple app is bound to `com.zarifahmed.cut`; the exact
`com.zarifahmed.cut.pro.monthly` product is attached to `CUT_OS_PRO` and the
default `$rc_monthly` package. RevenueCat reports the uploaded In-App Purchase
subscription key as valid and provisioned the public iOS SDK key. The separate
App Store Connect API credential remains pending and must not be conflated with
that subscription key.

The production project must also use RevenueCat's **Transfer to new App User
ID** restore behavior. That setting has controlled non-secret dashboard
evidence and is now owner-approved under Decision 3.
It is required so an Apple subscription that continues after CUT account
deletion can move to a replacement CUT account after Restore, without leaving
the deleted account's old App User ID entitled. The full exact-build purchase →
delete → replacement account → Restore → server-confirmed unlock test still
requires separate evidence and is not currently verified. See RevenueCat's
[Restore Behavior](https://www.revenuecat.com/docs/projects/restore-behavior)
documentation.

Recorded owner approval phrase:

> approve RevenueCat server-key replacement and Decision 3

The superseded key remains unconfigured. Revoking it is a separate destructive
credential action and requires action-time confirmation.

Never paste a secret key into source code, the mobile app, screenshots, support
messages, or this decision record.

## Decision 4 — public legal and support identity

**Status:** Owner supplied and authorized the public operator name, contact, and
working v1 Replit host; legal-page publication, retention decisions, qualified
review, and exact-live evidence remain pending.

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
name, GitHub account, or email display name. The owner-approved Replit hosting
draft establishes `cut-ahmedzarif1.replit.app` as the working v1 provider
address; public legal publication at that address still requires the remaining
qualified review and exact-live-page evidence.

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

**Status:** The owner-approved free-download, United States-only, public,
iPhone-only, manual-release commercial settings are saved in App Store Connect.
Paid Apps shows an August 4, 2026 through August 3, 2027 effective period with
status `Processing`; banking is `Processing`, and U.S. Form W-9 is `Active`
after its August 4 submission. The tax gate is confirmed; the agreement gate,
EULA, banking, DSA, counsel review, and full commercial approval remain pending. Optional App Store Server
Notifications are explicitly omitted from the initial release rather than
treated as a submission gate.

The owner must explicitly choose and record:

- Apple's standard EULA or a counsel-approved custom EULA;
- the app tax category; the auto-renewable subscription inherits it unless an
  owner/finance reviewer deliberately configures an override;
- the Digital Services Act trader/non-trader declaration. Apple requires a
  declaration even without EU distribution and states that an app distributed
  only outside the EU is not acting as a trader on the App Store; owner/counsel
  must still confirm the submitted answer;
- evidence that each choice was saved in App Store Connect.

The working records retain controlled evidence for the saved free-download,
United States-only, public, compatibility, and manual-release choices. Paid
Apps, banking, and the W-9 are active. EULA, DSA, counsel, and
overall commercial approval fields remain pending. The notifications record
explicitly states `not_configured_optional_for_initial_release` with no URL or
fabricated evidence.
Engineering has fixed the v1 delivery architecture to RevenueCat direct because
the API does not implement an Apple notification receiver; the exact dashboard
URL may be configured after the RevenueCat iOS app exists, but it is not an
initial-submission prerequisite. If configured later, use the dashboard-issued
production URL; Apple's documentation permits omitting a separate sandbox URL,
in which case sandbox notifications go to the production URL. Do not infer the
EULA, app tax category, DSA status, or live notification endpoint from source code
or the approved monthly subscription.

**Working recommendation for the fastest narrow U.S. launch, pending owner,
counsel, and tax review:** free app download; Apple's standard EULA; an accurate
app tax category with the subscription left to inherit it; United States
distribution only; the required DSA declaration; and manual release after
approval.
Do not invent an Apple notification endpoint that CUT does not serve.

**Recorded owner decision:** The app itself is a free download, initial
availability is United States only, and release remains manual. The EULA, app
tax category, and DSA position are still separate legal/tax decisions and are
not inferred from the territory choice.

**Routine launch choice recorded August 4, 2026:** Under the owner's standing
instruction to minimize avoidable launch delay, the initial release omits the
optional App Store Server Notifications URL. This does not weaken CUT's
server-authoritative entitlement checks or native purchase/restore QA. The URL
can be configured after launch without changing the app binary.

The internal App Store SKU `cut-ios-v1` is selected under the owner's standing
delegated launch instruction. It is not customer-facing, but Apple makes it
immutable after app-record creation, so the validator and metadata record must
continue to agree before that record is created.

## Decision 6 — subscription display and accessibility disclosure

**Status:** No trial, Family Sharing off, the corrected 45-character description,
and `use_app_name` are recorded. Voluntary Accessibility Nutrition Labels are
explicitly not reported for the initial release; accessibility product QA still
remains required.

The English (U.S.) App Name Display Option is `use_app_name`; no custom app name
is authorized. Family Sharing is disabled and the introductory-offer decision
is none. These values are explicit even though no optional feature is enabled.

Keep TestFlight internal-only
until purchase, restoration, deletion, privacy, and accessibility QA pass.
Family Sharing cannot be turned off after it is enabled for a subscription.

Apple currently states that providing Accessibility Nutrition Labels is
voluntary and that an unreported device will show that support has not yet been
indicated. Under the owner's standing instruction to minimize avoidable launch
delay, CUT will not publish label claims for the initial release. The machine
record binds that choice while prohibiting any feature, exact-build, or App
Store Connect evidence claim. This does not waive VoiceOver, Larger Text,
contrast, focus, or critical-flow physical-iPhone QA. If labels are published
later, a qualified reviewer must evaluate every recorded iPhone common task and
all applicable Apple feature labels on the exact build; never infer support
from automated tests or framework use.

For TestFlight, the already authorized public email is saved as the feedback
email, and internal group `CUT OS Internal QA` is configured with automatic
distribution off. It currently has 0 testers and 0 builds, and TestFlight owner,
mobile-QA, and App Store Connect approvals remain pending. Internal-only testing
does not require external TestFlight App Review; adding external testers does,
including review contact, demo access, notes, and review of the selected build.
Credentials remain only in App Store Connect or approved secret storage.

## Decision 7 — production hosting and database spend

**Status:** Owner cost approval and private phone verification complete;
deployment and recurring server charge have not started.

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
service-shutdown limit for those variable services. Private owner phone
verification is complete, the Publish control is available, and no recurring
deployment was started.

**Working recommendation:** use one stable HTTPS host for the API, Clerk proxy,
landing page, Privacy, Terms, and Support. A stable `.replit.app` address is
technically sufficient for the narrow U.S. launch if the owner and counsel
approve it; a custom domain is not an engineering prerequisite. The recommended
launch authorization is the $15 Reserved VM plus a **$5/month usage-based
service-shutdown limit**, for a combined maximum of **$20/month before tax**.
Reaching the variable limit can suspend the database or app until the next
billing cycle, so usage must be monitored after launch.

**Recorded owner approval August 4, 2026:** **Approve Replit up to $20/month
before tax**. Replit's current-period usage budget is set so the already-incurred
extra usage leaves exactly $5.00 of new usage-based headroom; combined with the
$15 Reserved VM, this enforces the newly approved ceiling from the approval
point. Publishing must still wait until the exact Apple/RevenueCat/database
production preflight can pass. Immediately before publish, verify that Replit's
**Set up your production database with your current development data** control
remains off because the UI can reset it after a reload.

**Direct recheck 2026-08-04T23:54:24Z:** The live draft still shows one public
North America Reserved VM at 0.5 vCPU / 2 GiB for $15/month, critical-
vulnerability blocking on, and the development-data-copy control off after the
provider UI reset was corrected. No publish action or recurring charge was
started.

## Decision 8 — Clerk production plan and billing

**Status:** Production instance created on the existing free Hobby plan; no
trial, paid upgrade, or billing action was started.

**Verified August 4, 2026:** The owner's Personal Workspace remains on
**Hobby**. A production CUT OS instance was created by cloning the reviewed
development configuration for `cut-ahmedzarif1.replit.app`; its live
publishable and secret keys were transferred directly into masked Replit
deployment secrets without being printed or committed. Its expected production
frontend API/proxy is `https://cut-ahmedzarif1.replit.app/__clerk`, which cannot
be verified until the host is live.

Engineering may create no Clerk trial, paid production plan, or billing change
unless the exact required feature and current total monthly cost are shown to
the owner and the owner supplies a separate explicit cost cap. If the launch
requirements fit the existing no-cost plan, record that live evidence without
inventing a paid approval.

## Decision 9 — App Store distribution and compatibility surfaces

**Status:** Launch choices are saved and confirmed in App Store Connect;
signed-build QA and release remain pending.

Apple records the app's distribution method separately from territory
availability and can make an iPhone/iPad app available on Apple-silicon Macs and
Apple Vision Pro unless those compatibility surfaces are explicitly opted out.
CUT's current acceptance plan is iPhone-only; no Mac or Vision Pro QA has been
performed.

**Recorded first-revenue launch choice:** Public App Store
distribution, United States only, with Apple-silicon Mac and Apple Vision Pro
availability both set to **Do not make available** until device-specific QA is
completed. This prevents an untested platform from silently joining v1 while
preserving the intended public iPhone launch.

These are routine, non-financial launch selections made under the owner's
standing instruction to continue independently and ask only for financial or
sensitive decisions. The machine record carries all three choices with owner
approval and live App Store Connect confirmation at
`app-store/evidence/apple-live-configuration-2026-08-04.md#distribution`.

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
- Replit production publishing under the approved **$20/month before tax**
  ceiling; deployment remains deferred until production preflight passes.
- Any Clerk trial, billing method, or paid-plan upgrade if production cannot use
  the existing no-cost plan.
- Apple Paid Apps and bank-processing completion; the W-9 is active.
- EULA, app tax category, optional subscription tax override, and DSA status.
  The free-download, optional-notification omission, and subscription App Name
  Display choices are recorded.
- Any future Accessibility Nutrition Label publication and any external
  TestFlight review.
- Final `CUT OS` name-clearance decision or owner-approved replacement name.
- Final App Privacy and age-rating answers.
- Submit for Review.
- Manual public release.

Engineering may continue local implementation, tests, drafts, and read-only
service verification without those approvals.
