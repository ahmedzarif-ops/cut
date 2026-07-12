---
name: web-research
description: >-
  Safe logged-out internet-research reach for your agents via five pinned, read-only tools: public web-read
  (r.jina.ai), YouTube transcripts (yt-dlp), RSS/Atom feeds, GitHub read (gh CLI), and Exa semantic search. Reach for it whenever an agent needs to look something up on the
  open web, read or summarize a URL or article, pull a YouTube video's transcript or stats, follow an RSS feed,
  search or read a GitHub repo, release, or issue, or run a semantic web search for recent sources - even
  phrased casually like 'look this up', 'read this link', 'get the transcript of this video', 'what does this
  repo do', or 'find recent articles on X'. Logged-out public data and official APIs only. Hard NO-GO: no
  login-state or cookie scraping, no social platforms (X, Reddit, Facebook, Instagram, LinkedIn, XiaoHongShu)
  which are counsel-gated, and never build outreach lists from personal data. Not for social listening (that
  stays on the sanctioned social-listening path in market-radar).
---

# Web Research — safe, logged-out internet reach

This skill gives any of your agents a small, safe set of internet-research tools. It wraps ONLY five gate-cleared
read tools, each with a **fixed, pinned invocation** in `scripts/`, so an agent gets real reach without
opening a scraping or credential surface. It does not install any third-party "agent reach" package and never
touches a login, cookie, or social backend.

## HARD GUARDS — read first (these are security + legal boundaries, not preferences)

The guards are baked into the wrappers (`scripts/guard.sh` is the one denylist all URL tools share), but you
own them too:

- **Logged-out public data + official APIs ONLY.** Never scrape login-state or session cookies, never pass
  `--cookies-from-browser` / auth headers / a `user:pass@host` URL. If a read needs a login, it is out of scope.
- **No social platforms — counsel-gated NO-GO.** X/Twitter, Reddit, Facebook, Instagram, LinkedIn, and
  XiaoHongShu (plus aliases) are refused by the denylist, in every tool, no exceptions. **LinkedIn is excluded
  even from plain public web-read.** Logged-in/session-cookie scraping of any ToS-bound platform is NO-GO
  pending counsel (see the channel-law note in the `legal` skill).
- **Listening-only. Never harvest personal data into an outreach list.** These tools are for understanding the
  market and reading sources, not for assembling contact lists from personal data — that is spam/anti-solicitation
  harvesting. Outreach stays warm-first on the `outbound` rails.
- **When exposure is real, still defer to the gates.** Anything you then publish, claim, or send goes through
  the normal roster (Gus/Lex/Cyrus/Iris). This skill only *reads*.

If a request wants any of the above, stop and say why it is out of scope — do not work around the denylist.

## The five tools (pinned invocations)

Run from the skill directory (`.claude/skills/web-research/`). Each script enforces the guards before any
network call and exits with a clear message if a required binary is missing.

| # | Need | Invoke | Binary |
| - | ---- | ------ | ------ |
| 1 | Read a public page / article as clean text | `scripts/webread.sh <public-url>` | `curl` (pinned to `r.jina.ai`) |
| 2 | YouTube transcript or metadata | `scripts/yt.sh meta <url>` / `scripts/yt.sh transcript <url>` | `yt-dlp` |
| 3 | RSS / Atom feed | `scripts/rss.py <feed-url> [max]` | `python3` + `feedparser` |
| 4 | GitHub read (repos, releases, issues, PRs, api GET) | `scripts/gh-read.sh <sub> [args]` | `gh` (read-scoped token) |
| 5 | Exa semantic web search | `scripts/exa-search.sh "<query>" [n]` | `mcporter` → `mcp.exa.ai` |

### 1. Public web-read — `webread.sh`
`scripts/webread.sh https://example.com/blog/post` returns the page as readable text. The reader host
(`r.jina.ai`) is pinned in the script; we pass only the target URL — no cookie, header, or token — so it is
always a logged-out read. LinkedIn and every social host are refused here by the shared denylist.

### 2. YouTube — `yt.sh`
`scripts/yt.sh meta <url>` → title, uploader, duration, view count, description as JSON.
`scripts/yt.sh transcript <url>` → the English captions as VTT text. Never downloads the video/audio and never
uses browser cookies (that would be a login-state read). YouTube is a public video platform, so this is in
scope; for *watching* a video frame-by-frame use a dedicated video-watch skill.

### 3. RSS / Atom — `rss.py`
`scripts/rss.py https://blog.example.com/feed.xml 20` prints the feed title + entries (title, link, published,
summary) as JSON. Needs the `feedparser` module (`pip install --user feedparser`); it mirrors the same social
denylist so a feed URL pointing at a NO-GO platform is refused.

### 4. GitHub — `gh-read.sh`
Read-only by construction: only a whitelist of read subcommands runs (`search`, `repo view/list`,
`release view/list`, `issue view/list`, `pr view/list/diff`, `gist view/list`, and GET-only `api`); any
mutating flag on `gh api` is refused. Authenticate `gh` once with a **read-scoped** token
(`gh auth login`, or `export GH_TOKEN=<read-scoped-pat>`). Example: `scripts/gh-read.sh repo view vercel/next.js`.

### 5. Exa semantic search — `exa-search.sh`
`scripts/exa-search.sh "2026 lead-gen benchmarks" 8` runs a meaning-based web search through
`mcporter` against Exa's **hosted MCP server (`https://mcp.exa.ai/mcp`) — no API key needed**. Pinned server +
tool. Use it to *find* recent sources, then feed the returned URLs to `webread.sh` for the full text. One-time
setup (install `mcporter`, register the `exa` server) is in **`references/exa-mcp-setup.md`**.

## When to use / when not to

- **Use it** for any open-web read an agent needs mid-task: grounding a claim, reading a competitor's public
  page or docs, pulling a YouTube transcript, following an industry feed, checking what a GitHub project does,
  or a semantic search for current sources.
- **Do not use it** for social listening (X/Reddit/etc. audience voice) — that stays on the sanctioned,
  ToS-aware social surface inside the `market-radar` skill (wire it to a paid social-listening MCP of your
  choice). This lane is the logged-out, no-social complement to it, not a replacement.

## How it fits

Reads only; it writes nothing and deploys nothing. Marketing-pod agents (Mark and the growth/blog/social
seats), the CEO Twin, and the market-radar analyst are the main consumers, but any agent can invoke it via
skill auto-discovery — no per-agent wiring is required. Pair it with the existing gates when the *output* has
external exposure. Ground any customer-facing claims you build from a read in your ICP research doc
(`company.yml` → `icp.research_doc`); if it is missing, run ICP research first — never invent customer facts.
