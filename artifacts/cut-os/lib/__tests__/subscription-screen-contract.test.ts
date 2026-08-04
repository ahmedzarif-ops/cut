import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const subscriptionScreenSource = readFileSync(
  resolve(testDirectory, "../../app/(app)/subscription.tsx"),
  "utf8",
);
const legalSupportLinksSource = readFileSync(
  resolve(testDirectory, "../../components/LegalSupportLinks.tsx"),
  "utf8",
);
const legalLinksSource = readFileSync(
  resolve(testDirectory, "../legal-links.ts"),
  "utf8",
);

const HARDCODED_DOLLAR_PRICE = /(?:\$\s*|USD\s*)\d+(?:[.,]\d{1,2})?\b/iu;
const HARDCODED_TRIAL_CLAIM =
  /\b(?:free\s+trial|try\s+(?:CUT\s+OS\s+)?free|(?:\d+|one|two|three|seven|fourteen|thirty)\s*[- ]?\s*(?:day|week|month)s?\s+(?:free|trial)|free\s+for\s+(?:\d+|one|two|three|seven|fourteen|thirty)\s+(?:day|week|month)s?)\b/iu;

describe("subscription screen App Store contract", () => {
  it("renders StoreKit-localized price and period data without hardcoded offers", () => {
    expect(subscriptionScreenSource).toContain(
      'import { formatPlanBilling } from "@/lib/subscription";',
    );
    expect(subscriptionScreenSource).toMatch(
      /<Text\s+style=\{s\.planPrice\}>\s*\{formatPlanBilling\(\s*plan\.priceString,\s*plan\.subscriptionPeriod,?\s*\)\}\s*<\/Text>/u,
    );
    expect(subscriptionScreenSource).toContain("{plan.introductoryText ? (");
    expect(subscriptionScreenSource).not.toMatch(HARDCODED_DOLLAR_PRICE);
    expect(subscriptionScreenSource).not.toMatch(HARDCODED_TRIAL_CLAIM);
  });

  it("keeps restore and App Store subscription-management controls wired", () => {
    expect(subscriptionScreenSource).toContain(
      'accessibilityLabel="Restore purchases"',
    );
    expect(subscriptionScreenSource).toContain(
      "onPress={() => void restore()}",
    );
    expect(subscriptionScreenSource).toContain("await subscription.restore();");
    expect(subscriptionScreenSource).toContain(
      "await WebBrowser.openBrowserAsync(subscription.managementUrl);",
    );
    expect(subscriptionScreenSource).toContain(
      "<Text style={s.secondaryButtonText}>Manage subscription</Text>",
    );
    expect(subscriptionScreenSource).toContain("onPress={() => void manage()}");
  });

  it("keeps the automatic-renewal and cancellation disclosure visible", () => {
    expect(subscriptionScreenSource).toMatch(
      /Subscriptions renew automatically until canceled\.\s*Manage or cancel in\s*App Store settings\./u,
    );
  });

  it("keeps Privacy Policy, Terms of Use, and Support controls", () => {
    expect(subscriptionScreenSource).toContain(
      'import { LegalSupportLinks } from "@/components/LegalSupportLinks";',
    );
    expect(subscriptionScreenSource).toMatch(
      /<LegalSupportLinks\s+variant="compact"\s+\/>/u,
    );
    expect(legalSupportLinksSource).toContain("includedIds = LEGAL_LINK_IDS");
    expect(legalLinksSource).toMatch(
      /LEGAL_LINK_IDS\s*=\s*\[\s*"privacyPolicy",\s*"terms",\s*"support",?\s*\]\s*as const/u,
    );
    expect(legalLinksSource).toContain('label: "Privacy Policy"');
    expect(legalLinksSource).toContain('label: "Terms of Use"');
    expect(legalLinksSource).toContain('label: "Support"');
  });
});
