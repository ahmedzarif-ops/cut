---
name: proof-miner
description: >-
  Mine your company's real operating exhaust into honest content seeds — turn shipped deploys, closed
  decisions, reversals, gate catches, run outputs, and CLAUDE.md Lessons into DATED, SOURCED seeds for a
  proof-inventory ledger and route them to the growth lead (Mark) and creative lead (Iris). Use whenever
  the work is finding real proof to make content from, feeding the demonstration-proof lane, or turning
  what you actually did into teachable/marketable moments: "mine our proof", "what can we make content
  from this week", "find proof for the course/social", "harvest the decision ledger", "what did we ship
  that's worth showing". Capture-don't-create: strictly never-fabricate (every seed cites a real event;
  empty = NO DATA), draft-only (owner + the compliance/slop gates approve anything external). Not for
  external research (that's market-radar / deep-research) and not for publishing.
---
<!-- learning-loop: required -->

# Proof Miner — turn what you really did into honest content seeds

An un-fakeable wedge for a real agentic org is **live demonstrated proof at a volume no solo human can
match**. A working agent org throws off proof-bearing moments constantly; the mistake is letting them
evaporate. This skill harvests them so content is a BYPRODUCT of operating, never a fabrication. It feeds a
proof-inventory ledger at `<kb_dir>/proof-inventory.md` (the demonstration-proof ledger; sibling to any
state-once claim register you keep) — where `kb_dir` is the value in `company.yml` → `kb_dir` (default `kb/`).

## Method
1. **Scope.** Decide the window (default: since the last mine — check the ledger's last entry date) and
   which streams to mine (all, or a named one).
2. **Mine.** Dispatch the **`proof-miner`** agent (Agent tool, `subagent_type: proof-miner`, read-only) over
   the file streams below; if that agent isn't wired up yet, run the mine inline. It returns draft seed rows
   plus a per-seed honesty citation, or **NO DATA** per empty stream. Streams to mine:
   - **The decision ledger** your CEO Twin writes (closed decisions, and especially reversals).
   - **Town-hall / yap digests**, if you run them.
   - **Session handoff logs** (written by the handoff-refresh skill).
   - **`CLAUDE.md` `## Lessons`** — every logged correction is a candidate teaching moment.
   - **Reports / run outputs** from your engines and gates (a gate catch is proof the guardrails work).
   - (A call-recording source — e.g. a tool like Fathom, wired to its MCP — is a documented FUTURE stream;
     add it once the agent is granted access.)
3. **Stage for review.** Append the returned seeds to `<kb_dir>/proof-inventory.md` under a dated
   `## Draft seeds — YYYY-MM-DD (REVIEW)` heading — never straight into the clean ledger rows. Flag any
   seed containing secrets/PII/real names as `NEEDS REDACTION` so it can't leave internal until curated.
4. **Route + gate.** Summarize the top seeds for the growth lead (Mark) and creative lead (Iris). Anything
   that becomes external content goes through the compliance/claims gate (Gus) + the anti-slop gate (Vera)
   + owner approval — this skill never publishes.

## Hard rules
- **Never-fabricate.** Every seed traces to a real, dated, citable event. Reject anything speculative or
  not-yet-true. An empty week is NO DATA, not padding.
- **Capture, don't create.** The proof is harvested from what actually happened, not written to sound good.
- **Draft-only + owner-gated.** Seeds are proposals; the owner + the content gates decide what ships.
- **Redaction.** Flag secrets/PII/real names as `NEEDS REDACTION` before anything leaves internal.

Capture what works in `learnings.md`. Register in `.claude/skills/INDEX.md`.
