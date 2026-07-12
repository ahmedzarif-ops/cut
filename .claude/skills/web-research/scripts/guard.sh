#!/usr/bin/env bash
# web-research shared guard — the safe-by-construction boundary every URL-taking
# wrapper sources. It refuses the two things this lane must never do: read login/social
# platforms, and read anything with embedded credentials. Keep the denylist here so all
# five tools enforce one identical rule (one owner per behavior).
#
# WHY: this whole skill is the LOGGED-OUT, public-data-only reach. Social platforms
# (X/Reddit/Facebook/Instagram/LinkedIn/XiaoHongShu) are ToS-bound and counsel-gated NO-GO;
# LinkedIn is excluded even from plain public web-read. Social listening stays on the
# sanctioned social-listening path in the market-radar skill, not here.

# Host-suffix denylist. Match the platform apex and its obvious aliases.
SOCIAL_DENYLIST="linkedin.com lnkd.in x.com twitter.com t.co reddit.com redd.it facebook.com fb.com fb.watch instagram.com threads.net xiaohongshu.com xhslink.com"

wr_extract_authority() {
  # everything between scheme:// and the first '/'  (host[:port], maybe user@)
  local u="$1"
  u="${u#*://}"
  u="${u%%/*}"
  printf '%s' "$u"
}

wr_extract_host() {
  local a; a="$(wr_extract_authority "$1")"
  a="${a##*@}"   # drop any userinfo
  a="${a%%:*}"   # drop any port
  printf '%s' "$a" | tr 'A-Z' 'a-z'
}

# wr_assert_public_url <url> — exit non-zero (and explain) if the URL is not an
# allowed logged-out public read.
wr_assert_public_url() {
  local url="${1:-}"
  if [ -z "$url" ]; then
    echo "REFUSED: no URL given." >&2; return 2
  fi
  case "$url" in
    http://*|https://*) : ;;
    *) echo "REFUSED: only http(s) URLs are allowed (got: $url)." >&2; return 3 ;;
  esac
  # No login-state: a URL carrying userinfo (user:pass@host) is a credentialed read.
  local authority; authority="$(wr_extract_authority "$url")"
  case "$authority" in
    *@*) echo "REFUSED: URL embeds credentials (userinfo@host) — this lane never does login-state reads." >&2; return 3 ;;
  esac
  local host d; host="$(wr_extract_host "$url")"
  for d in $SOCIAL_DENYLIST; do
    if [ "$host" = "$d" ] || [ "${host%.$d}" != "$host" ]; then
      echo "REFUSED: '$host' is a counsel-gated NO-GO platform (social / login-bound)." >&2
      echo "This lane is logged-out public data + official APIs only. Route social listening through the sanctioned path in the market-radar skill." >&2
      return 4
    fi
  done
  return 0
}
