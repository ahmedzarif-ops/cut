# VO-delivery learnings

What each pass learns about *your* voice + *your* settings — so the next re-voice starts smarter, not from
scratch. Append; don't rewrite. Newest first. Record per voice/project: the marking decisions that worked,
what the owner's ear approved or rejected, and any measured pace/setting findings.

## Seed findings (transfer across voices — genericized from real runs)

- **The failure this capability exists to fix:** a first take that reads *rushed*, with no real pauses and
  punchlines that fall flat — good lines don't land. If that's the complaint, this is the fix.
- **A "rushed" complaint can be the audio pipeline, not marking.** Before re-marking or touching voice settings on a
  "rushed/no pauses" report, FIRST confirm the timeline is consuming the *latest directed* render, not a
  stale flat take from an older render folder. Duration-compare the consumed audio against the newest
  directed render (a materially shorter file = the flat take). ffmpeg `silencedetect` (≥0.4s at landing
  lines) is the cheap measurable proxy for "has pauses." Fix the wiring before you re-perform.
- **The expressive model's `speed` knob is weak; pace comes from explicit pauses.** On a full multi-beat
  render, an expressive v3-class model runs hot (150-178 WPM) and lowering `speed` barely moves it (variance
  ≈ ±10-15 WPM dominates). The reliable pace lever is explicit pauses (ellipsis / blank-line landings /
  `[pause]`), not the dial. For a guaranteed slow, heavy read, render that beat on a controlled
  v2/multilingual-class model at `speed ~0.82`.
- **Hybrid delivery works:** expressive model for expressive/story beats, controlled model for the gravest
  landings — set per-segment `model` in the marked json. During full-lesson QA, flag any beat that reads
  rushed as a candidate model swap.
- **Owner's ear is the gate.** Metric gains (WPM, pauses/min, gate scores) do not validate a voice
  performance; only the owner's ear does. Ship a short proof for their tap before a full re-render.

## <your first project> — <date>

- Marking decisions baked into `vo-segments.marked.json`: …
- Owner-ear verdict: …
- Measured findings (WPM per beat, which model per beat, settings that held): …
