import { useAuth, useSession } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import {
  getMe as getMeRequest,
  getGetMeQueryKey,
  getGetMyProfileQueryKey,
  updateMe as updateMeRequest,
  upsertMyProfile as upsertMyProfileRequest,
  useGetMe,
  useGetMyProfile,
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
  GOALS,
  ProfileSavePrincipalChangedError,
  convertProfileDraftUnits,
  executeOwnedProfileSave,
  formStateToProfileInput,
  profileToFormState,
  type ProfileFormState,
  type WeightUnits,
} from "@/lib/profile-form";

const LABELS: Record<string, string> = {
  cut: "Cut",
  maintain: "Maintain",
  recomp: "Recomp",
  gain: "Gain",
  metric: "Kilograms (kg)",
  imperial: "Pounds (lb)",
};

/**
 * Loads the current account + profile before showing the form so editing an
 * existing profile starts from the saved values. PUT /api/me/profile is a full
 * replace of the minimal paid-v1 profile; unused legacy fields are deliberately
 * cleared rather than collected or carried forward.
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
  const initialUnits = meQuery.data?.units ?? "metric";
  return (
    <OnboardingForm
      initial={profileToFormState(profile, initialUnits)}
      initialUnits={initialUnits}
    />
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
      <Text style={s.title}>Couldn&apos;t load your profile</Text>
      <Text style={s.subtitle}>
        Check your connection and try again before editing.
      </Text>
      <Pressable
        accessibilityLabel="Retry loading profile"
        accessibilityRole="button"
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
  initialUnits,
}: {
  initial: ProfileFormState;
  initialUnits: WeightUnits;
}) {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const s = makeStyles(c);
  const { userId, sessionId } = useAuth();
  const { session } = useSession();

  const [draft, setDraft] = React.useState(() => ({
    form: initial,
    units: initialUnits,
  }));
  const { form, units } = draft;
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const saveLock = React.useRef(false);
  const mounted = React.useRef(true);
  const currentPrincipal = React.useRef({
    userId: userId ?? null,
    sessionId: sessionId ?? null,
  });
  currentPrincipal.current = {
    userId: userId ?? null,
    sessionId: sessionId ?? null,
  };

  React.useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const busy = saving;

  const set = <K extends keyof ProfileFormState>(
    key: K,
    value: ProfileFormState[K],
  ) => {
    if (!busy) {
      setDraft((current) => ({
        ...current,
        form: { ...current.form, [key]: value },
      }));
    }
  };

  const selectUnits = (nextUnits: WeightUnits) => {
    if (!busy) {
      setDraft((current) => convertProfileDraftUnits(current, nextUnits));
    }
  };

  const handleSave = async () => {
    if (
      !userId ||
      !sessionId ||
      !session ||
      session.id !== sessionId ||
      session.user?.id !== userId ||
      saveLock.current
    ) {
      return;
    }

    const ownerUserId = userId;
    const ownerSessionId = sessionId;
    const ownerSession = session;
    const isCurrentPrincipal = () =>
      mounted.current &&
      currentPrincipal.current.userId === ownerUserId &&
      currentPrincipal.current.sessionId === ownerSessionId;

    saveLock.current = true;
    setSaving(true);
    setSubmitError(null);
    try {
      const saved = await executeOwnedProfileSave({
        ownerUserId,
        ownerSessionId,
        currentPrincipal: () => currentPrincipal.current,
        getToken: () =>
          tokenWithinTimeout(() => ownerSession.getToken({ skipCache: true })),
        updateAccount: (token) =>
          updateMeRequest(
            { units },
            { headers: { Authorization: `Bearer ${token}` } },
          ),
        upsertProfile: (token) =>
          upsertMyProfileRequest(formStateToProfileInput(form, units), {
            headers: { Authorization: `Bearer ${token}` },
          }),
        readAccount: (token) =>
          getMeRequest({ headers: { Authorization: `Bearer ${token}` } }),
      });
      if (!isCurrentPrincipal()) return;

      // A /me request started before the profile transaction can resolve after
      // this save and overwrite the completed account with its older
      // onboardingComplete=false response. That sends the route boundary back
      // to onboarding while /today is mounting and can leave iOS showing only
      // the native navigation background. Cancel both affected query families
      // before installing the server-confirmed post-save state.
      await Promise.all([
        qc.cancelQueries({ queryKey: getGetMeQueryKey() }),
        qc.cancelQueries({ queryKey: getGetMyProfileQueryKey() }),
      ]);
      if (!isCurrentPrincipal()) return;

      qc.setQueryData(getGetMyProfileQueryKey(), saved.profile);
      qc.setQueryData(getGetMeQueryKey(), saved.account);
      qc.setQueryData([...getGetMeQueryKey(), ownerUserId], saved.account);
      router.replace("/today");
    } catch (error) {
      if (
        error instanceof ProfileSavePrincipalChangedError ||
        !isCurrentPrincipal()
      ) {
        return;
      }
      setSubmitError(
        "Couldn't save your profile. Check your entries and retry.",
      );
    } finally {
      saveLock.current = false;
      if (isCurrentPrincipal()) setSaving(false);
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
        const label = LABELS[option] ?? option;
        return (
          <Pressable
            key={option}
            accessibilityLabel={label}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled: busy }}
            disabled={busy}
            style={({ pressed }) => [
              s.chip,
              active && s.chipActive,
              busy && s.buttonDisabled,
              pressed && !busy && s.buttonPressed,
            ]}
            onPress={() => onSelect(option)}
          >
            <Text style={[s.chipText, active && s.chipTextActive]}>
              {active ? "✓ " : ""}
              {label}
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
        <Text accessibilityRole="header" style={s.title}>
          Set up your profile
        </Text>
        <Text style={s.subtitle}>Save the basics for your CUT OS profile.</Text>

        <Text style={s.label}>Display name</Text>
        <TextInput
          accessibilityLabel="Display name"
          style={s.input}
          placeholder="How should we greet you?"
          placeholderTextColor={c.mutedForeground}
          value={form.displayName}
          onChangeText={(v) => set("displayName", v)}
          editable={!busy}
        />

        <Text style={s.label}>Goal</Text>
        {renderChips(GOALS, form.goal, (v) => set("goal", v))}

        <Text style={s.label}>Weight units</Text>
        {renderChips(["metric", "imperial"] as const, units, selectUnits)}

        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.label}>
              Start weight ({units === "imperial" ? "lb" : "kg"})
            </Text>
            <TextInput
              accessibilityLabel={`Start weight in ${
                units === "imperial" ? "pounds" : "kilograms"
              }`}
              style={s.input}
              keyboardType="decimal-pad"
              placeholder={units === "imperial" ? "187" : "85"}
              placeholderTextColor={c.mutedForeground}
              value={form.startWeightKg}
              onChangeText={(v) => set("startWeightKg", v)}
              editable={!busy}
            />
          </View>
          <View style={s.col}>
            <Text style={s.label}>
              Goal weight ({units === "imperial" ? "lb" : "kg"})
            </Text>
            <TextInput
              accessibilityLabel={`Goal weight in ${
                units === "imperial" ? "pounds" : "kilograms"
              }`}
              style={s.input}
              keyboardType="decimal-pad"
              placeholder={units === "imperial" ? "172" : "78"}
              placeholderTextColor={c.mutedForeground}
              value={form.goalWeightKg}
              onChangeText={(v) => set("goalWeightKg", v)}
              editable={!busy}
            />
          </View>
        </View>

        {submitError && (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            style={s.error}
          >
            {submitError}
          </Text>
        )}

        <Pressable
          accessibilityLabel="Save profile"
          accessibilityRole="button"
          accessibilityState={{ disabled: busy, busy: saving }}
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
            <Text style={s.buttonText}>Save profile</Text>
          )}
        </Pressable>

        <Pressable
          accessibilityLabel="Cancel profile changes"
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          style={({ pressed }) => [
            s.secondaryButton,
            busy && s.buttonDisabled,
            pressed && !busy && s.buttonPressed,
          ]}
          onPress={() => router.back()}
          disabled={busy}
        >
          <Text style={s.secondaryButtonText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
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
      borderColor: c.inputBorder,
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
      minHeight: 44,
      backgroundColor: c.secondary,
      borderColor: c.inputBorder,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: {
      color: c.secondaryForeground,
      fontFamily: "Inter_500Medium",
      fontSize: 14,
    },
    chipTextActive: { color: c.primaryForeground },
    error: {
      color: c.destructiveText,
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
    secondaryButton: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: 44,
      paddingVertical: 14,
      marginTop: 8,
    },
    secondaryButtonText: {
      color: c.mutedForeground,
      fontFamily: "Inter_500Medium",
      fontSize: 15,
    },
  });
}
