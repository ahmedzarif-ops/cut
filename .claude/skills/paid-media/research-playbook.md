# Research Playbook

How the skill runs live research in the main session and turns it into decisions. This
is what makes the strategy tailored to your company and ICP instead of generic. Mirrors
the budget discipline of the `market-radar` skill. Runs IN the main session because the
research tools/MCPs are only live there; the agents get the captured bundle, they do not
scrape.

The tools named below are EXAMPLES of each research lane, not requirements — swap in
whatever keyword, trends, social-listening, SERP, and video tools you have. Tools are not
company facts.

## Budget (do this first)

- Default cap: a bounded number of paid research-tool calls per run (e.g. ~25-35).
  Announce the budget up front.
- Rough split by lane: social/forum listening the largest slice, keyword/CPC next,
  trends / SERP best-effort within the remainder.
- Track calls as you go and STOP at the cap. If the brief needs a bigger sweep, confirm
  the higher cost with the owner first.

## Cross-reference first (do not re-scrape)

- Read the `market-radar` output before scraping. Reuse any fresh finding (demand,
  hooks, objections) instead of spending a call to re-discover it.
- Read the ICP research doc (`company.yml -> icp.research_doc`) for the pains, the
  sourced stats with reliability flags, and the raw buyer voice. Most voice-of-customer
  is already captured there.
- Only scrape to fill a real gap the brief exposes (a new segment, a new competitor, a
  new keyword cluster, a seasonality question).

## Research lane to decision map

| Lane (example tool) | What to pull | Decision it feeds |
|---|---|---|
| Keyword / CPC (e.g. Ubersuggest, Semrush) | keyword volume, CPC, competitor keywords, suggestions | Search campaign groups, keyword -> offer -> page map, negative-keyword seeds, CPC vs cost-per-qualified-customer reasoning, which terms justify paid search at all |
| Search trends (best-effort) | rising queries, seasonality curves | Per-segment seasonal triggers and campaign timing |
| Social / forum listening (e.g. Reddit `.json`, forums, social) | raw buyer voice, the exact words buyers use, real objections, hook language | Voice-of-customer hooks for the copywriter, objection handling, which angles to lead with |
| SERP teardown | competitor ads and landing pages, People-Also-Ask | Competitor ad/LP teardown, message-match gaps, PAA-driven search groups and content angles |
| Video research (e.g. VidIQ + a video-watch tool) | winning hooks/formats, native captions/transcripts | Which hooks/formats win, VSL and video-ad teardown |

Method notes:
- Reddit full threads often require the `.json` endpoint (the normal page and old.reddit
  hit the consent wall). Use `site:reddit.com` in the query or extract known thread URLs.
- For search trends, if the trends page does not scrape cleanly, fall back to SERP
  autocomplete and PAA for demand and seasonality signals.

## Graceful degradation (never block the run)

- If a video-research tool is out of credits, fall back to a video-watch tool (native
  captions, free) + social listening + WebSearch; note the skip in the output.
- If there is no live analytics/Search-Console connector for your account, treat those
  as paste-an-export, not a live pull; ask the owner for an export only if the brief
  truly needs query-level data.
- If a keyword tool reports "needs authentication" or a lower tier, note it and continue
  with what is available.
- If any source is down, record which one and proceed. A partial, honest sweep beats a
  blocked run.

## What to capture

- For every finding: the raw quote, title, or number PLUS its source URL. No unsourced
  claims enter the bundle.
- Tag each finding with the pain or decision it supports so the strategist can map it
  fast.
- Hand the full captured bundle (findings + URLs) to `growth-strategist`. Do not
  pre-digest it into conclusions; the strategist does the synthesis.
