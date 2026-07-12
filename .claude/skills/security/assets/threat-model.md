# Threat model — assets, trust boundaries, abuse cases

> Cyrus's standing inventory of what the app protects and where the boundaries are. This is a TEMPLATE —
> fill it for your own stack on the first review and keep it current when the architecture changes. It is the
> ground for every review + new-feature threat-model. Keep the authoritative, file-level detail in your repo's
> `SECURITY.md`.

## Crown-jewel assets (what an attacker wants)
Fill in what YOUR app holds. Common categories:
- **Money + payment integrity** — checkout/subscriptions; entitlement/access state. Abuse = free access,
  price/coupon tampering, card-testing, chargeback fraud. *(Owned mostly by your payment processor, e.g.
  Stripe — you keep only session/customer ids and entitlement rows.)*
- **Customer PII** — contacts, leads/quotes, scan history, email captures, phone settings (your database).
- **Secrets** — the database service/admin key, the payment processor secret + webhook secret, LLM/telephony/
  email-provider keys, the cookie-signing secret. A leak = full data + money compromise.
- **Owner/admin tools** — any internal dashboard or privileged route (session-gated, owner-scoped).
- **The AI surface** — the LLM-powered features + the agentic org + any multi-tenant / white-label product.
  Abuse = prompt injection, tool misuse, cross-tenant data leak, cost abuse.
- **Brand + availability** — the live revenue site itself (defacement, DoS, SEO/poisoning).

## Trust boundaries (confirm each holds per change)
Fill the right column with your actual control; example rows:
| Boundary | Control to verify |
|---|---|
| Browser <-> server | The browser/anon database client is subject to RLS; the admin/service client bypasses RLS and is server-only behind a browser guard. |
| Payment processor -> your webhook route | Signature check (e.g. `constructEvent`); missing sig -> 400; handlers idempotent + safe under retry. |
| Telephony provider -> your inbound routes | Provider signature validation (constant-time); fails closed when the auth token is unset. |
| Scheduler/cron -> your cron routes | `Authorization: Bearer ${CRON_SECRET}` constant-time; inert when unset. |
| User-supplied URL fetch | An SSRF-guarded fetch: http/https + standard ports, DNS-resolve + reject private/reserved IPs, re-validate every redirect hop, byte cap. |
| Payments | Prices computed server-side; the client can never set price/coupon. |
| Output | CSP + HSTS + X-Frame + nosniff + Referrer-Policy; only sanctioned, escaped `dangerouslySetInnerHTML` sinks. |
| Auth | Signed session/entitlement cookies via a strong cookie-signing secret; entitlements resolved server-side. Document whether you have route middleware or every route self-gates. |
| Tenant isolation (multi-tenant product) | DB-enforced per-tenant RLS (e.g. a SECURITY DEFINER membership function with a pinned `search_path`); a forge-proof active-tenant cookie; a passing isolation test. |

## Known weak spots / open backlog (your security backlog — Cyrus owns triage)
Maintain a numbered, living list your findings map onto. Common starter items for a young product:
1. No CI (tests+typecheck+lint+build+dependency-audit) + no automated dependency updates — supply chain
   ungated before deploy (usually do this first).
2. Rate limiting is in-memory/per-instance (ineffective across serverless) on paid LLM/email routes.
3. Entitlement gates **fail OPEN** on DB error — make money/PII gates fail closed + reconcile from the source
   of truth.
4. Access/session tokens have **no expiry** (`exp`) + no refresh/revocation path.
5. Outdated framework/deps with open advisories — schedule the upgrade to clear the audit.
6. State-changing action over GET (link-scanners can trigger) -> POST/one-click.
7. Owner-access code in URL (lands in logs) -> off the query string + a real owner-login UI.
8. CSP tightening (nonce, drop `unsafe-inline`); narrow `img-src`; add `payment` to Permissions-Policy.
9. Full server-only split for the admin database client (runtime guard as an interim).

## Standing review triggers (auto-dispatch Cyrus)
Any change touching: auth/session, payments/entitlements, customer/PII data, the AI features, MCP wiring, or a
multi-tenant product. Plus a monthly posture + dependency sweep.
