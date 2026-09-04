import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListMyWorkoutsQueryKey,
  useDeleteMyWorkout,
  useGetMe,
  useListMyWorkouts,
  type Workout,
} from "@workspace/api-client-react";
import { kilogramsToPounds, roundWeight } from "@workspace/domain";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { CutScreen } from "@/components/CutScreen";
import { useColors } from "@/hooks/useColors";

export default function TrainingScreen() {
  const c = useColors();
  const s = makeStyles(c);
  const router = useRouter();
  const qc = useQueryClient();
  const workoutsQuery = useListMyWorkouts({ limit: 20 });
  const deleteWorkout = useDeleteMyWorkout();
  const meQuery = useGetMe();
  const unitLabel = meQuery.data?.units === "imperial" ? "lb" : "kg";

  const detail = (workout: Workout): string => {
    if (workout.kind === "recovery") return workout.notes || "Recovery day";
    if (workout.kind === "cardio") {
      const activity = workout.exercises[0];
      if (!activity) return "Cardio";
      const distance =
        activity.distanceKm === null
          ? ""
          : ` · ${roundWeight(activity.distanceKm, 2)} km`;
      return `${activity.name} · ${activity.durationMinutes ?? 0} min${distance}`;
    }
    const setCount = workout.exercises.reduce(
      (total, exercise) => total + (exercise.sets ?? 0),
      0,
    );
    const heaviest = workout.exercises.reduce(
      (max, exercise) => Math.max(max, exercise.loadKg ?? 0),
      0,
    );
    const load =
      heaviest <= 0
        ? ""
        : ` · top ${roundWeight(
            meQuery.data?.units === "imperial"
              ? kilogramsToPounds(heaviest)
              : heaviest,
          )} ${unitLabel}`;
    return `${workout.exercises.length} exercise${workout.exercises.length === 1 ? "" : "s"} · ${setCount} sets${load}`;
  };

  const confirmDelete = (workout: Workout) => {
    Alert.alert(
      "Delete workout?",
      `${workout.name} will be removed from your history.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void deleteWorkout
              .mutateAsync({ workoutId: workout.id })
              .then(() =>
                qc.invalidateQueries({ queryKey: getListMyWorkoutsQueryKey() }),
              )
              .catch(() =>
                Alert.alert(
                  "Couldn't delete workout",
                  "Check your connection and try again.",
                ),
              );
          },
        },
      ],
    );
  };

  return (
    <CutScreen title="Training" eyebrow="Keep your strength">
      <View style={[s.card, s.hero]}>
        <View style={s.heroIcon}>
          <Ionicons name="barbell" size={28} color={c.primary} />
        </View>
        <Text style={s.heroTitle}>What are you training?</Text>
        <Text style={s.body}>
          Log the lifts that matter during your cut. CUT OS will keep the
          history easy to compare.
        </Text>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [s.primaryButton, pressed && s.pressed]}
          onPress={() =>
            router.push({
              pathname: "/workout-entry",
              params: { kind: "strength" },
            })
          }
        >
          <Ionicons name="play" size={18} color={c.primaryForeground} />
          <Text style={s.primaryButtonText}>Start workout</Text>
        </Pressable>
      </View>

      <Text style={s.sectionTitle}>Quick start</Text>
      <View style={s.quickList}>
        <QuickRow
          kind="strength"
          title="Strength workout"
          detail="Exercises, sets, reps, and load"
          icon="barbell-outline"
        />
        <QuickRow
          kind="cardio"
          title="Cardio"
          detail="Time, distance, or calories"
          icon="walk-outline"
        />
        <QuickRow
          kind="recovery"
          title="Recovery day"
          detail="Keep the day honest without forcing a workout"
          icon="moon-outline"
        />
      </View>

      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Recent</Text>
      </View>
      {workoutsQuery.isLoading ? (
        <View style={s.emptyState}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : workoutsQuery.isError ? (
        <View style={s.emptyState}>
          <Ionicons
            name="cloud-offline-outline"
            size={26}
            color={c.mutedForeground}
          />
          <Text style={s.emptyTitle}>Couldn&apos;t load workouts</Text>
          <Pressable
            accessibilityRole="button"
            style={s.retry}
            onPress={() => void workoutsQuery.refetch()}
          >
            <Text style={s.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : workoutsQuery.data?.length ? (
        <View style={s.historyList}>
          {workoutsQuery.data.map((workout, index) => (
            <View
              key={workout.id}
              style={[s.historyRow, index > 0 && s.rowDivider]}
            >
              <View style={s.historyIcon}>
                <Ionicons
                  name={
                    workout.kind === "strength"
                      ? "barbell-outline"
                      : workout.kind === "cardio"
                        ? "walk-outline"
                        : "moon-outline"
                  }
                  size={19}
                  color={c.primary}
                />
              </View>
              <View style={s.quickCopy}>
                <Text style={s.rowTitle}>{workout.name}</Text>
                <Text numberOfLines={2} style={s.rowDetail}>
                  {detail(workout)}
                </Text>
                <Text style={s.historyDate}>
                  {new Date(`${workout.loggedOn}T12:00:00`).toLocaleDateString(
                    undefined,
                    { month: "short", day: "numeric", year: "numeric" },
                  )}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete ${workout.name}`}
                hitSlop={10}
                disabled={deleteWorkout.isPending}
                onPress={() => confirmDelete(workout)}
              >
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color={c.mutedForeground}
                />
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <View style={s.emptyState}>
          <Ionicons name="time-outline" size={26} color={c.mutedForeground} />
          <Text style={s.emptyTitle}>No workouts logged yet</Text>
          <Text style={s.emptyBody}>
            Your recent sessions and previous performance will appear here.
          </Text>
        </View>
      )}
    </CutScreen>
  );

  function QuickRow({
    kind,
    title,
    detail,
    icon,
  }: {
    kind: "strength" | "cardio" | "recovery";
    title: string;
    detail: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [s.quickRow, pressed && s.pressed]}
        onPress={() =>
          router.push({ pathname: "/workout-entry", params: { kind } })
        }
      >
        <View style={s.quickIcon}>
          <Ionicons name={icon} size={21} color={c.primary} />
        </View>
        <View style={s.quickCopy}>
          <Text style={s.rowTitle}>{title}</Text>
          <Text style={s.rowDetail}>{detail}</Text>
        </View>
        <Ionicons name="chevron-forward" size={19} color={c.mutedForeground} />
      </Pressable>
    );
  }
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 16,
      padding: 20,
    },
    hero: { alignItems: "flex-start" },
    heroIcon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: c.secondary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 18,
    },
    heroTitle: {
      color: c.foreground,
      fontSize: 25,
      lineHeight: 31,
      letterSpacing: -0.5,
      fontWeight: "800",
    },
    body: {
      color: c.mutedForeground,
      fontSize: 15,
      lineHeight: 21,
      marginTop: 8,
    },
    primaryButton: {
      minHeight: 52,
      width: "100%",
      borderRadius: 14,
      backgroundColor: c.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 20,
    },
    primaryButtonText: {
      color: c.primaryForeground,
      fontSize: 16,
      fontWeight: "700",
    },
    sectionHeader: { marginTop: 26, marginBottom: 10 },
    sectionTitle: {
      color: c.foreground,
      fontSize: 19,
      fontWeight: "700",
      marginTop: 24,
      marginBottom: 10,
    },
    quickList: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      overflow: "hidden",
    },
    quickRow: {
      minHeight: 76,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    quickIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: c.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    quickCopy: { flex: 1 },
    rowTitle: { color: c.foreground, fontSize: 15, fontWeight: "700" },
    rowDetail: {
      color: c.mutedForeground,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 2,
    },
    emptyState: {
      minHeight: 180,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    emptyTitle: {
      color: c.foreground,
      fontSize: 17,
      fontWeight: "700",
      marginTop: 10,
    },
    emptyBody: {
      color: c.mutedForeground,
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center",
      marginTop: 5,
    },
    retry: {
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: 16,
      marginTop: 4,
    },
    retryText: { color: c.primary, fontSize: 14, fontWeight: "700" },
    historyList: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      overflow: "hidden",
    },
    historyRow: {
      minHeight: 86,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    rowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    historyIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: c.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    historyDate: {
      color: c.mutedForeground,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 3,
    },
    pressed: { opacity: 0.72 },
  });
}
