import { useAuth } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetAccountDeletionStatusQueryKey,
  setAuthTokenGetter,
  setGoneResponseHandler,
  useGetAccountDeletionStatus,
} from "@workspace/api-client-react";
import * as SecureStore from "expo-secure-store";
import { Redirect, Stack, usePathname } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import {
  accountDeletionKey,
  decideAccountDeletionGate,
  parseAccountDeletionMarker,
  parseAccountDeletionServerStatus,
  resolveAccountDeletionGateStatus,
  type AccountDeletionMarker,
  type AccountDeletionServerStatus,
} from "@/lib/account-deletion";
import { AccountDeletionGateProvider } from "@/lib/account-deletion-gate";

interface MarkerLoadState {
  ownerClerkUserId: string | null;
  marker: AccountDeletionMarker | null;
  loading: boolean;
  error: string | null;
}

const EMPTY_MARKER_STATE: MarkerLoadState = {
  ownerClerkUserId: null,
  marker: null,
  loading: true,
  error: null,
};

const ACCOUNT_DELETION_STATUS_PATH = getGetAccountDeletionStatusQueryKey()[0];

function isAccountDeletionStatusQuery(queryKey: readonly unknown[]): boolean {
  return queryKey[0] === ACCOUNT_DELETION_STATUS_PATH;
}

export default function AppLayout() {
  const { isLoaded, isSignedIn, userId, getToken, signOut } = useAuth();
  const qc = useQueryClient();
  const pathname = usePathname();
  const c = useColors();

  const [authReadyUserId, setAuthReadyUserId] = React.useState<string | null>(
    null,
  );
  const [cacheReadyUserId, setCacheReadyUserId] = React.useState<string | null>(
    null,
  );
  const [goneHandlerReadyUserId, setGoneHandlerReadyUserId] = React.useState<
    string | null
  >(null);
  const [forcedGateOwnerUserId, setForcedGateOwnerUserId] = React.useState<
    string | null
  >(null);
  const [markerState, setMarkerState] =
    React.useState<MarkerLoadState>(EMPTY_MARKER_STATE);
  const [gateRetry, setGateRetry] = React.useState(0);
  const currentPrincipalUserId = React.useRef<string | null>(null);
  currentPrincipalUserId.current =
    isLoaded && isSignedIn && userId ? userId : null;

  // Register the token getter while children are still gated. This removes the
  // former first-screen race where a child query could fire before auth setup.
  React.useEffect(() => {
    setAuthReadyUserId(null);
    if (!isLoaded || !isSignedIn || !userId) {
      setAuthTokenGetter(null);
      return;
    }

    let active = true;
    setAuthTokenGetter(async () => {
      try {
        return await Promise.race([
          getToken(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
        ]);
      } catch {
        return null;
      }
    });
    if (active) setAuthReadyUserId(userId);

    return () => {
      active = false;
      setAuthTokenGetter(null);
    };
  }, [getToken, isLoaded, isSignedIn, userId]);

  // A 410 from a normal authenticated endpoint means the server has already
  // tombstoned this principal. Register the handler before private children
  // mount, retain the status query for verification, and isolate late A
  // responses from any subsequently active principal B.
  React.useEffect(() => {
    setGoneHandlerReadyUserId(null);
    if (!isLoaded || !isSignedIn || !userId) {
      setGoneResponseHandler(null);
      return;
    }

    const ownerUserId = userId;
    const statusQueryKey = [
      ...getGetAccountDeletionStatusQueryKey(),
      ownerUserId,
    ] as const;

    setGoneResponseHandler((error) => {
      if (
        currentPrincipalUserId.current !== ownerUserId ||
        error.url.includes(ACCOUNT_DELETION_STATUS_PATH)
      ) {
        return;
      }

      // Force Settings synchronously from the 410 signal while the dedicated
      // endpoint resolves the exact pending/completed durable state.
      setForcedGateOwnerUserId(ownerUserId);
      void qc.cancelQueries({
        predicate: (query) => !isAccountDeletionStatusQuery(query.queryKey),
      });
      qc.removeQueries({
        predicate: (query) => !isAccountDeletionStatusQuery(query.queryKey),
      });
      qc.getMutationCache().clear();
      void qc.refetchQueries({
        queryKey: statusQueryKey,
        exact: true,
        type: "active",
      });
    });
    setGoneHandlerReadyUserId(ownerUserId);

    return () => {
      if (currentPrincipalUserId.current === ownerUserId) {
        currentPrincipalUserId.current = null;
      }
      setGoneResponseHandler(null);
    };
  }, [isLoaded, isSignedIn, qc, userId]);

  // The query cache is global, so it must be emptied before any screen for a
  // new Clerk principal mounts. Cleanup also protects sign-out transitions.
  React.useEffect(() => {
    setCacheReadyUserId(null);
    setForcedGateOwnerUserId(null);
    qc.clear();
    if (isLoaded && isSignedIn && userId) setCacheReadyUserId(userId);
    return () => {
      qc.clear();
    };
  }, [isLoaded, isSignedIn, qc, userId]);

  React.useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) {
      setMarkerState({
        ownerClerkUserId: null,
        marker: null,
        loading: false,
        error: null,
      });
      return;
    }

    let active = true;
    setMarkerState({
      ownerClerkUserId: userId,
      marker: null,
      loading: true,
      error: null,
    });

    void SecureStore.getItemAsync(accountDeletionKey(userId))
      .then((storedValue) => {
        if (!active) return;
        const marker = parseAccountDeletionMarker(storedValue, userId);
        setMarkerState({
          ownerClerkUserId: userId,
          marker,
          loading: false,
          error: null,
        });
      })
      .catch(() => {
        if (!active) return;
        setMarkerState({
          ownerClerkUserId: userId,
          marker: null,
          loading: false,
          error:
            "CUT OS couldn't safely verify account-deletion recovery on this device.",
        });
      });

    return () => {
      active = false;
    };
  }, [gateRetry, isLoaded, isSignedIn, userId]);

  const prerequisitesReady = Boolean(
    isLoaded &&
    isSignedIn &&
    userId &&
    authReadyUserId === userId &&
    cacheReadyUserId === userId &&
    goneHandlerReadyUserId === userId &&
    markerState.ownerClerkUserId === userId &&
    !markerState.loading &&
    !markerState.error,
  );

  const deletionStatusQuery = useGetAccountDeletionStatus({
    query: {
      queryKey: [...getGetAccountDeletionStatusQueryKey(), userId],
      enabled: prerequisitesReady,
      retry: false,
      refetchOnMount: "always",
      refetchOnWindowFocus: "always",
      refetchOnReconnect: "always",
      refetchInterval: prerequisitesReady ? 60_000 : false,
      refetchIntervalInBackground: false,
    },
  });

  // A status poll can learn about deletion before any normal endpoint emits a
  // 410. Purge the same private in-memory state as the 410 path as soon as the
  // authoritative status is pending/completed; keep only the status query
  // needed by Settings to finish recovery.
  React.useEffect(() => {
    const status = deletionStatusQuery.data?.status;
    if (
      !prerequisitesReady ||
      currentPrincipalUserId.current !== userId ||
      (status !== "pending" && status !== "completed")
    ) {
      return;
    }

    setForcedGateOwnerUserId(userId);
    void qc.cancelQueries({
      predicate: (query) => !isAccountDeletionStatusQuery(query.queryKey),
    });
    qc.removeQueries({
      predicate: (query) => !isAccountDeletionStatusQuery(query.queryKey),
    });
    qc.getMutationCache().clear();
  }, [deletionStatusQuery.data?.status, prerequisitesReady, qc, userId]);

  if (!isLoaded) return <GateLoading />;
  if (!isSignedIn || !userId) return <Redirect href="/sign-in" />;

  if (
    authReadyUserId !== userId ||
    cacheReadyUserId !== userId ||
    goneHandlerReadyUserId !== userId ||
    markerState.loading ||
    markerState.ownerClerkUserId !== userId
  ) {
    return <GateLoading />;
  }

  const retryGate = () => {
    if (markerState.error) {
      setGateRetry((value) => value + 1);
    } else if (prerequisitesReady) {
      void deletionStatusQuery.refetch();
    }
  };

  const leaveAccount = () => {
    qc.clear();
    void signOut().catch(() => undefined);
  };

  if (markerState.error) {
    return (
      <GateError
        message={markerState.error}
        onRetry={retryGate}
        onSignOut={leaveAccount}
      />
    );
  }

  if (deletionStatusQuery.isError) {
    return (
      <GateError
        message="CUT OS couldn't verify your account status. No private account screens were opened."
        onRetry={retryGate}
        onSignOut={leaveAccount}
      />
    );
  }

  if (deletionStatusQuery.isLoading || !deletionStatusQuery.data) {
    return <GateLoading />;
  }

  let serverStatus: AccountDeletionServerStatus;
  try {
    serverStatus = parseAccountDeletionServerStatus(
      deletionStatusQuery.data.status,
    );
  } catch {
    return (
      <GateError
        message="CUT OS received an account status it could not safely verify."
        onRetry={retryGate}
        onSignOut={leaveAccount}
      />
    );
  }

  const setMarker = (marker: AccountDeletionMarker | null) => {
    setMarkerState({
      ownerClerkUserId: userId,
      marker,
      loading: false,
      error: null,
    });
  };
  const effectiveServerStatus = resolveAccountDeletionGateStatus(
    serverStatus,
    forcedGateOwnerUserId,
    userId,
  );
  const gateDecision = decideAccountDeletionGate(
    markerState.marker,
    effectiveServerStatus,
  );
  const onSettings = pathname === "/settings" || pathname.endsWith("/settings");

  if (gateDecision === "require_settings" && !onSettings) {
    return <Redirect href="/settings" />;
  }

  return (
    <AccountDeletionGateProvider
      value={{
        marker: markerState.marker,
        serverStatus: effectiveServerStatus,
        setMarker,
      }}
    >
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.background },
        }}
      />
    </AccountDeletionGateProvider>
  );
}

function GateLoading() {
  const c = useColors();
  return (
    <View style={[styles.centered, { backgroundColor: c.background }]}>
      <ActivityIndicator color={c.primary} />
      <Text style={[styles.loadingText, { color: c.mutedForeground }]}>
        Securing your account…
      </Text>
    </View>
  );
}

function GateError({
  message,
  onRetry,
  onSignOut,
}: {
  message: string;
  onRetry: () => void;
  onSignOut: () => void;
}) {
  const c = useColors();
  return (
    <View
      style={[
        styles.centered,
        styles.errorContainer,
        { backgroundColor: c.background },
      ]}
    >
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: c.foreground }]}
      >
        Account check needed
      </Text>
      <Text
        accessibilityRole="alert"
        style={[styles.message, { color: c.mutedForeground }]}
      >
        {message}
      </Text>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: c.primary, opacity: pressed ? 0.84 : 1 },
        ]}
        onPress={onRetry}
      >
        <Text style={[styles.buttonText, { color: c.primaryForeground }]}>
          Retry
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        style={styles.secondaryButton}
        onPress={onSignOut}
      >
        <Text style={[styles.secondaryText, { color: c.primary }]}>
          Sign out
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  errorContainer: { alignItems: "stretch" },
  loadingText: { fontFamily: "Inter_500Medium", fontSize: 15, marginTop: 14 },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 27,
    lineHeight: 34,
    textAlign: "center",
  },
  message: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 10,
  },
  button: {
    minHeight: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    marginTop: 22,
  },
  buttonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  secondaryText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
