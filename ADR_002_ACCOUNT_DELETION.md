# ADR-002: Resumable local-data and Clerk account deletion

**Status:** Accepted

**Implementation status:** Automated engineering foundation complete;
real-Clerk exercise and native simulator/device acceptance are not complete.

**Date:** August 3, 2026

**Deciders:** CUT OS product owner and implementation team

## Context

CUT OS stores account, profile, weight, and nutrition data in PostgreSQL while Clerk owns the authentication identity. Apple requires in-app account deletion for apps that support account creation. Deleting only the local `users` row is insufficient: an otherwise-valid Clerk session would trigger just-in-time provisioning and recreate an empty internal account. Deleting only Clerk first is also unsafe because a later local database failure would leave sensitive app data behind without an authenticated user able to retry.

There is no distributed transaction across PostgreSQL and Clerk. The deletion flow must therefore make partial failure explicit and resumable.

## Decision

Use a server-authoritative deletion state machine with a durable tombstone/outbox:

1. The native app persists a versioned, per-Clerk-user recovery marker in SecureStore and cancels in-flight application queries.
2. `DELETE /api/me` authenticates the external identity without running normal just-in-time provisioning.
3. A database transaction creates an `account_deletion_requests` row keyed by a SHA-256 identity hash and marks or creates the matching internal user as `pending`. The unique Clerk ID row prevents a concurrent provision from establishing another active account.
4. The backend calls Clerk's user-deletion API with the server credential.
5. After Clerk confirms deletion (or reports the identity already absent), a database transaction deletes the internal `users` row so every user-owned row cascades, marks the request `completed`, and removes the raw Clerk ID from the durable request.
6. The server returns `204` only after both external identity deletion and local cascade deletion are terminal.
7. The app clears the owner's deletion marker, pending meal-create intent, and
   in-memory private query state, then signs out the exact session that
   authorized deletion.

If Clerk or final database cleanup fails, the durable request remains `pending`,
authenticated requests that reach normal APIs return `410`, and a bounded background worker plus idempotent
`DELETE /me` retries completion. The user sees an in-progress/retry state rather
than false success. `GET /me/account-deletion` reports `none`, `pending`, or
`completed` without provisioning while the Clerk session remains valid. If
Clerk has already removed the identity after a local-finalization failure, the
durable worker is the authoritative recovery path.

`requireAuth` checks the deletion request before provisioning and also rejects a `users.deletion_status = pending` row. A concurrent request that resolved an active user just before deletion may fail or briefly write, but the final user-row deletion cascades again after Clerk succeeds. No later valid request can recreate the account because the identity-hash tombstone remains.

SecureStore is UX recovery only, never deletion authority. Its JSON record is
versioned and owner-scoped, so a record for person A cannot delete person B on
a shared device. The authenticated layout is designed to verify local/server
deletion status before mounting data queries and fail closed if that gate
cannot be checked. The React Query cache is designed to clear before rendering
a new Clerk principal and again on sign-out/unmount. Normal-endpoint `410`
responses immediately gate only the principal that owned the request, while
the status query refreshes on mount, foreground focus, and every 60 seconds
while active. Those transitions still require native shared-device
verification.

The UI must state clearly that deleting CUT OS does not cancel an App Store
subscription and link to Apple's subscription-management page; native QA must
verify the copy and link behavior.

## Options considered

### A. Durable server tombstone and retry worker

| Dimension                | Assessment                          |
| ------------------------ | ----------------------------------- |
| Complexity               | Medium                              |
| Partial-failure recovery | Durable across devices and restarts |
| Clerk credentials        | Server-only secret                  |
| Launch fit               | Selected                            |

**Pros:** prevents JIT reprovisioning globally; returns success only when Clerk and local deletion finish; retries without trusting the device.

**Cons:** requires a durable pseudonymous tombstone, retry worker, retention policy, monitoring, and server Clerk access.

### B. Client deletes local data, then Clerk

| Dimension                | Assessment                 |
| ------------------------ | -------------------------- |
| Complexity               | Low                        |
| Partial-failure recovery | Device-only and race-prone |
| Clerk credentials        | No server change           |
| Launch fit               | Rejected                   |

**Pros:** superficially simple and uses Clerk's current-user `delete()` method.

**Cons:** another valid session can recreate the internal account between steps; a crash or lost device can leave deletion permanently incomplete.

### C. Server deletes Clerk first without a tombstone

| Dimension                | Assessment                   |
| ------------------------ | ---------------------------- |
| Complexity               | Low                          |
| Partial-failure recovery | Poor if local deletion fails |
| Operations               | Minimal                      |
| Launch fit               | Rejected                     |

**Pros:** one client request and no new table.

**Cons:** can strand sensitive local data after the Clerk identity disappears, leaving no authenticated retry path.

## Consequences

- All user-owned tables must retain `ON DELETE CASCADE` to `users.id` unless a reviewed retention exception exists.
- The native layout becomes a deletion-state gate before app data queries mount.
- SecureStore failures must fail closed with a visible recovery state; the server tombstone remains authoritative across devices.
- Raw Clerk IDs exist in deletion requests only while external deletion is
  pending and are nulled on completion. The identity hash, status, timestamps,
  and minimal attempt metadata need a documented retention and cleanup policy.
- Worker failures must log only sanitized codes and must be monitored before production.
- Subscription cancellation remains a separate Apple account action.
- Shared React Query state must be cleared on every authenticated principal transition.
- Terminal native cleanup includes every owner-scoped recovery record, not only
  the account-deletion marker.

## Action items

1. Automated complete: durable request, pending-user guard, Clerk deletion,
   local cascade, failure recovery, concurrency, and worker retry.
2. Engineering present, native acceptance pending: Settings, confirmation,
   subscription-management link, and owner-scoped recovery state.
3. Engineering present, native acceptance pending: server/device deletion gates
   before application queries mount and cache isolation across principals.
4. Engineering present, native acceptance pending: terminal cleanup of the
   deletion marker, pending meal intent, and shared query data.
5. Pending: monitor deletion age/failure count and document manual reconciliation.
6. Pending: exercise success, concurrency, timeout, app-kill, other-device, and
   shared-device account-switch scenarios in an iOS development build with a
   real Clerk development identity.
7. Pending: define tombstone/backups retention and deletion-completion
   expectations in the public Privacy Policy.
