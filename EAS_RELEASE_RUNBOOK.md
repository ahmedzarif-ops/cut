# CUT OS — iOS release runbook

**Status:** Engineering-ready checklist; Apple, Expo, production-service, and
public-policy setup still require the owner.

Use this checklist only as the iOS portion of
`RELEASE_OPERATIONS_RUNBOOK.md`. Before App Store staging or production work,
open distinct `app_review` and `public_release` draft copies of
`RELEASE_EVIDENCE_MANIFEST_TEMPLATE.md`. Reserve the same release ID and explicit
targets first; bind both to the exact build, EAS and Apple IDs, combined
application deployment identity, and BUILD_SHA-derived database migration after
those values exist. Target-specific smoke and closure evidence may be refreshed
at finalization.

## Release configuration contract

The production EAS environment must contain all of these client-visible values:

| Variable                             | Required value                                                                                           |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_DOMAIN`                 | Canonical lowercase public app/API hostname only; no scheme, path, port, credentials, query, or fragment |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`  | Production Clerk publishable key beginning with `pk_live_`                                               |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | RevenueCat public Apple-platform SDK key; never a secret or Test Store production key                    |
| `EXPO_PUBLIC_REVENUECAT_PRODUCT_ID`  | Exact owner-approved App Store product ID; must match the committed subscription release record          |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL`     | Exactly `https://<EXPO_PUBLIC_DOMAIN>/privacy` and `listing.privacyPolicyUrl`                            |
| `EXPO_PUBLIC_TERMS_URL`              | Exactly `https://<EXPO_PUBLIC_DOMAIN>/terms` and `listing.termsUrl`                                      |
| `EXPO_PUBLIC_SUPPORT_URL`            | Exactly `https://<EXPO_PUBLIC_DOMAIN>/support` and `listing.supportUrl`                                  |
| `EXPO_PUBLIC_CLERK_PROXY_URL`        | Required canonical same-origin route: `https://<EXPO_PUBLIC_DOMAIN>/api/__clerk`                         |

Every `EXPO_PUBLIC_*` value is embedded in the app and must be treated as
public. The three legal/support URLs and the Clerk proxy must share the exact
lowercase `EXPO_PUBLIC_DOMAIN`; alternate hosts, path spellings, trailing
slashes, queries, and fragments block a production build. Never place
`CLERK_SECRET_KEY`, `DATABASE_URL`, Apple credentials, or any other server secret
in an `EXPO_PUBLIC_*` variable. The combined application deployment
separately requires `REVENUECAT_SECRET_API_KEY`, `REVENUECAT_PROJECT_ID`,
`REVENUECAT_ENTITLEMENT_REST_ID`, `REVENUECAT_APP_REST_ID`, and
`REVENUECAT_OFFERING_REST_ID`. The secret is a least-privilege RevenueCat REST
API v2 key with customer read/write plus app, entitlement, offering, package,
and product read access. All five are server-only and
must not be placed in EAS public variables, client source, logs, or support
material. The four resource IDs must be copied from RevenueCat rather than
derived from dashboard URLs or public lookup keys.

Any preview or Test Store build that sets a RevenueCat iOS SDK key must also
set the exact product ID for that offering. Production API startup verifies the
official v2 app, entitlement, attached-product, expanded offering, and bounded
customer-list shapes. It requires exactly one matching active, no-trial target
product for the exact iOS app and store identifier
`com.zarifahmed.cut.pro.monthly`; unrelated products for other apps or store
identifiers may legitimately share the entitlement or package. RevenueCat may
report the target duration as either `null` or `P1M`, so the exact monthly
period remains separately proven by App Store Connect evidence. The exact
configured offering must be active and current, with exactly one target-product
association in its package; unrelated associations do not invalidate that
target mapping. The documented read response does not expose App Store Connect
API-key, Apple subscription-key configuration, or customer write/delete access,
so those settings remain a separate dashboard-evidence gate below. The customer
permission preflight performs only `GET /projects/{project_id}/customers?limit=1`
to prove read access; it never follows pagination or probes `DELETE`. Semantic,
authentication, and missing-resource failures stop startup.
Transient provider timeouts, network failures, rate limits, and 5xx responses
produce a sanitized degraded warning so account/deletion APIs remain
available; subscription authorization continues to fail closed.

The app fails closed when its API hostname or Clerk publishable key is missing
or malformed. Production EAS builds also stop before dependency installation if
any required public resource is missing, the Clerk key is not live, the API is
not public, or the required Clerk proxy is not the exact same-origin server
route. The build validator reads the full committed App Store release record and
requires the compiled Privacy, Terms, and Support URLs to exactly match its
listing values; surrounding whitespace, control characters, credentials, local
hosts, IP literals, and reserved internal hosts are rejected without printing
the URL values. The production pre-install hook also requires the locally
approved legal source and the live same-origin Privacy, Terms, Support, and
stylesheet bytes to match the recorded counsel-approval hashes. Development and
preview builds skip those approved-publication checks.

## One-time owner setup

1. Activate the Apple Developer Program membership and complete the required
   App Store Connect agreements, tax, and banking setup. Record only confirmed
   status, verification UTC, and a controlled non-secret evidence reference for
   each `appleCommerceReadiness` gate.
2. Create the CUT OS app record using bundle ID `com.zarifahmed.cut`.
3. Link `artifacts/cut-os` to the intended Expo/EAS project. Review the project
   ID change before committing it.
4. In App Store Connect, complete the Paid Apps Agreement/tax/banking, create
   the owner-approved subscription group/product, and keep the first
   subscription attached to the app-version submission.
5. Create the RevenueCat project/iOS app for the exact bundle ID, upload the
   required Apple in-app purchase/subscription key, manually verify the exact
   product mapping to `CUT_OS_PRO`, create the current offering, and
   set **Project settings → General → Restore behavior** to **Transfer to new
   App User ID** (including the sandbox override if one is enabled). Historical
   state: the optional RevenueCat App Store Connect API sync credential was
   initially omitted after Apple's internal-use-only attestation. Superseding
   current state: after explicit owner authorization, the minimum App Manager
   key exists and is active on Apple's side. The intermediate machine state was
   `pending` until RevenueCat directly confirmed it. Current direct RevenueCat
   evidence shows **Valid credentials**, so
   `subscription.revenueCat.appStoreConnectApiKeyStatus` is `verified`. Any
   replacement, rejection, or configuration change must reset it to `pending`
   until direct RevenueCat validation passes again. Do not create another key to
   bypass a failed validation. This optional credential does not replace the required
   valid Apple in-app purchase/subscription key, exact manual mapping,
   customer-deletion permission, restore behavior, or exact-build native QA.
   App Store Server Notifications are intentionally omitted for the initial
   release. If
   configured later, use RevenueCat's full dashboard-issued production URL;
   Apple's sandbox field may remain empty and route sandbox notifications to
   the production URL.
6. Create all eight production EAS variables above and the five server-only
   RevenueCat v2 values (`REVENUECAT_SECRET_API_KEY`,
   `REVENUECAT_PROJECT_ID`, `REVENUECAT_ENTITLEMENT_REST_ID`,
   `REVENUECAT_APP_REST_ID`, and `REVENUECAT_OFFERING_REST_ID`) in the API
   deployment.
7. Publish and manually open the Privacy, Terms, and Support pages on a device.
8. Verify the production API, Clerk tenant, and RevenueCat project are the exact
   service set intended for App Review.

## RevenueCat permission, Apple credentials, and exact-build gate

The production API preflight proves the documented app/bundle, entitlement,
product, monthly duration, no-trial state, exact active current offering, sole
package mapping, exact associations, and customer-read access. It cannot prove
customer write/delete access or the required Apple in-app purchase credential
configuration because the
bounded customer `GET` and documented `GET app` response do not expose those
capabilities. Before the production build, an authorized operator must inspect
the exact RevenueCat project and iOS app and record the production mapping,
the valid in-app purchase/subscription key, the exact current disposition of the
optional App Store Connect API sync credential, customer read/write permission,
restore behavior, shared verification UTC, and controlled evidence reference
below. The current optional-credential result is `verified`; any credential or
configuration change resets it fail-closed to `pending` until direct RevenueCat
validation succeeds again.
The three `nativeQa*` fields can be completed only after the signed build reaches
internal TestFlight; record them after that continuous exact-build test and
before App Review or release promotion.

| Evidence field                                                                   | Required release value                                                                                                                                            |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `subscription.revenueCat.productionMappingStatus`                                | `verified` for the exact production app, `CUT_OS_PRO`, and monthly product                                                                                        |
| `subscription.revenueCat.appStoreConnectApiKeyStatus`                            | Current value `verified`, supported by direct RevenueCat **Valid credentials** evidence. Use `pending` after any replacement or configuration change until RevenueCat directly validates it again. `intentionally_omitted_apple_internal_use_only` is historical-only. |
| `subscription.revenueCat.subscriptionKeyStatus`                                  | `verified` for the Apple in-app purchase/subscription key by direct dashboard inspection                                                                          |
| `subscription.revenueCat.customerReadWritePermissionStatus`                      | `verified` only by direct dashboard inspection that the server key has customer read/write access required to delete a customer; never by issuing a test deletion |
| `subscription.revenueCat.restoreAfterAccountDeletion.dashboardBehavior`          | `transfer_to_new_app_user_id`, verified in the exact production project under Project settings → General                                                          |
| `subscription.revenueCat.restoreAfterAccountDeletion.dashboardVerifiedAtUtc`     | UTC time of the restore-behavior inspection                                                                                                                       |
| `subscription.revenueCat.restoreAfterAccountDeletion.dashboardEvidenceReference` | Controlled reference to sanitized restore-behavior evidence                                                                                                       |
| `subscription.revenueCat.restoreAfterAccountDeletion.nativeQaStatus`             | `verified` only after the exact-build purchase → delete → replacement account → Restore transfer test passes                                                      |
| `subscription.revenueCat.restoreAfterAccountDeletion.nativeQaTestedAtUtc`        | UTC time of that continuous exact-build test                                                                                                                      |
| `subscription.revenueCat.restoreAfterAccountDeletion.nativeQaEvidenceReference`  | Controlled reference proving B unlocks through server confirmation and A loses access                                                                             |
| `subscription.revenueCat.verifiedAtUtc`                                          | UTC time of that dashboard inspection                                                                                                                             |
| `subscription.revenueCat.evidenceReference`                                      | Controlled reference to the sanitized dashboard evidence; never key material                                                                                      |

Current catalog evidence has one `$rc_monthly` package in active default
offering `ofrngeb5cc4a73c` (`CUT OS Pro`). Apple product `prod66e8dc0083`, exact
identifier `com.zarifahmed.cut.pro.monthly`, is associated with entitlement
`CUT_OS_PRO` (`entl8efd6d2c18`) and that offering. Store status
`MISSING_METADATA` and no transactions remain Apple metadata, subscription
review-screenshot, and TestFlight gates; they are not a mapping failure. Never
use the Test Store sibling as production evidence.

Dashboard evidence alone does not prove the binary. After internal TestFlight
upload, the same release record must also bind `storeKitOfferStatus`,
`purchaseQaStatus`, and `testFlightStatus` as verified to the exact submitted
app version, build number, Git commit, EAS build ID, and App Store Connect build
ID. Missing required dashboard evidence, a changed required key, or any exact-build
purchase/restore failure blocks promotion. The shared
`verifiedAtUtc` and `evidenceReference` must bind the customer permission and
required in-app purchase credential inspection to sanitized dashboard evidence.
The optional sync credential's pending or verified state is not purchase,
mapping, deletion, restore, or native-QA evidence. Never save a key
ID, issuer, private-key contents, API-key contents, screenshot containing key
material, or raw provider response in the repository.

The account-deletion restore acceptance test is mandatory because Apple billing
continues after CUT deletes an account. On the same controlled Apple Sandbox
account: purchase as CUT account A; delete A to terminal completion; create CUT
account B; verify B is initially locked; Restore as B; wait for CUT's server to
confirm `CUT_OS_PRO`; verify B's paid endpoint succeeds; and verify A's old
internal App User ID has lost both RevenueCat and CUT server access. Record the
exact TestFlight build and sanitized evidence in `PURCHASE_QA_REPORT.md`. Do not
infer the dashboard setting from a successful purchase, and do not infer the QA
result from the dashboard setting. RevenueCat documents that **Transfer to new
App User ID** applies to both restores and purchases and leaves only the new ID
with access: [Restore Behavior](https://www.revenuecat.com/docs/projects/restore-behavior).

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
`ios.simulator: true`, and pins
`macos-tahoe-26.4-xcode-26.4`, exactly matching the production image. The
targeted native release-configuration suite currently verifies this parity and
the `CutDeclaredAgeRange` module contract with 15/15 passing tests. It is a
compile and local-runtime rehearsal only: it cannot be submitted to App Store Connect,
cannot prove StoreKit behavior, and does not replace the signed production
archive, physical-iPhone Declared Age Range entitlement/API validation, Apple
Sandbox, or TestFlight. Confirm the active
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
the routing and production preflights, and build a new archive. The two
narrowly allowlisted evidence commits described below are the only later
exceptions, and neither can change the binary or its routing. Create distinct
draft `app_review` and `public_release` manifests before establishing
`BUILD_SHA`; a missing draft after signing requires a new candidate.

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
3. Scan the exact expanded signed app package for server secrets, release
   credentials, and server-only variable names. The scanner accepts a directory,
   not a compressed `.ipa`, and fails closed on symlinks or special files. On
   the Mac that downloaded the exact authorized IPA, replace the placeholder
   with its local path and run:

   ```sh
   CUT_SIGNED_IPA_PATH="/absolute/path/to/exact-signed.ipa"
   (
     set -eu
     : "${CUT_SIGNED_IPA_PATH:?Set CUT_SIGNED_IPA_PATH to the exact signed IPA}"
     test -f "$CUT_SIGNED_IPA_PATH"

     CUT_IPA_SCAN_DIRECTORY="$(mktemp -d)"
     cleanup_ipa_scan() {
       scan_status=$?
       trap - EXIT
       rm -rf -- "${CUT_IPA_SCAN_DIRECTORY:?}" || true
       exit "$scan_status"
     }
     trap cleanup_ipa_scan EXIT
     trap 'exit 129' HUP
     trap 'exit 130' INT
     trap 'exit 143' TERM

     ditto -x -k "$CUT_SIGNED_IPA_PATH" "$CUT_IPA_SCAN_DIRECTORY"
     node ops/scripts/secret-boundary-scan.mjs archive "$CUT_IPA_SCAN_DIRECTORY"
   )
   ```

   Record only the exact build identity, scanner Git SHA, UTC, and pass/fail.
   Never attach scanner input or a matched value to release evidence. A finding
   requires revocation/rotation, configuration correction, and a new signed
   build; deleting bytes from the expanded copy is not remediation. The trap
   removes the expanded temporary copy on both success and failure. CI applies
   the same archive rule to its production-configured Expo export.

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

### Post-upload App Review evidence and public-release transition

After App Store Connect finishes processing the uploaded build, assign only the
owner-approved internal TestFlight group. Exercise the exact-build adults-only,
account-deletion, authentication, poor-network, relaunch, shared-device,
purchase/restore, and accessibility matrices; capture and PII-review the final
screenshots; save the subscription review screenshot; and record the App Store
Connect build ID, saved age questionnaire/18+ override, pricing,
review-account, metadata, and approval evidence. The initial voluntary
Accessibility Nutrition Label omission records only the approved omission
decision and must not claim an App Store Connect save or exact-build label
evidence. If labels are published later, add that saved exact-build evidence.

For the `app_review` target, apply the owner/security-approved Clerk access
window only after the exact internal TestFlight build exists: enable production
test mode, retain Client Trust, and prove the reserved-account `424242`
new-device challenge on that build. Stop on any mismatch.

Before finalizing App Review evidence, use App Store Connect to select that
exact processed build, choose **Manually release this version**, and save every
required metadata, privacy, age, accessibility, and App Review field. With
recorded owner authorization, use **Add for Review** on the app version to
create or select one submission in **Drafts**. On the first subscription, choose
**Add for Review**, select that existing draft, and add the unapproved
subscription group in the submission modal. Verify the exact three items and
**Ready for Review** state; do not use **Submit for Review** yet. Record only
controlled non-secret confirmations in the repository evidence.

Do not change runtime source, `eas.json`, app configuration, dependencies,
lockfiles, migrations, workflows, verifier scripts, release procedures, or the
shared QA/App Review templates. For the first evidence commit, the only mutable
evidence files are the four existing App Store JSON records named in the
verifier, the pre-created App Review `release-evidence/*.md` manifest, its newly
added adjacent `.sha256`, and newly added PNGs referenced exactly by the
screenshot manifest. The pre-created public-release draft must remain
byte-identical. Evidence files may not be deleted, renamed, or change modes. A
captured PNG must be a new committed `100644` regular file directly inside
`app-store/screenshots/files`; symlinks and out-of-tree files are prohibited.
Record exact-build QA results in the target manifest or controlled external
references without editing the shared test procedures.

Finalize the App Review manifest with target `app_review`, compute its adjacent
checksum, and commit all allowed evidence together as the single direct child
of `BUILD_SHA`. That commit is `APP_REVIEW_EVIDENCE_SHA`; record its SHA outside
the manifest because a commit cannot contain its own identity. Require a clean
tree, then run the integrated release command from that exact checkout:

```sh
pnpm run validate:app-store:release
```

The authoritative target at this commit is `app_review`. The gate rejects
`staging` and `internal_testflight`, even if the rest of the evidence is
complete, so a staging-only upload N/A decision cannot satisfy an App Store
release. Use `pnpm run verify:post-build-evidence` for a non-App-Store boundary
check. Record the passing result; only then may the owner separately authorize
Submit for App Review.

Keep the temporary test mode under authentication and reserved-account
monitoring. The release lead owns the exact App Store Connect submission-status
watch and the security owner is backup. Disable test mode immediately, and no
later than 15 minutes, when the exact submission leaves its authorized
waiting/in-review states, including Accepted, Pending Developer Release,
Rejected, Unresolved Issues, Invalid Binary, withdrawal, removal, or
abandonment, or on unexpected reserved-account activity. A rejection or
resubmission requires a new signed candidate and newly authorized window.
Before finalizing `app_review`, freeze those distinct owners in
`appReview.clerkReviewAccess.shutdownControl`; prove both have production Clerk
access; set the status source to `exact_app_store_connect_submission`; enable
monitoring and escalation; retain `closureSloMinutes: 15`; record a fresh access
preflight UTC/evidence reference; and keep `triggerObservedAtUtc`,
`testModeDisabledAtUtc`, and `shutdownEvidenceReference` null.

After Apple approves the version, no review session remains active, and its
status is **Pending Developer Release**, keep Client Trust enabled. Preserve the
five account attestations as historical App Review evidence. In
`app-store/app-store-submission.json`, advance only root `updated`; Clerk
`testModeState`, `verifiedAtUtc`, and `evidenceReference`; shutdown
`triggerObservedAtUtc`, `testModeDisabledAtUtc`, and
`shutdownEvidenceReference`; and Apple `state`, `appVersionStatus`,
`submissionSection`, `allSubmittedItemsAccepted`, `verifiedAtUtc`, and
`evidenceReference`. Preserve every other submission field. The shutdown trigger
must follow App Review evidence finalization, disablement must follow within 15
minutes and precede public finalization, and closure evidence must differ from
the access preflight. Finalize the distinct pre-created
manifest with target `public_release`, the same release ID and exact TestFlight
identity, and add its adjacent checksum. Commit only those changes as the
single direct child of `APP_REVIEW_EVIDENCE_SHA`; that commit is
`PUBLIC_RELEASE_EVIDENCE_SHA`. It may not modify the App Review
manifest/checksum, TestFlight record, screenshots, territory record, runtime,
configuration, workflow, verifier, or procedure. From its clean checkout, run
the same integrated release command and record the result. Manual public
release remains a separate owner decision. A third evidence commit is
prohibited.

GitHub's dedicated **Release evidence boundary** job checks the exact event head
and uses full history. For pull requests it binds the reported `main` base to
fetched `origin/main`; for pushes it binds the nonzero `before` SHA. App Review
requires that baseline to be an ancestor of `BUILD_SHA`; public release requires
the baseline to equal `APP_REVIEW_EVIDENCE_SHA`. The job rejects replacement
refs, missing objects, forced history, and a non-`main` destination.

Before signing, fetch `main`, prove its tip is an ancestor of the candidate,
record it externally, and verify branch protection permits an owner-approved
exact-SHA non-force fast-forward with **Release evidence boundary** required.
If protection blocks it, stop; only the owner may authorize a narrowly scoped
temporary bypass, which must be restored after landing. A merge-button
workaround is prohibited. Rebase only before `BUILD_SHA`. Pass exact-head pull-request CI on
`APP_REVIEW_EVIDENCE_SHA`, fast-forward `main` to that exact SHA without
`--force`, wait for push-to-`main` CI, prove remote `main` equals it, and rerun
the validator/probes before **Submit for Review**. Do not use GitHub merge,
squash, rebase-and-merge, or merge-queue actions.

Freeze `main` at the App Review evidence SHA throughout review; any unrelated
advance requires stopping, disabling test mode, and starting a new candidate.
After approval, create the public-release commit directly on that SHA, pass its
exact-head pull-request CI, fast-forward `main` from exact A to exact P, wait for
push-to-`main` CI, prove remote `main` equals P, and rerun validator/probes before
**Release This Version**. A force push, amend, intervening commit, or rewritten
SHA requires a new signed candidate.

The integrated command validates the App Store release records and exact
ancestry. It fully revalidates the App Review evidence parent before accepting
a public-release transition. It rejects an empty diff, any non-allowlisted
operation, non-regular or executable evidence, an unbound screenshot, a
missing/mismatched manifest checksum, a changed release ID/build identity, a
modified prior target record, and any difference in pinned EAS routing. It also
requires `cli.requireCommit: true`, derives `BUILD_SHA` from the committed
TestFlight exact-build record, and requires a pinned numeric `ascAppId`. No Git
ref or SHA is accepted from the command line. If it fails, do not weaken the
allowlist; any runtime/configuration change requires a new build and upload.

This full gate is intentionally post-upload and post-capture; do not add it to
EAS pre-install or move it before the deterministic upload, where the required
App Store Connect/TestFlight facts do not yet exist.

## Release ownership boundary

Engineering may prepare and validate builds. Only the owner approves Apple
credentials, public policies, App Privacy answers, export-compliance answers,
the 18+ rating override, subscriptions, App Review submission, and public
release. Qualified counsel/privacy and health/nutrition reviewers retain the
approval gates recorded in `APP_STORE_READINESS.md`.
