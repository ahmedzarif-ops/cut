# Advertising & Claims Law — FTC Substantiation, Endorsements, Licensing

> **Not legal advice.** `legal` / `legal-aid` ("Lex") is an AI advisory function, **not a licensed
> attorney**, and using it does **not** create an attorney-client relationship. It surfaces issues, applies
> known frameworks, and flags when to consult a licensed attorney — it does not give binding legal advice.
> Law changes; verify current law before relying on anything here.

The **legal standard behind the content gate (Gus)**. Gus enforces claims on a specific piece of content;
this file is the underlying law. US-focused; sources inline (verify current at runtime).

## FTC truth-in-advertising core (15 U.S.C. §45)

Two anchors the FTC applies to every ad:
1. **Truthful and non-deceptive** — no statement (or omission or implication) likely to mislead a reasonable
   consumer about something material.
2. **Substantiation** — advertisers must **possess and rely on adequate substantiation for all objective
   claims *before* they run**, including **competent and reliable scientific evidence** where the claim
   implies it. "We'll get you more customers," "rank #1," "X% more leads" are objective claims that need a
   real basis.
Source: [FTC, Advertising and Marketing Basics / Truth in Advertising](https://www.ftc.gov/business-guidance/advertising-marketing) (verify current at runtime).

## Endorsements & testimonials — FTC Endorsement Guides (16 CFR Part 255, revised 2023)

The FTC **revised the Endorsement Guides effective July 26, 2023**, with heightened scrutiny:
- An endorsement must reflect the **honest opinion of a real endorser** and the advertiser **must have
  substantiation for the performance claims the endorsement conveys** (express and implied).
- **Typical-results disclosure:** if the endorser's experience isn't what consumers will generally achieve,
  the ad must **clearly and conspicuously disclose the generally expected results** — and the disclosure must
  change the net impression so it isn't misleading.
- **Generic disclaimers don't cure it:** a page of glowing testimonials is **still likely deceptive even with
  a "results not typical" disclaimer** unless the advertiser has substantiation that new users typically get
  similar results.
- **Fake or undisclosed-material-connection endorsements** (invented reviews, paid endorsers not disclosed)
  are a core FTC target; the FTC's Consumer Reviews rule also prohibits fake/AI-generated reviews and
  testimonials.
Sources: [FTC Advertisement Endorsements](https://www.ftc.gov/news-events/topics/truth-advertising/advertisement-endorsements) · [Federal Register: revised Endorsement Guides (2023)](https://www.federalregister.gov/documents/2023/07/26/2023-14795/guides-concerning-the-use-of-endorsements-and-testimonials-in-advertising) · [16 CFR Part 255 (eCFR)](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255) (verify current at runtime).

> **STANDING HIGH-PRIORITY RULE — fabricated proof.** If the company ever runs **fabricated or placeholder
> testimonials** (invented names, made-up aggregate stats, an unearned "results" quote), that is **deceptive
> under the law above and the #1 pre-paid-ads FTC exposure.** Lex's standing position: any such proof **must
> become real, substantiated, attributable proof before any paid ad spend** drives traffic to it. Flag it on
> every relevant review. If the owner has made a documented decision to keep placeholder proof live, that is
> the owner's call — but the legal risk is real and rises sharply with paid traffic. (This kit's default
> convention is to REMOVE fabricated proof rather than replace it with new fabricated proof.)

## Earnings / results claims

"Get more customers/leads/revenue," ROI figures, and any earnings-type representation are **objective claims
that need substantiation** and, if individual results vary, **typical-results disclosure**. Prefer ranges
grounded in real data, hedged language ("industry estimates suggest…"), and a clear basis. No guarantees of
results.

## Industry licensing-claim risk (where the offer is a regulated trade or profession)

If the company or its customers operate in a **licensed/regulated industry** (see `company.yml` →
`legal.regulated_claims` and `offer.*`), two angles apply:
- **About a customer/practitioner:** marketing copy must not imply a **license, certification, or
  qualification they don't hold**, or misstate what they're licensed to do — state licensing boards regulate
  this and it varies by state/profession.
- **About the company:** the company must not imply it provides legal, licensing, or regulated professional
  services it doesn't. Keep the framing to what it actually does — not "we handle your
  licensing/permits/compliance."

## Boundary with Gus (Content Compliance)

**Gus** (`compliance-review`) reviews the **words/claims in a specific piece of content** (blog, ad, email,
deck) and returns PASS/FLAG against FTC/brand/platform-policy rules. **Lex owns the underlying law** here and
is who Gus escalates a genuinely legal question to (e.g., "is this testimonial structure lawful," "does this
licensing claim create regulatory exposure"). Lex doesn't rewrite content; Gus doesn't opine on the law.

## Route to counsel when…

- A **regulator inquiry, demand, or competitor challenge** about advertising claims.
- **Testimonials/endorsements** going live with paid spend (substantiation + the fabricated-proof issue above).
- **Health/financial/"results"** claims with legal sensitivity, or **industry-licensing** representations
  that could trigger a state board.
- Comparative advertising naming competitors.

---

**How the agent uses this file:** apply substantiation + the 2023 Endorsement Guides to any claim or
testimonial; **always flag any fabricated/placeholder proof as the #1 pre-ads FTC risk**; watch
industry-licensing-claim exposure (per `company.yml` → `legal.regulated_claims`); cite the current authority
+ date; and route regulator inquiries / paid-spend testimonial go-lives / licensing representations to
counsel. Pair with **Gus** on the specific content.
