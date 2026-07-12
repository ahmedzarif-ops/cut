# UGC Video Ads (the AI-actor ad recipe)

> DEPENDENCY: this recipe assumes you have an image/video generation toolkit wired in.
> The tools named below (an image/video generator with a marketing/UGC mode, a
> face/identity-consistency trainer, a product-photoshoot generator, a
> demand-side/voiceover research tool) are EXAMPLES of each lane — substitute whatever
> you actually have. If you have none yet, wire your own generation stack first; the
> craft below is tool-agnostic.

> Methodology adapted from the Open-AI-UGC recipe (Anil-matcha/Open-AI-UGC, MIT
> license). We adopt the UGC-AD-GENERATION recipe only, and re-route every step through
> tools you already have. No new vendor, no new API key, nothing to install just to
> follow it.

This is a reference for producing a scroll-stopping vertical UGC video ad: a short
spoken-testimonial or before/after clip that looks like a real person, built from a
script plus reference images. Ground the script in your ICP and authority KBs and the
`creative-angles.md` hook bank. It is copy first, generation second: the words carry the
ad, the model just performs them.

## The UGC ad recipe (four parts)

Every UGC ad is a spoken script plus reference images plus a format plus a model choice.
Get the script right before you generate a single frame.

1. **Spoken script (the load-bearing part).** Written to be said out loud in one take by
   one person, 15 to 30 seconds. Four beats:
   - **Hook in the first 3 seconds.** The single most important second of the ad. Pull
     from the `creative-angles.md` hook bank.
   - **Problem.** Name the pain in the buyer's own words. One or two lines.
   - **Proof.** Honest proof only: founder/authority-led, product-as-proof, the free
     diagnostic, sourced stats, any real guarantee. Never a fabricated result or an
     invented customer. See the guardrail below.
   - **CTA.** One action, matched to the destination page: run the free diagnostic, buy
     the entry offer, book the call. Echo the wording of the destination page hero so the
     click keeps its promise (see `ad-output-spec.md` message-match rule).
2. **Reference images (who and what is on screen).** Zero, one, or several. See the
   multi-reference technique below. This is what makes it look like a real person in a
   real setting rather than a generic stock clip.
3. **Format.** 9:16 vertical for Reels / Shorts / TikTok / Stories (the default UGC
   format). 1:1 or 16:9 only when the placement calls for it. Keep duration tight; a 15
   second ad usually beats a 30 second one for cold traffic.
4. **Model choice.** Pick by need, not by brand name. See the model-selection section.

Keep the same simple split for every job:

- **Text-to-video** when you upload no reference image. Fastest path, least control over
  the face and setting. Fine for a quick concept or a faceless before/after.
- **Image-to-video** when you attach reference images. The default for a real UGC ad,
  because it locks the actor's face, the product, and the setting.

## The multi-reference-image technique (actor + product + setting)

The core trick is stacking several reference images in one generation: an actor face,
plus the product or scene, plus the setting, so the clip shows a specific person in a
specific place holding a specific thing.

- **Generate the reference images first**, then animate them. Use your image generator
  (for an AI actor or a scene), or a product-photoshoot generator for a clean product
  shot, or a real photo of the team / product / finished work (with permission). These
  stills are the building blocks.
- **Lock the actor's face across clips** with a face/identity-consistency trainer. Train
  a character once (returns a reference id), then reuse that same face in every ad so
  your AI spokesperson is consistent shot to shot.
- **Animate the stack.** Two routes:
  - A purpose-built UGC/marketing video mode: feed it an avatar (the presenter face), a
    product (imported from a URL or created from your product images), optionally a hook
    and a setting, and a mode (ugc, how-to, unboxing, product-review, product-showcase,
    tv-spot). This is the closest analogue to the "actor + product + scene" recipe and
    the first choice for an ad.
  - A controllable image-to-video model when you want direct control of the frames: pass
    your generated stills as start/end/reference images for multi-shot and
    character-reference work. Good for a before/after that has to start on one exact
    frame and end on another.
- **Route the references in plain language.** Describe who and what in the prompt ("the
  same person from the reference, standing in front of the finished [work]") and let the
  reference inputs do the identity work.

### Siblings (not the generator, but part of the loop)

- A demand-side/video-research tool to research what hooks and formats are winning on
  Shorts / Reels / TikTok, score a title or thumbnail before you spend, and generate or
  clone a voiceover for the script. Use it to pick the hook, not to make the video.
- The `social-engine` skill to package approved clips into on-brand posts and schedule
  them. UGC generation feeds it; it does not replace it.
- A virality/attention predictor to score a finished ad's hook, attention, and retention
  before it goes live. A creative test input, never a claim.

## Model selection (pick by need)

Choose by what the ad needs, not by brand name:

- **Realistic talking spokesperson UGC ad ->** the purpose-built marketing/UGC video mode
  with an avatar. Handles the actor-plus-product shape natively.
- **Consistent face across a whole campaign ->** train a character with your
  identity-consistency tool, then drive the video model with that reference id.
- **Product motion, before/after, multi-shot, exact start and end frames ->** a
  controllable image-to-video model, using your stills as references.
- **Cheaper single-scene clip without heavy motion ->** a lighter/faster video model.
- **Fast batch / many variants to test ->** a fast video model for volume, then promote
  only the winners to a higher-fidelity render. Ship many cheap variants, scale the ones
  that convert.
- **The reference stills themselves ->** your image generator, or a product-photoshoot
  generator for the product shot.

Rule of thumb: the marketing/UGC mode for the ad, the identity tool for a consistent
face, a controllable model for product motion, a fast model for batch testing. Validate
the preferred model's params before falling back to an older one.

## ICP-specific UGC angles

- **The buyer testimonial (in style, not as a claim).** An AI actor who reads as your
  real buyer delivering the hook-problem-proof-CTA script. Frame it as an illustrative
  scenario, never as a named real customer. Pull the pain from `creative-angles.md`.
- **Before/after ad.** Start frame on the rough / dated / broken state, end frame on the
  finished result, with a script about how the work gets found online. A controllable
  model with start-image and end-image references is the tool. Use real photos when you
  have them and permission; otherwise AI-generated ICP scenes.
- **The day-in-the-life.** A short first-person clip tying the work to the offer ("I do
  the work, the system answers the phone"). Founder-led and product framing, not a
  customer boast.
- **The product-teardown demo.** Screen or scene of the free diagnostic grading a
  situation, with a voiceover. Product-as-proof, fully honest.

## Guardrail (hard, non-negotiable)

AI actors and ICP-representative imagery may be allowed in your ads (check your own brand
rule). But they must NEVER be framed as a real customer, a real testimonial, or a real
result. An AI spokesperson is a presenter reading a script, not a client sharing their
outcome. No invented names, counts, revenue, or reviews. If a clip could be read as a
real customer saying real numbers, it is a blocker; fix the ad, not the page.

Route every UGC ad through the same gates as the rest of paid media before it ships:

- **`compliance-review` (Gus)** for claims / honest-urgency and the disclosure that
  on-screen people are illustrative, not customers. Authoritative on the law-adjacent
  line.
- **`creative-director` (Iris)** for taste, brand fit, and legibility of captions and
  on-screen text.
- **`slop-check` (Vera)** for AI-slop and distinctiveness, so the clip does not read as
  generic AI filler.

And the standing paid-media gate holds: the compliance reviewer runs on the script and
any claim, and the owner gives the final yes before anything goes to an ad platform. Voice
stays plain and audience-aware per `guardrails.md` and `company.yml -> brand.voice`.
