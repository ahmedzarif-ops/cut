---
name: Expo → api-server routing
description: How the CUT OS Expo app reaches the shared Express api-server in the Replit workspace.
---

The Expo client points the generated API client at the **main dev domain**, not the expo domain:
`setBaseUrl("https://" + process.env.EXPO_PUBLIC_DOMAIN)` where `EXPO_PUBLIC_DOMAIN=$REPLIT_DEV_DOMAIN` (set in the cut-os dev script). `EXPO_PUBLIC_*` vars are inlined by Metro at bundle time.

**Why:** The api-server artifact is exposed through the workspace proxy at path prefix `/api` (its `.replit-artifact/artifact.toml` has `paths=["/api"]` → localPort 8080, and the server mounts routes under `/api`). The OpenAPI `servers.url` is `/api`, so the generated client requests `${baseUrl}/api/...`. The Expo **web** build is served from a *separate* domain (`$REPLIT_EXPO_DEV_DOMAIN`, i.e. `*.expo.janeway…`), so calls to the api-server are cross-origin — the server needs `cors({ origin: true, credentials: true })` and must answer preflight (verified: OPTIONS → 204). Native builds have no origin, so an absolute base URL is required regardless.

**How to apply:** Debug reachability with `curl https://$REPLIT_DEV_DOMAIN/api/healthz` (200 = proxy + server OK). If the mobile app can't reach the API, first confirm `EXPO_PUBLIC_DOMAIN` is inlined (log it at module load) and that the base URL is the main domain, not the expo domain. A relative path (`/api/...`) with no base URL hits the Expo dev server and 404s.
