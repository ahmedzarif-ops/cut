# CUT OS — live launch state, read-only refresh

**Observed at:** `2026-09-04T09:44:33Z`

**Method:** Authenticated, read-only App Store Connect browser inspection;
authenticated EAS CLI build listing; GitHub CLI and remote-ref inspection; and
bounded public production probes. No Apple, Expo, GitHub, Replit, RevenueCat,
Clerk, DNS, email, pricing, submission, release, or credential state was
changed.

## Apple and TestFlight

- CUT OS App Store Connect app ID remains `6798020879`.
- Version 1.0.0 remains **Prepare for Submission**, manual release remains
  selected, and build 4 remains the version's selected build.
- The 6.5-inch iPhone screenshot region reports `0 of 10 Screenshots`.
- App Review username, password, contact, notes, and attachment fields remain
  empty in the version form.
- Build 5 is **Ready to Submit** under App Store Connect build ID
  `8b59459f-ff7e-40a6-8db5-2439be1dd643`. It is assigned to `CUT OS Internal
  QA`, which now contains builds 3, 4, and 5 and still has one internal tester.
  Apple displays one invite for build 5. Installs, sessions, crashes, and
  feedback each display a dash, so there is **NO CURRENT READING** for those
  fields rather than a verified zero.
- EAS reports build 5 `FINISHED`, EAS ID
  `be50e881-c04e-4710-9a28-e218cc6f2e38`, version 1.0.0 build 5, from Git commit
  `b4871b864c01f196b0cf8e4780b492c4b2b8e18b`. This is old product source and
  is not the redesigned database-catalog candidate.
- The CUT OS Pro subscription group and monthly product remain **Prepare for
  Submission**. Product ID is `com.zarifahmed.cut.pro.monthly`, duration is one
  month, availability is 1 of 175 countries or regions, Family Sharing is off,
  and the required subscription review screenshot is empty.
- Apple's live subscription description remains `Weigh-ins, balanced meals &
  nutrition totals.` and its saved Review Notes describe the older paid-first
  experience. The new free-versus-Pro product makes that copy stale. Local
  release source therefore selects `Adaptive meal fits and on-demand meal
  drafts.` and a replacement credential-free Review Notes draft, while leaving
  the live Apple record untouched pending explicit approval.

## GitHub and production

- Remote branch `origin/codex/app-store-v1` remains at
  `b4871b864c01f196b0cf8e4780b492c4b2b8e18b`.
- Draft PR #9 is open with merge state `CLEAN`; the `verify` and `Release
  evidence boundary` checks both report `SUCCESS` for that remote head. Those
  checks do not cover the newer local candidate.
- `https://getcutos.com/status` returns status `ok` with build SHA
  `08e62232db7f81047eec5b55a184f30fb7d4162a`.
- `https://getcutos.com/api/readyz` returns status `ok`.
- `/privacy`, `/terms`, and `/support` each return HTTP 200.
- The current Chrome session was not authenticated to Replit, so the
  development-data-copy control was **NOT RECHECKED** in this refresh. It must
  still be rechecked as off immediately before any approved publish.

## Current release consequence

Do not submit builds 3, 4, or 5. The next eligible build must come from the
newly committed, pushed, CI-green database-catalog candidate after its approved
production migration and deployment. It must then complete exact-build
TestFlight purchase, restore, free-feature, subscription, screenshot,
accessibility, authentication, deletion, and review-account evidence before App
Review submission.
