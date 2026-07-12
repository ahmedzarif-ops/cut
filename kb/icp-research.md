---
date: 2026-07-12
product: CUT — mobile app (App Store subscription) that tells lifters exactly what to do next to finish their cut
method: >
  Grounded first in product truth (build spec + GTM change order in attached_assets/, company.yml).
  Then ~12 Exa semantic web searches (2024–2026 preferred) across demographics, pain points,
  competitor tooling, pricing, JTBD, and channels. Evidence quoted below comes from Exa's
  extended source excerpts.
limitations: >
  HONEST LIMITS: (1) No Reddit/forum/X social listening was possible — logged-out public
  sources only, per the web-research guardrails. The closest substitute is a peer-reviewed UCL
  study that itself analyzed 58k social posts [6]. (2) The page-reader tool (r.jina.ai) returned
  401 during this session, so full-page reads were not possible; all evidence is from Exa's
  source excerpts, which are substantial but not complete pages. (3) Several 2026 "app comparison"
  blogs are published by competing app vendors (nutriscan.app, nutrola.app, geteatai.app);
  they are used ONLY for pricing tables that cross-check against official pricing pages, and
  are flagged where cited. (4) No primary user interviews yet — see Open questions.
---

# CUT — ICP Research

## Who they are (with evidence)

- **Bulk/cut cycling is a mainstream male-lifter behavior, not a niche.** In a national sample of 2,762 Canadians aged 16–30, **48.9% of men** reported bulk-and-cut cycles in the past 12 months (vs 21.2% of women) [1]. This is the strongest quantitative evidence that "people who run cuts" skew male and young-adult — matching the spec's launch wedge (men ~25–40 who lift) while confirming the product should not be gender-locked (1 in 5 women cycle too) [1].
- **The addressable pool of lifters is large and growing.** 77M Americans (25% of ages 6+) held a fitness facility membership in 2024; 32.1% of members trained with dumbbells/free weights, and every strength-category activity increased participation in 2024 for the first time since the pandemic [3][4][17]. The typical gym member has trended "younger, more male, less affluent, and more ethnically diverse" [3].
- **Psychographics of the cut-runner:** motivated by body composition/aesthetics and strength-to-weight, deliberately trying to lose fat while preserving fat-free mass — the defining constraint that separates them from general dieters [2]. They already understand calories/protein at a basic level (the science consensus they've absorbed from creators: 0.5–1.0% bodyweight loss/week, high protein, keep lifting [2]) — their problem is execution, not knowledge. This matches the GTM change order's ICP ("understands basic calories or protein but struggles with consistent execution").
- **They consume evidence-based fitness media at scale**: a single Jeff Nippard video drew 7.7M views; an RP (Dr. Mike Israetel) video 1.8M [15][16]. These audiences are pre-sold on the ideas CUT operationalizes (adaptive targets, muscle retention first).
- Evidence is thin on precise income/occupation data for cut-runners specifically; gym-industry data says >half of members come from $75k+ households [4]. Treat the spec's "demanding job / business owner / inconsistent schedule" framing as a plausible but unverified hypothesis for interviews.

## Segments

| # | Segment | Description | Evidence basis |
|---|---|---|---|
| 1 | **The repeat cutter (recommended beachhead)** | Age ~25–40, several years of lifting, has started 2+ cuts and lost consistency mid-way; knows the theory, fails on execution; time-poor; eats mixed/restaurant/cultural food | Bulk/cut cycling prevalence shows repeated cycles are the norm [1]; adherence — not diet type — is the failure point [5]; matches GTM spec ICP and the founder's own profile |
| 2 | First serious cut | Newer lifter (1–2 years), first structured deficit, high anxiety, most susceptible to crash-dieting and app-guilt spirals | Tracking-app shame/demotivation effects concentrate on people struggling with targets [6]; SBS warns explicitly against crash dieting [18] |
| 3 | Physique competitor / contest prep | Prepping for a show; already pays $99–500/mo for a human coach; needs peak-week rigor CUT doesn't do at MVP | Coach pricing pages [14]; Carbon explicitly targets this segment ("contest prep features: excellent") [11] |
| 4 | GLP-1 lifter (emerging) | Losing weight pharmacologically, terrified of muscle loss, wants training+protein guardrails | Muscle-loss-during-weight-loss concern is now mainstream media content [20]; thin direct evidence — flag for primary research |

**Why segment 1 is the beachhead:** it's the largest overlap of (a) proven willingness to pay for nutrition apps (MacroFactor/Carbon's exact audience [7][11]), (b) the pain CUT's wedge solves (execution collapse, not knowledge gaps [5][6]), (c) reachable through a few concentrated channels [15][16][19], and (d) it's the founder's own lived profile, so product truth is authentic. Competitors serve segment 1 a *dashboard*; nobody serves it *one next action*. Segment 3 is loud but small and already well-served by humans + Carbon. Segment 2 is a fast-follow (same product, gentler defaults).

## Pain points & failure modes (ranked)

1. **Adherence collapse, not plan quality, is why cuts fail.** RCT evidence in resistance-trained people: flexible vs rigid diets produced the same fat loss — "adherence to a diet, regardless of the type of diet, is an important factor in weight loss success" [5]. The plan is commoditized; sticking to it is the product opportunity.
2. **Tracking guilt → avoidance → quit.** Peer-reviewed social-listening across the 5 highest-grossing fitness apps: users report shame logging "unhealthy" foods, feel "pestered" by notifications, and losing a streak or missing a target leads to "avoidant behaviours… or complete disengagement" [6]. Rigid quantification demotivates the exact behavior it's meant to support [6].
3. **Rigidity breaks against real life.** The dominant complaint about RP Diet Coach — the closest "coach-like" competitor — is rigidity: fixed meal times every 3–4 hours, no room for snacks or schedule chaos, "won't let you log it at all" if a meal exceeds macros, red/orange adherence scores that become "discouraging… even if you're trying your best" [8][12][19]. CUT's ICP eats restaurant/cultural/mixed food on inconsistent schedules — rigidity is disqualifying.
4. **Logging friction and jank.** MyFitnessPal's own long-term users cite buggy barcode scanning, lost recipes, paywalled basics, and worsening logging UX as reasons they quit [9]; RP app store reviews call the app itself "BAD and painful to use" even while conceding "the plans really work" [19].
5. **Plateau panic → panic moves.** When weight stalls, lifters don't know whether to cut calories, add cardio, or wait; the content ecosystem is full of plateau "decision trees" and warnings against "pointless calorie cuts" [13][21] — evidence that the moment of stall is a high-anxiety decision point with no in-app answer.
6. **Muscle-loss fear.** The defining anxiety of this ICP: hypocaloric diets risk fat-free mass, and the countermeasures (moderate rate, high protein, keep lifting) require ongoing calibration [2][20]. Apps that only count calories don't address it; it's why "preserve muscle" must be first-class in CUT's messaging.
7. **Unrealistic/absurd auto-targets destroy trust.** Users report apps prescribing impossible deficits ("−700 calories a day") [6] — a warning for CUT: the deterministic engine's outputs must always be sane and explainable.

## Jobs-to-be-done

- **Core JTBD (from the GTM spec, validated by evidence):** *"When I'm mid-cut and life gets messy, tell me exactly what to do next so I finish this cut without losing the muscle I built."* Evidence: adherence is the failure point [5]; rigidity breaks on messy schedules [8]; muscle retention is the non-negotiable [2].
- *"When the scale stalls for a week, tell me whether to change anything — before I panic and slash calories."* [13][21]
- *"When I ate off-plan, tell me the next right move instead of making me feel like I broke something."* (anti-shame job; the streak/guilt loop is the #1 documented quit trigger [6][8])
- *"When I don't want to think, give me the meal/training default that fits my food culture and schedule."* (the spec's cuisine-tagged template system; RP's whole-food/repeat-meal assumptions fail people who eat out [8])
- **The wedge vs dashboards:** MacroFactor and MFP are hired to *record what happened*; CUT is hired to *decide what happens next*. Even MacroFactor's fans describe it as charts + targets for "the analytically minded user" [7] — data exhaust the user must interpret. Nobody in the set owns the "one next action" job.

## Current alternatives & their gaps

| Tool | Price (verified where possible) | What users praise | What users complain about | Gap CUT exploits |
|---|---|---|---|---|
| MacroFactor | $11.99/mo, $71.99/yr; bundle w/ Workouts $89.99/yr (official) [10] | Fastest logger tested, adaptive TDEE, flexible, no shame framing [7] | Still manual logging; data-dense; you interpret the charts yourself [7][11]* | It adapts *targets*; it doesn't tell you *what to do next* — training, food, and weigh-in decisions stay on the user |
| RP Diet Coach | ~$14.99/mo, ~$179.88/yr [7][11]* | "The plans really work"; removes guesswork; diet-length/cut-spacing guardrails [12][19] | Very rigid meal times/macros; can't log over-target meals; guilt-inducing adherence colors; buggy, dated UX [8][12][19] | Coach-like direction *without* the rigidity; built for restaurant/cultural/mixed eating |
| Carbon Diet Coach | $11.99/mo, $99.99/yr (base prices from joincarbon.com per [11]*) | Weekly auto-adjusted coaching; strong for contest prep / reverse dieting [11]* | Among the priciest trackers; coaching layer wasted if you just want tracking; no training guidance [11]* | Nutrition-only; CUT unifies training + food + weigh-ins into one next action |
| MyFitnessPal | $19.99/mo, $79.99/yr Premium [11]* | Huge database, ubiquity | Bugs, paywalled barcode scanner, degraded logging UX, unverified entries; long-term users publicly quitting [9] | It's the "another calorie tracker" CUT is explicitly positioned against |
| Spreadsheets / SBS macro calculator + coach | Free–DIY; human coaches $99–$500/mo [14][18] | Full control; trusted science (SBS diet guide) [18] | All decisions manual; no adaptation; juggling 3 tools | CUT = the operating system those spreadsheets approximate |
| Human online coach | $99–$500/mo typical; $125–$350/mo common [14] | Real accountability, personalization | 10–40× app pricing; quality varies; async check-ins weekly at best | CUT sits in the empty middle: coach-like direction at app pricing |

\* Prices marked [11] come from competitor-vendor blogs; cross-checked against each other and against official pages where available ([10] is official). Verify RP/Carbon/MFP prices on their stores before using in any public copy.

## Willingness to pay

- **Category norms:** serious-lifter nutrition apps cluster at **$11.99–$14.99/mo and $71.99–$179.88/yr** [7][10][11].
- **The anchor that justifies premium pricing is the human coach, not other apps:** budget online coaching runs ~$99–$150/mo and typical contest/cut coaching $250–$500/mo [14]. Carbon's own value pitch is "reasonable if you would otherwise pay a human coach $100 or more per month" [11]. CUT does more of the coach's job (decides, not records), so the coach anchor is legitimately available to it — apps that only track can't credibly use it.
- **Platform economics:** Health & Fitness is the top-monetizing app category — highest install LTV ($1.20–$1.21), highest D14 revenue per install ($0.48 median), best download-to-paid conversion — and it is **the only category where annual plans dominate and are still growing share** [22][23]. High-priced H&F annual plans earn ~4.5× more per user than cheap ones; onboarding paywalls with trials convert best (1.78% install-to-paid avg); North American install-to-trial (14.5%) beats global (11.2%) [23]. This supports annual-first merchandising with a trial.
- **Caution flags:** median RLTV for H&F is $35.64/yr per payer [22] — most payers churn well before a full year, so ambitious per-payer revenue requires above-median retention; and the top ~10% of apps take ~93% of category revenue [23]. Willingness to pay exists; it is won by retention, not assumed.
- **No price is recommended here — pricing is an owner decision.** The evidence says only: trackers cap out ~$12–15/mo; coach-replacement framing is what unlocks more; annual-with-trial is the right merchandising shape [11][14][22][23].

## Where they hang out (channels, creators, publications)

Verified this session (view counts / activity as of 2026-07-12):

- **YouTube (primary watering hole):** Jeff Nippard (single 2025 video: 7.7M views; openly sponsored by MacroFactor — proof this exact audience converts to nutrition-app subscriptions) [15]; Renaissance Periodization / Dr. Mike Israetel (1.8M views on a training-science video; funnels to RP Hypertrophy app) [16].
- **Publications:** Stronger By Science (Greg Nuckols) — articles, diet guide, MASS research review; also the maker-marketing engine behind MacroFactor [18][19]. FeastGood-style review sites are where this audience comparison-shops apps [7][8][9].
- **Podcasts:** Stronger By Science Podcast, Iron Culture (presented by MASS), 3D Muscle Journey, RP Strength Podcast, Revive Stronger [19]. Ad reads on these shows are the proven acquisition motion (SBS pod carries MacroFactor trial codes in every episode) [19].
- Reddit communities (r/fitness, r/leangains, r/naturalbodybuilding etc.) are almost certainly significant but **could not be assessed** under this session's no-social-platform guardrail — route through the sanctioned social-listening path later.

GTM implication: this is a creator-endorsement market. The MacroFactor playbook (respected evidence-based creator + trial code) is documented working in the open [15][19].

## Message hooks the evidence supports

Language patterns lifted from sources (not invented quotes; paraphrase-tight):

- **"The plans work, but the app is painful."** — actual RP user review [19]. Hook: coaching direction without the 2018-era app experience.
- **"Adherence — not the diet — decides whether you finish."** — direct from RCT/consensus language [5]. Hook: CUT is built for the day you'd normally fall off.
- **"Stop guessing at the plateau."** The ecosystem's own words: "pointless calorie cuts," plateau "decision trees" [13][21]. Hook: when the scale stalls, CUT tells you whether to change anything — or just wait.
- **Anti-shame positioning:** research language — losing a streak leads to "avoidant behaviours… or complete disengagement" [6]; RP users describe "guilt" at check-in and discouraging red numbers [8]. Hook: one next action, never a wall of red.
- **"Finish the cut without giving up the muscle you built"** — the spec's core job, backed by the fat-free-mass literature [2] and mainstream muscle-loss anxiety [20]. (Keep claims capability-framed; no outcome guarantees — compliance rule.)
- **"A coach costs $250/month. An app that only counts calories isn't a coach."** — anchored by real coach pricing [14] and Carbon's own framing [11].
- **Against the field:** "another calorie tracker" fatigue is documented verbatim in MFP quit posts [9]. CUT's spec already bans positioning as a tracker — the evidence agrees.

## Sources

All accessed 2026-07-12 via Exa search excerpts (see limitations).

1. "Bulking and cutting" among a national sample of Canadian adolescents and young adults — Eating and Weight Disorders (2022). https://link.springer.com/article/10.1007/s40519-022-01470-y (also PMC9462603)
2. Achieving an Optimal Fat Loss Phase in Resistance-Trained Athletes: A Narrative Review — Nutrients/MDPI (2021). https://www.mdpi.com/2072-6643/13/9/3255
3. One in Four Americans Belonged to a Gym in 2024 — Health & Fitness Association (2025-04-07). https://www.healthandfitness.org/one-in-four-americans-belonged-to-a-gym-in-2024/
4. How 77 Million Fitness Members Work Out — HFA Expanded Insights (2025-10-30). https://www.healthandfitness.org/how-77-million-fitness-members-work-out-new-hfa-data-reveals-shifting-equipment-training-and-membership-trends/
5. Flexible vs. rigid dieting in resistance-trained individuals — JISSN RCT (2021). https://pmc.ncbi.nlm.nih.gov/articles/PMC8243453/
6. Emotional strain of fitness and calorie counting apps revealed — UCL News (2025-10-22), reporting BJHP paper DOI 10.1111/bjhp.70026. https://www.ucl.ac.uk/news/2025/oct/emotional-strain-fitness-and-calorie-counting-apps-revealed
7. MacroFactor vs RP Diet — FeastGood (2024-03-29). https://feastgood.com/macrofactor-vs-rp-diet/
8. RP Diet App Review (9+ weeks, fat-loss diet) — FeastGood (2023-03-06). https://feastgood.com/rp-diet-app-reviews/
9. MyFitnessPal Sucks, Here's Why — FeastGood (2024-03-21). https://feastgood.com/myfitnesspal-sucks/
10. MacroFactor official pricing/help pages. https://macrofactor.com/workouts/price/ and https://help.macrofactorapp.com/en/articles/394-how-macrofactor-subscriptions-and-bundles-work-workouts
11. Carbon Diet Coach Pricing 2026 — NutriScan blog (2026-02-07; **competitor vendor** — prices cross-checked) https://nutriscan.app/blog/posts/carbon-diet-coach-pricing-2026-plans-7a3d15e78c ; also MacroFactor vs Carbon — Nutrola (2026-04-06, competitor vendor) https://nutrola.app/en/blog/macrofactor-vs-carbon-diet-coach-which-is-better-2026
12. RP Diet Coach & Planner — review & guide, Calorie Tracker Guide. https://calorieappguide.com/apps/rp-diet
13. Why Progress Stalls: A Framework for Identifying Training and Nutrition Plateaus — The Bodybuilding Dietitians (2026-05-25). https://www.thebodybuildingdietitians.com/blog/why-progress-stalls-a-framework-for-identifying-training-and-nutrition-plateaus
14. Coach pricing pages: Wolf Coaching contest prep $500/mo, nutrition $250/mo (https://wolfcoaching.com/coaching/p/contest-prep); PhysiqueFX $125–150/mo (https://physiquefx.com/fuel-365-contest-prep/); Profection $350/mo (https://profectioncoaching.com/product/competition-prep-coaching/); Five Starr $199–249/mo (https://fivestarrphysique.com/contest-prep-coaching/); JJ's Legion "as low as $99/mo" (https://www.jjslegion.net/contest-prep/)
15. Jeff Nippard, "How Much Muscle Did I Gain In 365 Days?" — YouTube metadata (7.7M views; in-video MacroFactor sponsorship read). https://www.youtube.com/watch?v=PiYSbR2B85w
16. Renaissance Periodization, "Differences in Training for Strength vs Size" — YouTube metadata (1.8M views). https://www.youtube.com/watch?v=q76kTexj5EM
17. SFIA 2025 Topline Participation Report press release (2025-02-26): every strength-category activity grew in 2024. https://sfia.org/resources/sfias-topline-participation-report-shows-247-1-million-americans-were-active-in-2024/
18. Stronger By Science: Definitive Diet Setup Guide (https://www.strongerbyscience.com/diet/); Crash Dieting is Still a Bad Idea (2023) (https://www.strongerbyscience.com/crash-dieting/)
19. Podcasts + app-store reviews: SBS Podcast archive (https://www.strongerbyscience.com/podcast/); Iron Culture (https://podcasts.apple.com/us/podcast/iron-culture-presented-by-mass/id1452114380); 3DMJ Podcast (https://podcasts.apple.com/us/podcast/3d-muscle-journey/id1115048476); RP Diet Coach Google Play reviews (https://play.google.com/store/apps/details?id=com.rp.rpdiet&hl=en); RP Diet Coach iOS reviews via AppRecs (https://apprecs.com/ios/1330041267/rp-diet-coach-%26-planner)
20. 3 signs your diet is causing too much muscle loss — The Conversation (2024-07-11). https://theconversation.com/3-signs-your-diet-is-causing-too-much-muscle-loss-and-what-to-do-about-it-223865
21. Management of Weight Loss Plateau — StatPearls, NCBI Bookshelf (updated 2024). https://www.ncbi.nlm.nih.gov/books/NBK576400/
22. State of Subscription Apps 2026: Health & Fitness — RevenueCat (115k apps, $16B revenue; 2025 data). https://www.revenuecat.com/state-of-subscription-apps-2026-health-and-fitness/
23. In-app subscription benchmarks for Health & Fitness apps — Adapty (2026-03-27; 16k apps, $3B revenue) https://adapty.io/blog/health-fitness-app-subscription-benchmarks/ and full report https://adapty.io/state-of-in-app-subscriptions-report/

## Open questions (needs primary research / user interviews)

1. **Price sensitivity at premium vs the $12–15 tracker anchor** — run Van Westendorp or paywall A/B with real trial users; the coach-anchor story is plausible but untested for CUT specifically.
2. **Reddit/forum voice-of-customer** — r/naturalbodybuilding, r/fitness, r/MacroFactor complaint threads couldn't be read under this session's guardrails; run via the sanctioned social-listening path before writing ad copy.
3. **How repeat cutters actually describe the moment they quit a cut** (exact words, exact trigger day) — needed for hooks; current evidence is app-generic, not cut-specific.
4. **Whether "one next action" reads as relief or as loss of control** to data-loving MacroFactor-type users — a real positioning risk to test in 5–10 interviews.
5. **GLP-1 lifter segment size and fit** — thin evidence here; could be a large adjacent wedge or a distraction.
6. **Female cutter messaging** — 21% of young women cycle bulk/cut [1]; product isn't gender-locked, but no evidence yet on how messaging should differ post-launch-wedge.
7. **Churn math**: what week-by-week retention does CUT need per payer-year vs the category's $35.64 median RLTV [22] — model before committing spend.
