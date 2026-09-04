# ADR-001: Versioned balanced-meal catalog with nutrition snapshots

**Status:** Accepted

**Implementation status:** Automated engineering foundation complete; native
simulator and real-device acceptance remain pending.

**Date:** August 3, 2026

**Deciders:** CUT OS product owner and implementation team

## Context

Today now advances from onboarding to a daily weigh-in and then asks the user to build a first balanced meal. The app needs a real destination for that action, culturally varied simple options, reliable daily totals, and duplicate-safe logging. It must also avoid implying that a generic catalog accounts for allergies, medical conditions, or individual clinical needs.

Constraints:

- Reuse the existing Expo, Express, OpenAPI, Drizzle, and PostgreSQL stack.
- Keep one canonical user-local day on the server.
- Keep writes scoped to the authenticated internal user ID.
- Make a retry or double tap idempotent.
- Prevent an app-kill recovery from moving a meal across the user's midnight
  or submitting a changed catalog estimate without review.
- Do not add free-text food data, allergy profiles, or medical personalization in this slice.
- Preserve historical nutrition if a template changes later.

## Decision

Keep a small, versioned meal-template catalog in the domain package. Each
template has a stable ID, cuisine/dietary labels, an ingredient summary,
template-listed common allergens, and per-serving calories, protein,
carbohydrate, fat, and fiber. Users are reminded to review every ingredient and
package label; the template is not an allergen-safety guarantee.

When a user logs a template, the server copies its name and canonical
per-serving nutrition into a `meal_entries` snapshot and stores the serving
amount separately. A client-generated request UUID is unique per user, so
retries return the original row instead of creating a duplicate. The server
owns `logged_on` using the user's timezone. The client echoes the reviewed
`dayKey` and `catalogVersion`; a new request must match both server authorities
or receives `412`. Existing identical UUIDs are resolved first, so a lost
response can return its original historical snapshot even after midnight or a
catalog release. Entry IDs are always queried together with the authenticated
user ID, and the user foreign key cascades on account deletion.

Before its first network send, the native app stores a versioned,
owner-scoped pending intent containing the exact UUID, template, catalog,
day, and serving amount. Recovery uses the captured Clerk session token,
shows only the saved payload, and blocks other meal mutations until the server
confirms or safely rejects it. Account deletion clears this intent at terminal
completion.

Deleting a meal also writes a user-owned tombstone containing only its opaque
request UUID. This makes DELETE idempotent and prevents a delayed create replay
from resurrecting a removed meal. The tombstone retains no template, serving,
or nutrition snapshot and cascades with account deletion.

`GET /me/meals/today` returns today's entries and summed nutrition;
`GET /me/meal-options` returns the ranked catalog. The initial ranking is a
transparent general balanced-meal score based on protein, fiber, and a
practical calorie range. It is not called allergy-safe or medically
personalized. Allergy filtering and individual energy targets require explicit
profile data, safety tests, privacy disclosures, and product review before they
can affect ranking.

## Options considered

### A. Versioned code catalog plus logged snapshots

| Dimension           | Assessment                         |
| ------------------- | ---------------------------------- |
| Complexity          | Low                                |
| Launch speed        | High                               |
| Historical accuracy | High                               |
| Runtime operations  | No catalog administration required |

**Pros:** deterministic, testable, offline-reviewable, easy to seed, preserves history.

**Cons:** catalog changes require a release; not suited to a large marketplace.

### B. Database-managed template catalog

| Dimension           | Assessment                    |
| ------------------- | ----------------------------- |
| Complexity          | Medium                        |
| Launch speed        | Medium                        |
| Historical accuracy | Requires versioning/snapshots |
| Runtime operations  | Requires an admin workflow    |

**Pros:** content can change without a release.

**Cons:** adds moderation, publication, rollback, and migration work before it is needed.

### C. Generate meals dynamically with an AI model

| Dimension             | Assessment                         |
| --------------------- | ---------------------------------- |
| Complexity            | High                               |
| Launch speed          | Low                                |
| Nutrition consistency | Low without a verified data source |
| Safety review         | High burden                        |

**Pros:** broad variety and natural-language personalization.

**Cons:** nondeterministic nutrition, higher health-claim risk, cost, latency, and difficult regression testing.

## Consequences

- The first meal experience can be implemented and tested deterministically
  without an admin system; simulator and real-device acceptance remain separate.
- Historical totals do not drift when template copy changes.
- Template IDs become durable API identifiers and must not be reassigned.
- Catalog releases require a drained/single-version API deployment; mixed old
  and new write replicas are not supported by the current precondition check.
- The catalog must show ingredient/allergen information with a review reminder, but it must not promise allergen safety.
- Personalized targets, dietary exclusions, barcode search, photo recognition, and custom meals remain later decisions.
- If the catalog grows beyond a curated set, move templates to a versioned content service while keeping nutrition snapshots in logged entries.

## Action items

1. Completed: domain catalog, ranking, nutrition scaling, and automated tests.
2. Completed: meal-entry schema and migration with cascade and idempotency indexes.
3. Completed: authenticated daily list/create/update/delete endpoints and generated clients.
4. Engineering complete, native acceptance pending: fail-closed durable create
   recovery, captured-principal writes, day/catalog preconditions, and Today's
   first-meal/neutral-review actions.
5. Automated complete, native acceptance pending: isolation, simultaneous and
   cross-midnight retries, local-day behavior, edits, deletes, totals, and
   invalid templates.
6. **Public-launch blocker:** define fixed ingredient quantities/yield for every
   template; record nutrition source and calculation methodology; substantiate
   allergen/dietary labels; obtain qualified review with reviewer and review
   date.
7. Pending: add allergies/preferences only after the privacy and
   recommendation-safety gates are designed.
