---
name: vid-autopost
description: Scaffolded, not yet built and owner-gated. Planned - publish a finished, approved video to social via your scheduler (e.g. Buffer through Zapier, already wired for the social engine). Use when an approved video should be scheduled or posted - "post this video", "schedule the clip", "publish to social". Until built, hand off to the social-engine skill, which already schedules to your social scheduler. Never publishes without owner approval. Part of the video pipeline conducted by the video-editor agent.
---

# vid-autopost (scaffolded — not yet built, owner-gated)

> Depends on a project-local video toolkit you supply (the render/rough-cut/graphics
> pipeline this kit's `vid-*` skills orchestrate). This skill only hands a finished render
> into the social-posting path; it does not render anything itself.

Planned final stage: schedule/publish an approved video to social via your social scheduler
(for example Buffer wired through Zapier — a tool choice, swap in whatever you use). Deferred to
last per the pipeline sequencing, and owner-gated — nothing posts without the owner.

## Interim path
Use the existing `social-engine` skill (it already drafts, gates, and schedules to your social
scheduler). This skill will exist only to hand a finished video render into that path with the
right caption/metadata. Keep the owner-approval gate; publishing is never automated away.
