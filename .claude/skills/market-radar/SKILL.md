---
name: market-radar
description: >-
  Run the weekly market-research sweep — scrape what your ICP audience is searching for and complaining
  about across social/forum/SERP research tools, YouTube demand, search-trends, and keyword tools, log it
  to a running sourced file, update the ICP knowledge base, feed the content agents, and hand back drafted
  approve-ready updates when findings are significant. Reach for it whenever the user wants to know what
  the audience is searching for or complaining about, wants to ground a content, messaging, offer, deck, or
  webinar decision in current customer truth, or the weekly research nudge fires — even if they never say
  the word skill. Trigger phrases include "run the radar", "market research sweep", "what is the audience
  searching for", "what are customers talking about", and "weekly research".
---
<!-- learning-loop: required -->

## Self-improvement loop (Ground -> Capture -> Propose)
This skill runs a self-improvement loop through `learnings.md` in this skill dir:
- **Ground:** before dispatching the agent, read `learnings.md` (run log, open gaps, what-works) and pass
  it into the agent's context along with its canonical knowledge files and your config.
- **Capture:** after the agent returns, append ONE dated row to the top of the `learnings.md` run-log
  table (what ran, what worked, change next time), read from the agent's "## Learnings" output section.
- **Propose:** never silently edit a canonical playbook. Put proposed canonical-file changes under
  "Proposed refinements - HUMAN REVIEW" in `learnings.md` for the owner to approve.

# Market Radar

## Overview
A repeatable, budget-capped weekly sweep that turns live multi-source market research into a running sourced
log + KB updates + drafted, approve-ready improvements. Runs IN the main session (so any interactively-authed
research MCPs are live); dispatches the `market-radar-analyst` subagent for synthesis. Mirrors the
`blog-engine` pattern.

## When to use
- The weekly research nudge fires, or the owner asks to run a sweep / "what is the audience looking for".
- Before a content push or a messaging/offer/deck/webinar decision that should be grounded in current
  customer truth.

## 0. Ground yourself first (read before sweeping)
All company facts come from config, never from invention:
- The durable ICP KB at `company.yml` → `icp.research_doc` (a file under `kb_dir`) — your ICP's core pains
  and reliability notes. If it is missing, run ICP research first; never invent customer facts.
- `kb_dir/market-radar.md` — prior sweeps (for dedup + the format).
- Your current products/prices/positioning — `company.yml` → `offer.summary`, `offer.pricing_notes` (and
  your product catalog module if you have one).
- Voice authority for any drafted copy — `company.yml` → `brand.voice` + `brand.banned_phrases` (and the
  `blog-engine` brand-voice file if present).
- The master handoff (via the `handoff-refresh` skill) — locked decisions, caveats, current offer.

## 1. Set the budget (cost guardrail — do this first)
Default per-sweep cap: about 25-35 paid MCP calls total (roughly: audience-voice/SERP tool <= 12, YouTube
tool <= 12, keyword tool <= 6). Announce the budget at the start. If the owner asked for a bigger sweep,
confirm the higher cost first. Track calls as you go and STOP at the cap.

## 2. Sweep the sources (budget-capped)
Pull around your ICP's core pains + the open content clusters (from the ICP research doc + the blog
learnings). For each source, capture raw quotes/titles/numbers WITH the source URL. The tool names below are
EXAMPLES of each research lane — swap in whatever research MCPs/tools you have wired; tools are not company
facts.
- FREE LANE (zero paid-MCP budget): when the paid budget is capped/spent, to corroborate a paid finding, or
  as a whole low-cost sweep, run the engagement-ranked free recipe in
  `references/free-social-listening-recipe.md` — logged-out Reddit `.json` + the HN Algolia API + GitHub
  stars-in-window + free semantic/open-web search, ranked by real engagement (NO paid scrapers, NO
  X/Twitter cookie scraping).
- AUDIENCE VOICE + SERP (e.g. a social/forum/SERP research MCP):
  - Deep search for thread discovery (Reddit, industry forums). `include_domains`-style filters are usually
    a SOFT hint; prefer `site:reddit.com` / `site:<forum>.com` in the query, or extract known thread URLs.
  - REDDIT FULL THREADS: extract on `https://www.reddit.com/r/<sub>/comments/<id>.json?limit=50` (the .json
    endpoint — the normal page and old.reddit hit the consent wall). Parse selftext + comment bodies.
  - SERP DEMAND: general search for the target keywords; capture "People Also Ask" / autocomplete-style
    questions. Use a news focus for INDUSTRY DEVELOPMENTS (regulation, vendor news, AI-in-the-category,
    platform changes).
- YOUTUBE DEMAND + OUTLIERS (e.g. a YouTube-research MCP): keyword research, trending videos, outliers,
  breakout channels, YouTube search, channel performance trends for your niche — including the outlier /
  viral / channel-trend topics the audience watches.
- SEARCH TRENDS — best-effort: extract a search-trends query for rising queries in your category; if it does
  not scrape cleanly, fall back to SERP autocomplete + PAA for demand.
- KEYWORD TOOL (once authed) — keyword volume + competitor keywords. If it needs authentication, note it and
  skip (do not block the sweep).
- Analytics console (e.g. Search Console) — skip until connected.
- **Video-content analysis (a watch-a-video capability, if available):** this lets you actually watch a
  video (auto-scaled frames + a timestamped transcript), not just read its title or view count. Use it on a
  high-signal video the space is reacting to — a competitor launch/announcement video, category-defining
  content, or a viral video — to capture what it is actually doing on screen and saying.
  - PATTERN: the ORCHESTRATOR (this skill, in-session) watches the video (focus a window with start/end;
    raise resolution to read on-screen text), then feeds the timestamped frame+transcript analysis into the
    `market-radar-analyst`'s data bundle as grounding — exactly like the research above. The read-only
    analyst has no Bash and never watches video itself.
  - DISCRETION: reach for it only when the VIDEO ITSELF is the signal (you need to SEE what is on screen /
    HEAR how it is delivered); SKIP it when the title, description, metadata, or an existing transcript
    already answers. Frames are image-heavy (token cost), so prefer a focused window over scanning a long
    video end-to-end. Keep the finding sourced (video URL + timestamp); video analysis is a research INPUT,
    never a fabricated claim.

## 2c. Competitor-content tracker (the scheduled competitor lens)
A standing lens on what specific competitors and category thought-leaders are PUBLISHING and which of it is
over-performing — distinct from the topic-demand pull above. That one asks "what is the audience searching
for"; this asks "what are our named rivals shipping, and what is working for them". Runs inside the weekly
sweep (the YouTube-research MCP's auth is live in-session); its calls count against that budget cap.
- **Tracked set (human-curated):** the research tool's own competitor list is the source of truth — read it,
  and change it through the tool. Selection is taste = human: the owner approves any channel added or
  removed. Mirror the current set to `kb_dir/competitor-channels.md` (append-only, dated) so it survives
  and stays auditable.
- **Per tracked channel (weekly):** recent uploads + how the channel is trending. Flag a video as an
  OVER-PERFORMER only against that channel's own baseline (outliers scoped to the set, or a video's stats
  vs the channel median) — an outlier is the signal; a normal upload is noise.
- **Discover new rivals:** similar-channels + breakout-channels in your niche surface channels not yet
  tracked; propose them to the owner for the set (never auto-add).
- **Deep-read ONE (angle, not metrics):** on the single highest-signal competitor breakout, watch it (or
  pull its transcript) to capture the actual hook, structure, and claim it is using — so the finding is
  "here is the angle winning for them", not just a view count. Keep it sourced (URL + timestamp); never
  fabricate a metric.
- **Feeds synthesis:** hand the tracked-channel findings to the `market-radar-analyst` as a **COMPETITOR
  CONTENT** cluster (over-performers + the deep-read angle + any proposed new rivals), escalated by the same
  corroborated / new / actionable rule.
- **Scheduling later (honest caveat):** a fully autonomous cron run needs the research tool's auth to work
  headless. Many research MCPs are interactively authenticated and may be absent headless — so the tracker
  runs in-session for now; wiring a scheduled run is a separate step that must first confirm the tool's auth
  works headless.

## 3. Synthesize (dispatch the analyst subagent)
Dispatch the `market-radar-analyst` subagent with ALL the raw captured data + source URLs. It returns: the
new SWEEP entry (5 clusters), KB append blocks, and ACTION DIGEST items (or "none"). It applies the
escalation logic (corroborated + new + actionable).

## 3b. Compliance gate (required before surfacing the digest)
Before writing or surfacing the drafted ACTION DIGEST or any proposed site/offer/deck copy to the owner,
run the `compliance-review` skill (dispatch the compliance-reviewer agent) on that drafted copy. Surface its
verdict with the digest:
- `VERDICT: PASS` then proceed as normal.
- `VERDICT: FLAG` then attach the findings and fixes to the relevant digest item so the owner approves with
  them visible. Never recommend shipping copy with an unresolved `block` finding.

## 4. Write the outputs
- Prepend the new SWEEP entry under "SWEEP LOG (newest first)" in `kb_dir/market-radar.md` (newest on top,
  append-only, never delete prior entries).
- Apply the analyst's KB append blocks to the ICP research doc (`company.yml` → `icp.research_doc`; append
  only, never delete a sourced stat).
- If there are ACTION items: write them to the pinned "ACTION DIGEST" block at the top of market-radar.md,
  and append a one-line "MARKET RADAR" pointer through the `handoff-refresh` skill so the master handoff
  reflects it.
- Show the owner the ACTION DIGEST in-session: per item, the SURFACE + the drafted voice-clean copy +
  PRIORITY + EVIDENCE, and ask which to action. These touch customer-facing surfaces, so changes ship only
  after the owner approves and explicitly deploys.

## 5. Report usage
End with the actual call count per source so cost stays visible.

## Guardrails
- Stop at the per-sweep budget cap and report the count — these are paid MCP calls, so cost stays visible
  and bounded.
- Escalate only corroborated (2+ sources or a primary source), new (deduped), surface-mapped findings;
  killing one-off noise keeps the digest signal-dense and worth the owner's attention.
- Draft, never auto-push: nothing reaches the live site without the owner's OK and an explicit deploy,
  because live copy carries advertising/claims legal exposure. The flow is draft -> owner approves ->
  explicit deploy.
- Source and reliability-flag every stat so a reader can weigh it: a vendor number or anecdote is
  directional; a core claim should trace to a primary source (an academic study, official data, or the
  originating research).
- Keep both markdown files append-only and mark superseded findings stale rather than deleting them, so the
  sourced trail stays auditable.

## Common mistakes
- Scraping Reddit via the normal page (consent wall) instead of the .json endpoint.
- Trusting `include_domains`-style filters as a hard filter (they are not — use `site:` or direct URLs).
- Re-flagging a finding already logged in a prior sweep (always dedup).
- Drafting copy with em dashes/emojis or a banned phrase, or recommending an auto-push.
- Blowing the budget by extracting every thread — sample the highest-signal ones.
