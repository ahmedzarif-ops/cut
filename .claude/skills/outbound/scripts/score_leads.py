#!/usr/bin/env python3
"""
score_leads.py — Rank a raw list of prospects by ICP fit so the SDR works the best-fit
accounts first instead of blasting everyone. Pure local computation (stdlib only), fully
transparent: every score comes with the reasons that produced it.

It scores fit and flags problems. It does NOT decide who to contact or send anything — and it
never invents data; missing fields are flagged, not guessed.

CONFIGURE IT: edit the ICP knobs block below to match your company.yml (icp.description +
your ICP research doc). The defaults are placeholders — replace TARGET_SEGMENTS, the size
sweet spot, and the revenue floor with your real ICP thresholds.

PROSPECT CSV (header required; columns are read leniently, missing = flagged/neutral):
  company, segment, employees, est_annual_revenue, has_website (yes/no),
  website_quality (poor|fair|good), reviews (int), avg_rating (float 0-5),
  runs_paid_ads (yes/no), years_in_business, email, phone, city, state, notes

SCORING (transparent, editable in the knobs below). Components sum to a raw score, normalized
to 0-100, then tiered:  A >=75  ·  B 55-74  ·  C 35-54  ·  D <35
Disqualifiers (non-target segment, no contact method) force tier D with a flag.

USAGE:
  python score_leads.py prospects.csv
  python score_leads.py prospects.csv --top 25
"""

import argparse
import csv
import sys

# ----- ICP knobs (EDIT to your company.yml / ICP research) -----
# Keywords that mark a prospect as inside your target segment. Matching is lenient
# (substring both ways). Replace these placeholders with your real segment keywords.
TARGET_SEGMENTS = {"segment-a", "segment-b", "segment-c"}
SWEET_SPOT_EMPLOYEES = (5, 75)      # big enough to afford, small enough to lack the function you replace
TOO_BIG_EMPLOYEES = 250             # likely already has an in-house team for what you sell
MIN_REVENUE_TO_AFFORD = 250_000     # rough floor to afford your offer; set from your pricing
LOW_REVIEW_COUNT = 50               # below this = visible room to improve (opportunity signal)

TIER_A, TIER_B, TIER_C = 75, 55, 35


def _num(v):
    if v is None:
        return None
    s = str(v).replace(",", "").replace("$", "").strip().lower()
    s = s.replace("k", "000").replace("m", "000000") if s and s[-1] in "km" else s
    try:
        return float(s)
    except ValueError:
        return None


def _yes(v):
    return str(v).strip().lower() in {"yes", "y", "true", "1"}


def _no(v):
    return str(v).strip().lower() in {"no", "n", "false", "0"}


def score_row(r):
    """Return (raw, max_possible, reasons[], flags[], disqualified)."""
    reasons, flags = [], []
    raw = 0.0
    maxp = 0.0
    disq = False

    segment = (r.get("segment") or "").strip().lower()
    # --- Segment match (gate) : 25 ---
    maxp += 25
    if not segment:
        flags.append("missing segment")
    elif any(t in segment or segment in t for t in TARGET_SEGMENTS):
        raw += 25
        reasons.append("target segment (+25)")
    else:
        disq = True
        flags.append(f"NON-TARGET segment '{segment}' — disqualified")

    # --- Reachable (gate) : 15 ---
    maxp += 15
    has_email = bool((r.get("email") or "").strip())
    has_phone = bool((r.get("phone") or "").strip())
    if has_email and has_phone:
        raw += 15
        reasons.append("email + phone (+15)")
    elif has_email or has_phone:
        raw += 10
        reasons.append("one contact method (+10)")
    else:
        disq = True
        flags.append("NO contact method — disqualified")

    # --- Size sweet spot : 20 ---
    maxp += 20
    emp = _num(r.get("employees"))
    if emp is None:
        flags.append("missing employees")
    elif SWEET_SPOT_EMPLOYEES[0] <= emp <= SWEET_SPOT_EMPLOYEES[1]:
        raw += 20
        reasons.append(f"size sweet spot ({int(emp)} emp, +20)")
    elif emp < SWEET_SPOT_EMPLOYEES[0]:
        raw += 6
        reasons.append(f"small ({int(emp)} emp, +6)")
        flags.append("may be too small to afford")
    elif emp >= TOO_BIG_EMPLOYEES:
        raw += 4
        reasons.append(f"large ({int(emp)} emp, +4)")
        flags.append("may have an in-house team")
    else:
        raw += 12
        reasons.append(f"upper-mid size ({int(emp)} emp, +12)")

    # --- Affordability (revenue) : 15 ---
    maxp += 15
    rev = _num(r.get("est_annual_revenue"))
    if rev is None:
        flags.append("missing revenue")
    elif rev >= MIN_REVENUE_TO_AFFORD:
        raw += 15
        reasons.append("revenue supports spend (+15)")
    else:
        raw += 4
        reasons.append("low revenue (+4)")
        flags.append("affordability risk")

    # --- Marketing-gap opportunity : 25 ---
    maxp += 25
    gap = 0
    site = (r.get("website_quality") or "").strip().lower()
    if _no(r.get("has_website")) or site == "poor":
        gap += 10
        reasons.append("weak/no website (+10)")
    elif site == "fair":
        gap += 6
        reasons.append("fair website (+6)")
    reviews = _num(r.get("reviews"))
    if reviews is not None and reviews < LOW_REVIEW_COUNT:
        gap += 8
        reasons.append(f"few reviews ({int(reviews)}, +8)")
    rating = _num(r.get("avg_rating"))
    if rating is not None and rating < 4.0:
        gap += 4
        reasons.append(f"sub-4.0 rating (+4)")
    if _no(r.get("runs_paid_ads")):
        gap += 5
        reasons.append("not yet running ads — greenfield (+5)")
    elif _yes(r.get("runs_paid_ads")):
        gap += 3
        reasons.append("running ads — budget exists (+3)")
    raw += min(gap, 25)

    return raw, maxp, reasons, flags, disq


def tier(score, disq):
    if disq:
        return "D"
    if score >= TIER_A:
        return "A"
    if score >= TIER_B:
        return "B"
    if score >= TIER_C:
        return "C"
    return "D"


def main():
    p = argparse.ArgumentParser(description="Score prospects by ICP fit.")
    p.add_argument("prospects", help="Path to prospects CSV")
    p.add_argument("--top", type=int, default=0, help="Only show the top N (0 = all)")
    args = p.parse_args()

    try:
        with open(args.prospects, newline="", encoding="utf-8") as f:
            rows = [{(k or "").strip(): (v or "") for k, v in r.items()}
                    for r in csv.DictReader(f)]
    except FileNotFoundError:
        sys.exit(f"ERROR: file not found: {args.prospects}")

    scored = []
    for r in rows:
        raw, maxp, reasons, flags, disq = score_row(r)
        score = round(raw / maxp * 100) if maxp else 0
        scored.append({
            "company": r.get("company") or "(no name)",
            "score": score, "tier": tier(score, disq),
            "reasons": reasons, "flags": flags,
        })
    # sort: tier A..D, then score desc
    order = {"A": 0, "B": 1, "C": 2, "D": 3}
    scored.sort(key=lambda x: (order[x["tier"]], -x["score"]))
    if args.top:
        scored = scored[: args.top]

    counts = {t: sum(1 for s in scored if s["tier"] == t) for t in "ABCD"}
    print("PROSPECT SCORING — ICP fit")
    print("=" * 60)
    print(f"Scored {len(scored)} prospects  |  A:{counts['A']}  B:{counts['B']}  C:{counts['C']}  D:{counts['D']}")
    print("-" * 60)
    for s in scored:
        print(f"[{s['tier']}] {s['score']:>3}  {s['company']}")
        if s["reasons"]:
            print(f"      + {'; '.join(s['reasons'])}")
        if s["flags"]:
            print(f"      ! {'; '.join(s['flags'])}")
    print("-" * 60)
    print("Work A then B. C = nurture/longer-term. D = disqualified or weak fit (see flags).")
    print("Scores rank fit only — they don't choose who to contact, and outreach is still")
    print("compliance-gated (CAN-SPAM / TCPA / DNC) and owner-approved before anything sends.")


if __name__ == "__main__":
    main()
