#!/usr/bin/env bash
# Tool 2/5 — YouTube transcript + metadata via yt-dlp. Read-only: never downloads
# the video/audio, never passes browser cookies (--cookies-from-browser is a
# login-state read and is deliberately NOT used here).
#
# Usage:
#   yt.sh meta <youtube-url>        # title, uploader, duration, views, description (JSON)
#   yt.sh transcript <youtube-url>  # the English auto/manual captions as VTT text
#
# YouTube is a public video platform (not a counsel-gated social platform), so
# transcript + metadata reads are in-scope. We still pass ONLY the URL.
set -euo pipefail
YTDLP="${YTDLP_BIN:-yt-dlp}"

if ! command -v "$YTDLP" >/dev/null 2>&1; then
  echo "yt-dlp not found. Install it (pipx install yt-dlp, or it lives at ~/.local/bin/yt-dlp) or set YTDLP_BIN." >&2
  exit 127
fi

MODE="${1:-}"
URL="${2:-}"
if [ -z "$MODE" ] || [ -z "$URL" ]; then
  echo "usage: yt.sh <meta|transcript> <youtube-url>" >&2
  exit 2
fi
case "$URL" in
  https://*youtube.com/*|https://youtu.be/*|https://*youtube.com|https://*.youtube.com/*) : ;;
  *) echo "REFUSED: not a YouTube URL (got: $URL). This wrapper is YouTube-only." >&2; exit 3 ;;
esac

case "$MODE" in
  meta)
    exec "$YTDLP" --skip-download --no-playlist --no-warnings --dump-single-json "$URL"
    ;;
  transcript)
    tmp="$(mktemp -d)"
    trap 'rm -rf "$tmp"' EXIT
    "$YTDLP" --skip-download --no-playlist --no-warnings \
      --write-auto-subs --write-subs --sub-langs "en.*" --sub-format vtt \
      -o "$tmp/%(id)s.%(ext)s" "$URL" >&2
    vtt="$(ls "$tmp"/*.vtt 2>/dev/null | head -1 || true)"
    if [ -z "$vtt" ]; then
      echo "No English transcript/captions available for this video." >&2
      exit 1
    fi
    cat "$vtt"
    ;;
  *)
    echo "unknown mode '$MODE' (expected: meta | transcript)" >&2
    exit 2
    ;;
esac
