---
name: vid-remotion-knowledge
description: Reference knowledge for a Remotion render engine - how to write and edit Remotion compositions, animations, timing, sequences, transitions, captions, and audio correctly, plus the 9:16 shorts preset patterns. Use whenever writing or reviewing any code in your video toolkit's composition source (compositions, timing, interpolate, springs, Sequence, calculateMetadata), building a new composition or beat type, debugging a render that looks wrong (frozen animation, flash, wrong duration), or planning a vertical short. Reach for it even if "Remotion" is never said - any render-engine work counts. Not a pipeline runner - the vid-* skills run the stages; this is the how-to-write-it knowledge layer.
---

# vid-remotion-knowledge — the render-engine knowledge layer

Distilled from the MIT-licensed claude-code-video-toolkit
(github.com/digitalsamba/claude-code-video-toolkit) `.claude/skills/remotion` +
`remotion-official` (33 rules synced from github.com/remotion-dev/skills). This is the
how-to-write-it knowledge; consult BEFORE writing composition code — don't rediscover these
by render-and-squint.

## Dependency: a project-local video toolkit

This skill is the *knowledge layer*. The actual render pipeline (compositions, timing scripts,
presets) lives in a **project-local Remotion toolkit you supply and wire in** — an isolated
sub-package with its own `package.json`/`node_modules`, kept OUT of your main app build. Where
this skill says "your video toolkit," substitute that package's paths. If you have no toolkit
yet, stand one up from the upstream template above before relying on the pipeline steps here.

## Your engine (the shape this knowledge assumes)

- A `Root.tsx` registers the compositions — typically **Terminal** (curated cast replay),
  **Captions** (word-timed overlay), and **Lesson** (beat cards). Scripts pass real `inputProps`;
  Root only carries preview defaults.
- **Data-derived timing is a hard rule**: durations come from the transcript / cast / VO audio
  (the toolkit's `lib/*.mjs` + a `sync-timing.mjs`) via `calculateMetadata` — never hand-set frames.
- **30fps everywhere**: frames = seconds × 30. Keep presets in the toolkit's `presets/`.
- **Isolation**: all video deps stay in the toolkit's own `package.json`, and the package is
  excluded from the root app build (root `tsconfig.json` + your deploy-ignore file) — never add
  video deps to the root. (This exact isolation prevents a green local build from failing on the
  deploy host, where the sub-package's `node_modules` is not installed.)
- **Redaction guard**: anything rendered on screen should pass a redaction check upstream. Do not
  route content around the scripts to "just render it."

## Core rules (the ones that break renders when ignored)

1. **Animate with `useCurrentFrame()` + `interpolate()`** — never state, timers, or randomness.
   Always clamp: `{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }`, and prefer
   `Easing.bezier(0.16, 1, 0.3, 1)` for entrances.
2. **CSS transitions/animations and Tailwind animation classes are FORBIDDEN** — they don't
   render frame-accurately. Every motion must be a pure function of the frame.
3. **Time-shift with `<Sequence from={...} durationInFrames={...}>`** — inside one, the child's
   frame restarts at 0. Default is absolute-fill; use `layout="none"` for inline content.
4. **Assets via `staticFile()`** from `public/`; media via `<OffthreadVideo>` and `<Audio>`
   (a sensible house default — keep it consistent when extending existing compositions).
5. **Dynamic duration via `calculateMetadata`** on the `<Composition>` — compute
   `durationInFrames` from props/data (a Terminal-style composition is the live pattern).
6. **`playbackRate` must be constant** per element; pre-process variable speed with ffmpeg.
7. Scale motion by `fps` from `useVideoConfig()`, never hardcode frame counts for seconds.

## Go deeper (progressive disclosure)

- `references/remotion-rules.md` — the distilled rule set: springs vs bezier, transitions,
  text animation, audio/video trimming, captions, measuring, parameterized compositions,
  plus the topic → upstream-rule index for anything not covered.
- `references/shorts-9x16.md` — vertical shorts preset patterns (hook/pacing/caption budget)
  + the sprint-review-v2 scene-structure model for composable beat systems.
- Presenter/delivery craft (what the narrator says and how) is NOT here — that's the
  `vo-delivery` skill.

## Sanity check before calling a composition done

Render one still at a meaningful frame and LOOK at it (`npx remotion still <id> --frame=30
--scale=0.25`, or your toolkit's equivalent). At 30fps, frame 30 = the one-second mark.
Remotion is source-available, not MIT — commercial use may need a license (remotion.dev/license).
