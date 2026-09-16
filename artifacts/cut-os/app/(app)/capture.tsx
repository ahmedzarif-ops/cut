import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useSubscriptionGate } from "@/lib/subscription-gate";

export default function CaptureScreen() {
  const c = useColors();
  const s = makeStyles(c);
  const insets = useSafeAreaInsets();
  const router = useRouter();
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
          accessibilityLabel="Close capture"
          accessibilityRole="button"
          style={s.close}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={24} color={c.foreground} />
        </Pressable>
        <Text accessibilityRole="header" style={s.navTitle}>
          Capture food
        </Text>
        <View style={s.close} />
      </View>

      <View style={s.content}>
        <Text style={s.title}>How do you want to log?</Text>
        <Text style={s.subtitle}>
          Both paths let you review the food and nutrition before it reaches
          today&apos;s diary.
        </Text>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [s.card, pressed && s.pressed]}
          onPress={() => router.replace("/barcode")}
        >
          <View style={s.cardIcon}>
            <Ionicons name="barcode-outline" size={30} color={c.primary} />
          </View>
          <View style={s.cardCopy}>
            <View style={s.titleRow}>
              <Text style={s.cardTitle}>Scan barcode</Text>
              <Text style={s.freeBadge}>FREE</Text>
            </View>
            <Text style={s.cardBody}>
              Find packaged-food details, then correct the serving and macros.
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={21}
            color={c.mutedForeground}
          />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [s.card, s.proCard, pressed && s.pressed]}
          onPress={() => router.replace("/photo-estimate")}
        >
          <View style={s.cardIcon}>
            <Ionicons name="camera-outline" size={30} color={c.primary} />
          </View>
          <View style={s.cardCopy}>
            <View style={s.titleRow}>
              <Text style={s.cardTitle}>Take a food photo</Text>
              <Text style={s.proBadge}>PRO</Text>
            </View>
            <Text style={s.cardBody}>
              Use AI to estimate foods, portions, calories, macros, and a useful
              meal insight.
            </Text>
            <Text style={s.entitlementLine}>
              {subscription.isEntitled
                ? "Pro access active"
                : "$4.99 monthly · no trial"}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={21}
            color={c.mutedForeground}
          />
        </Pressable>
      </View>
    </View>
  );
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
    close: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    navTitle: { color: c.foreground, fontSize: 17, fontWeight: "700" },
    content: { flex: 1, justifyContent: "center", paddingBottom: 34 },
    title: {
      color: c.foreground,
      fontSize: 30,
      lineHeight: 36,
      fontWeight: "800",
      letterSpacing: -0.8,
    },
    subtitle: {
      color: c.mutedForeground,
      fontSize: 15,
      lineHeight: 21,
      marginTop: 8,
      marginBottom: 22,
    },
    card: {
      minHeight: 142,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 18,
      backgroundColor: c.card,
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
      padding: 16,
      marginBottom: 12,
    },
    proCard: { borderColor: c.primary },
    cardIcon: {
      width: 54,
      height: 54,
      borderRadius: 17,
      backgroundColor: c.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    cardCopy: { flex: 1 },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      flexWrap: "wrap",
    },
    cardTitle: {
      color: c.foreground,
      fontSize: 18,
      lineHeight: 23,
      fontWeight: "700",
    },
    cardBody: {
      color: c.mutedForeground,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 5,
    },
    freeBadge: {
      color: c.success,
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 0.7,
    },
    proBadge: {
      color: c.primary,
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 0.7,
    },
    entitlementLine: {
      color: c.primary,
      fontSize: 12,
      fontWeight: "700",
      marginTop: 8,
    },
    pressed: { opacity: 0.72 },
  });
}
