#!/usr/bin/env bash
# Tool 4/5 — GitHub READ via the gh CLI. Read-only by construction: only a
# whitelist of read subcommands is allowed, and mutating flags on `gh api` are
# refused. gh authenticates with your own scoped token (a read-scoped PAT is
# plenty — repo:read / public_repo). This wrapper never writes to GitHub.
#
# Usage:  gh-read.sh <subcommand> [args...]
# Examples:
#   gh-read.sh search repos "CRM" --limit 10
#   gh-read.sh repo view vercel/next.js
#   gh-read.sh release list --repo vercel/next.js
#   gh-read.sh api repos/vercel/next.js/readme
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "gh (GitHub CLI) not found. Install it (brew install gh) and authenticate with a READ-scoped token: gh auth login  (or export GH_TOKEN=<read-scoped-pat>)." >&2
  exit 127
fi

SUB="${1:-}"
if [ -z "$SUB" ]; then
  echo "usage: gh-read.sh <search|repo|release|issue|pr|gist|api> [args...]" >&2
  exit 2
fi
shift || true

# Allowed read subcommands only. Anything not here (auth, secret, repo create/delete,
# pr create/merge, workflow run, ...) is refused so this stays a pure read surface.
case "$SUB" in
  search)  exec gh search "$@" ;;
  repo)
    case "${1:-}" in
      view|list) exec gh repo "$@" ;;
      *) echo "REFUSED: gh repo '${1:-}' is not a read op (allowed: view, list)." >&2; exit 4 ;;
    esac ;;
  release)
    case "${1:-}" in
      view|list) exec gh release "$@" ;;
      *) echo "REFUSED: gh release '${1:-}' is not a read op (allowed: view, list)." >&2; exit 4 ;;
    esac ;;
  issue)
    case "${1:-}" in
      view|list) exec gh issue "$@" ;;
      *) echo "REFUSED: gh issue '${1:-}' is not a read op (allowed: view, list)." >&2; exit 4 ;;
    esac ;;
  pr)
    case "${1:-}" in
      view|list|diff) exec gh pr "$@" ;;
      *) echo "REFUSED: gh pr '${1:-}' is not a read op (allowed: view, list, diff)." >&2; exit 4 ;;
    esac ;;
  gist)
    case "${1:-}" in
      view|list) exec gh gist "$@" ;;
      *) echo "REFUSED: gh gist '${1:-}' is not a read op (allowed: view, list)." >&2; exit 4 ;;
    esac ;;
  api)
    # gh api defaults to GET. Refuse any flag that turns it into a write.
    for a in "$@"; do
      case "$a" in
        -X|--method|-f|-F|--field|--raw-field|--input)
          echo "REFUSED: '$a' can turn 'gh api' into a write. This lane is GET-only." >&2
          exit 4 ;;
      esac
    done
    exec gh api "$@" ;;
  *)
    echo "REFUSED: '$SUB' is not an allowed read subcommand (allowed: search, repo, release, issue, pr, gist, api)." >&2
    exit 4 ;;
esac
