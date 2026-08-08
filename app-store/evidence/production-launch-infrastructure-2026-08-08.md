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

- The authoritative GitHub branch and the Replit workspace were aligned to
  commit `1257d8823f1a3ef3177a3e12409c4bf903e6009e` at verification time.
- The Replit working branch was clean and exactly even with its upstream.
- Replit-only empty “Published your App” commits were preserved on backup
  branches before alignment; no user source changes were discarded.
- `https://getcutos.com/` returned HTTP 200 over HTTPS.
- `https://getcutos.com/status` returned HTTP 200 and identified the currently
  deployed older build as
  `3041d46f4893eafab994e4862e1a62c85e83dc64`.
- `https://getcutos.com/api/readyz` returned HTTP 200.
- The legal routes returned HTTP 503, as required while publication approval
  remains draft.

The new green source commit was deliberately not republished over the older
deployment because the legal/publication and final production-build gates are
not yet satisfied.

## Production database transport and readiness

- Replit's current [production database documentation](https://docs.replit.com/references/data-and-storage/production-databases)
  and [database-upgrade documentation](https://docs.replit.com/references/data-and-storage/database-upgrade)
  distinguish the editor's development database from the deployment database:
  the current development database is local Helium and does not use SSL, while
  production databases run on Neon.
- A connect-only probe in the Replit editor reproduced the documented Helium
  behavior: the development endpoint rejects every forced SSL mode. That result
  is development evidence and is not evidence of a production TLS failure.
- Deployed build `3041d46f4893eafab994e4862e1a62c85e83dc64` contains the same
  production database normalization, validation, startup-migration path, and
  migration files as the current source. There is no migration diff between
  that build and the current source.
- Its production entrypoint upgrades the one accepted provider URL shape from
  `sslmode=require` to `sslmode=verify-full`, rejects any non-verified final
  configuration, completes startup migrations before binding the listener, and
  exposes readiness only after a database query succeeds.
- On August 8, `https://getcutos.com/status` identified that exact deployed
  build and `https://getcutos.com/api/readyz` returned HTTP 200. Together with
  the fail-closed startup ordering, this proves that the deployed application
  requested certificate-verifying production transport, completed the current
  migration set, and executed a production readiness query.

This does not replace an exact-candidate recheck. After the current green source
is deployed, record the exact deployment SHA, re-run readiness, and inspect the
live TLS socket's encryption and authorization flags without exposing its host,
credentials, certificate subject, or database contents.

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

## Remaining infrastructure gates

1. Qualified approval and publication of Privacy, Terms, and Support pages.
2. Add the three approved public legal URLs to EAS production.
3. Revalidate the exact-candidate production database, including direct live
   TLS socket encryption/authorization evidence, without exposing the database
   URL.
4. Recheck the final deployment's build SHA and Clerk proxy-health endpoint.
5. Generate the first signed production build and inspect its embedded privacy
   manifests, SDKs, entitlements, and permissions.
6. Complete physical-device and TestFlight purchase, restore, deletion, adult
   gate, account-switch, and restricted-state QA.
