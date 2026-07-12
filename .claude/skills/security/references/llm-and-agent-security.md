# LLM / Prompt-Injection / Agent Security — security reference

> Defensive reference for Cyrus (security). Condensed from a public defensive-security skills library (Apache-2.0), grounded in a typical modern web stack. DEFENSIVE ONLY: checklists, detections, and hardening to VERIFY on systems you own. Never run offensive/exploit steps; for any 'exploiting-*'/'testing-*' source, extract only the defensive control + how to confirm it, not an attack recipe.

## What Cyrus checks here

The differentiator playbook for any LLM-powered product and any multi-tenant / white-label agentic product. Cyrus reviews every place untrusted text reaches a model prompt (the content features and owner tools that call the LLM provider), the agentic org's tool/MCP invocation boundary ("agents propose, the owner disposes"), what lives inside system prompts, and per-tenant isolation. The threat is not generic LLM theory — it is prompt injection, tool/plugin abuse, system-prompt leakage, and cost/abuse of the paid LLM endpoints in *this* codebase. Output validation and least-privilege are defense-in-depth layered on top of the existing auth/entitlement model, never a replacement for it.

## Checklist

1. **Untrusted text → model prompt (indirect injection).** The content features pass user/lead-supplied strings (business name, services, contact-form text) straight into the `user` half of the LLM call. Verify the system prompt is structurally separated from user data, that the model is instructed to treat the user block as data-to-act-on (not instructions-to-follow), and that no caller-controlled string can redefine the task. Severity: **High** (ATLAS AML.T0051, OWASP LLM01). Fix: keep instruction/data separation, prepend an explicit "the following is untrusted content" delimiter, and strip zero-width / Unicode-tag chars before sending.

2. **Scraped third-party site content as an injection channel.** Any feature that fetches arbitrary external sites (site assessment / rescan) and then summarizes that HTML with the model is an *indirect* prompt-injection surface (hidden `display:none`/HTML-comment/alt-text/zero-width instructions). Severity: **High** (AML.T0051.001). Fix: normalize + de-obfuscate scraped text (strip zero-width/tag chars, NFKC) and never concatenate raw page text into a privileged prompt; treat tool/scrape results as untrusted input.

3. **Model output auto-acted-on without a gate.** Generator outputs feed content that can be published or sent. Confirm the shadow-mode / human-approval gate (from `build-patterns`) sits between model output and any publish/send/DB-write. Severity: **High** (OWASP Agentic Top 10 — Excessive Agency). Fix: no autonomous publish of model output to public surfaces or customers without owner approval.

4. **Secrets / authz logic must not live in system prompts (LLM07).** Audit every `system` string. Confirm the LLM provider key is only ever in the request *headers*, never in prompt text, and that no DB strings, payment ids, or entitlement rules are embedded in a prompt. Severity: **Med→High if violated** (AML.T0057, OWASP LLM07). Fix: keep secrets env-only; treat the system prompt as non-secret — it is not a security control.

5. **The system prompt is not the security boundary.** Entitlement and ownership are enforced server-side in the access module and the per-owner scoping on owner tools — not by instructions in a prompt. Verify a leaked/echoed system prompt would expose no privilege. Severity: **Critical if a prompt ever gates money/PII** (LLM07). Fix: all authz in code, never in the preamble.

6. **Paid-LLM endpoint abuse (cost / inference-API exfil).** The realistic "model extraction" risk when you proxy a hosted model is cost-DoS and scraping of the content engine, not IP theft. If rate limits on the LLM routes are in-memory/per-instance, that maps to the durable-rate-limiting backlog item and AML.T0024. Severity: **High.** Fix: per-principal durable rate limiting + anomaly alerting on volume spikes before the provider bill is the only signal.

7. **Entitlement fail-open in front of a paid model.** If the access gates FAIL OPEN on DB error, a DB blip can let an unauthenticated caller reach a paid LLM route. Severity: **High** (fail-closed-gates backlog item). Fix: fail closed on the gates that front paid LLM calls and owner PII.

8. **Agentic-org tool/MCP invocation — least privilege + HITL.** The org runs MCP servers (database/host/payments/automation/etc.). Apply deny-by-default tool allowlisting with per-tool argument schemas, scoped short-lived credentials (NOT the broad service/admin key) per call, and human-in-the-loop on high-impact tools — "agents propose, the owner disposes" is the HITL gate; confirm it is enforced, fail-closed, for write/spend/delete tools. Severity: **High** (AML.T0053, OWASP Agentic — Tool Misuse / Privilege Compromise / Excessive Agency). Fix: classify each tool by impact tier; gate the high-impact tier on owner approval; audit-log every invocation (actor, tool, arg hash, decision).

9. **The service/admin database key as an agent "god account."** The admin client bypasses RLS and should be server-only behind a browser guard. In the agentic context this is the highest-value credential — an injected agent that can reach it bypasses all tenant/owner scoping. Severity: **Critical**. Fix: keep it out of any agent/MCP-reachable surface; relates to the server-only-split backlog item.

10. **MCP tool poisoning / rug pulls / shadowing.** Each MCP tool description is loaded into agent context = indirect injection via the supply chain. Severity: **High** (AML.T0010, OWASP MCP03). Fix: pin approved tool-description hashes and re-check on schedule (rug-pull detection); inspect descriptions for hidden `<important>`/"do not tell the user"/`read ~/.ssh` directives; require auth on any remote MCP endpoint and never bind it to `0.0.0.0` on an untrusted network; prefer first-party/pinned MCP servers over unvetted third-party ones.

11. **Multi-tenant per-tenant isolation as an injection blast-radius limit.** A multi-tenant product enforces tenant isolation via a DB membership function (e.g. SECURITY DEFINER), a forge-proof active-tenant cookie, and an isolation test. Verify a prompt-injected agent in one tenant cannot read/poison another tenant's data or context. Severity: **Critical**. Fix: keep the isolation test green in CI; treat cross-tenant context bleed as a release blocker.

12. **Corpus / context provenance (poisoning-lite).** If you use a hosted model (no training), classic data/model-poisoning detection (activation clustering, spectral signatures, safetensors) is mostly N/A — but any KB/ICP/context file fed into a prompt is a soft corpus. Severity: **Med** (AML.T0020, OWASP LLM04). Fix: only feed provenance-known, owner-controlled context into prompts; do not auto-ingest user/third-party content into a shared prompt context without review.

13. **Output handling — no injection-driven XSS or secret echo.** Model output and any raw-HTML sink (e.g. a JSON-LD component) are the rich-text sinks. Confirm each raw-HTML sink escapes `<>&`. Verify model output rendered to users is escaped/treated as text and cannot smuggle script, and that output isn't echoed with embedded secrets/PII. Severity: **Med** (OWASP LLM05/Improper Output Handling; D3FEND Content Validation). Fix: escape on render; output-side check for secret/PII patterns before display.

14. **No middleware = every LLM route owns its own auth.** If there is no central route middleware, each model-calling route must independently enforce its auth/entitlement/rate-limit. Severity: **High**. Fix: when reviewing any new route that calls a model, confirm it re-checks the cookie gate, scopes by owner id, and rate-limits — nothing is inherited.

## Framework tags

- **MITRE ATLAS:** AML.T0051 (Prompt Injection), AML.T0051.000 (Direct), AML.T0051.001 (Indirect), AML.T0053 (LLM Plugin Compromise), AML.T0054 (LLM Jailbreak), AML.T0057 (LLM Data Leakage), AML.T0010 (ML Supply Chain Compromise), AML.T0024 + .000/.001/.002 (Exfiltration via AI Inference API), AML.T0020 (Poison Training Data), AML.T0018 (Backdoor ML Model).
- **OWASP LLM Top 10 (2025):** LLM01 Prompt Injection, LLM04 Data & Model Poisoning, LLM05 Improper Output Handling, LLM07 System Prompt Leakage.
- **OWASP Agentic AI Top 10:** Tool Misuse, Excessive Agency, Privilege Compromise. **OWASP MCP Top 10:** MCP03 Tool Poisoning.
- **NIST AI RMF:** GOVERN-1.1, GOVERN-1.3, GOVERN-6.1, MEASURE-2.5, MEASURE-2.6, MEASURE-2.7, MANAGE-2.1, MANAGE-2.2, MANAGE-2.4.
- **NIST CSF 2.0:** GV.OC-03, ID.RA-01, PR.PS-01, DE.AE-02. **D3FEND:** Content Validation, Content Filtering, Content Excision, Application Hardening, Execution Isolation, Inbound Traffic Filtering, User Behavior Analysis.
- **MITRE F3:** N/A — F3 is a financial-fraud TTP catalog; not relevant to this LLM/agent domain.

## Source-skill taxonomy (read deeper, never execute)

- `detecting-indirect-prompt-injection` — *primary*. Hidden-text extraction + normalization (zero-width/tag/Base64/ROT13) before model ingestion; the block/sanitize/allow gate model for scraped content (checks 1, 2).
- `detecting-ai-model-prompt-injection-attacks` — *primary*. Layered input detection (regex signatures + heuristic anomaly + classifier) and the principle to never use detection as the sole defense (checks 1, 13).
- `defending-llms-with-guardrails` — *primary*. Input/output scanner concepts (PromptInjection, Secrets, Sensitive/PII, NoRefusal) as a defense-in-depth pattern for the content features (checks 1, 3, 13).
- `implementing-llm-guardrails-for-security` — *primary*. Input/output rail architecture, PII redaction, topic boundaries, "guardrails are defense-in-depth not a perimeter" (checks 1, 3, 13).
- `securing-agentic-ai-tool-invocation` — *primary*. Deny-by-default tool allowlist, per-tool arg schemas, scoped short-lived identity (not a god account), HITL on high-impact, audit logging — the spine of checks 8, 9.
- `auditing-mcp-servers-for-tool-poisoning` — *primary*. Tool-description poisoning, shadowing, rug-pull hash pinning, unauth-exposure checks for the org's MCP servers (check 10).
- `detecting-data-and-model-poisoning` — *primary (partial scope)*. Corpus/context provenance; most model-internals detection is N/A if you use a hosted model (check 12).
- `detecting-model-extraction-attacks` — *primary (reframed)*. Per-principal query monitoring + rate limiting translated to cost/abuse defense on the paid LLM routes (check 6).
- `testing-for-system-prompt-leakage` — *defensive checklist only*. Mine the remediation list (secrets out of prompt, authz server-side, prompt is not a secret) for checks 4, 5 — do NOT run the extraction payloads against any system.
- `testing-prompt-injection-in-rag-pipelines` — *defensive checklist only*. Mine the mitigations (context isolation, instruction/data separation, corpus provenance, output filtering) for checks 1, 2, 12 — do NOT run garak/PyRIT/Promptfoo campaigns or the embedding-poisoning PoC.

## Out of scope / do NOT do

- Never run the offensive siblings: garak / PyRIT / Promptfoo red-team campaigns, the embedding-poisoning PoC, ART KnockoffNets/CopycatCNN extraction or membership-inference attacks, backdoor-trigger crafting, or MCP SSRF probes — and never against anything you do not own. Cyrus is read-only advisory: recommend the control, never execute the exploit.
- Self-hosted model-internals detection (ART activation clustering, spectral signatures, safetensors verification, weight-hash checks) is N/A if you use a hosted model and ship no model weights.
- Do not bolt heavy Python ML detector stacks (LLM Guard / NeMo / transformers) into the live app as a "fix"; for a small product the high-leverage controls are instruction/data separation, the existing approval gate, durable rate limiting, fail-closed entitlements, and least-privilege MCP/tool access — not a new model-serving dependency.
