---
name: ai-seo
description: The honest AEO/GEO owner for your company — the doctrine, audit, and question-mining layer for getting your (or a client's) content cited by AI answer engines (ChatGPT, Perplexity, Google AI Overviews, Claude, Gemini, Copilot) using only proven, non-deceptive levers. Use whenever the work is AI-search visibility, answer-engine optimization, or getting cited by LLMs — even if "skill" is never said. Triggers include "AI SEO", "AEO", "GEO", "answer engine optimization", "generative engine optimization", "get cited by ChatGPT or Perplexity", "AI visibility", "why don't we show up in AI answers", and "are AI crawlers blocked". Owns the honest lever set (answer-first passages, quotable named-source evidence, rank-first), the AI-visibility audit, and question mining. For map-pack use local-seo; for posts use blog-engine. Output gates through Gus and Vera.
---

# AI SEO — the honest AEO/GEO owner

Answer-engine optimization (AEO) / generative-engine optimization (GEO) is how a page earns a **citation** in an AI-generated answer — ChatGPT, Perplexity, Google AI Overviews, Claude, Gemini, Copilot — not just a blue-link rank. This skill is the single, honest owner of that capability for your company and any client you do this work for.

"Honest" is not a mood here — it is the design constraint. The AI-SEO field is full of cargo-cult tactics that sound sophisticated and do nothing (or actively backfire). Ship only levers with a real causal mechanism, and never let a client's expectation rest on an unproven trick. If a lever's effect can't be honestly stated, it doesn't go in a deliverable. That discipline is also what makes the work durable: the same "helpful, people-first, well-sourced content" that AI engines reward is what survives every ranking-system change.

## Ground yourself in config first

Every company-specific fact comes from config, never from invention:
- **Who you sell to** — `company.yml` → `icp.description`, and the full research at `icp.research_doc` (a file under `kb_dir`). If the ICP research doc is missing, run ICP research first — never invent customer facts, personas, or intent queries.
- **What you sell** — `company.yml` → `offer.summary`, `offer.pricing_notes`.
- **Your domain** — `company.yml` → `company.domain` (used in the crawler-reachability checks below).
- **How you sound** — `company.yml` → `brand.voice` and `brand.banned_phrases` govern any line lifted toward a client-facing surface.
- **Legal constraints** — `company.yml` → `legal.regulated_claims` gates any claim in a deliverable.

## What this skill owns (and what it doesn't)

- **This skill owns:** the AEO/GEO *doctrine* (the lever set + the honesty wall below), the *AI-visibility audit* (are we cited? is the page extractable? can AI crawlers reach us?), *question/keyword mining* (the real questions to answer), and pointing citation-tracking to the data owner's real method.
- **`blog-engine`** applies these levers *inline* when it writes or refreshes a post — keep its answer-first / quotable-evidence / rank-first rules in sync with this skill; this file is the source of truth.
- **`local-seo`** owns the Google map pack / local 3-pack and hands the AEO structure layer (FAQ/definition blocks, schema, machine-readable pages) here.
- **JSON-LD implementation** — your schema/product code owns the actual markup; this skill specifies *which* schema and *why*.
- **Gates:** any client-facing audit, page, or recommendation goes through **Gus** (`compliance-review` — claims/FTC) and **Vera** (`slop-check` — distinctiveness/slop) before it ships. The honesty wall below is upstream of Gus, not a replacement for him.

---

## The honesty wall — what we do NOT do

Read this before recommending anything. These are tactics widely pushed in AI-SEO that we deliberately reject, and why. Each one is a trust liability with a real client.

1. **Never fabricate a citation, statistic, quote, or "AI mention."** The entire GEO mechanism rewards *real* named-source evidence. Inventing it isn't just dishonest — it's the one thing that destroys a brand's credibility the moment a prospect checks. Every stat in a deliverable traces to a real, dated source (reuse the blog engine's research step; ground in your ICP research doc and any message-spine KB under `kb_dir`).
2. **Never sell `llms.txt`, `/okf/` (Open Knowledge Format), or `/pricing.md` as a "citation lever."** No major AI engine has been shown to use these files to select or rank citations — the OKF spec itself claims *no confirmed AI-search ranking signal*. Presenting them as things that "get you cited" is a core honesty hazard. (If a client already has one and it's accurate, it does no harm — but never bill it, promise a lift from it, or prioritize it over real content.)
3. **Never publish a GEO percentage as a claim.** The Princeton GEO study (KDD 2024) is the best evidence that *citing sources, adding statistics, and adding quotations* raise citation likelihood — but its numbers are directional research findings on a sample, not a guarantee for a given page. Use them to *prioritize the levers*; never write "+40% citations" on a client slide. Frame as "the levers most correlated with being cited," not a promised number.
4. **Never write separate "content for AI" or chunk a page into AI-bait fragments.** Google explicitly calls this scaled-content-abuse spam. The same page serves people and machines; organize with normal headings and self-contained paragraphs, not synthetic fragments.
5. **Never keyword-stuff.** Beyond being ineffective for rank, it *reduces* AI citation likelihood — the one place stuffing actively backfires.
6. **Never spam Reddit / Wikipedia / Quora for mentions.** Third-party presence matters, but only real, valuable participation. Manufactured mentions are both a policy violation and a brand risk.
7. **Pick one keyword-research tool and stay consistent.** Mixing tools mid-program produces incomparable numbers. This skill's mining workflow is written against a keyword-research MCP (Ubersuggest is the worked example); use whichever one your company standardized on.

If a request pushes toward any of the above, say so plainly and offer the honest alternative. That candor is itself part of the deliverable — it's what a skeptical owner trusts.

---

## The proven levers (causal + controllable)

There are exactly three levers we fully control that have a real mechanism, plus the supporting hygiene. Lead with these every time.

1. **Answer-first passages.** Open each `h2`/section with a **self-contained direct answer in the first sentence**, then expand. AI engines retrieve and quote at the *passage* level — a section that answers its own question up front is what gets lifted into an answer. Keep the core answer tight (≈40–60 words) so it extracts cleanly.
2. **Quotable named-source evidence in the body.** Back claims with **named-source statistics, a direct expert quotation, and cited sources**. This is the proven citation lift (the Princeton GEO levers: cite sources / add statistics / add quotations, in that order of strength). Every number is real and dated.
3. **Rank first, then win the passage.** Organic top-10/20 is still where most AI-Overview citations originate, because AI Overviews are rooted in core Search ranking. So the existing SEO bar (E-E-A-T, indexable semantic HTML, topical depth, freshness) is the **precondition** for any AI citation. There is no AEO shortcut around being genuinely rankable.

**Supporting hygiene** (do all of these to make the three levers land):
- **Extractable structure** — definition blocks for "what is X", comparison tables for "X vs Y", step lists for "how to X", FAQ blocks for real questions. Tables beat prose for comparisons; numbered lists beat paragraphs for process. (Templates: `references/honest-levers.md`.)
- **Freshness** — a visible "last updated" date and real refreshes; AI systems weight recency.
- **Schema markup** — `FAQPage`, `HowTo`, `Article`/`BlogPosting`, `Product`, `LocalBusiness`/`Service` where they genuinely describe the page. Helps machine understanding; never a substitute for the content itself. (Do NOT emit `Review`/`AggregateRating` JSON-LD unless there are real, verifiable reviews — that collides with the no-fabricated-proof rule and the `deploy-and-verify` battery checks for it.)
- **Crawler hygiene** — AI bots must be able to reach the page (next section).
- **Query fan-out coverage** — AI search answers a query by fanning out to related sub-questions. Cover the *topical cluster*, not one keyword per page, so you're retrievable for the variants too. This is where question mining feeds the plan.

Full block templates, the directional Princeton table, the schema-by-content-type map, and the third-party-presence playbook live in **`references/honest-levers.md`**.

---

## Crawler hygiene — can AI engines even reach us?

A blocked crawler means zero citations, no matter how good the content — the cheapest, highest-leverage check. It has **two layers**: robots.txt AND the edge/firewall, because a WAF or CDN bot rule (e.g. Vercel Firewall/BotID, Cloudflare) can block a bot *even when robots.txt allows it*.

**The right default for AEO:** a robots config that allows every AI cite-bot (GPTBot, ClaudeBot, PerplexityBot, Googlebot, Bingbot), disallowing only server and transactional/noindex paths (`/api/`, auth, internal, checkout/funnel pages). Don't "tighten" it into blocking the cite-bots. Re-verify with the two-layer check below before relying on any prior state — robots and firewall rules change.

**Google-Extended is NOT the AI-Overviews gate.** This trips people up. Google-Extended controls only Gemini-app / Vertex grounding + training — it does **not** affect Search inclusion, and AI Overviews ride on **Googlebot / core Search** (consistent with the rank-first lever above). So the bot that gates AI-Overview eligibility is Googlebot, not Google-Extended; blocking Google-Extended is a training-opt-out decision for the owner, not a citation lever. (It is also not a page-fetching agent, so don't "test" it with curl.)

The full bot table, the two-layer verification steps, and the empirical curl loop live in **`references/audit-and-mining.md`** — run them whenever the ask touches AI-crawler reachability.

---

## The AI-visibility audit

When the ask is "are we showing up in AI answers / why not / what do we fix", run this. Full checklist + query templates in **`references/audit-and-mining.md`**; the shape:

1. **Crawler check** (above) — do it first; a block invalidates everything else.
2. **Citation check** — pick the 10–20 queries that matter for your ICP (split by persona: your high-intent / urgent-need persona and your growth-intent persona, per the ICP research doc). Run each through ChatGPT, Perplexity, and Google AI Overviews. Record: does an AI answer appear? are we cited? who is cited instead? which of *their* pages? This is manual and honest — we don't have a tool that reliably reads AI answers for us; see citation-tracking below.
3. **Extractability check** — for each priority page: does the first sentence answer the query? are the answer blocks self-contained? are there ≥2–3 real named-source stats/quotes with citations? comparison table where the query is "X vs Y"? real FAQ? correct schema? visible update date? Anything failing is a concrete fix mapped to the levers above.
4. **Gap → plan** — feed the missing questions into question mining, then hand the writing to `blog-engine` (blog) or the relevant page owner, applying the levers.

---

## Question/keyword mining

The levers only pay off if we answer the questions AI users actually ask. Mine them with your keyword-research MCP (the worked example uses the Ubersuggest MCP, `mcp__ubersuggest__*`; check `auth_status` first — if the tools are deferred, load them with ToolSearch). The workflow — detailed in **`references/audit-and-mining.md`**:

- **`keyword_suggestions` + `google_suggestions`** on the seed topic → the long-tail and question variants.
- **`content_ideas`** → what's already earning engagement on the topic (real demand, not guesses).
- **`keyword_overview` / `keyword_metrics`** → volume + difficulty to prioritize (low-difficulty, real-intent questions first — your buyers' actual questions, not vanity head terms).
- **`serp_analysis`** → who currently owns the answer and what shape it takes (so we can out-structure them with an answer-first passage).
- Cluster the results into topical groups (query fan-out) so each page owns a full sub-topic, and pass the clustered questions to the writer.

Some research tools also expose brand/AI-visibility features (e.g. `brand_visibility_overview`, `brand_prompts`, `brand_config`) — *evaluate* them for citation-tracking, but do not present them as authoritative until you've confirmed what they actually measure. Until then, the durable method is manual (below).

---

## Citation tracking — the data owner's real method, no fabricated tool claims

We do not currently own a tool that reliably reads and tracks citations across AI engines, so we don't pretend to. The honest, durable method is **owned by the data specialist (Dana / `data-analytics`)**: a monthly manual pass over the top ~20 queries across ChatGPT / Perplexity / Google AI Overviews, logging "are we cited / who is / which page" into the metrics layer, tracked month-over-month. Present that as the source of truth. If a brand-visibility tool is later validated against reality, the data owner graduates it into the pipe — same evidence discipline as any measured-metrics tier: never present a tracked "AI visibility score" you haven't verified measures what it claims.

---

## Quick reference

- **Levers, in order:** answer-first passage → quotable named-source evidence → rank-first foundation → extractable structure → freshness → schema → crawler hygiene.
- **Never:** fabricate evidence · sell llms.txt/OKF/pricing.md as a lever · publish a GEO % as a claim · write-for-AI/chunk · keyword-stuff · spam mentions · mix keyword tools.
- **Hand off:** blog → `blog-engine` · local/map-pack → `local-seo` · JSON-LD → your schema/product code · claims → **Gus** · slop → **Vera** · tracking → **Dana** (`data-analytics`).
- **References:** `references/honest-levers.md` (lever templates, directional GEO table, schema map, third-party presence), `references/audit-and-mining.md` (audit checklist, crawler config, mining workflow).
- **Voice note:** the prose here is internal doctrine and uses em dashes freely. Any sentence lifted toward a client-facing surface must first pass your brand voice rule (`company.yml` → `brand.voice` / `brand.banned_phrases`) and the Gus/Vera gates — don't copy this phrasing verbatim into a deliverable.
