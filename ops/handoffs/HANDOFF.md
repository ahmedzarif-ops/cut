# CUT — lean master handoff (in-repo canonical)

> Start here for the current state. Dated history remains in
> [sessions/INDEX.md](sessions/INDEX.md); it is not an active launch plan.

## CURRENT START-HERE

- Working branch: `codex/app-store-v1`.
- Draft pull request: [#9 — harden CUT OS App Store launch path](https://github.com/ahmedzarif-ops/cut/pull/9).
- Exact release candidate build 4 is signed from commit
  `b6d135dc334937c61f7e1f4847ec9b04d2fd6cd4`, processed by Apple as **Ready
  to Submit**, assigned to internal group `CUT OS Internal QA` with automatic
  notifications off, and saved on App Store version 1.0.0. Its EAS build ID is
  `dc2c2bfa-bec6-4112-bedd-eafbb81f4bc4` and App Store Connect build ID is
  `0b6ff58a-d236-4469-b471-8216cf5a91ee`. The exact evidence is
  [apple-build-4-processing-and-assignment-2026-08-10.md](../../app-store/evidence/apple-build-4-processing-and-assignment-2026-08-10.md).
- The same internal tester still shows `No Builds Available` after build 4 was
  assigned. Apple Developer Support case `20000133994444` remains open; no
  follow-up or second invitation was sent.
- The exact code commit verified and deployed at this checkpoint is
  `08e62232db7f81047eec5b55a184f30fb7d4162a`; GitHub Actions run `31425815282`
  reports **Success** for both **CI verify** and **Release evidence boundary** on
  that commit. Replit serves the same commit; root, status, readiness, Clerk
  proxy, Privacy, Terms, and Support pass. A later documentation-only commit may
  move the branch and pull-request head without changing the deployed build.
- Exact EAS production build `1fe435cf-9d8b-4eff-a1d3-bfb893b344a6` is version
  1.0.0 build 3. Apple processed App Store Connect build
  `dce1d8df-cd9e-46d7-8607-dcde9570df2e` as valid, assigned it to the internal
  TestFlight group with automatic notifications off, and selected it for App
  Store version 1.0.0. The saved age declaration returns an effective 18+ U.S.
  rating. The nine-type no-tracking App Privacy label is published; content
  rights, regulated-medical-device, DSA, Standard EULA, and Fitness and Health
  tax decisions are saved. The exact monthly product shows current U.S. pricing
  of $4.99, availability in 1 of 175 storefronts, no introductory offer, and no
  upcoming price change; RevenueCat's Apple credentials and catalog mapping are
  technically verified. All seven saved age-questionnaire steps, including the
  2026 social-media questions, were re-read without changes. Physical-iPhone QA,
  purchase/restore evidence, screenshots, review access, App Review submission,
  and manual release remain open. After the correct tester
  still showed `No Builds Available`, the owner approved exactly one Apple
  invitation email. The same internal Account Holder tester was removed and
  re-added, and App Store Connect reported one tester added. The owner then
  reported no invitation received, and the live tester row remained `No Builds
Available` despite bidirectional group/build assignment. No second email was
  sent. With explicit owner approval, Apple Developer Support case
  `20000133994444` was submitted at `2026-08-10T22:22:22Z`; Apple will reply by
  email and gave no response-time guarantee. The case requests repair or
  diagnosis of the contradictory tester/build relationship without another
  invitation or App Store mutation. Apple-side availability, acceptance, and
  exact-build installation remain open.
- Build 3 is no longer release-eligible even though Apple still reports it
  valid and assigned. Its source predates the same-session Clerk refresh repair
  required after bearer-token expiry. A local EAS-production-environment
  Release simulator candidate passed initial access, more-than-one-minute
  access, and cold relaunch after expiry on the preserved authenticated
  account; 462 mobile tests, 64 App Store/screenshot tests, the working
  validator, and full TypeScript pass. Build 4 contains this repair and
  supersedes build 3 as the exact release candidate. The bounded local evidence
  is
  [local-auth-refresh-candidate-2026-08-10.md](../../app-store/evidence/local-auth-refresh-candidate-2026-08-10.md).
- The credential-free App Review Notes template now has all stable build,
  category, product, price, URL, and network facts resolved. It remains unsaved
  with 12 placeholders only for sensitive contact/review-account data and the
  verified entitlement method. The dedicated `CUT App Store 6.9 QA` iPhone 17
  Pro Max / iOS 27.0 simulator produced the
  accepted `1320 × 2868` preflight size, and a locally signed release-style app
  launched to the empty sign-in screen. It is not the App Store-signed
  TestFlight binary; no CUT OS release screenshot is retained, hash-bound,
  PII-reviewed, approved, or uploaded.
- Resolve the exact remote branch SHA and its required GitHub checks live before
  relying on a checkpoint. A commit ID embedded in this tracked handoff would
  become historical as soon as the handoff itself changes.
- The agent must not self-merge the pull request; the owner merges or explicitly
  overrides that repository rule.
- The deployed code checkpoint passes **1,417 automated tests** (303 release
  operations, 62 App Store, 33 domain, 4 database, 459 mobile, and 556 API), all
  TypeScript checks, generated-code drift, working App Store validation,
  changed-file formatting, `.replit`/migration parsing and drift checks, Expo
  dependency health, and the clean zero-JavaScript Replit production-build
  contract. None of those checks are signing, TestFlight, live-service, or App
  Store acceptance evidence.
- Production ingress is pinned to one explicit canonical HTTPS origin and
  excludes Replit development-domain injection. The production public process
  serves a CSP-locked zero-JavaScript CUT page, blocks Expo preview artifacts at
  origin and mounted paths, and has a bounded live verifier.
- RevenueCat startup includes a bounded customer-permission verifier. Its
  corrected source-controlled, read-only live preflight passed from Replit on
  then-current green commit `930a70eb4773b534c9d9fa33fb6030bdd6ee5a54`,
  verifying
  the CUT iOS mapping and bounded customer-read access. Dashboard evidence
  verifies read/write permission without issuing a test write or deletion.
  Customer write/delete behavior and post-upload exact-build restore QA remain
  evidence gates. Direct RevenueCat inspection on August 8 showed **Valid
  credentials** for the required In-App Purchase key configuration and the
  owner-authorized App Store Connect API credential on exact app
  `app8feee0dfba`; its machine status is `verified`. Apple server notifications
  show no notifications received, and exact-build purchase/TestFlight evidence
  remains open.
  Decision 3 owner authorization is confirmed.
  Database/migration and shutdown
  timeout relationships are cross-tested, and Metro gets only reviewed public
  values with dotenv loading forced off.
- Malformed StoreKit display data now withholds purchase, and the settled
  one-plan paywall has a tested conservative 6.9-inch layout budget while
  preserving its real offer, account actions, renewal disclosure, legal/support
  links, and accessible targets. Exact signed-device capture remains pending.
- Target-aware strict validation remains closed for `app_review` and
  `public_release`, covering external, owner, legal, exact-build, screenshot,
  and App Store Connect evidence. Recompute counts from the current tree rather
  than copying a historical number.
- Release evidence requires structured monitoring approvals and a closed,
  recovery-bound migration classification; it forbids application-only rollback
  after any completed migration. Native configuration also keeps the dark
  launch-screen status bar readable and excludes Clerk's optional Google
  Sign-In pod.
- Clean Expo iOS prebuild and CocoaPods installation pass with fail-closed scene-
  lifecycle and iOS 17 pod-target plugins. A clean production-only mobile
  install retains all 32 runtime dependencies without direct development links;
  an unsigned generic-iPhone Xcode 27 Release archive and its 118-file secret
  scan also pass. This is a local structural rehearsal, not a signed EAS archive,
  physical-device flow, or full tap-through.
- CUT native password recovery now uses Clerk's documented custom email-code
  flow through the verified same-origin proxy; the direct-host native
  `AuthView` override has been removed. Web recovery keeps Clerk's prebuilt
  non-transferable sign-in flow. The Clerk development tenant has Strict enumeration protection,
  Client Trust, bot protection, and lockout protection enabled. Production now
  uses free-Hobby application `app_3HeFFYD0GpUEjcPIlOwNYXAKUmo`, instance
  `ins_3HeFLfOAbfStrVB4eW5b7sYOeAq`, and domain record
  `dmn_3HeFLeuWzWg9xKNeG4o6PUUVHlb` for `getcutos.com`. Email/password with
  required email-code verification, Strict enumeration, lockout, Device Trust,
  bot protection, Native API, iOS prefix `6JP2ZDM4HC`, bundle
  `com.zarifahmed.cut`, callback `com.zarifahmed.cut://callback`, and exact proxy
  `https://getcutos.com/api/__clerk` are configured. Masked keys are active in
  Replit and EAS production, and bounded proxy health passes. The prior
  provider-domain tenant had zero users and remains only as rollback; it is not
  claimed revoked or deleted. No Clerk card, trial, paid-plan change, or new
  billing action occurred. A Release-style dedicated iOS 27 zero-user simulator
  build used Xcode **Sign to Run Locally**, contained the exact current EAS
  production Clerk publishable key by a value-free equality check, and launched
  the real `Welcome back` UI without a new keychain error at
  `2026-08-08T21:07:02Z`. Its non-durable local screenshot fingerprint is in
  `app-store/evidence/production-launch-infrastructure-2026-08-08.md`; that
  result is not signed/TestFlight QA. `clerk.getcutos.com` was NXDOMAIN during
  that rehearsal; preserve that historical observation. Superseding public DNS
  verification at `2026-08-08T21:21:47Z` confirmed all five required Clerk
  CNAMEs through an authoritative nameserver, Cloudflare, and Google, and Clerk
  now shows the primary domain, DNS configuration, and proxy as Verified. No
  apex A, TXT, or DMARC record changed and no charge was incurred. At
  approximately `2026-08-08T21:27Z`, a user-provided
  simulator observation confirmed real signup-email delivery, successful user
  entry of its verification code, and an authenticated session reaching
  `Apple age check needed`; no account detail is recorded. The authenticated
  JavaScript path worked. A superseding EAS-production-environment arm64 Release simulator
  build, signed locally, linked and resolved `CutDeclaredAgeRange`, preserved
  the authenticated session to the DOB gate, and returned `not_required` from
  `getStatusAsync()` without a crash or fatal configuration, module, or keychain
  error. No DOB or account data was entered, and its `/tmp` screenshot is
  ephemeral rather than release evidence. `ios-simulator` and `production`
  share the pinned 26.4 EAS image; the targeted native configuration suite
  passes 15/15. A bounded recheck at `2026-08-10T07:27:51Z` proved the
  canonical proxy returns HTTP 200 with a valid certificate while the native
  SDK's direct Frontend API host `clerk.getcutos.com` fails during the TLS
  handshake before serving a certificate. Clerk shows the primary domain, DNS,
  and proxy as Verified but marks that direct host Optional. An existing Clerk
  support ticket was acknowledged on August 9. On August 10, Clerk Support
  supplied public preview package `@clerk/expo@cfb6495`, upstream head
  `cfb64951dc6a2a47af7971bbff2b18dd66b59326`; CUT installed that exact snapshot
  and retired its local 4.2.0 patch. No reply was sent. Preserve the working
  proxy and instance. At `2026-08-10T08:30:11Z`, an
  EAS-production-environment arm64 Release simulator build based on `d8cd698`
  plus the candidate patch
  verified a reproducible `@clerk/expo` patch that forwards CUT's existing
  proxy URL into both native SDK bridges. A newly created zero-user iOS 27
  simulator opened the real `Welcome back` UI, and exact-process logs showed
  successful TLS and HTTP 200 only through `getcutos.com/api/__clerk`, with no
  direct-host request or TLS failure. No email, code, password, account
  identifier, or external message was entered or sent. Focused tests pass. With
  the support snapshot installed, additional token-refresh and same-principal
  route-remount races were repaired. A later EAS-production-environment arm64
  Release simulator build reached the real CUT OS Pro Monthly `$4.99 per month`
  screen and remained stable for more than 70 seconds. Tokens were not logged or
  persisted and authenticated traffic remains no-store. Exact signed-device
  password recovery, purchase/restore, and physical-device/TestFlight Declared
  Age Range entitlement/API validation remain open.
- App Review access is now a target-bound release gate: its controlled window
  requires Clerk production test mode, Client Trust, five reserved synthetic
  accounts, and exact-build new-device proof; public release separately
  requires production test mode off while Client Trust remains on. The verifier
  accepts only
  `BUILD_SHA -> APP_REVIEW_EVIDENCE_SHA -> PUBLIC_RELEASE_EVIDENCE_SHA`; it
  freezes the review account history and every
  non-allowlisted submission field across the transition, freezes release ID
  plus build/deployment identity across target manifests, and rejects a third
  evidence commit. Only root `updated`, target-state Clerk/Apple evidence, and
  the Clerk shutdown-closure triplet may advance in the submission record.
- Sign-up has separate 18+ and provisional Terms/Privacy controls. Legal launch
  gate 3A remains open until counsel approves the exact language and durable
  policy-version/timestamp evidence design.
- Account deletion visibly warns that Apple billing continues and keeps the
  App Store subscription-management action available; a source contract now
  protects that review-critical behavior until exact-build native QA.
- Replit development is imported, database-migrated, secret-configured, and
  preview-verified. The repository no longer overrides Replit's provider-owned
  deployment type. It is fast-forwarded to the latest pushed branch commit with
  a clean tree; the superseded Replit-only workflow change remains in a named
  stash. The live Publishing draft must remain a one-machine Reserved VM and be
  re-verified after every sync.
- The owner approved Replit up to **$20/month before tax**: a $15 Reserved VM
  plus $5 of new usage-based headroom. Phone verification is complete. Replit
  now serves exact source commit
  `08e62232db7f81047eec5b55a184f30fb7d4162a` as Reserved VM deployment
  `78b1854c`. After publish, development-data copy remained off, critical-
  vulnerability publish blocking remained on, and the production database was
  connected. The corrected startup logged direct client-side TLS attestation
  **PASS** at August 10, 2026, 12:47:01.28 PM America/Chicago. Exact-build
  `/status`, `/`, `/api/readyz`, and canonical Clerk proxy checks returned 200;
  `/privacy`, `/terms`, and `/support` are public and return 200 under the
  owner-deferred professional-review decision. Point-in-time recovery is on with a seven-day
  window. Replit Support confirmed its restore is in-place only, has no isolated
  target, leaves app code unchanged, and cannot roll forward. The destructive
  control remains untouched pending a separately approved recovery plan. See the single detailed
  [production infrastructure incident record](../../app-store/evidence/production-launch-infrastructure-2026-08-08.md).
  This handoff does not assert billing or charge status.
- Apple Developer Program membership is active as an Individual account with
  Zarif Ahmed as Account Holder. App Store Connect access and the CUT OS app
  record are active. Paid Apps shows an August 4, 2026 through August 3, 2027
  effective period with status `Active`; banking and U.S. Form W-9 are also
  `Active`. Apple commerce readiness is confirmed; legal, exact-build,
  submission, and release gates remain open.
  Production EAS submission
  routing is pinned to Apple app ID `6798020879` and validated against
  subscription group ID `22286645` and subscription ID `6798020349`.
- RevenueCat server API v2 replacement key
  `CUT Replit Production Replacement 2026-08-04` is created with Charts no
  access, Customer Information read/write, and Project Configuration read-only
  dashboard settings. Replit now has its value saved masked and the exact CUT
  project, Apple app, entitlement, and offering REST IDs as non-secret
  configurations. The corrected read-only live preflight passed on exact green
  commit `930a70eb4773b534c9d9fa33fb6030bdd6ee5a54`; dashboard evidence verifies
  customer read/write permission and no test write or deletion was issued. The
  old unconfigured key remains and has not been revoked.
  The existing Test Store product remains test-only. The owner-approved real
  offer is a free download with `com.zarifahmed.cut.pro.monthly` at \$4.99/month,
  no trial, Family Sharing off, United States only initially, and manual
  release. RevenueCat production Apple app `app8feee0dfba` is created for the
  exact bundle, its subscription key is valid, and product `prod66e8dc0083`
  maps to `CUT_OS_PRO` (`entl8efd6d2c18`) and active default offering
  `ofrngeb5cc4a73c` (`CUT OS Pro`), which has one `$rc_monthly` package. Store
  status `MISSING_METADATA` and no transactions remain Apple metadata, review-
  screenshot, and TestFlight gates rather than a mapping failure. The Test Store
  sibling is excluded from production claims. A public iOS SDK key is
  provisioned without recording its value. Apple approved App Store Connect API
  access and the owner-authorized minimum App Manager key for RevenueCat sync
  was generated outside the repository. RevenueCat now shows **Valid
  credentials** for it and the required In-App Purchase key configuration;
  public-iOS-key/EAS wiring and exact-build native QA remain pending.
  **Transfer to new App User ID** is persisted with controlled non-secret
  dashboard evidence; Decision 3 owner authorization is confirmed, while
  exact-build restore-after-deletion QA remains required.
- TestFlight group `CUT OS Internal QA` is configured with automatic
  distribution off, the authorized public feedback email, the exact beta
  description, the Account Holder as its one internal tester, and exact builds
  3 and 4. Build 4 is the current candidate. The
  subscription's credential-free
  Review Notes are saved, but version attachment and its review screenshot are
  pending; no TestFlight QA or submission is claimed.

## RUNNING QUEUE

1. Keep PR #9 draft and require exact GitHub CI success after every new commit;
   never rely on a green run from an older revision and never self-merge.
2. Keep Replit on exact deployed commit
   `08e62232db7f81047eec5b55a184f30fb7d4162a`, verify that the Publishing draft
   still says Reserved VM after every sync, and recheck that development-data
   copy remains off before every future publish.
3. Keep the live active Apple membership, Paid Apps, banking, tax, and
   app/subscription evidence current.
4. Preserve the passing bounded RevenueCat live preflight, both Apple **Valid
   credentials** results, and customer read/write evidence. Place the app REST
   ID and provisioned public iOS SDK key only in their approved server/EAS
   destinations. Keep server-notification delivery and exact-build purchase/
   restore as separate open gates.
5. Preserve the passing Replit status/readiness and replacement-Clerk proxy
   checks and direct production TLS attestation. Do not exercise the in-place-
   only PITR control without a separately approved destructive recovery plan.
   Complete exact-build Clerk/RevenueCat acceptance only when its remaining
   prerequisites can pass.
6. Preserve the green same-session refresh repair and exact build 4 identity,
   then complete physical-iPhone
   authentication, recovery, purchase, restore, deletion, accessibility, and
   screenshot evidence before App Review.

## EAS SIGNING EVIDENCE

- The production Apple distribution certificate and provisioning profile for
  `com.zarifahmed.cut` are active in EAS through August 8, 2027.
- The read-only verification was performed without logging in to Apple again;
  no push-notification key, local credentials file, or additional capability
  was created.
- Exact EAS production build 4 is processed in App Store Connect, assigned to
  internal TestFlight, and selected for version 1.0.0. It contains the
  session-refresh repair and is the current exact candidate. Build 3 and every
  pre-Clerk-cutover binary remain ineligible.

## LOCKED SAFETY BOUNDARIES

- Audience is adults age 18 and older under `adult-18-v1`.
- Bundle ID is `com.zarifahmed.cut`.
- The approved v1 subscription identifier is
  `com.zarifahmed.cut.pro.monthly`; runtime fails closed and accepts only one
  $4.99 U.S. `P1M`, no-introductory-offer product mapped to `CUT_OS_PRO`.
  The exact App Store Connect product and U.S. price are saved; first-version
  attachment, review screenshot, and exact-build evidence remain pending. The
  RevenueCat App Store Connect API sync credential is directly validated in
  RevenueCat. Credential-free Review Notes are
  saved. If the offer changes,
  update and reverify the owner decision, source, configuration, and tests before
  any signed build.
- Local StoreKit/RevenueCat state never grants paid access without the
  server-authoritative entitlement.
- Exactly one always-on API machine is required until rate limiting and deletion
  scheduling are moved to shared infrastructure.
- Ask before recurring, usage-metered, or paid service actions.
- Do not put passwords, verification codes, tax/banking data, or provider
  secrets in source, logs, screenshots, handoffs, or chat.
- Agent-authored pull requests are never self-merged.

## OWNER-CONTROLLED GATES

- Replit approval phrase: **Approve Replit up to $20/month before tax**.
- Qualified-review approval: **up to $3,000 combined before tax**, with a
  strong target of **$1,000 or less**, for qualified U.S. technology/privacy
  counsel and a qualified registered dietitian reviewer.
- Final public seller-display verification and qualified-counsel review of the
  individual seller path.
- Copyright holder/year and final product-name clearance. Standard EULA,
  Fitness and Health app/subscription tax categories, DSA non-trader/no-EU
  status, and the no-third-party-content declaration are owner-approved and
  saved.
- Qualified legal/privacy and nutrition/allergen review.
- Reviewer response state and non-binding scheduling boundaries are tracked in
  `legal-site/PROFESSIONAL_REVIEW_OUTREACH.md`; no quote or engagement is yet
  accepted.
- App Review submission and manual public release.

## PERSISTENT REFERENCE

- Repository: `github.com/ahmedzarif-ops/cut`.
- Package manager: pnpm `10.34.5`.
- Core verification: `pnpm run codegen:check`, `pnpm run typecheck`,
  `pnpm run test`, and `pnpm run validate:app-store`.
- Release validation intentionally remains fail-closed until owner, provider,
  exact-build, legal, screenshot, and App Store Connect evidence is complete.
- App Store submission truth: `app-store/app-store-submission.json` and
  `APP_STORE_READINESS.md`.
- Current owner decisions: `OWNER_LAUNCH_DECISIONS.md`.
- Authentication gate: `artifacts/cut-os/AUTH_SECURITY_PRELAUNCH.md`.
