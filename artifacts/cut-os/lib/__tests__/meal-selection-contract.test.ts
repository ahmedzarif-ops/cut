import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { describe, expect, it } from "vitest";
const source = readFileSync(new URL("../../app/(app)/meal-one.tsx", import.meta.url), "utf8");
describe("Direct meal selection", () => {
  it("keeps the requested template through catalog loading", () => {
    expect(source).toContain('typeof params.mealTemplateId === "string" ? params.mealTemplateId : null');
    expect(source).not.toContain('return options[0]?.id ?? null');
  });
  it("shows only the chosen meal and serving controls, with an explicit way to browse again", () => {
    expect(source).toContain('selectedOption ? [selectedOption] : visibleOptions');
    expect(source).toContain('screenState.showLoggedMeals && !selectedOption');
    expect(source).toContain('Choose a different meal');
    expect(source).toContain('label="Servings"');
  });
});
