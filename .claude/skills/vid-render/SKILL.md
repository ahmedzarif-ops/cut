---
name: vid-render
description: Assemble a long-form video from a project manifest of beats - rendered terminals, title cards, captions, and real footage clips (avatar takes, browser captures) - then ffmpeg-concat them into one file. Use whenever separate pieces become one video - "assemble the video", "stitch these clips", "render the final video", "put the beats together", "export the lesson", "concat the segments". Segment-scoped so re-rendering just one beat (the --only flag) re-concats without re-rendering the whole video for one change. Conducted by the video-editor agent as the final assembly stage of the video pipeline.
---

# vid-render

The assembly stage. A project manifest lists ordered beats; each beat is either a Remotion
composition (Terminal, title, Captions) rendered on the fly, or a pre-existing clip (an avatar
take, a browser capture from `vid-capture-browser`). It renders what needs rendering, then
ffmpeg-concats everything into one video. Non-destructive; outputs under `projects/<proj>/out/`.

> Requires a project-local video toolkit (a `video-toolkit/` package you supply — e.g. a
> Remotion/ffmpeg pipeline exposing these scripts). This skill documents the craft; wire the
> commands to your own toolkit's equivalents.

## When to use
Separate pieces need to become one video. Triggers: "assemble the video", "stitch these clips",
"render the final video", "export the lesson".

## The segment-scoped re-render primitive (why this matters)
Re-rendering a whole long-form video to fix one beat is slow. `--only <beatId>` re-renders just
that beat and re-concats — the hard-won perf detail. Use it on every edit.

## How to run
```bash
# from your repo root, with a video-toolkit/ package present:
node video-toolkit/scripts/render.mjs --project projects/<proj>            # full assembly
node video-toolkit/scripts/render.mjs --project projects/<proj> --only terminal   # re-cut one beat
```

## Manifest shape (`projects/<proj>/manifest.json`)
```json
{ "fps":30, "width":1920, "height":1080, "out":"out/video.mp4", "beats":[
  { "id":"intro",    "source":"remotion", "composition":"Lesson",   "inputProps":{ "beats":[{"type":"title","props":{...}}] } },
  { "id":"terminal", "source":"remotion", "composition":"Terminal", "inputProps":{ "cast":{...} } },
  { "id":"take-01",  "source":"clip",     "file":"inputs/avatar-01.mp4" }
] }
```

## Filling a long window with generated footage (avatar / AI b-roll)
A generated clip (any text-to-video / image-to-video model) caps at ~10-15s. **Never loop one clip
to fill a longer beat** — the loop seam is the #1 "this is AI" tell. Split the window into multiple
≤cap shots and stitch them, or cut away to owned b-roll (diagrams, terminals, cards) so the face
only shows in sub-cap blocks. Plan the split with the toolkit's shot planner (`src/lib/shots.mjs`:
`planShots` / `needsMultiShot` / `pickGenModel` + `GEN_DEFAULTS` = 720p, correct aspect, audio off).
Terminals/diagrams are rendered (uncapped) and exempt. Full doctrine lives in the `video-editor` agent.

## Notes / current limits
- MVP concat is **video-only** (beats are silent terminals/titles). Narration-audio muxing is the
  next layer. Beats are normalized to the manifest `width/height/fps` before concat.
- Preset: `presets/long-form.json` (1920x1080 @ 30fps, dark theme). Keep presets in your toolkit.
