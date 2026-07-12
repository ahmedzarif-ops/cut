import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMeQueryKey,
  getGetMyProfileQueryKey,
  useGetMe,
  useGetMyProfile,
  useUpdateMe,
  useUpsertMyProfile,
  type Profile,
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
import {
  ACTIVITY,
  EXPERIENCE,
  GOALS,
  SEXES,
  formStateToProfileInput,
  profileToFormState,
  type ProfileFormState,
} from "@/lib/profile-form";

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

/**
 * Loads the current account + profile before showing the form so editing an
 * existing plan starts from the saved values. PUT /api/me/profile is a full
 * replace — rendering this form blank for a user who already has a profile
 * and letting them save would silently null every omitted field.
 */
export default function OnboardingScreen() {
  const c = useColors();

  const meQuery = useGetMe();
  // Fetch the existing profile only when one can exist. 404 is a valid "no
  // profile yet" state (first onboarding), so never retry it.
  const profileQuery = useGetMyProfile({
    query: {
      queryKey: getGetMyProfileQueryKey(),
      enabled: meQuery.data?.onboardingComplete === true,
      retry: (failureCount, error) =>
        (error as { status?: number })?.status !== 404 && failureCount < 2,
    },
  });

  const profileSettled =
    meQuery.data?.onboardingComplete !== true ||
    profileQuery.isSuccess ||
    (profileQuery.isError &&
      (profileQuery.error as { status?: number })?.status === 404);

  if (meQuery.isLoading || (!profileSettled && !profileQuery.isError)) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.background,
        }}
      >
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  // A hard failure loading existing data must not fall through to a blank
  // form — saving it would wipe the profile. Offer a retry instead.
  if (meQuery.isError || (!profileSettled && profileQuery.isError)) {
    return (
      <LoadErrorView
        onRetry={() => {
          if (meQuery.isError) meQuery.refetch();
          if (profileQuery.isError) profileQuery.refetch();
        }}
      />
    );
  }

  const profile = profileQuery.data ?? null;
  return (
    <OnboardingForm initial={profileToFormState(profile)} existing={profile} />
  );
}

function LoadErrorView({ onRetry }: { onRetry: () => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const s = makeStyles(c);

  return (
    <View
      style={[
        s.flex,
        {
          paddingTop: insets.top + 24,
          paddingHorizontal: 24,
          justifyContent: "center",
        },
      ]}
    >
      <Text style={s.title}>Couldn&apos;t load your plan</Text>
      <Text style={s.subtitle}>
        Check your connection and try again before editing.
      </Text>
      <Pressable
        style={({ pressed }) => [s.button, pressed && s.buttonPressed]}
        onPress={onRetry}
      >
        <Text style={s.buttonText}>Retry</Text>
      </Pressable>
    </View>
  );
}

function OnboardingForm({
  initial,
  existing,
}: {
  initial: ProfileFormState;
  existing: Profile | null;
}) {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const s = makeStyles(c);

  const upsertProfile = useUpsertMyProfile();
  const updateMe = useUpdateMe();

  const [form, setForm] = React.useState<ProfileFormState>(initial);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const set = <K extends keyof ProfileFormState>(
    key: K,
    value: ProfileFormState[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const busy = upsertProfile.isPending || updateMe.isPending;

  const handleSave = async () => {
    setSubmitError(null);
    try {
      await upsertProfile.mutateAsync({
        data: formStateToProfileInput(form, existing),
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
          value={form.displayName}
          onChangeText={(v) => set("displayName", v)}
        />

        <Text style={s.label}>Goal</Text>
        {renderChips(GOALS, form.goal, (v) => set("goal", v))}

        <Text style={s.label}>Sex</Text>
        {renderChips(SEXES, form.sex, (v) => set("sex", v))}

        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.label}>Birth year</Text>
            <TextInput
              style={s.input}
              keyboardType="number-pad"
              placeholder="1995"
              placeholderTextColor={c.mutedForeground}
              value={form.birthYear}
              onChangeText={(v) => set("birthYear", v)}
            />
          </View>
          <View style={s.col}>
            <Text style={s.label}>Height (cm)</Text>
            <TextInput
              style={s.input}
              keyboardType="decimal-pad"
              placeholder="180"
              placeholderTextColor={c.mutedForeground}
              value={form.heightCm}
              onChangeText={(v) => set("heightCm", v)}
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
              value={form.startWeightKg}
              onChangeText={(v) => set("startWeightKg", v)}
            />
          </View>
          <View style={s.col}>
            <Text style={s.label}>Goal weight (kg)</Text>
            <TextInput
              style={s.input}
              keyboardType="decimal-pad"
              placeholder="78"
              placeholderTextColor={c.mutedForeground}
              value={form.goalWeightKg}
              onChangeText={(v) => set("goalWeightKg", v)}
            />
          </View>
        </View>

        <Text style={s.label}>Activity level</Text>
        {renderChips(ACTIVITY, form.activityLevel, (v) =>
          set("activityLevel", v),
        )}

        <Text style={s.label}>Training experience</Text>
        {renderChips(EXPERIENCE, form.trainingExperience, (v) =>
          set("trainingExperience", v),
        )}

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
