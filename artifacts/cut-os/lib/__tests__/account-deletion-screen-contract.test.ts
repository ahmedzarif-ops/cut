import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const settingsScreenSource = readFileSync(
  resolve(testDirectory, "../../app/(app)/settings.tsx"),
  "utf8",
);

describe("account-deletion subscription disclosure contract", () => {
  it("keeps the Apple billing-continuation warning visible before deletion", () => {
    expect(settingsScreenSource).toMatch(
      /Deleting CUT OS does not cancel billing through Apple\.\s*Manage or\s*cancel separately in App Store subscription settings\./u,
    );
    expect(settingsScreenSource).toContain(
      '"This permanently deletes your CUT OS account and fitness data. It does not cancel an App Store subscription—manage that with Apple first if needed."',
    );
  });

  it("keeps Apple subscription management wired beside deletion", () => {
    expect(settingsScreenSource).toContain(
      'const APP_STORE_SUBSCRIPTIONS_URL =\n  "https://apps.apple.com/account/subscriptions";',
    );
    expect(settingsScreenSource).toMatch(
      /await WebBrowser\.openBrowserAsync\(\s*subscription\?\.managementUrl \?\? APP_STORE_SUBSCRIPTIONS_URL,?\s*\)/u,
    );
    expect(settingsScreenSource).toContain(
      'accessibilityLabel="Manage App Store subscription"',
    );
    expect(settingsScreenSource).toContain(
      "onPress={() => void openSubscriptions()}",
    );
    expect(settingsScreenSource).toContain("Manage App Store subscription");
  });

  it("keeps account deletion explicit, confirmable, and destructive", () => {
    expect(settingsScreenSource).toMatch(
      /Alert\.alert\(\s*"Delete your CUT OS account\?",[\s\S]*?\{ text: "Cancel", style: "cancel" \},[\s\S]*?text: "Delete account",\s*style: "destructive",\s*onPress: \(\) => void runDeletion\(\),[\s\S]*?\],\s*\);/u,
    );
  });
});
