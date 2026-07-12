---
name: repurpose
description: "Turn ONE video (or any long-form source — talk, webinar, podcast, brand-avatar lesson) into a full cross-linked content set (blog + email + LinkedIn + short-form + carousel) by CHAINING your existing content skills, all pointing back to the canonical blog. Use whenever the user has one video/long-form asset and wants it atomized across channels — even if 'skill' is never said. Triggers include 'repurpose this video', 'turn this video into a blog and posts', 'atomize this content', 'make a week of content from this video', 'one video into everything'. This is a THIN orchestrator: it extracts the core ideas ONCE, then routes to blog-engine (blog), social-engine (LinkedIn/Reels/carousel), and email-marketing — it never re-implements them. For an already-published BLOG into social only, use social-engine's per-blog mode; for one blog from scratch use blog-engine; to just watch a video use /watch. Honesty + the compliance/anti-slop gates ride in through each child skill."
---

# Repurpose — one video, every channel

The most under-used asset a company produces is a single good video: a founder talk, a brand-avatar lesson, a webinar. Each one contains a week of content if it's atomized properly. This skill is the **thin orchestrator** that does that atomization — once — and routes the pieces to the skills that already own each channel.

**The one rule that keeps this thin:** extract the ideas *once*, then chain. This skill does NOT write blogs, social copy, or emails itself — `blog-engine`, `social-engine`, and `email-marketing` already do, with their own compliance and anti-slop gates baked in. Re-implementing any of them here would create a second owner and invite drift. If you find yourself writing a caption or a blog paragraph in this skill, stop — dispatch the child instead.

## Ground yourself in config first

Ground the whole repurpose against config so every derivative speaks the company's story to the right persona:
- **How you sound + the story** — `company.yml` → `brand.voice`, `brand.banned_phrases`, and your canonical message/story KB under `kb_dir` if you keep one.
- **Who you sell to** — `company.yml` → `icp.description`, and the full research at `icp.research_doc` (a file under `kb_dir`). If the ICP research doc is missing, run ICP research first — never invent customer facts or personas.

## When to use this vs the neighbours

- **This skill (`repurpose`)** — the source is a **video / long-form asset** and you want it fanned across **multiple** channels.
- **`social-engine`** — the source is an already-published **blog** and you only want **social** out of it (its per-blog amplification mode). This skill *calls* that mode; don't duplicate it.
- **`blog-engine`** — you want **one blog** written from scratch or refreshed (no video source, no multi-channel fan-out).
- **`/watch`** — you just want to **understand** a video, not repurpose it.

## The canonical-hub model

The **blog post is the hub.** It's the durable, indexable, AEO-optimized asset (it applies the `ai-seo` levers inline). Every other piece — email, LinkedIn, Reel, carousel — is a spoke that links back to the blog. That gives one SEO-compounding destination, one place to measure, and one story told consistently across surfaces. Build the hub first, then the spokes.

## The pipeline

Run in order. Each step hands its output to the next; don't parallelize the blog and social, because social links to the published blog URL.

**1. Ingest the source (once).**
- Video (URL or file) → use **`/watch`** to pull the transcript + key frames.
- Video hosted on a platform with a transcript API → pull the transcript from that API (wire to your own video-host tooling); otherwise fall back to `/watch`.
- Already have a clean transcript → read it directly.

**2. Extract the shared spine (once) — the honesty gate lives here.**
Write a short **repurpose brief** every child will inherit, containing:
- the ONE core thesis of the video,
- 3–5 key ideas/claims, each with its supporting evidence and the **source timestamp** it came from,
- the 2–4 most quotable lines (verbatim, with timestamps),
- the target persona + intent (e.g. urgent/reactive vs growth/proactive — from `icp.description`).
Save it to a working path, e.g. `ops/repurpose/<slug>/brief.md`.
**Never invent a claim, stat, or quote that isn't in the source.** If the video doesn't support a point, it doesn't go in the derivative content. Real quotes only, attributed to the speaker. This is the single extraction the whole set trusts, so its honesty is load-bearing.

**3. Build the hub — blog.** Dispatch **`blog-engine`** with the brief as the angle + research seed → one EEAT post (it runs its own compliance + anti-slop gates and the AEO levers). This post's URL is the link target for every spoke. If a blog autopilot's cadence cap would block a new post, note it and let the autopilot schedule it — don't override the cap.

**4. Build the spokes — social.** Dispatch **`social-engine`** in its **per-blog amplification mode** against the published blog → LinkedIn post + Reel/Short concept + carousel, each linking back to the blog. Social-engine owns the assets, the gates, and the scheduling; this skill just points it at the hub.

**5. Build the spoke — email.** Dispatch **`email-marketing`** to fold the core idea into a value-first nurture or broadcast email that links to the blog. Copy only unless an ESP is wired in `company.yml` → `integrations.esp`; sending stays owner-gated.

**6. Assemble + hand off.** Produce a one-screen **repurpose map** for owner review: the source, the hub URL, each spoke, and where each links. List anything still pending a child-skill gate or owner approval. Nothing publishes or schedules without the owner tap the child skills already require.

## Cross-linking + measurement

- Every spoke links to the blog hub; the blog can link out to the source video and the relevant offer/product page.
- Tag spoke links so attribution is traceable, and hand the "which repurposed asset drove what" question to **Dana** (`data-analytics`) — don't invent an attribution number here.

## Guardrails

- **Honesty** — derivatives may only carry claims/quotes present in the source (Step 2). No fabricated proof, no stat the video didn't say. Same wall as `ai-seo` and the blog engine.
- **No double-gating, no re-implementation** — the child skills carry the compliance/anti-slop personas and their own owner gates; this orchestrator adds none and writes no channel copy itself.
- **Respect cadence caps** — any blog autopilot and social-engine already enforce publishing cadence; this skill feeds them, it doesn't bypass them.
- **YAGNI** — if a source only warrants one channel, just call that child skill directly; don't run the whole pipeline for its own sake.

## Related skills

`/watch` (ingest) · `blog-engine` (hub) · `social-engine` (social spokes) · `email-marketing` (email spoke) · `ai-seo` (the AEO doctrine the blog applies) · `data-analytics`/Dana (attribution).
