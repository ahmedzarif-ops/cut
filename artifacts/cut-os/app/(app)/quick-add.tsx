import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const ACTIONS = [
  { label: "Food", detail: "Search or browse", icon: "restaurant-outline", route: "/food" },
  { label: "Manual food", detail: "Enter calories and macros", icon: "create-outline", route: "/food-entry" },
  { label: "Weight", detail: "Save today's weigh-in", icon: "scale-outline", route: "/today?action=weight" },
  { label: "Workout", detail: "Exercises, sets, and reps", icon: "barbell-outline", route: "/workout-entry" },
] as const;

export default function QuickAddScreen() {
  const c = useColors();
  const s = makeStyles(c);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.backdrop, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <Pressable
        accessibilityLabel="Close quick add"
        accessibilityRole="button"
        style={StyleSheet.absoluteFill}
        onPress={() => router.back()}
      />
      <View style={s.sheet}>
        <View style={s.handle} />
        <View style={s.header}>
          <View>
            <Text style={s.eyebrow}>QUICK ADD</Text>
            <Text accessibilityRole="header" style={s.title}>What happened?</Text>
          </View>
          <Pressable accessibilityLabel="Close" accessibilityRole="button" style={s.close} onPress={() => router.back()}>
            <Ionicons name="close" size={22} color={c.foreground} />
          </Pressable>
        </View>
        <View style={s.list}>
          {ACTIONS.map((action) => (
            <Pressable
              accessibilityRole="button"
              key={action.label}
              style={({ pressed }) => [s.row, pressed && s.pressed]}
              onPress={() => router.replace(action.route)}
            >
              <View style={s.iconWrap}>
                <Ionicons name={action.icon} size={22} color={c.primary} />
              </View>
              <View style={s.copy}>
                <Text style={s.rowTitle}>{action.label}</Text>
                <Text style={s.detail}>{action.detail}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={c.mutedForeground} />
            </Pressable>
          ))}
          <Pressable
            accessibilityLabel="Photo estimate, CUT OS Pro"
            accessibilityRole="button"
            style={({ pressed }) => [s.photoRow, pressed && s.pressed]}
            onPress={() => router.replace("/photo-estimate")}
          >
            <View style={s.iconWrap}>
              <Ionicons name="camera-outline" size={22} color={c.primary} />
            </View>
            <View style={s.copy}>
              <View style={s.proTitleRow}>
                <Text style={s.rowTitle}>Photo estimate</Text>
                <Text style={s.proBadge}>PRO</Text>
              </View>
              <Text style={s.detail}>Snap, review, and correct before saving</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={c.mutedForeground} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(4, 10, 22, 0.46)", justifyContent: "flex-end" },
    sheet: { backgroundColor: c.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 9, paddingBottom: 12 },
    handle: { width: 38, height: 5, borderRadius: 3, backgroundColor: c.border, alignSelf: "center", marginBottom: 12 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
    eyebrow: { color: c.primary, fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
    title: { color: c.foreground, fontSize: 27, lineHeight: 33, fontWeight: "800", letterSpacing: -0.6, marginTop: 2 },
    close: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.secondary, alignItems: "center", justifyContent: "center" },
    list: { borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.card, overflow: "hidden" },
    row: { minHeight: 70, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
    photoRow: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14 },
    iconWrap: { width: 42, height: 42, borderRadius: 13, backgroundColor: c.secondary, alignItems: "center", justifyContent: "center" },
    copy: { flex: 1 },
    rowTitle: { color: c.foreground, fontSize: 16, fontWeight: "700" },
    detail: { color: c.mutedForeground, fontSize: 12, lineHeight: 17, marginTop: 2 },
    proTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
    proBadge: { color: c.primary, fontSize: 9, fontWeight: "900", letterSpacing: 0.7 },
    pressed: { opacity: 0.7 },
  });
}
