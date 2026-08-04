import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LegalSupportLinks } from "@/components/LegalSupportLinks";
import { useColors } from "@/hooks/useColors";
import { formatPlanBilling } from "@/lib/subscription";
import { useSubscriptionGate } from "@/lib/subscription-gate";
import { runSubscriptionSignOut } from "@/lib/subscription-provider-state";

const BENEFITS = [
  "A clear next step for today",
  "A daily weigh-in you can update",
  "Simple balanced meal options with nutrition estimates",
] as const;

export default function SubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const s = makeStyles(c);
  const subscription = useSubscriptionGate();
  const [selectedPackageId, setSelectedPackageId] = React.useState<
    string | null
  >(null);
  const [busyAction, setBusyAction] = React.useState<
    "purchase" | "restore" | "verify" | "manage" | "signout" | null
  >(null);
  const signOutLock = React.useRef(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingAccess, setPendingAccess] = React.useState(false);

  React.useEffect(() => {
    setSelectedPackageId((current) => {
      if (
        current &&
        subscription.plans.some((plan) => plan.packageIdentifier === current)
      ) {
        return current;
      }
      // Preserve the order remotely configured in RevenueCat. CUT OS does not
      // silently prefer an annual or otherwise hard-coded package.
      return subscription.plans[0]?.packageIdentifier ?? null;
    });
  }, [subscription.plans]);

  const selectedPlan = subscription.plans.find(
    (plan) => plan.packageIdentifier === selectedPackageId,
  );
  const actionBusy = busyAction !== null;

  const purchase = async () => {
    if (!selectedPlan || actionBusy) return;
    setBusyAction("purchase");
    setError(null);
    setMessage(null);
    setPendingAccess(false);
    try {
      const result = await subscription.purchase(
        selectedPlan.packageIdentifier,
      );
      if (result === "cancelled") return;
      if (result === "pending") {
        setPendingAccess(true);
        setMessage(
          "Apple confirmed the purchase. CUT OS is waiting for secure access verification. Tap Check access again shortly if access does not open.",
        );
      }
    } catch {
      setError(
        "The purchase could not be completed. Check your connection and try again.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const restore = async () => {
    if (
      actionBusy ||
      !subscription.capability.available ||
      subscription.storeStatus !== "ready"
    ) {
      return;
    }
    setBusyAction("restore");
    setError(null);
    setMessage(null);
    setPendingAccess(false);
    try {
      const result = await subscription.restore();
      if (result === "not_entitled") {
        setMessage(
          "No active CUT OS Pro purchase was found for this Apple ID.",
        );
      } else if (result === "pending") {
        setPendingAccess(true);
        setMessage(
          "The restore check finished. CUT OS is still waiting for secure access verification. Tap Check access again shortly if access does not open.",
        );
      }
    } catch {
      setError(
        "CUT OS couldn't restore purchases. Check your connection and try again.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const recheckAccess = async () => {
    if (actionBusy) return;
    setBusyAction("verify");
    setError(null);
    setMessage(null);
    try {
      const result = await subscription.recheckAccess();
      if (result === "pending") {
        setPendingAccess(true);
        setMessage(
          "Secure verification completed, but CUT OS Pro is not active yet. Wait a moment and check again, or restore purchases.",
        );
      }
    } catch {
      setPendingAccess(true);
      setError(
        "CUT OS couldn't verify purchase access. Check your connection and try again.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const signOut = async () => {
    if (actionBusy || signOutLock.current) return;
    setBusyAction("signout");
    setError(null);
    setMessage(null);
    try {
      await runSubscriptionSignOut(signOutLock, subscription.signOut);
    } catch {
      setError("CUT OS couldn't sign out. Try again.");
    } finally {
      setBusyAction(null);
    }
  };

  const manage = async () => {
    if (actionBusy) return;
    setBusyAction("manage");
    setError(null);
    try {
      await WebBrowser.openBrowserAsync(subscription.managementUrl);
    } catch {
      setError(
        "CUT OS couldn't open App Store subscription settings. Try again when you're online.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const unavailableMessage =
    !subscription.capability.available &&
    subscription.capability.reason === "expo_go"
      ? "Purchases are unavailable in Expo Go. Install the CUT OS TestFlight or App Store build to subscribe."
      : !subscription.capability.available &&
          subscription.capability.reason === "ios_only"
        ? "CUT OS subscriptions are currently available in the iPhone app."
        : !subscription.capability.available
          ? "Purchases are unavailable in this build. Please install a newer CUT OS build."
          : null;

  return (
    <ScrollView
      style={s.flex}
      contentContainerStyle={[
        s.container,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 36 },
      ]}
    >
      <View style={s.topRow}>
        <Text style={s.brand}>CUT OS PRO</Text>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [s.settingsLink, pressed && s.pressed]}
          onPress={() => router.push("/settings")}
        >
          <Text style={s.settingsLinkText}>Settings</Text>
        </Pressable>
      </View>

      <Text accessibilityRole="header" style={s.title}>
        Make the next choice simple.
      </Text>
      <Text style={s.subtitle}>
        CUT OS Pro keeps your daily check-in, weigh-in, and practical nutrition
        guidance together.
      </Text>

      <View style={s.benefitsCard}>
        {BENEFITS.map((benefit) => (
          <View key={benefit} style={s.benefitRow}>
            <View style={s.checkCircle}>
              <Text style={s.check}>✓</Text>
            </View>
            <Text style={s.benefitText}>{benefit}</Text>
          </View>
        ))}
      </View>

      {subscription.storeStatus === "loading" ? (
        <View style={s.loadingCard}>
          <ActivityIndicator color={c.primary} />
          <Text style={s.loadingText}>Connecting to the App Store…</Text>
        </View>
      ) : null}

      {subscription.storeStatus === "ready" &&
      subscription.catalogStatus === "loading" ? (
        <View style={s.loadingCard}>
          <ActivityIndicator color={c.primary} />
          <Text style={s.loadingText}>Loading App Store options…</Text>
        </View>
      ) : null}

      {subscription.storeStatus === "ready" &&
      subscription.catalogStatus === "ready" ? (
        subscription.plans.length > 0 ? (
          <View accessibilityRole="radiogroup" style={s.planList}>
            {subscription.plans.map((plan) => {
              const selected = plan.packageIdentifier === selectedPackageId;
              return (
                <Pressable
                  key={plan.packageIdentifier}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  disabled={actionBusy}
                  style={({ pressed }) => [
                    s.planCard,
                    selected && s.planCardSelected,
                    pressed && !actionBusy && s.pressed,
                    actionBusy && s.disabled,
                  ]}
                  onPress={() => setSelectedPackageId(plan.packageIdentifier)}
                >
                  <View style={s.planHeader}>
                    <View style={s.planText}>
                      <Text style={s.planTitle}>{plan.title}</Text>
                      {plan.description ? (
                        <Text style={s.planDescription}>
                          {plan.description}
                        </Text>
                      ) : null}
                    </View>
                    <View
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                      style={[s.radio, selected && s.radioSelected]}
                    >
                      {selected ? <Text style={s.radioCheck}>✓</Text> : null}
                    </View>
                  </View>
                  <Text style={s.planPrice}>
                    {formatPlanBilling(
                      plan.priceString,
                      plan.subscriptionPeriod,
                    )}
                  </Text>
                  {plan.introductoryText ? (
                    <Text style={s.introText}>{plan.introductoryText}</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={s.noticeCard}>
            <Text style={s.noticeText}>
              No App Store subscription options are currently available.
            </Text>
            <Pressable
              accessibilityRole="button"
              style={s.textButton}
              onPress={subscription.retryCatalog}
            >
              <Text style={s.textButtonLabel}>Try again</Text>
            </Pressable>
          </View>
        )
      ) : null}

      {subscription.storeStatus === "ready" &&
      subscription.catalogStatus === "unavailable" ? (
        <View style={s.noticeCard}>
          <Text style={s.noticeText}>
            CUT OS couldn't load App Store subscription options. You can still
            restore an existing purchase.
          </Text>
          <Pressable
            accessibilityRole="button"
            style={s.textButton}
            onPress={subscription.retryCatalog}
          >
            <Text style={s.textButtonLabel}>Retry subscription options</Text>
          </Pressable>
        </View>
      ) : null}

      {subscription.storeStatus === "unavailable" ? (
        <View style={s.noticeCard}>
          <Text style={s.noticeText}>
            {unavailableMessage ??
              "CUT OS couldn't load App Store options. Check your connection and try again."}
          </Text>
          {subscription.capability.available ? (
            <Pressable
              accessibilityRole="button"
              style={s.textButton}
              onPress={subscription.retryStore}
            >
              <Text style={s.textButtonLabel}>Try again</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {message ? (
        <Text accessibilityLiveRegion="polite" style={s.message}>
          {message}
        </Text>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      ) : null}

      <Pressable
        accessibilityLabel={
          selectedPlan
            ? `Continue — ${formatPlanBilling(
                selectedPlan.priceString,
                selectedPlan.subscriptionPeriod,
              )}`
            : "Choose a subscription"
        }
        accessibilityRole="button"
        accessibilityState={{
          disabled: !selectedPlan || actionBusy,
          busy: busyAction === "purchase",
        }}
        disabled={!selectedPlan || actionBusy}
        style={({ pressed }) => [
          s.primaryButton,
          (!selectedPlan || actionBusy) && s.disabled,
          pressed && selectedPlan && !actionBusy && s.pressed,
        ]}
        onPress={() => void purchase()}
      >
        {busyAction === "purchase" ? (
          <ActivityIndicator color={c.primaryForeground} />
        ) : (
          <Text style={s.primaryButtonText}>
            {selectedPlan
              ? `Continue — ${formatPlanBilling(
                  selectedPlan.priceString,
                  selectedPlan.subscriptionPeriod,
                )}`
              : "Choose a subscription"}
          </Text>
        )}
      </Pressable>

      <View style={s.secondaryActions}>
        <Pressable
          accessibilityLabel={
            pendingAccess ? "Check access again" : "Check purchase access"
          }
          accessibilityRole="button"
          accessibilityHint="Securely asks CUT OS to verify your App Store purchase again"
          accessibilityState={{
            disabled: actionBusy,
            busy: busyAction === "verify",
          }}
          disabled={actionBusy}
          style={({ pressed }) => [
            s.secondaryButton,
            actionBusy && s.disabled,
            pressed && !actionBusy && s.pressed,
          ]}
          onPress={() => void recheckAccess()}
        >
          {busyAction === "verify" ? (
            <ActivityIndicator color={c.primary} />
          ) : (
            <Text style={s.secondaryButtonText}>
              {pendingAccess ? "Check access again" : "Check purchase access"}
            </Text>
          )}
        </Pressable>
        <Pressable
          accessibilityLabel="Restore purchases"
          accessibilityRole="button"
          accessibilityState={{
            disabled:
              actionBusy ||
              !subscription.capability.available ||
              subscription.storeStatus !== "ready",
            busy: busyAction === "restore",
          }}
          disabled={
            actionBusy ||
            !subscription.capability.available ||
            subscription.storeStatus !== "ready"
          }
          style={({ pressed }) => [
            s.secondaryButton,
            (actionBusy ||
              !subscription.capability.available ||
              subscription.storeStatus !== "ready") &&
              s.disabled,
            pressed && !actionBusy && s.pressed,
          ]}
          onPress={() => void restore()}
        >
          {busyAction === "restore" ? (
            <ActivityIndicator color={c.primary} />
          ) : (
            <Text style={s.secondaryButtonText}>Restore purchases</Text>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="link"
          disabled={actionBusy}
          style={({ pressed }) => [s.secondaryButton, pressed && s.pressed]}
          onPress={() => void manage()}
        >
          <Text style={s.secondaryButtonText}>Manage subscription</Text>
        </Pressable>
      </View>

      <Text style={s.disclosure}>
        Payment is charged to your Apple ID after you confirm with Apple.
        Subscriptions renew automatically until canceled. Manage or cancel in
        App Store settings. Apple shows the exact price, billing period, and any
        eligible introductory offer before confirmation.
      </Text>
      <LegalSupportLinks variant="compact" />
      <Pressable
        accessibilityLabel="Sign out"
        accessibilityRole="button"
        accessibilityState={{
          disabled: actionBusy,
          busy: busyAction === "signout",
        }}
        disabled={actionBusy}
        style={({ pressed }) => [
          s.signOutButton,
          actionBusy && s.disabled,
          pressed && !actionBusy && s.pressed,
        ]}
        onPress={() => void signOut()}
      >
        {busyAction === "signout" ? (
          <ActivityIndicator color={c.mutedForeground} />
        ) : (
          <Text style={s.signOutText}>Sign out</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    container: { paddingHorizontal: 24 },
    topRow: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 22,
    },
    brand: {
      color: c.primary,
      fontFamily: "Inter_700Bold",
      fontSize: 12,
      letterSpacing: 1.7,
    },
    settingsLink: {
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: 8,
    },
    settingsLinkText: {
      color: c.primary,
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
    },
    title: {
      color: c.foreground,
      fontFamily: "Inter_700Bold",
      fontSize: 34,
      lineHeight: 40,
    },
    subtitle: {
      color: c.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 16,
      lineHeight: 24,
      marginTop: 10,
    },
    benefitsCard: {
      backgroundColor: c.card,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: c.radius,
      padding: 18,
      gap: 14,
      marginTop: 24,
      marginBottom: 16,
    },
    benefitRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    checkCircle: {
      width: 25,
      height: 25,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.success,
    },
    check: {
      color: c.successForeground,
      fontFamily: "Inter_700Bold",
      fontSize: 14,
    },
    benefitText: {
      flex: 1,
      color: c.cardForeground,
      fontFamily: "Inter_500Medium",
      fontSize: 15,
      lineHeight: 21,
    },
    loadingCard: {
      minHeight: 110,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.card,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: c.radius,
      marginBottom: 16,
    },
    loadingText: {
      color: c.mutedForeground,
      fontFamily: "Inter_500Medium",
      fontSize: 14,
      marginTop: 10,
    },
    planList: { gap: 10, marginBottom: 16 },
    planCard: {
      backgroundColor: c.card,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: c.radius,
      padding: 17,
    },
    planCardSelected: { borderColor: c.primary, borderWidth: 2 },
    planHeader: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
    planText: { flex: 1 },
    planTitle: {
      color: c.cardForeground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 17,
    },
    planDescription: {
      color: c.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      lineHeight: 19,
      marginTop: 4,
    },
    radio: {
      width: 21,
      height: 21,
      borderRadius: 11,
      borderColor: c.inputBorder,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    radioSelected: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    radioCheck: {
      color: c.primaryForeground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
      lineHeight: 17,
    },
    planPrice: {
      color: c.foreground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 16,
      marginTop: 12,
    },
    introText: {
      color: c.success,
      fontFamily: "Inter_600SemiBold",
      fontSize: 13,
      marginTop: 6,
    },
    noticeCard: {
      backgroundColor: c.card,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: c.radius,
      padding: 18,
      marginBottom: 16,
    },
    noticeText: {
      color: c.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      lineHeight: 21,
    },
    textButton: { minHeight: 44, justifyContent: "center", marginTop: 6 },
    textButtonLabel: {
      color: c.primary,
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
    },
    message: {
      color: c.foreground,
      backgroundColor: c.secondary,
      borderRadius: c.radius,
      fontFamily: "Inter_500Medium",
      fontSize: 13,
      lineHeight: 19,
      padding: 13,
      marginBottom: 12,
    },
    error: {
      color: c.destructiveText,
      fontFamily: "Inter_500Medium",
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 12,
    },
    primaryButton: {
      minHeight: 56,
      borderRadius: c.radius,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 15,
    },
    primaryButtonText: {
      color: c.primaryForeground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 16,
      textAlign: "center",
    },
    secondaryActions: { marginTop: 9, gap: 2 },
    secondaryButton: {
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12,
    },
    secondaryButtonText: {
      color: c.primary,
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
    },
    disclosure: {
      color: c.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
      marginTop: 12,
    },
    signOutButton: {
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 12,
    },
    signOutText: {
      color: c.mutedForeground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
    },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.84 },
  });
}
