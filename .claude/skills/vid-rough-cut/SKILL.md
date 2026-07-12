---
name: vid-rough-cut
description: Turn a word-level transcript into a rough cut - build an edit-decision-list that drops filler words ("um", "uh") and long gaps, then trim and concatenate the source with ffmpeg. Use whenever raw footage or audio needs a first tightening pass - "rough cut this", "remove the ums", "cut the dead air", "make an EDL", "tighten the take", "edit down the recording". Emits the EDL first so you can inspect or tweak it before cutting, and is segment-scoped so re-cuts are cheap. Needs a transcript (run vid-transcribe first). Not for captions (use vid-captions) or final assembly (use vid-render). Part of the video pipeline conducted by the video-editor agent.
---

# vid-rough-cut

> Requires a project-local video toolkit (a `video-toolkit/` package you supply — e.g. a
> Remotion/ffmpeg pipeline exposing these scripts). This skill documents the craft; wire the
> commands to your own toolkit's equivalents.

Transcript in, tightened cut out. Builds an edit-decision-list (the list of KEEP segments in
source time) by dropping filler words and long gaps, then ffmpeg trims + concatenates the source.
The EDL is emitted first on purpose — a human or the agent can eyeball it before any media moves,
and re-cutting is cheap because only the kept ranges are re-trimmed (segment-scoped).

## When to use
Raw audio/footage needs a first pass. Triggers: "rough cut", "remove the ums", "cut dead air",
"make an EDL", "tighten the take".

## Prerequisite
A word-level transcript — run `vid-transcribe` first.

## How to run
Run against your project-local video toolkit (from your repo root, with a `video-toolkit/` package present):
```bash
# EDL only (no media): inspect what would be cut
node video-toolkit/scripts/rough-cut.mjs --transcript projects/<proj>/inputs/transcript.json \
     --plan-only --edl projects/<proj>/out/edl.json

# Apply the cut to a source (audio or video)
node video-toolkit/scripts/rough-cut.mjs --transcript projects/<proj>/inputs/transcript.json \
     --source projects/<proj>/inputs/take.wav --out projects/<proj>/out/rough-cut.wav \
     --edl projects/<proj>/out/edl.json [--joinGap 0.5]
```

## What it removes
Default fillers: um, uh, er, ah, hmm, like, so, basically (tune with the source list in your
toolkit's EDL helper, e.g. `video-toolkit/scripts/lib/edl.mjs`). Segments split when the gap between kept words
exceeds `--joinGap`.

## Guarantees
- **Non-destructive** — source untouched; output is a new file. Inspect the EDL, then cut.
- The EDL is plain JSON — hand-editable before the ffmpeg pass.
