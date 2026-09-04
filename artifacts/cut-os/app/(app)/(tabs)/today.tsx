import { Ionicons } from "@expo/vector-icons";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { CutScreen } from "@/components/CutScreen";
import { useColors } from "@/hooks/useColors";
import {
  dailyDeviceTimeZoneQueryKey,
  useDeviceTimeZoneGate,
} from "@/lib/device-time-zone-gate";
import {
  isWeightEntryPreconditionFailed,
  shouldResetReviewedWeightDay,
} from "@/lib/weight-form";

const GOAL_LABELS: Record<string, string> = {
  cut: "Cut",
  maintain: "Maintain",
  recomp: "Recomp",
  gain: "Gain",
};

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function displayWeight(weightKg: number, units: "metric" | "imperial"): string {
  const value = units === "imperial" ? kilogramsToPounds(weightKg) : weightKg;
  return roundWeight(value).toFixed(1);
}

function displayDay(dayKey?: string): string {
  if (!dayKey) return "Your daily command center";
  return new Date(`${dayKey}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export default function TodayScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const c = useColors();
  const s = makeStyles(c);
  const dailyTimeZone = useDeviceTimeZoneGate();
  const params = useLocalSearchParams<{ action?: string }>();

  const [weightText, setWeightText] = React.useState("");
  const [editingWeight, setEditingWeight] = React.useState(false);
  const [reviewedWeightDayKey, setReviewedWeightDayKey] = React.useState<
    string | null
  >(null);
  const [weightError, setWeightError] = React.useState<string | null>(null);
  const authoritativeWeightDayKey = React.useRef<string | null>(null);

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
      queryKey: dailyDeviceTimeZoneQueryKey(
        getGetTodayQueryKey(),
        dailyTimeZone,
      ),
      enabled: meQuery.data?.onboardingComplete === true,
      refetchInterval: 60_000,
    },
    request: dailyTimeZone.request,
  });
  const saveWeightMutation = useUpsertTodayWeight({
    request: dailyTimeZone.request,
  });

  React.useEffect(() => {
    if (todayQuery.error) dailyTimeZone.reject(todayQuery.error);
  }, [dailyTimeZone, todayQuery.error]);

  const me = meQuery.data;
  const profile = profileQuery.data;
  const today = todayQuery.data;
  const units = me?.units ?? "metric";
  const unitLabel = units === "imperial" ? "lb" : "kg";

  React.useEffect(() => {
    const dayKey = today?.dayKey ?? null;
    if (!dayKey) return;

    const priorDayKey = authoritativeWeightDayKey.current;
    authoritativeWeightDayKey.current = dayKey;
    if (
      shouldResetReviewedWeightDay({
        priorAuthoritativeDayKey: priorDayKey,
        currentAuthoritativeDayKey: dayKey,
        reviewedDayKey: reviewedWeightDayKey,
      })
    ) {
      setWeightText("");
      setReviewedWeightDayKey(null);
      setEditingWeight(false);
      setWeightError(
        "A new local day started. Enter today's weight again before saving.",
      );
      return;
    }

    if (today?.weightEntry && !editingWeight) {
      setWeightText(displayWeight(today.weightEntry.weightKg, units));
      setReviewedWeightDayKey(null);
    }
  }, [
    editingWeight,
    reviewedWeightDayKey,
    today?.dayKey,
    today?.weightEntry,
    units,
  ]);

  const saveWeight = async () => {
    setWeightError(null);
    if (!today?.dayKey || !reviewedWeightDayKey) {
      setWeightError("Enter or review today's weight before saving.");
      return;
    }
    if (reviewedWeightDayKey !== today.dayKey) {
      setWeightText("");
      setReviewedWeightDayKey(null);
      setWeightError(
        "Today changed. Enter today's weight again before saving.",
      );
      await todayQuery.refetch().catch(() => undefined);
      return;
    }

    const entered = Number(weightText.trim().replace(",", "."));
    const weightKg =
      units === "imperial" ? poundsToKilograms(entered) : entered;
    if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 500) {
      setWeightError(`Enter a valid weight in ${unitLabel}.`);
      return;
    }

    try {
      const reviewedDayKey = reviewedWeightDayKey;
      const saved = await saveWeightMutation.mutateAsync({
        data: { dayKey: reviewedDayKey, weightKg },
      });
      if (authoritativeWeightDayKey.current !== reviewedDayKey) {
        setWeightText("");
        setReviewedWeightDayKey(null);
        setEditingWeight(false);
        setWeightError(
          "The weigh-in was saved for the prior local day. Enter today's weight again.",
        );
        await qc.invalidateQueries({ queryKey: getGetTodayQueryKey() });
        return;
      }
      setWeightText(displayWeight(saved.weightKg, units));
      setReviewedWeightDayKey(null);
      setEditingWeight(false);
      await qc.invalidateQueries({ queryKey: getGetTodayQueryKey() });
    } catch (error) {
      if (dailyTimeZone.reject(error)) return;
      if (isWeightEntryPreconditionFailed(error)) {
        await todayQuery.refetch().catch(() => undefined);
        setWeightText("");
        setReviewedWeightDayKey(null);
        setEditingWeight(false);
        setWeightError(
          "Today changed. Enter today's weight again before saving.",
        );
        return;
      }
      setWeightError(
        "Couldn't save your weigh-in. Check your connection and retry.",
      );
    }
  };

  const openWeightEditor = () => {
    if (today?.weightEntry) {
      setWeightText(displayWeight(today.weightEntry.weightKg, units));
      setReviewedWeightDayKey(today.dayKey);
    } else {
      setWeightText("");
      setReviewedWeightDayKey(null);
    }
    setWeightError(null);
    setEditingWeight(true);
  };

  const openNextAction = () => {
    switch (today?.nextAction.kind) {
      case "complete_onboarding":
        router.push("/onboarding");
        return;
      case "weigh_in":
        openWeightEditor();
        return;
      case "first_meal":
      case "review_meals":
        router.push("/meal-one");
        return;
    }
  };

  React.useEffect(() => {
    if (params.action === "weight" && today?.dayKey) {
      openWeightEditor();
      router.setParams({ action: undefined });
    }
  }, [params.action, router, today?.dayKey]);

  const weightEditor = (
    <View style={[s.card, s.weightEditor]}>
      <View style={s.sectionHeadingRow}>
        <View>
          <Text style={s.sectionLabel}>WEIGHT</Text>
          <Text style={s.sectionTitle}>Today&apos;s weigh-in</Text>
        </View>
        <Pressable
          accessibilityLabel="Cancel editing weigh-in"
          accessibilityRole="button"
          style={s.iconButton}
          onPress={() => {
            setEditingWeight(false);
            setWeightError(null);
          }}
        >
          <Ionicons name="close" size={21} color={c.mutedForeground} />
        </Pressable>
      </View>
      <View style={s.weightInputRow}>
        <TextInput
          accessibilityLabel={`Today's weight in ${unitLabel}`}
          autoFocus
          style={s.weightInput}
          keyboardType="decimal-pad"
          placeholder={units === "imperial" ? "180.0" : "81.6"}
          placeholderTextColor={c.mutedForeground}
          value={weightText}
          onChangeText={(value) => {
            setWeightText(value);
            setReviewedWeightDayKey(today?.dayKey ?? null);
            setWeightError(null);
          }}
          editable={!saveWeightMutation.isPending}
        />
        <Text style={s.unitLabel}>{unitLabel}</Text>
      </View>
      {weightError ? (
        <Text accessibilityRole="alert" style={s.error}>
          {weightError}
        </Text>
      ) : null}
      <Pressable
        accessibilityLabel="Update today's weigh-in"
        accessibilityRole="button"
        accessibilityState={{
          disabled: saveWeightMutation.isPending,
          busy: saveWeightMutation.isPending,
        }}
        disabled={saveWeightMutation.isPending}
        style={({ pressed }) => [
          s.primaryButton,
          saveWeightMutation.isPending && s.disabled,
          pressed && s.pressed,
        ]}
        onPress={() => void saveWeight()}
      >
        {saveWeightMutation.isPending ? (
          <ActivityIndicator color={c.primaryForeground} />
        ) : (
          <Text style={s.primaryButtonText}>Save weigh-in</Text>
        )}
      </Pressable>
    </View>
  );

  const loading =
    meQuery.isLoading ||
    (me?.onboardingComplete === true &&
      (profileQuery.isLoading || todayQuery.isLoading));
  const failed =
    meQuery.isError ||
    (me?.onboardingComplete === true &&
      (profileQuery.isError || todayQuery.isError));

  return (
    <CutScreen
      title="Today"
      eyebrow={`${greeting()}${profile?.displayName ? `, ${profile.displayName}` : ""}`}
    >
      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator color={c.primary} />
          <Text style={s.loadingText}>Loading your day…</Text>
        </View>
      ) : failed || !me ? (
        <View style={s.card}>
          <Text style={s.sectionTitle}>Couldn&apos;t load Today</Text>
          <Text style={s.body}>
            Your data is safe. Check your connection and retry.
          </Text>
          <Pressable
            accessibilityLabel="Retry loading Today"
            accessibilityRole="button"
            style={s.primaryButton}
            onPress={() => {
              void meQuery.refetch();
              void profileQuery.refetch();
              void todayQuery.refetch();
            }}
          >
            <Text style={s.primaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : !me.onboardingComplete ? (
        <View style={[s.card, s.heroCard]}>
          <Text style={s.sectionLabel}>START HERE</Text>
          <Text style={s.heroPrompt}>Set your goal</Text>
          <Text style={s.body}>
            Tell CUT OS whether you are cutting or recomping, then start
            logging.
          </Text>
          <Pressable
            accessibilityLabel="Start onboarding"
            accessibilityRole="button"
            style={s.primaryButton}
            onPress={() => router.push("/onboarding")}
          >
            <Text style={s.primaryButtonText}>Set up CUT OS</Text>
          </Pressable>
        </View>
      ) : today ? (
        <View style={s.stack}>
          <View style={[s.card, s.heroCard]}>
            <View style={s.heroTopRow}>
              <Text style={s.dateText}>{displayDay(today.dayKey)}</Text>
              <View style={[s.goalPill, { backgroundColor: c.accent }]}>
                <Text style={[s.goalPillText, { color: c.accentForeground }]}>
                  {profile
                    ? (GOAL_LABELS[profile.goal] ?? profile.goal)
                    : "Goal"}
                </Text>
              </View>
            </View>
            <View
              accessible
              accessibilityLabel={`${Math.round(today.nutritionTotals.caloriesKcal)} calories logged`}
            >
              <Text style={s.heroNumber}>
                {Math.round(
                  today.nutritionTotals.caloriesKcal,
                ).toLocaleString()}
              </Text>
              <Text style={s.heroUnit}>calories logged</Text>
            </View>
            <View style={s.macroGrid}>
              <MacroMetric
                label="Protein"
                value={`${Math.round(today.nutritionTotals.proteinG)}g`}
                color="#2563EB"
              />
              <MacroMetric
                label="Carbs"
                value={`${Math.round(today.nutritionTotals.carbsG)}g`}
                color="#D97706"
              />
              <MacroMetric
                label="Fat"
                value={`${Math.round(today.nutritionTotals.fatG)}g`}
                color="#7C3AED"
              />
              <MacroMetric
                label="Fiber"
                value={`${Math.round(today.nutritionTotals.fiberG)}g`}
                color="#15803D"
              />
            </View>
          </View>

          <Pressable
            accessibilityLabel={today.nextAction.title}
            accessibilityHint="Opens the next recommended action"
            accessibilityRole="button"
            style={({ pressed }) => [
              s.card,
              s.nextCard,
              pressed && s.pressed,
            ]}
            onPress={openNextAction}
          >
            <View style={s.nextIcon}>
              <Ionicons name="navigate" size={20} color={c.primaryForeground} />
            </View>
            <View style={s.nextCopy}>
              <Text style={s.sectionLabel}>NEXT ACTION</Text>
              <Text style={s.nextTitle}>{today.nextAction.title}</Text>
              <Text style={s.bodyCompact}>{today.nextAction.detail}</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={c.mutedForeground}
            />
          </Pressable>

          <View>
            <Text style={s.groupTitle}>Quick log</Text>
            <View style={s.quickGrid}>
              <QuickAction
                label="Food"
                icon="restaurant-outline"
                onPress={() => router.push("/food")}
              />
              <QuickAction
                label="Weight"
                icon="scale-outline"
                onPress={openWeightEditor}
              />
              <QuickAction
                label="Workout"
                icon="barbell-outline"
                onPress={() => router.push("/training")}
              />
              <QuickAction
                label="Photo"
                icon="camera-outline"
                badge="PRO"
                onPress={() => router.push("/photo-estimate")}
              />
            </View>
          </View>

          {editingWeight ? weightEditor : null}

          <Pressable
            accessibilityLabel="Open Food diary"
            accessibilityRole="button"
            style={({ pressed }) => [
              s.card,
              s.summaryRow,
              pressed && s.pressed,
            ]}
            onPress={() => router.push("/food")}
          >
            <View style={[s.summaryIcon, { backgroundColor: c.accent }]}>
              <Ionicons
                name="restaurant"
                size={21}
                color={c.accentForeground}
              />
            </View>
            <View style={s.summaryCopy}>
              <Text style={s.sectionTitle}>Food</Text>
              <Text style={s.bodyCompact}>
                {today.mealCount === 0
                  ? "Nothing logged yet"
                  : `${today.mealCount} ${today.mealCount === 1 ? "meal" : "meals"} · ${Math.round(today.nutritionTotals.proteinG)}g protein`}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={c.mutedForeground}
            />
          </Pressable>

          <Pressable
            accessibilityLabel="Open Progress"
            accessibilityRole="button"
            style={({ pressed }) => [
              s.card,
              s.summaryRow,
              pressed && s.pressed,
            ]}
            onPress={() => router.push("/progress")}
          >
            <View style={[s.summaryIcon, { backgroundColor: c.secondary }]}>
              <Ionicons name="scale" size={21} color={c.primary} />
            </View>
            <View style={s.summaryCopy}>
              <Text style={s.sectionTitle}>Weight</Text>
              <Text style={s.bodyCompact}>
                {today.weightEntry
                  ? `${displayWeight(today.weightEntry.weightKg, units)} ${unitLabel} today`
                  : "Add today's weigh-in"}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={c.mutedForeground}
            />
          </Pressable>

          <Pressable
            accessibilityLabel="Open Training"
            accessibilityRole="button"
            style={({ pressed }) => [
              s.card,
              s.summaryRow,
              pressed && s.pressed,
            ]}
            onPress={() => router.push("/training")}
          >
            <View style={[s.summaryIcon, { backgroundColor: c.secondary }]}>
              <Ionicons name="barbell" size={21} color={c.primary} />
            </View>
            <View style={s.summaryCopy}>
              <Text style={s.sectionTitle}>Training</Text>
              <Text style={s.bodyCompact}>
                Log today&apos;s session or recovery day
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={c.mutedForeground}
            />
          </Pressable>
        </View>
      ) : null}
    </CutScreen>
  );

  function MacroMetric({
    label,
    value,
    color,
  }: {
    label: string;
    value: string;
    color: string;
  }) {
    return (
      <View
        accessible
        accessibilityLabel={`${label}, ${value}`}
        style={s.macroMetric}
      >
        <View style={[s.macroDot, { backgroundColor: color }]} />
        <Text style={s.macroValue}>{value}</Text>
        <Text style={s.macroLabel}>{label}</Text>
      </View>
    );
  }

  function QuickAction({
    label,
    icon,
    badge,
    onPress,
  }: {
    label: string;
    icon: IoniconName;
    badge?: string;
    onPress: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}${badge ? `, ${badge}` : ""}`}
        style={({ pressed }) => [s.quickAction, pressed && s.pressed]}
        onPress={onPress}
      >
        {badge ? <Text style={s.proBadge}>{badge}</Text> : null}
        <Ionicons name={icon} size={23} color={c.primary} />
        <Text style={s.quickLabel}>{label}</Text>
      </Pressable>
    );
  }
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    stack: { gap: 12 },
    loading: { minHeight: 320, alignItems: "center", justifyContent: "center" },
    loadingText: { color: c.mutedForeground, fontSize: 15, marginTop: 12 },
    card: {
      backgroundColor: c.card,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 16,
      padding: 16,
    },
    heroCard: {
      padding: 20,
      shadowColor: "#003B8F",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
      elevation: 2,
    },
    heroTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    dateText: { color: c.mutedForeground, fontSize: 14, fontWeight: "600" },
    goalPill: {
      minHeight: 30,
      borderRadius: 15,
      paddingHorizontal: 12,
      justifyContent: "center",
    },
    goalPillText: { fontSize: 12, fontWeight: "700" },
    heroNumber: {
      color: c.foreground,
      fontSize: 58,
      lineHeight: 64,
      letterSpacing: -2.4,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
      marginTop: 18,
    },
    heroPrompt: {
      color: c.foreground,
      fontSize: 32,
      lineHeight: 38,
      fontWeight: "800",
      marginTop: 10,
    },
    heroUnit: {
      color: c.mutedForeground,
      fontSize: 15,
      fontWeight: "600",
      marginTop: -2,
    },
    macroGrid: { flexDirection: "row", marginTop: 22, gap: 7 },
    macroMetric: { flex: 1, minWidth: 0 },
    macroDot: { width: 20, height: 3, borderRadius: 2, marginBottom: 8 },
    macroValue: {
      color: c.foreground,
      fontSize: 17,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    macroLabel: { color: c.mutedForeground, fontSize: 11, marginTop: 2 },
    nextCard: { flexDirection: "row", alignItems: "center", gap: 12 },
    nextIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    nextCopy: { flex: 1 },
    sectionLabel: {
      color: c.primary,
      fontSize: 11,
      lineHeight: 15,
      fontWeight: "800",
      letterSpacing: 0.8,
    },
    nextTitle: {
      color: c.foreground,
      fontSize: 17,
      lineHeight: 22,
      fontWeight: "700",
      marginTop: 2,
    },
    body: {
      color: c.mutedForeground,
      fontSize: 15,
      lineHeight: 21,
      marginTop: 8,
    },
    bodyCompact: {
      color: c.mutedForeground,
      fontSize: 14,
      lineHeight: 19,
      marginTop: 3,
    },
    groupTitle: {
      color: c.foreground,
      fontSize: 18,
      fontWeight: "700",
      marginTop: 8,
      marginBottom: 10,
    },
    quickGrid: { flexDirection: "row", gap: 8 },
    quickAction: {
      flex: 1,
      minHeight: 78,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      position: "relative",
    },
    quickLabel: { color: c.foreground, fontSize: 12, fontWeight: "600" },
    proBadge: {
      position: "absolute",
      top: 5,
      right: 5,
      color: c.primary,
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 0.5,
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      minHeight: 80,
    },
    summaryIcon: {
      width: 44,
      height: 44,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
    },
    summaryCopy: { flex: 1 },
    sectionHeadingRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    sectionTitle: {
      color: c.foreground,
      fontSize: 17,
      lineHeight: 22,
      fontWeight: "700",
    },
    iconButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      marginTop: -10,
      marginRight: -8,
    },
    weightEditor: { borderColor: c.primary },
    weightInputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 14,
    },
    weightInput: {
      flex: 1,
      minHeight: 56,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 14,
      backgroundColor: c.input,
      color: c.foreground,
      fontSize: 26,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
      paddingHorizontal: 16,
    },
    unitLabel: {
      color: c.mutedForeground,
      fontSize: 16,
      fontWeight: "700",
      width: 28,
    },
    error: {
      color: c.destructiveText,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 8,
    },
    primaryButton: {
      minHeight: 50,
      borderRadius: 14,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 14,
      paddingHorizontal: 18,
    },
    primaryButtonText: {
      color: c.primaryForeground,
      fontSize: 16,
      fontWeight: "700",
    },
    pressed: { opacity: 0.72 },
    disabled: { opacity: 0.5 },
  });
}
