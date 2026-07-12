# World-Class Spoken Delivery — VO Director's Brief

The authoritative method for this skill. Every technique maps to a script mark or a TTS setting. Read it
before any marking pass. Voice = your cloned/brand voice ID (wire it from your own voice config). Confidence
8/10; WPM/pause numbers are ranges; expressive TTS models are often alpha — treat exact tag/setting values
as A/B starting points. Sources at the bottom.

## 1. Pacing & rhythm
- Teaching/explanation lane **~130-160 WPM** (slower than keynote; listener is learning). Hook/story open
  **~150-170**. Emphasis/key line **drop to ~100-120** (slow the operative sentence so weight lands).
- **VARY IT ALWAYS.** Top TED speakers show ~30% MORE vocal variety than less-popular ones. Metronomic =
  boring = the default AI tell. Teaching pattern is a SAWTOOTH: cruise setup → brake into the key idea → release.

## 2. The pause (taxonomy)
| type | where | length | job |
|---|---|---|---|
| Anticipation | BEFORE the operative word | 0.3-0.7s | vacuum the listener leans into |
| Landing | AFTER the punchline/reveal | 1-2s | lets the idea detonate |
| Comprehension | AFTER a complex idea/definition | 1-2s | processing time |
| Dramatic/suspense | mid-sentence before something heavy | 2-4s | builds tension |
- #1 mistake: RUSHING THE PAUSE. TTS never leaves a beat → you must insert EVERY pause explicitly.
- Highest-value pause = right before the punchline (tension) + after it (reaction). Never break logical flow.

## 3. Emphasis & punch
- Make one word hit by stacking: stress + pitch move (up, or DOWN for gravity) + elongation + consonant
  crispness + the pre-emphasis micro-pause.
- Find THE operative word: usually the NEW information / the contrast word / a noun or verb, never an
  article/preposition. Mark exactly ONE per sentence. Emphasizing everything = emphasizing nothing (AI tell).

## 4. Suspense & the punchline
- Structure = SETUP → PAUSE → PAYOFF (expectation & surprise). Deliver setup steady/brisk (don't
  telegraph) → anticipation pause → DROP pace & often pitch on the payoff.
- Tonal shift is the SIGNAL: softer + slower (or a near-whisper) says "here comes the important part."
  Restraint (quieter/slower on the key line) pulls the listener IN more than louder.

## 5. Warmth & humanity (talking TO, not reading AT)
- Direct address ("you", "your", "I", "we"); warmth beats competence for learner preference of AI teachers.
- Conversational downshifts on asides (drop volume/speed, rise in warmth) make the peaks credible.
- BREATH (audible, natural) resets phrases and signals a body. No breath = no human.
- Smile-in-voice (brighter vowels), light phrase-end fry = relaxed/intimate. Rhythmic musicality keeps attention.

## 6. Teaching-specific
- Curiosity-gap OPEN (question/anomaly/partial info, not the answer) → boosts memory encoding. Deliver
  slightly slowed, open/upward pitch, then a comprehension pause.
- Signposting ("Here's the one thing that matters...") at a brisk/flatter functional cadence, then shift
  tone for the content. Repetition: say key term → pause → restate a SECOND way (shift delivery, don't photocopy).
- Callback with a knowing warmer tone. Energy = a WAVE across ~10 min (hook peak → valleys for dense
  teaching → peak per key idea → warm resolve); reset energy UP at each section boundary.

## 7. TRANSLATION LAYER → TTS (critical)
Decide model first — notation differs:
- **Expressive v3-class model** (default for a teaching read): NO `<break>`. Use ellipses `...`, line breaks,
  dashes, `[pause]`, CAPITALIZATION for emphasis, and audio tags `[warmly] [whispers] [drawn out] [rushed]
  [sighs] [laughs]`. Keep tags SPARSE (over-tagging destabilizes).
- **v2/Turbo/Multilingual-class model**: `<break time="1.0s" />` (max 3s), punctuation + slower speed.
  Anticipation `0.4s`, landing `1.5s`, dramatic `2.5s`. Too many breaks per generation → instability.
- **Punctuation-as-pacing (all models):** ellipsis = real weighted pause (anticipation/dramatic); em-dash =
  short breath/aside (less consistent); period = full reset; blank line = section pause; comma = shortest beat.
- **Settings:** STABILITY = master expressiveness dial (LOWER = more range = our friend; presets
  Creative/Natural/Robust → use NATURAL, lean Creative on story beats, AVOID Robust = ignores your markup).
  STYLE/exaggeration: 30-45% adds emphasis; >60% distorts (breathiness/pitch swings) — start ~30%. SPEED
  0.7-1.2 only (default 1.0; ~0.9 on the key line, ~1.05 on brisk setup). Baseline: stability ~50,
  similarity ~75, style 0, then adjust.
- Markup example (v3): `Most think more leads is the answer.` [blank line] `But here's the thing...` `it's NOT
  about leads.` `It's about FOLLOW-UP.`  (blank line = beat, ellipsis = anticipation, CAPS = operative word.)

## 7b. MEASURED FINDING — the expressive model's speed dial is weak; pace comes from pauses
On an expressive v3-class model the `speed` voice-setting barely moves the read — lowering it a notch can
render *faster* (run-to-run variance ≈ ±10-15 WPM swamps the knob). Reliable pace levers on such a model:
(1) **explicit pauses** — ellipsis + blank-line landings + `[pause]` add real silence; (2) **sentence
structure** (hard periods = resets). For a *guaranteed* slow, heavy read (grave landings), render that beat
on a controlled v2/multilingual-class model at `speed ~0.82`, which honors the dial precisely — the trade is
it is flatter/less expressive. **So model choice is per-beat:** expressive for alive/expressive, controlled
for controlled-slow. Have your render script auto-down-convert markup (ellipsis/blank-line → `<break>`, tags
stripped) when a segment's model is the controlled one.

## 8. Anti-AI-tells & counters
- Even/metronomic cadence → force pace variety + lower stability. No breath/silence → insert explicit
  pauses, let landings SIT (never fill). Wrong/all-word emphasis → one operative word/sentence, strip
  function words. Flat at the payoff → deliberate downshift (slower+lower / `[whispers]`). No dynamic range
  → vary volume/pitch/rate + conversational downshifts. Reading AT not TO → 2nd person, questions,
  conspiratorial drops. Robust-preset stiffness → Natural/Creative. Tag/style over-drive → style 30-45%, sparse tags.

## Operating principle for the markup pass
Read the script aloud as a human teacher; mark WHERE you paused, WHICH single word you punched, WHERE you
got quieter — then encode exactly those into ellipses/breaks, CAPS/slowdown, and tone tags. TTS only
executes what you explicitly mark; its default (even, breathless, flatly-emphasized) IS the AI tell.

## Sources
SketchBubble WPM · VirtualSpeech speaking rate · Science of People (TED analysis) · Joe Arden (audiobook
technique) · Backstage (narration / comedic timing) · MasterClass (comic timing) · Learning Guild (voice
for instructional design) · ScienceDirect (conversational pedagogical agents) · Structural Learning
(curiosity/Information Gap) · TTS provider docs (voice settings / best-practices / v3 audio tags).
