import { useAuth } from "@clerk/expo";
import {
  getGetMyProfileQueryKey,
  useGetMe,
  useGetMyProfile,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

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

export default function TodayScreen() {
  const { signOut } = useAuth();
  const router = useRouter();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const s = makeStyles(c);

  const meQuery = useGetMe();
  // Only fetch the profile once we know onboarding is complete. Retry transient
  // failures (e.g. a cold-start token hiccup) but never a 404 — a missing
  // profile is a valid state, not an error to retry.
  const profileQuery = useGetMyProfile({
    query: {
      queryKey: getGetMyProfileQueryKey(),
      enabled: meQuery.data?.onboardingComplete === true,
      retry: (failureCount, error) =>
        (error as { status?: number })?.status !== 404 && failureCount < 2,
    },
  });

  const me = meQuery.data;
  const profile = profileQuery.data;

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
          <Text style={s.cardBody}>
            Check your connection and try again.
          </Text>
          <Pressable
            style={({ pressed }) => [s.button, pressed && s.buttonPressed]}
            onPress={() => meQuery.refetch()}
          >
            <Text style={s.buttonText}>Retry</Text>
          </Pressable>
        </View>
      );
    }

    if (!me.onboardingComplete) {
      return (
        <View style={s.card}>
          <Text style={s.cardTitle}>Set up your plan</Text>
          <Text style={s.cardBody}>
            Tell us your goal and stats so CUT OS can build your daily targets.
          </Text>
          <Pressable
            style={({ pressed }) => [s.button, pressed && s.buttonPressed]}
            onPress={() => router.push("/onboarding")}
          >
            <Text style={s.buttonText}>Start onboarding</Text>
          </Pressable>
        </View>
      );
    }

    if (profileQuery.isLoading) {
      return (
        <View style={s.loading}>
          <ActivityIndicator color={c.primary} />
        </View>
      );
    }

    return (
      <View style={s.card}>
        <Text style={s.cardTitle}>Your plan</Text>
        <View style={s.statRow}>
          <Text style={s.statLabel}>Goal</Text>
          <Text style={s.statValue}>
            {profile ? GOAL_LABELS[profile.goal] ?? profile.goal : "—"}
          </Text>
        </View>
        <View style={s.statRow}>
          <Text style={s.statLabel}>Start weight</Text>
          <Text style={s.statValue}>
            {profile?.startWeightKg != null
              ? `${profile.startWeightKg} kg`
              : "—"}
          </Text>
        </View>
        <View style={s.statRow}>
          <Text style={s.statLabel}>Goal weight</Text>
          <Text style={s.statValue}>
            {profile?.goalWeightKg != null
              ? `${profile.goalWeightKg} kg`
              : "—"}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            s.secondaryButton,
            pressed && s.buttonPressed,
          ]}
          onPress={() => router.push("/onboarding")}
        >
          <Text style={s.secondaryButtonText}>Edit plan</Text>
        </Pressable>
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
    >
      <Text style={s.greeting}>{greeting()}</Text>
      <Text style={s.name}>
        {profile?.displayName || me?.email || "Athlete"}
      </Text>

      {renderContent()}

      <Pressable
        style={({ pressed }) => [s.signOut, pressed && s.buttonPressed]}
        onPress={() => signOut()}
      >
        <Text style={s.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    container: { paddingHorizontal: 24 },
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
      marginBottom: 24,
    },
    loading: { paddingVertical: 48, alignItems: "center" },
    card: {
      backgroundColor: c.card,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: c.radius,
      padding: 20,
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
      marginBottom: 20,
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
    button: {
      backgroundColor: c.primary,
      borderRadius: c.radius,
      alignItems: "center",
      paddingVertical: 15,
      marginTop: 4,
    },
    buttonPressed: { opacity: 0.85 },
    buttonText: {
      color: c.primaryForeground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 16,
    },
    secondaryButton: { alignItems: "center", paddingVertical: 14, marginTop: 8 },
    secondaryButtonText: {
      color: c.primary,
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
    },
    signOut: { alignItems: "center", paddingVertical: 16, marginTop: 24 },
    signOutText: {
      color: c.mutedForeground,
      fontFamily: "Inter_500Medium",
      fontSize: 15,
    },
  });
}
