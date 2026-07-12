# Exa semantic search — mcporter → mcp.exa.ai (one-time setup)

Exa is the semantic web-search tool in this lane (tool 5/5). It runs through
[`mcporter`](https://www.npmjs.com/package/mcporter), a small CLI that calls MCP
servers from the shell, pointed at **Exa's hosted MCP server**. Search on the
hosted server is **free — no API key or account is required**, which is why this
is the default semantic-search path rather than a metered research MCP.

## One-time install + register

```bash
npm i -g mcporter                          # the MCP-from-CLI runner
mcporter add exa --url https://mcp.exa.ai/mcp   # register the hosted Exa server as "exa"
mcporter list                              # confirm "exa" is registered
```

- **Pinned endpoint:** `https://mcp.exa.ai/mcp`. Do not point the `exa` server name at any other URL.
- **No secret to store.** Search needs no key, so there is nothing to leak. (Exa's
  paid `research`/crawl tools would need a key — we intentionally use only the free
  search surface here.)

## Invoke (via the wrapper)

```bash
scripts/exa-search.sh "2026 lead-gen benchmarks" 8
```

The wrapper pins the server (`exa`) and the tool (`web_search_exa`), passes the
query as a JSON value (never interpolated into a shell), and prints Exa's result
list (title, url, snippet) as JSON. Use it for *finding recent sources / doing a
meaning-based search*, then feed the returned URLs to `webread.sh` for the full text.

## If your mcporter version differs

`mcporter`'s subcommands have shifted across versions. If `mcporter call` or
`mcporter add` errors, check `mcporter --help`:
- registration may be `mcporter add <name> --url <endpoint>` or an entry in mcporter's
  config file — point it at `https://mcp.exa.ai/mcp` either way;
- invocation may be `mcporter call <server> <tool> --args '<json>'` or
  `mcporter run <server> <tool> <json>`. Set `EXA_MCP_SERVER` to override the server
  name; keep the tool `web_search_exa` and the endpoint pinned.

## Boundary

Exa here is **logged-out public semantic search only** — the same NO-GO rules apply:
do not use returned URLs to reach a social/login-bound platform (the `webread.sh`
denylist enforces this), and never assemble the results into an outreach contact
list from personal data.
