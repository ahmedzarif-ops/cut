# Continuous discovery — Opportunity Solution Tree + JTBD switch interview

The analyst's method reference for the `interview-synthesis`, `opportunity`, and `experiment` modes.
Pattern-only adoption of Teresa Torres' Opportunity Solution Tree and the Jobs-to-Be-Done switch
interview, tuned to your real evidence sources. **Read-only:** the analyst runs the discovery *thinking* —
structures the tree, tags the forces, sizes and ranks opportunities, names the riskiest assumption and the
smallest test. It never builds, ships, or commits a roadmap; it hands a scored opportunity brief to the
Chief of Staff and the test design to the build loop. Pre-revenue rule holds: if a branch has no observed
evidence, label it `hypothesis` and name what would generate the evidence — never fabricate an interview, a
quote, or a usage number.

## Know which population you're synthesizing (one tree per population)

If your company serves more than one distinct customer population (e.g. an end-user *and* a buyer who is a
different person, or two unrelated segments), each has its own evidence stream and its own tree. **Never
blend two populations in one synthesis** — the jobs, forces, and language are different, and averaging them
produces a tree that fits nobody. Ground each tree in that population's own research doc (the primary one is
`company.yml` → `icp.research_doc`; keep any additional population docs under `<kb_dir>/product/`).

Be honest about how thin each stream is. A population you have *zero* logged conversations for is
`hypothesis` across the board until real transcripts graduate it: n≥3 consistent → `directional`; measured
telemetry/benchmark (from your data lead) → `measured`. Do not author buyer scripts or roadmap from an
unvalidated tree. An at-cost partner or a friendly is not a cold buyer — label evidence from them as such,
because they will tolerate friction and price a cold buyer will not.

## Opportunity Solution Tree (OST)

One tree per desired outcome. Four levels, top-down; solutions and experiments are cheap and disposable,
the outcome and the opportunity space are not.

```
        DESIRED OUTCOME  (one measurable outcome — the product's job, not a feature)
              |
   +----------+----------+
 OPPORTUNITY  OPPORTUNITY  OPPORTUNITY   (customer needs/pains/desires in THEIR words, from evidence)
     |
  +--+--+
 SOLN  SOLN                              (distinct ways to address ONE opportunity)
   |
 +-+-+
 EXP EXP                                 (smallest tests that de-risk the solution's assumptions)
```

**Level rules**
- **Desired outcome** = a customer/product outcome you can measure, framed as behavior change, not a
  business KPI and not a feature. Example: *"more of the leads they capture get followed up without the
  owner chasing every night."* (Revenue framing lives with RevOps — the tree stops at customer behavior.)
- **Opportunities** are needs, pains, and desires stated in the customer's own language, mined from
  evidence — never solutions in disguise. "I never know which leads are still alive" is an opportunity;
  "add a follow-up dashboard" is not. Structure the space (parent/child), dedupe, and keep it distinct
  from the market/competitor map (that's market-radar's).
- **Solutions** attach to exactly one opportunity. Generate 3+ per opportunity you intend to pursue so
  you're comparing, not committing to the first idea.
- **Experiments** sit under solutions and test the assumptions the solution depends on (see RAT below).

**How to build one (the analyst's pass)**
1. State the ONE desired outcome. If you can't measure it, it's not an outcome yet.
2. Populate the opportunity space from evidence cards only — each opportunity traces to a source row.
3. Prune: merge duplicates, drop opportunities with zero evidence to a "watch — insufficient evidence"
   list, flag any that are actually solutions and re-ask "what need does that serve?"
4. Pick the target opportunity by the sizing/ranking below — the tree makes the *choice* visible and
   defensible, it doesn't make it for you.
5. Only then branch into solutions + experiments. Hand the target opportunity + its test to the Chief
   of Staff / build loop; the analyst does not build the branch out.

Persist the tree inside the opportunity brief (`templates/opportunity-brief.md`) or the weekly VOC brief —
the brief's Evidence + Solution-Hypotheses + Smallest-Valuable-Test sections already mirror OST levels.

## JTBD switch interview

Reconstruct the timeline of a real switch — the moment a customer fired an old way and hired a new one —
to find the causal forces behind the decision. This is a *retrospective* technique: interview people who
recently switched, walk their actual timeline, never ask hypothetical "would you."

**The timeline of the switch** (probe each beat for what happened and what they felt):
1. **First thought** — the seed moment ("a competitor outbid me"; "I heard a tool could double throughput").
2. **Passive looking** — aware, not acting; what nudged them.
3. **Active looking** — a triggering event pushed them to actually evaluate (missed a big job; lost an account).
4. **Deciding** — what they compared, what tipped it, who else was in the room (partner, spouse, their own client).
5. **First use / consuming** — what "it worked" looked like in week one.
6. **Ongoing** — did the progress hold, or did they slide back to the old way.

**The four forces of progress** — tag every switch story on all four; progress happens only when
**Push + Pull > Anxiety + Habit**. Design and messaging (the growth/creative leads) act on these; the
analyst only diagnoses.

- **Push of the situation** — pain with the current way that makes it untenable (leads dying in silence,
  missed calls, a labor/margin squeeze). Ground the specifics in your ICP research doc.
- **Pull of the new solution** — the attraction of the new progress ("it follows up on every lead and I
  approve from my phone"; more capacity at the same margin).
- **Anxiety of the new** — fear/uncertainty about switching ("another tool I'll never log into," staff
  won't use it, distrust, claims outrunning proof, pricing that reads as nickel-and-diming). Anxiety is
  usually the real blocker — probe it explicitly, once per call, and record whether it surfaced unprompted
  vs prompted.
- **Habit of the present** — inertia and attachment to today's way (the notebook + phone contacts that
  "work fine," the current stack, or just hiring another junior).

**Running it on your sources**
- *Discovery / diagnostic calls:* the closest thing to a switch interview you run live. Tag each on the
  four forces + the primary pain + segment. Extract the exact push language for the growth lead; do not
  paraphrase into marketing voice.
- *Onboarding interview:* the richest source — the buyer just switched, memory is fresh, and if they resell
  to their own customers you can reach one tier down for a second switch story on the same account. Walk the
  timeline; capture verbatim.
- *Recorded conversations (call-recording tool):* tag each recorded conversation against the jobs + segment
  + verbatim objections within 48h. Only after real transcripts exist may copy quote "owner voice" — carry
  no quotes in the KB until they are real.

## Evidence cards

Every opportunity and every force-tag traces to at least one evidence card (`templates/evidence-card.md`):
source type + date + segment + lifecycle stage, the *exact* quote or measured behavior, supporting **and
contradicting** count, an `observed / inferred / hypothesis` label (per your `<kb_dir>/product/
evidence-taxonomy.yml`), and confidence. A tree branch with no card is a hypothesis, not a finding. Always
log disconfirming evidence — a card that only confirms is a red flag.

## Opportunity sizing + prioritization

Size directionally, then rank with the house rubric (`references/opportunity-scoring.md`).

- **Sizing** (directional, never a dollar figure — revenue math defers to RevOps): for the target
  opportunity estimate **reach** (how many in the segment hit this, from your segment lifecycle counts +
  discovery-call frequency) × **frequency** (how often the pain recurs) × **severity** (how much it costs
  them when it does). State it as a range with its evidence label, not a point estimate.
- **Ranking:** score with `references/opportunity-scoring.md`:
  `(evidence × severity × frequency × strategic_fit × expected_impact × reversibility) / (effort × operational_complexity)`.
  Apply the persistent **instant-win multiplier** (week-one felt win ×1.5 / mixed ×1.0 / compounding ×0.7)
  — many buyers judge value by what they feel this week, so a felt week-one win outranks background,
  long-horizon value between two otherwise-comparable opportunities. Record the immediacy tier and why in
  the score narrative; the multiplier never overrides the evidence, reversibility, or effort inputs.
- Outcomes map to a route, not always a build: build now / prototype-test first / solve via onboarding
  or docs / solve via messaging / route to Customer Success / route to Marketing / monitor / reject.

## Assumption mapping + the riskiest-assumption test (RAT)

Before any solution earns build time, surface the assumptions it *depends on to be true*, then test the
deadliest one cheaply — instead of building an MVP and discovering the killer assumption was false.

1. **List assumptions** across desirability (do they want it?), viability (does it work for the business?),
   and feasibility (can we deliver it?). For a new buyer population, viability assumptions often dominate
   and are the least evidenced — e.g. *"a cold buyer will pay market price"* (untested if your only data is
   an at-cost friendly).
2. **Map** each assumption on two axes: **importance** (if false, does the idea die?) × **evidence** (how
   much do we actually know?). The danger zone = high-importance + low-evidence. That corner holds your
   **riskiest assumption**.
3. **RAT** — design the *smallest* test that could prove the riskiest assumption false, define the signal
   that would disprove it up front, and run that before committing to a solution. Examples:
   - Riskiest assumption: *"owners will approve AI-drafted follow-ups from their phone rather than distrust
     them."* Smallest test: shadow-mode drafts to a handful of early users, measure approve-vs-edit-vs-ignore.
     Disproved if most ignore or heavily rewrite.
   - Riskiest assumption: *"a personalized demo on the buyer's own data out-converts a generic demo."*
     Smallest test: run both across the next 5 recorded conversations, compare engagement. Disproved if
     personalized does not outperform.
4. The analyst names the assumption, the map position, and the proposed smallest test in the opportunity
   brief's *Smallest Valuable Test* section. The test is then **run by the build loop**, not by the
   analyst — it designs the discovery, execution stays on the gated rails.

## Guardrails on this mode

- Read-only synthesis: structure, tag, size, rank, and name the test — never build, ship, or auto-commit
  a roadmap. Roadmap commitments need owner approval.
- Zero fabrication: no invented interviews, quotes, or usage. Missing evidence → `insufficient evidence`
  + what would generate it. Every stat/claim carries source + date + label.
- Keep each customer population's tree separate; keep discovery (this mode) separate from market research
  (market-radar), economics (revops-finance), and onboarding/health ops (customer-success).
- Voice-clean; put proposed canonical-file changes under "Proposed refinements — HUMAN REVIEW" in
  `learnings.md`, never silently edit a seeded framework.
