# CUT OS — counsel review packet

**Prepared:** August 10, 2026<br>
**Status:** Post-launch remediation packet under the August 10 owner-risk
decision; not legal advice<br>
**Requested outcome:** Written approval or redlines for the exact launch scope,
public legal pages, App Store disclosures, and operating procedures described
below.

The owner decided on August 10, 2026 to proceed to launch before qualified
review and to initiate counsel and dietitian review within three calendar days
after public release. That decision is recorded in
`app-store/evidence/owner-deferred-professional-review-2026-08-10.md`. Nothing
in this packet claims counsel approval, and no external message may be sent
without the owner's immediate confirmation.

This packet is designed to let qualified U.S. technology/privacy counsel review
CUT OS without first reconstructing the product from the repository. Counsel
should still inspect the final rendered Privacy Policy, Terms, and Support pages
and the exact signed iOS build before approval.

## 1. Launch facts

| Item                       | Current launch position                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| Product                    | CUT OS, an adults-only iPhone wellness app for daily weigh-ins and balanced-meal logging       |
| Operator                   | Zarif Ahmed, individual seller; proposed sole-proprietor operation in Texas                    |
| Public contact             | `ahmed.zarif@gmail.com`                                                                        |
| Public domain              | `https://getcutos.com`                                                                         |
| Distribution               | Public App Store, United States only, iPhone only                                              |
| Download price             | Free                                                                                           |
| Paid offer                 | `CUT OS Pro Monthly`, Apple auto-renewable subscription                                        |
| Price and period           | USD $4.99 per month                                                                            |
| Trial / introductory offer | None                                                                                           |
| Family Sharing             | Off                                                                                            |
| Release method             | Manual release after App Review approval                                                       |
| Minimum user age           | Intended 18+; final legal and Apple implementation position pending                            |
| Advertising                | None                                                                                           |
| General analytics SDK      | None in the current application dependency inventory                                           |
| Medical positioning        | General wellness only; no diagnosis, cure, mitigation, prevention, or treatment claim intended |

The paid v1 unlocks the daily check-in, one daily weigh-in, six curated balanced
meal choices, meal logging/editing/deletion, daily nutrition totals, cloud
persistence, and account controls. Adaptive targets, trends, workouts,
reminders, progress reporting, weekly review, and medical treatment features do
not ship in v1 and must not be claimed.

## 2. Current technical and commercial controls

- Bundle ID: `com.zarifahmed.cut`.
- App Store Connect app ID: `6798020879`.
- Apple subscription product ID: `com.zarifahmed.cut.pro.monthly`.
- Apple In-App Purchase is the only purchase surface in the app.
- RevenueCat entitlement `CUT_OS_PRO` is the paid-access source of truth.
- The RevenueCat customer identifier is an internal random UUID. CUT does not
  send RevenueCat a Clerk ID, email, name, date of birth, weight, meal, or
  nutrition attribute.
- Clerk production uses strict user-enumeration protection. Native API is
  enabled, the exact Apple team prefix and bundle ID are registered, and
  `com.zarifahmed.cut://callback` is allowlisted.
- Clerk production test mode is off, and no development users were copied into
  production.
- Native Clerk traffic now uses the verified same-origin CUT proxy. Clerk
  Support supplied a public preview package that resolves the prior native
  session/TLS path; it is integrity-pinned and must remain pinned until Clerk
  publishes a supported stable release and CUT retests the exact candidate.
- The current production backend is bound to Git commit
  `b7157c5617c8aa1d7a56dfb5489ebeb8a5657af9` and Replit deployment
  `6e48c23c`. The connected production database passed direct client-side TLS
  authorization and hostname verification. Point-in-time recovery is enabled
  with a seven-day in-place restore window; no destructive restore drill has
  been approved or performed.
- Account deletion is designed as a durable workflow spanning Clerk,
  RevenueCat, and the CUT database. It does not cancel the Apple subscription.
- A self-declared full date of birth is sent to the CUT server only to produce
  an eligibility decision. The design immediately discards the raw date and
  stores only eligibility status, policy version, and decision time.
- The app has implemented Apple's Declared Age Range capability and fails closed
  when adult eligibility cannot be established. PermissionKit Significant
  Change handling and Apple's consent-revocation server notification are not
  represented as complete.
- Public Privacy, Terms, and Support routes return HTTP 503 while the legal
  publication record remains unapproved.
- App Store Connect and EAS contain no iOS build. Every exact-build, physical
  iPhone, TestFlight, purchase, restore, deletion, recovery, privacy-archive,
  and screenshot conclusion remains pending.

These are engineering assertions, not counsel conclusions. The exact signed
archive, production vendor settings, and real-device behavior remain the final
evidence.

## 3. Data and vendor summary

| Data or processing                                                  | Purpose                                        | System(s)                                            | Current deletion/retention position                                                           |
| ------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Email and account IDs                                               | Authentication and support                     | Clerk, CUT database                                  | Delete with account, subject to approved vendor/legal retention                               |
| Display name and goal                                               | Setup and personalization                      | CUT database                                         | Cascade with user                                                                             |
| Start/goal weight and daily weigh-ins                               | Daily wellness tracking                        | CUT database                                         | Cascade with user; seven-day in-place PITR exists; legal backup deletion treatment unresolved |
| Meal choice, servings, calories, protein, carbohydrates, fat, fiber | Meal logging and daily totals                  | CUT database                                         | Cascade with user; seven-day in-place PITR exists; legal backup deletion treatment unresolved |
| Full self-declared DOB                                              | One-time 18+ decision                          | Request memory only                                  | Designed for immediate discard; no persistence or logging                                     |
| Eligibility result/version/time                                     | Enforce adults-only access                     | CUT database                                         | Delete with user; backup retention unresolved                                                 |
| IP and request metadata                                             | Delivery, security, rate limiting, Clerk proxy | One-minute memory, Replit, Clerk                     | In-app limiter expires after one minute; vendor retention/linkage unresolved                  |
| Device/session and recovery markers                                 | Authentication and interrupted-action recovery | Secure device storage, Clerk                         | Clear on sign-out/deletion; exact native QA pending                                           |
| Internal UUID and purchase state                                    | Paid access, restore, subscription support     | Apple, RevenueCat, CUT server cache                  | Delete CUT-linked RevenueCat customer; Apple retains its transaction records                  |
| Deletion tombstone and status                                       | Prevent account recreation and resume failures | CUT database                                         | Raw Clerk ID removed on completion; hash/status retention unresolved                          |
| Support communications                                              | Respond to user requests                       | Proposed public email; final support tooling pending | Retention and deletion procedure unresolved                                                   |

Current vendors/services are Apple, Clerk, RevenueCat, Replit hosting, and the
production database service connected through Replit. No advertising network is
intended. Counsel should confirm whether each vendor role and contract/DPA is
adequately described and whether additional subprocessor disclosure is needed.

## 4. Compliance assessment

### Summary

**Owner proceeding with conditions.** The technical publication lock, age gate,
purchase controls, and data minimization reduce risk. The earlier internal
recommendation was to delay launch until the decisions below were resolved in
writing; the owner has superseded that sequencing through the bounded August 10
risk-acceptance record. These questions remain urgent post-launch remediation.

### Applicable rules and policies for counsel to assess

| Authority                                             | Why it may apply                                                                    | Required determination                                                                                                        |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Apple App Review Guidelines and App Store disclosures | iOS distribution, subscription, privacy, health/wellness content                    | Approve listing, subscription disclosures, privacy answers, review access, and legal links                                    |
| Texas SB 2420 / Apple Texas implementation            | U.S. distribution includes Texas; the app is intended for adults and includes IAP   | Determine required age-range, significant-change, consent-revocation, and server-notification behavior                        |
| Texas Data Privacy and Security Act                   | Texas operator processing linked account, wellness, and body data                   | Determine applicability, sensitive-data consent/notice, consumer-rights process, and required contracts                       |
| Other U.S. state privacy and consumer-health laws     | “United States only” permits downloads nationwide                                   | Identify applicable state notices, consents, rights, geofencing, and processor terms, including consumer-health-specific laws |
| FTC Act Section 5                                     | Product, privacy, security, subscription, and wellness representations              | Confirm all claims and disclosures are accurate and non-misleading                                                            |
| FTC Health Breach Notification Rule                   | The app holds identifiable weight/nutrition information and is likely outside HIPAA | Determine whether CUT is a covered PHR vendor/related entity and approve an incident-notification procedure                   |
| FDA general-wellness policy                           | CUT provides weight and nutrition guidance                                          | Confirm the shipped functions and claims remain general wellness and do not create a regulated medical-device claim           |
| Apple auto-renewable subscription requirements        | $4.99 monthly paid plan                                                             | Approve paywall/Terms wording, ongoing-value description, auto-renewal/cancellation disclosure, and EULA position             |

Authoritative starting references:

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- [Apple update for apps distributed in Texas](https://developer.apple.com/news/?id=sg176nne)
- [Texas Business & Commerce Code Chapter 541](https://statutes.capitol.texas.gov/Docs/BC/htm/BC.541.htm)
- [FTC Health Breach Notification Rule](https://www.ftc.gov/legal-library/browse/rules/health-breach-notification-rule)
- [FTC compliance guidance for the Health Breach Notification Rule](https://www.ftc.gov/business-guidance/resources/complying-ftcs-health-breach-notification-rule-0)
- [FDA General Wellness: Policy for Low Risk Devices](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/general-wellness-policy-low-risk-devices)

## 5. Decisions requested from counsel

Please answer each item with **approved**, **approved with exact replacement
text**, or **not approved / required change**.

1. **Operator identity and notices.** Confirm how the individual/sole
   proprietor should be named publicly, whether an assumed-name filing or other
   business registration is required before launch, and which address/contact
   details must appear without unnecessarily publishing a residential address.
2. **Launch geography.** Confirm whether nationwide U.S. distribution is
   acceptable for v1 or whether specific states must be excluded until their
   privacy or consumer-health requirements are implemented.
3. **Privacy notice and consent.** Approve the exact notice-at-collection,
   sensitive-data consent, privacy-rights, appeal, and revocation procedures.
4. **Apple privacy label.** Reconcile the final archive and vendors. In
   particular, decide the correct mapping and linkage for IP/network data,
   Device ID, Product Interaction, and Other Diagnostic Data generated by
   Clerk/Replit or any final SDK.
5. **DOB treatment.** Confirm whether immediate-discard DOB processing is
   excluded from Apple's retained-data label while still requiring explicit
   public notice and/or consent.
6. **Texas age assurance.** Determine whether self-declared DOB plus Apple's
   Declared Age Range result is legally sufficient and specify required
   handling for PermissionKit Significant Change, the StoreKit age-rating
   property, guardian consent, and consent-revocation notifications.
7. **Adults-only rule.** Approve permanent per-identity ineligibility, the
   later-adult delete-and-create-new-account path, attempted circumvention
   handling, and support messaging.
8. **Health/wellness classification.** Confirm CUT is not marketed or operated
   as diagnosis, treatment, or a regulated medical device. Approve the exact
   “consult a qualified professional” warning and any higher-risk-user warning.
9. **Nutrition content.** Require and define the qualified nutrition review
   needed for meal quantities, nutrient values, allergens, calorie/macro
   calculations, cultural meal descriptions, and claims such as “balanced” or
   “nutrition-packed.”
10. **Retention schedule.** Approve exact periods and deletion triggers for the
    live database, backups, Replit logs, Clerk records/events, RevenueCat
    records, support messages, security data, completed deletion tombstones,
    and failed/pending deletion records.
11. **Account deletion.** Approve the disclosure that CUT deletion does not
    cancel Apple billing, the manual-reconciliation process, identity
    verification for assisted requests, and the deletion-completion notice.
12. **Terms/EULA.** Choose Apple's standard EULA or approved custom Terms/EULA,
    and supply acceptable-use, IP/license, warranty/disclaimer, liability,
    indemnity if any, termination/change, governing-law, venue, dispute, and
    age-capacity language.
13. **Subscription language.** Approve what the user receives, monthly
    auto-renewal, no trial, cancellation/management, refund responsibility,
    restoration, account-deletion effects, and continuing value.
14. **Support operations.** Approve the intake method, identity-verification
    steps, response target, incident escalation, deletion escalation, and
    accessibility/contact process.
15. **Security and breach response.** Determine applicable federal/state breach
    rules and approve an incident plan, vendor notice requirements, decision
    owners, and notification deadlines.
16. **Policy changes.** Approve the effective-date and material-change process,
    including which changes require renewed consent or PermissionKit handling.

## 6. Exact publication placeholders to resolve

The deployable pages remain blocked by these 15 values:

1. `{{ACCOUNT_AND_ACCEPTABLE_USE_TERMS}}`
2. `{{APPLE_EULA_POSITION}}`
3. `{{COUNSEL_APPROVAL}}`
4. `{{GOVERNING_LAW_AND_VENUE}}`
5. `{{HOSTING_AND_DATABASE_PROVIDER}}`
6. `{{LICENSE_AND_IP_TERMS}}`
7. `{{POLICY_CHANGE_PROCESS}}`
8. `{{POLICY_EFFECTIVE_DATE}}`
9. `{{PUBLIC_DOMAIN}}`
10. `{{RETENTION_SCHEDULE}}`
11. `{{RISK_ALLOCATION_TERMS}}`
12. `{{SUPPORT_INTAKE_PROCESS}}`
13. `{{SUPPORT_SERVICE_LEVEL}}`
14. `{{SUPPORT_TOOLING}}`
15. `{{TERMINATION_AND_CHANGE_TERMS}}`

Known implementation facts may be inserted only after the related legal wording
is approved. The public domain is known, but the final pages must be reviewed as
a single rendered set before `{{PUBLIC_DOMAIN}}` is resolved and hashed.

## 7. Requested counsel deliverables

1. Redlines or approved replacement text for the deployable Privacy, Terms, and
   Support templates.
2. A completed answer to all 16 decision questions above.
3. An approved retention/deletion matrix by system.
4. A state-by-state launch restriction or affirmative nationwide-launch
   position.
5. A written age-assurance implementation position for the June 2026 Texas
   requirements.
6. An FTC Health Breach Notification Rule applicability and incident-response
   position.
7. An FDA/general-wellness and nutrition-claims position, coordinated with a
   qualified nutrition reviewer.
8. Approval of the exact App Store privacy-label and age-rating answers after
   final archive inspection.
9. Approval evidence identifying reviewer, date, scope, and the exact rendered
   page hashes.

## 8. Repository evidence supplied with this packet

- `PRIVACY_DATA_MAP.md`
- `NUTRITION_CATALOG_EVIDENCE.md`
- `ADR_002_ACCOUNT_DELETION.md`
- `ADR_003_ADULT_ELIGIBILITY.md`
- `ADR_004_SUBSCRIPTIONS.md`
- `APP_STORE_METADATA.md`
- `APP_STORE_READINESS.md`
- `legal-site/privacy.html`
- `legal-site/terms.html`
- `legal-site/support.html`
- `artifacts/cut-os/server/templates/privacy.html`
- `artifacts/cut-os/server/templates/terms.html`
- `artifacts/cut-os/server/templates/support.html`
- `artifacts/cut-os/server/templates/legal-publication-approval.json`
- `artifacts/cut-os/AUTH_SECURITY_PRELAUNCH.md`
- `artifacts/cut-os/AUTH_SECURITY_PRODUCTION_QA_PROTOCOL.md`
- `app-store/app-store-submission.json`
- `app-store/evidence/apple-live-configuration-2026-08-04.md`
- `app-store/evidence/production-launch-infrastructure-2026-08-08.md`

The release validator must continue failing until every required decision is
resolved, counsel approves the exact rendered pages, and the approval record is
bound to their SHA-256 values.
