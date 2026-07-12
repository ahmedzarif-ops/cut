// Renders the daily growth report by reusing the cockpit render engine.
// Guarantees ALL five content slots are filled (empty -> "none") so renderCockpit,
// which throws on any unfilled {{TOKEN}}, never crashes on a quiet or held-card day.
import { mdToHtml, renderCockpitFile } from "./render-cockpit.mjs";

const SLOTS = ["HEADLINE", "THE_PROPOSAL", "POD_DETAIL", "BLOCKERS_ESCALATIONS", "PENDING"];

export function renderDaily(templatePath, sections = {}, meta = {}) {
  const slots = { DATE: meta.date || "", GENERATED: meta.generated || "" };
  for (const k of SLOTS) {
    const has = sections[k] && String(sections[k]).trim();
    if (k === "HEADLINE") {
      // Single line: empty -> a plain sentence, NEVER a bullet (a "- none" here would render a
      // <ul> inside the template's <p class="headline">, which is invalid markup).
      const md = has ? String(sections[k]) : "Steady. No new proposal.";
      slots[k] = mdToHtml(md).replace(/^<p>|<\/p>$/g, "");
    } else {
      slots[k] = mdToHtml(has ? String(sections[k]) : "- none");
    }
  }
  return renderCockpitFile(templatePath, slots);
}
