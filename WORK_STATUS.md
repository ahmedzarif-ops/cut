# CUT OS — Work Status

**Updated:** August 3, 2026

**Working branch:** `codex/app-store-v1`

**Base:** `origin/main` at `70dc1cf`

## What now works

- The previously reviewed P1-9/10 and P1-4 branches are integrated locally:
  - zod 4 and UUID response validation.
  - generated-code drift protection.
  - atomic, server-owned onboarding completion.
- Local Apple Silicon development no longer excludes esbuild's required native binary.
- Vitest and Orval configurations load without the previous TypeScript-config runner hang.
- The onboarding client no longer makes the redundant second PATCH after saving a profile.
- A real daily weigh-in vertical slice is implemented:
  - one server-owned weigh-in per user-local day;
  - duplicate-safe update on repeated taps;
  - authenticated weight history scoped to the current user;
  - Today endpoint with deterministic Next Action;
  - Today advances from **Log your morning weigh-in** to **Build your first balanced meal** immediately after save;
  - metric storage with kg/lb display conversion;
  - migration, OpenAPI contract, generated client/validators, API service/routes, native UI, and tests.

## Verification

- `pnpm run typecheck`: **PASS**.
- `pnpm run test`: **PASS — 97 tests**.
- Production-style Expo export for iOS: **PASS — 1,716 modules bundled**.
- Blank-database migrations: **PASS**.
- Baseline adoption-safe migration test: **PASS**.
- Cross-user weight isolation: **PASS**.
- Double-save idempotency: **PASS**.
- User-local day calculation: **PASS**.
- Native iOS simulator interaction: **not yet verified in this environment**.
- Real-device interaction: **not yet verified**.

## Known environment fact

The Desktop folder originally provided was an incomplete export: it lacked Git objects and the tracked `artifacts/*` application source. A clean working copy was recovered from its configured canonical origin, `github.com/ahmedzarif-ops/cut`, without overwriting the incomplete folder. This Mac currently has Command Line Tools rather than the full Xcode app, so Simulator interaction remains an explicit pre-TestFlight gate.

## Highest-priority next slice

Build the first-meal flow that Today's Next Action now points to:

1. Food/meal schema and migration.
2. Saved balanced meal templates.
3. Log/edit/delete meal with duplicate-safe writes.
4. Daily calorie, protein, carbohydrate, fat, and fiber totals.
5. **Best Balanced Fit** recommendations using remaining targets, allergies, restrictions, and cuisine preferences.
6. Bengali/Desi and simple standard seed meals.
7. Today advances to the next available training or closeout action after food is logged.

## Owner actions not yet required for local development

Apple enrollment, EAS authentication, production credentials, subscription product creation, TestFlight distribution, App Store submission, and public release remain owner-controlled gates.
