import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export function CutScreen({
  title,
  eyebrow,
  children,
  scrollProps,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  scrollProps?: ScrollViewProps;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <ScrollView
      {...scrollProps}
      style={[styles.screen, { backgroundColor: c.background }, scrollProps?.style]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 14,
          paddingBottom: insets.bottom + 112,
        },
        scrollProps?.contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          {eyebrow ? (
            <Text style={[styles.eyebrow, { color: c.primary }]}>{eyebrow}</Text>
          ) : null}
          <Text accessibilityRole="header" style={[styles.title, { color: c.foreground }]}>
            {title}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityLabel="Open profile and settings"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.account,
              { backgroundColor: c.secondary, borderColor: c.border },
              pressed && styles.pressed,
            ]}
            onPress={() => router.push("/settings")}
          >
            <Ionicons name="person-outline" size={20} color={c.foreground} />
          </Pressable>
          <Pressable
            accessibilityLabel="Scan barcode or take a food photo"
            accessibilityHint="Barcode scanning is free. Photo analysis requires CUT OS Pro."
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.capture,
              { backgroundColor: c.primary },
              pressed && styles.pressed,
            ]}
            onPress={() => router.push("/capture")}
          >
            <Ionicons name="scan" size={21} color={c.primaryForeground} />
          </Pressable>
        </View>
      </View>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16 },
  header: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 18,
  },
  headerCopy: { flex: 1 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    marginBottom: 1,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    letterSpacing: -1.1,
  },
  account: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  capture: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0066FF",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 7,
    elevation: 4,
  },
  pressed: { opacity: 0.7 },
});
