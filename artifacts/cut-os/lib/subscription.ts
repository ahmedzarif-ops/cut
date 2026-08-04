export const CUT_OS_PRO_ENTITLEMENT_ID = "CUT_OS_PRO" as const;

export const APPLE_SUBSCRIPTION_MANAGEMENT_URL =
  "https://apps.apple.com/account/subscriptions";

export interface StoreIntroductoryOffer {
  price: number;
  priceString: string;
  period: string;
  cycles: number;
}

export interface StorePlan {
  packageIdentifier: string;
  productIdentifier: string;
  title: string;
  description: string;
  priceString: string;
  subscriptionPeriod: string | null;
  periodLabel: string | null;
  introductoryText: string | null;
}

export interface StoreCustomerSnapshot {
  hasProEntitlement: boolean;
  managementUrl: string | null;
}

export interface ServerSubscriptionSnapshot {
  entitled: boolean;
  entitlementId: string;
  expiresAt: string | null;
  managementUrl: string | null;
}

export type ResolvedServerSubscription =
  | { state: "loading" }
  | { state: "unavailable" }
  | {
      state: "ready";
      entitled: boolean;
      expiresAt: string | null;
      managementUrl: string | null;
    };

export type SubscriptionRouteDecision =
  | "allow"
  | "loading"
  | "unavailable"
  | "redirect_subscription"
  | "redirect_onboarding"
  | "redirect_today";

export type PurchaseCapability =
  | { available: true }
  | {
      available: false;
      reason: "ios_only" | "expo_go" | "configuration_missing";
    };

export function resolvePurchaseCapability({
  platform,
  isExpoGo,
  apiKey,
}: {
  platform: string;
  isExpoGo: boolean;
  apiKey: string | undefined;
}): PurchaseCapability {
  if (platform !== "ios") return { available: false, reason: "ios_only" };
  if (isExpoGo) return { available: false, reason: "expo_go" };
  if (!apiKey) {
    return { available: false, reason: "configuration_missing" };
  }
  return { available: true };
}

export function isInternalUserUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function resolveServerSubscription(
  value: ServerSubscriptionSnapshot | undefined,
  isError: boolean,
): ResolvedServerSubscription {
  if (isError) return { state: "unavailable" };
  if (!value) return { state: "loading" };
  if (value.entitlementId !== CUT_OS_PRO_ENTITLEMENT_ID) {
    return { state: "unavailable" };
  }

  return {
    state: "ready",
    entitled: value.entitled === true,
    expiresAt: value.expiresAt,
    managementUrl: safeHttpsUrl(value.managementUrl),
  };
}

export function decideSubscriptionRoute({
  route,
  subscription,
  onboardingComplete,
}: {
  route: "settings" | "subscription" | "paid";
  subscription: ResolvedServerSubscription;
  onboardingComplete: boolean;
}): SubscriptionRouteDecision {
  if (route === "settings") return "allow";
  if (subscription.state === "loading") return "loading";
  if (subscription.state === "unavailable") return "unavailable";

  if (!subscription.entitled) {
    return route === "subscription" ? "allow" : "redirect_subscription";
  }

  if (route !== "subscription") return "allow";
  return onboardingComplete ? "redirect_today" : "redirect_onboarding";
}

export function formatSubscriptionPeriod(period: string | null): string | null {
  const parsed = parseSubscriptionPeriod(period);
  if (!parsed) return null;
  return formatPeriodCount(parsed.count, parsed.unit);
}

export function formatIntroductoryOffer(
  offer: StoreIntroductoryOffer | null,
  eligible: boolean,
  standardPriceString: string,
  standardSubscriptionPeriod: string | null,
): string | null {
  if (!offer || !eligible) return null;
  const period = parseSubscriptionPeriod(offer.period);
  const standardPeriod = formatSubscriptionPeriod(standardSubscriptionPeriod);
  if (
    !period ||
    !standardPriceString.trim() ||
    !standardPeriod ||
    !Number.isSafeInteger(offer.cycles) ||
    offer.cycles < 1
  ) {
    return null;
  }

  const duration = formatPeriodCount(period.count * offer.cycles, period.unit);
  const offerDescription =
    offer.price === 0
      ? `Free for ${duration}`
      : `${offer.priceString} per ${formatPeriodCount(period.count, period.unit)} for ${offer.cycles} billing ${offer.cycles === 1 ? "period" : "periods"}`;
  return `${offerDescription}, then ${standardPriceString} per ${standardPeriod}`;
}

export function formatPlanBilling(
  priceString: string,
  subscriptionPeriod: string | null,
): string {
  const period = formatSubscriptionPeriod(subscriptionPeriod);
  return period ? `${priceString} per ${period}` : priceString;
}

export function safeHttpsUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

function parseSubscriptionPeriod(
  period: string | null,
): { count: number; unit: "day" | "week" | "month" | "year" } | null {
  if (!period) return null;
  const match = /^P(\d+)(D|W|M|Y)$/.exec(period);
  if (!match) return null;
  const count = Number(match[1]);
  if (!Number.isSafeInteger(count) || count < 1) return null;
  const unit =
    match[2] === "D"
      ? "day"
      : match[2] === "W"
        ? "week"
        : match[2] === "M"
          ? "month"
          : "year";
  return { count, unit };
}

function formatPeriodCount(
  count: number,
  unit: "day" | "week" | "month" | "year",
): string {
  return count === 1 ? unit : `${count} ${unit}s`;
}
