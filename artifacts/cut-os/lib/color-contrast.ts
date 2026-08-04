function parseHexColor(color: string): [number, number, number] {
  const normalized = color.trim().replace(/^#/, "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => character.repeat(2))
          .join("")
      : normalized;

  if (!/^[0-9a-f]{6}$/i.test(expanded)) {
    throw new Error(`Unsupported hex color: ${color}`);
  }

  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ];
}

function relativeLuminance(color: string): number {
  const channels = parseHexColor(color).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

/** Returns the WCAG contrast ratio between two opaque hexadecimal colors. */
export function contrastRatio(first: string, second: string): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}
