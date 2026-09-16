# Expo/EAS live read-only evidence — 2026-08-05 UTC

Status: **authenticated project verified; signing credentials absent**

Evidence updated at `2026-08-05T04:17:46Z` after the owner approved a one-time
Expo CLI browser login and read-only EAS checks.

## Verified state

- Browser confirmation completed for the existing Expo account without entering
  a password, one-time code, or recovery credential into the repository or
  chat.
- `eas whoami` succeeded.
- `eas project:info` resolved the checked-in app configuration to
  `@zee-digipit/cut`, project ID
  `4851dda2-d27b-4756-8099-18f0cb7d257c`.
- The read-only iOS build list returned zero builds.
- The production-profile credentials view resolved bundle identifier
  `com.zarifahmed.cut` and reported **No credentials set up yet**.
- The Apple-account login prompt was declined. No Apple credential, signing
  certificate, provisioning profile, push key, App Store Connect key, or local
  `credentials.json` was created, uploaded, downloaded, changed, or deleted.
- The credentials menu was exited without selecting a mutation path.
- Checks used the source-pinned `eas-cli/21.4.0` with pnpm `10.34.5`.

## Security boundary

The local Expo authentication token is managed by the Expo CLI outside source.
No token, session value, password, verification code, Apple credential, or
credential identifier is recorded here.

## Remaining gate

An exact signed iOS/TestFlight build cannot start until the owner separately
authorizes Apple account authentication inside EAS and the creation or reuse of
the minimum required signing certificate and provisioning profile. That action
must not create RevenueCat's optional App Store Connect API sync credential or
upload an Apple `.p8` key to RevenueCat.
