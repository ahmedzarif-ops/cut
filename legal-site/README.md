# CUT OS legal/support site draft

This folder is a static review packet for CUT OS Privacy, Terms, and Support
pages. It is intentionally **not publishable**. The visible banners,
`noindex` metadata, placeholder tokens, and validator are safety gates, not
finished legal controls.

As of August 10, 2026, the owner has accepted the risk of launching before
qualified legal and nutrition review and will initiate both reviews within
three calendar days after public release. This longer folder remains the
post-launch professional-review packet. The exact owner-approved deployable
pages and publication gate are in `artifacts/cut-os/server/templates/`; no
professional approval is claimed.

Start qualified review with [`COUNSEL_REVIEW_PACKET.md`](COUNSEL_REVIEW_PACKET.md),
which consolidates the exact launch facts, open compliance decisions,
publication placeholders, requested deliverables, and supporting evidence.
Track the approved budget, reviewer outreach, and quote controls in
[`PROFESSIONAL_REVIEW_OUTREACH.md`](PROFESSIONAL_REVIEW_OUTREACH.md).

The content is grounded in the repository's current engineering records,
especially `PRIVACY_DATA_MAP.md`, `ADR_002_ACCOUNT_DELETION.md`,
`ADR_003_ADULT_ELIGIBILITY.md`, `ADR_004_SUBSCRIPTIONS.md`, and
`APP_STORE_METADATA.md`. It does not establish that the production app or its
vendors behave as drafted.

This longer packet is not the final publication-approval target. The exact
deployable pages live in `artifacts/cut-os/server/templates/`. After this packet
is reconciled into those templates, counsel must review the final rendered
pages and stylesheet. Their exact SHA-256 values and rendering inputs are then
recorded in
`artifacts/cut-os/server/templates/legal-publication-approval.json`; the server
refuses approved mode if any approved byte or rendering input changes.

## Preview and check the draft

Open `index.html` directly in a browser, or serve this directory with any local
static-file server. Do not deploy it to a public host.

Run the structural draft check from the repository root:

```sh
node legal-site/validate.mjs --draft
```

The draft check should pass while reporting unresolved placeholders. The
release gate should fail:

```sh
node legal-site/validate.mjs --release
```

The validator checks structural publication gates. It does not verify legal
accuracy, accessibility conformance, live links, vendor behavior, or production
data flows.

## Required work before publication

1. Decide and insert the legal operator, approved public domain, monitored
   support route, and policy effective dates.
2. Approve the launch regions and have qualified counsel draft or approve the
   complete Terms and Privacy Policy. The repository currently records only a
   US working position; it does not resolve applicable laws.
3. Reconcile the final iOS archive, backend, Clerk, Apple, RevenueCat,
   production hosting/database provider, backups, logs, support tooling, crash
   reporting, and any analytics against the Privacy Policy and App Store privacy
   answers.
4. Approve exact retention and deletion rules for every system, especially
   backups, logs, Clerk records, RevenueCat records, support messages, and the
   deletion-coordination tombstone.
5. Obtain qualified nutrition and legal review of the meal catalog,
   calculations, labels, allergen language, claims, and warnings.
6. Approve the adults-only notice, self-declared age method, permanent
   per-identity decision, underage-attempt handling, later-new-account path, and
   customer-support process.
7. Replace every `{{PLACEHOLDER}}` in the HTML with approved content. Do not
   replace an unknown with a guess.
8. Remove the visible draft banners and `data-blocker` attributes; change each
   page to `data-publication-status="approved"` and
   `data-counsel-approved="true"` only after documented approval.
9. Replace `noindex` metadata with the approved indexing position and add a
   public HTTPS canonical URL to every page.
10. Reconcile the approved text into the deployable server templates, have
    counsel review those exact rendered responses, and record their hashes and
    approval evidence reference as described in the server README.
11. Run both legal release validators, inspect the pages on mobile and desktop,
    test every public link, and confirm the final URLs in the app's release
    configuration.

## App release URL mapping

After the pages are approved and hosted on one public HTTPS origin, configure:

| App setting                      | Intended page                           |
| -------------------------------- | --------------------------------------- |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL` | `privacy.html` or an approved clean URL |
| `EXPO_PUBLIC_TERMS_URL`          | `terms.html` or an approved clean URL   |
| `EXPO_PUBLIC_SUPPORT_URL`        | `support.html` or an approved clean URL |

The mobile app rejects missing, non-HTTPS, local, private, credential-bearing,
and malformed destinations. Validate the exact production URLs through the
existing mobile release checks before building.

## Legal limitation

This folder assists an engineering and launch review; it is not legal advice.
Privacy and platform requirements change. Qualified counsel should verify the
final documents against current authoritative sources, the selected launch
regions, and the production service before publication.
