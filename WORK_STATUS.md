# CUT OS — Work Status

**Updated:** August 3, 2026

**Working branch:** `codex/app-store-v1`

**Base:** `origin/main` at `70dc1cf`

**Adult policy:** Owner-approved adults-only 18+ policy `adult-18-v1`.
Automated server/domain/mobile implementation is complete. Legal/privacy,
native-device and live-service QA, and App Store completion remain open; this is
not a public-launch readiness claim.

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
- A server-backed balanced-meal engineering foundation is implemented and
  automated; native acceptance remains pending:
  - six versioned simple options, including Bengali and Desi meals;
  - visible ingredients, dietary tags, template-listed common allergens, an
    ingredient/package-label review warning, and estimated nutrition;
  - transparent general ordering based on protein, fiber, and a practical calorie range;
  - server-validated user-local day, versioned catalog handshake, and canonical
    nutrition snapshots;
  - durable owner-scoped create intent, captured session/token, cross-midnight
    recovery, simultaneous-retry coverage, and conflict detection;
  - idempotent delete plus an opaque request tombstone that prevents delayed
    retries from recreating a removed meal;
  - authenticated log, serving edit, confirmed delete, daily totals, and cross-user isolation;
  - Today opens the meal flow and advances from **Build your first balanced meal** to **Review today’s meals**;
  - accessible native selection, portion preview, loading/error/retry states, cache refresh, and haptics;
  - architecture decision and App Store privacy data-map drafts.
- Unexpected server errors now log only sanitized error name/code metadata, not error messages, stacks, request bodies, or database details that could contain health data.
- A durable account-deletion engineering foundation is implemented and
  automated; native and real-Clerk acceptance remain pending:
  - a server-authoritative pending/completed tombstone that survives the user cascade;
  - normal API access blocked before and after JIT provisioning for tombstoned identities;
  - backend-owned Clerk deletion, local cascade finalization, and bounded retry worker;
  - monotonic deletion state, database-enforced lifecycle/hash constraints,
    fair retry ordering, strict Clerk-error handling, and raw-ID/hash binding
    checks before any destructive external retry;
  - Settings confirmation, App Store subscription-management warning/link, and
    owner-scoped SecureStore recovery state, including terminal cleanup of the
    pending meal intent;
  - authenticated-route gating, immediate private-cache removal on `410`,
    foreground refresh plus 60-second active polling, and React Query cache
    clearing across Clerk principal transitions.
- A server-authoritative adults-only eligibility foundation is implemented and
  automated under policy `adult-18-v1`; native acceptance remains pending:
  - strict transient full-DOB input evaluated against an injected UTC clock,
    including the conservative March 1 rule for February 29 births;
  - no raw-DOB database field or API response, with only eligibility status,
    policy version, and decision timestamp retained;
  - monotonic eligible/ineligible decisions, existing-account recheck, legacy
    birth-year removal, and email clearing until an eligible recheck;
  - typed fail-closed `428`/`403` private-API enforcement while deletion/status,
    restricted Settings, and sign-out remain available;
  - owner-scoped native query state, an eligibility form/restricted screen, and
    cache-clearing guards for stale data and Clerk principal transitions.
- Malformed and oversized JSON requests now return sanitized `400`/`413`
  responses rather than becoming generic server errors.
- pnpm is pinned to `10.34.5`, and GitHub CI now runs frozen install, generated
  contract drift, typecheck, and all tests on pull requests and `main`.

## Verification

The current local automated checkpoint includes the balanced-meal,
durable-account-deletion, and adults-only eligibility foundations. It is not
native/App Store acceptance.

- `pnpm run typecheck`: **PASS**.
- `pnpm run test`: **PASS — 199 tests** (domain 31, database 4, mobile 53, API 111).
- Expo dependency compatibility check: **PASS** with Expo `54.0.36`.
- Expo Doctor `1.20.1`: **PASS — 18/18 checks**.
- Frozen pnpm `10.34.5` install: **PASS** with the committed lockfile.
- Production-style Expo export for iOS: **PASS — 1,730 modules; 6.08 MB Hermes bundle**.
- Blank-database migrations, including deletion lifecycle/hash constraints,
  finite nutrition checks, retry index, and meal deletion tombstones: **PASS**.
- Baseline adoption-safe migration test: **PASS**.
- Cross-user weight isolation: **PASS**.
- Cross-user meal read/edit/delete isolation: **PASS**.
- Double-save idempotency: **PASS**.
- Meal retry idempotency and mismatched-key conflict: **PASS**.
- Cross-midnight recovery, stale day/catalog rejection, repeated delete, and
  deleted-request replay protection: **PASS**.
- Deletion cascade, other-user isolation, pre/post-provision tombstone guard,
  monotonic concurrency, strict provider-error handling, corrupt identity-pair
  rejection, failure recovery, and bounded-worker retry: **PASS (automated)**.
- Owner-scoped deletion marker, fail-closed status-gate helpers, captured auth,
  and late-response principal isolation: **PASS (automated)**.
- Adult UTC calendar evaluation, monotonic eligibility decisions,
  `428`/`403` private authorization, existing-account recheck, birth-year
  removal, email minimization, and native fail-closed helper regressions:
  **PASS (automated)**.
- User-local day calculation: **PASS**.
- Native iOS simulator interaction: **not yet verified in this environment**.
- Real-device interaction: **not yet verified**.
- Account deletion against a real Clerk identity: **not yet verified**.
- RevenueCat purchase and entitlement behavior: **not yet implemented or
  verified against live sandbox services**.

## Known environment fact

The Desktop folder originally provided was an incomplete export: it lacked Git objects and the tracked `artifacts/*` application source. A clean working copy was recovered from its configured canonical origin, `github.com/ahmedzarif-ops/cut`, without overwriting the incomplete folder. This Mac currently has Command Line Tools rather than the full Xcode app, so Simulator interaction remains an explicit pre-TestFlight gate.

## Highest-priority next slice

Close the public-launch safety and native acceptance gates before collecting
more sensitive preference data:

1. Complete native-device acceptance for `adult-18-v1`, including deep links,
   offline/relaunch, shared-device account switching, stale-cache clearing,
   deletion in every eligibility state, and VoiceOver. Add public
   Terms/Privacy/Support links to normal and restricted Settings.
2. Produce reproducible recipes, nutrition methodology/sources, allergen
   substantiation, and qualified review records for every public meal template.
3. Exercise success, cancellation, timeout, app-kill, retry, second-device, and
   shared-device account-switch scenarios with a real Clerk development identity
   in an iOS development build.
4. Have qualified counsel approve adults-18+ Terms/EULA, Privacy Policy,
   notice-at-collection, retention/underage handling, launch jurisdictions, and
   sufficiency of the self-declared assurance method and permanent
   ineligible-identity workflow.
5. Define tombstone/backups retention—including the maximum accepted lifetime
   of stale Clerk sessions/tokens—deletion completion expectations, production
   monitoring, alerting, and manual reconciliation.
6. Inventory privacy manifests and required-reason APIs in the generated iOS
   archive; reconcile `APP_STORE_METADATA.md`, complete the current Apple
   questionnaire truthfully, and apply the higher 18+ override once the
   Terms/EULA minimum is final.
7. Add dietary preferences/allergy exclusions only after the deletion and privacy paths exist.
8. Add authoritative calorie/protein targets and deterministic hard filters before using the product name **Best Balanced Fit**.
9. Then advance Today to training and closeout actions.

## Owner actions not yet required for local development

Apple enrollment, EAS authentication, production credentials, subscription
product creation, TestFlight distribution, App Store questionnaire/privacy
publication, the higher 18+ rating override, Submit for Review, and public
release remain owner-controlled gates. Terms/Privacy and jurisdictional
age-assurance approval remain qualified-counsel gates; nutrition and health
claims remain qualified professional/legal review gates. Legal and Support must
also approve the permanent ineligible-identity and later-new-account workflow.
