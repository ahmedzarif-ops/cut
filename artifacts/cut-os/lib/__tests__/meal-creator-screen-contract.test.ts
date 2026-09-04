import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const directory = dirname(fileURLToPath(import.meta.url));
const creator = readFileSync(
  resolve(directory, "../../app/(app)/meal-creator.tsx"),
  "utf8",
);
const mealOne = readFileSync(
  resolve(directory, "../../app/(app)/meal-one.tsx"),
  "utf8",
);
const food = readFileSync(
  resolve(directory, "../../app/(app)/(tabs)/food.tsx"),
  "utf8",
);
const appLayout = readFileSync(
  resolve(directory, "../../app/(app)/_layout.tsx"),
  "utf8",
);

describe("personalized meal creator screen contract", () => {
  it("keeps free nutrition value explicit beside the Pro creator", () => {
    expect(creator).toContain(
      "Free food search, Desi meal ideas, barcode scanning, manual logs,",
    );
    expect(food).toContain(
      'accessibilityLabel="Make me a personalized meal, CUT OS Pro"',
    );
    expect(food).toContain('router.push("/meal-creator" as never)');
    expect(food).toContain("View all ${foodsQuery.data?.length ?? 0}");
    expect(food).toContain("View all ${suggestions.length}");
  });

  it("requires review and exposes the provider data boundary", () => {
    expect(creator).toContain("Never your email or birth date.");
    expect(creator).toContain("Review & log");
    expect(creator).toContain("sourceRef: draft.id");
    expect(creator).toContain('pathname: "/food-entry"');
  });

  it("registers the modal and supports Desi, protein, balanced, and quick goals", () => {
    expect(appLayout).toContain('name="meal-creator"');
    for (const goal of ["desi", "high_protein", "balanced", "quick"]) {
      expect(creator).toContain(`value: "${goal}"`);
    }
  });

  it("keeps the fixed catalog searchable, filterable, compact, and reversible", () => {
    expect(mealOne).toContain('accessibilityLabel="Back to Today"');
    expect(mealOne).toContain('accessibilityLabel="Search balanced meals"');
    expect(mealOne).toContain('{ id: "cultural", label: "Bengali & Desi" }');
    expect(mealOne).toContain('{ id: "high-protein", label: "40g+ protein" }');
    expect(mealOne).toContain('numberOfLines={selected ? undefined : 2}');
    expect(mealOne).toContain('Showing {visibleOptions.length} of {options.length} meals');
    expect(mealOne).toContain('onPress={() => setMealFilter(filter.id)}');
    expect(mealOne).toContain('{selected && preview ? (');
    expect(mealOne).toContain('No meals match this search and filter.');
  });
});
