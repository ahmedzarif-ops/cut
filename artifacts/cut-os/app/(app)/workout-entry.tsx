import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetTodayQueryKey,
  getListMyWorkoutsQueryKey,
  useCreateMyWorkout,
  useGetMe,
  useGetToday,
  type CreateWorkoutInput,
  type CreateWorkoutInputKind,
} from "@workspace/api-client-react";
import { poundsToKilograms } from "@workspace/domain";
import * as Crypto from "expo-crypto";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  dailyDeviceTimeZoneQueryKey,
  useDeviceTimeZoneGate,
} from "@/lib/device-time-zone-gate";

type StrengthDraft = {
  id: string;
  name: string;
  sets: string;
  reps: string;
  load: string;
};

function newStrengthDraft(): StrengthDraft {
  return {
    id: Crypto.randomUUID(),
    name: "",
    sets: "3",
    reps: "8",
    load: "",
  };
}

function parseKind(value: string | undefined): CreateWorkoutInputKind {
  if (value === "cardio" || value === "recovery") return value;
  return "strength";
}

export default function WorkoutEntryScreen() {
  const c = useColors();
  const s = makeStyles(c);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind = parseKind(params.kind);
  const dailyTimeZone = useDeviceTimeZoneGate();
  const todayQuery = useGetToday({
    query: {
      queryKey: dailyDeviceTimeZoneQueryKey(
        getGetTodayQueryKey(),
        dailyTimeZone,
      ),
    },
    request: dailyTimeZone.request,
  });
  const meQuery = useGetMe();
  const createWorkout = useCreateMyWorkout({ request: dailyTimeZone.request });
  const unitLabel = meQuery.data?.units === "imperial" ? "lb" : "kg";
  const [requestId, setRequestId] = React.useState(() => Crypto.randomUUID());
  const [name, setName] = React.useState(
    kind === "strength"
      ? "Strength workout"
      : kind === "cardio"
        ? "Cardio"
        : "Recovery day",
  );
  const [notes, setNotes] = React.useState("");
  const [strength, setStrength] = React.useState<StrengthDraft[]>(() => [
    newStrengthDraft(),
  ]);
  const [activity, setActivity] = React.useState("");
  const [duration, setDuration] = React.useState("");
  const [distance, setDistance] = React.useState("");
  const [calories, setCalories] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const updateStrength = (
    id: string,
    field: Exclude<keyof StrengthDraft, "id">,
    value: string,
  ) => {
    setStrength((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
    setError(null);
  };

  const parseOptionalNumber = (value: string): number | null => {
    if (!value.trim()) return null;
    return Number(value.trim().replace(",", "."));
  };

  const save = async () => {
    if (!todayQuery.data?.dayKey || createWorkout.isPending) return;
    if (!name.trim()) {
      setError("Add a workout name.");
      return;
    }

    let exercises: CreateWorkoutInput["exercises"];
    if (kind === "strength") {
      exercises = strength.map((item) => {
        const sets = Number(item.sets);
        const reps = Number(item.reps);
        const enteredLoad = parseOptionalNumber(item.load);
        return {
          name: item.name.trim(),
          sets,
          reps,
          loadKg:
            enteredLoad === null
              ? null
              : meQuery.data?.units === "imperial"
                ? poundsToKilograms(enteredLoad)
                : enteredLoad,
          durationMinutes: null,
          distanceKm: null,
          caloriesKcal: null,
        };
      });
      if (
        exercises.some(
          (item) =>
            !item.name ||
            item.sets === null ||
            !Number.isInteger(item.sets) ||
            item.sets < 1 ||
            item.sets > 20 ||
            item.reps === null ||
            !Number.isInteger(item.reps) ||
            item.reps < 1 ||
            item.reps > 100 ||
            (item.loadKg !== null &&
              (!Number.isFinite(item.loadKg) ||
                item.loadKg < 0 ||
                item.loadKg > 1000)),
        )
      ) {
        setError(
          "Add each exercise with 1–20 sets, 1–100 reps, and an optional valid load.",
        );
        return;
      }
    } else if (kind === "cardio") {
      const minutes = Number(duration);
      const distanceKm = parseOptionalNumber(distance);
      const caloriesKcal = parseOptionalNumber(calories);
      if (
        !activity.trim() ||
        !Number.isInteger(minutes) ||
        minutes < 1 ||
        minutes > 1440 ||
        (distanceKm !== null &&
          (!Number.isFinite(distanceKm) ||
            distanceKm <= 0 ||
            distanceKm > 1000)) ||
        (caloriesKcal !== null &&
          (!Number.isInteger(caloriesKcal) ||
            caloriesKcal < 0 ||
            caloriesKcal > 10000))
      ) {
        setError(
          "Add an activity and duration. Distance and calories are optional.",
        );
        return;
      }
      exercises = [
        {
          name: activity.trim(),
          sets: null,
          reps: null,
          loadKg: null,
          durationMinutes: minutes,
          distanceKm,
          caloriesKcal,
        },
      ];
    } else {
      exercises = [];
    }

    try {
      await createWorkout.mutateAsync({
        data: {
          clientRequestId: requestId,
          dayKey: todayQuery.data.dayKey,
          kind,
          name: name.trim(),
          notes: notes.trim() || null,
          exercises,
        },
      });
      setRequestId(Crypto.randomUUID());
      await qc.invalidateQueries({ queryKey: getListMyWorkoutsQueryKey() });
      router.back();
    } catch {
      setError(
        "Couldn't save this workout. Check your connection and try again.",
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 30,
          paddingHorizontal: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.nav}>
          <Pressable
            accessibilityRole="button"
            style={s.navButton}
            onPress={() => router.back()}
          >
            <Text style={s.navText}>Cancel</Text>
          </Pressable>
          <Text accessibilityRole="header" style={s.navTitle}>
            Log workout
          </Text>
          <View style={s.navButton} />
        </View>

        <Text style={s.title}>
          {kind === "strength"
            ? "Build your session"
            : kind === "cardio"
              ? "Log cardio"
              : "Log recovery"}
        </Text>
        <Text style={s.subtitle}>
          {kind === "strength"
            ? "Add the lifts you want to compare next time."
            : kind === "cardio"
              ? "Keep the useful numbers without making the log a chore."
              : "Recovery counts. Add an optional note about the day."}
        </Text>

        <Field
          label="Workout name"
          value={name}
          onChangeText={(value) => {
            setName(value);
            setError(null);
          }}
          placeholder="Push day"
        />

        {kind === "strength" ? (
          <>
            {strength.map((item, index) => (
              <View key={item.id} style={s.exerciseCard}>
                <View style={s.exerciseHeader}>
                  <Text style={s.exerciseTitle}>Exercise {index + 1}</Text>
                  {strength.length > 1 ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove exercise ${index + 1}`}
                      hitSlop={10}
                      onPress={() =>
                        setStrength((current) =>
                          current.filter(({ id }) => id !== item.id),
                        )
                      }
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color={c.destructive}
                      />
                    </Pressable>
                  ) : null}
                </View>
                <Field
                  label="Exercise"
                  value={item.name}
                  onChangeText={(value) =>
                    updateStrength(item.id, "name", value)
                  }
                  placeholder="Bench press"
                />
                <View style={s.grid}>
                  <View style={s.cell}>
                    <Field
                      label="Sets"
                      value={item.sets}
                      onChangeText={(value) =>
                        updateStrength(item.id, "sets", value)
                      }
                      placeholder="3"
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={s.cell}>
                    <Field
                      label="Reps"
                      value={item.reps}
                      onChangeText={(value) =>
                        updateStrength(item.id, "reps", value)
                      }
                      placeholder="8"
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={s.cell}>
                    <Field
                      label={`Load (${unitLabel})`}
                      value={item.load}
                      onChangeText={(value) =>
                        updateStrength(item.id, "load", value)
                      }
                      placeholder="Optional"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              </View>
            ))}
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [s.addButton, pressed && s.pressed]}
              onPress={() =>
                setStrength((current) => [...current, newStrengthDraft()])
              }
            >
              <Ionicons name="add" size={19} color={c.primary} />
              <Text style={s.addButtonText}>Add another exercise</Text>
            </Pressable>
          </>
        ) : kind === "cardio" ? (
          <View style={s.exerciseCard}>
            <Field
              label="Activity"
              value={activity}
              onChangeText={(value) => {
                setActivity(value);
                setError(null);
              }}
              placeholder="Run, walk, bike…"
            />
            <View style={s.grid}>
              <View style={s.cell}>
                <Field
                  label="Minutes"
                  value={duration}
                  onChangeText={setDuration}
                  placeholder="30"
                  keyboardType="number-pad"
                />
              </View>
              <View style={s.cell}>
                <Field
                  label="Distance (km)"
                  value={distance}
                  onChangeText={setDistance}
                  placeholder="Optional"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={s.cell}>
                <Field
                  label="Calories"
                  value={calories}
                  onChangeText={setCalories}
                  placeholder="Optional"
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>
        ) : null}

        <Field
          label="Notes (optional)"
          value={notes}
          onChangeText={(value) => {
            setNotes(value.slice(0, 500));
            setError(null);
          }}
          placeholder="How did it feel?"
          multiline
        />

        {todayQuery.isError ? (
          <Text accessibilityRole="alert" style={s.notice}>
            CUT OS couldn&apos;t load today. Check your connection and try
            again.
          </Text>
        ) : error ? (
          <Text accessibilityRole="alert" style={s.notice}>
            {error}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            disabled: !todayQuery.data?.dayKey || createWorkout.isPending,
          }}
          disabled={!todayQuery.data?.dayKey || createWorkout.isPending}
          style={({ pressed }) => [
            s.primaryButton,
            (!todayQuery.data?.dayKey || createWorkout.isPending) && s.disabled,
            pressed && s.pressed,
          ]}
          onPress={() => void save()}
        >
          <Ionicons name="checkmark" size={19} color={c.primaryForeground} />
          <Text style={s.primaryButtonText}>
            {createWorkout.isPending ? "Saving…" : "Finish workout"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  function Field({
    label,
    value,
    placeholder,
    keyboardType,
    multiline = false,
    onChangeText,
  }: {
    label: string;
    value: string;
    placeholder: string;
    keyboardType?: "default" | "number-pad" | "decimal-pad";
    multiline?: boolean;
    onChangeText: (value: string) => void;
  }) {
    return (
      <View style={s.field}>
        <Text style={s.label}>{label}</Text>
        <TextInput
          accessibilityLabel={label}
          keyboardType={keyboardType}
          multiline={multiline}
          placeholder={placeholder}
          placeholderTextColor={c.mutedForeground}
          style={[s.input, multiline && s.notesInput]}
          value={value}
          onChangeText={onChangeText}
        />
      </View>
    );
  }
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    nav: {
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    navButton: { minWidth: 64, minHeight: 44, justifyContent: "center" },
    navText: { color: c.primary, fontSize: 16 },
    navTitle: { color: c.foreground, fontSize: 17, fontWeight: "700" },
    title: {
      color: c.foreground,
      fontSize: 30,
      lineHeight: 36,
      fontWeight: "800",
      letterSpacing: -0.7,
      marginTop: 18,
    },
    subtitle: {
      color: c.mutedForeground,
      fontSize: 15,
      lineHeight: 21,
      marginTop: 7,
      marginBottom: 22,
    },
    exerciseCard: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      backgroundColor: c.card,
      padding: 14,
      marginBottom: 12,
    },
    exerciseHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    exerciseTitle: { color: c.foreground, fontSize: 15, fontWeight: "700" },
    grid: { flexDirection: "row", gap: 8 },
    cell: { flex: 1 },
    field: { marginBottom: 14 },
    label: {
      color: c.foreground,
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 6,
    },
    input: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 14,
      backgroundColor: c.input,
      color: c.foreground,
      fontSize: 16,
      paddingHorizontal: 14,
    },
    notesInput: {
      minHeight: 94,
      paddingTop: 14,
      textAlignVertical: "top",
    },
    addButton: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginBottom: 18,
    },
    addButtonText: { color: c.primary, fontSize: 15, fontWeight: "700" },
    notice: { color: c.destructive, fontSize: 13, lineHeight: 19 },
    primaryButton: {
      minHeight: 54,
      borderRadius: 14,
      backgroundColor: c.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      marginTop: 12,
    },
    primaryButtonText: {
      color: c.primaryForeground,
      fontSize: 16,
      fontWeight: "700",
    },
    disabled: { opacity: 0.48 },
    pressed: { opacity: 0.72 },
  });
}
