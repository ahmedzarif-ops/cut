---
name: Orval + Zod codegen
description: The workspace is on zod 4, so openapi `format: uuid` is correct and emits `z.uuid()`. Do NOT strip it.
---

**RESOLVED in P1-9 (2026-07-12).** The workspace is now on **zod ^4** (`pnpm-workspace.yaml`
catalog), which ships both the `zod/v4` subpath (drizzle-zod in `lib/db`) and the default v4
export (orval-generated `lib/api-zod`) on one install. So `format: uuid` is valid in
`lib/api-spec/openapi.yaml` and orval emits `zod.uuid()` (a zod v4 top-level API) that compiles
and validates. It is present on the three internal-uuid fields (`User.id`, `Profile.id`,
`Profile.userId`) and the server enforces it on every response (`GetMeResponse.parse(...)` etc.).

**Do NOT strip `format: uuid`.** The old workaround — removing every `format: uuid` because
zod 3.25.76's UUID validator was `z.string().uuid()` while orval emitted the v4-only
`z.uuid()` — no longer applies and would silently weaken ID validation.

**Codegen workflow:** editing `openapi.yaml` REQUIRES re-running `pnpm run codegen` (alias for
`pnpm --filter @workspace/api-spec run codegen`) and committing the regenerated
`lib/api-zod/src/generated` + `lib/api-client-react/src/generated`. The build gate runs
`pnpm run codegen:check` (P1-10) and fails on drift, so stale committed output cannot merge.
Date fields still use `zod.coerce.date()` in both body and response; on the server convert
`Date` → `YYYY-MM-DD` before writing to `date` columns.
