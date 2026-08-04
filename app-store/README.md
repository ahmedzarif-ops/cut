# App Store submission artifacts

This directory turns the human release records into machine-checkable working
artifacts. It does not approve a submission or replace App Store Connect,
owner, legal, nutrition, privacy, or native QA review.

- `app-store-submission.json` contains the focused listing, provisional
  full age-questionnaire answer set, exact current privacy-manifest and
  required-reason API mappings, unresolved commercial/legal fields, structured
  App Review accounts, subscription, accessibility, initial-territory,
  regulated-medical-device, authentication-security, closed listing schema,
  listing-review evidence, Apple commerce readiness, and approval gates.
- `testflight-submission.json` records the copy-ready beta description and test
  scope, internal-only versus external-review state, exact build evidence, and
  attributable approvals. Internal testing does not silently satisfy external
  TestFlight App Review requirements.
- `icon-manifest.json` binds the configured 1024px opaque PNG and its SHA-256;
  brand and exact-build approval remain separate release gates.
- `app-store-connect-territories.json` is the current 175-storefront public
  snapshot used to validate the repository's two-letter territory translation
  codes. Those codes (for example, `GB`) are App Store URL/storefront codes, not
  the App Store Connect API's canonical three-letter `Territory.id` values.
- `screenshots/manifest.json` contains the ordered capture plan and technical,
  build, locale, device, SHA-256, evidence, and personal-data review fields.
- `screenshots/files/` is intentionally empty until images are captured from
  the exact submitted native build. Capture PNG only: JPEG is intentionally
  rejected so the release gate can validate PNG structure, checksums,
  decompression, dimensions, and transparency without relying on a
  platform-specific JPEG decoder.

The catalog is a translation and input-sanity aid, not a submission gate. Before
release, an authorized App Store Connect user must confirm that the owner-approved
selected territories—United States only for v1—were saved, with UTC and
controlled evidence in the availability record. A full 175-storefront API
reconciliation may refresh this snapshot later, but it cannot block a release
that does not select those storefronts. Never infer or add a launch territory.

Run the working-record checks during development:

```sh
pnpm run validate:app-store
```

Run the release check only after the owner-controlled values, approvals,
production privacy evidence, exact-build TestFlight/App Review/subscription/
listing-claims evidence, and the selected real screenshots are complete.
Accessibility Nutrition Label exact-build evidence is required only if CUT
later publishes labels; physical-device accessibility QA remains required:

```sh
pnpm run validate:app-store:release
```

The gate derives the 40-character lowercase `BUILD_SHA` from the committed
TestFlight exact-build record; it accepts no command-line Git ref. The clean
target must be either the direct `app_review` evidence child of `BUILD_SHA` or
the direct `public_release` transition child of that fully revalidated App
Review commit. Each may contain only the verifier's target-specific operation-,
mode-, and semantic-constrained evidence. The integrated release command also
verifies pre-BUILD_SHA target-specific `DRAFT` manifests, adjacent manifest
checksums, manifest-bound regular PNG captures, unchanged target records, exact
release/build/API/legal identity, the BUILD_SHA-derived database migration, and
byte-identical pinned EAS routing. Record each evidence SHA and result outside
its finalized manifest.

CI runs this release gate in a dedicated job that checks out the exact event
head with full history; the ordinary pull-request merge checkout is not valid
evidence. It binds a pull request to fetched `origin/main` or a push to its
nonzero `before` SHA. Before `BUILD_SHA`, create both target drafts and bring the
candidate up to date with `main`. Pass exact-head CI on
`APP_REVIEW_EVIDENCE_SHA`, non-force fast-forward `main` to that exact SHA, wait
for push CI, confirm the remote SHA, and rerun validation/probes before
submission. Freeze `main` there throughout review. After approval, create
`PUBLIC_RELEASE_EVIDENCE_SHA` directly on A and repeat the exact-head CI,
non-force fast-forward, push CI, remote-SHA, and fresh-validator sequence before
release. GitHub merge, squash, rebase-and-merge, merge-queue, force-push, amend,
an unrelated intervening commit, or any SHA rewrite requires a new signed
candidate.

The exact submitted build is one canonical identity: app version, Apple build
number, full Git commit, EAS build ID, and App Store Connect build ID. Copy that
same identity into the TestFlight record, App Review record, screenshot capture
defaults, listing exact-build claims review, subscription evidence, and
accessibility evidence only when labels are evaluated for publication. The
initial voluntary omission carries no accessibility-label build identity or
App Store Connect evidence. Release validation rejects any required missing
field or mismatch.

Other fail-closed bindings are deliberate:

- listing metadata accepts only its exact reviewed key set. Public metadata URLs
  reject normalization, credentials, IP literals, single-label names, and the
  validator's reserved/non-public suffixes. Production Privacy, Terms, and
  Support values must
  exactly match the URLs compiled into the app, and validation errors never
  print either URL;
- public submission requires evidence-backed name clearance, exact-name
  acceptance in App Store Connect, owner/legal/nutrition review, and exact-build
  listing-claims review;
- the exact committed Privacy and Terms URLs must be assigned to an
  Apple-accepted metadata path. Description placement is literal-string checked,
  each recorded submitted URL must equal its committed listing value, and Terms
  placement is constrained by the selected standard-versus-custom license
  agreement. Confirmed/release records require attributable UTC and evidence that
  the exact placements were saved in App Store Connect;
- Apple Developer Program membership, Account Holder access, Paid Apps
  Agreement, tax forms, and banking must each be confirmed with UTC and a
  controlled non-secret evidence reference. Do not store financial values or
  credentials;
- for `app_review`, each review account must have a successful production
  sign-in within the preceding 24 hours, be non-expiring for the review window,
  and have no user MFA or out-of-band delivery trap. That target requires Clerk
  production test mode enabled only for the review window, Client Trust still
  enabled, all five accounts attested as reserved `+clerk_test` addresses, and
  exact-build proof that fixed code `424242` completes a new-device challenge.
  Its `shutdownControl` freezes distinct primary/backup owners, proof both have
  production Clerk access, exact-submission status monitoring and escalation,
  a 15-minute SLO, and fresh preflight evidence while its closure fields remain
  null; the separate `public_release` target requires test mode disabled and
  Client Trust still enabled while retaining the account records and shutdown
  plan as historical App Review evidence. Only its trigger, disablement, and
  distinct closure-evidence fields may then advance. The target-bound Apple
  workflow must progress from the same Ready-for-Review submission in
  **Drafts** to that submission in **Completed**, with every item accepted, no
  active review, manual release selected, and the app in Pending Developer
  Release;
- final App Review Notes are attested with the credential-free template hash,
  resolved UTF-8 byte count, zero remaining placeholders, measurement time,
  save state, and a controlled evidence reference. Never store a hash or copy of
  the credential-bearing resolved notes in the repository;
- a screenshot PII approval is valid only for the exact screenshot SHA-256 it
  reviewed, and the uploaded subscription-review image must be the approved
  bytes for shot `07-subscription-offer`. That same offer shot is required in
  the public listing story, whose review cue states clearly that paid access uses
  an auto-renewable Apple subscription;
- subscription evidence records the effective U.S. USD price, owner-decision
  revision/reference, any introductory-offer terms, and exact App Store Connect
  upload evidence. It separately requires direct RevenueCat-dashboard evidence
  that both the App Store Connect API key and Apple in-app purchase/subscription
  key are configured, and that the server key has customer read/write permission
  required for account deletion. The public v2 `GET app` response is not treated
  as credential proof; the bounded customer-list `GET` proves read access only
  and the release process never issues a test deletion.
  Dashboard evidence must be paired with purchase, StoreKit-offer, and TestFlight
  QA bound to the exact submitted build; and
- Accessibility Nutrition Labels are currently voluntary. The initial release
  explicitly records that they are not reported and rejects any contradictory
  feature, exact-build, or App Store Connect evidence. If CUT later publishes a
  supported feature, it must list every canonical common task in order on the
  exact build; Captions and Audio Descriptions are the only no-media exceptions.
- App Store Server Notifications are optional and do not block initial release.
  If configured, the production URL must be the full RevenueCat URL with saved
  evidence; the sandbox URL may be omitted so Apple routes sandbox notifications
  to production, or it must exactly match the production URL.

The release check is expected to fail today. It rejects unresolved fields,
unconfirmed listing review or Apple commerce readiness, commercial/legal, App
Review, subscription, TestFlight, required accessibility QA, age, or privacy state; missing
or hash-mismatched screenshots; unapproved personal-data reviews; non-PNG files;
unsupported dimensions; PNG alpha; pending
authentication recovery or production-tenant evidence; stale app-config
mappings; or App Review Notes over 4,000 UTF-8 bytes. Never weaken it just to
make a submission pass.
