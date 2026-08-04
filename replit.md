# CUT OS

Native mobile app (React Native + Expo) that tells a lifter exactly what to do
next to finish a cut without losing muscle — backed by an Express API and
PostgreSQL as the source of truth.

## Run & Operate

- Replit service, deployment, and post-merge commands invoke
  `corepack pnpm@10.34.5` so the runtime uses the exact version pinned by the
  repository instead of Replit's ambient package-manager binary.
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/cut-os run dev` — run the Expo dev server (Replit iOS simulator / Expo Go)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run test` — run all vitest suites (api-server integration + cut-os unit)
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run generate` — generate a Drizzle migration from schema changes
- `pnpm --filter @workspace/db run migrate` — apply committed migrations (needs `DATABASE_URL`)
- `pnpm --filter @workspace/db run push` — push DB schema changes (rapid dev only; production uses migrations)
- Required env: `DATABASE_URL` — Postgres connection string;
  `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` — Clerk auth;
  `REVENUECAT_SECRET_API_KEY`, `REVENUECAT_PROJECT_ID`,
  `REVENUECAT_ENTITLEMENT_REST_ID`, `REVENUECAT_APP_REST_ID`, and
  `REVENUECAT_OFFERING_REST_ID` — server-only RevenueCat REST API v2
  authorization/configuration. Copy all four resource IDs from RevenueCat.
  The least-privilege secret key needs app, entitlement, offering, package, and
  product read access in addition to the customer access used by the API.
  Production startup reads the exact entitlement, documented iOS app identity,
  attached product list, and expanded configured offering. It refuses to bind
  on semantic/auth/configuration mismatch unless the sole active product is the
  monthly, no-trial
  `com.zarifahmed.cut.pro.monthly` for `CUT_OS_PRO` and bundle ID
  `com.zarifahmed.cut`, and the exact active current offering has one package
  mapping that same RevenueCat product resource; Apple credential status is
  verified separately from controlled RevenueCat-dashboard evidence because
  the documented read API does not expose it; transient provider failures leave
  account APIs up in a sanitized degraded state while subscription checks
  continue to fail closed;
  `PUBLIC_APP_ORIGIN` — owner-approved canonical
  HTTPS origin for the production public server; `API_MAX_INSTANCES` — actual
  API platform maximum (currently must be `1` until shared rate limiting
  exists). Production must also use a provider-verified always-on minimum of one
  API machine because account-deletion retries are scheduled in-process; an
  autoscale-to-zero deployment is not launch-safe. Select and verify Reserved VM
  in Replit's Publishing settings; `.replit` intentionally does not pin the
  obsolete autoscale deployment target;
  `CORS_ALLOWED_ORIGINS` — explicit production HTTPS browser origin;
  `CLERK_PROXY_URL=/api/__clerk` — relative route used by the Replit build only
  (EAS separately needs the full `EXPO_PUBLIC_CLERK_PROXY_URL`);
  `LEGAL_SITE_PUBLICATION_STATUS=draft` — keep draft until owner/counsel approval
  and the legal source-hash gate pass; never flip this as a deployment shortcut

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo SDK 54, React Native 0.81, expo-router, TanStack Query, Clerk Expo
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (migrations in `lib/db/migrations`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Tests: vitest; api-server integration tests run against PGlite (WASM Postgres) built from committed migrations

## Where things live

- `lib/api-spec/openapi.yaml` — API contract source of truth (Orval generates `lib/api-client-react` + `lib/api-zod`)
- `lib/db/src/schema/` — DB schema source of truth; `lib/db/migrations/` — committed migrations
- `artifacts/api-server/src/middlewares/requireAuth.ts` — identity resolution (Clerk id → internal `users.id`)
- `artifacts/cut-os/app/` — expo-router routes: `(auth)` sign-in/up, `(app)` today/onboarding
- `artifacts/cut-os/lib/profile-form.ts` — pure profile↔form mapping (unit tested)
- `artifacts/cut-os/constants/colors.ts` — design tokens
- `ARCHITECTURE.md` — auth decision, data flow, source-of-truth rules
- `artifacts/mockup-sandbox` — Replit design-preview tool only; not part of the product

## Architecture decisions

- Clerk (not Replit Auth) for the native artifact; internal `users.id` uuid is the identity every table references — never the raw Clerk id (see ARCHITECTURE.md).
- `PUT /api/me/profile` is a full replace of the minimized paid-v1 profile;
  clients seed display name, goal, and start/goal weight from the current
  profile. Deprecated unused inputs are rejected and cleared from legacy rows.
- Storage is metric (kg/cm); `users.units` is a display preference.
- The api-server never trusts a client-supplied user id; all queries scope by server-resolved `req.userId`.
- Deterministic product rules (next-action, streaks, e1RM…) must land in a shared, unit-tested package when built — not inline in routes/screens (spec §29).

## Product

Phase 0 foundation: Clerk email/password auth, server-provisioned internal user,
onboarding that captures only the paid-v1 profile fields used on Today (display
name, goal, start/goal weight), and a Today screen showing the saved profile. The five-tab product
(Today/Food/Train/Calendar/Progress) arrives in later phases.

## User preferences

- Spec docs in `attached_assets/` are the source of truth for product scope; do not
  drift from them without a change order.

## Gotchas

- Always run codegen after editing `lib/api-spec/openapi.yaml`; generated files are committed.
- Avoid `format: uuid` in the OpenAPI spec (breaks Orval + zod 3.x — see `.agents/memory/orval-zod-codegen.md`).
- The Clerk token getter on mobile must stay defensive (timeout → null, never throw) — see `.agents/memory/clerk-expo-token-getter.md`.
- Schema changes require `pnpm --filter @workspace/db run generate`; the api-server test suite builds its DB from migrations and fails on drift.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
