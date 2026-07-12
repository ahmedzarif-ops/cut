---
name: paid-media
description: Produce paid ad copy, paid-media and funnel strategy, growth and channel-expansion strategy, and creative lead-gen plays for your company, grounded in live research and your ICP and offer knowledge base. Reach for it whenever the user mentions paid ad copy, ad strategy, paid media, a Meta/Google/YouTube/LinkedIn/TikTok campaign, ads for the landing pages, funnel strategy, retargeting, an ad testing plan, or creative ways to get leads, even if they don't say "skill". Runs live research (keyword/SERP/social listening tools), dispatches the growth-strategist then the paid-media-copywriter, and gates on the compliance reviewer. Not for building landing pages (use cro-funnel), blog posts (use blog-engine), organic social (use social-engine), or general architecture (use build-patterns). Not for broad growth/channel orchestration (use growth-marketing).
---
<!-- learning-loop: required -->

# Paid Media and Conversion Copy

This skill is the growth-strategy brain and the paid-media execution engine. It
produces research-grounded growth and paid-media strategy and ready-to-run ad copy,
and it recommends channel expansion and creative lead-gen plays across your offer
ladder. The skill orchestrates in the main session (where the research tools are
live), dispatches two specialist agents, and gates on the compliance reviewer and the
owner.

Ground everything in `company.yml` (company, offer, icp, brand, legal) and the
knowledge base at `company.yml -> kb_dir`. Never hardcode a company fact here; read it
from config. If the ICP research doc (`company.yml -> icp.research_doc`) is missing,
run ICP research first — never invent customer facts.

## Overview (the boundary)

- Owns the whole growth STRATEGY across every channel: paid, organic, lifecycle,
  partnerships, referral, and creative lead-gen.
- Executes the PAID half itself: copy, scripts, campaign architecture, segmentation,
  retargeting, testing, measurement.
- Delegates organic and lifecycle EXECUTION to the engines that already run them
  (`blog-engine`, `social-engine`, `email-marketing` for lifecycle email, plus any
  in-product follow-up capability). The plan routes the play; it does not re-implement
  those engines.

## When to use

- Build paid ad copy and campaign strategy for any offer or landing page.
- Plan the funnel, retargeting, testing, and measurement for a paid push.
- Recommend new channels to expand into and creative plays to get leads and sales.

## When not to use

- Building or editing landing pages -> `cro-funnel`.
- Writing blog posts -> `blog-engine`.
- Generating or scheduling organic social -> `social-engine`.
- General architecture -> `build-patterns`.

## Workflow (one todo per step)

1. Ground. Read the KB docs below; the shared KB files under `company.yml -> kb_dir`
   (ICP research, founder/authority story, message spine) and `market-radar` output;
   your offer/catalog source of truth; and the live funnel pages you will send traffic
   to. Absorb and supersede any older launch-kit or GTM docs (their prices may be
   stale — always re-verify against `company.yml -> offer`). If you keep a virality /
   attention KB, treat paid ads and cutdowns as the HOOK lane — front-load a
   pattern-break before second 3. Predictor scores are labeled predictions until real
   retention data lands; append new measurements back.
2. Intake the campaign brief. Fill `templates/campaign-brief.template.md` with the
   owner. Default from the KBs; ask only real gaps; never invent research.
3. Set the research budget. Announce it: a bounded number of paid research-tool calls
   per run (e.g. ~25-35, weighted by tool). Track and stop at the cap. Confirm a bigger
   sweep first.
4. Run live research in-session per `research-playbook.md` (keyword/CPC tool, search
   trends, social/forum listening, SERP teardown). Cross-reference `market-radar`
   output first; degrade gracefully when a source is down; capture every finding with
   its source URL.
   - **Video-content analysis:** a video-watching tool (auto-scaled frames + a
     timestamped transcript) lets you actually watch a competitor VIDEO AD or VSL, not
     just read its title or ad-library metadata. Use it to tear down the hook, offer
     framing, proof, CTA, and on-screen captions.
   - PATTERN: the ORCHESTRATOR (this skill, in-session) runs the video analysis, then
     feeds the timestamped frame+transcript read into the `growth-strategist`'s brief
     as grounding — exactly like the keyword / social / SERP research in this step. The
     read-only `growth-strategist` and `paid-media-copywriter` have no shell and never
     run tools themselves.
   - DISCRETION: reach for video analysis only when the VIDEO ITSELF is the signal (you
     need to SEE what is on screen / HEAR how it is delivered); SKIP it when the title,
     description, metadata, or an existing transcript already answers. Frames are
     token-heavy, so focus a start/end window over scanning a whole VSL. Video analysis
     is a research INPUT to a data-driven decision, never a fabricated claim.
5. Dispatch the `growth-strategist` agent with the research bundle + brief + KB
   pointers. It returns the filled strategy brief.
6. STRATEGY GATE. Present the strategy and recommendations to the owner. They approve
   or edit before any copy is generated.
7. Dispatch the `paid-media-copywriter` agent with the approved strategy. It returns
   the copy libraries.
8. Compliance gate. Run the `compliance-review` gate on the copy and any strategy
   claims. Fix every flag before continuing.
9. Assemble outputs into `<kb_dir>/paid-media/<YYYY-MM-DD>/`: `index.html` (from
   `templates/paid-media-hub.template.html`), `copy/` (paste-ready blocks per
   platform), `strategy-brief.md`.
10. The owner's final yes. No auto-push to ad platforms; the owner loads campaigns
    themselves (the human gate). Append the run to `learnings.md`.

## Knowledge base (read before running)

- `guardrails.md` — the never-do list, honest-urgency rules, voice, names/privacy,
  proof discipline, honesty separation.
- `offer-roles.md` — the offer-ladder pattern and each rung's paid-acquisition role;
  the central contrast; brand language.
- `channel-strategy.md` — per-channel playbooks, the channel decision tree, the
  new-channel-expansion framework, staged paid-spend discipline.
- `segmentation.md` — how to build the persona set and the segment matrix.
- `awareness-and-frameworks.md` — the Schwartz awareness matrix and the copy-framework
  selector.
- `creative-angles.md` — the angle-library method and the hook-bank discipline.
- `references/marketing-psychology.md` — the behavioral-model catalog (Cialdini's 7,
  behavioral-econ levers, buyer psychology); consult it when choosing a persuasion
  angle; each model carries its ethical line (the compliance boundary).
- `ad-output-spec.md` — the copywriter's output contract (fields + platform variants +
  template).
- `testing-and-measurement.md` — the testing hierarchy, experimentation rules, funnel
  measurement, reporting, budget/scaling/fatigue.
- `growth-plays.md` — the cross-channel play library (paid, organic, partnership,
  referral, lifecycle).
- `winning-ad-teardown.md` — the competitor winning-ad teardown play. A research input
  that runs between step 4 and step 5.
- `ugc-video-ads.md` — the UGC video-ad recipe (script-first spoken-testimonial and
  before/after clips generated through your image/video toolkit).
- `research-playbook.md` — the research-tool-to-decision map, the budget, graceful
  degradation.
- `templates/` — the campaign-brief intake, the strategy-brief contract, the HTML hub
  shell.
- `learnings.md` — the running registry of runs.

## The two agents

- `growth-strategist` (no research tools): research bundle + KBs -> the strategy brief.
  Dispatched at step 5. Plan and creative direction only, no copy.
- `paid-media-copywriter` (no research tools): the approved strategy -> the copy
  libraries. Dispatched at step 7, only after the strategy gate.
- The strategy gate between them (step 6) is the concept-gate-before-spend: the owner
  approves the plan before copy is generated.

## Guardrails (non-negotiable; full detail in guardrails.md)

- PROOF: use only real proof. Founder/authority-led + product-as-proof + sourced stats
  (reliability-flagged) + any real guarantee. Zero fabricated testimonials, reviews,
  counts, or outcomes — fabricated proof is legal and brand exposure the compliance
  gate will block anyway.
- HONEST URGENCY ONLY: real launch window, real seasonality, real capacity. Skip fake
  or resetting countdowns.
- VOICE: follow `company.yml -> brand.voice` and `brand.banned_phrases`. Plain, calm,
  credible; no hype. Frame the offer against the real alternative the buyer faces, not
  "AI vs not".
- NAMES/PRIVACY: use the real names and honestly-tensed credentials from your KB; never
  invent a testimonial persona; never misstate current employment.
- HONESTY SEPARATION: label Observed facts / Evidence-supported strategy / Hypotheses /
  Recommendations needing testing / Claims needing primary research.

## Offer ladder (grounded in config)

Read the actual offer names and prices from `company.yml -> offer.summary` and
`offer.pricing_notes`; read the booking link from `offer.booking_link`. The generic
paid-acquisition SHAPE (detail in `offer-roles.md`):

- A FREE lead magnet / diagnostic — the primary cold-traffic offer. The completed lead
  action is the conversion event, not a page view.
- An ENTRY / tripwire paid offer — low-cost, often crediting toward the recurring tier.
- A RECURRING / core offer — the primary recurring-revenue tier.
- A HIGH-TOUCH offer — consult / done-for-you, booked via `offer.booking_link`.

## Output

Per run, into `<kb_dir>/paid-media/<YYYY-MM-DD>/`: `index.html` (the interactive
command center), `copy/` (paste-ready ad copy per platform), and `strategy-brief.md`
(the approved plan). The skill and agents live under `.claude/` and are
version-controlled; run artifacts live under `kb_dir`.
