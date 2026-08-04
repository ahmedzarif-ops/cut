# CUT OS — working App Store screenshot story

**Status:** Working copy only; owner and exact-build review required.

The first three screenshots should communicate CUT OS's shipped value without
requiring a user to read the full listing. Use this sequence for the initial
English (U.S.) product page. The bold phrases are internal story labels for
capture review, not text overlays:

1. `01-today-next-action` — **One clear next step each day**
2. `03-balanced-options` — **Six balanced meal options**
3. `04-meal-preview` — **See estimated macros before you log**
4. `05-today-nutrition-logged` — **Review today's nutrition totals**
5. `06-logged-meal-controls` — **Adjust or delete logged meals**
6. `07-subscription-offer` — **Paid access uses an auto-renewable Apple subscription**

The subscription-offer screen is part of the public listing selection, not only
App Review evidence. Its exact-build capture must show an unmistakable paid or
subscription cue and the StoreKit-localized offer details; do not imply that all
features are free or type a price into a derived caption. The manifest therefore
classifies shot 07 as `listing_candidate_and_in_app_purchase_review_evidence`.

The 1.0 listing uses the raw screenshots from the exact signed build recorded
in `app-store/screenshots/manifest.json`; it does not use derived captioned
assets. This keeps the public upload identical to the checksum- and PII-reviewed
evidence file. Do not add mock data, device chrome, feature claims, or health
outcomes that are absent from the captured binary. A future captioned-asset
workflow requires a separate validated file/hash/PII record before use.
