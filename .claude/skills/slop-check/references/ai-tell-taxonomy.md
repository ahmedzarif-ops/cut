# AI-Writing Tell Taxonomy (portable)

The 33-tell detector for a prose slop pass. Adapted from the public "humanizer"
pattern (remove AI-writing signatures), tuned for Vera's DETECTION lane. Vera
detects and recommends; she never rewrites — so each tell carries a **Signal**
(how to spot it) and a **Human fix** (what a human editor would do), NOT an
auto-rewrite. The builder applies the fix.

Portable: no company-specific paths. Pairs with `content-slop-rubric.md` (the
scoring frame) — this file is the granular sentence-level checklist that feeds it.
The mechanical tells here (banned phrases, avoid-words, emoji if your house style
bans them) are ALSO catchable with a cheap deterministic scan (plain string/regex
matching off `brand.banned_phrases`); this taxonomy is the judgment layer that
reads the ones a regex can't see (rhythm, stance, structure).

A tell is a signal, not a verdict. One tell in an otherwise specific, confident
piece is noise — flag it only when the tell earns its keep or clusters with others.
Brevity, a plain declarative sentence, and a real point of view are NEVER tells.

## How to run it in a slop pass
Read the target once for meaning, then a second time hunting tells. Group findings
by the six families below, quote the offending line, name the tell number, and
attach the Human fix as the recommendation. Density matters more than presence: a
tell that fires once is a warn; the same tell three times in a section is the
structural problem to report.

---

## A. Rhetorical-template constructions

**1. "It's not just X, it's Y" (contrastive amplifier).**
Signal: the sentence inflates a claim by negating a smaller version of it —
"It's not just software, it's a movement." Empty because the negated half was
never in dispute. Human fix: state Y directly with a concrete reason it's true;
delete the "not just X" scaffold.

**2. "Not only… but also."**
Signal: a formal correlative pair used to bolt two ordinary facts together for
gravitas. Human fix: split into two plain sentences, or cut the weaker fact.

**3. Rule-of-three / triad overuse.**
Signal: every list lands on exactly three items and every claim comes in a triad
("faster, smarter, cheaper") regardless of whether three is the true count.
Human fix: use the real number of items; let a claim stand on one strong point
instead of padding to three.

**4. Antithesis padding as standalone lines.**
Signal: short punchy "It's not about X. It's about Y." lines used as filler
profundity, often stacked. Human fix: keep one if it carries a genuine reframe;
delete the rest and replace with the specific thing you actually mean.

**5. Rhetorical-question openers.**
Signal: "Ever wondered why…?", "What if I told you…?", "Sound familiar?" opening a
section instead of a claim. Human fix: lead with the answer or the concrete
situation; a reader wants the point, not a quiz.

**6. "Here's the thing" / "Here's the deal" false intimacy.**
Signal: a folksy pivot phrase used to manufacture a confiding tone with no new
substance after it. Human fix: cut the phrase and go straight to the point it was
pretending to set up.

## B. Openers & closers

**7. "In today's fast-paced world / digital landscape" openers.**
Signal: a throat-clearing generality about the modern era before any real content.
Human fix: open on the specific reader, moment, or number; delete the era-setting
sentence entirely.

**8. Restating the prompt.**
Signal: "Great question.", "You asked about X — let's dive in.", echoing the brief
back as an intro. Human fix: delete; start with the first real idea.

**9. Over-summarizing / "In conclusion" / "In summary".**
Signal: a closing paragraph that restates what was just said without adding a
decision, a next step, or a sharper line. Human fix: end on the strongest concrete
point or a clear call to action; delete the recap.

**10. "At the end of the day" / "The bottom line" closers.**
Signal: a cliché wind-down flag that promises a payoff and delivers a truism.
Human fix: state the actual bottom line as a specific claim, without the flag.

**11. Recap-then-preview bridges.**
Signal: "Now that we've covered X, let's explore Y." transition scaffolding between
sections. Human fix: let the next heading do the work; cut the bridge sentence.

## C. Hedging & filler

**12. Hedging clusters.**
Signal: "it's worth noting", "that said", "of course", "to be fair", "needless to
say" stacking to soften every claim. Human fix: if it's worth noting, note it
plainly; delete the hedge and let the sentence commit.

**13. Empty transitions.**
Signal: "Moreover", "Furthermore", "Additionally", "That being said" bolted to the
front of sentences that don't actually build on the prior one. Human fix: replace
with a transition that names the real relationship (cause, contrast, example) — or
cut it and let the sentences sit next to each other.

**14. False-precision hedges.**
Signal: "arguably", "in many ways", "some might say", "up to X%", "as much as" —
precision-flavored vagueness. Human fix: give the real number with a source, or
drop the fake-precise qualifier and make the honest general claim.

**15. Over-qualification stacks.**
Signal: "this can potentially help you possibly start to…" — three softeners on one
verb. Human fix: pick one honest modality and commit ("this helps you…" or "this
often…").

**16. Both-sides-ism / no stance.**
Signal: "there are pros and cons", "it depends", a balanced non-answer where the
piece owes a recommendation. Human fix: take the stance the reader came for and
defend it; note the tradeoff in one line, don't hide behind it.

## D. Vocabulary crutches

**17. LLM vocab crutches.**
Signal: delve, leverage, robust, seamless, elevate, unlock, tapestry, testament,
foster, harness, realm, embark, underscore, "navigate the landscape", "in the realm
of". Human fix: swap for the plain verb or noun a practitioner would say ("use",
"dig into", "proof of", "solid"); if the word is doing no work, cut it.

**18. Intensifier inflation.**
Signal: "incredibly", "truly", "remarkably", "game-changing", "revolutionary",
"supercharge" propping up ordinary claims. Human fix: delete the intensifier and
let a concrete detail carry the weight; if the claim needs the adverb to feel big,
the claim is too thin.

**19. Corporate abstraction nouns.**
Signal: "solutions", "offerings", "capabilities", "synergy", "ecosystem" standing
in for the actual thing. Human fix: name the actual thing (the specific feature, "a
weekly report"), not its abstraction class.

**20. Cheerleader positivity.**
Signal: "the possibilities are endless", "you've got this", "the sky's the limit",
relentless upbeat with no substance underneath. Human fix: replace with a concrete
result the reader can expect; drop the pep.

## E. Rhythm & structure

**21. Uniform sentence length / metronomic rhythm.**
Signal: every sentence 15–20 words, same clause shape, no short punch and no long
breath — the flattest tell of machine drafting. Human fix: vary deliberately —
cut some sentences to three or four words, let one run long; read it aloud and
break the metronome.

**22. Bulleted-everything reflex.**
Signal: prose that should flow as an argument chopped into bullets by default.
Human fix: keep bullets for true parallel lists; convert reasoning and narrative
back to paragraphs so the logic connects.

**23. Parallel bolded lead-ins on every bullet.**
Signal: "**Speed:** … **Scale:** … **Simplicity:**" — a bolded label opening every
item like a template. Human fix: keep the pattern only where the labels are load
bearing; otherwise fold the label into the sentence.

**24. Title-case headline tic.**
Signal: "How To Build A Better Funnel" — every word capitalized in headings by
reflex. Human fix: use sentence case for headings unless the house style demands
otherwise; it reads human, not press-release.

**25. Emoji-as-structure.**
Signal: emoji used as bullet markers or section badges to fake organization (flag
only if your house style bans emoji — see `company.yml` → `brand.banned_phrases`).
Human fix: remove; use real headings and plain bullets. (Also catchable with a
deterministic banned-phrase scan.)

**26. Over-sectioning.**
Signal: an H2 every 40 words, a heading for every micro-thought, fragmenting a
simple idea into a scaffold. Human fix: merge related sections; a heading should
cover a real chunk of argument, not a sentence.

**27. Em-dash-as-CRUTCH (rhythm only).**
Signal: a mechanical em-dash in nearly every sentence, used as a one-size pause for
commas, colons, and parentheses alike. This is a RHYTHM tell — the writer leaning
on one connector — NOT automatically a reason to ban the character. Human fix: keep
the em-dashes that land; convert the rest to the punctuation the sentence actually
needs (comma, colon, period, parentheses) so the dash regains its force. See
PUNCTUATION POLICY below.

## F. Substance tells

**28. Abstraction with no anchor.**
Signal: a paragraph of claims with no example, no named specific, no sourced number
— true of everything, evidence of nothing. Human fix: add one real detail per
claim — a named tool, a dated figure with its source, a concrete scenario.

**29. Generic advice that fits any industry.**
Signal: copy that would read identically for a dentist, a SaaS, or a bakery — no
operator detail only this brand would know. Human fix: inject the signature the
competitor can't clone (a named scar from the work, a lesson only an insider has,
the founder's specific pedigree); this is the moat test from the content rubric.

**30. Listicle bloat / padding to a count.**
Signal: "17 ways to…" where items 8–17 are restatements or filler to hit the
number. Human fix: keep only the items that carry weight; a tight 5 beats a padded
17.

**31. Fabricated specificity.**
Signal: invented stats, made-up counts, quotes with no source, "studies show"
with no study. Human fix: replace with a real cited figure (date + source) or
reframe as a principle, not a claim. FTC/honesty ruling belongs to Gus
(compliance-review); flag it here as a slop-and-honesty tell and defer the legal
call.

**32. Second-person coaching overload.**
Signal: "Imagine if you could…", "Picture this:", relentless "you" hypotheticals
in place of concrete claims. Human fix: replace the hypothetical with the real
mechanism or result; use "you" where it's direct, not where it's a stage device.

**33. Robotic parallelism in openings.**
Signal: every sentence in a passage starts the same way ("This is…", "This means…",
"This lets…"), or every paragraph opens on the same shape. Human fix: vary the
sentence openings; lead some with the object, some with a verb, some with a short
fragment.

---

## PUNCTUATION POLICY — owned by your house style, not by this detector

The public "humanizer" pattern treats **em-dashes** and **"curly quotes"** as AI
tells and strips them. This taxonomy does NOT import that ban by default. Punctuation
policy belongs to your house style — read `company.yml` → `brand.voice` /
`brand.banned_phrases`:

- If your brand does NOT ban em-dashes/curly quotes, treat normal typography as
  deliberate and load-bearing. Do NOT flag a piece merely for containing em-dashes
  or curly quotes, and NEVER recommend converting them to hyphens or straight quotes
  just to "sound less AI".
- The ONLY em-dash finding allowed in that case is tell **#27** — em-dash-as-CRUTCH,
  a *rhythm* finding about mechanical one-per-sentence overuse, never about the
  character itself. The fix varies the punctuation; it never bans the dash.
- If your house style DOES ban a character or phrase, enforce that ban
  deterministically with a plain string/regex scan off `brand.banned_phrases` — honor it
  as a block/warn per your config.
- Curly vs straight quotes is not a tell unless your style guide makes it one.

## The de-AI rewrite pass

Vera flags; the builder runs this sequence to clear the flags. It's the order a
human editor works in — structure first, then rhythm, then words, then the ending.

1. **Cut the frame.** Delete the opener that restates the prompt or sets the era
   (#7, #8), and the recap/preview bridges (#9, #11). Start on the first real idea.
2. **Vary the rhythm.** Read it aloud. Break the metronome (#21): shorten some
   sentences hard, let one run long, vary sentence openings (#33). Convert reflexive
   bullets back to prose where logic needs to connect (#22).
3. **Cut the crutch vocab.** Remove LLM filler words (#17), intensifier inflation
   (#18), and abstraction nouns (#19); swap each for the plain word a practitioner
   would use, or delete it if it does no work.
4. **Replace empty transitions with real ones.** Turn "Moreover/Furthermore" (#13)
   and hedge clusters (#12) into transitions that name the actual relationship —
   or delete them so the sentences stand on their own.
5. **Anchor every abstraction.** For each unsupported claim (#28, #29), add one
   concrete detail: a named specific, a sourced+dated number, an operator scar only
   this brand knows. Replace any fabricated specificity (#31) with a real cited fact
   or a principle.
6. **Kill the summary paragraph.** Delete the "In conclusion" wrap-up (#9, #10);
   end on the strongest concrete point or a clear next step.
7. **Re-read for stance.** If the piece still hedges both ways (#16), commit to the
   recommendation the reader came for.

Follow your house punctuation policy in this pass (see PUNCTUATION POLICY). Rhythm
work under step 2 handles the only style-neutral em-dash concern (#27).
