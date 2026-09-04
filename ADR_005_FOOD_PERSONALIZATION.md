# ADR 005 — Free food library and privacy-bounded meal personalization

**Status:** Accepted; catalog placement amended by ADR 006

**Date:** September 4, 2026

## Decision

CUT OS will pair a versioned, source-evidenced global food and meal catalog
with a small private data model for each user. The free tier includes the
curated food and Desi meal library, manual food entry, barcode lookup, daily
logging, editable nutrition estimates, saved foods, and explicit nutrition
preferences. CUT OS Pro uses those same reviewed inputs to rank meals, suggest
bounded serving amounts, and explain why each result fits the person's stated
targets and confirmed choices.

The global catalog remains in version-controlled source as the reviewed audit
record. ADR 006 now mirrors it into global production database tables for
runtime search and future expansion. Historical meal logs continue to snapshot
the exact catalog version and nutrition used at entry time. Private database
tables store user-owned data:

- nutrition targets and explicit food preferences;
- foods the user deliberately saves;
- like / not-for-me feedback on fixed meal templates; and
- confirmed food and meal logs already required for the diary.

The server-side deterministic ranker is the default and fallback. It may learn
from confirmed catalog logs, explicit cuisine and diet preferences, stated
avoid terms, today's remaining calorie and protein targets, and direct meal
feedback. It must not infer allergies, medical conditions, religion, ethnicity,
or identity. Every recommendation remains reviewable and nothing is auto-logged.

The launch code includes an OFF-by-default LLM adapter that may draft new meals
only after the owner separately approves the provider, user-data boundary,
retention terms, API key, and spending limit. The model can select only stable
food IDs and gram amounts from the filtered catalog. CUT OS, not the model,
calculates calories and macros from those source-linked amounts and rejects any
unknown, repeated, diet-incompatible, or avoided ingredient. The person must
review before saving or logging. If the provider is unavailable, unapproved,
over its per-user daily limit, or returns invalid data, the versioned catalog
and deterministic Pro ranker continue to work.

## Options considered

### A. Database-managed global catalog

This would allow live content edits without a release, but introduces an admin
surface, content migration/versioning work, and a larger production failure
surface before launch. It is deferred until catalog operations justify it.

### B. Versioned code catalog plus private user data in the database

Originally chosen. ADR 006 preserves the source evidence but adds an
idempotently synchronized database runtime copy without introducing a live
content-management system.

### C. Fully dynamic LLM food and meal generation

Rejected as the primary system. It makes cost, latency, provenance, privacy,
and nutrition accuracy depend on an external provider. It may later augment,
but never replace, the reviewed catalog and deterministic fallback.

## Consequences

- Account deletion cascades through saved foods, nutrition preferences, meal
  feedback, diary history, and token/request accounting for paid meal creation.
- Free users receive a useful, searchable catalog and can build their own
  reusable library without paying.
- Pro value comes from adaptation and convenience, not withholding basic food
  logging.
- Avoided ingredients are preference filters, not an allergy safety control.
  The UI must continue to show ingredients/allergens and require review.
- Catalog growth requires evidence and tests for fixed servings and nutrition.
- Paid-call accounting stores counts and token totals, never prompts, generated
  meal copy, ingredient lists, photos, email addresses, or dates of birth.
- LLM use remains disabled until its separate privacy and cost decision exists.

This ADR supersedes ADR 001 and ADR 004 only where those launch documents defer
barcode/custom/preference features or describe the entire nutrition core as a
paid feature. RevenueCat remains the source of truth for Pro authorization.
