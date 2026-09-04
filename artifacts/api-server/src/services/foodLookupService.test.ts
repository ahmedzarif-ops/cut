import { describe, expect, it } from "vitest";

import { HttpError } from "../lib/httpError";
import {
  lookupBarcodeFood,
  parseOpenFoodFactsProduct,
} from "./foodLookupService";

describe("barcode food lookup", () => {
  it("turns an Open Food Facts serving into a review-required snapshot", () => {
    expect(
      parseOpenFoodFactsProduct("012345678905", {
        status: 1,
        product: {
          product_name: "Greek Yogurt",
          brands: "Example Brand",
          serving_size: "170 g",
          nutriments: {
            "energy-kcal_serving": 120,
            proteins_serving: 17,
            carbohydrates_serving: 8,
            fat_serving: 2,
            fiber_serving: 0,
          },
        },
      }),
    ).toEqual({
      barcode: "012345678905",
      name: "Greek Yogurt",
      brand: "Example Brand",
      servingDescription: "170 g",
      caloriesKcal: 120,
      proteinG: 17,
      carbsG: 8,
      fatG: 2,
      fiberG: 0,
      dataSource: "Open Food Facts",
      requiresReview: true,
    });
  });

  it("uses the 100 gram basis when serving nutrition is absent", () => {
    expect(
      parseOpenFoodFactsProduct("12345678", {
        status: 1,
        product: {
          generic_name: "Canned beans",
          nutriments: {
            "energy-kcal_100g": 91,
            proteins_100g: 6,
            carbohydrates_100g: 14,
            fat_100g: 0.5,
            fiber_100g: 5,
          },
        },
      }),
    ).toMatchObject({ servingDescription: "100 g", caloriesKcal: 91 });
  });

  it("fails closed for malformed barcodes and missing nutrition", async () => {
    await expect(lookupBarcodeFood("abc", fetch)).rejects.toMatchObject({
      statusCode: 400,
    });
    const fakeFetch = async () =>
      new Response(JSON.stringify({ status: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    await expect(
      lookupBarcodeFood("012345678905", fakeFetch as typeof fetch),
    ).rejects.toBeInstanceOf(HttpError);
  });
});
