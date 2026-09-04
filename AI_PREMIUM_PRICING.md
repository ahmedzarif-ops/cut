# CUT OS AI and premium pricing decision

**Status:** Owner-approved launch controls. Production activation remains
conditional on passing the server ledger and provider-account budget checks.

**Updated:** September 4, 2026

## Launch offer

Keep the approved launch structure simple:

- **App download:** Free.
- **CUT OS Free:** all food, weight, training, and progress logging; the full
  99-food library; all 89 fixed meals; supported barcode lookup; custom and
  saved foods; nutrition totals; and basic progress views.
- **CUT OS Pro Monthly:** **$4.99/month**, no trial, with adaptive meal fits and
  up to **five AI meal-creation requests per UTC day**. A failed, limited, or
  unavailable AI request falls back to the private fixed-meal catalog and does
  not remove the rest of Pro.
- **Photo meal estimation:** Pro-only when it is actually built, disclosed,
  safety-reviewed, metered, and verified. It is not part of the current launch
  claim. Start with at most three photo analyses per day and adjust only after
  real token and retention data exists.

The free tier should remain genuinely useful. Pro sells saved time,
personalization, and adaptive convenience rather than putting basic tracking
behind a paywall.

## Model recommendation

Use `gpt-5.6-luna` with low reasoning for the bounded text meal-creation task,
not Terra. CUT supplies a closed list of food IDs, a strict JSON schema, and
server-side nutrition math, so this is a cost-sensitive structured-generation
job rather than open-ended expert reasoning.

Current official OpenAI pricing lists Luna at $0.20 per million input tokens and
$1.20 per million output tokens, while Terra is $2.00 and $12.00 respectively:

- https://developers.openai.com/api/docs/models/gpt-5.6-luna
- https://developers.openai.com/api/docs/models

Luna supports the Responses API, image input, reasoning controls, and structured
outputs. The source adapter remains disabled unless an owner-approved key,
spend limit, exact Luna model, and daily quota are all configured.

## Conservative unit economics

For planning, assume one meal request uses at most 6,000 input tokens and all
1,600 allowed output tokens:

`(6,000 × $0.20 / 1,000,000) + (1,600 × $1.20 / 1,000,000) = $0.00312`

At five requests every day for 30 days, that is about **$0.47 per fully active
subscriber per month**. The same conservative workload on Terra would be about
**$4.68 per subscriber per month**, before Apple commission, hosting, support,
or tax, so Terra is not the launch default.

At $4.99, Apple proceeds would be about $3.49 after a 30% commission or $4.24
after a 15% commission. CUT must not assume which rate applies until the account
is verified. Under the conservative Luna maximum, text AI would consume about
13% of the lower $3.49 proceeds. Real usage should be lower, but production
metering—not this estimate—must decide future limits.

## Next pricing step

Launch the already-approved monthly product first. After at least two weeks of
real retention, conversion, AI-use, refund, and support data, consider an annual
product at **$39.99/year**. That is a separate App Store product and financial
decision requiring owner approval; it is not authorized or created here.

Do not offer unlimited AI. Keep these controls:

- five text meal requests per subscriber per UTC day;
- a **$1.00 estimated model-cost ceiling per subscriber per calendar month**;
- a **$10.00 total provider-account ceiling for the first private beta**;
- prompt/response content excluded from the usage ledger;
- server-side food-ID validation and nutrition calculation;
- no auto-logging of generated drafts;
- deterministic fixed-catalog fallback during limits or provider failure.

The owner accepted these ceilings and authorized bounded production activation
on September 4, 2026. The server reserves the maximum bounded Luna call cost
before dispatch, settles it from returned token usage, and conservatively
charges the reservation after an uncertain provider failure. The provider
account must remain bounded to $10 before the production key is enabled. A
limit reached returns the fixed catalog without removing the rest of Pro.

Review the price or quota when AI cost exceeds 15% of net subscription proceeds,
the median Pro user regularly reaches the cap, or conversion and retention show
that a different bundle would materially improve the product.

## Market reference, not a parity claim

Current U.S. App Store listings show materially higher pricing for mature
competitors: MacroFactor lists $11.99 monthly/$71.99 annual, MyFitnessPal lists
monthly purchases up to $19.99 and annual purchases at $79.99, and RP Diet
Coach lists a $14.99 monthly purchase. CUT's $4.99 entry price is intentionally
lower while its library, review record, and coaching depth are still growing.

- https://apps.apple.com/us/app/macrofactor-macro-tracker/id1553503471
- https://apps.apple.com/us/app/myfitnesspal-calorie-counter/id341232718
- https://apps.apple.com/us/app/rp-diet-coach-planner/id1330041267
