import Purchases, {
  INTRO_ELIGIBILITY_STATUS,
  PURCHASES_ERROR_CODE,
  type CustomerInfoUpdateListener,
  type PurchasesPackage,
} from "react-native-purchases";

import {
  createSubscriptionAdapter,
  type RawCustomerInfo,
  type RevenueCatBridge,
} from "./subscription-adapter";

const bridge: RevenueCatBridge = {
  isConfigured: () => Purchases.isConfigured(),
  configure: (apiKey, appUserId) => {
    Purchases.configure({
      apiKey,
      appUserID: appUserId,
      automaticDeviceIdentifierCollectionEnabled: false,
    });
  },
  getAppUserId: () => Purchases.getAppUserID(),
  logIn: (appUserId) => Purchases.logIn(appUserId),
  addCustomerInfoListener: (listener) => {
    Purchases.addCustomerInfoUpdateListener(
      listener as CustomerInfoUpdateListener,
    );
  },
  removeCustomerInfoListener: (listener) => {
    Purchases.removeCustomerInfoUpdateListener(
      listener as CustomerInfoUpdateListener,
    );
  },
  getCustomerInfo: () =>
    Purchases.getCustomerInfo() as Promise<RawCustomerInfo>,
  getCurrentOffering: async () => {
    const offering = (await Purchases.getOfferings()).current;
    if (!offering) return null;
    return {
      identifier: offering.identifier,
      availablePackages: offering.availablePackages.map((item) => ({
        identifier: item.identifier,
        product: {
          identifier: item.product.identifier,
          title: item.product.title,
          description: item.product.description,
          priceString: item.product.priceString,
          subscriptionPeriod: item.product.subscriptionPeriod,
          introPrice: item.product.introPrice,
        },
        nativePackage: item,
      })),
    };
  },
  checkIntroEligibility: async (productIds) => {
    const result =
      await Purchases.checkTrialOrIntroductoryPriceEligibility(productIds);
    return Object.fromEntries(
      Object.entries(result).map(([productId, value]) => [
        productId,
        value.status ===
          INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE,
      ]),
    );
  },
  purchasePackage: async (nativePackage) => {
    const result = await Purchases.purchasePackage(
      nativePackage as PurchasesPackage,
    );
    return result.customerInfo as RawCustomerInfo;
  },
  restorePurchases: () =>
    Purchases.restorePurchases() as Promise<RawCustomerInfo>,
  isPurchaseCancelled: (error) => {
    if (!error || typeof error !== "object") return false;
    const value = error as { code?: unknown; userCancelled?: unknown };
    return (
      value.userCancelled === true ||
      value.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
    );
  },
};

// This singleton is only connected after deletion and adult-eligibility gates
// pass. No RevenueCat method is called by importing this module.
export const revenueCatSubscriptionAdapter = createSubscriptionAdapter(bridge);
