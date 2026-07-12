#!/bin/bash
# md-first-ingest cache + deterministic converter.
# Usage: ingest.sh <source-file> [project-root]
# Prints one of:
#   CACHED <md-path>      — up-to-date .md already exists; read that instead of the source
#   CONVERTED <md-path>   — deterministic conversion succeeded; read the .md
#   NEEDS_TRANSCRIPTION <md-path> — no deterministic converter (PDF/image/etc.);
#                                    read the SOURCE once, write the transcription to <md-path>
#                                    (keep the generated frontmatter block at the top).
#
# The cache lives under your knowledge-base directory (kb_dir in company.yml, default kb/).
# Override the default with the KB_DIR env var if you set a non-default kb_dir.
set -euo pipefail

SRC="$1"
ROOT="${2:-$(pwd)}"
[ -f "$SRC" ] || { echo "ERROR no such file: $SRC" >&2; exit 1; }

OUTDIR="$ROOT/${KB_DIR:-kb}/ingest"
mkdir -p "$OUTDIR"

BASE=$(basename "$SRC")
SLUG=$(echo "${BASE%.*}" | tr '[:upper:] ' '[:lower:]-' | tr -cd 'a-z0-9-')
EXT=$(echo "${BASE##*.}" | tr '[:upper:]' '[:lower:]')
HASH=$(shasum -a 256 "$SRC" | cut -d' ' -f1)
MD="$OUTDIR/$SLUG.md"

# Cache hit: same content hash in the frontmatter → reuse, zero conversion cost.
if [ -f "$MD" ] && grep -q "source_sha256: $HASH" "$MD"; then
  echo "CACHED $MD"
  exit 0
fi

frontmatter() {
  printf -- '---\nsource: %s\nsource_sha256: %s\nconverted: %s\nconverter: %s\n---\n\n' \
    "$SRC" "$HASH" "$(date +%Y-%m-%d)" "$1"
}

case "$EXT" in
  md|txt|csv|json|yml|yaml|log)
    { frontmatter "passthrough"; cat "$SRC"; } > "$MD"
    echo "CONVERTED $MD" ;;
  docx|doc|rtf|rtfd|odt|html|htm|webarchive)
    # textutil is macOS-only. On Linux, swap in pandoc: pandoc -t plain "$SRC".
    TXT=$(textutil -convert txt -stdout "$SRC")
    { frontmatter "textutil"; printf '%s\n' "$TXT"; } > "$MD"
    echo "CONVERTED $MD" ;;
  xlsx|xlsm)
    { frontmatter "openpyxl"; python3 - "$SRC" <<'PY'
import sys
from openpyxl import load_workbook
wb = load_workbook(sys.argv[1], read_only=True, data_only=True)
for ws in wb.worksheets:
    print(f"## Sheet: {ws.title}\n")
    for row in ws.iter_rows(values_only=True):
        cells = ["" if c is None else str(c) for c in row]
        if any(cells):
            print("| " + " | ".join(cells) + " |")
    print()
PY
    } > "$MD"
    echo "CONVERTED $MD" ;;
  *)
    # PDF, image, pptx, audio-transcript, anything else: the model reads the source ONCE
    # and writes the transcription itself. Pre-write the frontmatter so the hash is recorded.
    frontmatter "model-transcription" > "$MD"
    echo "NEEDS_TRANSCRIPTION $MD" ;;
esac
