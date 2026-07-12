---
name: grill
description: Stress-test a plan, design, or decision through a relentless one-question-at-a-time interview BEFORE building. HARD RULE - this protocol is DEFAULT-ON for EVERY brainstorm, interview, planning, or town-hall session the owner prompts, without them asking; also fires on "grill me", "grill this plan", "stress-test this", "poke holes in this", "interview me about this", "are we sure about this design", and the brainstorm+plan steps of any ship-a-feature run. Not for executing plans (use the build loop) or for retrospective review (use the gates).
---

# Grill

A relentless interview that walks a plan's design tree until owner and agent share the same understanding. Adapted from Matt Pocock's `grilling` skill (github.com/mattpocock/skills, MIT-licensed pattern).

Address the owner by name throughout (from `company.yml` -> `owner.name`), and pitch every question at their level (`company.yml` -> `owner.is_technical` and `brand.voice`).

## The protocol

1. **Map the design tree first (silently).** Every plan branches into decisions, and decisions depend on each other. Order the questions in dependency order — an early answer reshapes which questions come next, so never fire a bulk list.
2. **One question at a time.** Ask via `AskUserQuestion`, wait for the answer, then decide the next question from the updated tree. Multiple questions at once is bewildering and loses the tree structure.
3. **Every question carries a starred recommendation.** Present 2-4 concrete options with the recommended one FIRST, labelled "(Recommended)", with the why in its description. If the owner is non-technical (`owner.is_technical: false`): plain English, real trade-offs, no jargon. On important calls attach a confidence rating (1-10, decimals allowed).
4. **Facts are looked up, never asked.** Anything the codebase, your codebase index, the handoff, the decision ledger, or the knowledge base (`company.yml` -> `kb_dir`) can answer, go find (query the code index FIRST, grep as fallback). Only DECISIONS go to the owner — the decisions are theirs.
5. **Do not build until they confirm.** The stop condition is the owner explicitly confirming shared understanding. Then write the outcome down: fold the decisions into the spec/plan doc, and log owner decisions of consequence to the CEO-Twin ledger (the `ceo-twin` skill).

## The three modes (HARD RULE — for the best outputs)

1. **GRILL THE OWNER (default-on).** Every brainstorm/interview/planning ask from the owner opens in this
   protocol — they never have to invoke it. In town-hall sessions and multi-seat brainstorms, the SEATS
   grill them: the CEO Twin + the main session + the growth lead (Mark) + the creative director (Iris) +
   whichever specialists the topic touches each contribute questions, but the questions still arrive ONE AT
   A TIME through a single interviewer voice, tagged with the asking seat ("[Mark] ..."), in dependency
   order across all seats — never parallel question firehoses.
2. **AGENTS GRILL EACH OTHER (plan-time).** In any planning workflow/fan-out, each seat's draft plan or
   position is cross-examined by at least one other relevant seat before synthesis (design a critic stage
   into the workflow, or pipeline seat A's output through seat B with a refute-or-sharpen brief). What
   survives cross-examination reaches the owner; dead disagreements surface as grill questions with both
   sides. **Anonymize the cross-review** (Karpathy LLM-Council pattern, github.com/aiwithremy/claude-skills-llm-council):
   reviewers see the drafts as randomized "Response A/B/C…" with authorship stripped, so no seat defers to
   another seat's authority — positions win on merit only. Each reviewer answers three things: strongest
   response + why, biggest blind spot, and what ALL drafts missed. De-anonymize only at synthesis.
3. **DEEP MODE — adversarial consensus (big/one-way-door builds).** Below.

## Deep mode — adversarial consensus (big builds only)

For a large or one-way-door build, after the interview produces a draft plan: hand the plan to an
independent adversarial reviewer (a separate external review agent) for a critique, fold, and iterate to
consensus (cap 3 rounds — if no consensus by then, surface the disputed points to the owner as a grill
question). This runs BEFORE the build starts, distinct from the standing post-build adversarial review gate.

## Council additions (LLM-Council fold)

- **The Outsider seat.** For any decision on a PUBLIC-FACING surface (product/course naming, landing copy,
  offers, ads), add one zero-context reviewer seat: it gets ONLY the artifact/question, none of the
  internal company context, and reports what confuses fresh eyes. Every in-house seat carries the curse of
  knowledge; the Outsider is the only seat that can catch it (a jargon product name that "means nothing to
  a non-technical buyer" is exactly the class of miss). Internal-only decisions skip it.
- **Synthesis verdict structure.** Multi-seat syntheses end in five parts: (1) where the seats AGREE
  (independent convergence = high confidence), (2) where they CLASH (present both sides, never smooth
  over), (3) blind spots caught only in cross-review, (4) ONE recommendation (never "it depends"; the
  synthesizer may side with a lone dissenter if their reasoning is strongest), (5) ONE first step — a
  single concrete action, not a list.

## House rules that override the upstream pattern

- Questions and options in the owner's language (ground in `company.yml` -> `brand.voice` and
  `owner.is_technical`); their taste calls get a visual concept board, never a text-only question — 2-3
  styled mocks they can tap, because gate scores measure craft, not their taste.
- The interview never substitutes for the specialist gates (compliance-review, legal, creative-director,
  security, slop-check, clean-code-review) — it sharpens the plan those gates will still review.
- Respect the terse-output economy: the tree walk is thorough, the words are lean.
