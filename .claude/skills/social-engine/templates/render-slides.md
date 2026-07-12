# Rendering brand social slides → PNG

The token-aligned slide system for **carousels** and **stat/statement cards**. Crisp on-brand typography
that matches your site/decks/emails — use it instead of AI image generation for text-forward posts. (Keep
an image-gen tool for photographic/video assets.)

## 1. Author the deck

A `slides.json`:
```json
{ "deck": [
  { "type": "cover", "ratio": "9x16", "eyebrow": "Your Brand", "title": "Hook headline" },
  { "type": "point", "ratio": "9x16", "num": "1", "title": "Point title", "body": "One or two short sentences." },
  { "type": "stat",  "ratio": "9x16", "figure": "78%", "caption": "What the number means (cite if it's a claim)." },
  { "type": "cta",   "ratio": "9x16", "title": "Get your free assessment", "cta": "yourdomain.example" }
] }
```
- **Types:** `cover` (hook + logo), `point` (numbered carousel body), `stat` (big figure + caption),
  `cta` (outro + CTA + logo). **No `quote`/testimonial type** — fabricated testimonials are an advertising-law
  risk; use real, attributable proof only, and keep stat captions honest/sourced.
- **Ratios:** `1x1` = 1080×1080 (LinkedIn/IG feed) · `9x16` = 1080×1920 (Shorts/Reels/Stories).
- A **carousel** = an ordered deck of one ratio; a **stat card** = a single slide.

## 2. Build the HTML

```bash
node .claude/skills/social-engine/templates/build-social-slides.mjs <slides.json> <outDir>
```
Writes one self-contained `NN-<type>.html` per slide into `<outDir>` (clears old `.html` first). The brand
CSS (colors, fonts, the logo lockup) lives in the template; the builder only injects text. Before first use,
swap the placeholder tokens in `social-slide.template.html` for your own brand (align to
`company.yml` → `brand.visual_notes`).

## 3. Screenshot each to PNG (Playwright)

Serve the out dir (`python3 -m http.server` inside it — Playwright blocks `file://`), then for **each** slide:
1. **Set the viewport to the slide's exact px** — `1x1` → **1080×1080**, `9x16` → **1080×1920**.
2. Navigate to the slide HTML.
3. Screenshot the viewport (not full-page).

> **Lesson (important):** re-assert the viewport size **before each shot** and let the page settle a beat —
> the web-fonts fetch + the tool's page reset between shots can otherwise capture a blank or wrongly-sized
> frame. If a shot comes back blank, just re-navigate and re-shoot; the HTML is fine.

Name the PNGs to match the slide order. Carousel PNGs upload in order; the stat card is standalone.

## 4. Gate

Slide **copy** still passes the social-engine concept → compliance (Gus) gate before anything is scheduled.
These templates are the on-brand container; the words inside are reviewed like any other social copy.
