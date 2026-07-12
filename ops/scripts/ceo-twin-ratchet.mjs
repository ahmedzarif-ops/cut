// CEO Twin autonomy ratchet: decides when a reversible decision CLASS has earned
// auto-do status (Tier B -> Tier A). Zero-dependency, pure. Hard safety rule:
// a Tier C (hard-line) class is permanently ineligible regardless of track record.
//
// Groups by `class` (not the tag signature); counts the v2 owner-verdict
// vocabulary; reads numeric `conf` via normalizeEntry; applies the soft-approval
// rule. Under a standing decide-and-hold grant, a promotion no longer changes WHO
// decides (Tier B is already Twin-decided) — it drops a class from a prominent FYI
// to a silent brief line, so the ratchet is strictly conservative.
import { isHardLine } from "./ceo-twin-classifier.mjs";
import { normalizeEntry } from "./ceo-twin-ledger.mjs";

export const DEFAULT_RATCHET_CONFIG = {
  minMatches: 5,        // weighted owner-approval matches needed
  minConfidence: 8,     // mean confidence floor (1-10)
};

export const SOFT_APPROVAL_WEIGHT = 0.5;
export const SOFT_APPROVAL_WINDOW_DAYS = 7;

// A Twin-decided Tier-B entry whose owner verdict arrives as SILENT non-objection:
// still pending >= 7 days after it was surfaced in a brief. Counts 0.5 of a match and
// can NEVER be the sole basis for a promotion (enforced in computePromotions).
export function isSoftApproval(entry, now = Date.now()) {
  const e = normalizeEntry(entry);
  if (e.tier !== "B") return false;
  if (e.ruling !== "pending") return false;
  if (!["away_mode", "governor"].includes(e.source)) return false;
  const t = Date.parse(e.surfaced_ts || "");
  if (Number.isNaN(t)) return false;
  return (now - t) >= SOFT_APPROVAL_WINDOW_DAYS * 86400000;
}

export function promotionEligible(candidate, config = DEFAULT_RATCHET_CONFIG) {
  if (isHardLine(candidate)) return false; // the immovability guard
  const s = candidate.stats || {};
  if (s.recentOverride) return false;
  if ((s.matches || 0) < config.minMatches) return false;
  if ((s.confidenceAvg || 0) < config.minConfidence) return false;
  return true;
}

// Computes newly-eligible decision CLASSES. entries must be in ascending chronological
// order (oldest first); recentOverride is derived from the last entry per class. Each
// entry is normalized first, so v1 and v2 entries both feed in (v1 entries have no
// `class` and are skipped — they predate the field).
export function computePromotions(entries, alreadyPromoted = [], config = DEFAULT_RATCHET_CONFIG, now = Date.now()) {
  const groups = new Map(); // class -> { tags:Set, strong, soft, recentOverride, confSum, confN }
  for (const raw of entries || []) {
    const e = normalizeEntry(raw);
    if (!e.class) continue;
    if (!groups.has(e.class)) groups.set(e.class, { tags: new Set(), strong: 0, soft: 0, recentOverride: false, confSum: 0, confN: 0 });
    const g = groups.get(e.class);
    for (const t of (e.tags || [])) g.tags.add(t);
    if (Number.isFinite(e.conf)) { g.confSum += e.conf; g.confN += 1; }
    if (e.ruling === "approve" || e.ruling === "approve_with_conditions") g.strong += 1;
    else if (isSoftApproval(raw, now)) g.soft += SOFT_APPROVAL_WEIGHT;
    g.recentOverride = e.ruling === "override" || e.ruling === "decline"; // last entry wins (chronological)
  }
  const out = [];
  for (const [cls, g] of groups) {
    if (alreadyPromoted.includes(cls)) continue;
    if (g.strong < 1) continue; // soft approvals can never be the SOLE basis for promotion
    const candidate = {
      tags: [...g.tags], // union across the class so any hard-line-tagged entry blocks it
      stats: { matches: g.strong + g.soft, recentOverride: g.recentOverride, confidenceAvg: g.confN ? g.confSum / g.confN : 0 },
    };
    if (promotionEligible(candidate, config)) out.push(cls);
  }
  return out;
}
