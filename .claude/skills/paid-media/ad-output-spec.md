# Ad Output Spec (the copywriter's contract)

The exact shape `paid-media-copywriter` produces for every campaign. Each campaign gets
the full field set plus the platform variants it runs on. Copy is paste-ready (drop
straight into Ads Manager / the ad platform), message-matched to its destination page,
and voice-clean per `guardrails.md`.

## Per-campaign field set

Every campaign begins with this block:

- Strategic objective
- Audience
- Awareness stage
- Offer
- Main problem
- Primary emotional tension
- Business consequence
- Proof requirement
- Creative angle (from `creative-angles.md`)
- Ad format
- Hook
- Body copy
- Headline
- Description
- CTA
- Landing-page URL type (which page or asset)
- Message-match notes (how the ad promise maps to the page hero)
- Test variable (the one thing this variant tests)
- Primary metric
- Guardrail metric

## Platform variant checklist

Generate the variants the campaign's channel needs. Respect platform limits; write to
the limit, not over it.

- Meta primary text (lead in the first ~125 characters; full text can run longer).
- Meta headline (about 40 characters).
- Meta description (about 30 characters).
- Facebook Feed version.
- Instagram Feed version.
- Instagram Reels (script + on-screen caption beats).
- Story ads (vertical, caption beats).
- Carousel cards (3 to 6 cards, each with a card headline + line; the leak-walkthrough
  set is a strong default).
- Google Search RSA: up to 15 headlines (30 characters each) + 4 descriptions (90
  characters each); include pinned options for the brand/offer.
- Google callout assets (25 characters each, 4 or more).
- Google structured snippets (a header + values).
- Video skippable in-stream script (15 to 30s and 45 to 90s versions; hook in the first
  5 seconds before the skip).
- Short-form video script (vertical, fast, caption beats).
- Professional-network single-image ad (intro text + headline).
- Professional-network video ad (script).
- Retargeting ads (by the intent tier in `channel-strategy.md`).
- Email nurture / sponsored content where applicable (subject + preview + body).

## Message-match rule

Each ad's promise must match the destination page's hero promise. Map:

- Free-diagnostic ads -> the diagnostic page hero. The ad hook and the page hero should
  echo the same words.
- Recurring-offer ads -> the recurring-offer page hero. Carry the core promise (e.g.
  approval-first, no retainer) through.
- Read the live page copy before writing (the skill passes it in). If an ad makes a
  promise the page does not deliver, fix the ad, not the page.

## Fill-in template (clone per campaign)

```
## Campaign: <name>

- Strategic objective:
- Audience:
- Awareness stage:
- Offer:
- Main problem:
- Primary emotional tension:
- Business consequence:
- Proof requirement:
- Creative angle:
- Ad format:
- Hook:
- Body copy:
- Headline:
- Description:
- CTA:
- Landing-page URL type:
- Message-match notes:
- Test variable:
- Primary metric:
- Guardrail metric:

### Variants

Meta primary text:
Meta headline:
Meta description:
Facebook Feed:
Instagram Feed:
Instagram Reels (script + captions):
Story ad (captions):
Carousel cards:
  - Card 1:
  - Card 2:
  - Card 3:
Google RSA headlines (<=30 chars each):
  1.
  2.
  ...
Google RSA descriptions (<=90 chars each):
  1.
  2.
Google callouts (<=25 chars each):
Google structured snippets:
Video in-stream (15-30s):
Video in-stream (45-90s):
Short-form video:
Professional-network single-image (intro + headline):
Professional-network video (script):
Retargeting (by intent tier):
Email (subject / preview / body):
```
