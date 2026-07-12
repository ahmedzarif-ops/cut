// Deterministic "AI slop" tell detector. Zero-dependency, pure function.
// Catches the unambiguous tells where judgment is not needed, so an anti-slop
// reviewer receives these as pre-computed findings instead of relying on an LLM
// to spot them. Judgment-based slop detection stays with the reviewer + rubric
// docs; this file is only the mechanical layer.
//
// Extend the banned-phrase list with your brand's own via
// `opts.bannedPhrases` (e.g. read `brand.banned_phrases` from company.yml and
// pass it in) — they are merged with the generic defaults below.

const EM_EN_DASH = /[—–]/; // em dash and en dash, commonly banned by house voice
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{FE0F}]/u;

// Generic AI filler. Lowercased; matched as case-insensitive substrings.
// Advisory (warn), not hard rules.
const DEFAULT_BANNED_PHRASES = [
  "leverage", "synergy", "cutting-edge", "cutting edge", "revolutionary",
  "game-changer", "game changer", "supercharge", "seamless", "ever-evolving",
  "in today's digital age", "in today's fast-paced", "elevate your",
  "take it to the next level", "more than just", "it's important to note",
  "when it comes to", "in conclusion",
];

// Design tells, meaningful only for HTML/CSS/JSX input.
const EYEBROW = /uppercase[^"'`]{0,40}tracking|tracking[^"'`]{0,40}uppercase/gi;
const SECTION = /<section\b/gi;

export function slopTells(input, opts = {}) {
  const mode = opts.mode || "both";
  const bannedPhrases = [
    ...DEFAULT_BANNED_PHRASES,
    ...((opts.bannedPhrases || []).map((p) => String(p).toLowerCase())),
  ];
  const text = String(input || "");
  const lines = text.split(/\r?\n/);
  const findings = [];
  const checkContent = mode === "content" || mode === "both";
  const checkDesign = mode === "design" || mode === "both";

  if (checkContent) {
    lines.forEach((line, i) => {
      if (EM_EN_DASH.test(line)) {
        findings.push({ tell: "em-or-en-dash", severity: "block", line: i + 1, snippet: line.trim().slice(0, 120) });
      }
      if (EMOJI.test(line)) {
        findings.push({ tell: "emoji", severity: "block", line: i + 1, snippet: line.trim().slice(0, 120) });
      }
      const lower = line.toLowerCase();
      for (const phrase of bannedPhrases) {
        if (lower.includes(phrase)) {
          findings.push({ tell: "banned-phrase", severity: "warn", line: i + 1, snippet: phrase });
        }
      }
    });
  }

  let eyebrowCount = 0;
  let sectionCount = 0;
  if (checkDesign) {
    eyebrowCount = (text.match(EYEBROW) || []).length;
    sectionCount = (text.match(SECTION) || []).length;
    const cap = Math.max(1, Math.ceil(sectionCount / 3)); // taste rule: max 1 eyebrow per 3 sections
    if (sectionCount > 0 && eyebrowCount > cap) {
      findings.push({
        tell: "eyebrow-overuse",
        severity: "warn",
        line: 0,
        snippet: `${eyebrowCount} eyebrows across ${sectionCount} sections (cap ${cap})`,
      });
    }
  }

  return {
    findings,
    counts: {
      emDash: findings.filter((f) => f.tell === "em-or-en-dash").length,
      emoji: findings.filter((f) => f.tell === "emoji").length,
      banned: findings.filter((f) => f.tell === "banned-phrase").length,
      eyebrow: eyebrowCount,
      section: sectionCount,
    },
  };
}
