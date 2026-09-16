# Food photo analysis — proposed privacy notice addition

Status: DRAFT. Not published. No legal/professional approval claimed. Existing
signed publication hashes and live policy have not been changed.

## Proposed Privacy Policy section

### Optional AI food features

CUT OS Pro can estimate food in a photo. You choose whether to use this feature.
Before a photo leaves your device, the app shows the photo and asks you to send
it for analysis. Avoid faces, documents, and other private information.

When you confirm, CUT receives the photo and sends it to OpenAI to estimate food,
serving size, calories, and nutrients. CUT removes JPEG application metadata
(including EXIF metadata) before sending the image to OpenAI. CUT does not send
your email, date of birth, account identifier, or saved health history with the
photo-analysis request. CUT does not save the photo in its server database or
application logs. OpenAI processes the image under its applicable API data
policies; disabling response storage is not a promise of zero provider retention.
See https://platform.openai.com/docs/guides/your-data and
https://openai.com/policies/privacy-policy/.

Photo results are estimates, not measurements, medical advice, or allergy and
food-safety checks. You review and can edit the result before saving. Only food
and nutrition values that you choose to save enter your diary and optional saved
foods. Their retention and deletion follow the account-data provisions above.

CUT also offers optional AI meal creation. It sends the request and the minimum
enabled food preferences, confirmed meals, and targets needed for that feature
to its AI provider, not your email or birth date. The app explains this before
you request a meal. You review drafts before logging them.

To enforce the included AI allowance, CUT records request counts and token/cost
usage against an internal account identifier. Photos and meal creation share the
same daily and monthly allowance. Manual logging and barcode lookup do not use
that allowance.

## Release conditions

- Owner approval of this notice before publishing a changed legal page; regenerate
  exact rendered-page approval hashes only after approval.
- Reconcile App Store privacy answers against transient photo processing and
  provider retention before App Review submission; do not claim zero retention.
- Real-device Pro photo capture/estimate/edit/save test and free-user denial test.
- Live CUT-only provider smoke test: do not use private owner photos without
  explicit consent for that test.
- Deploy server before the matching TestFlight build. No schema migration needed.
- Keep existing shared OpenAI account limits and the Replit $20/month ceiling.
