---
name: vid-music
description: Scaffolded, not yet built. Planned - overlay a music or ambient bed under a video at a target loudness, ducking under narration, via ffmpeg. Use when a video needs background music at a controlled level - "add background music", "music bed", "duck the music under the voice", "score this clip". Until built, add the bed manually with ffmpeg (amix / sidechaincompress). Part of the video pipeline conducted by the video-editor agent.
---

# vid-music (scaffolded — not yet built)

> Depends on a project-local video toolkit you supply (a `video-studio/` directory or equivalent
> holding your render tooling). This skill is a stage in that pipeline; wire it to your own toolkit
> when you build it out.

Planned stage: mix a music/ambient bed under a rendered video at a target LUFS/dB, side-chain-ducked
under narration, via ffmpeg. Deferred per YAGNI + the pipeline sequencing — build it only when a
video actually ships with music.

## Interim path
ffmpeg does this directly today, e.g. duck a bed under a voice track:
`ffmpeg -i video.mp4 -i bed.mp3 -filter_complex "[1:a]sidechaincompress=..." out.mp4`.
Build the skill out when a narrated video actually needs a scored bed (many narrated videos may stay
voice-only).
