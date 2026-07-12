#!/usr/bin/env bash
# Tool 5/5 — Exa semantic web search via mcporter -> the hosted Exa MCP server.
# Pinned server (mcp.exa.ai) + pinned tool (web_search_exa). No API key needed:
# Exa's hosted MCP is free for search. See references/exa-mcp-setup.md for the
# one-time `mcporter add` step.
#
# Usage:  exa-search.sh "<query>" [num_results]
# Example: exa-search.sh "2026 lead gen benchmarks" 8
set -euo pipefail

EXA_MCP_SERVER="${EXA_MCP_SERVER:-exa}"   # the mcporter server name registered for https://mcp.exa.ai/mcp
EXA_TOOL="web_search_exa"                   # pinned Exa search tool

if ! command -v mcporter >/dev/null 2>&1; then
  echo "mcporter not found. Install it (npm i -g mcporter) and register the Exa server once:" >&2
  echo "  mcporter add exa --url https://mcp.exa.ai/mcp        # no API key required for search" >&2
  echo "See references/exa-mcp-setup.md for details." >&2
  exit 127
fi

QUERY="${1:-}"
if [ -z "$QUERY" ]; then
  echo 'usage: exa-search.sh "<query>" [num_results]' >&2
  exit 2
fi
NUM="${2:-8}"

# mcporter call <server> <tool> --args '<json>'. Query is passed as a value (not
# interpolated into a shell), and the server/tool are pinned constants above.
ARGS="$(printf '{"query":%s,"numResults":%s}' "$(printf '%s' "$QUERY" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')" "$NUM")"
exec mcporter call "$EXA_MCP_SERVER" "$EXA_TOOL" --args "$ARGS"
