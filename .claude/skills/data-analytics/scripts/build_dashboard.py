#!/usr/bin/env python3
"""
build_dashboard.py — Turn a metrics file into a clean, self-contained HTML executive
dashboard the CEO can open in any browser or have emailed to them. No external
dependencies, no internet needed to view it: inline CSS and inline-SVG sparklines only.

This is the "portable snapshot" delivery mode (the other mode is a live BI tool — see
references/dashboards-and-reporting.md). It renders whatever numbers you feed it; it does
NOT invent or compute business metrics itself. Garbage in, garbage out — the metrics layer
and your queries are responsible for the values being correct.

INTEGRITY BEHAVIOR (matches the Head of Data posture):
  * Shows the "as of" date and a freshness/caveat line prominently — the reader always knows
    how current the numbers are.
  * Missing values render as "—", never a fake 0.
  * Each metric's delta is colored by its OWN good-direction (MRR up = good/green; churn
    down = good/green), so the dashboard can't accidentally celebrate a bad move.
  * Footer states the data sources and the generation timestamp.

INPUT (JSON):
{
  "title": "CEO Dashboard",
  "subtitle": "Internal growth metrics",
  "as_of": "2026-06-27",
  "freshness": "Billing + app DB synced through 2026-06-26. Self-reported attribution lags ~1 wk.",
  "sources": ["Billing", "App DB", "Web analytics", "Ad-platform connector"],
  "sections": [
    {
      "name": "Revenue",
      "metrics": [
        {
          "name": "MRR", "value": 8910, "unit": "$", "prior": 7700, "target": 12000,
          "good_direction": "up",
          "series": [{"period":"Feb","value":4200},{"period":"Mar","value":5100}, ...],
          "note": "Recurring only; excludes one-off and services revenue."
        },
        { "name": "Active subscribers", "value": 30, "unit": "count", "prior": 26, "good_direction": "up" }
      ]
    }
  ]
}

Field notes:
  unit            "$" | "%" | "count" | "" (free) — drives formatting
  good_direction  "up" | "down" | "none" (none = neutral, no color on delta)
  prior           previous-period value for the delta (optional)
  target          goal value; renders a progress bar (optional)
  series          [{period, value}] for a sparkline (optional; >=2 points)
  value           omit or null -> renders "—"

USAGE:
  python build_dashboard.py metrics.json -o dashboard.html
  python build_dashboard.py metrics.json            # prints to stdout
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from html import escape

# ---------- formatting ----------

def fmt_value(v, unit):
    if v is None:
        return "—"
    try:
        n = float(v)
    except (TypeError, ValueError):
        return escape(str(v))
    if unit == "$":
        return "$" + _commas(n)
    if unit == "%":
        return _trim(n) + "%"
    if unit == "count":
        return _commas(n)
    return _trim(n)

def _commas(n):
    if n == int(n):
        return f"{int(n):,}"
    return f"{n:,.2f}"

def _trim(n):
    if n == int(n):
        return str(int(n))
    return f"{n:.2f}".rstrip("0").rstrip(".")

def delta_info(value, prior, good_direction):
    """Return (label, css_class) for the change vs prior."""
    if value is None or prior is None:
        return ("", "flat")
    try:
        v, p = float(value), float(prior)
    except (TypeError, ValueError):
        return ("", "flat")
    if p == 0:
        return ("new", "flat")
    pct = (v - p) / abs(p) * 100.0
    arrow = "▲" if v > p else ("▼" if v < p else "■")
    label = f"{arrow} {abs(pct):.0f}% vs prior"
    if v == p or good_direction == "none":
        return (label, "flat")
    improved = (v > p and good_direction == "up") or (v < p and good_direction == "down")
    return (label, "good" if improved else "bad")

# ---------- sparkline (inline SVG, no deps) ----------

def sparkline(series, w=180, h=40, pad=4):
    pts = [s.get("value") for s in (series or []) if s.get("value") is not None]
    if len(pts) < 2:
        return ""
    lo, hi = min(pts), max(pts)
    rng = (hi - lo) or 1.0
    n = len(pts)
    step = (w - 2 * pad) / (n - 1)
    coords = []
    for i, val in enumerate(pts):
        x = pad + i * step
        y = h - pad - (val - lo) / rng * (h - 2 * pad)
        coords.append((x, y))
    path = " ".join(f"{x:.1f},{y:.1f}" for x, y in coords)
    last_x, last_y = coords[-1]
    up = pts[-1] >= pts[0]
    stroke = "#15803d" if up else "#b91c1c"
    return (
        f'<svg class="spark" width="{w}" height="{h}" viewBox="0 0 {w} {h}" '
        f'preserveAspectRatio="none" aria-hidden="true">'
        f'<polyline fill="none" stroke="{stroke}" stroke-width="2" '
        f'stroke-linejoin="round" stroke-linecap="round" points="{path}"/>'
        f'<circle cx="{last_x:.1f}" cy="{last_y:.1f}" r="2.5" fill="{stroke}"/>'
        f"</svg>"
    )

def progress_bar(value, target, unit):
    if value is None or target in (None, 0):
        return ""
    try:
        pct = max(0.0, min(1.0, float(value) / float(target)))
    except (TypeError, ValueError):
        return ""
    return (
        f'<div class="bar"><div class="bar-fill" style="width:{pct*100:.0f}%"></div></div>'
        f'<div class="bar-label">{pct*100:.0f}% of target ({fmt_value(target, unit)})</div>'
    )

# ---------- card + page ----------

def card(m):
    name = escape(str(m.get("name", "")))
    unit = m.get("unit", "")
    value = m.get("value")
    val_html = fmt_value(value, unit)
    d_label, d_class = delta_info(value, m.get("prior"), m.get("good_direction", "none"))
    delta_html = f'<div class="delta {d_class}">{d_label}</div>' if d_label else ""
    spark = sparkline(m.get("series"))
    spark_html = f'<div class="spark-wrap">{spark}</div>' if spark else ""
    bar_html = progress_bar(value, m.get("target"), unit)
    note = m.get("note")
    note_html = f'<div class="note">{escape(str(note))}</div>' if note else ""
    return (
        f'<div class="card">'
        f'<div class="card-name">{name}</div>'
        f'<div class="card-value">{val_html}</div>'
        f"{delta_html}{spark_html}{bar_html}{note_html}"
        f"</div>"
    )

def section(s):
    name = escape(str(s.get("name", "")))
    cards = "".join(card(m) for m in s.get("metrics", []))
    return f'<section><h2>{name}</h2><div class="grid">{cards}</div></section>'

CSS = """
:root{--ink:#1a1a1a;--muted:#6b7280;--line:#e5e7eb;--bg:#ffffff;--card:#fafafa;
--good:#15803d;--bad:#b91c1c;--accent:#1f3a5f}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.wrap{max-width:1000px;margin:0 auto;padding:40px 28px 64px}
header{border-bottom:2px solid var(--ink);padding-bottom:16px;margin-bottom:8px}
h1{font-size:26px;margin:0 0 4px;letter-spacing:-.01em}
.sub{color:var(--muted);font-size:15px}
.meta{display:flex;flex-wrap:wrap;gap:16px;margin-top:12px;font-size:13px;color:var(--muted)}
.meta b{color:var(--ink);font-weight:600}
.freshness{margin-top:10px;font-size:13px;color:var(--muted);font-style:italic}
section{margin-top:32px}
h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:var(--accent);
margin:0 0 14px;font-weight:700}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:18px 18px 16px}
.card-name{font-size:13px;color:var(--muted);font-weight:600;margin-bottom:6px}
.card-value{font-size:30px;font-weight:700;letter-spacing:-.02em;line-height:1.1}
.delta{font-size:13px;font-weight:600;margin-top:6px}
.delta.good{color:var(--good)}.delta.bad{color:var(--bad)}.delta.flat{color:var(--muted)}
.spark-wrap{margin-top:10px}.spark{display:block;width:100%;height:40px}
.bar{height:6px;background:#e5e7eb;border-radius:3px;margin-top:12px;overflow:hidden}
.bar-fill{height:100%;background:var(--accent)}
.bar-label{font-size:12px;color:var(--muted);margin-top:5px}
.note{font-size:12px;color:var(--muted);margin-top:10px;line-height:1.4}
footer{margin-top:40px;padding-top:16px;border-top:1px solid var(--line);
font-size:12px;color:var(--muted)}
"""

def build_html(data):
    title = escape(str(data.get("title", "Executive Dashboard")))
    subtitle = escape(str(data.get("subtitle", "")))
    as_of = escape(str(data.get("as_of", "")))
    freshness = data.get("freshness", "")
    sources = data.get("sources", [])
    gen = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    meta_bits = []
    if as_of:
        meta_bits.append(f'<span><b>As of:</b> {as_of}</span>')
    if sources:
        meta_bits.append(f'<span><b>Sources:</b> {escape(", ".join(map(str, sources)))}</span>')
    meta = f'<div class="meta">{"".join(meta_bits)}</div>' if meta_bits else ""
    fresh = f'<div class="freshness">{escape(str(freshness))}</div>' if freshness else ""
    sub = f'<div class="sub">{subtitle}</div>' if subtitle else ""
    body = "".join(section(s) for s in data.get("sections", []))

    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title><style>{CSS}</style></head>
<body><div class="wrap">
<header><h1>{title}</h1>{sub}{meta}{fresh}</header>
{body}
<footer>Generated {gen}. Figures trace to the sources listed above; this snapshot
visualizes the metrics layer and does not itself compute or verify them. Decisions are
the CEO's — this supports them, it doesn't make them.</footer>
</div></body></html>"""

def main():
    p = argparse.ArgumentParser(description="Build a self-contained HTML executive dashboard from a metrics JSON file.")
    p.add_argument("metrics", help="Path to metrics JSON")
    p.add_argument("-o", "--out", help="Output HTML path (default: stdout)")
    args = p.parse_args()

    try:
        with open(args.metrics, encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        sys.exit(f"ERROR: file not found: {args.metrics}")
    except json.JSONDecodeError as e:
        sys.exit(f"ERROR: invalid JSON: {e}")

    html = build_html(data)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(html)
        n = sum(len(s.get("metrics", [])) for s in data.get("sections", []))
        print(f"Wrote {args.out} — {len(data.get('sections', []))} sections, {n} metrics.")
    else:
        print(html)


if __name__ == "__main__":
    main()
