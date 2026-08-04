# CUT API server

## Graceful shutdown

The API drains HTTP requests, stops the account-deletion worker, and closes the
database pool on `SIGTERM` or `SIGINT`. `SHUTDOWN_TIMEOUT_MS` is optional and
defaults to 10 seconds. An override must be a canonical integer from 1 through
60,000 milliseconds. Invalid, fractional, whitespace-padded, negative, or
oversized values fail startup without echoing the supplied value.
