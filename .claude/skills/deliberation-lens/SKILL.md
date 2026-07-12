---
name: deliberation-lens
description: Run any hard reasoning, design, or architecture problem through a premium deliberation protocol — deeper alternative generation, taste judgment, system-level framing, and calibrated confidence — so the company gets top-tier thinking on the calls that matter. Use whenever the task is architecture-level design, a one-way-door decision, a creative-direction call, a spec or strategy synthesis, a "what's the right way to structure this" question, or any judgment-heavy dispatch that a premium seat (design, growth, product, anti-slop, CEO-twin, or chief-of-staff lanes) would own. Triggers include "think this through deeply", "architecture decision", "design the system", "premium reasoning pass", "use the deliberation lens". Not for routine execution, mechanical edits, or content-lane writing.
---

# Deliberation Lens — the deliberation protocol

The gap between a top-tier answer and a merely-good one is rarely knowledge. It is **how much
genuine deliberation happens before committing**, and the taste applied when committing. This skill
makes that deliberation explicit so a capable model reproduces most of the edge.

## Model routing (do this first)

1. Run on your most capable model at **maximum reasoning effort** — never silently downgrade below
   that for work that qualifies for this skill.
2. Follow the protocol below either way. The protocol IS the product; the model is the engine.

## The protocol

Work through these phases in order. The discipline that matters most: **do not let the first good
idea terminate the search.** The most measurable edge of a premium pass is that it keeps generating
after the point where a weaker pass would have committed.

### 1. Frame at the right altitude

State what is actually being decided, one level higher than asked. A component question usually
hides a system question; a copy question hides a positioning question. Name the invariants (what
must stay true no matter which option wins) and the actual constraint that binds — not the list of
constraints, the binding one. If the problem decomposes into independent decisions, split them now
and treat each separately; entangled decisions are how mediocre designs sneak through.

### 2. Generate real alternatives (minimum three, one unreasonable)

Produce at least three genuinely different approaches — different in kind, not in parameter. Force
one to be the "unreasonable" option: delete the feature, invert the dependency, buy instead of
build, do nothing. It usually loses, but it re-anchors the space and regularly donates one idea to
the winner. For each: the strongest honest case FOR, the failure mode that kills it, and what new
information would change its rank.

### 3. Argue against your favorite

Before committing, switch sides: write the 3-sentence memo a smart skeptic would send about the
leading option. If the rebuttal requires new facts, go get them (read the code, query the data,
check the config) rather than reasoning past them. An option that survives its own prosecution is a
decision; one that hasn't been prosecuted is a preference.

### 4. Commit with taste

Apply the house taste rules when choosing and shaping the winner:
- **Subtraction first.** When unsure, delete it. The premium read comes from what is absent —
  fewer concepts, fewer knobs, fewer words.
- **One owner per behavior.** Any design where two mechanisms can claim the same job is a bug
  factory; merge or delete one.
- **Boring core, distinctive edge.** Novelty budget goes to the one thing users/buyers will feel;
  everything else follows the existing pattern in the codebase or brand system (ground the brand
  read in `company.yml` → `brand`).
- **Honest by construction.** No design that requires fabricated data, dead controls, or claims
  that outrun the evidence — restructure so the honest version IS the impressive version. Ground
  any customer or market claim in the ICP research doc (`company.yml` → `icp.research_doc`); if it
  is missing, run ICP research first — never invent customer facts.

### 5. Ship the reasoning, not just the verdict

Deliver: the decision in one sentence → why, in terms of the binding constraint → the considered
alternatives with one-line kill reasons → what would change the call (a concrete tripwire, not
"new information") → confidence as `N/10` with a `[low-high]` interval. If the work is a
design/spec, include the smallest reversible first step so execution can start without
re-litigating the whole.

## Calibration notes (why this works)

A strong model run cold tends to: commit to the first coherent frame, generate alternatives that
are the same idea at three sizes, and inflate confidence on aesthetic judgments. Each protocol
phase exists to counter one of those specific failure modes — phase 2 counters
same-idea-three-sizes, phase 3 counters premature commitment, phase 5's interval counters aesthetic
overconfidence. Skipping a phase re-opens the specific gap it closes.

## Companion agent

For dispatched work, use the `deliberation-lens` agent (`.claude/agents/deliberation-lens.md`) — it
carries this protocol as its system prompt and is pinned to a capable model so it always runs.
