---
name: Orval + Zod codegen
description: Why openapi `format: uuid` breaks orval codegen against zod 3.x, and the fix.
---

Removing every `format: uuid` from `lib/api-spec/openapi.yaml` is what makes codegen succeed.

**Why:** orval's zod generator emits `z.uuid()` for `format: uuid`, but `z.uuid()` is a zod **v4** top-level API. The workspace root resolves zod 3.25.76, where UUID validation is `z.string().uuid()`, so the generated code fails to typecheck/run.

**How to apply:** In the OpenAPI spec, type IDs as plain `type: string` (optionally with a `pattern`/description) instead of `format: uuid`. If zod is ever upgraded to v4 across the workspace, `format: uuid` can be reintroduced. Date fields use `zod.coerce.date()` and are generated in both body and response; on the server convert `Date` → `YYYY-MM-DD` before writing to `date` columns.
