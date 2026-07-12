# Learnings - creative-director (Iris)

> Self-improvement memory for this skill + its agent. The SKILL reads this at the START of every run
> (Ground) and appends at the END (Capture). Proposed changes to canonical playbooks go under
> "Proposed refinements" for HUMAN REVIEW; never silently edit a canonical file.

## Run log (newest first)
| Date | What ran | What worked | Change next time |
| --- | --- | --- | --- |
| (none yet) | | | |

## What works (durable design-craft patterns)
- **Owner-taste surfaces: concept BOARD first, build second.** For any surface the owner will personally present or judge aesthetically, render 2-3 radically different, fully styled mockups in ONE self-contained board (shared content, per-option chrome), let the owner tap one, THEN build. Gate scores measure craft, not the owner's taste; they do not substitute for the pick. Serve the board over loopback http (file:// is blocked in headless renderers), and verify on a real ~430px mobile viewport, not just desktop.
- **Capture-first, code-second review.** Screenshot the rendered surface before reviewing it - mobile collisions and layout leaks are invisible in the code and in a desktop squint.
- **Diagnose "looks old/cheap" by mechanics, not vibes.** Name the exact cause - edge treatment, surface opacity, atmosphere visibility, chrome voice - so concepts converge instead of scattering.
- **Two node populations for data-graph visuals.** A non-semantic TEXTURE layer (dense small dots, no data) plus the SEMANTIC graph (hubs/satellites/data nodes) riding above it makes a graph feel dense/organic/alive without fabricating data. Honest data only - visualization never dresses up nulls.
- **Glow/bloom over LIGHT grounds.** Never use `lighter`/`screen` compositing for a base form on a near-white ground (it hazes to white). Use source-over with a hue-tinted radial, peak alpha <= ~0.26, no white center stop.
- **Nested "double-bezel" cards are WRONG for data-dense cockpits** (they recreate the cards-in-cards antipattern). Reconcile generic taste lenses against the surface type; the brand system and the design audit win.
- **Partition a broad refresh by DISTINCT FILES** (one agent owns a file or file-group, no two touch the same file) so many small precise edits run in parallel with zero merge conflicts, then a single central build + one desktop/mobile render pass catches everything.
- **Group an audit proposal by root-cause-and-fix, not by surface**, so shared defects collapse into decision-ready clusters instead of scattered items.
- **Start a repeat site audit from a codebase-wide grep for known hot-spots** (e.g. inline `outline:none` beating `:focus-visible`, brand small-text colors below AA), so it begins from known defects instead of re-finding them per surface.

## Open gaps / what to improve
- (none yet)

## Proposed refinements - HUMAN REVIEW before applying
- (none yet)
