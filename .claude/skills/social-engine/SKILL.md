---
name: social-engine
description: Run your company's social media engine - research what is currently working, draft about 3 on-brand concepts for LinkedIn, YouTube Shorts, Instagram Reels, and TikTok, generate finished assets (short-form video plus images and carousels) after the owner approves the concepts, drop them in a review folder, and schedule approved posts to a scheduler queue (e.g. Buffer via Zapier). Runs in two modes - the weekly batch, and per-blog amplification (repurposing a freshly published post into social, linked back). Use whenever the user wants to make, repurpose, or schedule social content, even if they don't say 'skill' - triggers include 'run the social engine', 'make social posts', 'repurpose the blog into social', 'schedule social posts', 'turn this blog into a LinkedIn post', 'make a Reel/Short/TikTok', and 'social carousel'.
---
<!-- learning-loop: required -->

## Self-improvement loop (Ground -> Capture -> Propose)
This skill runs a lightweight learning loop:
- **Ground:** before dispatching the agent, read `learnings.md` in this skill dir (run log, open gaps,
  what-works) and pass it into the agent's context along with its canonical knowledge files (below).
- **Capture:** after the agent returns, append ONE dated row to the top of the `learnings.md` run-log
  table (what ran, what worked, change next time), read from the agent's "## Learnings" output section.
- **Propose:** never silently edit a canonical playbook or content KB. Put proposed canonical-file changes
  under "Proposed refinements - HUMAN REVIEW" in `learnings.md` for the owner to approve.

# Social Engine

## Overview
Turns the week's research (market-radar + blogs + live signals) into ~3 cohesive concepts, then finished social assets, with a human gate at the concept stage (before any generation spend) and again before anything is queued to a live channel. Runs IN the main session (MCP tools are live); dispatches the `social-concept-strategist` subagent for synthesis. Mirrors the `market-radar` + `blog-engine` pattern.

## Two modes
- WEEKLY BATCH: ~3 core concepts from the week's research -> 12 platform-posts (shared-concept model).
- BLOG AMPLIFICATION: a newly published blog -> 1 repurpose concept across the platforms, linking back. Trigger: "/social-engine blog-amplify <slug>" or after a blog deploys.

## 0. Ground yourself first
Every fact comes from config or the KB, never from invention:
- **Who you sell to** — `company.yml` → `icp.description`, and the full research at `icp.research_doc` (a file under `kb_dir`). If the ICP research doc is missing, run ICP research first — never invent customer pains or personas.
- **Current demand + proven formats** — your market-radar feed and content-strategy notes under `kb_dir` (produced by the `market-radar` skill), and `social-learnings.md` under `kb_dir` (what works + dedup + current viral formats).
- **What you sell** — `company.yml` → `offer.*` and your live product/offer pages (for the soft plug). For blog-amplification, your blog content module (wherever your site stores posts) — the post to repurpose.
- **How you sound** — `company.yml` → `brand.voice` and `brand.banned_phrases` (and `brand-voice.md` in the `blog-engine` skill if you keep one canonical voice file). Governs every caption and hook.
- **Virality / attention KB** — your virality/attention knowledge base under `kb_dir` (e.g. `kb/virality-lab/`), if you keep one. Read it at concept stage: social short-form is the HOOK lane, so front-load a pattern-break before second 3. Any predictor/proxy scores stay labeled as predictions until real retention data lands (honesty wall); never re-edit a sustain asset to chase a hook score; append any new measurement back to the KB.

## 1. Set the budget (cost guardrail - first)
Announce a per-run budget, track against it, and stop at the cap — this is the guardrail that keeps a run from quietly draining a paid credit plan. As an example estimate: research <= ~15 MCP calls; generation ~3 short-form videos + a few images, well within a typical monthly credit plan (treat these numbers as an estimate, not a fixed contract — re-check against your generation tool's live pricing and your plan's monthly cap). For blog-amplification, scope to 1 concept.

## 2. Research (live, budget-capped)
Capture what your ICP audience is engaging with + CURRENT viral formats. Skip platforms your research has found low-signal or hostile to scraping, and degrade gracefully on anti-scraper platforms.
- A YouTube intelligence tool (e.g. VidIQ): keyword + trending + outlier formats for your niche (often the most reliable signal).
- A SERP/social scraper (e.g. Nimble): scrape the SERP + BEST-EFFORT LinkedIn / Instagram / TikTok trend signals (these platforms fight scrapers; degrade gracefully).
- A keyword tool (e.g. Ubersuggest): keyword angles for hooks/captions. Instagram outlier-reel / profile tools surface IG signal; YouTube outlier topics come from the YouTube intelligence tool.
- Log the current winning formats into `social-learnings.md` under `kb_dir` ("Current viral formats").
- **Video-content analysis (via `/watch`):** `/watch` lets you actually watch a top-performing competitor Reel / Short / TikTok (auto-scaled frames + a timestamped transcript), not just read its title or caption. Use it to decode WHY a video is winning — the first-3-seconds hook, the on-screen text, the pacing, and the post structure.
  - PATTERN: the ORCHESTRATOR (this skill, in-session) runs `/watch <url> "<question>"` (`--start/--end` to focus the hook window, `--resolution 1024` to read on-screen text), then feeds the timestamped frame+transcript analysis into the `social-concept-strategist`'s brief as grounding — exactly like the research above. The read-only strategist has no Bash and never calls `/watch` itself.
  - DISCRETION: reach for it only when the VIDEO ITSELF is the signal (you need to SEE what is on screen / HEAR how it is delivered); SKIP it when the title, caption, or metadata already answers. Frames are image-heavy (token cost), so prefer a focused `--start/--end` window (e.g. the first 3-5s) over the full clip. Video analysis is a research INPUT, never a fabricated claim.

## 3. Draft concepts (dispatch the subagent)
Dispatch `social-concept-strategist` with the research + the ground-truth paths. It returns ~3 concepts (per the `social-learnings.md` post contract), each mapped to a pain/persona, <=1 a soft plug.

## 3b. Compliance gate (required before the concept gate)
Before presenting concepts and captions to the owner, dispatch the `content-compliance-reviewer` subagent (Gus, `subagent_type: "content-compliance-reviewer"`) on the drafted copy and captions. Surface its verdict alongside the concepts:
- `VERDICT: PASS` then present concepts as normal.
- `VERDICT: FLAG` then fix every `block`-severity finding and show `warn` findings to the owner.

Also run the anti-AI-slop gate on the drafted copy and captions: `/slop-check <copy> content` (Vera, the `ai-slop-critic` agent). Sibling to this compliance gate: Gus owns claims, Vera owns generic/templated quality and distinctiveness. Both gates feed the single cost-gate rule in section 4 — no generation spend until concepts pass these gates and the owner approves — so there's no need to re-resolve a `block` finding after that gate.

## 4. Concept gate (before any generation spend)
This gate exists because asset generation is where the credits burn, so nothing gets generated until a human has approved the concepts. Write the ~3 concepts to a dated review folder (e.g. `<kb_dir>/social/YYYY-MM-DD/`) as concept-status markdown, show the owner the concepts, and get their approve/kill before generating any asset. Hold all generation spend until concepts are approved.

## 5. Generate assets (approved concepts only, in-session)
- Video (Shorts/Reels/TikTok): a text-to-video / image-to-video tool (e.g. Higgsfield generate_video), vertical, ~15s, per the concept's script + visual direction (face-cam + screen-rec style). One video serves all three short platforms.
- Text-forward carousels + stat/statement cards: use the **brand slide templates** (`templates/social-slide.template.html` via `templates/build-social-slides.mjs` → Playwright PNG; see `templates/render-slides.md`). Align the template's tokens to your brand (`company.yml` → `brand.visual_notes`) so they match your site/decks/emails — crisp on-brand typography AI can't reliably produce. Types: cover/point/stat/cta; ratios 1x1 (1080x1080) + 9x16 (1080x1920). **No testimonial/quote slide type** — fabricated proof is an advertising-law risk (see `company.yml` → `legal.regulated_claims`); stats/statements only, cite claims.
- Photographic images / lifestyle visuals: an image-gen tool (e.g. Higgsfield Nano Banana or a Gemini image MCP — confirm the path at build time).
  - **Your brand imagery system governs all photographic generation, if you keep one.** Use your on-brand prompt recipes + a "would a real customer call BS?" credibility checklist, and for any **image-with-text** a scrim + AI-flag chip pattern (measure WCAG-AA contrast on real pixels). **Fabrication wall:** a generated person is never proof and is never placed adjacent to ratings/quotes/testimonial UI. (Blog + decks inherit the same imagery system.)
- Save assets into the dated folder; set each post's `asset_path` + `status: asset-generated`.

## 6. Folder review
Finished posts sit in the dated folder for the owner's final review. Update `status → approved` on their ok.

## 7. Scheduler queue (approved only)
For approved posts, use your scheduler (e.g. the Zapier MCP → Buffer's queue: channel + caption + media + suggested_slot). Queue only — never auto-publish to a live channel without folder approval, because a live post is public and irreversible once it's out. Set `status: scheduled`. If the scheduler action is not connected, fall back to a scheduler-import CSV and tell the owner to connect it.

## 8. Report usage + learn
Report research calls + generation credits used. Append every post to `social-learnings.md` ("Post log"). When performance data is available later (analytics tools, the scheduler, or the owner pasting platform numbers), log it to "Performance log" and update "What works"; when a format decays, re-research current winners.

## Long-form / course repurposing rules
For repurposing a long-form asset (a course lesson, a webinar, a build session) into social:
- **Re-author per platform; never raw cross-post the same clip.** Each platform gets its own edit, not one byte-identical asset everywhere.
- **Architecture / receipts carousel** is a named format: a static carousel built from real diagrams / artifacts / receipts, brand-styled (owned assets only — never fabricated).
- **Shorts route to long-form via the native related-video attach.** Shorts descriptions and comments are typically NOT clickable, so never rely on a link in Short text — attach the long-form as the related video. VERIFY LIVE at build (platform behavior changes).
- **Atomization menu:** per long-form asset, extract 2-5 Shorts + a carousel + a poll + a clinic — but ONLY the formats that fall out of the source organically, never forced.
- If your content is fronted by a single consistent brand persona rather than a named individual, keep that persona consistent across every repurpose.

## Guardrails
These protect against the two ways this engine can do damage — wasted credits and an un-reviewed public post:
- Two-stage approval (concepts before assets; folder before scheduling); no silent auto-publish, since a live post is public and irreversible.
- Per-run generation budget; estimate + report; stop at the cap.
- ICP + voice grounding; soft-plug ratio ~1 in 4-5; value first.
- Skip low-signal / anti-scraper platforms per your research hygiene; live social scraping is best-effort.
- Append-only `social-learnings.md`; never fabricate performance numbers.

## Setup dependencies (one-time, owner)
- Connect your scheduler (e.g. Buffer inside Zapier) so the MCP can queue posts; confirm the connected channels.
- Confirm the image-gen path (e.g. Higgsfield Nano Banana vs a Gemini image MCP).
- Align `templates/social-slide.template.html` tokens (colors/fonts/wordmark/logo) to your brand.

## Common mistakes
- Generating assets before the concept gate (wastes credits).
- Scraping low-signal platforms, or trusting fragile LinkedIn/TikTok scrapes as if reliable.
- Auto-publishing without folder approval.
- Drifting off the soft-plug ratio (too salesy) or the voice rules in `brand.banned_phrases`.
