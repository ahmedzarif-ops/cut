// Zero-dep render helper for the CEO cockpit. Fills {{TOKEN}} slots in the
// template and converts the agent's simple markdown sections to HTML.
import { readFileSync } from "node:fs";

// Minimal markdown -> HTML: blank-line-separated blocks; a block whose lines all
// start with "- " becomes a <ul>; otherwise a <p>. Inline `code` -> span.mono.
export function mdToHtml(md) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s) => esc(s).replace(/`([^`]+)`/g, '<span class="mono">$1</span>');
  const blocks = String(md).trim().split(/\n\s*\n/);
  const out = [];
  for (const b of blocks) {
    const lines = b.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length && lines.every((l) => l.startsWith("- "))) {
      out.push("<ul>" + lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join("") + "</ul>");
    } else {
      out.push("<p>" + lines.map(inline).join("<br>") + "</p>");
    }
  }
  return out.join("\n");
}

// Fill {{KEY}} tokens. Throws if a referenced token has no slot, or if any raw
// {{ token remains after substitution (guards against an unfilled cockpit).
export function renderCockpit(template, slots) {
  const out = template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in slots)) throw new Error("missing slot: " + k);
    return slots[k];
  });
  if (/\{\{/.test(out)) throw new Error("unfilled token remains");
  return out;
}

export function renderCockpitFile(templatePath, slots) {
  return renderCockpit(readFileSync(templatePath, "utf8"), slots);
}
