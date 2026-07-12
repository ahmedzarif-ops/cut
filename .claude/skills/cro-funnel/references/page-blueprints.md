# Page Blueprints + Decision Tree

This is the contract the `landing-page-builder` agent builds against. The blueprints below are keyed
to POSITION in your offer ladder (a low-ticket entry page, a higher-tier subscription/main page, an
exit-intent downsell, a consult booking), not to any fixed product. Read your ladder from
`company.yml` → `offer.summary` + `offer.pricing_notes`, then compose the matching blueprint. Build a
blueprint only when a campaign needs it.

## Shared mechanics (locked, apply to every page)

- Route: a noindex campaign path (e.g. `/go/<slug>`), `robots: { index:false, follow:false }`, the campaign path added to the robots disallow, NOT in nav / footer / sitemap. For paid-ad traffic only.
- Section library: build a reusable set of funnel sections your pages compose from — e.g. Hero, ProblemPAS, MechanismBlock, FounderProof, OfferStack, GuaranteeBlock, FaqBlock, StickyCtaBar, CountdownBar, ExitIntentModal, plus a proof block. Any placeholder proof block is a pre-launch blocker (see `qa-checklists.md`).
- Tracking: fire `generate_lead` (lead/entry start), `begin_checkout` (cart/subscribe), `purchase` (success) at the real seams so analytics + ad platforms optimize (see `kpis.md`).
- Honest timed offer: a `CountdownBar` counts to `first_seen + window` from a cookie; the discount is enforced server-side and reverts after the window; it never resets on reload (see `ethics-guardrails.md`).
- Proof: founder-led (founder KB) + product-as-proof (real screenshots, a live diagnostic) + sourced stats (with reliability flags) + a real guarantee. Never fabricate.
- One most-wanted action per page. Mobile-first (ad traffic is mobile). High attention ratio (minimal nav on the page itself).

## Blueprint A: Paid-social low-ticket entry page

- Target source: IG / TikTok / Meta video ad. Awareness: problem-aware, cold. Visitor intent: "is this problem costing me?"
- Most-wanted action: a genuine low-friction entry (a free diagnostic/check) as primary; the low-ticket purchase as secondary.
- Core promise: "See exactly where you are losing [outcome] in [N] minutes, then get the plan to fix it." (fill from your offer)
- Length: medium sales letter.
- Section flow: Hero (hook + the low-friction entry CTA) → ProblemPAS (the pain, grounded in the segment's lead pain) → MechanismBlock (the diagnostic + what it reveals + the do-this-next plan) → FounderProof → OfferStack (the low-ticket price, what is included, credits toward the next tier, the guarantee) → FaqBlock (objections) → StickyCtaBar.
- Optional: CountdownBar ONLY if there is a real expiring bonus (not a fake discount on the floor price), a short product screenshot.
- CTA hierarchy: free entry > low-ticket buy. Form fields: minimal (ask for the least you need; capture contact later at results, not up front).
- Friction risks: asking for contact info up front; too much copy before the entry CTA.
- Metrics: entry starts/completes, low-tier purchase rate, cost per entry (see `kpis.md`).

## Blueprint B: Paid-social higher-tier / subscription page

- Target source: IG / TikTok / Meta (often retargeting or warmer). Awareness: problem/solution-aware. Intent: "I know I need this and I have no time."
- Most-wanted action: start the subscription/main purchase (primary). Secondary: "see a live sample" / book a call for colder traffic.
- Core promise: the main outcome your offer delivers, in one line (fill from `offer.summary`).
- Length: long sales letter.
- LEAD WITH THE FAST WIN. Cold paid traffic buys the instant, tangible win first — open the Hero and the value-stack with the things the buyer feels in the first week, and demote the slow-compounding benefits to a "compounding background" section lower down, framed honestly as the slow build that pays off over months. Do not open on the slow-payoff engine.
- Section flow: Hero (leads on the instant wins, then the core hook) → ProblemPAS (the main pains as one story) → MechanismBlock (fast wins up front; slow-compounding benefit demoted to a "background" pillar; each pillar the cure for a named pain) → a VALUE-STACK block that leads with the instant wins, then the "replaces $X of tools/effort" math → FounderProof → OfferStack (the price, any honest founding/early lever as the timed offer, annual option, cancel anytime, the guarantee) → FaqBlock (the top objections) → StickyCtaBar → CountdownBar (the honest timed lever) → ExitIntentModal (downsell to the lower tier).
- CTA hierarchy: subscribe > book a call > start with the low tier.
- Friction risks: leading with price before value; an overwhelming feature list (use the journey/story spine).
- Metrics: checkout starts, paid conversions, downsell take rate, consult bookings.

## Blueprint C: Exit-intent downsell (modal, not a route)

- Trigger: exit intent on the higher-tier page (desktop: mouseleave to top; mobile: scroll-up velocity / back intent). Show once per session (cookie).
- Offer: "Not ready for the full system? Start with the lower tier, and it credits toward the upgrade." One honest offer, dismissible. No second pop, no fake countdown.
- Most-wanted action: buy the lower tier (or run the free entry).

## Blueprint D: Consult booking (top tier)

- Reuse your booking path: CTA → `company.yml` → `offer.booking_link`. No new route. Surfaced as the "scaling? book a call" upsell inline + in the higher-tier FAQ.

## Decision tree (which page)

1. Cold problem-aware paid social → Blueprint A (low tier, free-entry primary).
2. Warmer / retargeting / solution-aware → Blueprint B (higher tier).
3. Leaving the higher-tier page → Blueprint C (downsell).
4. High-intent / high-value segment → Blueprint B with the consult book-a-call CTA raised.

## Other page types (build when a campaign needs one)

Free-diagnostic page, diagnostic-results page, offer-preview page, live-demo page, paid-SEARCH
high-intent page, retargeting page, blog-to-diagnostic page, dedicated upgrade page, checkout page,
post-purchase onboarding page, cancel-flow save-offer page, referral/advocate page. Give each its own
blueprint here before building it.

## Product-proof note

If you show a simulation of the product experience on a page, keep it a LABELLED SIMULATION (never an
unlabelled fake or a claim it is real usage). Honest labelling is required per `ethics-guardrails.md`.
