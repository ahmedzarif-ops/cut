/**
 * App Store Connect's accepted 6.9-inch portrait slots, expressed in points.
 * All three are 3x captures: 1260x2736, 1290x2796, and 1320x2868 pixels.
 */
export const APP_STORE_69_PORTRAIT_VIEWPORTS = Object.freeze([
  Object.freeze({ widthPoints: 420, heightPoints: 912 }),
  Object.freeze({ widthPoints: 430, heightPoints: 932 }),
  Object.freeze({ widthPoints: 440, heightPoints: 956 }),
]);

export const APP_STORE_69_MINIMUM_PORTRAIT_HEIGHT_POINTS = Math.min(
  ...APP_STORE_69_PORTRAIT_VIEWPORTS.map(({ heightPoints }) => heightPoints),
);

export const SUBSCRIPTION_OFFER_READY_LAYOUT = Object.freeze({
  minimumCompactViewportWidthPoints: 400,
  minimumCompactViewportHeightPoints:
    APP_STORE_69_MINIMUM_PORTRAIT_HEIGHT_POINTS,
  maximumCompactFontScale: 1.2,
  maximumTopSafeAreaPoints: 62,
  maximumBottomSafeAreaPoints: 34,
  containerTopPadding: 8,
  containerBottomPadding: 8,
  topActionMinHeight: 44,
  topRowMarginBottom: 4,
  titleLineHeight: 34,
  titleMaximumLines: 2,
  planListMarginTop: 10,
  planListMarginBottom: 10,
  planCardVerticalPadding: 12,
  planTitleLineHeight: 20,
  planTitleMaximumLines: 2,
  planDescriptionMarginTop: 3,
  planDescriptionLineHeight: 17,
  planDescriptionMaximumLines: 2,
  planPriceMarginTop: 6,
  planPriceLineHeight: 20,
  planPriceMaximumLines: 1,
  introductoryTextMarginTop: 3,
  introductoryTextLineHeight: 16,
  introductoryTextMaximumLines: 2,
  purchaseButtonMinHeight: 52,
  purchaseLabelMaximumLines: 2,
  secondaryActionsMarginTop: 6,
  secondaryButtonMinHeight: 44,
  disclosureMarginTop: 8,
  disclosureLineHeight: 15,
  disclosureMaximumLines: 5,
  legalLinksMarginTop: 12,
  legalLinkMinHeight: 44,
  signOutMarginTop: 4,
  signOutButtonMinHeight: 44,
});

type SubscriptionOfferReadyLayoutEligibility = Readonly<{
  readyOfferVisible: boolean;
  viewportWidthPoints: number;
  viewportHeightPoints: number;
  fontScale: number;
}>;

/**
 * Uses the bounded one-plan layout for every accepted App Store viewport.
 * Shorter or narrower devices, larger text, and measured line overflow retain
 * the surrounding ScrollView and its unbounded mandatory disclosure text.
 */
export function isSubscriptionOfferReadyLayoutEligible({
  readyOfferVisible,
  viewportWidthPoints,
  viewportHeightPoints,
  fontScale,
}: SubscriptionOfferReadyLayoutEligibility) {
  const layout = SUBSCRIPTION_OFFER_READY_LAYOUT;
  return (
    readyOfferVisible &&
    viewportWidthPoints >= layout.minimumCompactViewportWidthPoints &&
    viewportHeightPoints >= layout.minimumCompactViewportHeightPoints &&
    fontScale <= layout.maximumCompactFontScale
  );
}

/**
 * Conservative maximum for the settled one-plan offer, including an
 * introductory-offer row even though CUT OS v1 has no introductory offer.
 */
export function subscriptionOfferReadyVerticalBudgetPoints() {
  const layout = SUBSCRIPTION_OFFER_READY_LAYOUT;
  return (
    layout.maximumTopSafeAreaPoints +
    layout.containerTopPadding +
    layout.topActionMinHeight +
    layout.topRowMarginBottom +
    layout.titleLineHeight * layout.titleMaximumLines +
    layout.planListMarginTop +
    layout.planCardVerticalPadding * 2 +
    layout.planTitleLineHeight * layout.planTitleMaximumLines +
    layout.planDescriptionMarginTop +
    layout.planDescriptionLineHeight * layout.planDescriptionMaximumLines +
    layout.planPriceMarginTop +
    layout.planPriceLineHeight * layout.planPriceMaximumLines +
    layout.introductoryTextMarginTop +
    layout.introductoryTextLineHeight * layout.introductoryTextMaximumLines +
    layout.planListMarginBottom +
    layout.purchaseButtonMinHeight +
    layout.secondaryActionsMarginTop +
    layout.secondaryButtonMinHeight +
    layout.disclosureMarginTop +
    layout.disclosureLineHeight * layout.disclosureMaximumLines +
    layout.legalLinksMarginTop +
    layout.legalLinkMinHeight +
    layout.signOutMarginTop +
    layout.signOutButtonMinHeight +
    layout.maximumBottomSafeAreaPoints +
    layout.containerBottomPadding
  );
}
