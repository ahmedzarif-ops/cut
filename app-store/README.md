# App Store submission artifacts

This directory turns the human release records into machine-checkable working
artifacts. It does not approve a submission or replace App Store Connect,
owner, legal, nutrition, privacy, or native QA review.

- `app-store-submission.json` contains the focused listing, provisional
  age-questionnaire answers, exact current privacy-manifest mapping, safe v1
  defaults, unresolved initial territories, the conditional regional
  regulated-medical-device declaration, the authentication-security prelaunch
  gate, and explicit unresolved owner fields.
- `app-store-connect-territories.json` is the current 175-storefront public
  snapshot used to validate the repository's two-letter territory translation
  codes. Those codes (for example, `GB`) are App Store URL/storefront codes, not
  the App Store Connect API's canonical three-letter `Territory.id` values.
- `screenshots/manifest.json` contains the ordered capture plan and technical,
  build, locale, device, evidence, and personal-data review fields.
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
production privacy evidence, and real screenshots are complete:

```sh
pnpm run validate:app-store:release
```

The release check is expected to fail today. It rejects unresolved fields,
unconfirmed age/privacy answers, missing screenshots, unapproved personal-data
reviews, non-PNG files, unsupported dimensions, PNG alpha, a territory catalog
that has not been reconciled against App Store Connect, an authentication
recovery architecture or production-tenant evidence that remains pending, and
stale app-config or manifest mappings. Never weaken it just to make a submission
pass.
