#!/usr/bin/env python3
"""Tool 3/5 — RSS / Atom feed read via feedparser.

Public feeds only, listening-only. Mirrors the shared social/login denylist in
guard.sh so a feed URL pointing at a counsel-gated platform is refused here too.

Usage:
    rss.py <feed-url> [max_entries]

Prints JSON: {feed_title, feed_link, entries:[{title, link, published, summary}]}.
Default max_entries = 20.
"""
import json
import sys
from urllib.parse import urlsplit

# Kept in lock-step with scripts/guard.sh (one denylist, five tools).
SOCIAL_DENYLIST = {
    "linkedin.com", "lnkd.in", "x.com", "twitter.com", "t.co",
    "reddit.com", "redd.it", "facebook.com", "fb.com", "fb.watch",
    "instagram.com", "threads.net", "xiaohongshu.com", "xhslink.com",
}


def assert_public_url(url: str) -> None:
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https"):
        sys.exit(f"REFUSED: only http(s) feed URLs allowed (got: {url}).")
    if "@" in parts.netloc:
        sys.exit("REFUSED: feed URL embeds credentials — no login-state reads in this lane.")
    host = (parts.hostname or "").lower()
    for d in SOCIAL_DENYLIST:
        if host == d or host.endswith("." + d):
            sys.exit(
                f"REFUSED: '{host}' is a counsel-gated NO-GO platform (social / login-bound). "
                "Logged-out public feeds + official APIs only."
            )


def main() -> int:
    if len(sys.argv) < 2:
        sys.exit("usage: rss.py <feed-url> [max_entries]")
    url = sys.argv[1]
    max_entries = int(sys.argv[2]) if len(sys.argv) > 2 else 20
    assert_public_url(url)

    try:
        import feedparser  # noqa: WPS433 (deferred so the denylist runs first)
    except ImportError:
        sys.exit(
            "feedparser not installed. Install it: pip install --user feedparser "
            "(or python3 -m pip install feedparser)."
        )

    feed = feedparser.parse(url)
    out = {
        "feed_title": feed.feed.get("title", ""),
        "feed_link": feed.feed.get("link", ""),
        "entries": [
            {
                "title": e.get("title", ""),
                "link": e.get("link", ""),
                "published": e.get("published", e.get("updated", "")),
                "summary": e.get("summary", ""),
            }
            for e in feed.entries[:max_entries]
        ],
    }
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
