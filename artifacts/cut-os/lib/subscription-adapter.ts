import {
  CUT_OS_PRO_ENTITLEMENT_ID,
  formatIntroductoryOffer,
  formatSubscriptionPeriod,
  safeHttpsUrl,
  type StoreCustomerSnapshot,
  type StoreIntroductoryOffer,
  type StorePlan,
} from "./subscription";

export interface RawCustomerInfo {
  entitlements: { active: Record<string, unknown> };
  managementURL: string | null;
}

export interface RawStorePackage {
  identifier: string;
  product: {
    identifier: string;
    title: string;
    description: string;
    priceString: string;
    subscriptionPeriod: string | null;
    introPrice: StoreIntroductoryOffer | null;
  };
  nativePackage: unknown;
}

export interface RawOffering {
  availablePackages: RawStorePackage[];
}

export interface RevenueCatBridge {
  isConfigured(): Promise<boolean>;
  configure(apiKey: string, appUserId: string): void;
  getAppUserId(): Promise<string>;
  logIn(appUserId: string): Promise<unknown>;
  addCustomerInfoListener(listener: (info: RawCustomerInfo) => void): void;
  removeCustomerInfoListener(listener: (info: RawCustomerInfo) => void): void;
  getCustomerInfo(): Promise<RawCustomerInfo>;
  getCurrentOffering(): Promise<RawOffering | null>;
  checkIntroEligibility(productIds: string[]): Promise<Record<string, boolean>>;
  purchasePackage(nativePackage: unknown): Promise<RawCustomerInfo>;
  restorePurchases(): Promise<RawCustomerInfo>;
  isPurchaseCancelled(error: unknown): boolean;
}

export interface SubscriptionConnection {
  customer: StoreCustomerSnapshot;
}

export type PurchaseResult =
  | { status: "cancelled" }
  | { status: "completed"; customer: StoreCustomerSnapshot };

export class SubscriptionAdapterError extends Error {
  readonly name = "SubscriptionAdapterError";

  constructor(
    readonly code:
      | "unavailable"
      | "principal_changed"
      | "plan_unavailable"
      | "purchase_failed"
      | "restore_failed",
  ) {
    super(code);
  }
}

export interface SubscriptionAdapter {
  connect(
    apiKey: string,
    internalUserId: string,
    onCustomerInfo: (customer: StoreCustomerSnapshot) => void,
  ): Promise<SubscriptionConnection>;
  disconnect(internalUserId: string): Promise<void>;
  loadPlans(internalUserId: string): Promise<StorePlan[]>;
  purchase(
    internalUserId: string,
    packageIdentifier: string,
  ): Promise<PurchaseResult>;
  restore(internalUserId: string): Promise<StoreCustomerSnapshot>;
}

export function createSubscriptionAdapter(
  bridge: RevenueCatBridge,
): SubscriptionAdapter {
  return new PrincipalIsolatedSubscriptionAdapter(bridge);
}

class PrincipalIsolatedSubscriptionAdapter implements SubscriptionAdapter {
  private queue: Promise<void> = Promise.resolve();
  private generation = 0;
  private activeInternalUserId: string | null = null;
  private configuredApiKey: string | null = null;
  private listener: ((info: RawCustomerInfo) => void) | null = null;
  private packages = new Map<string, RawStorePackage>();

  constructor(private readonly bridge: RevenueCatBridge) {}

  connect(
    apiKey: string,
    internalUserId: string,
    onCustomerInfo: (customer: StoreCustomerSnapshot) => void,
  ): Promise<SubscriptionConnection> {
    const generation = ++this.generation;
    this.activeInternalUserId = internalUserId;
    this.packages.clear();
    this.removeListener();

    return this.enqueue(async () => {
      this.assertPrincipal(internalUserId, generation);
      try {
        await this.ensureIdentity(apiKey, internalUserId, generation);
        this.assertPrincipal(internalUserId, generation);

        const listener = (info: RawCustomerInfo) => {
          if (
            this.generation === generation &&
            this.activeInternalUserId === internalUserId
          ) {
            onCustomerInfo(customerSnapshot(info));
          }
        };
        this.listener = listener;
        this.bridge.addCustomerInfoListener(listener);

        const customerInfo = await this.bridge.getCustomerInfo();
        this.assertPrincipal(internalUserId, generation);
        return { customer: customerSnapshot(customerInfo) };
      } catch (error) {
        if (
          this.generation === generation &&
          this.activeInternalUserId === internalUserId
        ) {
          this.removeListener();
          this.packages.clear();
        }
        if (error instanceof SubscriptionAdapterError) throw error;
        throw new SubscriptionAdapterError("unavailable");
      }
    });
  }

  disconnect(internalUserId: string): Promise<void> {
    if (this.activeInternalUserId !== internalUserId) {
      return Promise.resolve();
    }

    ++this.generation;
    this.activeInternalUserId = null;
    this.packages.clear();
    this.removeListener();

    // This app always uses custom internal UUIDs. Never call RevenueCat
    // logOut(), which would create an anonymous customer and risk purchase
    // aliasing. The next connect switches directly with logIn(new UUID).
    return Promise.resolve();
  }

  async loadPlans(internalUserId: string): Promise<StorePlan[]> {
    const generation = this.capturePrincipal(internalUserId);
    this.packages.clear();
    try {
      // Catalog loading intentionally does not occupy the identity/purchase
      // queue. Restore remains available even if offerings are slow or fail.
      const offering = await this.bridge.getCurrentOffering();
      this.assertPrincipal(internalUserId, generation);
      return await this.preparePlans(offering, internalUserId, generation);
    } catch (error) {
      if (
        this.generation === generation &&
        this.activeInternalUserId === internalUserId
      ) {
        this.packages.clear();
      }
      if (error instanceof SubscriptionAdapterError) throw error;
      throw new SubscriptionAdapterError("unavailable");
    }
  }

  purchase(
    internalUserId: string,
    packageIdentifier: string,
  ): Promise<PurchaseResult> {
    const generation = this.capturePrincipal(internalUserId);
    return this.enqueue(async () => {
      this.assertPrincipal(internalUserId, generation);
      const selected = this.packages.get(packageIdentifier);
      if (!selected) throw new SubscriptionAdapterError("plan_unavailable");

      try {
        const info = await this.bridge.purchasePackage(selected.nativePackage);
        this.assertPrincipal(internalUserId, generation);
        return { status: "completed", customer: customerSnapshot(info) };
      } catch (error) {
        if (error instanceof SubscriptionAdapterError) throw error;
        if (this.bridge.isPurchaseCancelled(error))
          return { status: "cancelled" };
        throw new SubscriptionAdapterError("purchase_failed");
      }
    });
  }

  restore(internalUserId: string): Promise<StoreCustomerSnapshot> {
    const generation = this.capturePrincipal(internalUserId);
    return this.enqueue(async () => {
      this.assertPrincipal(internalUserId, generation);
      try {
        const info = await this.bridge.restorePurchases();
        this.assertPrincipal(internalUserId, generation);
        return customerSnapshot(info);
      } catch (error) {
        if (error instanceof SubscriptionAdapterError) throw error;
        throw new SubscriptionAdapterError("restore_failed");
      }
    });
  }

  private async ensureIdentity(
    apiKey: string,
    internalUserId: string,
    generation: number,
  ): Promise<void> {
    const configured = await this.bridge.isConfigured();
    this.assertPrincipal(internalUserId, generation);

    if (!configured) {
      this.bridge.configure(apiKey, internalUserId);
      this.configuredApiKey = apiKey;
    } else {
      if (this.configuredApiKey && this.configuredApiKey !== apiKey) {
        throw new SubscriptionAdapterError("unavailable");
      }
      this.configuredApiKey ??= apiKey;
    }

    let currentId = await this.bridge.getAppUserId();
    this.assertPrincipal(internalUserId, generation);
    if (currentId !== internalUserId) {
      // With custom IDs, switching directly avoids creating or aliasing an
      // anonymous RevenueCat customer between authenticated accounts.
      await this.bridge.logIn(internalUserId);
      this.assertPrincipal(internalUserId, generation);
      currentId = await this.bridge.getAppUserId();
    }

    if (currentId !== internalUserId) {
      throw new SubscriptionAdapterError("principal_changed");
    }
  }

  private async preparePlans(
    offering: RawOffering | null,
    internalUserId: string,
    generation: number,
  ): Promise<StorePlan[]> {
    if (!offering) return [];
    const subscriptionPackages = offering.availablePackages.filter(
      (item) =>
        formatSubscriptionPeriod(item.product.subscriptionPeriod) !== null,
    );
    const productIds = subscriptionPackages.map(
      (item) => item.product.identifier,
    );
    const eligibility = await this.bridge
      .checkIntroEligibility(productIds)
      .catch(() => ({}) as Record<string, boolean>);
    this.assertPrincipal(internalUserId, generation);

    const uniquePackageIds = new Set<string>();
    const plans: StorePlan[] = [];
    for (const item of subscriptionPackages) {
      if (uniquePackageIds.has(item.identifier)) continue;
      uniquePackageIds.add(item.identifier);
      this.packages.set(item.identifier, item);
      plans.push({
        packageIdentifier: item.identifier,
        productIdentifier: item.product.identifier,
        title: item.product.title,
        description: item.product.description,
        priceString: item.product.priceString,
        subscriptionPeriod: item.product.subscriptionPeriod,
        periodLabel: formatSubscriptionPeriod(item.product.subscriptionPeriod),
        introductoryText: formatIntroductoryOffer(
          item.product.introPrice,
          eligibility[item.product.identifier] === true,
          item.product.priceString,
          item.product.subscriptionPeriod,
        ),
      });
    }
    return plans;
  }

  private capturePrincipal(internalUserId: string): number {
    if (this.activeInternalUserId !== internalUserId) {
      throw new SubscriptionAdapterError("principal_changed");
    }
    return this.generation;
  }

  private assertPrincipal(internalUserId: string, generation: number): void {
    if (
      this.activeInternalUserId !== internalUserId ||
      this.generation !== generation
    ) {
      throw new SubscriptionAdapterError("principal_changed");
    }
  }

  private removeListener(): void {
    if (!this.listener) return;
    this.bridge.removeCustomerInfoListener(this.listener);
    this.listener = null;
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation, operation);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}

function customerSnapshot(info: RawCustomerInfo): StoreCustomerSnapshot {
  return {
    hasProEntitlement:
      info.entitlements.active[CUT_OS_PRO_ENTITLEMENT_ID] !== undefined,
    managementUrl: safeHttpsUrl(info.managementURL),
  };
}
