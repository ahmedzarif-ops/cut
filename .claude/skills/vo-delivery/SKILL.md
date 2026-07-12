---
name: vo-delivery
description: >-
  Direct and generate world-class spoken voiceover — course lessons, social hooks, ad scripts,
  webinar narration — so the read LANDS instead of sounding rushed and flat. Use whenever the work
  is turning a finished script into voice, or fixing a read that feels flat, rushed, paused-wrong,
  or "AI-sounding": "voice the lesson", "generate the VO", "re-voice this", "it sounds rushed / no
  pauses / no punch", "make the narration land", "mark the script for delivery", "direct the read",
  "add breathing room", "the lines are good but they fall flat". Marks the script for delivery
  (operative word per sentence, pause taxonomy, tone), picks the TTS model + per-segment voice
  settings from the craft brief, and renders via your video toolkit's VO script. Iris
  (creative-director) art-directs the energy arc; the vo-director agent (Vox) does the line-level
  marking. Not for reference-video avatar motion/lip-sync (a separate avatar/lip-sync render lane),
  and not for writing the script itself.
---
<!-- learning-loop: required -->

# VO delivery — direct the read so it lands

A finished script is not a finished voiceover. TTS defaults to an even, breathless, flatly-emphasized
read — that flat default *is* the AI tell. This skill inserts the missing layer between a script and
your voice-render step: it decides the one word to punch, places every pause, sets the tone, and picks
the model + voice settings — so the good lines detonate instead of running together. Grounds:
`references/craft-brief.md` (the authoritative method — read it before any marking pass).

> Requires a project-local video toolkit (a `video-toolkit/` package you supply — e.g. a
> Remotion/ffmpeg pipeline exposing these scripts). This skill documents the craft; wire the
> commands to your own toolkit's equivalents.

## The method — 4 stages: script → marked script → audio → gate

1. **Ground + art-direct.** Read the craft brief and the target script (or your `vo-segments.json`).
   Dispatch **Iris** (`creative-director`) for the *energy arc* — which beats are hook peaks, which are
   dense-teaching valleys, where warmth vs. gravity, per the brief's "energy = a WAVE across ~10 min."
   Iris returns a per-beat feeling map, not line marks.

2. **Mark the script.** Dispatch the **`vo-director`** agent (alias **Vox**) with the script + Iris's
   arc. It returns, per segment: `markedText` (TTS-native notation), a per-segment `model` and
   `voiceSettings`, and a human-readable `direction` record (operative words, pause map). It writes a
   **new, non-destructive** file — `projects/<proj>/inputs/vo-segments.marked.json` — leaving the
   original `vo-segments.json` as the plain fallback.

3. **Generate.** From your video toolkit:
   `node video-toolkit/scripts/generate-vo.mjs --segments <…marked.json> --outdir <…> [--only <beatId>]`.
   The script passes `markedText` through, strips internal `((…))` director marks, keeps the um/uh
   filler-strip + redaction guard, applies the per-segment model + settings, and (for a v2/turbo model)
   auto-down-converts ellipsis/blank-line → `<break/>`. Read the per-segment wpm pace report: a
   `too-fast` / `thin` flag routes back to stage 2 (re-mark), never a blind resend.

4. **Sync + gate.** `node video-toolkit/scripts/sync-timing.mjs --project projects/<proj>` (dry-run → `--apply`)
   re-times the assembly to the new audio. Then present the rendered audio to **Iris** (taste) +
   **Vera** (`slop-check`, the anti-AI-sound lens) before it enters the cut. Owner-gated ship — the
   owner's ear is the real gate on "less AI-sounding"; you cannot judge audio from text.

## Notation — two tiers (the crux of "strip our internal marks")

TTS only executes what you explicitly mark. Two tiers, with opposite fates at generation:

| Tier | Marks | Fate at generation |
| --- | --- | --- |
| **TTS-native** (pass through) | v3: `...` ellipsis, em-dash, blank line, CAPS on the operative word, sparse audio tags `[warmly] [whispers] [pause] [drawn out]`. v2: `<break time="1.0s"/>` (≤3s), punctuation, `speed`. | Sent to the API verbatim (v2 model → tags stripped + ellipsis/blank-line converted to `<break/>` automatically). |
| **Internal director marks** (stripped) | `((anticipation))`, `((drop, warm))`, `((operative: FOLLOW-UP))` — double-paren notes recording *why*. | Removed by `stripDirectorMarks()` before the text is ever sent. |

The strip order in the render script is load-bearing: **director-mark strip → filler-strip → redaction →
(v2 down-convert) → send**, so `((…))` never reaches the filler pass or the API, and the redaction guard
scans the final spoken string.

## Pick the model first (notation differs)

- **Expressive v3-class model** — the default for a teaching read. Ellipsis / line-break / CAPS pacing
  plus sparse `[warmly]`/`[quietly]`/`[drawn out]` tags. One `stability`+`style`+`speed` per generation —
  the intra-beat sawtooth lives in the CAPS/ellipsis/period markup, *not* in settings. Render each beat as
  its own generation (never one long file) to keep the break-count stable.
- **Controlled v2/multilingual-class model** (fallback) — when the expressive model destabilizes on a
  long, break-heavy beat. Set the segment's `model` and rerun that beat with the v2 model; the render
  script down-converts the markup for you. v2 gives exact `<break>` durations but a flatter dynamic.
- **Settings envelope** (craft brief §7): `stability` low (~0.4 Creative-lean on story beats, ~0.5 Natural
  elsewhere — never Robust, it ignores markup), `style` 0.30–0.35 (>0.6 distorts), `speed` ~0.9 baseline
  (the single biggest lever against "rushed"; ~1.0 on brisk setup, ~0.82 on the gravest one-word landing),
  `similarity_boost` ~0.75 for an instant clone. Settings live in the marked file's per-segment
  `voiceSettings`, not hardcoded — they are A/B starting points (expressive models are often alpha).

## When to use / not

- **Use:** any narrated VO across course / social / GTM — voice-agnostic (takes any `voiceId`; wire your
  cloned/brand voice ID from your own voice config). Especially: a read that came back rushed, flat, or
  with punchlines that didn't land.
- **Not:** pure terminal / diagram / b-roll with no narration; a one-off line where defaults suffice; and
  — boundary — **reference-video motion/lip-sync** (a recorded human performance → an avatar/lip-sync
  render lane), which is a separate pipeline, not this skill. This skill owns the TTS-clone *delivery*; a
  beat can be swapped to real recorded audio entirely.

## Humor + emotional direction

Each lesson carries an intended **emotional curve**, not a flat energy — e.g. curiosity → concern →
frustration → insight → cautious hope → relief → pride. Constant excitement is synthetic and *destroys
contrast*: a read that peaks everywhere lands nowhere. Direct the read to move through the curve so the
insight beats have something to land against.

Humor rules (narrow on purpose):
- Humor comes only from **truth, character, or a callback** — never from a bolted-on joke.
- **Never interrupt a command, a warning, or a difficult concept with a joke** — the beginner needs those
  clean.
- No memes, no sarcasm aimed at the learner, no "AI is taking over" jokes.
- Humor is a **pressure release AFTER tension**, not a substitute for teaching.

## Prosody caveat — generate in coherent passage units

Generate VO in **coherent pace-lane / emotional-passage units**, NEVER split mid-passage. Prosody (the
rise-and-fall that carries meaning) must survive across sentence boundaries, so a split that cuts through a
passage strands the intonation. If a candidate sub-generation would be **under ~2 sentences**, prefer
**re-marking** (operative/pause/tag changes) over splitting further — another split there costs more
naturalness than it buys pace control.

## Rewrite the line before you chase the settings

If a line still reads **synthetic after TWO bounded performance attempts** (settings tweaks or re-marks
on the same words), stop adjusting voice settings and **rewrite the line for speech** — reshape the words
so a human mouth would say them, then re-mark. Some sentences are written to be read, not spoken; no
`stability`/`style`/`speed` value rescues a line the tongue trips on. Keep this inside your loop budget
(a small fixed cap of pre-publish / post-publish iterations, per the craft brief) — it is NOT a new
independent cap and never buys extra iterations.

## Pronunciation — the canonical lexicon

Never guess a brand or person pronunciation — **confirm with the owner** (company.yml → owner.name). Keep
a canonical, machine-readable lexicon in your video toolkit (e.g. `config/pronunciation-lexicon.yaml`,
fields: `term`, `say`, `phonetic_hint`, `reference_audio`). Consult it before voicing any
brand/product/person term; add a new entry (with an owner-confirmed `say`) rather than voicing an unknown
term blind.

## Composition

Slots in as **input prep upstream of the voice-render step** and the video-editor conductor. It does not
replace the render script — it produces the marked input the render script consumes and reads back its
pace report. Pure logic lives in your toolkit's VO helper (e.g. `video-toolkit/scripts/lib/vo-delivery.mjs`) with paired
tests. Capture what each pass learns about this voice in `learnings.md`.
