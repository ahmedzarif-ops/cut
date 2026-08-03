const POUNDS_PER_KILOGRAM = 2.2046226218;

export function kilogramsToPounds(kilograms: number): number {
  return kilograms * POUNDS_PER_KILOGRAM;
}

export function poundsToKilograms(pounds: number): number {
  return pounds / POUNDS_PER_KILOGRAM;
}

export function roundWeight(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
