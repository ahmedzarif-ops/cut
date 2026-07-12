// Zero-dep renderer: agent-audit data -> a self-contained, noindex internal HTML page.
// Pure (no fs/network). The operating-system skill writes the returned string to
// public/internal/<slug>/index.html at run time.
//
// data shape: { company?, generatedAt, stance, summary, agents: [
//   { nickname, name, dept, verdict, rationale, recommendedAction } ] }
// `verdict` is one of: Keep | Improve | Merge | Deprioritize | Retire | New-capability
const VERDICT_COLORS = {
  Keep: "var(--green)", Improve: "var(--brass-aa)", Merge: "var(--teal)",
  Deprioritize: "var(--ink-mute)", Retire: "var(--terra)", "New-capability": "var(--teal)",
};
function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
export function renderAgentAudit(data) {
  const company = (data && data.company) || "Company";
  const agents = Array.isArray(data && data.agents) ? data.agents : [];
  const rows = agents.map((a) => `
      <tr>
        <td><b>${esc(a.nickname)}</b><br><span class="mut">${esc(a.name)}</span></td>
        <td>${esc(a.dept)}</td>
        <td><span class="chip" style="--c:${VERDICT_COLORS[a.verdict] || "var(--ink-mute)"}">${esc(a.verdict)}</span></td>
        <td>${esc(a.rationale)}</td>
        <td>${esc(a.recommendedAction)}</td>
      </tr>`).join("");
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Agent Audit ${esc(data && data.generatedAt)} - ${esc(company)}</title>
<style>
:root{--paper:#F5F2EC;--ink:#1F2733;--ink-soft:#41505C;--ink-mute:#6F6A5C;--teal:#1E6E68;--brass-aa:#8A6526;--line:#E4DDCF;--card:#FBFAF6;--terra:#C2603F;--green:#3E8E78}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:"Inter",system-ui,-apple-system,sans-serif;line-height:1.6}
.wrap{max-width:1120px;margin:0 auto;padding:48px 24px 96px}
h1{font-family:"Fraunces",Georgia,serif;font-size:34px;margin:0 0 4px}
.mut{color:var(--ink-mute);font-size:12px}
.stance{display:inline-block;background:var(--card);border:1px solid var(--line);border-left:4px solid var(--brass-aa);border-radius:10px;padding:10px 14px;margin:16px 0;color:var(--ink-soft);font-size:14px}
.sum{margin:8px 0 0;color:var(--ink-soft)}
table{border-collapse:collapse;width:100%;background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden;font-size:14px;margin-top:18px}
th,td{text-align:left;padding:12px 14px;border-bottom:1px solid var(--line);vertical-align:top}
th{background:#F0EBDF;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-mute)}
.chip{display:inline-block;color:#fff;background:var(--c);border-radius:999px;padding:3px 10px;font-size:12px;font-weight:600}
</style></head><body><div class="wrap">
<h1>Agent Audit</h1>
<div class="mut">Generated ${esc(data && data.generatedAt)} - ${agents.length} agents</div>
<div class="stance">${esc(data && data.stance)}</div>
<p class="sum">${esc(data && data.summary)}</p>
<table><thead><tr><th>Agent</th><th>Dept</th><th>Verdict</th><th>Rationale</th><th>Recommended action</th></tr></thead>
<tbody>${rows}</tbody></table>
</div></body></html>`;
}
