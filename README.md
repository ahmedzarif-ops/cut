# CUT OS

A focused daily cut check-in for adults age 18 and older who lift. The current
paid iOS scope is one next action, a daily weigh-in, six curated balanced-meal
choices, meal logging, and daily nutrition totals. Native mobile app (React
Native + Expo) + Express API + PostgreSQL.

The owner-approved eligibility policy is `adult-18-v1`. A self-declared full
DOB is evaluated transiently by the server against the UTC calendar; raw DOB is
never stored. This engineering policy is not age verification and does not make
the product public-launch ready. See `ADR_003_ADULT_ELIGIBILITY.md` and
`APP_STORE_READINESS.md` for enforcement and outstanding review gates.

## What's here

| Path                       | What it is                                            |
| -------------------------- | ----------------------------------------------------- |
| `artifacts/cut-os`         | The Expo mobile app (SDK 54, expo-router, Clerk auth) |
| `artifacts/api-server`     | One Express production server: API + public/legal     |
| `lib/api-spec`             | OpenAPI contract → Orval codegen                      |
| `lib/api-client-react`     | Generated typed react-query client                    |
| `lib/api-zod`              | Generated Zod validators (server-side)                |
| `lib/db`                   | Drizzle schema + committed migrations                 |
| `lib/domain`               | Shared deterministic product and nutrition rules      |
| `artifacts/mockup-sandbox` | Replit design-preview tooling (not the product)       |

## Run it

```sh
pnpm install

# API server (needs DATABASE_URL, CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY)
pnpm --filter @workspace/api-server run dev

# Mobile development preview (configured Clerk environment required)
pnpm --filter @workspace/cut-os run dev

# Reproducible production artifact and non-billable loopback smoke run
pnpm run build:production
pnpm run dry-run:production
```

The Expo app never starts Clerk with a missing, malformed, or known example
publishable key. A local web preview instead shows a non-secret configuration
screen naming the environment variables to fix, and authenticated routes remain
unavailable. Replace the placeholder with a real development Clerk publishable
key and configure the API hostname, then restart Expo. There is no implicit mock
authentication mode; release and preview build validation reject the same known
placeholder instance.

Expo Go is useful for development preview only. Release acceptance requires a
configured EAS development build or full Xcode/Simulator; Expo Go cannot verify
real App Store purchases.

### Environment variables

| Var                                  | Used by                       | Purpose                                                         |
| ------------------------------------ | ----------------------------- | --------------------------------------------------------------- |
| `DATABASE_URL`                       | api-server, lib/db            | Postgres connection; production requires `sslmode=verify-full`  |
| `CLERK_PUBLISHABLE_KEY`              | api-server, cut-os dev script | Clerk client key for local/Replit development                   |
| `CLERK_SECRET_KEY`                   | api-server                    | Clerk server key, FAPI proxy, and backend account deletion      |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`  | cut-os EAS release            | Clerk publishable key embedded in the submitted app             |
| `EXPO_PUBLIC_DOMAIN`                 | cut-os EAS release            | One lowercase app/API hostname embedded in the submitted app    |
| `EXPO_PUBLIC_CLERK_PROXY_URL`        | cut-os EAS release            | Exact same-origin `https://<domain>/api/__clerk` route          |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | cut-os EAS release            | RevenueCat public Apple SDK key embedded in the app             |
| `EXPO_PUBLIC_REVENUECAT_PRODUCT_ID`  | cut-os EAS release            | Exact approved App Store subscription product ID                |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL`     | cut-os EAS release            | Exact `https://<domain>/privacy` and App Store listing URL      |
| `EXPO_PUBLIC_TERMS_URL`              | cut-os EAS release            | Exact `https://<domain>/terms` and App Store listing URL        |
| `EXPO_PUBLIC_SUPPORT_URL`            | cut-os EAS release            | Exact `https://<domain>/support` and App Store listing URL      |
| `PUBLIC_APP_ORIGIN`                  | api-server public routes      | Canonical launch/legal origin; must equal production CORS host  |
| `CORS_ALLOWED_ORIGINS`               | api-server                    | Same canonical HTTPS origin in production; lists allowed in dev |
| `BUILD_SHA`                          | api-server production         | Exact full lowercase 40-character deployed Git commit identity  |
| `BASE_PATH`                          | api-server public routes      | Production must be unset, empty, or `/`; mounted paths fail     |
| `CLERK_PROXY_URL`                    | cut-os development preview    | Relative API proxy path; configured value is `/api/__clerk`     |
| `LEGAL_SITE_PUBLICATION_STATUS`      | api-server public routes      | `draft` until approved legal sources and hashes are recorded    |
| `PORT`                               | api-server                    | Listen port (Replit-provided)                                   |
| `API_MAX_INSTANCES`                  | api-server production         | Actual platform max; only `1` is supported until shared limits  |
| `API_RATE_LIMIT`                     | api-server production         | Optional requests/minute integer `1`-`10000`; default `100`     |
| `CLERK_RATE_LIMIT`                   | api-server production         | Optional proxy requests/minute integer `1`-`1000`; default `30` |
| `PG_POOL_MAX`                        | api-server production         | Optional database pool integer `1`-`20`; default `5`            |
| `ACCOUNT_DELETION_RETRY_INTERVAL_MS` | api-server production         | Optional integer `1000`-`300000`; defaults to `60000`           |
| `REVENUECAT_SECRET_API_KEY`          | api-server                    | Server-only RevenueCat REST API v2 secret                       |
| `REVENUECAT_PROJECT_ID`              | api-server                    | RevenueCat REST API v2 project resource ID (`proj...`)          |
| `REVENUECAT_ENTITLEMENT_REST_ID`     | api-server                    | RevenueCat v2 entitlement resource ID (`entl...`)               |
| `REVENUECAT_APP_REST_ID`             | api-server                    | RevenueCat v2 iOS app resource ID (`app...`)                    |
| `REVENUECAT_OFFERING_REST_ID`        | api-server                    | RevenueCat v2 current offering resource ID (`ofrng...`)         |

All eight `EXPO_PUBLIC_*` release values must be configured and verified in the
production EAS environment before TestFlight. They are public app
configuration, never secret storage. The five RevenueCat server values belong
only in the API deployment. The development script derives the API and Clerk
values automatically, but an EAS build does not inherit that shell mapping.
See `EAS_RELEASE_RUNBOOK.md`.

`CLERK_PROXY_URL` is the relative server route used only while Replit assembles
its browser/development preview configuration. The production API build mounts
the public site on the same listener and does not start Metro or bundle it. EAS
does not inherit it: native builds require the full same-origin
`EXPO_PUBLIC_CLERK_PROXY_URL`. Keep
`LEGAL_SITE_PUBLICATION_STATUS=draft` until the exact Privacy, Terms, and
Support sources have owner/counsel approval and the committed hash gate passes.

Any build profile that configures `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` must
also configure the exact `EXPO_PUBLIC_REVENUECAT_PRODUCT_ID`; a preview or Test
Store build with an unbound catalog fails validation instead of reaching a
paywall that can never load a purchasable plan.

`PUBLIC_APP_ORIGIN` is required by the production server, is never derived from
request headers, and must exactly equal the canonical
`CORS_ALLOWED_ORIGINS`. A non-root production `BASE_PATH` also fails before
binding so public, legal, Clerk proxy, and API routes cannot split. Production
also requires `BUILD_SHA` to be the exact non-placeholder lowercase full Git
SHA of the deployed candidate; `/status` returns that SHA so the live verifier
can reject a stale or wrong revision. Production startup also fails closed
unless `API_MAX_INSTANCES` is explicitly `1`. This is
a launch-only single-instance control: the release record must prove the
provider maximum is one, and a multi-replica deployment requires a real shared
rate-limit store first.
The account-deletion worker runs once immediately at startup, then waits for
each non-overlapping run to settle before scheduling the next bounded retry.
Because that retry scheduler lives in the API process, launch also requires a
provider-verified always-on minimum of one API machine; a scale-to-zero service
is not sufficient even when its maximum is one. `API_MAX_INSTANCES=1` is only a
runtime assertion and is not proof of either provider control-plane setting.
Production rejects retry intervals outside 1 second through 5 minutes rather
than passing unsafe values to the Node timer.

Production startup reads RevenueCat's official v2 app, entitlement,
entitlement-product list, offering, and bounded customer-list shapes. The
customer permission check is a single `GET` with `limit=1`; it never follows
customer pagination or probes a write/delete endpoint. A
semantic/auth/not-found mismatch remains
fatal unless the sole active subscription is
`com.zarifahmed.cut.pro.monthly`, belongs to the exact iOS app, has duration
`P1M`, and reports no trial. RevenueCat's documented app response does not
expose whether Apple purchase credentials are configured, and a customer read
cannot prove destructive customer write/delete permission. The optional App
Store Connect API sync credential is intentionally omitted after Apple's live
authorization attestation limited it to internal-team use. Release still
requires controlled RevenueCat-dashboard evidence for the valid Apple in-app
purchase/subscription key and the server key's customer read/write permission,
plus StoreKit and purchase QA on the exact submitted build. Transient timeouts,
network
failures, rate limits, and provider 5xx responses emit only a sanitized degraded
warning so account and deletion APIs can start; subscription checks still fail
closed.

## Tests & checks

```sh
pnpm run typecheck   # all packages
pnpm run test        # vitest: domain + database + API integration (PGlite) + mobile unit
pnpm run build       # typecheck + build everything
pnpm run dry-run:production # build + one-listener loopback smoke, no providers
pnpm --filter @workspace/cut-os run validate:release-config
```

## Database

```sh
pnpm --filter @workspace/db run generate  # schema change → new migration
pnpm --filter @workspace/db run migrate   # apply migrations (DATABASE_URL)
pnpm --filter @workspace/db run push      # rapid dev only
```

Migrations are the production path; the api-server test suite constructs its
database from the committed migrations, so drift fails tests.
Production API startup also applies these files under a bounded PostgreSQL
advisory lock and refuses to listen unless the database's latest recorded
migration timestamp and hash exactly match the server build.

## Docs

- `ARCHITECTURE.md` — auth decision, data flow, source-of-truth rules
- `QA_REPORT.md` — what has actually been verified, and where
- `WORK_STATUS.md` — current continuation state and next implementation slice
- `APP_STORE_READINESS.md` — focused v1 scope and release gates
- `ADR_001_BALANCED_MEALS.md` — meal catalog, snapshot, and safety decision
- `ADR_002_ACCOUNT_DELETION.md` — resumable local-data and Clerk deletion
- `ADR_003_ADULT_ELIGIBILITY.md` — adults-only eligibility and data-minimization boundary
- `ADR_004_SUBSCRIPTIONS.md` — RevenueCat identity, authorization, and purchase boundary
- `PURCHASE_QA_REPORT.md` — Apple Sandbox and TestFlight purchase evidence log
- `APP_STORE_METADATA.md` — working App Store answers, evidence, and approvals
- `PRIVACY_DATA_MAP.md` — current data inventory and App Store privacy gates
- `EAS_RELEASE_RUNBOOK.md` — production environment, build, and TestFlight handoff
- `PHASE_0_CLAUDE_AUDIT.md` — post-Phase-0 architecture audit findings
- `replit.md` — operational quick reference
- Product spec + change order: `attached_assets/`
