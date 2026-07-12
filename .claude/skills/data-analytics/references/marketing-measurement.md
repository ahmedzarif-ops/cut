# Marketing Measurement & Attribution

How you measure where growth comes from — for yourself and, later, for clients — **honestly**. The
recurring theme: at a small company's volume and in the current privacy environment, measurement is
*directional*, not precise. A good Head of Data says so plainly and triangulates, rather than quoting
platform numbers as truth. Verify volatile specifics at runtime — this area moves.

## Web-analytics reality (GA4 as the worked example, 2026)

The specifics below are for GA4; the *principles* apply to any web-analytics tool. Confirm current
behavior for whatever you run.

- **Data-Driven Attribution (DDA) is the default.** At the end of 2023 GA4 removed the rule-based models
  (linear, time-decay, position-based); everyone in GA4 is now on DDA whether they chose it or not.
- **DDA needs volume a new company likely doesn't have yet.** It requires roughly **400+ conversions for
  the action and ~20,000 total conversions** in the lookback window to model meaningfully (practical
  guidance often cites 700+/month). A new company won't hit that — so **don't over-trust DDA at low
  volume**; interpret simply, use a position-based lens for intuition, and lean on the triangle below.
- **Attribution is correlation, not causation.** High DDA credit means users who touched that channel
  converted more — *not* that the channel caused it. Hold this line in every readout.
- **Known distortions:** cross-device / cookie-clearing / incognito create "new" users and break journeys;
  iOS/ITP limits persistence (systematically **undervalues mobile ads, over-credits direct/organic**);
  consent declines flip analytics into **modeling mode** (estimated, not observed); sampling, thresholding,
  and cardinality "(other)" rows truncate the standard UI.
- **For serious work, use the free warehouse export** (e.g. GA4 → BigQuery) — unsampled raw events, proper
  channel grouping, session stitching, direct-source removal. (Free tier ~1 TB queries / 10 GB storage
  covers a small site.) Then model in the warehouse and visualize from there.
- **Config hygiene:** set lookback windows to match the real sales cycle; review the **model-comparison
  report** quarterly; define **key events** deliberately; instrument the full funnel with clean events and
  **UTM discipline**.

## The privacy/cookie picture — get this right

The "cookies are dead" narrative is **outdated**. **Google formally ended its Privacy Sandbox in October
2025** and is **keeping third-party cookies in Chrome** rather than replacing them. So don't overstate
cookie loss. *But* the privacy-driven degradation is still real — Safari/iOS ITP, ad blockers, and consent
declines remove an estimated **20–50% of trackable sessions** — so the first-party, modeled direction
holds:

- **Enhanced Conversions** (hashed first-party data) — now standard practice in ad platforms; recovers
  conversions lost to ITP/ad blockers and improves bid signals.
- **Server-side tagging** (e.g. server-side GTM) — more resilient collection.
- **Offline conversion import** — credit the click that led to a phone call or in-person close.
  **Especially important when buyers convert offline** (by calling or in person).
- **First-party data foundation + warehouse** — the metrics layer is the durable measurement asset;
  platform pixels are supplements, not the system of record.

## The measurement triangle (sized for a small company)

No single method is sufficient — triangulate, and match the method to the volume:

- **DDA / in-platform attribution** — campaign-level optimization *when you have the volume*. At low
  volume today, treat as directional.
- **MMM (Marketing Mix Modeling)** — privacy-safe aggregate regression; captures offline + halo;
  open-source tools exist (e.g. Google Meridian, Meta Robyn). **But MMM needs years of data broken down by
  time and geography — not realistic for a young company yet.** Flag it as a later-stage capability; don't
  promise it now.
- **Incrementality / holdout tests** — the only causally clean method (compare exposed vs held-out). The
  practical small-business version is a simple **geo or audience holdout** to prove a channel actually
  drives lift. This is how you *prove* a channel works rather than assuming.
- **Self-reported attribution** — literally ask "How did you hear about us?" at intake. Software-only
  tracking misses a large share of real attribution (dark social, word of mouth, offline); self-report is
  cheap, robust, and well-suited to businesses with offline touchpoints. Strongly recommended.

## Platform over-counting → reconcile

Each ad platform claims credit generously (e.g., Meta's 1-day-view / 28-day-click window; Google similar),
so summing platform-reported conversions **double-counts**. Reconcile everything to the warehouse / CRM /
billing (see `metrics-layer.md`). When budgets are small (under ~$50k/mo on a single platform), native
attribution + Enhanced Conversions is adequate — the rigor that pays off is reconciliation and a holdout
test, not an expensive attribution tool.

## A practical measurement stack (today)

Native web analytics (+ warehouse export when needed) → **Enhanced Conversions + offline conversion import
+ self-reported attribution** → reconcile in the warehouse. Add **holdout tests** to prove channels. Defer
MMM until there's enough history. For client reporting later, reuse these definitions and the same honesty
(and route client-facing marketing claims through the `compliance-review` gate (Gus) — substantiate, no
guaranteed-results claims in client-facing reports).

---

**How the agent uses this file:** when measuring acquisition or reporting channel performance, instrument
cleanly, prefer the warehouse over platform-reported numbers, **caveat attribution as directional —
especially at low volume — and never present modeled/attributed numbers as precise truth.** Propose a
holdout test when a channel decision actually matters.
