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
| `artifacts/api-server`     | Express 5 API (Clerk-verified, Drizzle ORM)           |
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
```

Expo Go is useful for development preview only. Release acceptance requires a
configured EAS development build or full Xcode/Simulator; Expo Go cannot verify
real App Store purchases.

### Environment variables

| Var                                  | Used by                       | Purpose                                                        |
| ------------------------------------ | ----------------------------- | -------------------------------------------------------------- |
| `DATABASE_URL`                       | api-server, lib/db            | Postgres connection; production requires `sslmode=verify-full` |
| `CLERK_PUBLISHABLE_KEY`              | api-server, cut-os dev script | Clerk client key for local/Replit development                  |
| `CLERK_SECRET_KEY`                   | api-server                    | Clerk server key, FAPI proxy, and backend account deletion     |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`  | cut-os EAS release            | Clerk publishable key embedded in the submitted app            |
| `EXPO_PUBLIC_DOMAIN`                 | cut-os EAS release            | HTTPS API hostname embedded in the submitted app               |
| `EXPO_PUBLIC_CLERK_PROXY_URL`        | cut-os EAS release            | Exact same-origin `https://<domain>/api/__clerk` route         |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | cut-os EAS release            | RevenueCat public Apple SDK key embedded in the app            |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL`     | cut-os EAS release            | Public Privacy Policy opened from sign-up and Settings         |
| `EXPO_PUBLIC_TERMS_URL`              | cut-os EAS release            | Public Terms of Use opened from sign-up and Settings           |
| `EXPO_PUBLIC_SUPPORT_URL`            | cut-os EAS release            | Public support page opened from Settings                       |
| `PORT`                               | api-server                    | Listen port (Replit-provided)                                  |
| `REVENUECAT_SECRET_API_KEY`          | api-server                    | Server-only RevenueCat REST API v2 secret                      |
| `REVENUECAT_PROJECT_ID`              | api-server                    | RevenueCat REST API v2 project resource ID (`proj...`)         |
| `REVENUECAT_ENTITLEMENT_REST_ID`     | api-server                    | RevenueCat v2 entitlement resource ID (`entl...`)              |

All seven `EXPO_PUBLIC_*` release values must be configured and verified in the
production EAS environment before TestFlight. They are public app
configuration, never secret storage. The three RevenueCat server values belong
only in the API deployment. The development script derives the API and Clerk
values automatically, but an EAS build does not inherit that shell mapping.
See `EAS_RELEASE_RUNBOOK.md`.

## Tests & checks

```sh
pnpm run typecheck   # all packages
pnpm run test        # vitest: domain + database + API integration (PGlite) + mobile unit
pnpm run build       # typecheck + build everything
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
