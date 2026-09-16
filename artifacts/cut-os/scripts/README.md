# CUT OS build scripts

`build-production.mjs` validates the exact zero-JavaScript launch/legal handler
used by the Replit production artifact. It does not start Metro or generate a
`static-build` directory. The native App Store bundle is built separately with
EAS.

`build.js` remains available as the explicit `build:preview` command for the
legacy static Expo preview. Its Metro child process receives a minimal
environment from `build-environment.js`, not the server process's full
environment.

The allowlist contains only the operating-system and JavaScript tooling values
Metro needs plus the reviewed `EXPO_PUBLIC_*` runtime settings used by CUT OS.
Database URLs, Clerk and RevenueCat secret keys, signing credentials, provider
credentials, and names containing secret, token, password, credentials,
private-key, or signing-key markers never enter Metro. The build reports that
the allowlist was configured but does not print copied or rejected values.
`EXPO_NO_DOTENV=1` is forced for the child so an unreviewed local `.env` file
cannot refill it after the allowlist has been built.

Every `EXPO_PUBLIC_*` value is bundled into client JavaScript and must be safe
for anyone to read. Additions therefore require an explicit update to
`PUBLIC_BUILD_VARIABLES` and its focused tests.

The production public server never serves the preview manifests or assets and
does not require them to exist. Preview mode still refuses to start without a
readable static build so a missing or partial preview cannot report healthy.
