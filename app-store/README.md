# App Store submission artifacts

This directory turns the human release records into machine-checkable working
artifacts. It does not approve a submission or replace App Store Connect,
owner, legal, nutrition, privacy, or native QA review.

- `app-store-submission.json` contains the focused listing, provisional
  full age-questionnaire answer set, exact current privacy-manifest and
  required-reason API mappings, unresolved commercial/legal fields, structured
  App Review accounts, subscription, accessibility, initial-territory,
  regulated-medical-device, authentication-security, and approval gates.
- `testflight-submission.json` records the copy-ready beta description and test
  scope, internal-only versus external-review state, exact build evidence, and
  attributable approvals. Internal testing does not silently satisfy external
  TestFlight App Review requirements.
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

Before each release, an authorized App Store Connect user must fetch the active
territories from Apple's read-only `GET /v1/territories?limit=200` endpoint,
reconcile every selected two-letter storefront code to its current three-letter
API ID, and update the catalog review fields with a UTC timestamp, reviewer, and
evidence reference. If Apple changes the active storefront count or membership,
refresh the sorted snapshot from Apple's live storefront selector first. Never
infer or add a launch territory during this review. Release validation remains
blocked while the catalog review is pending.

Run the working-record checks during development:

```sh
pnpm run validate:app-store
```

Run the release check only after the owner-controlled values, approvals,
production privacy evidence, exact-build TestFlight/App Review/subscription/
accessibility evidence, and real screenshots are complete:

```sh
pnpm run validate:app-store:release
```

The gate derives the 40-character lowercase `BUILD_SHA` from the committed
TestFlight exact-build record; it accepts no command-line Git ref. The current
clean commit must be its single direct child and may contain only the verifier's
operation- and mode-constrained evidence files. The integrated release command
also verifies the adjacent release-manifest checksum, manifest-bound regular
PNG captures, and byte-identical pinned EAS routing. Record the evidence commit
SHA and result outside the finalized manifest.

CI runs this release gate in a dedicated job that checks out the exact pull
request head with its parent; the ordinary pull-request merge checkout is not
valid evidence. Rebase onto the target branch before establishing `BUILD_SHA`.
After the signed build exists, preserve the exact
`BUILD_SHA -> POST_BUILD_EVIDENCE_SHA` commits and integrate them into `main` by
fast-forward only. Squash, merge-commit, rebase-merge, amend, or any other SHA
rewrite requires a new signed candidate.

The exact submitted build is one canonical identity: app version, Apple build
number, full Git commit, EAS build ID, and App Store Connect build ID. Copy that
same identity into the TestFlight record, App Review record, screenshot capture
defaults, subscription evidence, and accessibility evidence. Release validation
rejects any missing field or mismatch.

Other fail-closed bindings are deliberate:

- each review account must have a successful production sign-in within the
  preceding 24 hours, be non-expiring for the review window, and have no MFA or
  out-of-band challenge;
- final App Review Notes are attested with the credential-free template hash,
  resolved UTF-8 byte count, zero remaining placeholders, measurement time,
  save state, and a controlled evidence reference. Never store a hash or copy of
  the credential-bearing resolved notes in the repository;
- a screenshot PII approval is valid only for the exact screenshot SHA-256 it
  reviewed, and the uploaded subscription-review image must be the approved
  bytes for shot `07-subscription-offer`;
- subscription evidence records the effective U.S. USD price, owner-decision
  revision/reference, any introductory-offer terms, and exact App Store Connect
  upload evidence; and
- a supported accessibility feature must list every canonical common task in
  order on the exact build. Captions and Audio Descriptions are the only
  features that may be marked not applicable when the app contains no media;
  either release decision must also be confirmed as saved in App Store Connect
  with UTC, evidence reference, and approval.

The release check is expected to fail today. It rejects unresolved fields,
unconfirmed commercial/legal, App Review, subscription, TestFlight,
accessibility, age, or privacy state; missing or hash-mismatched screenshots;
unapproved personal-data reviews; non-PNG files; unsupported dimensions; PNG
alpha; an unreconciled territory catalog; pending authentication recovery or
production-tenant evidence; stale app-config mappings; or App Review Notes over
4,000 UTF-8 bytes. Never weaken it just to make a submission pass.
