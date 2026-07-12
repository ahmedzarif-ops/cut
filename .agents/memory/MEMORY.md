# CUT OS — Agent Memory Index

- [Orval + Zod codegen](orval-zod-codegen.md) — `format: uuid` in openapi makes orval emit `z.uuid()` (zod v4) which fails on zod 3.x; strip it.
- [Expo → api-server routing](expo-api-routing.md) — mobile API base URL = `https://$REPLIT_DEV_DOMAIN`; api-server exposed at `/api` via proxy; openapi server prefix is `/api`; expo web is a separate cross-origin domain (needs CORS).
- [Clerk Expo token getter](clerk-expo-token-getter.md) — wrap `getToken()` in try/catch + timeout race, or a rejected/hung token fetch silently kills the request and spins the UI forever.
