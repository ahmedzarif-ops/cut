import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  APP_STORE_69_MINIMUM_PORTRAIT_HEIGHT_POINTS,
  APP_STORE_69_PORTRAIT_VIEWPORTS,
  isSubscriptionOfferReadyLayoutEligible,
  SUBSCRIPTION_OFFER_READY_LAYOUT,
  subscriptionOfferReadyVerticalBudgetPoints,
} from "../subscription-offer-layout";

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
    expect(subscriptionScreenSource).toContain(
      "const billing = formatPlanBilling(",
    );
    expect(subscriptionScreenSource).toMatch(
      /<Text[\s\S]*?style=\{s\.planPrice\}[\s\S]*?>\s*\{billing\}\s*<\/Text>/u,
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
      'accessibilityLabel="Manage App Store subscription"',
    );
    expect(subscriptionScreenSource).toContain("onPress={() => void manage()}");
  });

  it("keeps the automatic-renewal and cancellation disclosure visible", () => {
    expect(subscriptionScreenSource).toMatch(
      /auto-renewable subscription\s*renews until canceled\.\s*Manage or cancel in App Store settings\./u,
    );
  });

  it("covers every accepted 6.9-inch portrait viewport", () => {
    expect(APP_STORE_69_PORTRAIT_VIEWPORTS).toEqual([
      { widthPoints: 420, heightPoints: 912 },
      { widthPoints: 430, heightPoints: 932 },
      { widthPoints: 440, heightPoints: 956 },
    ]);
    expect(APP_STORE_69_MINIMUM_PORTRAIT_HEIGHT_POINTS).toBe(912);
    expect(
      SUBSCRIPTION_OFFER_READY_LAYOUT.minimumCompactViewportHeightPoints,
    ).toBe(APP_STORE_69_MINIMUM_PORTRAIT_HEIGHT_POINTS);

    for (const viewport of APP_STORE_69_PORTRAIT_VIEWPORTS) {
      expect(
        isSubscriptionOfferReadyLayoutEligible({
          readyOfferVisible: true,
          viewportWidthPoints: viewport.widthPoints,
          viewportHeightPoints: viewport.heightPoints,
          fontScale: 1,
        }),
      ).toBe(true);
    }
  });

  it("keeps the settled offer inside every accepted vertical budget", () => {
    const layout = SUBSCRIPTION_OFFER_READY_LAYOUT;
    const budget = subscriptionOfferReadyVerticalBudgetPoints();

    for (const { heightPoints } of APP_STORE_69_PORTRAIT_VIEWPORTS) {
      expect(budget).toBeLessThanOrEqual(heightPoints - 120);
    }
    for (const target of [
      layout.topActionMinHeight,
      layout.purchaseButtonMinHeight,
      layout.secondaryButtonMinHeight,
      layout.legalLinkMinHeight,
      layout.signOutButtonMinHeight,
    ]) {
      expect(target).toBeGreaterThanOrEqual(44);
    }

    for (const binding of [
      "compactReadyLayout && s.readyContainer",
      "compactReadyLayout && s.readyTopRow",
      "compactReadyLayout && s.readyTitle",
      "compactReadyLayout && s.readyPlanList",
      "compactReadyLayout && s.readyPlanCard",
      "compactReadyLayout && s.readyPrimaryButton",
      "compactReadyLayout && s.readySecondaryActions",
      "compactReadyLayout && s.readySecondaryButton",
      "compactReadyLayout && s.readyDisclosure",
      "compactReadyLayout && s.readySignOutButton",
    ]) {
      expect(subscriptionScreenSource).toContain(binding);
    }
    expect(subscriptionScreenSource).toContain("{!readyOfferVisible ? (");
    expect(subscriptionScreenSource).toContain(
      "isSubscriptionOfferReadyLayoutEligible({",
    );
    expect(subscriptionScreenSource).toContain(
      "viewportWidthPoints: viewportWidth",
    );
    expect(subscriptionScreenSource).toContain(
      "viewportHeightPoints: viewportHeight",
    );
    expect(subscriptionScreenSource).toContain("{plan.description}");
    expect(subscriptionScreenSource).toContain(
      "SUBSCRIPTION_OFFER_READY_LAYOUT.planDescriptionMaximumLines",
    );
    for (const maximumLineBinding of [
      "titleMaximumLines",
      "planTitleMaximumLines",
      "planDescriptionMaximumLines",
      "planPriceMaximumLines",
      "introductoryTextMaximumLines",
      "purchaseLabelMaximumLines",
      "disclosureMaximumLines",
    ]) {
      expect(subscriptionScreenSource).toContain(
        `SUBSCRIPTION_OFFER_READY_LAYOUT.${maximumLineBinding}`,
      );
    }
    expect(subscriptionScreenSource.match(/onTextLayout=/gu)).toHaveLength(7);
    expect(subscriptionScreenSource).toContain(
      "setCompactOverflowDetected(true)",
    );
    expect(subscriptionScreenSource.match(/numberOfLines=/gu)).toHaveLength(3);
    expect(
      subscriptionScreenSource.match(
        /numberOfLines=\{compactReadyLayout \? 2 : undefined\}/gu,
      ),
    ).toHaveLength(3);
    expect(legalSupportLinksSource).toContain(
      `compactContainer: { marginTop: ${layout.legalLinksMarginTop} }`,
    );
    expect(legalSupportLinksSource).toMatch(
      new RegExp(
        `compactLink: \\{[\\s\\S]*?minHeight: ${layout.legalLinkMinHeight},`,
        "u",
      ),
    );
    expect(subscriptionScreenSource).toContain("<ScrollView");
  });

  it("falls back to scrolling without hiding mandatory offer disclosures", () => {
    const layout = SUBSCRIPTION_OFFER_READY_LAYOUT;
    expect(
      isSubscriptionOfferReadyLayoutEligible({
        readyOfferVisible: false,
        viewportWidthPoints: layout.minimumCompactViewportWidthPoints,
        viewportHeightPoints: layout.minimumCompactViewportHeightPoints,
        fontScale: 1,
      }),
    ).toBe(false);
    expect(
      isSubscriptionOfferReadyLayoutEligible({
        readyOfferVisible: true,
        viewportWidthPoints: layout.minimumCompactViewportWidthPoints,
        viewportHeightPoints: layout.minimumCompactViewportHeightPoints - 1,
        fontScale: 1,
      }),
    ).toBe(false);
    expect(
      isSubscriptionOfferReadyLayoutEligible({
        readyOfferVisible: true,
        viewportWidthPoints: layout.minimumCompactViewportWidthPoints - 1,
        viewportHeightPoints: layout.minimumCompactViewportHeightPoints,
        fontScale: 1,
      }),
    ).toBe(false);
    expect(
      isSubscriptionOfferReadyLayoutEligible({
        readyOfferVisible: true,
        viewportWidthPoints: layout.minimumCompactViewportWidthPoints,
        viewportHeightPoints: layout.minimumCompactViewportHeightPoints,
        fontScale: layout.maximumCompactFontScale + 0.01,
      }),
    ).toBe(false);

    expect(subscriptionScreenSource).toContain("<ScrollView");
    expect(subscriptionScreenSource).toContain(
      "style={[s.disclosure, compactReadyLayout && s.readyDisclosure]}",
    );
    expect(subscriptionScreenSource).toMatch(
      /Payment is charged to your Apple ID\.[\s\S]*?auto-renewable subscription[\s\S]*?renews until canceled\.[\s\S]*?<LegalSupportLinks variant="compact" \/>/u,
    );
    expect(subscriptionScreenSource).toContain(
      'accessibilityLabel="Restore purchases"',
    );
    expect(subscriptionScreenSource).toContain(
      'accessibilityLabel="Manage App Store subscription"',
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
