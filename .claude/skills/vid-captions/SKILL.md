---
name: vid-captions
description: Animate word-level captions from an existing transcript - active-word highlight, brand styling - with no re-transcription. Use whenever a clip needs captions or subtitles - "add captions", "caption this", "burn in subtitles", "karaoke captions", "make it sound-off friendly", "subtitle the clip". Renders via Remotion, burned-in on a field by default or ready to overlay onto footage. Needs a {word,start,end} transcript (run vid-transcribe first). Not a transcriber (use vid-transcribe). Part of the video pipeline conducted by the video-editor agent.
---

# vid-captions

> Requires a project-local video toolkit (a `video-toolkit/` package you supply — e.g. a
> Remotion/ffmpeg pipeline exposing these scripts). This skill documents the craft; wire the
> commands to your own toolkit's equivalents.

Captions straight from the transcript you already have — no second transcription pass. Groups
words into readable chunks and highlights the active word (karaoke style), rendered in Remotion
so the styling matches the brand. Most feeds are watched sound-off, so this is high-leverage.

## When to use
A clip needs captions/subtitles. Triggers: "add captions", "caption this", "burn in subtitles",
"karaoke captions", "sound-off friendly".

## Prerequisite
A word-level transcript — run `vid-transcribe` first (or reuse the one from `vid-rough-cut`).

## How to run
Run against your project-local video toolkit (from your repo root, with a `video-toolkit/` package present):
```bash
node video-toolkit/scripts/captions.mjs --transcript projects/<proj>/inputs/transcript.json \
     --out projects/<proj>/out/captions.mp4 [--width 1080 --height 1920 --fontSize 58]
```

## Layout / tuning
Lower-third, ≤7 words per chunk, active word in the brand accent color (ground it in
`company.yml -> brand.visual_notes`; if unset, pick one legible accent and stay consistent).
Chunking + styling live in your toolkit's captions composition and chunking helper; keep a
reusable preset per format (e.g. `presets/long-form.json`) so a channel's look stays consistent.

## Notes
- MVP renders captions **burned-in on a dark field** — the quickest proof and the common
  vertical-social style. To overlay onto real footage, pass `--video <clip>` (place the clip so
  Remotion can serve it) or render with an alpha codec and ffmpeg-overlay (documented next step).
- Redaction: scan caption text before it's drawn on screen — never burn in a secret, a real
  customer's private data, or an unverified claim. If the transcript contains something that
  shouldn't appear on screen, fix the source, don't paint over it.
