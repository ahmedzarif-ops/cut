---
name: vid-transcribe
description: Transcribe an audio or video file into a word-level {word,start,end} JSON - the timing backbone every later editing stage reads. Use whenever the pipeline needs a transcript - "transcribe this", "get word timings", "make the transcript for captions", "transcribe the narration", "word-level timestamps". Uses a hosted speech-to-text API (e.g. ElevenLabs scribe) if an API key is present, otherwise WhisperX locally (a one-time free install it will instruct, never auto-run). Feeds vid-rough-cut and vid-captions. Not itself a captioner (use vid-captions) or a cutter (use vid-rough-cut). Part of the video pipeline conducted by the video-editor agent.
---

# vid-transcribe

Audio in, word-level timing out. Every downstream stage — rough-cut, captions — is timed off
this `{word,start,end}` JSON, so it is the pipeline's backbone. Get it right and the rest is cheap.

> Requires a project-local video toolkit (a `video-toolkit/` package you supply — e.g. a
> Remotion/ffmpeg pipeline exposing these scripts). This skill documents the craft; wire the
> commands to your own toolkit's equivalents.

## When to use
The pipeline needs a transcript with word timings. Triggers: "transcribe", "word timings",
"transcript for captions".

## Engine selection (auto)
- **Hosted speech-to-text** (e.g. ElevenLabs `scribe_v1`) if the provider API key is set in the
  environment — hosted, no install. Any word-level STT provider works; wire it in your toolkit.
- else **WhisperX local** (free, word-level) if the `whisperx` CLI is present.
- else it PRINTS the one-time install line and exits — it never auto-installs a heavy dep
  (owner-gated). Prefer the no-new-install path: set a key, or install WhisperX once.

## How to run
```bash
# from your repo root, with a video-toolkit/ package present:
node video-toolkit/scripts/transcribe.mjs --audio <file> --out projects/<proj>/inputs/transcript.json \
     [--engine auto|hosted|whisperx] [--language en]
```

## Output shape
`{ engine, text, duration, words:[{word,start,end}] }` — hand this to `vid-rough-cut` (--transcript)
and `vid-captions` (--transcript).

## Notes
- Transcription only reads existing audio. Generating narration (TTS / a voice clone) is a
  separate lane — this skill never synthesizes speech.
- Redaction: the transcript is text; downstream renders scan it before drawing it on screen.
