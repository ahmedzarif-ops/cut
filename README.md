# CUT OS

The adaptive cut operating system for people who lift. Native mobile app
(React Native + Expo) + Express API + PostgreSQL.

## What's here

| Path | What it is |
| --- | --- |
| `artifacts/cut-os` | The Expo mobile app (SDK 54, expo-router, Clerk auth) |
| `artifacts/api-server` | Express 5 API (Clerk-verified, Drizzle ORM) |
| `lib/api-spec` | OpenAPI contract → Orval codegen |
| `lib/api-client-react` | Generated typed react-query client |
| `lib/api-zod` | Generated Zod validators (server-side) |
| `lib/db` | Drizzle schema + committed migrations |
| `artifacts/mockup-sandbox` | Replit design-preview tooling (not the product) |

## Run it

```sh
pnpm install

# API server (needs DATABASE_URL, CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY)
pnpm --filter @workspace/api-server run dev

# Mobile app — open in Replit iOS simulator or scan with Expo Go
pnpm --filter @workspace/cut-os run dev
```

### Environment variables

| Var | Used by | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | api-server, lib/db | Postgres connection |
| `CLERK_PUBLISHABLE_KEY` | api-server, cut-os dev script | Clerk client key |
| `CLERK_SECRET_KEY` | api-server | Clerk server key / FAPI proxy |
| `PORT` | api-server | Listen port (Replit-provided) |

## Tests & checks

```sh
pnpm run typecheck   # all packages
pnpm run test        # vitest: api-server integration (PGlite) + cut-os unit
pnpm run build       # typecheck + build everything
```

## Database

```sh
pnpm --filter @workspace/db run generate  # schema change → new migration
pnpm --filter @workspace/db run migrate   # apply migrations (DATABASE_URL)
pnpm --filter @workspace/db run push      # rapid dev only
```

Migrations are the production path; the api-server test suite constructs its
database from the committed migrations, so drift fails tests.

## Docs

- `ARCHITECTURE.md` — auth decision, data flow, source-of-truth rules
- `QA_REPORT.md` — what has actually been verified, and where
- `PHASE_0_CLAUDE_AUDIT.md` — post-Phase-0 architecture audit findings
- `replit.md` — operational quick reference
- Product spec + change order: `attached_assets/`
