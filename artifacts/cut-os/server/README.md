# CUT OS public server and legal-page gate

The zero-dependency server owns the production CUT launch surface and three
zero-JavaScript routes:

- `/privacy`
- `/terms`
- `/support`

The server requires an owner-configured `PUBLIC_APP_ORIGIN`, for example
`https://preview.cutos.app`. It must be an HTTPS origin on a public DNS name
with no path, port, credentials, query, or fragment. The server never builds
canonical URLs or preview deep links from `Host`, `X-Forwarded-Host`, or
`X-Forwarded-Proto`; missing or invalid configuration fails startup.
When publication is approved, each rendered legal page must contain exactly one
canonical URL equal to `${PUBLIC_APP_ORIGIN}${BASE_PATH}/privacy`, `/terms`, or
`/support` for its route. A second host, alternate path spelling, or duplicate
canonical link blocks startup.

The executable deployment entry point always starts in production mode: `/` is
a no-JavaScript CUT launch page. Expo Go manifests, bundles, and static preview
assets return `404`, including requests that try to select an Expo platform
through headers. Tests and local tooling must opt into the legacy Expo preview
explicitly. In explicit preview mode only, that legacy page uses a
nonce-authorized inline script and the pinned QR dependency. The production
launch page has no script or QR dependency.

The longer review packet in the repository's `legal-site/` folder is a working
source for owner and professional review. The templates here are the deployable
surface. Publication approval must cover the **exact rendered contents of these
templates**, not only the longer packet or an earlier version.

## Safe default

`LEGAL_SITE_PUBLICATION_STATUS` defaults to `draft`. In draft mode:

- legal routes return HTTP `503`, not `200`;
- every page displays a prominent draft banner;
- HTML and response headers instruct search engines not to index it;
- responses use `no-store` caching; and
- the templates retain explicit placeholders and blocker markers.

The CUT launch page remains available but carries a response-level `noindex`
directive while legal publication is still draft. `BASE_PATH` is applied to
the launch-page links and legal routes. Expo manifests and static files retain
their normal behavior only in the non-production development preview.

## Validation

From `artifacts/cut-os`:

```sh
pnpm run validate:legal-site
pnpm run validate:legal-site:release
pnpm run validate:legal-site:live
```

The first command verifies the legacy draft-source safety markers and
zero-JavaScript boundary. The current launch source uses the release command,
which requires an authorized publication path while the runtime remains
fail-closed unless `LEGAL_SITE_PUBLICATION_STATUS=approved`. The live command
uses the configured production URLs and fails unless the exact approved pages
and stylesheet are publicly served.
The EAS pre-install hook always validates release configuration; production also
runs both approved-source and live-site checks, while development and preview do
not require approved legal pages.

The server itself repeats the important release checks. If
`LEGAL_SITE_PUBLICATION_STATUS=approved` is set while a placeholder, draft
marker, `noindex`, missing publication disposition, incomplete/non-binding wording, or
canonical URL that differs from the runtime origin/base path remains, server
creation fails instead of exposing a draft or misbound policy as `200`.

`templates/legal-publication-approval.json` is a second, independent release
gate. It starts in `draft` and records no approval. For an approved release it
must record:

- either a qualified-counsel approval or the exact August 10, 2026 owner-risk
  acceptance that defers professional review for no more than three calendar
  days after public release;
- the exact app name and normalized `BASE_PATH` used to render the pages; and
- a SHA-256 hash for the rendered `/privacy`, `/terms`, `/support`, and
  `/legal.css` responses.

Approved startup recomputes all four hashes. Any edit to approved page copy or
styles, or any app-name/base-path change, blocks startup until the rendering is
reviewed under the selected publication path and a new approval is recorded.
Changing only the HTML publication attributes is not sufficient. The evidence
itself should remain in the owner's controlled legal records; the repository
stores only its reference.

## Approval sequence

1. Decide the legal operator, monitored support contact, public HTTPS domain,
   launch jurisdictions, retention schedule, and support process.
2. Reconcile the final binary and production vendors against the Privacy draft.
3. Record either qualified review or an explicit owner-risk acceptance. The
   August 10 owner decision requires review initiation within three calendar
   days after public release and stop-sales action if the deadline is missed or
   a critical issue is identified.
4. Resolve every public statement against current implementation and vendor
   evidence. Never represent owner acceptance as professional approval.
5. Remove each draft banner and blocker, replace `noindex` with the approved
   indexing position, set the body attributes to
   `data-publication-status="approved"` and the exact selected approval-path
   attributes, and add exactly one canonical URL to each template using the final
   `PUBLIC_APP_ORIGIN`, normalized `BASE_PATH`, and route.
6. Render the three deployable templates with the final app name and base path.
   Bind the exact rendered pages and stylesheet to the selected approval record.
7. Record the approval path, timestamp, evidence reference, rendering inputs, and
   exact SHA-256 values in `legal-publication-approval.json`. Do not carry hashes
   forward after any content or rendering change.
8. Run the release validator, route tests, full mobile tests, and live URL checks.
9. Only then set `LEGAL_SITE_PUBLICATION_STATUS=approved` in the deployment and
   configure the app's three `EXPO_PUBLIC_*` legal/support URLs.

This material supports engineering and launch review; it is not legal advice.
Requirements change, so qualified counsel should verify the final policies
against current authoritative sources and the production service.
