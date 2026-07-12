---
name: blog-engine
description: Research, write, verify, and ship one high-quality, EEAT-grade ranking blog post for your company's marketing site, or surgically refresh an already-published one. Covers angle-picking without cannibalization, real-source research, on-brand writing, the compliance and anti-slop gates, and owner-gated deploy. Use whenever the user wants blog or SEO content, even casually, including "write a blog", "new post", "draft an article", "rank for X", "content for [persona]", "refresh/update a post", or building out a blog cluster to plug the offer. Reach for it even if they never say the word "skill". Not for social repurposing (use social-engine), paid ad copy, or landing pages.
---
<!-- learning-loop: required -->

# Blog Engine

## Overview

A repeatable pipeline to research, write, verify, and deploy one high-converting, EEAT-grade blog post for your company's marketing site. Posts live in your blog content module (wherever your site stores posts — a `blog.ts`/`posts` file, a CMS, or a Markdown directory). Read that module first every run so you know what already exists.

**Core principle: one genuinely helpful, real-research-backed post per run.** Quality and distinctness are the strategy. Mass-producing thin or near-duplicate posts triggers Google's scaled-content-abuse spam policy and can sink the whole domain. Ranking fast comes from a tight, well-linked cluster of genuinely useful posts, not volume.

## When to use

The full trigger list lives in the description above. The nuance worth keeping here: this engine is the right call when building out the blog content cluster or filling a specific persona/keyword gap, not just one-off requests.

## Ground yourself in config first

Every fact this skill needs comes from config, never from invention:
- **Who you sell to** — `company.yml` → `icp.description`, and the full research at `icp.research_doc` (a file under `kb_dir`). If the ICP research doc is missing, run ICP research first — never invent customer facts or personas.
- **What you sell** — `company.yml` → `offer.summary`, `offer.pricing_notes`, `offer.booking_link`. Product/offer page URLs come from your live site, not from memory; confirm them before linking.
- **How you sound** — `brand-voice.md` in this skill (the canonical blog voice, seeded from `company.yml` → `brand.voice` and `brand.banned_phrases`). Governs every sentence. Read every run.
- **Legal constraints** — `company.yml` → `legal.regulated_claims` for any industry claim rules that gate what you can say.
- **Deploy target** — `company.yml` → `integrations.deploy_target`.

## Two production modes (two agents share this skill)
- **New posts** → the `blog-publisher` agent. Researches and ships ONE new, distinct post per run. Use the full pipeline below.
- **Refresh existing posts** → the `blog-updater` agent. Improves ONE already-published post per run: re-verifies and swaps stale stats/sources, adds relevant internal links to offer/product pages and related posts, and bumps `dateModified` for a real freshness/EEAT signal. Surgical edits only; never rewrites the angle or keyword (that risks existing rankings). The same research method, voice rules, and anti-spam guardrails in this skill apply.
- **If you run an autonomous blog autopilot loop**, route routine net-new posts through it and reserve this manual pipeline for owner-invoked cornerstone pieces. If you don't, this manual pipeline is the whole engine.

## Supporting files (this skill's memory)
- `brand-voice.md` — the canonical blog voice. Read every run.
- `learnings.md` — living memory: published-post registry, open cluster gaps, what works. Read it before writing, append to it after.
- Your market-radar / demand-signal feed under `kb_dir` (produced by the `market-radar` skill), if you keep one — read it for current demand signals and content-opportunity clusters.

## The pipeline (run in order)

### 0. Ground yourself first (read before writing)
Read these every run so the post reflects the CURRENT site, offer, and accumulated learning. This is what makes the engine improve over time instead of repeating itself:
- Your blog content module — every existing post (so you never cannibalize).
- The current offer — `company.yml` → `offer.*` and your live product/offer pages (so plugs stay accurate as the offer evolves).
- The current handoff/state (via the `handoff-refresh` skill) — locked decisions and caveats (claim-gating items, do-not-fabricate, current positioning).
- `brand-voice.md` — the voice authority for every line.
- `learnings.md` — accumulated insights, the published registry, and the open cluster gaps to pick from.
- Your market-radar feed under `kb_dir`, if present — fresh audience searches, pains, and content-opportunity clusters.

### 1. Pick the angle (avoid cannibalization)
- Read your blog content module and list every existing slug + target keyword.
- Choose a NEW, distinct keyword cluster. Never overlap an existing post's primary intent.
- Map it to ONE ICP persona from `company.yml` → `icp.research_doc`. Write to that persona by name-of-pain, in their own words — never to a generic "SMBs." If no persona research exists yet, run ICP research first.

### 2. Research (real data only, no fabrication)
Use the research tools you have; verify what you have access to before you rely on it (some keyword tools may not be on your plan, some forums/sites may be blocked to your crawler). A workable baseline with only web search:
- **SERP recon:** `WebSearch` the candidate keywords. Read who ranks and how saturated it is. A bloodbath of high-authority incumbents = pick a longer-tail or more differentiated angle.
- **Forum/community pain mining:** `WebSearch` with `allowed_domains` set to the forums and communities your ICP actually uses (find these in your ICP research doc). Capture real thread titles and the pain in the audience's own words.
- **Verify every statistic** against a real, named source with `WebFetch` before citing it. If you cannot source it, drop it. Never invent a number. Search-summary numbers are often unsourced — trace to the named primary or cut.

### 3. Design the post
- **Title (H1):** target keyword + benefit, aim ~60 chars.
- **Slug:** kebab-case, keyword-rich, unique.
- **Meta description:** ~150-160 chars, keyword + benefit.
- **Outline:** intro hook (validate the pain in their words) → 5-7 `h2` sections that answer the real questions found in research → ordered "do this" plan → an earned offer-plug section → bottom line. Long-form is the SUSTAIN lane (build attention through the body), while the intro hook still needs a fast pattern-break. Any predicted-engagement score stays labeled as a prediction until real retention data lands.
- 4 credible sources (forum threads count as experience signals; pair them with named data sources).
- **AEO/GEO levers (get cited by AI answer engines, not just ranked).** The `ai-seo` skill is the source of truth for this doctrine + the honesty wall; this is the in-flow checklist for a post. Three causal, fully-controllable levers (directional — never publish a % as a claim):
  - **Answer-first passages:** open each `h2` with a self-contained direct answer in its FIRST sentence, then expand. LLMs retrieve and quote at the passage level, so a section that answers its own question up front is what gets lifted.
  - **Quotable evidence in the body:** back claims with named-source statistics, a direct quotation, and cited sources (this is the proven citation lift; keyword stuffing does nothing). Reuse the real Step-2 research — never fabricate a stat.
  - **Rank first, then win the passage:** organic top-10/20 is still where most AI-answer citations originate, so the existing SEO bar is the precondition, not a separate track.
  - Do NOT add llms.txt or similar files as a "citation lever" — no major AI engine uses them; claiming they do would break the honesty rule.

### 4. Write into your blog content module
Insert a new post at the TOP of the post list. Match your module's post schema exactly. A typical structured-post schema:
- Fields: `slug, title, description, datePublished, dateModified, tags[], readingTime, eyebrow, excerpt, body[], sources[], keyTakeaways[]`.
- `body` block types: `{type:"p",text}`, `{type:"h2",text,id}` (always give an `id` for the TOC), `{type:"h3"}`, `{type:"ul",items}`, `{type:"ol",items}`, `{type:"quote",text}`, `{type:"cta",text,href,label}`.
- Paragraph text supports inline `[label](href)` links. Use them for internal linking.
- **Key takeaways:** author `keyTakeaways: string[]` of 3-4 plain bullets (each ~20 words max) that summarize the post's main points. Summary only: no claim that is not already substantiated in the body. May include one internal offer link. Renders as a "Key Takeaways" box at the top of the post.

If your site is Markdown/CMS-based, map these to your front-matter and headings instead — the craft (unique slug, keyword-rich title/meta, anchored H2s, cited sources, key-takeaways summary) is the same.

### 5. CRO + offer plugs (natural, earned)
- Two `cta` blocks to your primary conversion action (`company.yml` → `offer.booking_link`, or your lead-magnet/free-check page): one mid-post, one at the close.
- Inline plugs for your relevant product/offer pages in the "here is how" / offer section — named, framed as "this is the gap we close," never salesy.
- Internal-link 1-2 existing posts to build the cluster.

### 6. EEAT + voice rules (the source of cross-post consistency)
- **Apply `brand-voice.md` as the voice authority** for positioning, tone, signature moves, offer framing, and words to use vs avoid. Consistency across posts comes from this file.
- Author is a consistent named author. Set `datePublished`/`dateModified`.
- Honest, balanced framing (state nuance, do not overhype). No fabricated stats.
- **Apply your `company.yml` → `brand.voice` and `brand.banned_phrases` rules to all client-facing copy.** (Example house rule set: no em dashes, no emojis, plain words, calm tone; write numbers/ranges as "12,000 dollars" and "15 to 85" to avoid em/en dashes. Use whatever your brand actually mandates.)

### 7. Verify (evidence before deploy)
- Grep the post for any punctuation your brand bans (e.g. `grep -n "—" <file>` returns nothing if em dashes are banned).
- Your project's type/lint check passes (e.g. `npx tsc --noEmit` exits 0 for a TS module).
- Render check in a real browser (see the `deploy-and-verify` skill): load `/blog/<slug>`, confirm H1, anchored H2s, both CTAs, offer + internal links, `BlogPosting` JSON-LD with author, and the post on the `/blog` index + in `/sitemap.xml`.
- **Citation-readiness (AEO):** confirm each `h2` opens with a self-contained answer sentence, and the body carries at least 2-3 named-source stats/quotes with citations — the Step-3 GEO levers actually landed. Every such stat must be real (honesty gate).
- **Deterministic draft-integrity check:** run your blog draft-integrity checker (`ops/scripts/blog-draft-integrity.mjs` — a zero-dependency pure function that flags empty link anchors and named citations in the prose that never appear in `sources[]`). It must report 0 empty anchors and 0 unsourced citations. This is a mechanical backstop, not a replacement for the model gates below.
- Do NOT run a full production build while a dev preview server is live (it can corrupt the build cache). A remote deploy build is safe.

### 7b. Compliance gate (required before deploy)
Before deploying, dispatch the `content-compliance-reviewer` subagent (Gus) on the full post draft. Surface its verdict with the draft:
- `VERDICT: PASS` then proceed to deploy.
- `VERDICT: FLAG` then resolve every `block`-severity finding before deploying, and present `warn` findings to the owner. Never deploy a post with an unresolved `block` finding.

This gate complements, and does not replace, this skill's own anti-penalty and voice checks (the Quality bar section below).

Also run the anti-AI-slop gate before deploy: `/slop-check <draft> content` (Vera, the `ai-slop-critic` agent). Fold every `block` finding and aim for a slop score of 80 or higher. Sibling to the compliance gate: Gus owns claims, Vera owns generic/templated/substanceless quality and distinctiveness.

### 8. Deploy
- Build to your deploy target (`company.yml` → `integrations.deploy_target`).
- DEPLOY GATE: production deploy is owner-gated. Build + verify, then deploy only on the owner's explicit go in the same message.
- Confirm prod: post URL 200 and slug present in `/sitemap.xml`.
- After deploy, optionally amplify the post into social posts: run `/social-engine blog-amplify <slug>` (it repurposes the post across social channels, linking back to drive traffic).

### 9. Update the handoff
Bump the `/blog` route line (post count + the new slug/angle) via the `handoff-refresh` skill so project state stays current.

### 10. Capture what you learned (the self-improvement loop)
Append to `learnings.md` so the next run is smarter:
- Add the new post to the Published posts registry (slug, keyword, persona, hook).
- Remove the gap you just filled from "Open cluster gaps"; add any new gaps you spotted.
- Note what worked (a hook, a structure, a CTA) under "What works".
- If you found a voice rule worth making canonical, add it under "Proposed brand-voice.md refinements" for HUMAN review. Do NOT silently edit `brand-voice.md`.
This loop is the point: each run reads the last run's learnings, so the engine and the brand voice get more consistent and more effective over time.

## Quality bar and SEO safety (these gates protect the domain first)
Over-posting or low-quality "slop" can get the whole site demoted or deindexed, so these gates exist to protect the domain before anything else. When in doubt, publish nothing.
- **Cadence cap:** at most 2 posts per rolling 7-day window, at least 2 days apart. Check the latest publish dates in `learnings.md` + your blog content module before writing; if it would break the cap, stop and publish nothing this run, because a second same-window post is exactly the scaled-content pattern Google penalizes. Write one post per run and don't loop, for the same reason.
- **Pre-publish gate (each of these must pass or the post should not deploy, since one failing dimension is enough to make the post look like slop):** distinct keyword + angle (no near-duplicate); genuinely helpful and specific (not filler); every stat sourced to a named source (zero fabricated stats/testimonials/cases); substantial (~1,200+ words); real EEAT/experience framing; people-first (no sentence that exists only for SEO); voice clean (brand punctuation rules pass, type/lint passes).
- **Comply with Google policies by name:** scaled content abuse, spam/auto-generated content, helpful-content / people-first, EEAT.
- **Safest mode:** on a schedule, prefer draft-then-human-approve over auto-deploy. A failed gate means HALT, never ship slop to keep a schedule.
- A small, tightly cross-linked cluster of genuinely useful posts outranks a firehose of filler, and avoids penalties. That is the whole strategy.

## Common mistakes
- Cannibalizing an existing post's keyword. Always diff against the existing posts first.
- Citing an unverified stat (the search summary's number is often unsourced). Verify or cut.
- Banned punctuation or emojis sneaking in. Grep before deploy.
- Forgetting `id` on an `h2` (breaks the table of contents).
- Deploying without the owner's explicit go.

## Audio readout (optional, MAIN SESSION only)
After a post's text is approved and live, you can add a "Listen to this article" MP3. This runs in the MAIN SESSION, never inside a blog subagent (subagents typically have no MCP access and cannot call a TTS engine).

Steps:
1. Build the narration script from the post (title first, lists flattened, CTAs skipped, links stripped to their label). Keep this as a small helper next to your blog module.
2. Generate the MP3 with a TTS tool (e.g. a voiceover MCP or ElevenLabs), using a consistent voice. Chunk long scripts by paragraph and concatenate with ffmpeg.
3. Save the file to your public blog-audio path (e.g. `public/blog-audio/<slug>.mp3`) and read its duration (ffprobe).
4. Set the post's `audio` field: `audio: { src: "/blog-audio/<slug>.mp3", durationSeconds: <n> }`.
5. Redeploy. The post page renders the player and the AudioObject schema automatically.

No SEO claims: the readout is for accessibility, dwell time, repurposing, and brand polish only.
