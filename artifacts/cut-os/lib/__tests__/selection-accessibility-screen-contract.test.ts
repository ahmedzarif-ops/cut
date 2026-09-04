import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const onboardingScreenSource = readFileSync(
  resolve(testDirectory, "../../app/(app)/onboarding.tsx"),
  "utf8",
);
const settingsScreenSource = readFileSync(
  resolve(testDirectory, "../../app/(app)/settings.tsx"),
  "utf8",
);
const subscriptionScreenSource = readFileSync(
  resolve(testDirectory, "../../app/(app)/subscription.tsx"),
  "utf8",
);

function styleBlock(source: string, name: string) {
  const start = source.indexOf(`    ${name}: {`);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = source.indexOf("\n    },", start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("selection accessibility screen contracts", () => {
  it("keeps onboarding choices visibly selected without color and at least 44 points tall", () => {
    expect(onboardingScreenSource).toContain("accessibilityLabel={label}");
    expect(onboardingScreenSource).toContain('{active ? "✓ " : ""}');
    expect(onboardingScreenSource).toContain(
      "accessibilityState={{ selected: active, disabled: busy }}",
    );
    expect(styleBlock(onboardingScreenSource, "chip")).toContain(
      "minHeight: 44",
    );
  });

  it("keeps Settings unit choices visibly selected and at least 44 points tall", () => {
    expect(settingsScreenSource).toContain("accessibilityLabel={label}");
    expect(settingsScreenSource).toContain('{active ? "✓ " : ""}');
    expect(settingsScreenSource).toContain("selected: active");

    const minHeight = styleBlock(settingsScreenSource, "unitButton").match(
      /minHeight:\s*(\d+)/u,
    )?.[1];
    expect(Number(minHeight)).toBeGreaterThanOrEqual(44);
  });

  it("keeps an explicit visible mark inside the selected subscription radio", () => {
    expect(subscriptionScreenSource).toContain(
      "accessibilityState={{ checked: selected }}",
    );
    expect(subscriptionScreenSource).toContain(
      "{selected ? <Text style={s.radioCheck}>✓</Text> : null}",
    );
    expect(subscriptionScreenSource).toContain("accessibilityElementsHidden");
    expect(subscriptionScreenSource).toContain(
      'importantForAccessibility="no-hide-descendants"',
    );
  });
});
