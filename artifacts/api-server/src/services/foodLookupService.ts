import { HttpError } from "../lib/httpError";

export interface BarcodeFood {
  barcode: string;
  name: string;
  brand: string | null;
  servingDescription: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  dataSource: "Open Food Facts";
  requiresReview: true;
}

interface OpenFoodFactsProduct {
  product_name?: unknown;
  generic_name?: unknown;
  brands?: unknown;
  serving_size?: unknown;
  nutriments?: unknown;
}

interface OpenFoodFactsResponse {
  status?: unknown;
  product?: OpenFoodFactsProduct;
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function boundedNutrition(
  nutriments: Record<string, unknown>,
  key: string,
  maximum: number,
): number {
  const value = nutriments[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.min(value, maximum);
}

export function parseOpenFoodFactsProduct(
  barcode: string,
  payload: OpenFoodFactsResponse,
): BarcodeFood | null {
  if (payload.status !== 1 || !payload.product) return null;
  const name =
    cleanText(payload.product.product_name, 120) ??
    cleanText(payload.product.generic_name, 120);
  const nutriments = payload.product.nutriments;
  if (!name || typeof nutriments !== "object" || nutriments === null) {
    return null;
  }
  const values = nutriments as Record<string, unknown>;
  const servingCalories = boundedNutrition(
    values,
    "energy-kcal_serving",
    10_000,
  );
  const basis = servingCalories > 0 ? "serving" : "100g";
  const caloriesKcal =
    servingCalories > 0
      ? servingCalories
      : boundedNutrition(values, "energy-kcal_100g", 10_000);
  if (caloriesKcal <= 0) return null;

  return {
    barcode,
    name,
    brand: cleanText(payload.product.brands, 120),
    servingDescription:
      basis === "serving"
        ? (cleanText(payload.product.serving_size, 120) ?? "1 serving")
        : "100 g",
    caloriesKcal,
    proteinG: boundedNutrition(values, `proteins_${basis}`, 1_000),
    carbsG: boundedNutrition(values, `carbohydrates_${basis}`, 1_000),
    fatG: boundedNutrition(values, `fat_${basis}`, 1_000),
    fiberG: boundedNutrition(values, `fiber_${basis}`, 1_000),
    dataSource: "Open Food Facts",
    requiresReview: true,
  };
}

export async function lookupBarcodeFood(
  barcode: string,
  fetcher: typeof fetch = fetch,
): Promise<BarcodeFood> {
  if (!/^\d{6,14}$/.test(barcode)) {
    throw new HttpError(400, "Invalid barcode");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6_000);
  try {
    const fields = [
      "product_name",
      "generic_name",
      "brands",
      "serving_size",
      "nutriments",
    ].join(",");
    const response = await fetcher(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}?fields=${encodeURIComponent(fields)}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "CUT-OS/1.0 (https://getcutos.com)",
        },
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      throw new HttpError(503, "Barcode lookup is temporarily unavailable");
    }
    const parsed = parseOpenFoodFactsProduct(
      barcode,
      (await response.json()) as OpenFoodFactsResponse,
    );
    if (!parsed) {
      throw new HttpError(404, "Food or nutrition not found for this barcode");
    }
    return parsed;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(503, "Barcode lookup is temporarily unavailable");
  } finally {
    clearTimeout(timeout);
  }
}
