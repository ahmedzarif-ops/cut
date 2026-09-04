# ADR 006 — Database-backed nutrition catalog

**Status:** Accepted

**Date:** September 4, 2026

## Context

CUT OS needs a nutrition foundation that is useful without a subscription and
can grow beyond the launch catalog. The launch source already contains 35
source-linked foods and 18 reviewed meal templates, including 11 Desi or
Bengali options. Keeping the only runtime copy inside application code would
make later catalog growth, search, and content operations unnecessarily tied to
mobile releases. A fully live editor would add an admin surface and an
unreviewed-content risk that is not justified before launch.

## Decision

The version-controlled catalog remains the reviewed audit source, while the API
mirrors it into PostgreSQL `catalog_foods` and `catalog_meals` tables before it
accepts traffic. The synchronization is idempotent, preserves stable IDs,
versions every item, retains removed rows as inactive, and fails startup if the
runtime catalog cannot be prepared.

Every current catalog food and meal is in the free tier. Free users can search,
review, save, customize, and log the catalog without a subscription. CUT OS Pro
monetizes convenience and adaptation: personalized meal fits and on-demand meal
drafts based on explicit goals, food preferences, direct liked/not-for-me
feedback, confirmed meal history, and the day's remaining targets.

Provider-backed generation remains off by default until the owner separately
approves the provider, project-only credential, data boundary, and hard spend
limit. When enabled, the model may select only active catalog food IDs and gram
amounts. CUT calculates nutrition from database-backed catalog values and
rejects unknown, repeated, excluded, or out-of-bounds ingredients. Nothing is
auto-logged.

## Options considered

### A. Code-only catalog

Low operational complexity, but runtime search and expansion stay tied to
deployments and the database cannot become the product's nutrition foundation.

### B. Versioned source plus database runtime mirror

Chosen. It combines auditable nutrition sources with a real queryable catalog,
stable history, deterministic startup behavior, and a future path to reviewed
catalog operations.

### C. Live admin catalog or unrestricted LLM catalog

Deferred. Either would allow unreviewed nutrition changes to reach users and
would add permissions, audit, rollback, provenance, and content-review work
before launch.

## Consequences

- Production migration 0014 creates the two global catalog tables.
- Catalog rows contain product content only, not user identifiers or diary
  history, so account deletion does not delete the shared catalog.
- Logged meals continue storing immutable nutrition snapshots and catalog
  versions; later catalog corrections never rewrite user history.
- Free endpoints return active `free` rows. Pro ranking can use the complete
  active catalog while preserving the same diet and avoid filters.
- Catalog changes require updated evidence, a catalog-version bump, automated
  synchronization tests, and exact-build verification.
- The current launch remains useful when provider AI is disabled or unavailable
  because the deterministic database-backed catalog fallback stays active.

This ADR amends ADR 005 only where it selected a code-only runtime catalog.
ADR 005's privacy, personalization, free-tier, and provider-safety decisions
remain in force.
