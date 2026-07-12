# Security Review — <surface / feature / diff>

> **Defensive review, not a penetration test or a guarantee.** Produced by `security` / the `security-engineer`
> agent ("Cyrus"), an AI advisory function — a proportionate CISO-in-a-box for a small live product. It reviews
> your own code/infra; it does not run offensive tooling and does not rotate secrets, deploy, or change
> anything. Findings are recommendations; the engineer owns the fix + deploy, the owner approves.

The structured format Cyrus returns for any security review. Fill every section; write "none" / "n/a" rather
than omitting.

---

**Scope:** <what was reviewed — files / routes / feature / dependency set / the whole surface>
**Requested by / date:** <who · YYYY-MM-DD>
**Playbook(s) applied:** <appsec-and-api / supply-chain-and-secrets / data-and-rls / payments-and-abuse / llm-and-agent-security / incident-response / posture-and-compliance>
**Verdict:** <SHIP / SHIP-WITH-FIXES / BLOCK> — *Critical/High findings are deploy-blocking until owner-accepted-with-rationale or fixed.*

## Findings

For each finding:

- **[Critical | High | Medium | Low] <finding title>**
  - **What it is:** <the weakness in plain terms>
  - **Where:** `path/to/file.ts:Lnn` (+ any related locations)
  - **Exploitability / impact:** <how an attacker reaches it + what they get; note if an existing control already mitigates>
  - **Fix:** <the concrete, proportionate remediation> — **Owner:** <engineer / specific>
  - **Framework:** <OWASP A0x / API0x / LLM0x, MITRE ATT&CK Txxxx / ATLAS AML.Txxxx, NIST CSF func, MITRE F3 — where it adds a checkbox; source + date if a live CVE/advisory>

*(Repeat per finding. Order Critical -> Low.)*

## Controls verified (the good)

<What the app already does right that this review confirmed still holds — so the owner sees the existing
posture, not just gaps. e.g. per-route auth present, signed cookie unforgeable, server-side price, webhook sig
verified, SSRF-guarded fetch intact, RLS enabled on the anon-reachable table.>

## Recommended action + backlog

<Prioritized next steps. Distinguish "deploy-blocking, fix or accept now" from "Medium/Low -> security
backlog". Map any finding that matches an existing backlog item.>

## Sources & date checked

- <advisory / CVE / authority + URL> — checked <YYYY-MM> *(for any live-threat claim)*

## Residual risk & uncertainty

<State confidence. Call out what you could NOT verify (e.g. live RLS state in the database, runtime env
values), where the analysis depends on facts you don't have, and where you treated uncertainty
conservatively.>
