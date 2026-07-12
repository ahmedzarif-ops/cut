#!/usr/bin/env bash
# Tool 1/5 — public logged-out web read via r.jina.ai.
# Pinned reader host, no cookies/auth ever, denylist-guarded, time/size-bounded.
#
# Usage:  webread.sh <public-url>
# Example: webread.sh https://www.example.com/blog/post
#
# Returns the readable text of the page on stdout. r.jina.ai fetches the page
# server-side and returns clean markdown-ish text — we pass ONLY the target URL,
# never a cookie, header, or auth token, so it is always a logged-out read.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=guard.sh
source "$SCRIPT_DIR/guard.sh"

URL="${1:-}"
if [ -z "$URL" ]; then
  echo "usage: webread.sh <public-url>" >&2
  exit 2
fi

# Enforce the logged-out + no-social boundary before any network call.
wr_assert_public_url "$URL" || exit $?

# Pinned host (r.jina.ai). No -b/--cookie, no auth header. Bounded time + size.
exec curl -sS --fail --max-time 45 --max-filesize 5000000 \
  -H 'Accept: text/plain' \
  "https://r.jina.ai/${URL}"
