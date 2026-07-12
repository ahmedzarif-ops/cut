# CUT OS

Native mobile app (React Native + Expo) that tells a lifter exactly what to do
next to finish a cut without losing muscle — backed by an Express API and
PostgreSQL as the source of truth.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/cut-os run dev` — run the Expo dev server (Replit iOS simulator / Expo Go)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run test` — run all vitest suites (api-server integration + cut-os unit)
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run generate` — generate a Drizzle migration from schema changes
- `pnpm --filter @workspace/db run migrate` — apply committed migrations (needs `DATABASE_URL`)
- `pnpm --filter @workspace/db run push` — push DB schema changes (rapid dev only; production uses migrations)
- Required env: `DATABASE_URL` — Postgres connection string; `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` — Clerk auth

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
- `PUT /api/me/profile` is a full replace; clients must seed edit forms from the existing profile (enforced via `lib/profile-form.ts`).
- Storage is metric (kg/cm); `users.units` is a display preference.
- The api-server never trusts a client-supplied user id; all queries scope by server-resolved `req.userId`.
- Deterministic product rules (next-action, streaks, e1RM…) must land in a shared, unit-tested package when built — not inline in routes/screens (spec §29).

## Product

Phase 0 foundation: Clerk email/password auth, JIT-provisioned internal user,
onboarding that captures the cut profile (goal, sex, height, weights, activity,
experience), and a Today screen showing the saved plan. The five-tab product
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
