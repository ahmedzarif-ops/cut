# CUT OS — production launch infrastructure evidence

**Verified:** August 8, 2026<br>
**Scope:** Non-secret live configuration evidence only<br>
**Release claim:** This evidence does not prove a signed build, TestFlight QA,
App Review submission, or public release.

## Apple signing

- EAS is bound to `@zee-digipit/cut` and bundle ID
  `com.zarifahmed.cut`.
- The production profile has an Apple Distribution certificate for team
  `6JP2ZDM4HC`, expiring August 8, 2027.
- The production profile has an active provisioning profile for the same team
  and bundle ID, expiring August 8, 2027.
- No push-notification key or additional App Store Connect key was created as
  part of the signing setup.

Certificate secrets and provisioning contents are intentionally excluded.

## Source and hosting

- The exact `codex/app-store-v1` code commit verified and deployed as the live
  build is `a83d5ea0ae4db5dc82884929fa9b4911314f4eae`.
- GitHub Actions run `31283711614` reports **Success** for both required checks
  on that code commit: **CI verify** and **Release evidence boundary**. A later
  evidence-only commit may move the branch and draft pull-request head without
  changing the deployed build.
- The current Replit Reserved VM deployment and log deployment ID is
  `02619bd1`.
- Replit's development-to-production data-copy control remained **off** after
  publish, critical-vulnerability publish blocking remained **on**, and the
  production database was connected.
- Post-publish bounded verification returned HTTP 200 for the exact `BUILD_SHA`
  at `https://getcutos.com/status`, production readiness at `/api/readyz`, the
  CSP-locked zero-JavaScript public root, and the canonical Clerk proxy.
- `/privacy`, `/terms`, and `/support` each remained HTTP 503, as required
  while qualified publication approval remains open.

This proves the bounded public identity, application-level health, and direct
client-side production TLS attestation of the current deployment. It does not
prove a restore drill.

## Production database transport and readiness

- Replit's current [production database documentation](https://docs.replit.com/references/data-and-storage/production-databases)
  and [database-upgrade documentation](https://docs.replit.com/references/data-and-storage/database-upgrade)
  distinguish the editor's development database from the deployment database:
  the current development database is local Helium and does not use SSL, while
  production databases run on Neon.
- A connect-only probe in the Replit editor reproduced the documented Helium
  behavior: the development endpoint rejects every forced SSL mode. That result
  is development evidence and is not evidence of a production TLS failure.
- Current deployed build `a83d5ea0ae4db5dc82884929fa9b4911314f4eae`
  contains the production database normalization, validation, startup-migration
  path, direct TLS attestation, and migration files for the current candidate.
- Its production entrypoint upgrades the one accepted provider URL shape from
  `sslmode=require` to `sslmode=verify-full`, rejects any non-verified final
  configuration, creates the pool from the normalized URL, completes startup
  migrations and exact-revision readiness, attests the live pool client's TLS
  socket, and only then binds the listener.
- At August 8, 2026, 6:29:33.13 PM America/Chicago, deployment `02619bd1`
  logged `production_database_tls_attestation` with status `PASS`. Its fixed,
  non-secret evidence booleans were `readOnlyTransaction`,
  `verificationEnabled`, `socketEncrypted`, `peerAuthorized`,
  `authorizationErrorAbsent`, `hostnameVerified`, and
  `sameSocketQueryPassed`, all `true`.
- Replit Production Database settings show point-in-time recovery **on** with a
  seven-day recovery window. A restore action is available but was not
  exercised, so no recovery drill is claimed.
- At `2026-08-08T23:56:34Z`, Replit's authenticated technical-support form
  confirmed receipt of a request asking whether a selected PITR timestamp can
  be restored into a new isolated database, what usage charges and secure
  cleanup would apply, and whether app code remains unchanged. The request
  explicitly forbids Replit from initiating a restore, database mutation, or
  account change.
- Replit Support answered at `2026-08-09T00:17:01Z`: production PITR is
  **in-place only**, has no self-service isolated restore target, does not
  modify application code, and cannot roll forward after a restore. The Core
  plan provides the observed seven-day history. This makes the available
  restore action a destructive production-data decision rather than a safe
  rehearsal control. It remains untouched; no charge or restore is claimed.

### Replit/Neon provider-proxy TLS incident and resolution

Deployment `02619bd1` initially failed its startup gate because the first
attestation implementation required PostgreSQL's server-side `pg_stat_ssl` view
to report TLS. Replit's production SQL console was placed in read-only mode and
used only for `SELECT pg_stat_ssl`; it returned `false` behind the Replit/Neon
provider proxy and remained read-only. No data or schema mutation occurred.

The corrected implementation does not use that server-side value as proof of
the separate client-to-provider socket. On one exact pool client it opens a
read-only transaction, runs `SELECT 1`, and requires the client configuration to
preserve certificate and hostname verification, the socket to be encrypted and
peer-authorized with no authorization error, and the socket SNI server name to
equal the configured DNS hostname. The successful sanitized startup event above
and the exact-build live probes close the direct production TLS gate.

Do not exercise the in-place restore without a separately approved destructive
production-data recovery plan. The still-pending recovery gate must not expose
the database host, credentials, certificate details, contents, or recovery
material.

## EAS production environment

The production environment contains these non-secret variable names:

- `EXPO_PUBLIC_DOMAIN`
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_CLERK_PROXY_URL`
- `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
- `EXPO_PUBLIC_REVENUECAT_PRODUCT_ID`

The public domain is configured as `getcutos.com`, and the mobile Clerk proxy
URL is configured on the same HTTPS origin at `/api/__clerk`. Values that act as
keys were transferred through authenticated dashboards and are not reproduced
in this evidence.

The following production variables remain intentionally absent until qualified
approval of the exact published pages:

- `EXPO_PUBLIC_PRIVACY_POLICY_URL`
- `EXPO_PUBLIC_TERMS_URL`
- `EXPO_PUBLIC_SUPPORT_URL`

## Clerk production configuration

- Production test mode is off.
- The production user count was zero at verification time; no development users
  were copied into production.
- Strict user-enumeration protection is enabled.
- Native API is enabled.
- The iOS registration uses Apple team prefix `6JP2ZDM4HC` and bundle ID
  `com.zarifahmed.cut`.
- `com.zarifahmed.cut://callback` is in the mobile SSO redirect allowlist.
- Clerk reports the existing provider-domain Frontend API proxy configuration
  as verified.
- Clerk rejected a dashboard attempt to replace the original Replit provider
  domain with `getcutos.com`, because provider-domain changes require a Clerk
  Platform API path that is not available to this workspace. No production
  instance, user, key, or session was deleted to work around that restriction.
- The bounded CUT proxy-health verifier returned HTTP 501 against the currently
  deployed older build. Full proxy verification therefore remains required
  after the exact release candidate is deployed; dashboard status alone is not
  treated as sufficient release evidence.

No Clerk secret key or complete publishable key is stored in this file.

### Superseding production and Clerk tenant cutover — August 8, 2026

The earlier source/hosting snapshot and provider-domain failure above are
retained as historical pre-cutover evidence. The original Clerk production
application was `app_3HR9j9X5zSEcx1Lmi91fHzKbl6K`, with production
instance `ins_3HSpGKg19feAwgu1B32qn9kxT3G` and provider-domain record
`dmn_3HSpGRIUbCgcpaG8tMmDtLXwl29`. That tenant had zero users, so no user or
session migration was required. It and its keys have not been claimed deleted,
revoked, or disabled; they remain available only as a bounded rollback path
until replacement-tenant QA is complete.

The current production tenant is a separate free-Hobby application created
without a card, trial, paid-plan change, or new billing action:

- application ID `app_3HeFFYD0GpUEjcPIlOwNYXAKUmo`;
- production instance ID `ins_3HeFLfOAbfStrVB4eW5b7sYOeAq`;
- primary domain `getcutos.com`;
- production domain ID `dmn_3HeFLeuWzWg9xKNeG4o6PUUVHlb`.

Its reviewed production configuration uses email and password sign-in with
required email-code verification; Strict user-enumeration protection; breached-
password and password-strength checks; lockout, Device Trust, and bot
protection; and Native API. Its iOS registration uses Apple team prefix
`6JP2ZDM4HC`, bundle ID `com.zarifahmed.cut`, and callback
`com.zarifahmed.cut://callback`. The exact same-origin proxy is
`https://getcutos.com/api/__clerk`, and Clerk reports that proxy configuration
as verified.

The replacement tenant's live keys were transferred only through authenticated,
masked Replit and EAS production controls. Replit's development-data-copy
control was rechecked **off** immediately before publishing. EAS production now
targets this tenant and the exact same-origin proxy without recording any key
material here.

Commit `a83d5ea0ae4db5dc82884929fa9b4911314f4eae` is the deployed source identity
for Replit deployment `02619bd1`. Bounded live checks passed for the exact
`/status` `BUILD_SHA`, `/`, `/api/readyz`, and the canonical Clerk proxy; the
proxy check matched production domain ID
`dmn_3HeFLeuWzWg9xKNeG4o6PUUVHlb`. Any binary created before this cutover is
ineligible for release. App Store Connect still has zero TestFlight builds, so
no signed-build authentication or physical-device claim is made.

### Bounded local iOS simulator rehearsal

A Release-configuration build was installed on a dedicated iOS 27 simulator
with no signed-in test user, using Xcode's **Sign to Run Locally** mode. A
credential-safe comparison confirmed that its bundle contains the exact current
EAS production Clerk publishable key; the value was not printed or recorded.
The app launched successfully into the real Clerk `Welcome back` UI, and no new
keychain error was observed during that launch at `2026-08-08T21:07:02Z`.
The supporting screenshot remains an intentionally non-durable local observation
at `/tmp/cut-release-baseline-after8s.png`, SHA-256
`7b28056a93debd9c946e5933ab82458d194a75ca37d171a335136fcad217a8fc`.
It was not copied into the repository and its contents are not reproduced here;
the path may disappear when temporary files are cleared.

This is local simulator evidence only. It is not an EAS-signed archive,
TestFlight build, physical-device result, password-recovery result, or App
Review evidence. Native Clerk recovery remains pending because
`clerk.getcutos.com` was NXDOMAIN during this rehearsal. That pre-publication
result is retained as historical evidence and is superseded by the DNS
verification below.

### Superseding Clerk DNS verification — `2026-08-08T21:21:47Z`

The owner-approved Replit DNS action published exactly these five public CNAME
records required by Clerk:

| Host                           | CNAME target                         |
| ------------------------------ | ------------------------------------ |
| `clerk.getcutos.com`           | `frontend-api.clerk.services.`       |
| `accounts.getcutos.com`        | `accounts.clerk.services.`           |
| `clkmail.getcutos.com`         | `mail.yex4yt4xrwzc.clerk.services.`  |
| `clk._domainkey.getcutos.com`  | `dkim1.yex4yt4xrwzc.clerk.services.` |
| `clk2._domainkey.getcutos.com` | `dkim2.yex4yt4xrwzc.clerk.services.` |

The authoritative nameserver `ns1cny.name.com`, Cloudflare resolver `1.1.1.1`,
and Google resolver `8.8.8.8` each returned all five expected CNAMEs. Clerk's
production primary domain `getcutos.com` and DNS configuration both show
**Verified**, while the exact proxy remains **Verified**. This action changed no
apex A, TXT, or DMARC record, incurred no charge, and recorded no credential.

The DNS prerequisite is complete. DNS verification alone did not establish
email delivery, user-entered code success, or native recovery; the later
bounded account-flow observation below supersedes only the first two gates.

### Bounded real email-verification observation — approximately `2026-08-08T21:27Z`

A user-provided simulator observation confirmed that a real account-creation
email was delivered, its verification code was entered successfully, and the
resulting account session authenticated far enough to reach the `Apple age check
needed` screen. No email address, password, code, screenshot path, user ID, or
other account detail is recorded.

This closes real signup-email delivery and successful user-entered verification-
code acceptance. It does not prove password recovery, the Apple age/native
bridge, a fresh native-Clerk DNS resolution, signed-build behavior, or
TestFlight QA. The authenticated JavaScript path worked. Native password
recovery and the Apple age/native bridge remained active gates at that
observation point.

### Native Clerk Frontend API TLS gap — open

At `2026-08-10T07:27:51Z`, a bounded certificate-safe comparison showed two
different paths:

- `https://getcutos.com/api/__clerk/v1/client` returned HTTP 200 with certificate
  verification successful;
- `https://clerk.getcutos.com/v1/client`, the direct host used by the native
  Clerk SDK, failed during TLS negotiation before serving a certificate.

Public DNS resolves the required Frontend API CNAME, and Clerk shows the primary
domain, DNS configuration, and proxy as Verified, but its dashboard marks
`clerk.getcutos.com` Optional. The JavaScript signup path through the verified
proxy remains working; native `AuthView` recovery is not release evidence. Do
not remove the proxy, change the domain, or replace the instance to work around
this gap. An existing Clerk support ticket titled **Native AuthView TLS error**
was acknowledged at `2026-08-09T16:17:44Z`; no technical response is recorded.
No secret, account detail, or certificate body is stored here.

### Superseding proxy-backed native recovery architecture — 2026-08-10

The native-only `forgot-password.native.tsx` override that invoked Clerk's beta
`AuthView` has been removed. Native route resolution now uses CUT's existing
`forgot-password.tsx` implementation, which follows Clerk's documented custom
email-code reset sequence with `useSignIn` and inherits the verified
`ClerkProvider` proxy URL. The request response remains generic regardless of
provider outcome, raw provider errors are not shown or logged, sign-up transfer
is absent, and a successful password submission requests sign-out of other
sessions. Web resolution remains separately pinned to Clerk's prebuilt web
`SignIn` component.

This source change removes the known direct-host TLS dependency from the native
recovery route; it does not claim completed recovery. Focused architecture and
auth-flow tests pass. At `2026-08-10T07:53:20Z`, a local iOS Hermes export made
under the EAS production environment contained the generic custom-recovery copy
and session-isolation option and did not contain the removed native `AuthView`
instructions. The export remained in `/tmp` and is structural rehearsal only,
not a signed binary or durable App Store artifact. An exact signed
physical-device/TestFlight reset request, real user-entered code, new-password
completion, session result, provider-failure behavior, and no-sign-up-transfer
observation remain required release evidence.

### Superseding native age-bridge simulator result — recorded `2026-08-08T21:46:02Z`

An arm64 Release simulator build, signed locally and built with the EAS
production environment, linked and resolved the `CutDeclaredAgeRange` native
module. It preserved the authenticated session above, reached the date-of-birth
gate, and returned `not_required` from `getStatusAsync()` on the simulator. No
crash or fatal configuration, module-resolution, or keychain error occurred. No
date of birth or account data was entered.

The supporting screenshot remains only in `/tmp`; it is ephemeral, is not
copied into the repository, and is not durable release evidence. This local
result does not validate Apple's Declared Age Range entitlement or API on a
physical device or in TestFlight. Those exact-build checks remain pending, as
does native password-recovery acceptance.

`artifacts/cut-os/eas.json` pins both `ios-simulator` and `production` to
`macos-tahoe-26.4-xcode-26.4`, preserving build-image parity. The targeted native
release-configuration suite passed 15/15 tests.

## Remaining infrastructure gates

1. Qualified approval and publication of Privacy, Terms, and Support pages.
2. Add the three approved public legal URLs to EAS production.
3. Define and separately approve a safe destructive production-data recovery
   plan before exercising Replit's in-place-only, no-roll-forward PITR control.
   Direct live TLS attestation is complete.
4. Preserve the passing exact-build and Clerk proxy-health checks, and repeat
   them after any future publish.
5. Resolve the native Clerk direct-host TLS gap, exercise the full native
   password-recovery flow, and validate Apple's
   Declared Age Range entitlement/API on the exact physical-device/TestFlight
   build. Signup email/code and the local simulator bridge are complete.
6. Generate the first signed production build and inspect its embedded privacy
   manifests, SDKs, entitlements, and permissions.
7. Complete physical-device and TestFlight purchase, restore, deletion, adult
   gate, account-switch, and restricted-state QA.
