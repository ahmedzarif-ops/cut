import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMyProfileQueryKey,
  getGetTodayQueryKey,
  useGetMe,
  useGetMyProfile,
  useGetToday,
  useUpsertTodayWeight,
} from "@workspace/api-client-react";
import {
  kilogramsToPounds,
  poundsToKilograms,
  roundWeight,
} from "@workspace/domain";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useSubscriptionGate } from "@/lib/subscription-gate";
import { runSignOutWithFeedback } from "@/lib/subscription-provider-state";

const GOAL_LABELS: Record<string, string> = {
  cut: "Cut",
  maintain: "Maintain",
  recomp: "Recomp",
  gain: "Gain",
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function displayWeight(weightKg: number, units: "metric" | "imperial"): string {
  const value = units === "imperial" ? kilogramsToPounds(weightKg) : weightKg;
  return roundWeight(value).toFixed(1);
}

export default function TodayScreen() {
  const subscription = useSubscriptionGate();
  const router = useRouter();
  const qc = useQueryClient();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const s = makeStyles(c);

  const [weightText, setWeightText] = React.useState("");
  const [editingWeight, setEditingWeight] = React.useState(false);
  const [weightError, setWeightError] = React.useState<string | null>(null);
  const [signOutBusy, setSignOutBusy] = React.useState(false);
  const [signOutError, setSignOutError] = React.useState<string | null>(null);
  const signOutLock = React.useRef(false);

  const meQuery = useGetMe();
  const profileQuery = useGetMyProfile({
    query: {
      queryKey: getGetMyProfileQueryKey(),
      enabled: meQuery.data?.onboardingComplete === true,
      retry: (failureCount, error) =>
        (error as { status?: number })?.status !== 404 && failureCount < 2,
    },
  });
  const todayQuery = useGetToday({
    query: {
      queryKey: getGetTodayQueryKey(),
      enabled: meQuery.data?.onboardingComplete === true,
      // Keep a foreground screen from showing yesterday after local midnight.
      refetchInterval: 60_000,
    },
  });
  const saveWeightMutation = useUpsertTodayWeight();

  const me = meQuery.data;
  const profile = profileQuery.data;
  const today = todayQuery.data;
  const units = me?.units ?? "metric";
  const unitLabel = units === "imperial" ? "lb" : "kg";

  React.useEffect(() => {
    if (today?.weightEntry && !editingWeight) {
      setWeightText(displayWeight(today.weightEntry.weightKg, units));
    }
  }, [editingWeight, today?.weightEntry, units]);

  const saveWeight = async () => {
    setWeightError(null);
    const entered = Number(weightText.trim().replace(",", "."));
    const weightKg =
      units === "imperial" ? poundsToKilograms(entered) : entered;
    if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 500) {
      setWeightError(`Enter a valid weight in ${unitLabel}.`);
      return;
    }

    try {
      const saved = await saveWeightMutation.mutateAsync({
        data: { weightKg },
      });
      setWeightText(displayWeight(saved.weightKg, units));
      setEditingWeight(false);
      await qc.invalidateQueries({ queryKey: getGetTodayQueryKey() });
    } catch {
      setWeightError(
        "Couldn't save your weigh-in. Check your connection and retry.",
      );
    }
  };

  const signOut = () =>
    runSignOutWithFeedback(
      signOutLock,
      subscription.signOut,
      { setBusy: setSignOutBusy, setError: setSignOutError },
      "CUT OS couldn't sign out. Check your connection and try again.",
    );

  const weightEditor = (
    <View style={s.weightEditor}>
      <Text style={s.inputLabel}>Today&apos;s weight</Text>
      <View style={s.weightRow}>
        <TextInput
          accessibilityLabel={`Today's weight in ${unitLabel}`}
          style={s.weightInput}
          keyboardType="decimal-pad"
          placeholder={units === "imperial" ? "210.0" : "95.3"}
          placeholderTextColor={c.mutedForeground}
          value={weightText}
          onChangeText={setWeightText}
          editable={!saveWeightMutation.isPending}
        />
        <Text style={s.unitLabel}>{unitLabel}</Text>
      </View>
      {weightError ? <Text style={s.error}>{weightError}</Text> : null}
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          s.button,
          saveWeightMutation.isPending && s.buttonDisabled,
          pressed && !saveWeightMutation.isPending && s.buttonPressed,
        ]}
        onPress={saveWeight}
        disabled={saveWeightMutation.isPending}
      >
        {saveWeightMutation.isPending ? (
          <ActivityIndicator color={c.primaryForeground} />
        ) : (
          <Text style={s.buttonText}>
            {today?.weightEntry ? "Update weigh-in" : "Log weigh-in"}
          </Text>
        )}
      </Pressable>
      {today?.weightEntry ? (
        <Pressable
          style={s.cancelButton}
          onPress={() => {
            setEditingWeight(false);
            setWeightError(null);
            setWeightText(displayWeight(today.weightEntry!.weightKg, units));
          }}
        >
          <Text style={s.secondaryButtonText}>Cancel</Text>
        </Pressable>
      ) : null}
    </View>
  );

  const renderContent = () => {
    if (meQuery.isLoading) {
      return (
        <View style={s.loading}>
          <ActivityIndicator color={c.primary} />
        </View>
      );
    }

    if (meQuery.isError || !me) {
      return (
        <View style={s.card}>
          <Text style={s.cardTitle}>Couldn&apos;t load your account</Text>
          <Text style={s.cardBody}>Check your connection and try again.</Text>
          <Pressable style={s.button} onPress={() => meQuery.refetch()}>
            <Text style={s.buttonText}>Retry</Text>
          </Pressable>
        </View>
      );
    }

    if (!me.onboardingComplete) {
      return (
        <View style={s.card}>
          <Text style={s.overline}>NEXT</Text>
          <Text style={s.cardTitle}>Build your cut plan</Text>
          <Text style={s.cardBody}>
            Tell us your goal and stats so CUT OS can guide the day.
          </Text>
          <Pressable
            style={s.button}
            onPress={() => router.push("/onboarding")}
          >
            <Text style={s.buttonText}>Start onboarding</Text>
          </Pressable>
        </View>
      );
    }

    if (profileQuery.isLoading || todayQuery.isLoading) {
      return (
        <View style={s.loading}>
          <ActivityIndicator color={c.primary} />
        </View>
      );
    }

    if (profileQuery.isError || todayQuery.isError || !today) {
      return (
        <View style={s.card}>
          <Text style={s.cardTitle}>Couldn&apos;t load Today</Text>
          <Text style={s.cardBody}>
            Your data is safe. Retry the connection.
          </Text>
          <Pressable
            style={s.button}
            onPress={() => {
              profileQuery.refetch();
              todayQuery.refetch();
            }}
          >
            <Text style={s.buttonText}>Retry</Text>
          </Pressable>
        </View>
      );
    }

    const nextActionKind = String(today.nextAction.kind);
    const isMealAction =
      nextActionKind === "first_meal" || nextActionKind === "review_meals";

    return (
      <View style={s.stack}>
        <View style={[s.card, s.nextCard]}>
          <Text style={s.overline}>NEXT</Text>
          <Text style={s.nextTitle}>{today.nextAction.title}</Text>
          <Text style={s.cardBody}>{today.nextAction.detail}</Text>
          {today.nextAction.kind === "weigh_in" ? weightEditor : null}
          {isMealAction ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                nextActionKind === "first_meal"
                  ? "Open balanced meals"
                  : "Review today’s meals"
              }
              style={({ pressed }) => [
                s.button,
                s.nextButton,
                pressed && s.buttonPressed,
              ]}
              onPress={() => router.push("/meal-one")}
            >
              <Text style={s.buttonText}>
                {nextActionKind === "first_meal"
                  ? "Open balanced meals"
                  : "Review meals"}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {today.weightEntry ? (
          <View style={s.card}>
            <Text style={s.successLabel}>WEIGH-IN COMPLETE</Text>
            <View style={s.savedWeightRow}>
              <Text style={s.savedWeight}>
                {displayWeight(today.weightEntry.weightKg, units)}
              </Text>
              <Text style={s.savedUnit}>{unitLabel}</Text>
            </View>
            {editingWeight ? (
              weightEditor
            ) : (
              <Pressable
                style={s.secondaryButton}
                onPress={() => setEditingWeight(true)}
              >
                <Text style={s.secondaryButtonText}>
                  Update today&apos;s weigh-in
                </Text>
              </Pressable>
            )}
          </View>
        ) : null}

        {today.mealCount > 0 ? (
          <View style={s.card}>
            <Text style={s.successLabel}>NUTRITION LOGGED</Text>
            <View
              accessible
              accessibilityLabel={`${today.mealCount} ${today.mealCount === 1 ? "meal" : "meals"} logged, ${Math.round(today.nutritionTotals.caloriesKcal)} calories and ${Math.round(today.nutritionTotals.proteinG)} grams protein`}
              style={s.nutritionRow}
            >
              <View style={s.nutritionMetric}>
                <Text style={s.nutritionValue}>
                  {Math.round(today.nutritionTotals.caloriesKcal)}
                </Text>
                <Text style={s.nutritionLabel}>kcal</Text>
              </View>
              <View style={s.nutritionDivider} />
              <View style={s.nutritionMetric}>
                <Text style={s.nutritionValue}>
                  {Math.round(today.nutritionTotals.proteinG)}g
                </Text>
                <Text style={s.nutritionLabel}>protein</Text>
              </View>
            </View>
            <Text style={s.nutritionDetail}>
              {today.mealCount} {today.mealCount === 1 ? "meal" : "meals"} ·{" "}
              {Math.round(today.nutritionTotals.fiberG)}g fiber
            </Text>
            <Pressable
              accessibilityRole="button"
              style={s.secondaryButton}
              onPress={() => router.push("/meal-one")}
            >
              <Text style={s.secondaryButtonText}>Review logged meals</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={s.card}>
          <Text style={s.cardTitle}>Your plan</Text>
          <View style={s.statRow}>
            <Text style={s.statLabel}>Goal</Text>
            <Text style={s.statValue}>
              {profile ? (GOAL_LABELS[profile.goal] ?? profile.goal) : "—"}
            </Text>
          </View>
          <View style={s.statRow}>
            <Text style={s.statLabel}>Start weight</Text>
            <Text style={s.statValue}>
              {profile?.startWeightKg != null
                ? `${displayWeight(profile.startWeightKg, units)} ${unitLabel}`
                : "—"}
            </Text>
          </View>
          <View style={s.statRow}>
            <Text style={s.statLabel}>Goal weight</Text>
            <Text style={s.statValue}>
              {profile?.goalWeightKg != null
                ? `${displayWeight(profile.goalWeightKg, units)} ${unitLabel}`
                : "—"}
            </Text>
          </View>
          <Pressable
            style={s.secondaryButton}
            onPress={() => router.push("/onboarding")}
          >
            <Text style={s.secondaryButtonText}>Edit plan</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={s.flex}
      contentContainerStyle={[
        s.container,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.topRow}>
        <View style={s.topRowText}>
          <Text style={s.greeting}>{greeting()}</Text>
          <Text style={s.name}>
            {profile?.displayName || me?.email || "Athlete"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Settings"
          style={({ pressed }) => [
            s.settingsButton,
            pressed && s.buttonPressed,
          ]}
          onPress={() => router.push("/settings")}
        >
          <Text style={s.settingsButtonText}>Settings</Text>
        </Pressable>
      </View>

      {renderContent()}

      {signOutError ? (
        <Text accessibilityRole="alert" style={[s.error, s.signOutError]}>
          {signOutError}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: signOutBusy, busy: signOutBusy }}
        disabled={signOutBusy}
        style={({ pressed }) => [
          s.signOut,
          signOutBusy && s.buttonDisabled,
          pressed && !signOutBusy && s.buttonPressed,
        ]}
        onPress={() => void signOut()}
      >
        {signOutBusy ? (
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
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 24,
    },
    topRowText: { flex: 1 },
    greeting: {
      color: c.mutedForeground,
      fontFamily: "Inter_500Medium",
      fontSize: 16,
    },
    name: {
      color: c.foreground,
      fontFamily: "Inter_700Bold",
      fontSize: 28,
      marginTop: 2,
    },
    settingsButton: {
      minWidth: 44,
      minHeight: 44,
      borderRadius: c.radius,
      borderColor: c.border,
      borderWidth: 1,
      backgroundColor: c.secondary,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12,
    },
    settingsButtonText: {
      color: c.primary,
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
    },
    loading: { paddingVertical: 48, alignItems: "center" },
    stack: { gap: 14 },
    card: {
      backgroundColor: c.card,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: c.radius,
      padding: 20,
    },
    nextCard: { borderColor: c.primary, borderWidth: 1.5 },
    overline: {
      color: c.primary,
      fontFamily: "Inter_700Bold",
      fontSize: 12,
      letterSpacing: 1.6,
      marginBottom: 8,
    },
    nextTitle: {
      color: c.cardForeground,
      fontFamily: "Inter_700Bold",
      fontSize: 24,
      lineHeight: 30,
      marginBottom: 10,
    },
    cardTitle: {
      color: c.cardForeground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 18,
      marginBottom: 8,
    },
    cardBody: {
      color: c.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 18,
    },
    weightEditor: { marginTop: 2 },
    inputLabel: {
      color: c.foreground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
      marginBottom: 8,
    },
    weightRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    weightInput: {
      flex: 1,
      backgroundColor: c.input,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: c.radius,
      color: c.foreground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 24,
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    unitLabel: {
      color: c.mutedForeground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 16,
      width: 28,
    },
    error: {
      color: c.destructive,
      fontFamily: "Inter_500Medium",
      fontSize: 13,
      marginTop: 8,
    },
    button: {
      backgroundColor: c.primary,
      borderRadius: c.radius,
      alignItems: "center",
      paddingVertical: 15,
      marginTop: 14,
    },
    buttonDisabled: { opacity: 0.55 },
    buttonPressed: { opacity: 0.85 },
    nextButton: { marginTop: 0 },
    buttonText: {
      color: c.primaryForeground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 16,
    },
    cancelButton: { alignItems: "center", paddingVertical: 12 },
    successLabel: {
      color: c.success,
      fontFamily: "Inter_700Bold",
      fontSize: 12,
      letterSpacing: 1.2,
    },
    savedWeightRow: {
      flexDirection: "row",
      alignItems: "baseline",
      marginTop: 8,
    },
    savedWeight: {
      color: c.foreground,
      fontFamily: "Inter_700Bold",
      fontSize: 36,
    },
    savedUnit: {
      color: c.mutedForeground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 16,
      marginLeft: 6,
    },
    nutritionRow: {
      flexDirection: "row",
      alignItems: "stretch",
      marginTop: 12,
    },
    nutritionMetric: { flex: 1 },
    nutritionValue: {
      color: c.foreground,
      fontFamily: "Inter_700Bold",
      fontSize: 30,
    },
    nutritionLabel: {
      color: c.mutedForeground,
      fontFamily: "Inter_500Medium",
      fontSize: 13,
      marginTop: 1,
    },
    nutritionDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginHorizontal: 18,
    },
    nutritionDetail: {
      color: c.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      marginTop: 12,
    },
    statRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      borderTopColor: c.border,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    statLabel: {
      color: c.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 15,
    },
    statValue: {
      color: c.foreground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
    },
    secondaryButton: {
      alignItems: "center",
      paddingVertical: 14,
      marginTop: 8,
    },
    secondaryButtonText: {
      color: c.primary,
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
    },
    signOut: { alignItems: "center", paddingVertical: 16, marginTop: 24 },
    signOutError: { textAlign: "center", marginTop: 24 },
    signOutText: {
      color: c.mutedForeground,
      fontFamily: "Inter_500Medium",
      fontSize: 15,
    },
  });
}
