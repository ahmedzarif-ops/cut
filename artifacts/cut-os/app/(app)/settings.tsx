import { useAuth, useSession } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import {
  deleteMe as deleteMeRequest,
  getGetAccountDeletionStatusQueryKey,
  getGetMeQueryKey,
  updateMe as updateMeRequest,
  useGetMe,
} from "@workspace/api-client-react";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LegalSupportLinks } from "@/components/LegalSupportLinks";
import { useColors } from "@/hooks/useColors";
import {
  accountDeletionKey,
  createAccountDeletionMarker,
  serializeAccountDeletionMarker,
  type AccountDeletionMarker,
} from "@/lib/account-deletion";
import { useAccountDeletionGate } from "@/lib/account-deletion-gate";
import { useAdultEligibilityGate } from "@/lib/adult-eligibility-gate";
import { useOptionalSubscriptionGate } from "@/lib/subscription-gate";
import {
  finishTerminalDeletionDeviceCleanup,
  isTerminalDeletionServerCompleted,
} from "@/lib/terminal-deletion-device-cleanup";

const APP_STORE_SUBSCRIPTIONS_URL =
  "https://apps.apple.com/account/subscriptions";

export default function SettingsScreen() {
  const { userId, sessionId, signOut } = useAuth();
  const { session } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const s = makeStyles(c);
  const { marker, serverStatus, setMarker } = useAccountDeletionGate();
  const adultEligibility = useAdultEligibilityGate();
  const subscription = useOptionalSubscriptionGate();
  const meQuery = useGetMe();

  const [actionError, setActionError] = React.useState<string | null>(null);
  const [unitError, setUnitError] = React.useState<string | null>(null);
  const [unitMessage, setUnitMessage] = React.useState<string | null>(null);
  const [unitBusy, setUnitBusy] = React.useState<"metric" | "imperial" | null>(
    null,
  );
  const [subscriptionError, setSubscriptionError] = React.useState<
    string | null
  >(null);
  const [subscriptionMessage, setSubscriptionMessage] = React.useState<
    string | null
  >(null);
  const [subscriptionBusy, setSubscriptionBusy] = React.useState<
    "restore" | "manage" | null
  >(null);
  const [operationBusy, setOperationBusy] = React.useState(false);
  const [locallyCompletedOwnerUserId, setLocallyCompletedOwnerUserId] =
    React.useState<string | null>(null);
  const operationLock = React.useRef(false);
  const unitOperationLock = React.useRef(false);
  const mounted = React.useRef(true);
  const currentPrincipal = React.useRef({ userId, sessionId });
  currentPrincipal.current = { userId, sessionId };

  React.useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const terminalServerCompleted = isTerminalDeletionServerCompleted(
    serverStatus,
    locallyCompletedOwnerUserId,
    userId,
  );
  const recoveryRequired =
    marker !== null || serverStatus !== "none" || terminalServerCompleted;
  const ageRequirementRequired =
    !recoveryRequired && adultEligibility.isRequired;
  const busy = operationBusy || subscriptionBusy !== null || unitBusy !== null;

  const leaveSettings = () => {
    if (ageRequirementRequired) {
      router.replace("/adult-eligibility");
    } else {
      router.back();
    }
  };

  const openSubscriptions = async () => {
    if (subscriptionBusy) return;
    setSubscriptionBusy("manage");
    setSubscriptionError(null);
    setSubscriptionMessage(null);
    try {
      await WebBrowser.openBrowserAsync(
        subscription?.managementUrl ?? APP_STORE_SUBSCRIPTIONS_URL,
      );
    } catch {
      setSubscriptionError(
        "Couldn't open Apple subscription settings. Try again when you're online.",
      );
    } finally {
      setSubscriptionBusy(null);
    }
  };

  const restoreSubscription = async () => {
    if (!subscription || subscriptionBusy) return;
    setSubscriptionBusy("restore");
    setSubscriptionError(null);
    setSubscriptionMessage(null);
    try {
      const result = await subscription.restore();
      if (result === "entitled") {
        setSubscriptionMessage("CUT OS Pro access was restored.");
      } else if (result === "not_entitled") {
        setSubscriptionMessage(
          "No active CUT OS Pro purchase was found for this Apple ID.",
        );
      } else if (result === "pending") {
        setSubscriptionMessage(
          "The restore check finished. CUT OS is still waiting for secure access verification; try again shortly.",
        );
      }
    } catch {
      setSubscriptionError(
        "CUT OS couldn't restore purchases. Check your connection and try again.",
      );
    } finally {
      setSubscriptionBusy(null);
    }
  };

  const isCurrentPrincipal = (ownerUserId: string, ownerSessionId: string) =>
    currentPrincipal.current.userId === ownerUserId &&
    currentPrincipal.current.sessionId === ownerSessionId;

  const assertCurrentPrincipal = (
    ownerUserId: string,
    ownerSessionId: string,
  ) => {
    if (!mounted.current || !isCurrentPrincipal(ownerUserId, ownerSessionId)) {
      throw new PrincipalChangedError();
    }
  };

  const changeUnits = async (units: "metric" | "imperial") => {
    if (
      busy ||
      meQuery.data?.units === units ||
      !userId ||
      !sessionId ||
      !session ||
      session.id !== sessionId ||
      session.user?.id !== userId ||
      unitOperationLock.current
    ) {
      return;
    }

    const ownerUserId = userId;
    const ownerSessionId = sessionId;
    const ownerSession = session;
    unitOperationLock.current = true;
    setUnitBusy(units);
    setUnitError(null);
    setUnitMessage(null);

    try {
      const token = await tokenWithinTimeout(() =>
        ownerSession.getToken({ skipCache: true }),
      );
      assertCurrentPrincipal(ownerUserId, ownerSessionId);
      if (!token) throw new Error("A unit-setting token is unavailable.");

      const updatedAccount = await updateMeRequest(
        { units },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      assertCurrentPrincipal(ownerUserId, ownerSessionId);

      // Publish the authoritative PATCH response to both query shapes. This
      // cannot report success while an old cached unit remains selected, and
      // it never overwrites another principal's retained cache entry.
      qc.setQueryData(getGetMeQueryKey(), updatedAccount);
      qc.setQueryData([...getGetMeQueryKey(), ownerUserId], updatedAccount);
      setUnitMessage(
        units === "imperial"
          ? "Weights now appear in pounds."
          : "Weights now appear in kilograms.",
      );
    } catch (error) {
      if (
        error instanceof PrincipalChangedError ||
        !mounted.current ||
        !isCurrentPrincipal(ownerUserId, ownerSessionId)
      ) {
        return;
      }
      setUnitError(
        "Couldn't change weight units. Check your connection and try again.",
      );
    } finally {
      unitOperationLock.current = false;
      if (mounted.current && isCurrentPrincipal(ownerUserId, ownerSessionId)) {
        setUnitBusy(null);
      }
    }
  };

  const finishTerminalDeletion = async (
    ownerUserId: string,
    ownerSessionId: string,
  ) => {
    let cleanup;
    try {
      cleanup = await finishTerminalDeletionDeviceCleanup({
        ownerClerkUserId: ownerUserId,
        deleteSecureItem: SecureStore.deleteItemAsync,
        setSecureItem: SecureStore.setItemAsync,
        onRecordsCleared: async () => {
          assertCurrentPrincipal(ownerUserId, ownerSessionId);
          qc.clear();
          setMarker(null);
          void Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          ).catch(() => undefined);

          // Scope signout to the session that authorized deletion. If another
          // principal became active mid-flight, their session is left untouched.
          await signOut({ sessionId: ownerSessionId });
          if (
            mounted.current &&
            isCurrentPrincipal(ownerUserId, ownerSessionId)
          ) {
            router.replace("/sign-in");
          }
        },
      });
    } catch (error) {
      if (error instanceof PrincipalChangedError) return;
      if (mounted.current && isCurrentPrincipal(ownerUserId, ownerSessionId)) {
        setActionError(
          "Your CUT OS account is deleted and its private recovery data was cleared, but this device could not finish signing out. Retry device cleanup.",
        );
      }
      return;
    }

    if (
      !cleanup.ok &&
      mounted.current &&
      isCurrentPrincipal(ownerUserId, ownerSessionId)
    ) {
      setActionError(
        "Your CUT OS account is deleted on the server, but private recovery data could not be cleared from this device. Stay signed in and retry device cleanup.",
      );
    }
  };

  const ensureRecoveryMarker = async (
    ownerUserId: string,
    ownerSessionId: string,
  ): Promise<AccountDeletionMarker> => {
    if (marker) {
      if (marker.ownerClerkUserId !== ownerUserId) {
        throw new PrincipalChangedError();
      }
      return marker;
    }

    const created = createAccountDeletionMarker(
      ownerUserId,
      Crypto.randomUUID(),
      new Date().toISOString(),
    );
    await SecureStore.setItemAsync(
      accountDeletionKey(ownerUserId),
      serializeAccountDeletionMarker(created),
    );
    assertCurrentPrincipal(ownerUserId, ownerSessionId);
    setMarker(created);
    return created;
  };

  const runDeletion = async () => {
    if (
      !userId ||
      !sessionId ||
      !session ||
      session.id !== sessionId ||
      session.user?.id !== userId ||
      operationLock.current
    ) {
      return;
    }

    const ownerUserId = userId;
    const ownerSessionId = sessionId;
    const ownerSession = session;
    operationLock.current = true;
    setOperationBusy(true);
    setActionError(null);

    try {
      if (terminalServerCompleted) {
        await finishTerminalDeletion(ownerUserId, ownerSessionId);
        return;
      }

      try {
        await ensureRecoveryMarker(ownerUserId, ownerSessionId);
      } catch (error) {
        if (error instanceof PrincipalChangedError) return;
        if (
          mounted.current &&
          isCurrentPrincipal(ownerUserId, ownerSessionId)
        ) {
          setActionError(
            "Deletion did not start because CUT OS couldn't save a recovery checkpoint on this device. Retry before deleting anything.",
          );
        }
        return;
      }

      // Stop every in-flight query before the server tombstones the identity.
      // The layout's marker gate prevents private screens from mounting again.
      try {
        assertCurrentPrincipal(ownerUserId, ownerSessionId);
        await qc.cancelQueries();
        assertCurrentPrincipal(ownerUserId, ownerSessionId);
      } catch (error) {
        if (error instanceof PrincipalChangedError) return;
        if (
          mounted.current &&
          isCurrentPrincipal(ownerUserId, ownerSessionId)
        ) {
          setActionError(
            "Deletion is paused safely. CUT OS couldn't stop active account requests; retry to continue.",
          );
        }
        return;
      }

      try {
        assertCurrentPrincipal(ownerUserId, ownerSessionId);
        const token = await tokenWithinTimeout(() =>
          ownerSession.getToken({ skipCache: true }),
        );
        assertCurrentPrincipal(ownerUserId, ownerSessionId);
        if (!token) {
          throw new Error("A deletion authorization token is unavailable.");
        }

        // The request carries the captured session's token explicitly. It can
        // never fall through to the module-global token getter for a new user.
        await deleteMeRequest({
          headers: { Authorization: `Bearer ${token}` },
        });
        if (
          mounted.current &&
          isCurrentPrincipal(ownerUserId, ownerSessionId)
        ) {
          setLocallyCompletedOwnerUserId(ownerUserId);
        }
      } catch (error) {
        if (error instanceof PrincipalChangedError) return;
        const status = apiStatus(error);
        if (
          mounted.current &&
          isCurrentPrincipal(ownerUserId, ownerSessionId)
        ) {
          setActionError(
            status === 401
              ? "CUT OS can no longer authenticate this login. Your recovery request remains saved; sign out if retry cannot verify it."
              : "CUT OS couldn't confirm completion. Your device recovery checkpoint is saved—retry safely to verify whether the request is pending or complete.",
          );
          void qc.invalidateQueries({
            queryKey: getGetAccountDeletionStatusQueryKey(),
          });
        }
        return;
      }

      await finishTerminalDeletion(ownerUserId, ownerSessionId);
    } finally {
      operationLock.current = false;
      if (mounted.current && isCurrentPrincipal(ownerUserId, ownerSessionId)) {
        setOperationBusy(false);
      }
    }
  };

  const confirmDeletion = () => {
    Alert.alert(
      "Delete your CUT OS account?",
      "This permanently deletes your CUT OS account and fitness data. It does not cancel an App Store subscription—manage that with Apple first if needed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: () => void runDeletion(),
        },
      ],
    );
  };

  const deletionTitle = terminalServerCompleted
    ? "Account deleted"
    : recoveryRequired
      ? "Deletion needs attention"
      : "Delete account";
  const deletionBody = terminalServerCompleted
    ? "Your CUT OS account is deleted on the server. Clear private recovery data from this device before signing out."
    : serverStatus === "pending"
      ? "The server is securely finishing your deletion. Retry to confirm completion."
      : marker
        ? "A deletion request is saved on this device. Retry safely to send or confirm it."
        : "Permanently delete your CUT OS login, profile, weigh-ins, and meal history.";
  const deletionButton = terminalServerCompleted
    ? "Finish device cleanup"
    : recoveryRequired
      ? "Retry account deletion"
      : "Delete account";

  return (
    <ScrollView
      style={s.flex}
      contentContainerStyle={[
        s.container,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
      ]}
    >
      <View style={s.headerRow}>
        {!recoveryRequired ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              ageRequirementRequired
                ? "Back to age requirement"
                : "Back to Today"
            }
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            hitSlop={8}
            style={({ pressed }) => [
              s.backButton,
              busy && s.disabled,
              pressed && !busy && s.pressed,
            ]}
            onPress={leaveSettings}
          >
            <Text style={s.backButtonText}>‹</Text>
          </Pressable>
        ) : (
          <View style={s.backButtonPlaceholder} />
        )}
        <Text style={s.headerContext}>
          {recoveryRequired
            ? "ACCOUNT RECOVERY"
            : ageRequirementRequired
              ? "AGE REQUIREMENT"
              : "TODAY"}
        </Text>
      </View>

      <Text accessibilityRole="header" style={s.title}>
        Settings
      </Text>
      <Text style={s.subtitle}>
        {ageRequirementRequired
          ? "Manage your CUT OS account while health and nutrition features remain locked."
          : "Manage your subscription and CUT OS account."}
      </Text>

      <View style={s.card}>
        <Text style={s.cardOverline}>DISPLAY UNITS</Text>
        <Text style={s.cardTitle}>Weight units</Text>
        <Text style={s.cardBody}>
          Choose how weights appear. CUT OS keeps saved measurements consistent
          when you switch.
        </Text>
        {meQuery.isError ? (
          <Text accessibilityRole="alert" style={s.errorText}>
            CUT OS couldn&apos;t load your saved weight units. Retry before
            changing them.
          </Text>
        ) : null}
        {unitMessage ? (
          <Text accessibilityLiveRegion="polite" style={s.statusText}>
            {unitMessage}
          </Text>
        ) : null}
        {unitError ? (
          <Text accessibilityRole="alert" style={s.errorText}>
            {unitError}
          </Text>
        ) : null}
        <View style={s.unitRow}>
          {(["metric", "imperial"] as const).map((units) => {
            const active = meQuery.data?.units === units;
            const label = units === "metric" ? "Kilograms (kg)" : "Pounds (lb)";
            return (
              <Pressable
                key={units}
                accessibilityLabel={label}
                accessibilityRole="button"
                accessibilityState={{
                  selected: active,
                  disabled: busy || !meQuery.isSuccess,
                  busy: unitBusy !== null,
                }}
                disabled={busy || !meQuery.isSuccess}
                style={({ pressed }) => [
                  s.unitButton,
                  active && s.unitButtonActive,
                  (busy || !meQuery.isSuccess) && s.disabled,
                  pressed && !busy && s.pressed,
                ]}
                onPress={() => void changeUnits(units)}
              >
                {unitBusy === units ? (
                  <ActivityIndicator
                    color={active ? c.primaryForeground : c.primary}
                  />
                ) : (
                  <Text
                    style={[s.unitButtonText, active && s.unitButtonTextActive]}
                  >
                    {active ? "✓ " : ""}
                    {label}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
        {meQuery.isError ? (
          <Pressable
            accessibilityLabel="Retry loading weight unit settings"
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            style={({ pressed }) => [
              s.secondaryAction,
              busy && s.disabled,
              pressed && !busy && s.pressed,
            ]}
            onPress={() => void meQuery.refetch()}
          >
            <Text style={s.secondaryActionText}>Retry unit settings</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={s.card}>
        <Text style={s.cardOverline}>SUBSCRIPTION</Text>
        <Text style={s.cardTitle}>
          {subscription?.server.state === "ready" &&
          subscription.server.entitled
            ? "CUT OS Pro is active"
            : "CUT OS Pro"}
        </Text>
        <Text style={s.cardBody}>
          {subscription?.server.state === "loading"
            ? "Checking App Store access…"
            : subscription?.server.state === "unavailable"
              ? "CUT OS couldn't verify Pro access. Retry before opening paid features."
              : subscription?.server.state === "ready" &&
                  subscription.server.entitled
                ? "Your paid daily check-in, weigh-ins, and nutrition features are available."
                : "Upgrade to unlock the paid daily check-in, weigh-ins, and nutrition features."}
        </Text>
        <Text style={s.cardBody}>
          Deleting CUT OS does not cancel billing through Apple. Manage or
          cancel separately in App Store subscription settings.
        </Text>
        {subscriptionMessage ? (
          <Text accessibilityLiveRegion="polite" style={s.statusText}>
            {subscriptionMessage}
          </Text>
        ) : null}
        {subscriptionError ? (
          <Text accessibilityRole="alert" style={s.errorText}>
            {subscriptionError}
          </Text>
        ) : null}
        {subscription?.server.state === "ready" &&
        !subscription.server.entitled ? (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            style={({ pressed }) => [
              s.primaryAction,
              busy && s.disabled,
              pressed && !busy && s.pressed,
            ]}
            onPress={() => router.push("/subscription")}
          >
            <Text style={s.primaryActionText}>View subscription options</Text>
          </Pressable>
        ) : null}
        {subscription?.server.state === "unavailable" ? (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            style={({ pressed }) => [
              s.secondaryAction,
              busy && s.disabled,
              pressed && !busy && s.pressed,
            ]}
            onPress={subscription.retryServer}
          >
            <Text style={s.secondaryActionText}>Retry access check</Text>
          </Pressable>
        ) : null}
        {subscription?.capability.available ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              disabled: busy || subscription.storeStatus !== "ready",
              busy: subscriptionBusy === "restore",
            }}
            disabled={busy || subscription.storeStatus !== "ready"}
            style={({ pressed }) => [
              s.secondaryAction,
              (busy || subscription.storeStatus !== "ready") && s.disabled,
              pressed && !busy && s.pressed,
            ]}
            onPress={() => void restoreSubscription()}
          >
            {subscriptionBusy === "restore" ? (
              <ActivityIndicator color={c.primary} />
            ) : (
              <Text style={s.secondaryActionText}>Restore purchases</Text>
            )}
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Manage App Store subscription"
          disabled={busy}
          style={({ pressed }) => [
            s.secondaryAction,
            busy && s.disabled,
            pressed && !busy && s.pressed,
          ]}
          onPress={() => void openSubscriptions()}
        >
          {subscriptionBusy === "manage" ? (
            <ActivityIndicator color={c.primary} />
          ) : (
            <Text style={s.secondaryActionText}>
              Manage App Store subscription
            </Text>
          )}
        </Pressable>
      </View>

      <LegalSupportLinks />

      <View style={[s.card, s.dangerCard]}>
        <Text style={s.dangerOverline}>ACCOUNT DELETION</Text>
        <Text style={s.cardTitle}>{deletionTitle}</Text>
        <Text style={s.cardBody}>{deletionBody}</Text>
        {actionError ? (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            style={s.errorText}
          >
            {actionError}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy, busy }}
          disabled={busy}
          style={({ pressed }) => [
            s.deleteButton,
            busy && s.disabled,
            pressed && !busy && s.pressed,
          ]}
          onPress={
            recoveryRequired ? () => void runDeletion() : confirmDeletion
          }
        >
          {busy ? (
            <View style={s.busyRow}>
              <ActivityIndicator color={c.destructiveForeground} />
              <Text style={s.deleteButtonText}>
                {terminalServerCompleted
                  ? "Cleaning this device…"
                  : "Deleting securely…"}
              </Text>
            </View>
          ) : (
            <Text style={s.deleteButtonText}>{deletionButton}</Text>
          )}
        </Pressable>
      </View>

      {!recoveryRequired ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            ageRequirementRequired ? "Back to age requirement" : "Done"
          }
          style={s.doneButton}
          onPress={leaveSettings}
        >
          <Text style={s.doneText}>
            {ageRequirementRequired ? "Back to age requirement" : "Done"}
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function apiStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object" || !("status" in error)) {
    return undefined;
  }
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

class PrincipalChangedError extends Error {
  readonly name = "PrincipalChangedError";
}

async function tokenWithinTimeout(
  getToken: () => Promise<string | null>,
): Promise<string | null> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      getToken(),
      new Promise<null>((resolve) => {
        timeout = setTimeout(() => resolve(null), 5000);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    container: { paddingHorizontal: 24 },
    headerRow: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    backButtonPlaceholder: { width: 44, height: 44 },
    backButtonText: {
      color: c.foreground,
      fontFamily: "Inter_500Medium",
      fontSize: 34,
      lineHeight: 38,
      marginTop: -2,
    },
    headerContext: {
      color: c.mutedForeground,
      fontFamily: "Inter_700Bold",
      fontSize: 12,
      letterSpacing: 1.3,
      marginLeft: 12,
    },
    title: {
      color: c.foreground,
      fontFamily: "Inter_700Bold",
      fontSize: 30,
      lineHeight: 37,
    },
    subtitle: {
      color: c.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      lineHeight: 22,
      marginTop: 7,
      marginBottom: 24,
    },
    card: {
      backgroundColor: c.card,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: c.radius,
      padding: 20,
      marginBottom: 14,
    },
    dangerCard: { borderColor: c.destructive },
    cardOverline: {
      color: c.primary,
      fontFamily: "Inter_700Bold",
      fontSize: 11,
      letterSpacing: 1.2,
      marginBottom: 7,
    },
    dangerOverline: {
      color: c.destructiveText,
      fontFamily: "Inter_700Bold",
      fontSize: 11,
      letterSpacing: 1.2,
      marginBottom: 7,
    },
    cardTitle: {
      color: c.cardForeground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 19,
      lineHeight: 25,
    },
    cardBody: {
      color: c.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      lineHeight: 21,
      marginTop: 8,
    },
    unitRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 18,
    },
    unitButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: c.radius,
      borderColor: c.border,
      borderWidth: 1,
      backgroundColor: c.secondary,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 10,
    },
    unitButtonActive: {
      borderColor: c.primary,
      backgroundColor: c.primary,
    },
    unitButtonText: {
      color: c.foreground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
      textAlign: "center",
    },
    unitButtonTextActive: { color: c.primaryForeground },
    secondaryAction: {
      minHeight: 48,
      borderRadius: c.radius,
      backgroundColor: c.secondary,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 14,
      marginTop: 18,
    },
    secondaryActionText: {
      color: c.primary,
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
      textAlign: "center",
    },
    primaryAction: {
      minHeight: 50,
      borderRadius: c.radius,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 14,
      marginTop: 18,
    },
    primaryActionText: {
      color: c.primaryForeground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
      textAlign: "center",
    },
    statusText: {
      color: c.foreground,
      fontFamily: "Inter_500Medium",
      fontSize: 13,
      lineHeight: 19,
      marginTop: 12,
    },
    deleteButton: {
      minHeight: 54,
      borderRadius: c.radius,
      backgroundColor: c.destructive,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      marginTop: 18,
    },
    deleteButtonText: {
      color: c.destructiveForeground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 16,
      textAlign: "center",
    },
    busyRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    errorText: {
      color: c.destructiveText,
      fontFamily: "Inter_500Medium",
      fontSize: 13,
      lineHeight: 19,
      marginTop: 12,
    },
    doneButton: {
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    doneText: {
      color: c.primary,
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
    },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.84 },
  });
}
