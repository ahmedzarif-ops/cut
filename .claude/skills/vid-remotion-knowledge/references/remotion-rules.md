# Remotion rules — distilled

> Source: claude-code-video-toolkit (MIT, github.com/digitalsamba/claude-code-video-toolkit)
> `.claude/skills/remotion-official` — 33 rule files synced from github.com/remotion-dev/skills —
> plus its own `remotion` toolkit patterns. Distilled to what a typical engine (Terminal / Captions /
> Lesson compositions, 30fps, data-derived timing) actually uses. For an untouched topic, the
> upstream rule index at the bottom says what exists.

## Timing & easing (the workhorse)

- `interpolate(frame, [from, to], [a, b], { easing, extrapolateLeft: "clamp", extrapolateRight: "clamp" })`.
  Unclamped values overshoot the range — clamp unless overshoot is the point.
- Copy-paste curves:
  - Crisp UI entrance: `Easing.bezier(0.16, 1, 0.3, 1)`
  - Editorial fade: `Easing.bezier(0.45, 0, 0.55, 1)`
  - Playful overshoot (sparingly): `Easing.bezier(0.34, 1.56, 0.64, 1)`
- Presets: `Easing.out(Easing.cubic)` for enters (arrive with momentum), `Easing.in(...)` for
  exits (leave with gravity). Default is linear — almost never what you want.
- Compose, don't duplicate: build ONE normalized progress (0→1), derive every property
  (translate, opacity, scale) from it. Enter minus exit progress gives a clean in/out.
- `spring({ frame, fps, config })` is the specialized option for physical pops; prefer
  bezier interpolate for everything scripted/timed (springs have no fixed end frame).

## Sequencing

- `<Sequence from={f} durationInFrames={d}>` — child's `useCurrentFrame()` restarts at 0 inside.
- Default renders as absolute-fill; `layout="none"` for inline content.
- Trim the START of a child animation with a negative `from`; trim the end with `durationInFrames`.
- For scene chains with cross-effects use `<TransitionSeries>` (`@remotion/transitions`):
  `TransitionSeries.Sequence` + `TransitionSeries.Transition presentation={fade()}
  timing={linearTiming({ durationInFrames: 15 })}`. A transition OVERLAPS both scenes — it
  shortens the total timeline; an `Overlay` decorates the cut without shortening.
- Transition duration guide (30fps): quick cut 15–20f, standard 30–45f, dramatic 50–60f.

## Media

- `<OffthreadVideo>` / `<Audio>` (a house default) with `staticFile("...")` from `public/`.
  Upstream now also documents `<Video>`/`<Audio>` from `@remotion/media` (trim props, pitch);
  both render — stay consistent with the composition you're extending.
- Layer multiple `<Audio>` components freely; wrap in `<Sequence from>` to delay.
- `playbackRate` must be constant per element. Variable/extreme speed = pre-process with ffmpeg.
- Trimming clips: `trimBefore` / `trimAfter` (frames) on media components, or wrap in Sequence.

## Captions

- Process captions as JSON with the `Caption` shape
  (`{ text, startMs, endMs, timestampMs, confidence }`, `@remotion/captions`) — never burn a
  transcriber's own text; align YOUR script words onto measured timing (the `vid-captions`
  pipeline already produces word-level `{word,start,end}`).

## Dynamic metadata

- `calculateMetadata` on `<Composition>` computes `durationInFrames` / dimensions / props from
  data (async fetch allowed, gets `abortSignal`). This is how data-derived timing is enforced —
  a Terminal-style composition that computes duration from cast/VO data is the live pattern.
- Parameterize compositions with a Zod schema + `defaultProps` when props come from scripts.

## Hard prohibitions

- No CSS transitions/animations, no Tailwind animation classes, no `Math.random()` (use
  `random(seed)`), no state/effects driving motion — every pixel must be a pure function of frame.
- No hand-set durations where data exists (transcript / cast / VO). Fix the input, not the number.

## Verification

- One-frame sanity render: `npx remotion still <id> --frame=30 --scale=0.25` (frame 30 = 1s at
  30fps) — cheap way to check layout/colors before a full render.

## Upstream rule index (topics that exist if you need them)

3d (React Three Fiber) · audio-visualization (spectrum/waveform) · gifs · google-fonts /
local-fonts · html-in-canvas · light-leaks · lottie · maplibre (animated maps) ·
measuring-dom-nodes / measuring-text (fit text to containers) · silence-detection ·
tailwind (layout only) · text-animations · transparent-videos · get-audio/video-duration
(Mediabunny). Fetch the matching rule from github.com/remotion-dev/skills when a task needs one.

## License note

Remotion is source-available, NOT MIT: companies may need a paid license for commercial use —
check https://remotion.dev/license before shipping revenue-bearing renders.
