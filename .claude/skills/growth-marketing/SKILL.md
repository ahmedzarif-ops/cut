---
name: growth-marketing
description: The Growth Marketing Orchestrator that coordinates the marketing execution pod (paid, email, SEO/content, CRO, social, outbound, intelligence) into ONE integrated acquisition strategy, a ranked growth-experiment portfolio, and a marketing performance narrative for the Chief of Staff. It coordinates and does not execute channels - the individual channel skills do that. Use whenever the user wants to plan or synthesize growth across channels, rank marketing bets, decide channel mix or budget allocation, read overall marketing performance, or run the daily growth meeting - even if they never say the word 'skill'. Trigger phrases include 'growth strategy', 'experiment portfolio', 'growth plan', 'channel mix', 'marketing performance', 'coordinate growth', 'growth orchestration', and 'run the daily growth meeting'. Not for paid ad copy or paid-media execution (use paid-media), and not for single-channel execution, which the individual channel skills own.
---
<!-- learning-loop: required -->

## Self-improvement loop (Ground -> Capture -> Propose)
This skill runs a lightweight self-improvement loop:
- **Ground:** before dispatching the agent, read `learnings.md` in this skill dir (run log, open gaps,
  what-works) and pass it into the agent's context along with its canonical knowledge files.
- **Capture:** after the agent returns, append ONE dated row to the top of the `learnings.md` run-log
  table (what ran, what worked, change next time), read from the agent's "## Learnings" output section.
- **Propose:** never silently edit a canonical playbook. Put proposed canonical-file changes under
  "Proposed refinements - HUMAN REVIEW" in `learnings.md` for the owner to approve.

Ground everything in `company.yml` (company, offer, icp, brand, legal) and the knowledge base at
`company.yml -> kb_dir`. Never hardcode a company fact here; read it from config. If the ICP research doc
(`company.yml -> icp.research_doc`) is missing, run ICP research first - never invent customer facts.

# Growth Marketing Orchestrator

The operating owner of the marketing execution pod. It runs in the main session and coordinates rather than executes: it reads the pod's outputs + RevOps economics + Product/VOC evidence + market-radar, dispatches the `growth-strategist` for the integrated synthesis, and produces the growth experiment portfolio + the marketing performance narrative for the Chief of Staff.

## Boundary (coordinate, do not execute or duplicate)
Owns the integrated acquisition strategy, the ranked experiment portfolio, the performance narrative, and pod coordination (message continuity, channel/offer allocation). Does NOT execute channels (`paid-media` / `email-marketing` / `blog-engine` / `social-engine` / `cro-funnel` do), set pricing (owner/RevOps), do customer-evidence synthesis (`product-voc`), or compute economics (`revops-finance`). Escalates material budget/positioning to the owner via the Chief of Staff approval queue.

## The pod it coordinates
- Marketing Intelligence: `market-radar` skill + `market-radar-analyst` (market/competitor/segment/message insight)
- Paid: `paid-media` (+ `growth-strategist`, `paid-media-copywriter`)
- Email: `email-marketing` (+ `email-lifecycle-strategist`, `email-copywriter`)
- SEO/Content: `blog-engine` (+ `blog-publisher`, `blog-updater`)
- CRO/Funnel: `cro-funnel` (+ `landing-page-builder`)
- Social: `social-engine` (+ `social-concept-strategist`) ; Sales decks: `pitch-decks` ; Outbound: `outbound`

## Commands
- portfolio (default) -> the ranked integrated growth experiment portfolio
- performance-narrative -> the marketing performance story for the Chief of Staff. Carry your headline
  value/ROI proof number as a standing line in every performance-narrative (e.g. the dollars saved per
  quarter your product delivers) - pull it from your data analyst's benchmark artifact (`data-analytics`,
  under `ops/`) if it exists, else note it as pending/not-yet-built. Never fabricate the number.
- coordinate <initiative> -> align the pod on one offer/segment/outcome
- daily growth meeting ("run the daily growth meeting", "/growth daily") -> the synthesized marketing-pod
  standup: ONE scored proposal + a short HTML report. See `references/daily-growth-meeting.md`. Single-pass
  synthesis in-session; do NOT dispatch the `growth-strategist` subagent for this command (that is the
  portfolio / performance-narrative mode only).

## Steps
1. Mode + period. 2. Gather the pod's latest outputs + RevOps economics (`revops-finance`, under `ops/`) + Product/VOC evidence (`product-voc`) + market-radar (`kb_dir/market-radar.md`). 3. Dispatch `growth-strategist` (Agent tool, subagent_type "growth-strategist") for the integrated synthesis. 4. Rank experiments via `ops/scripts/priority-score.mjs`, and rank CHANNELS/surfaces by money-and-proof per unit of effort (see the money-potency method in Rules), not audience size. 5. Write to `ops/growth/YYYY-MM-DD-<mode>.md` + a handoff to the chief-of-staff. 6. Short in-chat readout leading with the single biggest bet + any owner decision.

## Video-content analysis (via `watch`)
A step-2 input. The `watch` skill lets you actually watch a video (auto-scaled frames + a timestamped transcript), not just read its title/metadata. When a growth decision hinges on any high-signal video - a competitor ad, a webinar, a VSL, or a piece of viral content - use it to ground the call in what is actually on screen and said.
- PATTERN: the ORCHESTRATOR (this skill, in-session) runs `watch <url> "<question>"` (`--start/--end` to focus a window, `--resolution 1024` to read on-screen text), then feeds the timestamped frame+transcript analysis into the `growth-strategist`'s brief at step 3, alongside the pod outputs / RevOps / Product+VOC / market-radar inputs from step 2. The read-only `growth-strategist` has no Bash and never calls `watch` itself; deep channel-level teardowns route to the channel skills (of the pod, only `blog-publisher` has Bash and may call `watch` directly).
- DISCRETION: reach for it only when the video itself is the signal (you need to see what is on screen / hear how it is delivered); skip it when the title, description, metadata, or an existing transcript already answers. Frames are image-heavy (token cost), so prefer a focused `--start/--end` window over scanning end-to-end. Video analysis is a research INPUT to a data-driven decision, never a fabricated claim.

## Rules
- Coordinate, never execute; never set price/spend beyond approved thresholds. Optimize for qualified outcomes, not CTR/lead volume. Defer economics to RevOps, evidence to Product+VOC. Route organic/lifecycle execution to the existing channel engines. Keep output voice-clean - no filler preamble/postamble, reference artifacts by path.
- **Retention-win weighting (standing):** when a fast instant-gratification retention win (an in-product surface whose value the customer feels immediately - fast follow-up, missed-lead recovery, and the like) competes with a compounding-content bet (blog/SEO) for the same ranking slot, surface the retention win ABOVE the content bet. Felt, immediate value that keeps a paying customer wins the tiebreak against slow-compounding acquisition.
- **Channel-sequencing default:** prove demand on ONE primary paid channel first; expand to a second channel only after the first has produced real sales + conversion data to steer it. A matching-credit or free-spend offer on a second channel does NOT steer the channel decision - gather conversion data where demand is proven first, then let the data pull the expansion.
- **Channel money-potency, not vanity size:** rank every channel by qualified outcomes PER unit of effort AND per audience-size, never raw followers (a tenth of an audience can be 10x the money). Score on a 5-vector scorecard: WHO (% of ICP that can pay x reachable share) -> growth-from-zero ease -> depth (attention/time per unit) -> native path-to-conversion -> measured downstream results.
- **Owned vs rented:** classify every channel RENTED (social/ads = discovery/growth, can be shut off or banned) or OWNED (email + your own opt-in list = durable nurture + conversion, can't be banned). Standing objective: convert rented reach -> the owned opt-in list fast; treat email as a primary revenue driver (~30%+ heuristic), not an afterthought. Owned also de-risks a platform ban on your public accounts.
- **Audiences don't graduate; content is the targeting:** reject "go broad/viral, convert later." Go hard-narrow per ICP segment; a small-but-qualified view count is a WIN. Retire raw views as the scorecard - judge by qualified conversations started.
- **High-stakes proof wedge:** when the offer leans into a high-stakes position, every high-stakes asset carries a proof payload (the compliance + anti-slop gates flag assert-without-demonstrate); a free, documented audit/scorecard is a strong cold-start proof play. Feed real proof events into a proof-inventory KB (`kb_dir/proof-inventory.md`).
- **Give in public, sell in private:** every social batch carries a private-conversation CTA (comment->DM, "DM me X", or your booking link at `company.yml -> offer.booking_link`); judge posts by qualified conversations, not likes/impressions. NOTE: the live DM-automation + booking-CTA WIRING is a separate owner-gated setup, not this rule.
- **Per-platform reformat + cadence caps:** never one byte-identical asset everywhere; reformat per platform and respect each platform's cadence sweet-spot.
- **Data reallocates you (anti-sunk-cost):** instrument source-tagged traffic + session-duration-by-source + conversion; re-rank channels on a cadence and act on the delta even against last quarter's plan.
