# CUT OS — working App Store screenshot story

**Status:** Working copy only; owner and exact-build review required.

The initial English (U.S.) launch selection uses the smallest truthful story:
one core-use screenshot and one paid-offer screenshot. The bold phrases are
internal capture-review labels, not text overlays:

1. `01-today-next-action` — **One clear next step each day**
2. `07-subscription-offer` — **Paid access uses an auto-renewable Apple subscription**

If exact-build marketing assets are ready without delaying submission, shots
03 through 06 may be added later in their manifest order. They remain optional.

The subscription-offer screen is part of the public listing selection, not only
App Review evidence. Its exact-build capture must show an unmistakable paid or
subscription cue and the StoreKit-localized offer details; do not imply that all
features are free or type a price into a derived caption. The manifest therefore
classifies shot 07 as `listing_candidate_and_in_app_purchase_review_evidence`.

The 1.0 listing uses visually raw screenshots from the exact signed build
recorded in `app-store/screenshots/manifest.json`; it does not use derived
captioned assets. The controlled preparation command documented in
`app-store/README.md` re-encodes decoded RGB pixels to remove unknown metadata
and may strip an alpha channel only after proving every alpha sample is 255. It
then proves the output's decoded RGB pixels are unchanged. Retain the original
capture and preparation report in controlled evidence. The public upload
remains identical to the prepared file bound by the manifest checksum and PII
review. Do not add mock data, device chrome, feature claims, or health outcomes
that are absent from the captured binary. A future captioned-asset workflow
requires a separate validated file/hash/PII record before use.
