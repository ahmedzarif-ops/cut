# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

## Users

CUT OS is for adults age 18 and older who are cutting body fat or recomposing while trying to preserve or build muscle. They need to log food, body weight, and training repeatedly throughout the day without interrupting real life.

## Product Purpose

CUT OS makes the daily cutting loop fast and understandable: see what remains, log what happened, and understand whether nutrition, weight, and training are moving together. Success means a new user can get useful value for free, complete the common logging tasks in seconds, and choose Pro because it saves time or adds deeper guidance.

## Positioning

CUT OS is focused on the decisions that matter during a cut or recomp, rather than acting as a general wellness content feed. It brings nutrition, weight trend, and strength training into one daily operating view.

## Operating Context

- iPhone is the primary device.
- People use the app in short sessions at meals, in a grocery store, at the gym, and during a weigh-in.
- Core destinations are Today, Food, Training, and Progress, with a persistent quick-add action.
- Food logging must support search, recent items, saved foods and meals, manual entry, and barcode scanning. A photo-based estimate must always be reviewable and editable before it is logged.
- Navigation must preserve a predictable back path and the state of the task being completed.

## Capabilities and Constraints

- Free core: account, onboarding, daily targets, food diary, manual/custom food, barcode lookup, a versioned USDA-linked food library, a substantial Desi-inclusive meal catalog, body-weight logging and trends, workout logging, and basic daily summaries.
- CUT Pro: $4.99 per month, no trial, with time-saving or higher-compute features such as photo meal estimation, adaptive meal fits, on-the-fly meal variations, and deeper progress insights. The free app must never be blocked by the subscription screen.
- Current commercial scope is U.S.-only with Family Sharing off.
- Health and nutrition output must be framed as tracking and estimates, not diagnosis or treatment.
- Photo estimates are not exact. The person confirms foods, portions, calories, and macros before saving.
- The AI provider and its operating-spend ceiling remain an open decision. No paid API may be provisioned or enabled silently. The launch adapter is OFF by default and uses a deterministic catalog fallback.
- AI personalization may use only the minimum confirmed data needed for the requested result: explicit food preferences, confirmed diary entries, chosen targets, and the person's current request. It must not infer allergies, diagnoses, religion, or identity. Generated meals and photo estimates are drafts until the person reviews them; nothing is auto-logged.
- “Learning” means the person can see and reset saved preferences and recommendation history. A disliked or corrected suggestion must improve ranking without turning a one-time log into a permanent preference.
- The launch data model keeps the reviewed global food and meal catalog versioned in source. The private account database stores only explicit nutrition preferences, up to 100 saved food snapshots, direct meal feedback, confirmed diary history, user-entered workout sessions, and daily AI request/token counts. It never stores AI prompts or generated drafts by default. Strength sessions retain ordered exercises, sets, reps, and optional load; cardio retains optional distance and calories with a required duration. Account deletion cascades through all of it.
- The deterministic Pro ranker remains available when no LLM is configured. It can use today's remaining calorie and protein targets, explicit cuisine and diet choices, direct feedback, and confirmed catalog logs, then explain the fit and suggest a bounded serving amount.
- Premium “Make me a meal” requests can use the approved LLM only to choose stable food IDs, gram amounts, and preparation steps from the filtered CUT catalog. CUT calculates nutrition itself, rejects invalid ingredient choices, limits requests per user/day, uses stateless API calls, and always requires review before logging.
- App Review submission and public release remain owner-gated.

## Brand Commitments

- Product name: CUT OS.
- Brand character: precise, focused, calm, and direct.
- Existing electric-blue identity remains recognizable. Brand expression must not override familiar iOS navigation and controls.
- Visible copy uses plain, concrete language.

## Evidence on Hand

- A real TestFlight walkthrough: `/Users/guest1/Downloads/ScreenRecording_09-03-2026 23-59-42_1.MP4`.
- Existing app implementation under `app/`, existing API under `../api-server/`, and current design tokens in `constants/colors.ts`.
- The walkthrough shows the present navigation, food-list, customization, and midnight day-boundary failures. It is product evidence, not a style reference.
- Current Mobbin references include Yazio Diary, MyFitnessPal Diary Log and Add Food, MacroFactor Scan, Cal AI Log Food, Noom food capture, and weight-trend screens from Noom, Withings, and Bevel.
- No public customer testimonials, retention benchmarks, outcome claims, or photo-estimation accuracy benchmark is established. Future work must not invent them.

## Product Principles

1. The common action is always one tap away.
2. Free earns the habit; Pro saves time and deepens the insight.
3. Show the number, its meaning, and the next useful action together.
4. Suggestions accelerate logging but never limit what can be logged.
5. Estimates remain editable and honest about uncertainty.
6. Free provides a complete tracking loop; Pro earns payment through speed, adaptation, and higher-compute assistance.

## Accessibility & Inclusion

- Support VoiceOver labels, Dynamic Type, Reduce Motion, Dark Mode, and increased contrast.
- Every touch target is at least 44 by 44 points.
- Do not use color as the only signal of status or progress.
