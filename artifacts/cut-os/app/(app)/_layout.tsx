import { useAuth, useSession } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetAccountDeletionStatusQueryKey,
  getGetMyAdultEligibilityQueryKey,
  getGetMeQueryKey,
  setAuthTokenGetter,
  setGoneResponseHandler,
  useGetAccountDeletionStatus,
  useGetMyAdultEligibility,
  useGetMe,
  useUpdateMe,
} from "@workspace/api-client-react";
import * as SecureStore from "expo-secure-store";
import { Redirect, Stack, usePathname } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { AuthTokenCoordinator } from "@/lib/auth-token-coordinator";
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
import {
  decideAdultEligibilityRoute,
  resolveAdultEligibilityQuery,
  shouldDeferPrivateRouteForDeclaredAgeRange,
  type AdultEligibilityRoute,
} from "@/lib/adult-eligibility";
import { AdultEligibilityGateProvider } from "@/lib/adult-eligibility-gate";
import { useDeclaredAgeRangeGate } from "@/lib/declared-age-range-gate";
import { parseRevenueCatIosApiKey } from "@/lib/runtime-config";
import { transitionPrincipalQueryCache } from "@/lib/principal-query-cache";
import {
  DeviceTimeZoneSyncCoordinator,
  isExpectedDeviceTimeZoneUpdateResponse,
  needsDeviceTimeZoneUpdate,
  resolveDeviceTimeZone,
} from "@/lib/device-time-zone";
import {
  DeviceTimeZoneGateProvider,
  isDailyDeviceTimeZoneQueryKey,
} from "@/lib/device-time-zone-gate";
import {
  decideSubscriptionRoute,
  isInternalUserUuid,
} from "@/lib/subscription";
import {
  SubscriptionGateProvider,
  useSubscriptionGate,
} from "@/lib/subscription-gate";
import { runSignOutWithFeedback } from "@/lib/subscription-provider-state";

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
const ADULT_ELIGIBILITY_STATUS_PATH = getGetMyAdultEligibilityQueryKey()[0];
const DEVICE_TIME_ZONE_REFRESH_MS = 60_000;
const parsedRevenueCatIosApiKey = parseRevenueCatIosApiKey(
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
);
const revenueCatIosApiKey =
  typeof parsedRevenueCatIosApiKey === "string"
    ? parsedRevenueCatIosApiKey
    : undefined;

function isAccountDeletionStatusQuery(queryKey: readonly unknown[]): boolean {
  return queryKey[0] === ACCOUNT_DELETION_STATUS_PATH;
}

function isSecurityGateQuery(queryKey: readonly unknown[]): boolean {
  return (
    queryKey[0] === ACCOUNT_DELETION_STATUS_PATH ||
    queryKey[0] === ADULT_ELIGIBILITY_STATUS_PATH
  );
}

export default function AppLayout() {
  const { isLoaded, isSignedIn, userId, sessionId, getToken, signOut } =
    useAuth();
  const { session } = useSession();
  const qc = useQueryClient();
  const pathname = usePathname();
  const getTokenRef = React.useRef(getToken);
  getTokenRef.current = getToken;
  const sessionRef = React.useRef(session);
  sessionRef.current = session;

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
    // Clerk may replace the getToken function while its native client syncs.
    // Read the latest implementation through a ref so that a harmless Clerk
    // render cannot tear down the coordinator and abort in-flight gate queries.
    const tokenCoordinator = new AuthTokenCoordinator(
      (options) => getTokenRef.current(options),
      Date.now,
      10_000,
      async () => {
        const activeSession = sessionRef.current;
        if (!activeSession) return;

        // A native session may remain signed in after its short-lived bearer
        // token is rejected. Touching the same active Clerk session refreshes
        // its server-backed client state before the one allowed 401 replay.
        activeSession.clearCache();
        await activeSession.touch({ intent: "focus" });
      },
    );
    setAuthTokenGetter(async (options) => {
      try {
        return await Promise.race([
          tokenCoordinator.getToken(options),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
        ]);
      } catch {
        return null;
      }
    });
    if (active) setAuthReadyUserId(userId);

    return () => {
      active = false;
      tokenCoordinator.dispose();
      setAuthTokenGetter(null);
    };
  }, [isLoaded, isSignedIn, sessionId, userId]);

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
  // new Clerk principal mounts. Expo Router may remount this layout while the
  // same principal moves between guarded routes; that must not erase the
  // verified gate results and cause a redirect loop.
  React.useEffect(() => {
    setCacheReadyUserId(null);
    const ownerKey =
      isLoaded && isSignedIn && userId
        ? JSON.stringify([userId, sessionId])
        : null;
    if (transitionPrincipalQueryCache(qc, ownerKey)) {
      setForcedGateOwnerUserId(null);
    }
    if (ownerKey && userId) setCacheReadyUserId(userId);
  }, [isLoaded, isSignedIn, qc, sessionId, userId]);

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

  // Verify the adult-only policy before mounting any route that can issue a
  // normal /me request. Account deletion is intentionally checked first and
  // disables this query so deletion recovery can remain terminal and isolated.
  const adultEligibilityReady = Boolean(
    prerequisitesReady &&
    deletionStatusQuery.isSuccess &&
    deletionStatusQuery.data?.status === "none" &&
    markerState.marker === null &&
    forcedGateOwnerUserId !== userId,
  );
  const adultEligibilityQuery = useGetMyAdultEligibility({
    query: {
      queryKey: [...getGetMyAdultEligibilityQueryKey(), userId],
      enabled: adultEligibilityReady,
      retry: false,
      refetchOnMount: "always",
      refetchOnWindowFocus: "always",
      refetchOnReconnect: "always",
    },
  });
  const adultEligibilityResolution = resolveAdultEligibilityQuery(
    adultEligibilityQuery.data,
    adultEligibilityQuery.isError,
  );
  const declaredAgeRange = useDeclaredAgeRangeGate({
    enabled: adultEligibilityReady,
    principalId: userId ?? null,
  });
  const resolvedAdultEligibilityStatus =
    adultEligibilityResolution.response?.status ?? null;
  const adultEligibilityMustFailClosed = Boolean(
    adultEligibilityReady &&
    (adultEligibilityResolution.error ||
      (adultEligibilityResolution.response &&
        (resolvedAdultEligibilityStatus !== "eligible" ||
          (!declaredAgeRange.isLoading &&
            !declaredAgeRange.allowsPrivateAccess)))),
  );

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

  // An unavailable/invalid status or a non-eligible result immediately
  // unmounts private routes below and purges their retained query/mutation
  // state. In particular, a failed refetch must never keep older eligible
  // data authoritative just because React Query retained it.
  React.useEffect(() => {
    if (
      !adultEligibilityMustFailClosed ||
      currentPrincipalUserId.current !== userId
    ) {
      return;
    }

    void qc.cancelQueries({
      predicate: (query) => !isSecurityGateQuery(query.queryKey),
    });
    qc.removeQueries({
      predicate: (query) => !isSecurityGateQuery(query.queryKey),
    });
    qc.getMutationCache().clear();
  }, [adultEligibilityMustFailClosed, qc, userId]);

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

  const leaveAccount = async () => {
    const ownerSessionId = sessionId;
    qc.clear();
    if (ownerSessionId) {
      await signOut({ sessionId: ownerSessionId });
      return;
    }
    await signOut();
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
  const onAdultEligibility =
    pathname === "/adult-eligibility" ||
    pathname.endsWith("/adult-eligibility");
  const route: AdultEligibilityRoute = onSettings
    ? "settings"
    : onAdultEligibility
      ? "adult_eligibility"
      : "private";
  const deletionRequired = gateDecision === "require_settings";

  let adultEligibilityResponse = adultEligibilityResolution.response;
  let adultEligibilityError: string | null = null;
  if (deletionRequired) {
    adultEligibilityResponse = null;
  } else if (adultEligibilityResolution.error === "unavailable") {
    adultEligibilityError =
      "CUT OS couldn't verify the age requirement. Check your connection and try again. Health and nutrition features remain locked.";
  } else if (adultEligibilityResolution.error === "invalid") {
    adultEligibilityError =
      "CUT OS received an age requirement status it could not safely verify.";
  }

  if (
    shouldDeferPrivateRouteForDeclaredAgeRange({
      route,
      status: adultEligibilityResponse?.status ?? null,
      declaredAgeRangeLoading: declaredAgeRange.isLoading,
    })
  ) {
    return <GateLoading />;
  }

  const adultRouteDecision = decideAdultEligibilityRoute({
    deletionRequired,
    route,
    status:
      adultEligibilityResponse?.status === "eligible" &&
      !declaredAgeRange.allowsPrivateAccess
        ? null
        : (adultEligibilityResponse?.status ?? null),
  });
  if (adultRouteDecision === "redirect_settings") {
    return <Redirect href="/settings" />;
  }
  if (adultRouteDecision === "redirect_adult_eligibility") {
    return <Redirect href="/adult-eligibility" />;
  }

  const adultEligibilityLoading = Boolean(
    !deletionRequired &&
    adultEligibilityReady &&
    !adultEligibilityResponse &&
    !adultEligibilityError,
  );

  return (
    <AccountDeletionGateProvider
      value={{
        marker: markerState.marker,
        serverStatus: effectiveServerStatus,
        setMarker,
      }}
    >
      <AdultEligibilityGateProvider
        value={{
          response: adultEligibilityResponse,
          status: adultEligibilityResponse?.status ?? null,
          isLoading: adultEligibilityLoading,
          error: adultEligibilityError,
          isRequired:
            !deletionRequired &&
            (adultEligibilityResponse?.status !== "eligible" ||
              !declaredAgeRange.allowsPrivateAccess),
          declaredAgeRange,
          retry: () => void adultEligibilityQuery.refetch(),
        }}
      >
        {!deletionRequired &&
        adultEligibilityResponse?.status === "eligible" &&
        declaredAgeRange.allowsPrivateAccess ? (
          <EligibleSubscriptionShell
            key={userId}
            clerkUserId={userId}
            onSignOut={leaveAccount}
          />
        ) : (
          <AppStack />
        )}
      </AdultEligibilityGateProvider>
    </AccountDeletionGateProvider>
  );
}

function EligibleSubscriptionShell({
  clerkUserId,
  onSignOut,
}: {
  clerkUserId: string;
  onSignOut: () => void | Promise<void>;
}) {
  const pathname = usePathname();
  const qc = useQueryClient();
  const onSettings = pathname === "/settings" || pathname.endsWith("/settings");
  const updateMe = useUpdateMe();
  const updateMeAsync = React.useRef(updateMe.mutateAsync);
  updateMeAsync.current = updateMe.mutateAsync;
  const [timeZoneSyncRetry, setTimeZoneSyncRetry] = React.useState(0);
  const [deviceTimeZoneRefresh, setDeviceTimeZoneRefresh] = React.useState(0);
  const deviceTimeZone = React.useMemo(
    () => resolveDeviceTimeZone(),
    [deviceTimeZoneRefresh, timeZoneSyncRetry],
  );
  const deviceTimeZoneValue = deviceTimeZone.ok
    ? deviceTimeZone.timeZone
    : null;
  const timeZoneSyncCoordinator = React.useRef(
    new DeviceTimeZoneSyncCoordinator(),
  );
  const [timeZoneSyncError, setTimeZoneSyncError] = React.useState<
    string | null
  >(null);
  const [timeZoneSyncBusy, setTimeZoneSyncBusy] = React.useState(false);
  const [dailyTimeZoneRejected, setDailyTimeZoneRejected] =
    React.useState(false);
  const meQuery = useGetMe({
    query: {
      queryKey: [...getGetMeQueryKey(), clerkUserId],
      retry: false,
      refetchOnMount: "always",
      refetchOnWindowFocus: "always",
      refetchOnReconnect: "always",
    },
  });

  React.useEffect(() => {
    const refreshDeviceTimeZone = () => {
      setDeviceTimeZoneRefresh((value) => value + 1);
    };
    const interval = setInterval(
      refreshDeviceTimeZone,
      DEVICE_TIME_ZONE_REFRESH_MS,
    );
    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") refreshDeviceTimeZone();
      },
    );

    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, []);

  React.useEffect(
    () => () => {
      timeZoneSyncCoordinator.current.dispose();
    },
    [],
  );

  React.useEffect(() => {
    setDailyTimeZoneRejected(false);
  }, [clerkUserId, deviceTimeZoneValue]);

  const rejectDailyTimeZone = React.useCallback(() => {
    setDailyTimeZoneRejected(true);
    const dailyQueryFilter = {
      predicate: (query: { queryKey: readonly unknown[] }) =>
        isDailyDeviceTimeZoneQueryKey(query.queryKey),
    };
    void qc.cancelQueries(dailyQueryFilter);
    // Canceling alone retains the last successful health-data payload. Remove
    // it before the gate can ever retry so remounted hooks cannot render a
    // stale day while their replacement request is still pending or failing.
    qc.removeQueries(dailyQueryFilter);
  }, [qc]);

  React.useEffect(() => {
    const user = meQuery.data;
    if (!user || !deviceTimeZoneValue) return;
    // A failed PATCH can be ambiguous (for example, the client may time out
    // just after the server commits). Retry the idempotent target even if the
    // cached pre-request timezone now happens to match the device.
    if (user.timezone === deviceTimeZoneValue && !timeZoneSyncError) return;

    const attempt = timeZoneSyncCoordinator.current.begin({
      ownerUserId: clerkUserId,
      serverTimeZone: user.timezone,
      deviceTimeZone: deviceTimeZoneValue,
      retry: timeZoneSyncRetry,
    });
    if (!attempt) return;
    setTimeZoneSyncBusy(true);

    void updateMeAsync
      .current({ data: { timezone: deviceTimeZoneValue } })
      .then((updatedUser) => {
        if (!timeZoneSyncCoordinator.current.isCurrent(attempt)) return;
        if (
          !isExpectedDeviceTimeZoneUpdateResponse(updatedUser, user.id, attempt)
        ) {
          throw new Error("Unexpected timezone update response");
        }
        qc.setQueryData(
          [...getGetMeQueryKey(), attempt.ownerUserId],
          updatedUser,
        );
        if (!timeZoneSyncCoordinator.current.succeed(attempt)) return;
        setTimeZoneSyncError(null);
        setTimeZoneSyncBusy(false);
      })
      .catch(() => {
        if (!timeZoneSyncCoordinator.current.fail(attempt)) return;
        setTimeZoneSyncBusy(false);
        setTimeZoneSyncError(
          "CUT OS couldn't set the local day for this device. Check your connection and try again.",
        );
      });
  }, [
    clerkUserId,
    deviceTimeZoneValue,
    meQuery.data?.id,
    meQuery.data?.timezone,
    qc,
    timeZoneSyncRetry,
    timeZoneSyncError,
  ]);

  if (meQuery.isError) {
    if (onSettings) return <AppStack />;
    return (
      <GateError
        title="Account check needed"
        message="CUT OS couldn't load the internal account needed to verify App Store access."
        onRetry={() => void meQuery.refetch()}
        onSignOut={onSignOut}
      />
    );
  }
  if (meQuery.isLoading || !meQuery.data) {
    return onSettings ? <AppStack /> : <GateLoading />;
  }

  if (!deviceTimeZone.ok) {
    if (onSettings) return <AppStack />;
    return (
      <GateError
        title="Local day needed"
        message="CUT OS couldn't read this device's time zone, so daily entries remain locked to prevent the wrong date. Check the device date and time settings, then retry."
        onRetry={() => setTimeZoneSyncRetry((value) => value + 1)}
        onSignOut={onSignOut}
      />
    );
  }

  if (
    timeZoneSyncBusy ||
    timeZoneSyncCoordinator.current.hasActiveAttempt(clerkUserId)
  ) {
    return onSettings ? <AppStack /> : <GateLoading />;
  }

  if (timeZoneSyncError) {
    if (onSettings) return <AppStack />;
    return (
      <GateError
        title="Local day needed"
        message={timeZoneSyncError}
        onRetry={() => setTimeZoneSyncRetry((value) => value + 1)}
        onSignOut={onSignOut}
      />
    );
  }

  if (dailyTimeZoneRejected) {
    if (onSettings) return <AppStack />;
    return (
      <GateError
        title="Local day needed"
        message="CUT OS rejected an outdated local-day context, so daily data remains locked. Retry to verify this device's current time zone."
        onRetry={() => {
          setDailyTimeZoneRejected(false);
          setTimeZoneSyncRetry((value) => value + 1);
          void meQuery.refetch();
        }}
        onSignOut={onSignOut}
      />
    );
  }

  if (needsDeviceTimeZoneUpdate(meQuery.data.timezone, deviceTimeZone)) {
    if (onSettings) return <AppStack />;
    return <GateLoading />;
  }

  // RevenueCat receives only this server-created UUID. Clerk identifiers,
  // email addresses, and health/profile attributes never enter the SDK.
  if (!isInternalUserUuid(meQuery.data.id)) {
    if (onSettings) return <AppStack />;
    return (
      <GateError
        title="Account check needed"
        message="CUT OS received an account identifier it could not safely use for App Store access."
        onRetry={() => void meQuery.refetch()}
        onSignOut={onSignOut}
      />
    );
  }

  return (
    <DeviceTimeZoneGateProvider
      key={`${clerkUserId}:${deviceTimeZone.timeZone}`}
      ownerClerkUserId={clerkUserId}
      timeZone={deviceTimeZone.timeZone}
      onRejected={rejectDailyTimeZone}
    >
      <SubscriptionGateProvider
        key={meQuery.data.id}
        internalUserId={meQuery.data.id}
        apiKey={revenueCatIosApiKey}
        onSignOut={onSignOut}
      >
        <SubscriptionRouteBoundary
          onboardingComplete={meQuery.data.onboardingComplete}
        />
      </SubscriptionGateProvider>
    </DeviceTimeZoneGateProvider>
  );
}

function SubscriptionRouteBoundary({
  onboardingComplete,
}: {
  onboardingComplete: boolean;
}) {
  const pathname = usePathname();
  const subscription = useSubscriptionGate();
  const onSettings = pathname === "/settings" || pathname.endsWith("/settings");
  const onSubscription =
    pathname === "/subscription" || pathname.endsWith("/subscription");
  const route = onSettings
    ? "settings"
    : onSubscription
      ? "subscription"
      : "core";
  const decision = decideSubscriptionRoute({
    route,
    subscription: subscription.server,
    onboardingComplete,
  });

  if (decision === "redirect_onboarding") {
    return <Redirect href="/onboarding" />;
  }
  if (decision === "redirect_today") return <Redirect href="/today" />;
  return <AppStack />;
}

function AppStack() {
  const c = useColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="quick-add"
        options={{ presentation: "transparentModal", animation: "fade" }}
      />
      <Stack.Screen name="food-entry" options={{ presentation: "modal" }} />
      <Stack.Screen name="saved-foods" options={{ presentation: "modal" }} />
      <Stack.Screen
        name="nutrition-preferences"
        options={{ presentation: "modal" }}
      />
      <Stack.Screen name="capture" options={{ presentation: "modal" }} />
      <Stack.Screen
        name="barcode"
        options={{ presentation: "fullScreenModal" }}
      />
      <Stack.Screen name="photo-estimate" options={{ presentation: "modal" }} />
      <Stack.Screen name="meal-creator" options={{ presentation: "modal" }} />
      <Stack.Screen name="workout-entry" options={{ presentation: "modal" }} />
    </Stack>
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
  title = "Account check needed",
  message,
  onRetry,
  onManageAccount,
  onSignOut,
}: {
  title?: string;
  message: string;
  onRetry: () => void;
  onManageAccount?: () => void;
  onSignOut: () => void | Promise<void>;
}) {
  const c = useColors();
  const [signOutBusy, setSignOutBusy] = React.useState(false);
  const [signOutError, setSignOutError] = React.useState<string | null>(null);
  const signOutLock = React.useRef(false);

  const signOut = () =>
    runSignOutWithFeedback(
      signOutLock,
      onSignOut,
      { setBusy: setSignOutBusy, setError: setSignOutError },
      "CUT OS couldn't sign out. Check your connection and try again.",
    );

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
        {title}
      </Text>
      <Text
        accessibilityRole="alert"
        style={[styles.message, { color: c.mutedForeground }]}
      >
        {message}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: signOutBusy }}
        disabled={signOutBusy}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: c.primary,
            opacity: signOutBusy ? 0.55 : pressed ? 0.84 : 1,
          },
        ]}
        onPress={onRetry}
      >
        <Text style={[styles.buttonText, { color: c.primaryForeground }]}>
          Retry
        </Text>
      </Pressable>
      {onManageAccount ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: signOutBusy }}
          disabled={signOutBusy}
          style={[styles.secondaryButton, signOutBusy && styles.buttonDisabled]}
          onPress={onManageAccount}
        >
          <Text style={[styles.secondaryText, { color: c.primary }]}>
            Manage account &amp; billing
          </Text>
        </Pressable>
      ) : null}
      {signOutError ? (
        <Text
          accessibilityRole="alert"
          style={[styles.signOutError, { color: c.destructiveText }]}
        >
          {signOutError}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: signOutBusy, busy: signOutBusy }}
        disabled={signOutBusy}
        style={[styles.secondaryButton, signOutBusy && styles.buttonDisabled]}
        onPress={() => void signOut()}
      >
        {signOutBusy ? (
          <ActivityIndicator color={c.primary} />
        ) : (
          <Text style={[styles.secondaryText, { color: c.primary }]}>
            Sign out
          </Text>
        )}
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
  buttonDisabled: { opacity: 0.55 },
  signOutError: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 14,
    textAlign: "center",
  },
  secondaryText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
