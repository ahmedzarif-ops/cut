import { describe, expect, it } from "vitest";

import { rankAdaptiveMealFits } from "./mealPersonalization";

describe("adaptive meal fits", () => {
  it("learns only from confirmed known template IDs", () => {
    const baseline = rankAdaptiveMealFits([]);
    const unknown = rankAdaptiveMealFits([
      "food:user-created",
      "not-a-template",
    ]);
    expect(unknown.map(({ template }) => template.id)).toEqual(
      baseline.map(({ template }) => template.id),
    );
  });

  it("uses repeated cuisine signals and explains the adaptation", () => {
    const fits = rankAdaptiveMealFits([
      "desi-chicken-masoor-rice-bowl",
      "desi-chicken-quinoa-sabzi-bowl",
      "masoor-brown-rice-sabzi-bowl",
    ]);
    expect(fits).toHaveLength(3);
    expect(fits[0]?.template.cuisine).toBe("Desi-inspired");
    expect(fits[0]?.reason).toContain("confirmed Desi-inspired meal logs");
    expect(fits[0]?.reason).toContain("Review ingredients and portions");
  });

  it("stays bounded and deterministic", () => {
    expect(rankAdaptiveMealFits([], 0)).toEqual([]);
    expect(rankAdaptiveMealFits([], 100)).toHaveLength(10);
    expect(rankAdaptiveMealFits([])).toEqual(rankAdaptiveMealFits([]));
  });

  it("applies explicit diet, cuisine, avoid, target, and feedback choices", () => {
    const fits = rankAdaptiveMealFits({
      confirmedTemplateIds: [],
      dietStyle: "vegetarian",
      preferredCuisines: ["Desi"],
      avoidedIngredients: ["egg"],
      feedback: { "masoor-brown-rice-sabzi-bowl": "not_for_me" },
      remainingCaloriesKcal: 700,
      remainingProteinG: 40,
    });

    expect(fits).toHaveLength(3);
    expect(
      fits.every(
        ({ template }) =>
          template.dietaryTags.includes("vegetarian") ||
          template.dietaryTags.includes("vegan"),
      ),
    ).toBe(true);
    expect(
      fits.every(
        ({ template }) =>
          !template.ingredients.join(" ").toLocaleLowerCase().includes("egg"),
      ),
    ).toBe(true);
    expect(
      fits.every(
        ({ template }) => template.id !== "masoor-brown-rice-sabzi-bowl",
      ),
    ).toBe(true);
    expect(fits[0]?.reason).toContain("preference");
    expect([0.5, 0.75, 1, 1.25, 1.5, 2]).toContain(
      fits[0]?.recommendedServings,
    );
  });

  it("can disable learned history while retaining explicit choices", () => {
    const result = rankAdaptiveMealFits({
      confirmedTemplateIds: [
        "desi-chicken-masoor-rice-bowl",
        "desi-chicken-quinoa-sabzi-bowl",
      ],
      feedback: { "tofu-edamame-rice-bowl": "not_for_me" },
      learningEnabled: false,
      preferredCuisines: ["Mediterranean"],
    });
    expect(result[0]?.template.cuisine).toBe("Mediterranean-inspired");
    expect(result[0]?.reason).not.toContain("confirmed Desi");
    expect(
      result.some(
        ({ template }) => template.id === "tofu-edamame-rice-bowl",
      ),
    ).toBe(false);
  });

  it("matches avoided foods by words rather than partial words", () => {
    const partialWord = rankAdaptiveMealFits(
      {
        confirmedTemplateIds: [],
        avoidedIngredients: ["to"],
      },
      10,
    );
    expect(
      partialWord.some(({ template }) =>
        template.ingredients.some((ingredient) =>
          ingredient.toLocaleLowerCase().includes("tofu"),
        ),
      ),
    ).toBe(true);

    const wholeWord = rankAdaptiveMealFits(
      {
        confirmedTemplateIds: [],
        avoidedIngredients: ["egg"],
      },
      10,
    );
    expect(
      wholeWord.some(({ template }) =>
        template.ingredients.some((ingredient) =>
          /\begg\b/iu.test(ingredient),
        ),
      ),
    ).toBe(false);
  });
});
