# CUT API server

## Single production listener

The API bundle is the sole production HTTP process. One platform-provided
`PORT` serves the existing `/api` routes and `/api/__clerk` proxy first, then
the source-controlled `/`, `/privacy`, `/terms`, `/support`, `/legal.css`, and
`/status` public surface. The production build packages the exact legal
templates beside the bundle. `PUBLIC_APP_ORIGIN` must exactly equal the one
canonical `CORS_ALLOWED_ORIGINS`; a missing, invalid, or split origin fails
startup before traffic. Production `BASE_PATH` must be absent, empty, or `/`;
mounted paths are rejected because every surface shares the root ingress.

Use `pnpm run build:production` and `pnpm run start:production` from the
workspace root. `pnpm run dry-run:production` builds and checks the combined
artifact with production-only configuration gates on an ephemeral loopback port
without provider calls or publishing. The check also proves the packaged legal
templates exist; production never falls back to templates in the source tree.

## Graceful shutdown

The API drains HTTP requests, stops the account-deletion worker, and closes the
database pool on `SIGTERM` or `SIGINT`. `SHUTDOWN_TIMEOUT_MS` is optional and
defaults to 10 seconds. An override must be a canonical integer from 1 through
60,000 milliseconds. Invalid, fractional, whitespace-padded, negative, or
oversized values fail startup without echoing the supplied value.
