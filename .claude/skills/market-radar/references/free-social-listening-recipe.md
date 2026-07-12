# Free social-listening recipe — engagement-ranked, zero paid-MCP budget

A FREE lane for the weekly sweep. Same job as the paid sources (find what your audience is actually saying,
ranked by real engagement), but built only on **logged-out public JSON endpoints and official free APIs** —
no paid MCP calls spent. Use it when the paid budget is capped or spent, to corroborate a paid finding with
a second free source, or as the whole sweep on a low-cost week.

The PATTERN: research a topic across Reddit / Hacker News / GitHub / the open web, then synthesize a
grounded summary. Tune the queries and subreddits to your own ICP (from `company.yml` → `icp.description`
and `icp.research_doc`); if you sell to a secondary audience, run a second pass for it.

## HARD EXCLUDE — free sources only (state it, enforce it)

This lane deliberately drops the paid parts of the pattern:
- **NO paid scraping vendor** of any kind.
- **NO X / Twitter cookie or session scraping** — login-bound, ToS- and counsel-gated. Skip X entirely here.
- **NO paid APIs / paid social-listening tools** for this lane. If a source needs a key or a login, it is out.

What IS allowed: logged-out public JSON endpoints (Reddit `.json`), free official search APIs (HN Algolia,
GitHub Search), and free/open-web search tools. All GET-only, no cookies, no auth header, no
`--cookies-from-browser`. This is the same logged-out `.json` posture the paid sweep already uses for Reddit
threads — distinct from scraping a login-walled page.

Politeness (keeps the free endpoints working): send a descriptive `User-Agent`, keep request volume low
(sample the highest-signal items, do not crawl everything), and if an endpoint 429s or returns nothing, log
"no data" — never invent a number to fill the gap.

## 1. Reddit — raw audience voice, ranked by score + comments

Public `.json` endpoints, logged-out. `t` = window (`hour|day|week|month|year|all`); rank by `ups` (score) +
`num_comments` within the window. Reddit throttles anonymous hits — always pass a real `User-Agent` (use
your own contact from `company.yml` → `owner.email`).

```bash
UA='market-radar/1.0 (research; contact <your owner.email>)'
# Top posts in a subreddit this week/month:
curl -sH "User-Agent: $UA" 'https://www.reddit.com/r/<your-sub>/top.json?t=month&limit=50'
# Keyword search inside one sub, sorted by top-in-window:
curl -sH "User-Agent: $UA" 'https://www.reddit.com/r/<your-sub>/search.json?q=<keyword>&restrict_sr=1&sort=top&t=month&limit=50'
# Site-wide keyword search:
curl -sH "User-Agent: $UA" 'https://www.reddit.com/search.json?q=%22<exact phrase>%22&sort=top&t=month&limit=50'
# Full thread + comment bodies (the verbatim voice):
curl -sH "User-Agent: $UA" 'https://www.reddit.com/r/<your-sub>/comments/<id>.json?limit=50'
```

Rank a listing by real engagement (score + comments), keeping the URL + numbers:
```bash
curl -sH "User-Agent: $UA" 'https://www.reddit.com/r/<your-sub>/top.json?t=month&limit=50' \
 | jq -r '.data.children[].data
   | "\(.score+.num_comments)\t\(.score)up \(.num_comments)c\t\(.created_utc|todate[0:10])\thttps://reddit.com\(.permalink)\t\(.title)"' \
 | sort -rn | head -15
```

Picking subreddits that carry the signal:
- Find the subreddits where YOUR ICP actually gathers — the ones your `icp.research_doc` already cites, plus
  the obvious category/industry subs and adjacent small-business/founder subs (e.g. r/smallbusiness,
  r/Entrepreneur are broad catch-alls). Customer-side demand often lives in a different sub than
  practitioner voice — track both.
- Map each hit to a specific pain from your ICP research doc, or to the "NEW / unmapped" bucket. If you sell
  to a second audience, keep a second subreddit list for it.

## 2. Hacker News — builder / founder / AI signal via the Algolia API

Free, no key. `search` = relevance, `search_by_date` = recency. Filter by points, comments, and a Unix
date window with `numericFilters`. Rank by `points` + `num_comments`.

```bash
NOW=$(date +%s); WINDOW=$((NOW-2592000))   # last 30 days
curl -s "http://hn.algolia.com/api/v1/search?query=<your topic>&tags=story&numericFilters=points%3E30,created_at_i%3E$WINDOW" \
 | jq -r '.hits[] | "\(.points)pts \(.num_comments)c\t\(.created_at[0:10])\thttps://news.ycombinator.com/item?id=\(.objectID)\t\(.title)"' \
 | sort -rn | head -15
```
- Each hit: `points`, `num_comments`, `created_at`, `url` (external link), `objectID` → the HN discussion at
  `https://news.ycombinator.com/item?id=<objectID>`.
- HN is strongest for **builder / founder / AI-category** chatter (AI agents, automation, vertical SaaS,
  tech-in-your-category) and weakest for raw practitioner customer voice — weight it toward the
  technical/buyer-adjacent clusters.
- Useful query shapes: `<your category> AI`, `<your category> software`, `AI agents SMB`, `vertical AI`,
  `<your category> automation`.

## 3. GitHub — category momentum via stars-in-window (proxy)

Free Search API (unauth is low-rate; a read-scoped `gh` token raises the limit). GitHub does not expose true
"stars this week", so approximate trending-in-window two honest ways — and LABEL it a proxy, never a precise
"stars gained" figure:
```bash
SINCE=$(date -v-30d +%F 2>/dev/null || date -d '30 days ago' +%F)   # 30 days ago, YYYY-MM-DD
# New repos in the window, most-starred (fresh momentum):
curl -s "https://api.github.com/search/repositories?q=topic:<your-topic>+created:>$SINCE&sort=stars&order=desc&per_page=30" \
 | jq -r '.items[] | "\(.stargazers_count)★\t\(.created_at[0:10])\t\(.html_url)\t\(.description)"'
# Actively-pushed repos in a topic, most-starred (sustained momentum):
curl -s "https://api.github.com/search/repositories?q=topic:<your-topic>+pushed:>$SINCE&sort=stars&order=desc&per_page=30" \
 | jq -r '.items[] | "\(.stargazers_count)★\t\(.pushed_at[0:10])\t\(.html_url)\t\(.description)"'
```
- Topics worth watching: whatever maps to your category, its tooling, and its competitors (e.g. `crm`,
  `marketing-automation`, `ai-agents`, `llm`, `lead-generation`, plus your industry's own topics). Signals
  category momentum, open-source competitors, and what tooling your space is building.
- Caveat to keep on every GitHub finding: `created:>`/`pushed:>` + `sort:stars` is a **momentum proxy**, not
  a measured stars-gained-this-window number. The true metric (per-star `starred_at` events) is too
  expensive for the free lane — so report it as "trending proxy", dated, with the total star count as-of
  fetch.

## 4. Open web — free semantic + SERP, no scraper

Do NOT add a paid SERP call for this lane. Use free, gate-cleared tools only:
- **A free semantic search + web-read** (e.g. a hosted semantic-search API, logged-out) for recent articles,
  benchmarks, and industry/regulation news.
- **Search trends** best-effort: rising queries in your category; if it does not scrape cleanly, fall back
  to SERP autocomplete + People-Also-Ask for demand shape.
- Respect your web-research denylist here (no login/social scraping through open-web wrappers). Reddit voice
  comes from §1's public `.json`, not from the open-web wrappers.

## 5. Synthesize — cluster, date, source, then summarize (never assert unsourced)

The raw pulls are inputs, not findings. Turn them into a grounded summary the same way the paid sweep does:
1. **Dedup** against prior entries in `kb_dir/market-radar.md` — never re-flag a logged finding; mark
   superseded ones stale rather than deleting.
2. **Cluster** every retained item into: your ICP's core pains (from the ICP research doc) + any secondary
   audience themes + a "NEW / unmapped" bucket for genuinely novel signal.
3. **Date + source every item.** Keep the content date (post/thread/story/repo date, not the fetch date) AND
   the source URL AND the engagement numbers as-of the fetch date. An item with no URL + no date does not
   enter the digest — full stop.
4. **Escalate only corroborated + new + surface-mapped** (the sweep's existing rule): 2+ sources or one
   primary source, deduped, and mapped to a real surface. Kill one-off noise so the digest stays
   signal-dense.
5. **Grounded summary.** Produce the 5-cluster SWEEP entry with a headline per cluster and a reliability
   flag. Engagement counts are **point-in-time public metrics** — they move; label them directional and
   dated. If you observed a pattern but have no sourced stat for it, frame it as a **principle**, never as a
   fabricated number. Never assert an undated or unsourced claim — that is the honesty line this whole lane
   exists to hold.

Then hand the clustered, sourced bundle to the `market-radar-analyst` exactly like the paid data (SKILL §3),
run the compliance gate (§3b), and write the outputs (§4). Nothing customer-facing skips the draft -> owner
approves -> explicit deploy rail.

## Guardrails (this lane specifically)

- **Free + logged-out only.** Public JSON endpoints and free official APIs, GET-only, descriptive
  User-Agent, no cookies/auth. Re-read the HARD EXCLUDE box before adding any source.
- **Read-only listening, no penalty risk:** this lane only *reads* to ground research; it never
  auto-publishes and never harvests personal data into an outreach list.
- **Honest by construction:** every engagement number traces to a live URL + fetch date; a 429 or empty
  result is logged as "no data", never invented. Vendor/anecdote stays directional.
- **Point-in-time:** re-pull for a fresh number rather than reusing a stale count from a prior sweep; public
  metrics drift.
