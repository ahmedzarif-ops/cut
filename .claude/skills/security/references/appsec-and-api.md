# Pre-deploy AppSec + API security — security reference

> Defensive reference for Cyrus (security). Condensed from a public defensive-security skills library (Apache-2.0), grounded in a typical modern web stack. DEFENSIVE ONLY: checklists, detections, and hardening to VERIFY on systems you own. Never run offensive/exploit steps; for any 'exploiting-*'/'testing-*' source, extract only the defensive control + how to confirm it, not an attack recipe.

## What Cyrus checks here

The pre-deploy application + API security pass for the live web app. It reviews authorization (every owner route + per-user data scoping), input/output handling (XSS, SQLi, prototype pollution, mass assignment), the SSRF egress guard, security headers + cookies, secret/PII exposure to the browser, webhook/cron authentication, and "shadow" API routes that ship without an auth check. **First, establish the app's auth model:** does it have central route middleware, or does every API route enforce its own auth? If there is no middleware, the central question becomes "does each route, individually, authenticate AND scope to the right user?" — audit every route file.

## Checklist (adapt file paths to your app)

1. **Every privileged route checks the entitlement gate (BFLA / vertical priv-esc).** Owner/admin tools must gate on the privileged session cookie via your access/entitlement module. Grep all API route files for one that reads owner data without an entitlement check. If there is no middleware fallback, a missing check = **Critical**. Fix: add the entitlement check at the top of the handler. (OWASP API5:2023.)

2. **Every owner query is scoped to the owner's id derived from the cookie (BOLA/IDOR).** Confirm each query filters by the session id derived **from the verified cookie**, never from a client-supplied id in the URL or body. If a handler reads request params for the owning id instead of re-deriving it server-side, that is an IDOR. **Critical**. Fix: derive the owner key from the verified cookie only; reject requests where body/query id ≠ cookie-derived id. (OWASP API1:2023.)

3. **Entitlement gates fail CLOSED on money/PII paths.** A common shortcut is to **fail OPEN on DB error** so a DB blip never locks out a paying user. Verify any deliberate-open scope is limited to non-sensitive reads; any route exposing PII (contacts/phone) or gating money must move to fail-closed + reconcile from the source of truth. **High**. (Maps to a backlog item — see the threat-model template.)

4. **Signed-cookie integrity: algorithm + secret strength + expiry.** If auth is an HMAC-signed cookie minted from a cookie-signing secret, confirm: (a) the verifier pins the algorithm — a fixed HMAC compare, never honoring a client-chosen alg/`none`; (b) the signature compare is constant-time; (c) the secret is ≥256-bit and not a guessable string; (d) tokens carry an `exp` — no expiry = a stolen cookie is valid forever. Missing expiry/revocation is **High**.

5. **All user-supplied URL fetches go through the SSRF guard.** The model control: an allowlisted-scheme fetch (http/https + standard ports, DNS-resolves and rejects private/reserved IPs, re-validates every redirect hop, byte cap). Grep for raw `fetch(`/`axios`/`undici` on any user-influenced URL (site scan/rescan, webhook-style features) that bypasses the guard. Any bypass = **Critical** (cloud-metadata/internal-network exposure). Fix: route through the guard; keep redirect re-validation and the private-IP denylist.

6. **No mass-assignment of privileged fields.** Verify no handler spreads `req.body` straight into a DB write (`...body`, `Object.assign`). Sensitive fields — tier/entitlement, price, coupon, payment ids, owner key — must be set server-side, never accepted from the client. **High**. Fix: explicit field allowlists on every insert/update. (OWASP API3 / API6:2023.)

7. **Price/coupon/quantity computed server-side; webhook is idempotent (business logic).** Confirm prices are derived server-side (client cannot set price/coupon) and that webhook handling is idempotent (replayed events don't double-grant access/credits). **High**. Tie to durable rate-limiting for sensitive flows.

8. **XSS surface stays minimal; CSP hardening tracked.** Enumerate every `dangerouslySetInnerHTML` (or equivalent raw-HTML sink) — confirm each escapes `<>&` and is the *only* one intended. CSP/HSTS/X-Frame/nosniff/Referrer-Policy live in your app config; a CSP that still allows `unsafe-inline` is **Med** (drop `unsafe-inline`, move to nonce). Auth cookies stay `HttpOnly` so a stored-XSS can't read them.

9. **Security-headers + cookie-flags audit.** Verify in your app config/responses: HSTS ≥1-year, `X-Frame-Options: DENY` (or CSP `frame-ancestors`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, no `Server`/`X-Powered-By` version leak. Auth cookies must carry `Secure` + `HttpOnly` + `SameSite`. **Med**.

10. **No CORS origin-reflection on authenticated routes.** If the app is same-origin, confirm no API route sets `Access-Control-Allow-Origin: *` (or reflects arbitrary `Origin`) **with** credentials. Exact-match allowlist only, never regex/substring, never `Origin: null` with creds. **Med** (Critical if an owner route reflects origin). (OWASP A01.)

11. **Redirect targets are validated (open redirect).** Any redirect param must validate against an allowlist of internal paths and reject external/`//`/`\` and encoded hosts. **Med**. Watch the common offenders: unsubscribe-over-GET and owner-access-code-in-URL.

12. **SQLi: parameterized only; admin/service key contained.** Database client calls are parameterized — verify no raw string-concatenated SQL or `.rpc()` built from interpolated user input. The service/admin key bypasses RLS and must be used **only** server-side behind a browser guard. **Critical** if the admin client is reachable client-side.

13. **Prototype pollution in JSON handling.** If any handler deep-merges user JSON, confirm `__proto__`/`constructor`/`prototype` keys are stripped (or `Object.create(null)`/`Map` used) and merge libs are current. **Med**. Fold dependency currency into the CI/dependency-update backlog.

14. **Machine-to-machine auth on webhooks/cron is verified.** Confirm each inbound callback verifies its signature/secret with a constant-time compare: payment webhook via signature construction (raw body), telephony via provider validation, cron via a Bearer secret. Any unauthenticated/forgeable callback = **Critical**.

15. **No secrets or PII over-exposed to the browser (sensitive-data).** Only public-prefixed env (`NEXT_PUBLIC_*` or your framework's equivalent) may reach the client — grep the bundle/source for service/admin keys, payment secrets, the cookie-signing secret, or PII leaking into client code or API responses (return only needed fields; never password/secret/internal-id). Add `Cache-Control: no-store` on PII/owner endpoints. Add CI secret scanning (gitleaks/trufflehog). **High**. (OWASP A02; NIST AI RMF MEASURE-2.7.)

16. **Shadow / unauthenticated routes inventory.** With no middleware, a newly added route file can ship with no auth and silently. Enumerate all route files and confirm each maps to an intended auth tier (public / user / owner / webhook / cron). An undocumented or auth-less route = **High**. Fix: a route-inventory check in CI that flags any handler missing a known auth call. (OWASP API9:2023 Improper Inventory.)

## Framework tags

- **OWASP Top 10 (2021):** A01 Broken Access Control, A02 Cryptographic Failures, A03 Injection, A04 Insecure Design, A10 SSRF.
- **OWASP API Security Top 10 (2023):** API1 BOLA, API2 Broken Authentication, API3/API6 Object-Property-Level Auth & Mass Assignment, API4 Unrestricted Resource Consumption, API5 BFLA, API7 SSRF, API9 Improper Inventory.
- **MITRE ATT&CK:** T1190 (Exploit Public-Facing App), T1059.007 (JS), T1505.003 (Web Shell), T1083 (File/Dir Discovery), T1068 / T1548 (Priv-Esc), T1552.001 (Creds in Files), T1027 / T1070 (Obfuscation/Indicator Removal).
- **NIST CSF 2.0:** PR.PS-01, ID.RA-01, PR.DS-10, DE.CM-01.
- **NIST AI RMF (data exposure):** MEASURE-2.7, MAP-5.1, MANAGE-2.4. **MITRE ATLAS:** AML.T0070, AML.T0066, AML.T0082.

## Source-skill taxonomy (read deeper, never execute)

- `testing-for-broken-access-control` — primary; vertical/horizontal/function/multi-tenant access matrix → checks 1-3.
- `testing-api-for-broken-object-level-authorization` — defensive checklist only; per-object auth = scope-by-owner-id (check 2).
- `exploiting-broken-function-level-authorization` — defensive checklist only; confirm admin/owner endpoints enforce role (check 1).
- `exploiting-idor-vulnerabilities` — defensive checklist only; predictable-id endpoints must re-derive owner (check 2).
- `exploiting-mass-assignment-in-rest-apis` — defensive checklist only; field allowlists on writes (check 6).
- `testing-for-business-logic-vulnerabilities` — defensive checklist only; server-side price + idempotency (check 7).
- `testing-for-xss-vulnerabilities` — defensive checklist only; output encoding, CSP, HttpOnly (check 8).
- `exploiting-server-side-request-forgery` + `performing-ssrf-vulnerability-exploitation` — defensive checklist only; allowlist + private-IP block + IMDSv2 = the SSRF guard (check 5).
- `testing-cors-misconfiguration` — primary; strict-allowlist, no origin reflection (check 10).
- `testing-for-open-redirect-vulnerabilities` — defensive checklist only; redirect allowlist (check 11).
- `exploiting-sql-injection-vulnerabilities` — defensive checklist only; parameterized queries (check 12).
- `exploiting-prototype-pollution-in-javascript` — defensive checklist only; strip `__proto__`, current deps (check 13).
- `testing-for-json-web-token-vulnerabilities` + `testing-jwt-token-security` — defensive checklist only; alg-pinning, strong secret, exp/revocation → signed cookie (check 4).
- `testing-oauth2-implementation-flaws` — defensive checklist only; redirect-URI exact match, state, PKCE, single-use code (applies to any OAuth / MCP / agent token layer).
- `testing-api-authentication-weaknesses` — primary; token entropy, revocation, rate-limited auth (checks 4, 14).
- `performing-security-headers-audit` — primary; HSTS/CSP/frame/cookie-flag audit (check 9).
- `testing-for-sensitive-data-exposure` — primary; secrets-in-bundle, response over-exposure, CI secret scan (check 15).
- `testing-api-security-with-owasp-top-10` — primary umbrella; per-API1-10 coverage map.
- `detecting-shadow-api-endpoints` — primary; route inventory + registration governance (check 16).

## Out of scope / do NOT do

- Never run the offensive siblings (`exploiting-*`, `performing-ssrf-vulnerability-exploitation`, `sqlmap`/Burp Intruder/`ffuf`/hashcat against live infra) — Cyrus is read-only/advisory. Extract the control + how to confirm it, never an attack against production.
- No raw card/PCI deep-dive if your payment processor owns most PCI scope (SAQ-A) and you never touch raw cards.
- Skip buyer-flow OAuth/login testing if buyers never log in; apply OAuth checks only to any real token layer (a multi-tenant product / MCP-server token layer), not a stateless buyer cookie.
