import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useSubscriptionGate } from "@/lib/subscription-gate";

export default function PhotoEstimateScreen() {
  const c = useColors();
  const s = makeStyles(c);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const subscription = useSubscriptionGate();

  return (
    <View
      style={[
        s.screen,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20 },
      ]}
    >
      <View style={s.nav}>
        <Pressable
          accessibilityRole="button"
          style={s.navButton}
          onPress={() => router.back()}
        >
          <Text style={s.navText}>Close</Text>
        </Pressable>
        <Text accessibilityRole="header" style={s.navTitle}>
          Photo estimate
        </Text>
        <View style={s.navButton} />
      </View>

      <View style={s.content}>
        <View style={s.heroIcon}>
          <Ionicons name="camera" size={35} color={c.primary} />
        </View>
        <Text style={s.eyebrow}>CUT OS PRO</Text>
        <Text style={s.title}>Photo estimates are being prepared for Pro</Text>
        <Text style={s.body}>
          CUT OS will estimate the foods, portions, calories, and macros. You
          review every value before anything is saved.
        </Text>

        <View style={s.points}>
          <Point
            icon="scan-outline"
            text="Identify likely foods and portions"
          />
          <Point
            icon="options-outline"
            text="Correct every estimate before saving"
          />
          <Point
            icon="shield-checkmark-outline"
            text="Clearly labeled as an estimate"
          />
        </View>

        <View style={s.betaNotice}>
          <Text style={s.betaTitle}>Not available in this build yet</Text>
          <Text style={s.betaBody}>
            {subscription.isEntitled ? "Your Pro access is active. " : ""}No
            photo or health data has been sent while the private analysis
            service is not configured.
          </Text>
        </View>
        {!subscription.isEntitled ? (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [s.primaryButton, pressed && s.pressed]}
            onPress={() => router.replace("/subscription")}
          >
            <Text style={s.primaryButtonText}>See current Pro features</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          style={s.secondaryButton}
          onPress={() => router.replace("/food-entry")}
        >
          <Text style={s.secondaryText}>Add food manually instead</Text>
        </Pressable>
      </View>
    </View>
  );

  function Point({
    icon,
    text,
  }: {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    text: string;
  }) {
    return (
      <View style={s.point}>
        <Ionicons name={icon} size={20} color={c.primary} />
        <Text style={s.pointText}>{text}</Text>
      </View>
    );
  }
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background, paddingHorizontal: 16 },
    nav: {
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    navButton: { minWidth: 64, minHeight: 44, justifyContent: "center" },
    navText: { color: c.primary, fontSize: 16 },
    navTitle: { color: c.foreground, fontSize: 17, fontWeight: "700" },
    content: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 8,
      paddingBottom: 32,
    },
    heroIcon: {
      width: 72,
      height: 72,
      borderRadius: 22,
      backgroundColor: c.secondary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    eyebrow: {
      color: c.primary,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1,
    },
    title: {
      color: c.foreground,
      fontSize: 32,
      lineHeight: 38,
      fontWeight: "800",
      letterSpacing: -0.8,
      marginTop: 6,
    },
    body: {
      color: c.mutedForeground,
      fontSize: 16,
      lineHeight: 23,
      marginTop: 12,
    },
    points: { gap: 15, marginTop: 26 },
    point: { flexDirection: "row", alignItems: "center", gap: 12 },
    pointText: {
      flex: 1,
      color: c.foreground,
      fontSize: 15,
      lineHeight: 21,
      fontWeight: "600",
    },
    betaNotice: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      backgroundColor: c.card,
      padding: 16,
      marginTop: 26,
    },
    betaTitle: { color: c.foreground, fontSize: 15, fontWeight: "700" },
    betaBody: {
      color: c.mutedForeground,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 5,
    },
    primaryButton: {
      minHeight: 54,
      borderRadius: 14,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 28,
    },
    primaryButtonText: {
      color: c.primaryForeground,
      fontSize: 16,
      fontWeight: "700",
    },
    secondaryButton: {
      minHeight: 50,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 6,
    },
    secondaryText: { color: c.primary, fontSize: 15, fontWeight: "700" },
    pressed: { opacity: 0.72 },
  });
}
