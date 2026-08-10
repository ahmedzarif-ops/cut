# Local authenticated-session refresh candidate — August 10, 2026

**Observed at:** `2026-08-10T23:00:44Z`

**Boundary:** This is a locally signed iOS Simulator result. It is not an EAS
production build, Apple-signed archive, TestFlight installation, purchase,
restore, physical-device result, App Review submission, or release approval.

## Release finding

App Store Connect build 3 remains a valid processed Apple build and remains
assigned to the internal group and version draft. It was built from commit
`08e62232db7f81047eec5b55a184f30fb7d4162a`, which predates the authenticated
session refresh repair below. Build 3 is therefore retained as historical Apple
processing and assignment evidence but is ineligible as the release candidate.
A fresh production build is required after the repair is committed and its
exact commit passes CI.

## Repair under test

The candidate keeps the existing single-flight token coordinator and one safe
GET replay after an HTTP 401. Before the forced cache-bypassing token read, it
now clears only Clerk's active-session cache and touches that same session to
refresh its server-backed client state. Parallel forced reads share one
preparation and one provider token read. If the session touch fails, the normal
Clerk cache-bypassing token read still runs. Tokens remain in memory only and
are not decoded, persisted, printed, or recorded.

## Local acceptance sequence

An EAS-production-environment arm64 Release simulator build was signed with
Xcode **Sign to Run Locally** and installed over the existing dedicated recovery
simulator without uninstalling or clearing its authenticated account state.
No password, verification code, date of birth, receipt, or account identifier
was entered or recorded.

The same preserved account:

1. opened the real CUT OS Pro Monthly `$4.99 per month` screen ten seconds
   after launch;
2. remained on that screen beyond the one-minute bearer-token lifetime; and
3. after the app was terminated and cold-launched beyond that lifetime,
   returned to the same paywall instead of `Account check needed`.

The final app process remained alive. A bounded process-log scan found no fatal
line, crash, uncaught exception, or termination reason. The scan deliberately
recorded no request body, response body, token, user identifier, or personal
data.

The three ephemeral screenshots remain only in `/tmp` and are not durable
release assets:

| Checkpoint                   | Local file                                         | SHA-256                                                            |
| ---------------------------- | -------------------------------------------------- | ------------------------------------------------------------------ |
| Initial authenticated screen | `/tmp/cut-session-touch-after10s.png`              | `dab813958c4639bde218565b83d50b40f9e9650d613cedab5e84e36f3dadf360` |
| Beyond token lifetime        | `/tmp/cut-session-touch-after65s.png`              | `79ad1f66468eeb079cf64974207b00434e605a3c96fe3a0bf747a323b3a44cca` |
| Cold relaunch after expiry   | `/tmp/cut-session-touch-relaunch-after-expiry.png` | `6a2b7edfd26a4a7b4b909aad259d5a6075c742113177159f76dde8b66b9fcf7f` |

## Automated verification

- complete mobile suite: 39 files, 462 tests passed;
- App Store and screenshot suite: 64 tests passed;
- working App Store validator: passed;
- full repository TypeScript check: passed with the pinned Node and pnpm
  runtime; and
- `git diff --check`: passed.

The next eligible release candidate must be built from the committed repair,
processed by Apple, assigned to internal TestFlight, and exercised on the exact
physical-iPhone binary. This evidence does not authorize a paid EAS build,
subscription-review screenshot upload, App Review submission, external beta,
or public release.
