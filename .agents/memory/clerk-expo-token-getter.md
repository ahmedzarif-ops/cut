---
name: Clerk Expo token getter
description: The auth-token getter that attaches Clerk bearer tokens to API requests must be defensive.
---

The function passed to `setAuthTokenGetter(...)` (which the shared fetch mutator awaits before every request) must wrap `getToken()` from `@clerk/expo` `useAuth()` in a `try/catch` **and** race it against a timeout that resolves to `null`.

**Why:** The fetch mutator does `await _authTokenGetter()` *before* calling `fetch`. If `getToken()` rejects, the mutator throws before any request is sent — the request never reaches the server and react-query retries, so the screen shows an infinite loading spinner with no network activity (very confusing: server logs show zero requests). If `getToken()` hangs, the spinner lasts forever. This bit us on the first authed round-trip: `/today` spun on `useGetMe()`/`useGetMyProfile()` and the api-server logged no `/api/me` calls at all.

**How to apply:** Getter shape: `async () => { try { return await Promise.race([getToken(), new Promise(r => setTimeout(() => r(null), 5000))]); } catch { return null; } }`. Register/unregister it in a `useEffect` keyed on `getToken`. Verify the full flow with the testing skill using `testClerkAuth: true` (programmatic sign-in). Note: programmatic test users may have no email claim, so email-derived UI (e.g. a greeting) falls back to a default — cosmetic only.

**Resolve `null` on timeout, do NOT throw.** An architect review suggested throwing on timeout (so react-query retries with a real token) instead of the "silent null". Tried it — it *regressed*: when `getToken()` hangs, throwing sends the query into a retry loop that did not recover within the load window (Today stuck on a spinner, `meQuery` never resolved). Returning `null` is correct: the request fires unauthenticated, the server returns 401, customFetch turns that into an `ApiError` that react-query retries and that mutations surface via their `catch` — so a failed token is **not** silent. Keep the timeout ~5s (short enough that a normal <1s fetch never false-times-out, short enough that null→401→retry recovers well within a ~10s window).

**Gate onboarding on `users.onboardingComplete`, not on profile-fetch absence.** Deciding "needs onboarding" from `!profileQuery.data` treats any transient profile error (or a first-fetch 401 from the token race) as "no profile" and shows the setup card to a user who has one. Instead: render off `meQuery` (`isLoading` → spinner; `isError`/no data → retry card; `!me.onboardingComplete` → setup; else plan). Fetch the profile only when `onboardingComplete === true` (`enabled`), and set its `retry` to skip 404 (a missing profile is a valid state) but retry other errors.
