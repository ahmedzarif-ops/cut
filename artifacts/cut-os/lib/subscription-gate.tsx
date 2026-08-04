import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMySubscriptionQueryKey,
  useGetMySubscription,
  useRefreshMySubscription,
  type SubscriptionStatus,
} from "@workspace/api-client-react";
import Constants, { ExecutionEnvironment } from "expo-constants";
import React from "react";
import { Platform } from "react-native";

import { revenueCatSubscriptionAdapter } from "./revenuecat-adapter";
import {
  APPLE_SUBSCRIPTION_MANAGEMENT_URL,
  resolvePurchaseCapability,
  resolveServerSubscription,
  type PurchaseCapability,
  type ResolvedServerSubscription,
  type StoreCustomerSnapshot,
  type StorePlan,
} from "./subscription";
import {
  SubscriptionAdapterError,
  type PurchaseResult,
  type SubscriptionAdapter,
} from "./subscription-adapter";
import {
  confirmSubscriptionAfterStoreAction,
  confirmServerSubscriptionRefresh,
  ProviderPrincipalGuard,
  resolveAccessRecheck,
  resolvePurchaseVerification,
  resolveRestoreVerification,
  type ProviderPrincipalToken,
  type SubscriptionActionResult,
} from "./subscription-provider-state";

export type { SubscriptionActionResult } from "./subscription-provider-state";

export class SubscriptionActionError extends Error {
  readonly name = "SubscriptionActionError";

  constructor(readonly action: "purchase" | "restore" | "verify") {
    super(action);
  }
}

export interface SubscriptionGateValue {
  internalUserId: string;
  server: ResolvedServerSubscription;
  isEntitled: boolean;
  expiresAt: string | null;
  managementUrl: string;
  capability: PurchaseCapability;
  storeStatus: "loading" | "ready" | "unavailable";
  catalogStatus: "loading" | "ready" | "unavailable";
  plans: StorePlan[];
  retryServer(): void;
  retryStore(): void;
  retryCatalog(): void;
  recheckAccess(): Promise<"entitled" | "pending">;
  purchase(packageIdentifier: string): Promise<SubscriptionActionResult>;
  restore(): Promise<SubscriptionActionResult>;
  signOut(): Promise<void>;
}

const SubscriptionGateContext =
  React.createContext<SubscriptionGateValue | null>(null);

export function SubscriptionGateProvider({
  internalUserId,
  apiKey,
  onSignOut,
  adapter = revenueCatSubscriptionAdapter,
  children,
}: {
  internalUserId: string;
  apiKey: string | undefined;
  onSignOut: () => void | Promise<void>;
  adapter?: SubscriptionAdapter;
  children: React.ReactNode;
}) {
  const qc = useQueryClient();
  const queryKey = React.useMemo(
    () => [...getGetMySubscriptionQueryKey(), internalUserId] as const,
    [internalUserId],
  );
  const serverQuery = useGetMySubscription({
    query: {
      queryKey,
      retry: false,
      refetchOnMount: "always",
      refetchOnWindowFocus: "always",
      refetchOnReconnect: "always",
      refetchInterval: 60_000,
      refetchIntervalInBackground: false,
    },
  });
  const { mutateAsync: refreshServerSubscription } = useRefreshMySubscription();
  const capability = React.useMemo(
    () =>
      resolvePurchaseCapability({
        platform: Platform.OS,
        isExpoGo:
          Constants.executionEnvironment === ExecutionEnvironment.StoreClient,
        apiKey,
      }),
    [apiKey],
  );

  const principalGuardRef = React.useRef<ProviderPrincipalGuard | null>(null);
  principalGuardRef.current ??= new ProviderPrincipalGuard();
  const principalTokenRef = React.useRef<ProviderPrincipalToken | null>(null);
  if (principalTokenRef.current?.owner !== internalUserId) {
    principalTokenRef.current =
      principalGuardRef.current.activate(internalUserId);
  }
  const serverRefreshInFlight = React.useRef<
    | {
        token: ProviderPrincipalToken;
        request: Promise<SubscriptionStatus>;
      }
    | undefined
  >(undefined);
  const [storeStatus, setStoreStatus] = React.useState<
    "loading" | "ready" | "unavailable"
  >(capability.available ? "loading" : "unavailable");
  const [plans, setPlans] = React.useState<StorePlan[]>([]);
  const [catalogStatus, setCatalogStatus] = React.useState<
    "loading" | "ready" | "unavailable"
  >(capability.available ? "loading" : "unavailable");
  const [storeCustomer, setStoreCustomer] =
    React.useState<StoreCustomerSnapshot | null>(null);
  const [connectionAttempt, setConnectionAttempt] = React.useState(0);
  const [catalogAttempt, setCatalogAttempt] = React.useState(0);

  React.useEffect(() => {
    const token = principalTokenRef.current!;
    return () => {
      // Invalidate mutation continuations synchronously on unmount. A late
      // response for principal A may never repopulate cache after principal B
      // has signed in, even though both requests share a global QueryClient.
      principalGuardRef.current?.deactivate(token);
      if (principalTokenRef.current === token) {
        principalTokenRef.current = null;
      }
      if (serverRefreshInFlight.current?.token === token) {
        serverRefreshInFlight.current = undefined;
      }
    };
  }, [internalUserId]);

  const confirmWithServer = React.useCallback(
    async (owner: string): Promise<SubscriptionStatus> => {
      const guard = principalGuardRef.current!;
      const token = principalTokenRef.current;
      if (!token || token.owner !== owner || !guard.isCurrent(token)) {
        throw new SubscriptionAdapterError("principal_changed");
      }
      if (
        !serverRefreshInFlight.current ||
        !guard.isCurrent(serverRefreshInFlight.current.token)
      ) {
        let request: Promise<SubscriptionStatus>;
        request = confirmServerSubscriptionRefresh({
          owner,
          token,
          guard,
          refresh: refreshServerSubscription,
          commit: (confirmedOwner, status) =>
            qc.setQueryData(
              [...getGetMySubscriptionQueryKey(), confirmedOwner],
              status,
            ),
        }).finally(() => {
          if (serverRefreshInFlight.current?.request === request) {
            serverRefreshInFlight.current = undefined;
          }
        });
        serverRefreshInFlight.current = { token, request };
      }
      return serverRefreshInFlight.current.request;
    },
    [qc, refreshServerSubscription],
  );

  React.useEffect(() => {
    serverRefreshInFlight.current = undefined;
    setPlans([]);
    setStoreCustomer(null);
    setCatalogStatus(capability.available ? "loading" : "unavailable");

    if (!capability.available || !apiKey) {
      setStoreStatus("unavailable");
      return;
    }

    let active = true;
    const owner = internalUserId;
    const token = principalTokenRef.current!;
    const isCurrent = () =>
      active && principalGuardRef.current?.isCurrent(token) === true;
    setStoreStatus("loading");
    void adapter
      .connect(apiKey, owner, (customer) => {
        if (!isCurrent()) return;
        setStoreCustomer(customer);
        // Store state is never enough to unlock CUT OS Pro. Ask the server to
        // verify RevenueCat and update only this internal UUID's query cache.
        void confirmWithServer(owner).catch(() => undefined);
      })
      .then((connection) => {
        if (!isCurrent()) return;
        setStoreCustomer(connection.customer);
        setStoreStatus("ready");
      })
      .catch(() => {
        if (!isCurrent()) return;
        setPlans([]);
        setStoreCustomer(null);
        setStoreStatus("unavailable");
        setCatalogStatus("unavailable");
      });

    return () => {
      active = false;
      void adapter.disconnect(owner);
    };
  }, [
    adapter,
    apiKey,
    capability.available,
    confirmWithServer,
    connectionAttempt,
    internalUserId,
  ]);

  React.useEffect(() => {
    if (!capability.available || storeStatus !== "ready" || !apiKey) {
      if (!capability.available || storeStatus === "unavailable") {
        setCatalogStatus("unavailable");
      }
      return;
    }

    let active = true;
    const owner = internalUserId;
    const token = principalTokenRef.current!;
    const isCurrent = () =>
      active && principalGuardRef.current?.isCurrent(token) === true;
    setPlans([]);
    setCatalogStatus("loading");
    void adapter
      .loadPlans(owner)
      .then((loadedPlans) => {
        if (!isCurrent()) return;
        setPlans(loadedPlans);
        setCatalogStatus("ready");
      })
      .catch(() => {
        if (!isCurrent()) return;
        setPlans([]);
        setCatalogStatus("unavailable");
      });

    return () => {
      active = false;
    };
  }, [
    adapter,
    apiKey,
    capability.available,
    catalogAttempt,
    internalUserId,
    storeStatus,
  ]);

  const purchase = React.useCallback(
    async (packageIdentifier: string): Promise<SubscriptionActionResult> => {
      if (
        !capability.available ||
        storeStatus !== "ready" ||
        catalogStatus !== "ready"
      ) {
        throw new SubscriptionActionError("purchase");
      }
      const owner = internalUserId;
      const token = principalTokenRef.current!;
      const isCurrent = () =>
        principalGuardRef.current?.isCurrent(token) === true;
      let result: PurchaseResult;
      try {
        result = await adapter.purchase(owner, packageIdentifier);
        if (!isCurrent()) {
          throw new SubscriptionAdapterError("principal_changed");
        }
        if (result.status === "cancelled") return "cancelled";
      } catch (error) {
        if (
          error instanceof SubscriptionAdapterError &&
          error.code === "principal_changed"
        ) {
          throw error;
        }
        throw new SubscriptionActionError("purchase");
      }

      setStoreCustomer(result.customer);
      const verified = await confirmSubscriptionAfterStoreAction({
        localHasProEntitlement: result.customer.hasProEntitlement,
        confirm: () => confirmWithServer(owner),
      });
      // Apple completed the transaction. A temporarily unavailable or delayed
      // server verification must never be reported as a failed purchase.
      return resolvePurchaseVerification(verified?.entitled ?? null);
    },
    [
      adapter,
      capability.available,
      catalogStatus,
      confirmWithServer,
      internalUserId,
      storeStatus,
    ],
  );

  const restore =
    React.useCallback(async (): Promise<SubscriptionActionResult> => {
      if (!capability.available || storeStatus !== "ready") {
        throw new SubscriptionActionError("restore");
      }
      const owner = internalUserId;
      const token = principalTokenRef.current!;
      const isCurrent = () =>
        principalGuardRef.current?.isCurrent(token) === true;
      let customer: StoreCustomerSnapshot;
      try {
        customer = await adapter.restore(owner);
        if (!isCurrent()) {
          throw new SubscriptionAdapterError("principal_changed");
        }
      } catch (error) {
        if (
          error instanceof SubscriptionAdapterError &&
          error.code === "principal_changed"
        ) {
          throw error;
        }
        throw new SubscriptionActionError("restore");
      }
      setStoreCustomer(customer);
      const verified = await confirmSubscriptionAfterStoreAction({
        localHasProEntitlement: customer.hasProEntitlement,
        confirm: () => confirmWithServer(owner),
      });
      return resolveRestoreVerification({
        localHasProEntitlement: customer.hasProEntitlement,
        serverEntitled: verified?.entitled ?? null,
      });
    }, [
      adapter,
      capability.available,
      confirmWithServer,
      internalUserId,
      storeStatus,
    ]);

  const recheckAccess = React.useCallback(async (): Promise<
    "entitled" | "pending"
  > => {
    const owner = internalUserId;
    try {
      const verified = await confirmWithServer(owner);
      return resolveAccessRecheck(verified.entitled);
    } catch (error) {
      if (
        error instanceof SubscriptionAdapterError &&
        error.code === "principal_changed"
      ) {
        throw error;
      }
      throw new SubscriptionActionError("verify");
    }
  }, [confirmWithServer, internalUserId]);

  const signOut = React.useCallback(async (): Promise<void> => {
    const token = principalTokenRef.current;
    if (
      !token ||
      token.owner !== internalUserId ||
      !principalGuardRef.current?.isCurrent(token)
    ) {
      throw new SubscriptionAdapterError("principal_changed");
    }
    await onSignOut();
  }, [internalUserId, onSignOut]);

  const server = resolveServerSubscription(
    serverQuery.data,
    serverQuery.isError,
  );
  const serverManagementUrl =
    server.state === "ready" ? server.managementUrl : null;
  const value = React.useMemo<SubscriptionGateValue>(
    () => ({
      internalUserId,
      server,
      isEntitled: server.state === "ready" && server.entitled,
      expiresAt: server.state === "ready" ? server.expiresAt : null,
      managementUrl:
        serverManagementUrl ??
        storeCustomer?.managementUrl ??
        APPLE_SUBSCRIPTION_MANAGEMENT_URL,
      capability,
      storeStatus,
      catalogStatus,
      plans,
      retryServer: () => void recheckAccess().catch(() => undefined),
      retryStore: () => setConnectionAttempt((value) => value + 1),
      retryCatalog: () => setCatalogAttempt((value) => value + 1),
      recheckAccess,
      purchase,
      restore,
      signOut,
    }),
    [
      capability,
      catalogStatus,
      internalUserId,
      plans,
      purchase,
      recheckAccess,
      restore,
      server,
      serverManagementUrl,
      signOut,
      storeCustomer?.managementUrl,
      storeStatus,
    ],
  );

  return (
    <SubscriptionGateContext.Provider value={value}>
      {children}
    </SubscriptionGateContext.Provider>
  );
}

export function useSubscriptionGate(): SubscriptionGateValue {
  const value = React.useContext(SubscriptionGateContext);
  if (!value) {
    throw new Error(
      "useSubscriptionGate must be used inside SubscriptionGateProvider",
    );
  }
  return value;
}

export function useOptionalSubscriptionGate(): SubscriptionGateValue | null {
  return React.useContext(SubscriptionGateContext);
}
