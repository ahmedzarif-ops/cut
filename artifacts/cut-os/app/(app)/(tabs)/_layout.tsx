/**
 * THESIS: CUT Command is a calm, data-first control surface for a cut or recomp.
 * OWN-WORLD/WORLD: Electric blue, deep navy, tabular metrics, and familiar iOS navigation.
 * STORY: See the day, log the next thing, understand what changed, keep moving.
 * FIRST VIEWPORT: Calorie hierarchy, macro status, and one-tap logging before secondary detail.
 * FORM: Four true destinations plus a center quick action; seed c60f83d3, owner-selected Concept A.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
 */
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function TabIcon({
  focused,
  name,
}: {
  focused: boolean;
  name: IoniconName;
}) {
  const c = useColors();
  return (
    <Ionicons
      name={name}
      size={23}
      color={focused ? c.primary : c.mutedForeground}
    />
  );
}

function QuickAddButton() {
  const c = useColors();
  const router = useRouter();

  return (
    <View pointerEvents="box-none" style={styles.quickSlot}>
      <Pressable
        accessibilityLabel="Quick add"
        accessibilityHint="Opens food, weight, and workout logging actions"
        accessibilityRole="button"
        hitSlop={6}
        style={({ pressed }) => [
          styles.quickButton,
          { backgroundColor: c.primary, borderColor: c.background },
          pressed && styles.pressed,
        ]}
        onPress={() => router.push("/quick-add")}
      >
        <Ionicons name="add" size={30} color={c.primaryForeground} />
      </Pressable>
      <Text style={[styles.quickLabel, { color: c.mutedForeground }]}>Add</Text>
    </View>
  );
}

export default function CutTabsLayout() {
  const c = useColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.mutedForeground,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: c.card,
            borderTopColor: c.border,
          },
        ],
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: "Today",
          tabBarAccessibilityLabel: "Today tab",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name={focused ? "grid" : "grid-outline"} />
          ),
        }}
      />
      <Tabs.Screen
        name="food"
        options={{
          title: "Food",
          tabBarAccessibilityLabel: "Food tab",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              name={focused ? "restaurant" : "restaurant-outline"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="quick"
        listeners={{
          tabPress: (event) => event.preventDefault(),
        }}
        options={{
          title: "Add",
          tabBarAccessibilityLabel: "Quick add",
          tabBarButton: () => <QuickAddButton />,
        }}
      />
      <Tabs.Screen
        name="training"
        options={{
          title: "Training",
          tabBarAccessibilityLabel: "Training tab",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name={focused ? "barbell" : "barbell-outline"} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarAccessibilityLabel: "Progress tab",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              name={focused ? "trending-down" : "trending-down-outline"}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 84,
    paddingTop: 7,
    paddingBottom: 17,
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor: "#001A45",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 10,
  },
  tabItem: { minHeight: 52 },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  quickSlot: {
    flex: 1,
    minWidth: 64,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 0,
  },
  quickButton: {
    width: 54,
    height: 54,
    marginTop: -18,
    borderRadius: 27,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0066FF",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
});
