---
name: local-seo
description: The local-SEO capability for any location-based business — win the Google map pack / local 3-pack, which is often a local business's #1 organic channel. Use whenever the work is about ranking a business in its service area or optimizing its Google Business Profile, even phrased casually and even if 'skill' is never said. Trigger phrases include 'local SEO', 'Google Business Profile', 'GBP', 'map pack', 'local 3-pack', 'rank in my service area', 'get found locally', 'local citations', 'NAP', 'Google reviews for ranking', 'service-area pages', 'city pages', and 'why aren't we showing up on Google Maps'. Frame it for a business owner OR for an agency operator running local SEO on a client's behalf. Client-facing local/map-pack work only — for own-site AI-search / answer-engine work (AEO/GEO/LLM citation) use the ai-seo skill, its sibling.
---

# Local SEO — win the map pack

For any business that serves a local area, the **Google map pack** (the local 3-pack that sits above organic results, with the pins and star ratings) is often the single highest-intent organic channel there is. Someone typing "[service] near me" or "emergency [service]" is a buyer, not a browser. This skill is the playbook to get a client ranking there and get found in their service area. It is **client-facing** — you run it on a business's behalf.

## Ground yourself in config first

Every company-specific fact comes from config, never from invention:
- **Who the client serves and how they sell** — for your own company, `company.yml` → `icp.description` and the full research at `icp.research_doc` (a file under `kb_dir`). If a research doc is missing, do the research first — never invent customer facts, buying intent, or search behavior.
- **What the business is** — its real trade/vertical, real service area, and real business name drive every category, citation, and page decision below. Confirm these from the client, never infer them.
- **How you sound** — `company.yml` → `brand.voice` and `brand.banned_phrases` govern any client-facing line.
- **Legal constraints** — `company.yml` → `legal.jurisdiction` and `legal.regulated_claims`. The review and claims rules below assume a US context (FTC); confirm the client's jurisdiction and route claims through the compliance and legal gates.

## Boundary — what this owns vs the ai-seo sibling

- **local-seo (this skill)** owns **local / map-pack**: Google Business Profile, the local ranking triad, NAP + citations, review velocity, and localized service-area pages — for a client's business.
- **ai-seo** owns **own-site AI search** (AEO / GEO / LLM citation — getting cited by ChatGPT / Perplexity / AI Overviews).
- They meet on Google Business Profile: Google's own AI-search guidance flags GBP + merchant feeds as the local surface AI pulls from. When a client's local win needs AEO structure too (FAQ blocks, schema, machine-readable pages), hand that layer to **ai-seo**.

> **Kept as its own skill**, not folded into ai-seo, because local/map-pack is a distinct, rich, client-facing playbook (GBP mechanics, citations, review ops, spam-safety) vs own-site AEO. The ai-seo boundary is above; hand the AEO layer to ai-seo when a local win also needs machine-readable structure.

---

## The local ranking triad (memorize this)

Google states three factors decide local rank (Google, "Improve your Business Profile ranking on Google", support.google.com). Everything else rolls up into one of them:

| Factor | What it means | What actually moves it |
| --- | --- | --- |
| **Proximity** | How close the searcher is to the business | Mostly fixed — a real physical/service-area location. **Never fake or rent an address to fake proximity** (suspension + it doesn't durably work). Win the queries you can win from your true location; use service-area pages for the edges. |
| **Relevance** | How well the profile matches the search | Correct **primary category** (the biggest single lever), secondary categories, services list, service-area, business description, and on-site content matching the trade + city. |
| **Prominence** | How well-known / trusted the business is | Review **quantity + velocity + recency + rating**, citation consistency across the web, real links + press, and organic authority of the website. |

**The one-line strategy:** you can barely move proximity, so **win relevance (get the categories + services exactly right) and grind prominence (reviews + citations + links) relentlessly.**

Deep dive — each factor, what to touch first, and map-pack vs organic: `references/map-pack-ranking.md`.

---

## Google Business Profile — the core asset

The GBP is the listing that appears in the map pack, and getting it complete and correct is the single highest-leverage local task — the foundation everything else builds on. The essentials:

- **Primary category** = the strongest relevance lever. Pick the single most accurate one (e.g. "Dentist," not "Doctor"; "Italian restaurant," not "Restaurant"). Add **secondary categories** for real secondary services only.
- **Services** filled out under each category, **service-area** set to the real towns/ZIPs served (service-area businesses hide the street address), accurate **hours** (incl. 24/7 for genuine emergency businesses).
- **Photos** on a steady cadence (real job sites, storefront, team, before/afters) — freshness is a signal and a trust builder.
- **Google Posts** (updates/offers) weekly-ish, **Q&A** seeded and monitored, **product/service tiles** used.
- Verified, single listing (no duplicates), complete profile.

Full GBP optimization checklist + cadence: `references/gbp-optimization.md`.

---

## NAP + citations

**NAP** = Name, Address, Phone. Keep it **consistent** everywhere it appears online (GBP, website, directories) — same name, address, and phone format. Inconsistent NAP splits the business's identity and drags prominence.

- Core directories to claim/clean (Google, Bing Places, Apple Business Connect, Yelp, BBB, Facebook, Nextdoor, plus any directories specific to the client's industry).
- Cleanup workflow: audit → fix the highest-authority ones first → suppress duplicates.

Directory list + cleanup workflow: `references/citations-and-reviews.md`.

---

## Reviews — the prominence engine (honest by construction)

Reviews are the biggest lever a business can actively pull on prominence. The rules are non-negotiable:

- **Ask everyone, cadence matters.** A simple text with a direct review link shortly after the job/visit wraps converts far better than asking in person. Steady velocity beats a one-time burst.
- **NEVER fake, buy, or incentivize-without-disclosure reviews.** Fake/deceptive reviews are illegal under the US FTC's Rule on the Use of Consumer Reviews and Testimonials (16 CFR Part 465, effective Oct 21, 2024) and violate Google's policies (suspension risk). Confirm the client's jurisdiction and route through the legal gate.
- **NEVER review-gate** (surveying to route only happy customers to Google). It violates Google's review policies and the FTC rule. Ask *everyone*.
- **Respond to every review**, positive and negative, professionally — response rate is itself a trust + relevance signal.

Ask cadence, honest solicitation scripts, response templates, and the review-product tie-in: `references/citations-and-reviews.md`.

---

## Service-area & city pages — without doorway spam

To rank organically (and support the map pack) across multiple towns, a business needs localized pages. Done wrong they are **doorway pages** (Google spam policy) and get penalized. The line:

- **Doorway (banned):** near-duplicate pages, one per town, differing only by a swapped city name — thin, templated, no unique value.
- **Legitimate:** each service-area/city page carries **genuinely local, unique content** — real projects done there, local permits/climate/code notes, neighborhoods served, town-specific FAQs, real photos. Build only for areas you truly serve and can speak to.
- **Quality over volume, always.** Never mass-generate city pages to chase a footprint — that risks a Google penalty and the client's trust. One strong page beats ten thin ones.

Page structure + the anti-doorway checklist: `references/map-pack-ranking.md`.

---

## GBP guideline & spam safety (protect the client's listing)

A suspended GBP wipes out the #1 channel overnight. Honest posture only. Top suspension triggers to **never** do:

- **Keyword-stuffed business name** (e.g. "Joe's Auto — Emergency Brake & Transmission Repair"). The name must be the **real-world business name**, nothing more.
- **Lead-gen / fake / virtual-office addresses**, or a PO box, or an address you don't legitimately operate from.
- **Fake locations** to fake proximity, duplicate listings, or a home address a service-area business should be hiding.
- Fake reviews, review-gating, or incentivized reviews (above).

If a listing is already doing any of this, fixing it honestly is part of the engagement. Full guideline list + a suspension-recovery note: `references/gbp-optimization.md`.

---

## Map pack vs organic — when each wins

- **Map pack wins** high-intent, "near me" / emergency / same-day service queries (most local demand). Optimize GBP + reviews + proximity relevance first.
- **Organic wins** research + comparison queries ("how much does X cost," "A vs B"), which feed the blog engine and build the prominence that also lifts the map pack.
- They compound: organic authority is a prominence signal for local, and the map pack sends the highest-intent clicks. Run both; sequence map-pack first for fastest revenue.

---

## Starter workflow — local SEO for one business in one metro

The concrete first engagement for a client:

1. **Baseline.** Search the client's top 5 money queries from inside their service area (or via a local-grid tool). Record: do they appear in the map pack? Rank? Who's beating them (categories, review count, rating)?
2. **GBP audit + fix.** Correct primary/secondary categories, complete services + service-area + hours, verify no duplicate listings, no name-stuffing, no bad address. (`references/gbp-optimization.md`)
3. **NAP + citation cleanup.** Audit NAP across core directories, fix the highest-authority mismatches first, suppress duplicates. (`references/citations-and-reviews.md`)
4. **Review engine on.** Turn on the post-job review ask (text + direct link, shortly after wrap), respond to all existing reviews, set a steady velocity — honestly, everyone, no gating. (`references/citations-and-reviews.md`)
5. **Content + service-area pages.** One strong service-area page per town truly served (unique local proof, no doorway spam) + a handful of high-intent service pages. Hand AEO structure to **ai-seo**. (`references/map-pack-ranking.md`)
6. **Cadence + measure.** Weekly Google Posts + fresh photos; monthly re-check the money-query ranks (grid) and review count/velocity. Report the map-pack rank movement as the headline metric.

---

## Rules (fire every run)

- **Honest by construction.** No fake reviews, no review-gating, no fake locations/addresses, no name-stuffing, no doorway pages. Every external fact you state carries a source + date (as above); where there's no hard source, frame it as a principle, not a claim.
- **Quality over volume.** Never recommend anything that risks a Google penalty, a GBP suspension, or the client's trust. One strong asset over ten thin ones.
- **Client-facing framing.** You're operating a client's local presence; protect their listing like it's the business's front door — because it is.
- **Gates:** any client-facing audit, page, or recommendation goes through **Gus** (`compliance-review` — claims/FTC), **Lex** (`legal` — jurisdiction/review-law) where claims are load-bearing, and **Vera** (`slop-check` — distinctiveness) before it ships.
- **Hand off** AEO (own-site AI-citation structure, schema, machine-readable pages) to **ai-seo**; review-request product mechanics to your review-request flow; organic blog content to **blog-engine**.
