# CUT OS — Agent Memory Index

- [Orval + Zod codegen](orval-zod-codegen.md) — RESOLVED (P1-9): workspace is on zod 4, so `format: uuid` is correct and emits `z.uuid()`. Do NOT strip it. `pnpm run codegen` after openapi edits; build gate has a drift check.
- [Expo → api-server routing](expo-api-routing.md) — mobile API base URL = `https://$REPLIT_DEV_DOMAIN`; api-server exposed at `/api` via proxy; openapi server prefix is `/api`; expo web is a separate cross-origin domain (needs CORS).
- [Clerk Expo token getter](clerk-expo-token-getter.md) — wrap `getToken()` in try/catch + timeout race, or a rejected/hung token fetch silently kills the request and spins the UI forever.
