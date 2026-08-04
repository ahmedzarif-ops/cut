# CUT OS — iOS release runbook

**Status:** Engineering-ready checklist; Apple, Expo, production-service, and
public-policy setup still require the owner.

Use this checklist only as the iOS portion of
`RELEASE_OPERATIONS_RUNBOOK.md`. Open and populate a unique copy of
`RELEASE_EVIDENCE_MANIFEST_TEMPLATE.md` before staging or production work; the
manifest must tie the EAS build and Apple build number to the exact Git commit,
API deployment, database migration, legal hashes, smoke results, and approvals.

## Release configuration contract

The production EAS environment must contain all of these client-visible values:

| Variable                             | Required value                                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_DOMAIN`                 | Public API hostname only, such as `api.example.com`; no scheme, path, credentials, query, or fragment |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`  | Production Clerk publishable key beginning with `pk_live_`                                            |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | RevenueCat public Apple-platform SDK key; never a secret or Test Store production key                 |
| `EXPO_PUBLIC_REVENUECAT_PRODUCT_ID`  | Exact owner-approved App Store product ID; must match the committed subscription release record       |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL`     | Owner/counsel-approved public HTTPS Privacy Policy                                                    |
| `EXPO_PUBLIC_TERMS_URL`              | Owner/counsel-approved public HTTPS Terms of Use                                                      |
| `EXPO_PUBLIC_SUPPORT_URL`            | Functional public HTTPS support page with real contact information                                    |
| `EXPO_PUBLIC_CLERK_PROXY_URL`        | Required canonical same-origin route: `https://<EXPO_PUBLIC_DOMAIN>/api/__clerk`                      |

Every `EXPO_PUBLIC_*` value is embedded in the app and must be treated as
public. Never place `CLERK_SECRET_KEY`, `DATABASE_URL`, Apple credentials, or
any other server secret in an `EXPO_PUBLIC_*` variable. The API deployment
separately requires `REVENUECAT_SECRET_API_KEY`, `REVENUECAT_PROJECT_ID`,
`REVENUECAT_ENTITLEMENT_REST_ID`, and `REVENUECAT_APP_REST_ID`. The secret is a
least-privilege RevenueCat REST API v2 key with customer read/write plus
entitlement and app read access. All four are server-only and
must not be placed in EAS public variables, client source, logs, or support
material. The three resource IDs must be copied from RevenueCat rather than
derived from dashboard URLs or the public `CUT_OS_PRO` lookup key.

Any preview or Test Store build that sets a RevenueCat iOS SDK key must also
set the exact product ID for that offering. Production API startup verifies the
official v2 app, entitlement, and attached-product shapes: the only active
attached subscription must be `com.zarifahmed.cut.pro.monthly` for the exact
iOS app, with RevenueCat duration `P1M` and no trial duration. The documented
read response does not expose App Store Connect API-key or Apple subscription-
key configuration, so those two settings remain a separate dashboard-evidence
gate below. Semantic, authentication, and missing-resource failures stop startup.
Transient provider timeouts, network failures, rate limits, and 5xx responses
produce a sanitized degraded warning so account/deletion APIs remain
available; subscription authorization continues to fail closed.

The app fails closed when its API hostname or Clerk publishable key is missing
or malformed. Production EAS builds also stop before dependency installation if
any required public resource is missing, the Clerk key is not live, the API is
not public, or the required Clerk proxy is not the exact same-origin server
route. The production pre-install hook also requires the locally approved legal
source and the live same-origin Privacy, Terms, Support, and stylesheet bytes to
match the recorded counsel-approval hashes. Development and preview builds skip
those two approved-publication checks.

## One-time owner setup

1. Activate the Apple Developer Program membership and complete the required
   App Store Connect agreements, tax, and banking setup.
2. Create the CUT OS app record using bundle ID `com.zarifahmed.cut`.
3. Link `artifacts/cut-os` to the intended Expo/EAS project. Review the project
   ID change before committing it.
4. In App Store Connect, complete the Paid Apps Agreement/tax/banking, create
   the owner-approved subscription group/product, and keep the first
   subscription attached to the app-version submission.
5. Create the RevenueCat project/iOS app for the exact bundle ID, connect both
   the App Store Connect API key and Apple in-app purchase/subscription key, map
   products to `CUT_OS_PRO`, create the current offering, and
   configure Apple Server Notifications v2 with the full dashboard-issued
   RevenueCat URL in both the sandbox and production App Store Connect fields.
6. Create all eight production EAS variables above and the four server-only
   RevenueCat v2 values (`REVENUECAT_SECRET_API_KEY`,
   `REVENUECAT_PROJECT_ID`, `REVENUECAT_ENTITLEMENT_REST_ID`, and
   `REVENUECAT_APP_REST_ID`) in the API deployment.
7. Publish and manually open the Privacy, Terms, and Support pages on a device.
8. Verify the production API, Clerk tenant, and RevenueCat project are the exact
   service set intended for App Review.

## RevenueCat Apple credential and exact-build gate

The production API preflight proves the documented app/bundle, entitlement,
product, monthly duration, no-trial state, and exact associations. It cannot
prove Apple credential configuration because RevenueCat's documented `GET app`
response does not return those flags. Before the production build, an authorized
operator must inspect the exact RevenueCat iOS app and update
`app-store/app-store-submission.json` with all of the following non-secret
evidence:

| Evidence field                                        | Required release value                                                                   |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `subscription.revenueCat.productionMappingStatus`     | `verified` for the exact production app, `CUT_OS_PRO`, and monthly product               |
| `subscription.revenueCat.appStoreConnectApiKeyStatus` | `verified` by direct RevenueCat-dashboard inspection                                     |
| `subscription.revenueCat.subscriptionKeyStatus`       | `verified` for the Apple in-app purchase/subscription key by direct dashboard inspection |
| `subscription.revenueCat.verifiedAtUtc`               | UTC time of that dashboard inspection                                                    |
| `subscription.revenueCat.evidenceReference`           | Controlled reference to the sanitized dashboard evidence; never key material             |

Dashboard evidence alone does not prove the binary. The same release record must
also bind `storeKitOfferStatus`, `purchaseQaStatus`, and `testFlightStatus` as
verified to the exact submitted app version, build number, Git commit, EAS build
ID, and App Store Connect build ID. Missing dashboard evidence, a changed key,
or any exact-build purchase/restore failure blocks promotion. Never save a key
ID, issuer, private-key contents, API-key contents, screenshot containing key
material, or raw provider response in the repository.

## Clerk production proxy activation gate

The committed proxy route is necessary but is not evidence that Clerk is using
it. Clerk's current
[Frontend API proxy guide](https://clerk.com/docs/guides/dashboard/dns-domains/proxy-fapi)
says proxying is production-only, the proxy must be deployed before it is
enabled, and the production domain must then be configured with the exact proxy
URL. Promotion fails closed until all of the following non-secret fields are
recorded in the release evidence:

| Evidence field                        | Required release value                                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Clerk production instance             | Provider alias only                                                                                                      |
| Clerk production domain               | Domain alias and non-secret Clerk domain ID                                                                              |
| Exact enabled proxy URL               | `https://<EXPO_PUBLIC_DOMAIN>/api/__clerk`                                                                               |
| API proxy deployment                  | Deployment ID, candidate Git SHA, and UTC deployment time                                                                |
| Unique public ingress path            | Provider proof that no direct origin or shorter route can bypass the audited edge                                        |
| Edge trust topology                   | Exactly one trusted proxy hop and the deployed Express `trust proxy = 1` configuration                                   |
| Edge forwarding semantics             | Proof the edge overwrites or appends exactly one edge-owned rightmost `X-Forwarded-For` and `X-Forwarded-Host` candidate |
| Adversarial forwarding checks         | `PASS`: valid spoofed leftmost IP/allowlisted host cannot win; missing or empty XFF is omitted and health fails closed   |
| Clerk dashboard validation            | Exact URL enabled in the production instance, `PASS`, UTC, and controlled reference                                      |
| Public proxy-health probe             | `PASS`, UTC, command/output reference, and verifier Git SHA                                                              |
| Production physical-device auth check | `PASS`, exact mobile build, UTC, and sanitized QA reference                                                              |

Never record the Clerk secret key, response body, echoed client IP, session
cookie, tester identity, or raw provider logs. The domain ID is a routing
identifier, not a credential; keep it with the other non-secret provider
identifiers in the controlled release record.

Activation order is fixed:

1. Before deploying, prove from the provider control plane that every public
   request must traverse the one audited edge hop. Disable or restrict direct
   origin addressing, alternate ingress hostnames, provider preview URLs, and
   any shorter route that can reach the API without that edge. A successful
   direct-origin probe or an unverified alternate path blocks release.
2. Prove the edge either overwrites untrusted `X-Forwarded-For` and
   `X-Forwarded-Host` input or appends exactly one edge-owned value at the
   rightmost position. The application trusts only that rightmost candidate.
   Run the committed regression checks showing that a syntactically valid
   spoofed leftmost IP and an allowlisted spoofed leftmost host cannot win, and
   that absent or empty XFF is omitted upstream. Record pass/fail and a
   controlled evidence reference, never the tested addresses or raw headers.
3. Deploy the candidate API so `/api/__clerk/*` forwards bodies and headers to
   Clerk and sets `Clerk-Proxy-Url`, the server-only `Clerk-Secret-Key`, and the
   one Express-selected edge-forwarded client IP in `X-Forwarded-For`. Confirm
   the deployed application has `trust proxy = 1`; any other value blocks
   release.
4. In the **production** Clerk instance, open **Domains → Frontend API → Set
   proxy configuration**, enter the exact canonical proxy URL above, and wait
   for Clerk's validation to pass. Do not enable a development instance, a
   staging hostname, or a URL with a trailing slash, subpath, query, or
   fragment.
5. From the repository root, run the read-only probe through the deployed CUT
   proxy, replacing only the public host and non-secret Clerk domain ID:

   ```sh
   pnpm run verify:deploy -- \
     https://<EXPO_PUBLIC_DOMAIN>/api/__clerk \
     clerk-proxy-health \
     --clerk-domain-id <CLERK_DOMAIN_ID>
   ```

   This calls Clerk's documented `/v1/proxy-health` endpoint, requires HTTP
   200 JSON with `status: healthy` and an acknowledged forwarded client IP,
   caps the response at 16 KiB and the request at 10 seconds by default, follows
   no redirects, and never prints the body or IP. A trailing slash, query
   string, or fragment on the supplied proxy URL is rejected. Clerk documents
   the health endpoint in
   its [Frontend API reference](https://clerk.com/docs/reference/frontend-api/2025-11-10/description/introduction#get-v1-proxy-health).

6. Record the committed negative regression result that an absent or empty XFF
   produces no upstream `X-Forwarded-For`. Because Clerk then cannot acknowledge
   a forwarded client IP, the verifier's `clerk-proxy-health` evaluation must
   fail. Never manufacture an XFF value to make this gate pass.
7. Reopen the production Clerk Domains page and confirm the same exact URL is
   still enabled. Then sign in, refresh a session, sign out, and recover an
   account on an authorized physical-device release build.

The dashboard and proxy-health evidence must pass before the production EAS
build. The physical-device check occurs on the resulting internal TestFlight
build and must pass before external testing or App Review. Any missing field,
dashboard mismatch, reachable origin bypass, unproven forwarding semantics,
unhealthy probe, missing forwarded-IP acknowledgement, redirect, timeout,
oversized response, or device-auth failure stops promotion. Changing the proxy
URL, API deployment, Clerk domain, edge topology, ingress reachability, or
candidate Git SHA invalidates the evidence and requires the gate again.

## Preflight

From the repository root, run the normal automated gates, then validate the
production EAS environment without copying values into a committed file:

```sh
pnpm run codegen:check
pnpm run typecheck
pnpm run test
pnpm run validate:app-store
(
  cd artifacts/cut-os
  pnpm exec eas env:exec production \
    'pnpm run eas-build-pre-install'
)
```

The validator reports variable names and reasons only; it never prints values.
Stop if any gate fails.

## Build and TestFlight

### No-signing native compile rehearsal

Before Apple Developer Program enrollment is available, the `ios-simulator`
profile can compile the native iOS project in EAS without an Apple signing
credential:

```sh
(
  cd artifacts/cut-os
  pnpm exec eas build --platform ios --profile ios-simulator
)
```

This profile extends the production-like preview build, sets
`ios.simulator: true`, and uses the same pinned Xcode image as production. It
is a compile rehearsal only: it cannot be submitted to App Store Connect,
cannot prove StoreKit behavior, and does not replace the signed production
archive, physical-iPhone QA, Apple Sandbox, or TestFlight. Confirm the active
Expo plan and remaining included build quota before starting it; obtain owner
approval first if the job could incur a charge or consume paid quota.

### Pre-build deterministic App Store routing lock

Complete the App Store routing setup before creating the signed archive. The
binary and its submit route must come from one clean, exact Git commit; pinning
the route after the build would make the archive commit differ from the submit
configuration commit.

Only after the owner has created the App Store Connect app for bundle ID
`com.zarifahmed.cut`:

1. In **App Information → General Information**, copy the app's numeric
   **Apple ID**. This is the App Store Connect app ID, not the bundle ID, Apple
   Team ID, SKU, or an Apple account email.
2. Set that exact value as a JSON string at
   `submit.production.ios.ascAppId` in `artifacts/cut-os/eas.json`. Do not commit
   a placeholder or guessed value. Expo documents `ascAppId` as the App Store
   Connect unique application Apple ID number in its
   [EAS JSON reference](https://docs.expo.dev/eas/json/#eas-submit).
3. Run this fail-closed local check from the repository root:

   ```sh
   node ops/scripts/eas-submit-config-verify.mjs
   ```

4. Match the numeric ID to the intended app in App Store Connect, obtain the
   required review of the change, and commit it. Do not record Apple
   credentials or API-key contents.
5. Require an empty `git status --porcelain`, then record the full Git SHA,
   app alias/bundle ID, numeric App Store app ID cross-check, verifier result,
   and approver in the draft release evidence. That full lowercase SHA is
   `BUILD_SHA`: the immutable source, routing, signed-build, and EAS-upload
   commit.

Do not change any tracked file between this lock, the build, and the EAS upload.
Any change in that interval creates a different candidate: commit it, repeat
the routing and production preflights, and build a new archive. The narrowly
allowlisted post-upload evidence commit described below is the only later
exception, and it cannot change the binary or its routing.

### Signed production build

Check out the exact `BUILD_SHA` recorded above and confirm the work tree is still
clean. From `artifacts/cut-os`:

```sh
pnpm exec eas build --platform ios --profile production
```

The repository pins Node 24.14.0, pnpm 10.34.5, and EAS CLI 21.4.0; every EAS
profile inherits those versions. The production profile is also pinned to the
Expo SDK 54-compatible Xcode 26 image.
Confirm the build log names `macos-sequoia-15.6-xcode-26.0`, shows the release
configuration and legal-publication preflights passing, and contains no secret
values.

The configured `@clerk/expo` native plugin raises the application deployment
target to iOS 17, which the linked Clerk iOS SDK requires. Confirm the generated
archive reports a minimum iOS version of 17.0; do not remove the plugin or lower
the target without replacing or downgrading the native Clerk dependency and
re-running the complete native release gate. CUT OS does not currently offer
Sign in with Apple, so the plugin is intentionally configured with
`appleSignIn: false` and must not add that entitlement.

Before uploading the archive to App Store Connect:

1. Inspect the generated archive's `Info.plist`: arbitrary network loads must
   be disabled and `ITSAppUsesNonExemptEncryption` must be false only while the
   final binary still uses exempt system encryption exclusively.
2. Generate the archive privacy report. Reconcile every embedded SDK and the
   bundled `PrivacyInfo.xcprivacy` against `PRIVACY_DATA_MAP.md` and App Store
   Connect.

### Deterministic EAS upload from `BUILD_SHA`

Upload the binary before collecting the App Store Connect build ID, TestFlight
results, and screenshots that the full release validator requires. This is an
upload to App Store Connect only; it is not Submit for App Review, approval for
external testing, or public release.

Immediately before upload, check out `BUILD_SHA`, require an empty
`git status --porcelain`, confirm `git rev-parse HEAD` equals the recorded
`BUILD_SHA`, and run `node ops/scripts/eas-submit-config-verify.mjs` again. Stop
and rebuild from a new exact commit if any check fails.

1. Put the literal signed production EAS build ID into the release manifest's
   copy of the command below, replacing the angle-bracket token. The owner must
   authorize that fully expanded command and exact build ID. Then run the same
   expanded command verbatim from `artifacts/cut-os`:

   ```sh
   pnpm exec eas submit \
     --platform ios \
     --profile production \
     --id <EXACT_AUTHORIZED_EAS_BUILD_ID> \
     --non-interactive \
     --wait
   ```

   The angle-bracket token is documentation syntax and must never be passed to
   EAS. The owner-approved Expo and Apple submission credentials must already be
   configured through EAS's credential flow. If non-interactive submission
   reports missing authentication or asks for input, stop; do not fall back to
   an interactive release upload.

2. Record `BUILD_SHA`, the exact EAS build ID, numeric App Store app ID
   cross-check, fully expanded authorized command, authorization, and upload
   result. The SHA must be identical across the routing verifier, signed build,
   and EAS upload evidence.

The explicit `--id` prevents a newer build from winning a `--latest` race;
`--profile production` binds the pinned `ascAppId`; and `--non-interactive`
prevents an operator from silently supplying missing routing data. These flags
are documented in Expo's current
[EAS CLI reference](https://docs.expo.dev/eas/cli/#eas-buildsubmit). Do not use a
bare `eas submit`, `--latest`, `--auto-submit`, or an interactive prompt for a
release. EAS Submit uploads the chosen binary to App Store Connect; it does not
authorize App Review submission or public release, which remain separate owner
decisions.

### Post-upload evidence commit and App Review gate

After App Store Connect finishes processing the uploaded build, assign only the
owner-approved internal TestFlight group. Exercise the exact-build adults-only,
account-deletion, authentication, poor-network, relaunch, shared-device,
purchase/restore, and accessibility matrices; capture and PII-review the final
screenshots; save the subscription review screenshot; and record the App Store
Connect build ID, saved age questionnaire/18+ override, saved Accessibility
Nutrition Label decision, pricing, review-account, metadata, and approval
evidence.

Do not change runtime source, `eas.json`, app configuration, dependencies,
lockfiles, migrations, workflows, verifier scripts, release procedures, or the
shared QA/App Review templates. The only mutable evidence files are the four
existing App Store JSON records named in the verifier, one existing
`release-evidence/*.md` manifest, its newly added adjacent `.sha256`, and newly
added PNGs referenced exactly by the screenshot manifest. The evidence commit
may modify the existing JSON/manifest files but may not add, delete, rename, or
change their modes. A captured PNG must be a new committed `100644` regular file
directly inside `app-store/screenshots/files`; symlinks and out-of-tree files
are prohibited. Record exact-build QA results in the per-release manifest or
controlled external references without editing the shared test procedures.

Finalize the one per-release manifest, compute its adjacent checksum, and commit
all allowed evidence together as the single direct child of `BUILD_SHA`. That
commit is `POST_BUILD_EVIDENCE_SHA`; record its SHA outside the manifest because
a commit cannot contain its own identity. Require a clean tree, then run the
integrated release command from that exact checkout:

```sh
pnpm run validate:app-store:release
```

This App Store release gate accepts only manifest target `app_review` or
`public_release`. It rejects `staging` and `internal_testflight`, even if the
rest of the evidence is complete, so a staging-only upload N/A decision cannot
satisfy an App Store release. Use `pnpm run verify:post-build-evidence` for a
non-App-Store boundary check.

GitHub's dedicated **Release evidence boundary** job checks the exact pull
request head commit rather than GitHub's synthetic pull-request merge commit.
Once the App Store submission record is approved, that job runs the complete
release validator and must pass on `POST_BUILD_EVIDENCE_SHA`.

Preserve the signed Git identities when integrating the release. If the branch
needs to catch up with `main`, rebase it **before** establishing and signing
`BUILD_SHA`. After the signed build exists, do not squash, create a merge
commit, use a rebase-merge operation, amend, or otherwise rewrite either
`BUILD_SHA` or `POST_BUILD_EVIDENCE_SHA`. Integrate the exact two commits into
`main` by fast-forward only, then require the push-to-`main` evidence job to
pass. If the repository cannot preserve those exact objects, create a new
candidate, repeat the preflights, and sign and upload a new build.

The integrated command first validates the App Store release records and also
requires `POST_BUILD_EVIDENCE_SHA` to have exactly one parent equal to
`BUILD_SHA`. It rejects an empty diff, any non-allowlisted operation, any
non-regular or executable evidence file, a screenshot not exactly referenced by
the manifest, a missing/mismatched release-manifest checksum, and any difference
between the `eas.json` blobs at the two commits. It also requires
`cli.requireCommit: true`, derives `BUILD_SHA` from the committed TestFlight
exact-build record, and requires a pinned numeric `ascAppId`. No Git ref or SHA
is accepted from the command line. If it fails, do not weaken the allowlist; any
runtime/configuration change requires a new build and upload.

Record `POST_BUILD_EVIDENCE_SHA` and the passing result in the external release
handoff. The owner may then separately authorize Submit for App Review. This
full gate is intentionally post-upload and post-capture; do not add it to EAS
pre-install or move it before the deterministic upload, where the required App
Store Connect/TestFlight facts do not yet exist.

## Release ownership boundary

Engineering may prepare and validate builds. Only the owner approves Apple
credentials, public policies, App Privacy answers, export-compliance answers,
the 18+ rating override, subscriptions, App Review submission, and public
release. Qualified counsel/privacy and health/nutrition reviewers retain the
approval gates recorded in `APP_STORE_READINESS.md`.
