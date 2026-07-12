# AI-visibility audit + question mining — the runbook

Operational detail for the audit and the question-mining named in `SKILL.md`.

## Contents
- AI crawler / bot reference
- The full AI-visibility audit checklist
- Keyword/question mining workflow (research MCP)
- Citation tracking (the data owner's manual method)

---

## AI crawler / bot reference

Each engine has its own bot; a `Disallow` (robots.txt) or an edge challenge (WAF / CDN firewall / bot rule) against any of these makes that engine unable to cite the page.

| Engine | Crawler user-agent(s) | Notes |
|---|---|---|
| OpenAI / ChatGPT | `GPTBot`, `ChatGPT-User`, `OAI-SearchBot` | must be reachable to be cited in ChatGPT |
| Perplexity | `PerplexityBot` | must be reachable to be cited in Perplexity |
| Anthropic / Claude | `ClaudeBot`, `anthropic-ai` | must be reachable to be cited in Claude |
| Google AI Overviews + core Search | `Googlebot` | **this is the AI-Overviews gate** — AI Overviews ride on core Search, not on Google-Extended |
| Microsoft Copilot | `Bingbot` | must be reachable to be cited in Copilot |
| Google Gemini-app / Vertex grounding + training | `Google-Extended` | a robots opt-out token, **not** a page-fetching agent; does NOT affect Search or AI Overviews. Blocking it is a training opt-out, never a citation lever |
| Training-only (optional to block) | `CCBot` (Common Crawl) | blocking limits training use without losing citations |

**Policy default:** allow every cite-bot. Blocking `CCBot` (training-only) — or `Google-Extended` (a Gemini/Vertex training opt-out) — is a legitimate owner choice that does *not* cost citations. Blocking the cite-bots (`GPTBot`, `PerplexityBot`, `ClaudeBot`, `Googlebot`, `Bingbot`) trades away AI visibility entirely, so that's an explicit owner decision, never a silent default.

**Two-layer verification (both, in order):**

1. **robots.txt** — confirm no `Disallow` targets the cite-bots above. Check wherever your site generates robots rules (a static `robots.txt`, a framework route, or CDN config). Re-check each audit, since robots can change.
2. **Edge / firewall (empirical)** — robots.txt permission does not prove a crawler gets through; a WAF or CDN firewall/bot rule can block or challenge by user-agent at the edge. Test the live response as each **page-fetching** cite-bot (Google-Extended is omitted — it doesn't fetch pages; test `Googlebot` for AI-Overviews reachability instead). Set `SITE` to your site from `company.yml` → `company.domain`:

   ```bash
   SITE="https://www.example.com/blog"   # your domain + an indexable page
   for UA in \
     "GPTBot/1.0 (+https://openai.com/gptbot)" \
     "ClaudeBot/1.0 (+https://www.anthropic.com/claudebot)" \
     "PerplexityBot/1.0 (+https://www.perplexity.ai/perplexitybot)" \
     "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"; do
     code=$(curl -sS -A "$UA" -o /dev/null -w "%{http_code}" "$SITE")
     echo "$code  $UA"
   done
   ```

   Expect `200` with real HTML on every indexable page. A `403`/challenge/`429` on any cite-bot is a citation blocker — fix robots or escalate the edge firewall/bot rule to whoever owns your CDN config. (Dashboard-level firewall config often lives outside the repo, so this empirical check is the only way to catch it.)

---

## The full AI-visibility audit checklist

Run top-to-bottom; a failure high in the list invalidates checks below it.

**A. Reachability**
- [ ] robots.txt allows all cite-bots (no `Disallow` on the table above)
- [ ] Live edge test returns `200` for GPTBot / ClaudeBot / PerplexityBot / Googlebot
- [ ] Page renders meaningful content server-side (not blank-until-JS)

**B. Citation presence** (manual — pick 10–20 real queries; split by persona from the ICP research doc)
- High-intent / urgent-need persona: the emergency- or high-purchase-intent phrasings this buyer types (e.g. "<service> near me", "<urgent problem> <city>", "how much does <urgent job> cost")
- Growth-intent / research persona: the earlier-funnel phrasings (e.g. "how to <achieve outcome>", "best <category> for <use case>", "<topic> SEO")
- For each query × {ChatGPT, Perplexity, Google AI Overview}: does an AI answer appear? are we cited? who is cited instead? which of their pages?

**C. Extractability** (per priority page)
- [ ] First sentence directly answers the query (answer-first)
- [ ] Answer blocks are self-contained (true out of context)
- [ ] ≥2–3 real named-source stats/quotes with citations
- [ ] Comparison table present where the query is "X vs Y"
- [ ] Real FAQ block for the sub-questions
- [ ] Correct, truthful schema (no fake Review/Rating)
- [ ] Visible "last updated" date, genuinely recent
- [ ] Headings phrased the way people ask

**D. Gap → plan**
- Every unanswered query and every failed extractability check becomes a concrete task, mapped to a lever, handed to the right writer (`blog-engine` for posts, the page owner otherwise). Feed unanswered questions into mining (below).

---

## Keyword/question mining workflow

The worked example uses the Ubersuggest MCP (`mcp__ubersuggest__*`); substitute whichever keyword-research MCP your company standardized on, and stay on that one tool for comparable numbers. If the tools are deferred, load them with ToolSearch first; run `auth_status` to confirm the connection.

1. **Seed** — start from the topic/persona pain (grounded in the ICP research doc under `kb_dir`), e.g. a core service term or an outcome your buyer wants.
2. **`keyword_suggestions`** + **`google_suggestions`** — expand to long-tail + the actual question phrasings people type. Questions ("how/why/what/cost/best/near me") are the AEO gold — they map 1:1 to answer-first passages.
3. **`content_ideas`** — surface content already earning engagement on the topic → real demand signal, not a guess.
4. **`keyword_overview`** / **`keyword_metrics`** — pull volume + difficulty. Prioritize **low-difficulty, real-buying-intent** questions over high-volume vanity head terms.
5. **`serp_analysis`** — see who currently owns the answer and its shape, so we can out-structure them (their prose answer vs our answer-first passage + table + real stat).
6. **Cluster** the results into topical groups (query fan-out): one page owns a full sub-topic and its related questions, so we're retrievable across the fan-out, not just the head keyword.
7. **Hand off** the clustered question list to the writer, tagged with the lever each question needs.

Optional to *evaluate* (don't present as authoritative yet): a research tool's own brand/AI-visibility features (e.g. `brand_visibility_overview`, `brand_prompts`, `brand_config`). Confirm what they actually measure before relying on them; until then use the manual method below.

---

## Citation tracking — the data owner's manual method

We own no tool that reliably reads our citations across AI engines, so we track honestly and manually until one is validated. **Owner: the data specialist (Dana / `data-analytics`).**

- Monthly: run the top ~20 queries across ChatGPT / Perplexity / Google AI Overviews.
- Log per query: AI answer present? are we cited? competitor cited? which page?
- Store in the metrics layer; trend month-over-month; that trend is the source of truth for "is our AEO working."
- If a research tool's brand-visibility features (or another honest source) are validated against reality, graduate them into the pipe — same evidence discipline as any measured-metrics tier. Never present a tracked "AI visibility score" you haven't verified measures what it claims.
