import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMeQueryKey,
  getGetMyProfileQueryKey,
  useUpdateMe,
  useUpsertMyProfile,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
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

const GOALS = ["cut", "maintain", "recomp", "gain"] as const;
const SEXES = ["male", "female", "other", "unspecified"] as const;
const ACTIVITY = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
] as const;
const EXPERIENCE = ["beginner", "intermediate", "advanced"] as const;

type Goal = (typeof GOALS)[number];
type Sex = (typeof SEXES)[number];
type Activity = (typeof ACTIVITY)[number];
type Experience = (typeof EXPERIENCE)[number];

const LABELS: Record<string, string> = {
  cut: "Cut",
  maintain: "Maintain",
  recomp: "Recomp",
  gain: "Gain",
  male: "Male",
  female: "Female",
  other: "Other",
  unspecified: "Prefer not to say",
  sedentary: "Sedentary",
  light: "Light",
  moderate: "Moderate",
  active: "Active",
  very_active: "Very active",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

function toNumber(value: string): number | undefined {
  const n = Number(value);
  return value.trim() !== "" && Number.isFinite(n) ? n : undefined;
}

export default function OnboardingScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const s = makeStyles(c);

  const upsertProfile = useUpsertMyProfile();
  const updateMe = useUpdateMe();

  const [displayName, setDisplayName] = React.useState("");
  const [goal, setGoal] = React.useState<Goal>("cut");
  const [sex, setSex] = React.useState<Sex>("unspecified");
  const [birthYear, setBirthYear] = React.useState("");
  const [heightCm, setHeightCm] = React.useState("");
  const [startWeightKg, setStartWeightKg] = React.useState("");
  const [goalWeightKg, setGoalWeightKg] = React.useState("");
  const [activityLevel, setActivityLevel] =
    React.useState<Activity>("moderate");
  const [trainingExperience, setTrainingExperience] =
    React.useState<Experience>("beginner");
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const busy = upsertProfile.isPending || updateMe.isPending;

  const handleSave = async () => {
    setSubmitError(null);
    try {
      await upsertProfile.mutateAsync({
        data: {
          goal,
          sex,
          activityLevel,
          trainingExperience,
          displayName: displayName.trim() || undefined,
          birthYear: toNumber(birthYear),
          heightCm: toNumber(heightCm),
          startWeightKg: toNumber(startWeightKg),
          goalWeightKg: toNumber(goalWeightKg),
        },
      });
      await updateMe.mutateAsync({ data: { onboardingComplete: true } });
      await qc.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
      await qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
      router.replace("/today");
    } catch {
      setSubmitError("Couldn't save your plan. Check your entries and retry.");
    }
  };

  const renderChips = <T extends string>(
    options: readonly T[],
    selected: T,
    onSelect: (value: T) => void,
  ) => (
    <View style={s.chipRow}>
      {options.map((option) => {
        const active = option === selected;
        return (
          <Pressable
            key={option}
            style={[s.chip, active && s.chipActive]}
            onPress={() => onSelect(option)}
          >
            <Text style={[s.chipText, active && s.chipTextActive]}>
              {LABELS[option] ?? option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          s.container,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.title}>Build your plan</Text>
        <Text style={s.subtitle}>
          These drive your daily calorie and training targets.
        </Text>

        <Text style={s.label}>Display name</Text>
        <TextInput
          style={s.input}
          placeholder="How should we greet you?"
          placeholderTextColor={c.mutedForeground}
          value={displayName}
          onChangeText={setDisplayName}
        />

        <Text style={s.label}>Goal</Text>
        {renderChips(GOALS, goal, setGoal)}

        <Text style={s.label}>Sex</Text>
        {renderChips(SEXES, sex, setSex)}

        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.label}>Birth year</Text>
            <TextInput
              style={s.input}
              keyboardType="number-pad"
              placeholder="1995"
              placeholderTextColor={c.mutedForeground}
              value={birthYear}
              onChangeText={setBirthYear}
            />
          </View>
          <View style={s.col}>
            <Text style={s.label}>Height (cm)</Text>
            <TextInput
              style={s.input}
              keyboardType="decimal-pad"
              placeholder="180"
              placeholderTextColor={c.mutedForeground}
              value={heightCm}
              onChangeText={setHeightCm}
            />
          </View>
        </View>

        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.label}>Start weight (kg)</Text>
            <TextInput
              style={s.input}
              keyboardType="decimal-pad"
              placeholder="85"
              placeholderTextColor={c.mutedForeground}
              value={startWeightKg}
              onChangeText={setStartWeightKg}
            />
          </View>
          <View style={s.col}>
            <Text style={s.label}>Goal weight (kg)</Text>
            <TextInput
              style={s.input}
              keyboardType="decimal-pad"
              placeholder="78"
              placeholderTextColor={c.mutedForeground}
              value={goalWeightKg}
              onChangeText={setGoalWeightKg}
            />
          </View>
        </View>

        <Text style={s.label}>Activity level</Text>
        {renderChips(ACTIVITY, activityLevel, setActivityLevel)}

        <Text style={s.label}>Training experience</Text>
        {renderChips(EXPERIENCE, trainingExperience, setTrainingExperience)}

        {submitError && <Text style={s.error}>{submitError}</Text>}

        <Pressable
          style={({ pressed }) => [
            s.button,
            busy && s.buttonDisabled,
            pressed && !busy && s.buttonPressed,
          ]}
          onPress={handleSave}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={c.primaryForeground} />
          ) : (
            <Text style={s.buttonText}>Save plan</Text>
          )}
        </Pressable>

        <Pressable
          style={s.secondaryButton}
          onPress={() => router.back()}
          disabled={busy}
        >
          <Text style={s.secondaryButtonText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    container: { paddingHorizontal: 24 },
    title: { color: c.foreground, fontFamily: "Inter_700Bold", fontSize: 28 },
    subtitle: {
      color: c.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      marginTop: 6,
      marginBottom: 8,
    },
    label: {
      color: c.foreground,
      fontFamily: "Inter_500Medium",
      fontSize: 14,
      marginBottom: 8,
      marginTop: 20,
    },
    input: {
      backgroundColor: c.input,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: c.radius,
      color: c.foreground,
      fontFamily: "Inter_400Regular",
      fontSize: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    twoCol: { flexDirection: "row", gap: 12 },
    col: { flex: 1 },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      backgroundColor: c.secondary,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: {
      color: c.secondaryForeground,
      fontFamily: "Inter_500Medium",
      fontSize: 14,
    },
    chipTextActive: { color: c.primaryForeground },
    error: {
      color: c.destructive,
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      marginTop: 16,
    },
    button: {
      backgroundColor: c.primary,
      borderRadius: c.radius,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
      marginTop: 28,
      minHeight: 54,
    },
    buttonDisabled: { opacity: 0.5 },
    buttonPressed: { opacity: 0.85 },
    buttonText: {
      color: c.primaryForeground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 16,
    },
    secondaryButton: { alignItems: "center", paddingVertical: 14, marginTop: 8 },
    secondaryButtonText: {
      color: c.mutedForeground,
      fontFamily: "Inter_500Medium",
      fontSize: 15,
    },
  });
}
