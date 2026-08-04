import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testDirectory = dirname(fileURLToPath(import.meta.url));

function screenSource(path: string) {
  return readFileSync(resolve(testDirectory, path), "utf8");
}

const rootLayoutSource = screenSource("../../app/_layout.tsx");
const onboardingSource = screenSource("../../app/(app)/onboarding.tsx");
const todaySource = screenSource("../../app/(app)/today.tsx");
const settingsSource = screenSource("../../app/(app)/settings.tsx");
const subscriptionSource = screenSource("../../app/(app)/subscription.tsx");
const errorFallbackSource = screenSource("../../components/ErrorFallback.tsx");

function styleBlock(source: string, name: string) {
  const start = source.indexOf(`    ${name}: {`);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = source.indexOf("\n    },", start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

function expectNamedButton(source: string, label: string) {
  const labelIndex = source.indexOf(`accessibilityLabel="${label}"`);
  expect(labelIndex).toBeGreaterThanOrEqual(0);
  expect(source.slice(labelIndex, labelIndex + 160)).toContain(
    'accessibilityRole="button"',
  );
}

describe("iOS UI accessibility screen contracts", () => {
  it("keeps the adaptive status bar mounted outside Clerk launch errors", () => {
    const statusBar =
      "<StatusBar style={resolveClerkLaunchStatusBarStyle(launchFallback)} />";
    const statusBarIndex = rootLayoutSource.indexOf(statusBar);
    const launchBoundaryIndex = rootLayoutSource.indexOf(
      "<ErrorBoundary FallbackComponent={LaunchErrorScreen}>",
    );

    expect(statusBarIndex).toBeGreaterThanOrEqual(0);
    expect(launchBoundaryIndex).toBeGreaterThan(statusBarIndex);

    const launchErrorStart = rootLayoutSource.indexOf(
      "function LaunchErrorScreen",
    );
    const rootLayoutStart = rootLayoutSource.indexOf(
      "export default function RootLayout",
    );
    expect(rootLayoutSource.slice(launchErrorStart, rootLayoutStart)).toContain(
      '<StatusBar style="light" />',
    );
    expect(rootLayoutSource).toContain(
      'if (launchDecision.surface === "asset_loading") {\n    return <StatusBar style="light" />;',
    );
  });

  it("names the onboarding recovery and cancellation buttons", () => {
    expect(onboardingSource).toContain(
      'accessibilityLabel="Retry loading profile"\n        accessibilityRole="button"',
    );
    expectNamedButton(onboardingSource, "Cancel profile changes");
    expect(onboardingSource).toContain(
      'accessibilityLabel="Cancel profile changes"\n          accessibilityRole="button"\n          accessibilityState={{ disabled: busy }}',
    );
    expect(styleBlock(onboardingSource, "secondaryButton")).toContain(
      "minHeight: 44",
    );
  });

  it("names Today actions and guarantees the cancel target is 44 points", () => {
    for (const label of [
      "Cancel editing weigh-in",
      "Retry loading account",
      "Start onboarding",
      "Retry loading Today",
      "Update today's weigh-in",
      "Edit profile",
    ]) {
      expectNamedButton(todaySource, label);
    }

    expect(styleBlock(todaySource, "cancelButton")).toContain("minHeight: 44");
  });

  it("exposes the restart fallback as a named button", () => {
    expectNamedButton(errorFallbackSource, "Restart CUT OS");
  });

  it("announces disabled states for Settings recovery controls", () => {
    expect(settingsSource).toMatch(
      /accessibilityLabel=\{[\s\S]*?"Back to Today"[\s\S]*?accessibilityState=\{\{ disabled: busy \}\}[\s\S]*?disabled=\{busy\}/u,
    );
    expect(settingsSource).toContain(
      'accessibilityLabel="Retry loading weight unit settings"\n            accessibilityRole="button"\n            accessibilityState={{ disabled: busy }}\n            disabled={busy}',
    );
  });

  it("names subscription management and announces when it is disabled", () => {
    expect(subscriptionSource).toContain(
      'accessibilityLabel="Manage App Store subscription"\n          accessibilityRole="link"\n          accessibilityState={{ disabled: actionBusy }}\n          disabled={actionBusy}',
    );
  });
});
