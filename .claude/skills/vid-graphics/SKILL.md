---
name: vid-graphics
description: Scaffolded, not yet built. Planned - render per-segment motion graphics, lower-thirds, callouts, and diagram animations as Remotion compositions for a video. Use when a video needs on-screen graphics beyond terminals and captions - "add a lower third", "animate this diagram", "motion graphic for the video", "callout on screen". Until built, hand-author the composition in your video toolkit's compositions folder and add it as a beat in the render manifest. Part of the video pipeline conducted by the video-editor agent.
---

# vid-graphics (scaffolded — not yet built)

> Dependency: this stage assumes a project-local Remotion video toolkit (its own package with
> compositions, a `Root.tsx`, and a render manifest). Wire it to your own toolkit; the craft below is
> pipeline-agnostic.

Planned stage: per-segment motion graphics (lower-thirds, callouts, animated diagrams) as Remotion
compositions, timed off the transcript like everything else. Deferred per YAGNI + the spec sequencing
(MVP = transcribe → rough-cut → captions → render + terminal + browser capture).

## Interim path
Author a composition under your video toolkit's `compositions/` folder, register it in its root file
(e.g. `Root.tsx`) with a `calculateMetadata` duration, then reference it as a `remotion` beat in the
project manifest and run `vid-render`. Follow your project's motion/design brief (Iris gates the motion).
Build this out when a real video needs a graphic the terminal + title + captions primitives can't express.
