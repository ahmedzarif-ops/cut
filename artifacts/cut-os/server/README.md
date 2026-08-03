# CUT OS public server and legal-page gate

The existing zero-dependency server continues to serve the Expo landing page,
manifests, and static build. It also owns three zero-JavaScript routes:

- `/privacy`
- `/terms`
- `/support`

The longer review packet in the repository's `legal-site/` folder is a working
source for owner and counsel review. The templates here are the deployable
surface. Counsel approval must cover the **exact rendered contents of these
templates**, not only the longer packet or an earlier draft.

## Safe default

`LEGAL_SITE_PUBLICATION_STATUS` defaults to `draft`. In draft mode:

- legal routes return HTTP `503`, not `200`;
- every page displays a prominent draft banner;
- HTML and response headers instruct search engines not to index it;
- responses use `no-store` caching; and
- the templates retain explicit placeholders and blocker markers.

The landing page, Expo manifests, and static files preserve their normal route
behavior. `BASE_PATH` is applied to the legal routes and links in the same way
as the Expo routes.

## Validation

From `artifacts/cut-os`:

```sh
pnpm run validate:legal-site
pnpm run validate:legal-site:release
```

The first command verifies the draft safety markers and zero-JavaScript
boundary. It should pass. The release command should fail until all owner and
counsel work is complete.

The server itself repeats the important release checks. If
`LEGAL_SITE_PUBLICATION_STATUS=approved` is set while a placeholder, draft
marker, `noindex`, unapproved counsel flag, incomplete/non-binding wording, or
missing public canonical URL remains, server creation fails instead of exposing
a draft policy as `200`.

`templates/legal-publication-approval.json` is a second, independent release
gate. It starts in `draft` and records no approval. For an approved release it
must record:

- the qualified counsel approver, an ISO-8601 approval time, and a durable
  reference to the written approval evidence;
- the exact app name and normalized `BASE_PATH` used to render the pages; and
- a SHA-256 hash for the rendered `/privacy`, `/terms`, `/support`, and
  `/legal.css` responses.

Approved startup recomputes all four hashes. Any edit to approved page copy or
styles, or any app-name/base-path change, blocks startup until counsel reviews
the new rendering and a new approval is recorded. Changing only the HTML
`data-counsel-approved` attribute is not sufficient. The approval evidence
itself should remain in the owner's controlled legal records; the repository
stores only its reference.

## Approval sequence

1. Decide the legal operator, monitored support contact, public HTTPS domain,
   launch jurisdictions, retention schedule, and support process.
2. Reconcile the final binary and production vendors against the Privacy draft.
3. Obtain qualified nutrition review where required and qualified legal review
   of the adults-only, nutrition, privacy, subscription, and deletion positions.
4. Have qualified counsel draft or approve the complete policies. Do not fill an
   unknown placeholder with a guess.
5. Remove each draft banner and blocker, replace `noindex` with the approved
   indexing position, set the body attributes to
   `data-publication-status="approved"` and `data-counsel-approved="true"`, and
   add the correct public HTTPS canonical URL to each template.
6. Render the three deployable templates with the final app name and base path.
   Have counsel approve those exact rendered pages and stylesheet in writing.
7. Record the approver, timestamp, evidence reference, rendering inputs, and
   exact SHA-256 values in `legal-publication-approval.json`. Do not carry hashes
   forward after any content or rendering change.
8. Run the release validator, route tests, full mobile tests, and live URL checks.
9. Only then set `LEGAL_SITE_PUBLICATION_STATUS=approved` in the deployment and
   configure the app's three `EXPO_PUBLIC_*` legal/support URLs.

This material supports engineering and launch review; it is not legal advice.
Requirements change, so qualified counsel should verify the final policies
against current authoritative sources and the production service.
