---
name: vid-capture-browser
description: Record hands-off screen footage of live web pages and apps by driving the real Chrome (claude-in-chrome, or Playwright recordVideo as fallback) - no human clicks. Use whenever a video needs live-site, web-app, dashboard, or internal-page footage - "capture the site", "record a screen tour", "screen-record the app", "get browser footage", "record the funnel", "screenshot these pages for the video". Navigates a scripted tour, records the session as video, and grabs screenshots at named moments, landing raw footage in your project-local video toolkit for the editor to process. First-class capture path alongside vid-render-terminal. Not for terminal or CLI footage (use vid-render-terminal).
---

# vid-capture-browser

> Requires a project-local video toolkit (a `video-toolkit/` package you supply — e.g. a
> Remotion/ffmpeg pipeline exposing these scripts). This skill documents the craft; wire the
> commands to your own toolkit's equivalents. Below, `projects/<proj>/` is that toolkit's
> per-project working area. This skill drives a browser and lands raw stills/footage there; it
> does not render the final video itself.

Live web footage with zero human clicks. A screen-recording GUI is something an agent can't
operate, so the agent itself drives a real browser: navigate a scripted tour, screenshot named
moments, and (optionally) record the session as video. Output lands as raw footage in your
video toolkit for `vid-render` to assemble. This is how a video gets its live-site / web-app /
internal-page shots.

## When to use
A video needs footage of a website or web app. Triggers: "capture the site", "record a tour",
"screen-record the app", "browser footage", "screenshot these pages for the video".

## When NOT to use
- Terminal / CLI / git / test-run footage → `vid-render-terminal`.

## How to run (agent-orchestrated)
This skill is orchestration, not one script — the agent drives the browser via MCP tools, then
hands stills to a deterministic ffmpeg step.

1. **Tour spec** — decide the ordered stops: `[{url, waitFor?, shotName, holdSeconds}]`. Keep to
   PUBLIC or PRE-AUTHED pages; obey your redaction register: never frame secrets — `.env` files,
   credential/fixture lines, local private config, internal obfuscated slugs, or owner/CEO
   profile files. When in doubt, leave it out.
2. **Drive Chrome** — primary: the `claude-in-chrome` MCP (navigate → wait → screenshot). Save
   each screenshot to `video-toolkit/projects/<proj>/inputs/captures/NN-<shotName>.png` (zero-padded
   so order is preserved). Fallback for true session video: Playwright `recordVideo` (a one-time
   `npm i -D playwright` inside the toolkit — owner-gated, note before installing).
3. **Synthesize footage from stills** (deterministic, hands-off, no recorder needed) via your
   toolkit's stills-to-video helper:
   ```bash
   node video-toolkit/scripts/stills-to-video.mjs --stills projects/<proj>/inputs/captures \
        --out projects/<proj>/inputs/browser.mp4 --seconds 3 --width 1920 --height 1080
   ```
   (or `--list stills.json` with per-shot `{file, seconds}` for varied holds). Adds a slow
   Ken-Burns zoom so stills read as motion footage. If your toolkit lacks this helper, wire your
   own: ffmpeg over the ordered PNGs with a per-shot hold and a subtle zoom/pan.
4. **Assemble** — add the clip as a beat in the project manifest and run `vid-render`:
   `{ "id":"site-tour", "source":"clip", "file":"inputs/browser.mp4" }`.

## Guarantees
- **Non-destructive** — captures land under `projects/<proj>/inputs/`, renders under `out/`.
- **Redaction-first** — capture only what your redaction register permits; the agent curates the
  tour, so no secret surface is ever framed.
