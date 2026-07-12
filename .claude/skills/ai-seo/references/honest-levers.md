# Honest AEO/GEO levers — templates & rationale

Detailed playbook for the levers named in `SKILL.md`. Everything here is a lever with a real mechanism; the honesty wall in `SKILL.md` governs all of it.

## Contents
- Answer-first passage template
- Extractable block templates (definition / comparison / how-to / FAQ / stat)
- The Princeton GEO findings (directional — never a published claim)
- Schema by content type
- Third-party presence (be where AI looks) — honestly
- Content formats that get cited most

---

## Answer-first passage template

Every section earns its citation in the **first sentence**. Structure:

```
## <the question, phrased how a person asks it>
<Direct, self-contained answer in one sentence — true without the surrounding page.>
<1–3 sentences of expansion: the mechanism, the caveat, the specific number with its source.>
```

**Example — notice the figure carries its source; that is the whole point:**
```
## How much does <service> SEO cost?
Most companies in <your category> invest roughly $[low]–$[high]/month in SEO
according to [named industry source, year], scaling with the number of
service areas targeted. The spend is driven mostly by content and
local-citation volume rather than any per-keyword fee.
```
The first sentence stands alone and stays true out of context **because the figure is attributed**. Never ship the bracket placeholders and never ship a bare number — fill them from real research with a named, dated source (honesty wall #1). An unsourced pricing or savings figure is exactly the kind of claim an AI will lift verbatim, so it is the last thing we hand it. Keep the liftable core ≈40–60 words.

---

## Extractable block templates

**Definition block** — for "what is X" / "X meaning":
> **X** is <one-sentence definition>. It <what it does / why it matters in one clause>.

**Comparison table** — for "X vs Y" / "best X for Y". Tables extract far better than prose:
| | Option A | Option B |
|---|---|---|
| Best for | … | … |
| Cost | … | … |
| Tradeoff | … | … |

**How-to (numbered)** — for "how to X". Numbered steps extract as steps:
> 1. <imperative step> — <the one detail that makes it real>
> 2. …

**FAQ block** — real questions in natural phrasing (mine them with your research MCP, don't invent them), each answered answer-first. Pairs with `FAQPage` schema.

**Stat block** — a claim carried by a real, named, dated source:
> According to <named source> (<year>), <specific number + what it measures>.

Never a bare number, never an un-attributed "studies show".

---

## The Princeton GEO findings (directional — never a published claim)

The Princeton "GEO: Generative Engine Optimization" study (KDD 2024, evaluated on Perplexity-style engines) ranked which content changes most raised the likelihood of a passage being cited. **Use this table to order the levers, not as a promise.** Do not put these percentages on a client slide or in a deliverable as an expected result — they are sample findings, and the honesty wall forbids publishing them as a claim.

| Lever (highest-signal first) | Direction | How we apply it |
|---|---|---|
| Cite sources | strongest | authoritative references with links |
| Add statistics | strong | specific real numbers with sources + dates |
| Add quotations | strong | named expert quotes with title + org |
| Authoritative tone | moderate | demonstrated first-hand expertise (E-E-A-T) |
| Improve clarity / fluency | moderate | simplify; one idea per paragraph |
| Technical terms / unique vocab | mild | correct domain terminology (your field's real words) |
| Keyword stuffing | **negative** | never — it *lowers* citation likelihood |

Takeaway: **evidence beats phrasing.** The biggest, most controllable wins are the first three — and they're exactly the ones that are honest by construction, because they require real sources.

---

## Schema by content type

Emit only schema that truthfully describes the page. Implementation goes to your schema/product code; this is the *which + why*.

| Page type | Schema | Why |
|---|---|---|
| Blog post / guide | `Article` / `BlogPosting` | author, date, topic identity |
| How-to | `HowTo` | step extraction |
| Real FAQ section | `FAQPage` | direct Q&A extraction |
| Product / tier page | `Product` | features, structured detail |
| Local service page | `LocalBusiness` / `Service` | entity + service-area recognition (the map-pack surface `local-seo` owns) |
| Comparison | `ItemList` | structured comparison |

**Hard rule:** do NOT emit `Review` / `AggregateRating` JSON-LD unless there are real, verifiable reviews. Fabricated rating markup collides with the no-fabricated-proof rule, risks a Google structured-data manual action, and a post-deploy verify battery should explicitly check these are absent on our pages.

---

## Third-party presence — be where AI looks (honestly)

AI answers often surface third-party sources alongside or instead of a brand's own domain (Wikipedia, Reddit, YouTube, industry publications, review platforms), so owned-domain content is not the only path to a citation. The honest way to earn that presence:

- **Earn real mentions** — get genuinely featured in industry roundups, contribute real value in the communities your buyers actually use, publish video how-tos for real questions. Never manufacture or bulk-post.
- **Keep owned third-party profiles accurate** — an accurate, current profile on a relevant platform is fair game; a fake or spammed one is not.
- The highest-honesty third-party plays are: real video answers to your buyers' questions, genuine case-study coverage as clients produce real results, and accurate directory/profile presence. All of it waits on real substance — there is no shortcut that survives contact with a skeptical prospect.

---

## Content formats that get cited most

Prioritize formats AI engines lift from because they're structured and evidence-dense — and tie each to the query type it wins:

- **Comparison articles** — "<channel A> vs <channel B>", "<competitor> vs <competitor> for <outcome>": high-intent, balanced, table-friendly.
- **Definitive guides** — "how to <achieve the core outcome>": one comprehensive parent topic that owns the query fan-out.
- **Original research / our own measured results** — the strongest and least fakeable format. As your real client outcomes graduate through a validated measured-metrics tier they become citable first-party data no competitor has, which is the durable moat version of this lever.
- **How-to guides** — "how to <specific task in your domain>": step-structured, extracts as steps.
- **Honest listicles** — "best <category> for <use case>": entity-rich, and only if every item is real.

Underperformers: thin marketing pages, undated/unattributed posts, gated content (AI can't read it), and JS-only pages that don't render server-side.
