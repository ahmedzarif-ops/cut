# Build 11 Settings sign out

Owner approved the sign-out fix, push, and TestFlight upload on September 15.

## Change and checks
- Adds a separate Settings Account card with an accessible Sign out button, busy state, duplicate-press lock, and retryable error.
- Uses the existing tested `runSignOutWithFeedback` helper. Ends only the captured current Clerk session and clears local query memory. Does not call account deletion, remove recovery markers, cancel a subscription, or mutate saved server records.
- Available independently of free/Pro entitlement and StoreKit availability.
- Mobile test suite: 474 tests passed across 41 files. TypeScript passed after correcting the Node URL import in the new contract test. Existing interaction tests cover failures and duplicate presses; new source-contract tests cover Settings wiring and absence of deletion calls.
- Native rendered interaction and sign-in-again data persistence are not yet verified. Owner phone testing remains required; automated tests are not claimed as device proof.

## Release scope
- No backend deployment, migration, auth-provider setting, price, or AI limit change.
- Existing production EAS profile and signing credentials; upload to TestFlight only, not final App Review submission or public release.
- If sign out, sign in, or startup fails in phone QA, keep Build 10 as the candidate and do not submit Build 11 for public review.
- Subscription review screenshot was already saved and its product added to the review draft on September 9.
