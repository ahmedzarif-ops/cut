# Shorts 9:16 preset patterns

> Distilled from claude-code-video-toolkit (MIT, github.com/digitalsamba/claude-code-video-toolkit)
> `templates/concept-explainer-short` (vertical shorts pipeline) and `templates/sprint-review-v2`
> (composable scene structure), re-expressed for a Remotion engine (30fps, manifest-of-beats).
> Presenter/script delivery craft lives in the `vo-delivery` skill.

## Format

- 1080×1920 (9:16), 30fps. Platform ceilings: YouTube Shorts ≤ 3 min, Reels ≤ 3 min,
  TikTok ≤ 10 min — warn past 3 minutes; aim well under.
- Arc for one short: **hook → explanation → payoff → CTA**. One concept per short, never two.

## Pacing budget (plan the script BEFORE generating anything)

- Narration words ÷ 2.4 ≈ seconds per scene. A 60s short is ~140 words total.
- Hook discipline: scene 1 must earn the next 5 seconds — question or tension in the FIRST
  sentence, under 3 seconds of setup, zero throat-clearing.
- VO drives timing (~150 wpm comfortable narration; a sane pace QC band is 110–170 wpm). After
  TTS, close drift with a `sync-timing` step — timeline math re-derives from measured audio;
  nothing is manually re-timed.

## Visual rhythm

- Alternate text-bearing cards with motion b-roll so the viewer gets a **pattern interrupt
  every ~15 seconds**. One shared palette across all cards.
- Asset intent split: static card = anything with legible text; motion clip = atmosphere only —
  never generate on-screen text inside motion footage.
- Missing asset ⇒ render a placeholder card and keep moving: the assembly must render at every
  stage (placeholders → estimated timing → silent → full). Show intermediate renders, don't
  describe them.

## Captions (sound-off is the default viewer)

- Big burned karaoke captions, 1–3 words at a time, timed from word-level timestamps but
  force-aligned to the SCRIPT text (never the transcriber's own words — the vid-captions rule).
- Position clear of platform UI (bottom ~25% is covered by controls/handles) and clear of any
  text rows in the cards themselves.

## Scene-structure model (from sprint-review-v2 — how to grow beat types)

- One config drives everything: a typed `scenes`/beats array where each entry is
  `{ type, ...props }` and every scene type is optional and reorderable. A Lesson manifest
  (`projects/*/manifest.json` beats) is the same shape — add new beat types, don't fork projects.
- Its 12 scene types (title, context, goal, highlights, demo, decisions, metrics, carryover,
  learnings, roadmap, summary, credits) map to a reusable narrative arc:
  **set the stage → the journey → the outcome → what's next → closing.**
- Per-scene timing conventions: title 3–5s, overview/bullets 10–20s, demo 10–30s (adjust
  `playbackRate` to fit, constant per clip), stats 8–12s, credits 5–10s.
- Transitions resolve by scene-type pair with per-scene override — pick one default pairing
  table instead of hand-choosing per cut.

## Review checklist before calling a short done

1. Pull frames at several timestamps and LOOK: caption collisions, crops, leftover placeholders.
2. Check per-segment wpm output from the VO step; FAST/SLOW flags need a script edit or retake
   (a rushed voice-clone reference cannot be fixed by resampling).
3. Script changed? Re-run VO for that segment, re-caption, re-run sync-timing — in that order.
