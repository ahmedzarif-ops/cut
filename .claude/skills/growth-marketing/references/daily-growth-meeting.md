# Daily Growth Meeting (the synthesized marketing-pod standup)

Triggered by the owner. Single-pass, in-session synthesis (no subagent dispatch). Produces ONE ranked
proposal and a short HTML report. Pre-revenue, this is a forward build-and-test proposal, NEVER a metrics
review, and NEVER fabricates a number. Most days are "Steady" - and that is the system working.

## Inputs (gather one line each; "clear"/"no change" is a valid line)
- Remy (marketing_intelligence): any material 24-48h demand/competitor/regulatory signal, else "clear".
- Polly (paid_marketing): arming-action status (the tracking pixel, the analytics conversion event, the ad
  account's conversion setup); the one blocker to first spend. No ad copy pre-launch.
- Ellie (email_marketing): sequence readiness + the one email-side unlock (notes the ESP dependency at
  `company.yml -> integrations.esp`).
- Blake (seo_content): run the Blog Brief gate (see "## The Blog Brief") and report either
  "queued a brief: <topic>" or "no worth-it angle this cycle". An SEO-gap is a CANDIDATE signal, never a
  guaranteed output.
- Lana (cro_funnel): one funnel/message-consistency gap (heuristic audit pre-traffic).
- Sage (social_channel): one organic/founder-led concept that builds proof + shortens the testimonial gap.
- Scout (outbound_sdr): founding-cohort/pipeline funnel status; what needs the owner's unblock; else "no new developments".
- Dex (sales_enablement_decks): on demand: which vertical deck is ready / waiting on proof.

Verify the actual current workspace/agent state before writing any input line that claims work was done; if
there is no backing artifact under `ops/` or the repo, the honest line is "clear" / "no change".

## Rank (constraint-first)
Until enough real attributable testimonials/proof exist (your current `primary_constraint`, in the `ops/`
config), the daily primary track is proof acquisition (founding cohort + the owner's warm network) + the
ad-arming actions. Score candidate moves with `ops/scripts/priority-score.mjs` (impact, confidence,
strategicAlignment, reversibility, effort, timeSensitivity, each 1-5). A signal overrides constraint-first
ONLY if all three: (a) expires within ~48h, (b) does not point traffic at uncleared funnel pages,
(c) reversible.

## Material-change gate
"Steady" unless at least one is true: (a) a Remy signal touching the constraint or a live arming action;
(b) a Scout update moving a warm lead toward/away from the cohort; (c) a Polly arming-state change;
(d) a Lana/Ellie confirmed gap with a specific fix ready. Routine "still in progress" is NOT material.

## The Blog Brief (Blake's seat: write one only when there is a genuinely new, worth-it angle)

The blog writer does not invent its own topic. Instead Blake decides, each meeting, whether there is a
genuinely NEW, worth-it angle. If yes, he hands ONE Blog Brief to `blog-engine`; the writer consumes it on
its next slot. If no, he queues nothing and the writer SKIPS. "Nothing new to say" is a correct, desirable
outcome (it prevents redundant, over-optimized filler that risks a search engine's scaled-content policy).

Broadened signal set, in precedence order (highest first):
1. Growth wins / the marketing-pod daily synthesis (`ops/growth/*-daily.md`, newest).
2. Customer data / feedback (support, churn, sales-call notes, product-diagnostic inputs, product-VoC).
3. Owner strategy-session outputs (under `ops/`) - owner priorities + lessons.
4. Roadmap (current build priorities that a post can support honestly).
5. Owner / technical-lead notes.
6. SEO-gap floor (`blog-engine`'s `learnings.md` open cluster gaps). This is a CANDIDATE, not a guaranteed
   output: an open gap alone does NOT justify a post.

Write a brief ONLY when ALL THREE hold:
- (a) NOT cannibalizing. The topic/angle is distinct from every existing, queued, and recently held post.
  Check against your published blog content and the current brief queue; if the live sitemap is reachable,
  compare against it too.
- (b) Signal-grounded. It is driven by a real item from the broadened set above (record which one in the
  brief's `sources`), not a hunch.
- (c) Worth-it. It clears a plain bar: would this genuinely help a target ICP, is it worth publishing, and
  are we NOT over-optimizing an angle or keyword we have already covered.

If nothing clears all three, queue NO brief and report "no worth-it angle this cycle".

When one clears, write a Blog Brief with these fields and hand it to `blog-engine`:
`id` (`<YYYY-MM-DD>-<slug>`), `createdAt`, `topic`, `angle` (reader-facing, for ONE persona), `icpPersona`
(a persona from `company.yml -> icp` / the ICP research doc), `brandCues` (voice + POV guidance grounded in
`company.yml -> brand`), `whyNow` (the signal that justifies it), `sources[]` (which signal(s)), optional
`targetKeyword`, `status: "queued"`. This brief-writing is separate from the daily proposal card: a Blog
Brief is a writer instruction, not an owner-grade proposal, and does not itself page the owner.

Learning loop: when generating a brief, read recent published outcomes (the `blog-engine` `learnings.md`
registry) so briefs get more ICP- and brand-tailored over time.

## Build the proposal (the one card)
Fill your proposal-card template (headline + the move + rationale + evidence base + score). Honest-label the
evidence base (Observed / Evidence-supported / Hypothesis / Needs primary research). Two gates before the
report renders:
- **Compliance gate (persona Gus):** if "The move"/"Rationale" carry customer-facing claim language (ad
  angle, email subject, social concept, funnel message), hold the card for the `compliance-review` gate and
  render the HELD state (HEADLINE = "Proposal pending compliance review. No action required today.";
  THE_PROPOSAL = scrubbed of the claim). Operational proposals skip this gate.
- **Proof/testimonial gate:** any traffic-directing proposal (paid/organic-amplification/outbound-to-funnel)
  must set the proof gate (cleared / NOT cleared). If NOT cleared, score lower and label the evidence base
  "Hypothesis - testimonial gate not cleared (ref: `kb_dir/message-spine.md`)". A proposal that is `N/A`
  today (e.g. 1:1 warm outreach) re-enters this gate at DRAFT time if the drafts add a funnel-page CTA, so
  the drafting brief must re-evaluate it then, not skip it.

## Write the outputs
1. Append a row to `ops/growth/proposal-ledger.md` (id PROP-YYYYMMDD-NN, state `surfaced` if it clears the
   cap, else `scored`). Dedupe against the ledger first; re-proposing a declined/parked item needs NEW
   evidence and respects the 14-day cooldown. **Owner-grade override:** any proposal whose `decision_tier`
   is `owner_approval` (per `ops/decision-rights.yml`) ALWAYS surfaces regardless of priority_score or the
   cap, and is never auto-actioned; the cap governs only discretionary, non-owner-grade proposals.
2. Render the report with `render-daily.mjs` (in the `company-operating-system` skill) into
   `ops/growth/<date>-daily.md` (the section source) and `<date>-daily.html`. The three states: new
   proposal / Steady / held. The report carries NO scorecard panel (that lives only in the weekly cockpit).
   - `BLOCKERS_ESCALATIONS` is TWO labeled sub-sections: (1) **System exceptions** - operating-calendar
     `daily:` exception items that actually triggered today, manually surfaced, honest "none"
     pre-instrumentation, never implying live monitoring; (2) **Growth blockers** - pod-member blockers
     needing the owner's unblock. Honest "none" in both on a clean day.

## Roll-up
Daily proposals accumulate in the ledger. The weekly cross-functional (Casey + Reva + Dana) promotes/merges
the best into `ops/approvals/queue.md` for the cockpit, and sweeps/parks stale items. Daily never pages the
owner directly.
