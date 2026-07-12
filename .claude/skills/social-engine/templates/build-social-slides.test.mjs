import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderSlide, build } from "./build-social-slides.mjs";

// renderSlide carries per-type content + the ratio/type body classes + the template wordmark
{
  const cover = renderSlide({ type: "cover", ratio: "9x16", eyebrow: "EYE", title: "Hook headline" });
  assert.ok(cover.includes("Hook headline"), "cover title");
  assert.ok(cover.includes("ratio-9x16") && cover.includes("type-cover"), "cover classes");
  assert.ok(cover.includes("Your Brand"), "template wordmark present");
}
{
  const stat = renderSlide({ type: "stat", ratio: "1x1", figure: "62%", caption: "of buyers research first" });
  assert.ok(stat.includes("62%") && stat.includes("of buyers research first"), "stat content");
  assert.ok(stat.includes("ratio-1x1") && stat.includes("type-stat"), "stat classes");
}
assert.throws(() => renderSlide({ type: "cover", ratio: "4x5", title: "x" }), /bad ratio/, "bad ratio throws");
assert.throws(() => renderSlide({ type: "bogus", ratio: "1x1" }), /unknown slide type/, "bad type throws");

// build writes one numbered file per deck slide, clearing old html
{
  const dir = mkdtempSync(join(tmpdir(), "slides-"));
  const sj = join(dir, "s.json");
  writeFileSync(sj, JSON.stringify({ deck: [
    { type: "cover", ratio: "1x1", eyebrow: "E", title: "T" },
    { type: "point", ratio: "1x1", num: "1", title: "P", body: "Body text" },
    { type: "cta", ratio: "1x1", title: "C", cta: "Start free" },
  ] }));
  const out = join(dir, "out");
  const files = build(sj, out);
  assert.equal(files.length, 3, "3 slides built");
  assert.deepEqual(readdirSync(out).filter((f) => f.endsWith(".html")).sort(),
    ["01-cover.html", "02-point.html", "03-cta.html"], "numbered + typed names");
  assert.ok(readFileSync(join(out, "02-point.html"), "utf8").includes("Body text"), "point body written");
}
console.log("build-social-slides: all assertions passed");
