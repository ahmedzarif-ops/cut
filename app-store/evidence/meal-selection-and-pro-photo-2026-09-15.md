# Direct meal selection and Pro photo analysis

Owner requested both fixes together before launch after reviewing Build 11.

## Local changes

- Preserve a tapped meal template through catalog loading; do not replace it
  with the first catalog item. Show the selected meal's serving controls directly,
  without the full catalog/log history above it. Explicit change-meal action.
- Replace photo placeholder with Pro-only capture, separate transfer consent,
  estimate review, and editable food-entry flow. No automatic diary writes.
- Server checks authenticated adult/account access and live Pro entitlement.
  Bound JPEG upload, remove application/comment metadata before OpenAI transfer,
  `store:false`, low image detail, bounded output, 15-second provider timeout.
- Reuse current Luna configuration and the exact existing shared daily/monthly
  AI reservation ledger. No key/account/budget/hosting changes or migration.
- No provider call on disabled configuration or exhausted allowance; unknown
  failed calls consume their conservative reservation. Client request cancellation
  and principal/entitlement checks suppress stale output. Provider errors/photo
  payloads are not serialized to logs or returned errors.
- Saved serving description preserves "Photo estimate" provenance.

## Verification

- Mobile suite: 479 tests / 43 files passed after formatting.
- Full API suite: 601 tests / 37 files passed. Subsequently added one route
  validation test; all 12 meal-route tests passed, including 401, 400 and 413.
- Pro boundary test verifies photo endpoint returns 402 for free users.
- TypeScript passed for mobile, API and generated shared libraries.
- API production bundle succeeded. iOS Hermes export succeeded at
  `/tmp/cut-photo-ios-export.72llWz` (not a signed build or installed-app test).
- Frozen lockfile install passed; only an already-resolved Expo file-system
  dependency was added explicitly. No broad dependency upgrades retained.
- `git diff --check` passed.

## Not yet verified / release gates

- No real OpenAI photo request performed; provider tests use controlled mocks.
- No live Replit deploy, EAS signed build, TestFlight upload or Apple release.
- Native rendered UI/camera not tested: current xcode-select points to Command
  Line Tools and `xcrun simctl` is unavailable. Do not call the export native QA.
- Privacy addition is DRAFT pending owner confirmation. Existing legal-page
  hashes and published pages unchanged. No professional approval claimed.
- Reconcile Apple privacy answers with photo transfer/provider retention, then
  deploy server before the new client. Verify a real Pro photo and free denial,
  exact selected-meal logging, and sign-out/sign-in on a phone before review.

Sources: https://developers.openai.com/api/docs/guides/images-vision and
https://developers.openai.com/api/docs/guides/your-data (checked September 15).
