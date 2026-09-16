import identityRecord from "./subscriptionIdentity.json";

interface SubscriptionIdentity {
  readonly schemaVersion: 1;
  readonly iosBundleId: string;
  readonly revenueCat: {
    readonly entitlementId: string;
    readonly offeringId: string;
    readonly productId: string;
  };
}

function isIdentifier(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value === value.trim() &&
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(value)
  );
}

function readIdentity(value: unknown): SubscriptionIdentity {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(",") !==
      "iosBundleId,revenueCat,schemaVersion"
  ) {
    throw new Error("Invalid CUT OS subscription identity contract");
  }

  const candidate = value as Record<string, unknown>;
  const revenueCat = candidate.revenueCat;
  if (
    candidate.schemaVersion !== 1 ||
    !isIdentifier(candidate.iosBundleId) ||
    typeof revenueCat !== "object" ||
    revenueCat === null ||
    Array.isArray(revenueCat) ||
    Object.keys(revenueCat).sort().join(",") !==
      "entitlementId,offeringId,productId"
  ) {
    throw new Error("Invalid CUT OS subscription identity contract");
  }

  const revenueCatRecord = revenueCat as Record<string, unknown>;
  if (
    !isIdentifier(revenueCatRecord.entitlementId) ||
    !isIdentifier(revenueCatRecord.offeringId) ||
    !isIdentifier(revenueCatRecord.productId) ||
    !revenueCatRecord.productId.startsWith(`${candidate.iosBundleId}.`)
  ) {
    throw new Error("Invalid CUT OS subscription identity contract");
  }

  return Object.freeze({
    schemaVersion: 1,
    iosBundleId: candidate.iosBundleId,
    revenueCat: Object.freeze({
      entitlementId: revenueCatRecord.entitlementId,
      offeringId: revenueCatRecord.offeringId,
      productId: revenueCatRecord.productId,
    }),
  });
}

/** Public identifiers shared by the iOS binary and production API. */
export const CUT_OS_SUBSCRIPTION_IDENTITY = readIdentity(identityRecord);
export const CUT_OS_IOS_BUNDLE_ID = CUT_OS_SUBSCRIPTION_IDENTITY.iosBundleId;
export const CUT_OS_REVENUECAT_ENTITLEMENT_ID =
  CUT_OS_SUBSCRIPTION_IDENTITY.revenueCat.entitlementId;
export const CUT_OS_REVENUECAT_OFFERING_ID =
  CUT_OS_SUBSCRIPTION_IDENTITY.revenueCat.offeringId;
export const CUT_OS_APP_STORE_SUBSCRIPTION_PRODUCT_ID =
  CUT_OS_SUBSCRIPTION_IDENTITY.revenueCat.productId;
