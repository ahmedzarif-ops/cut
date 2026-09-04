import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListMySavedFoodsQueryKey,
  useDeleteMySavedFood,
  useListMySavedFoods,
  type SavedFood,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function SavedFoodsScreen() {
  const c = useColors();
  const s = makeStyles(c);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const foods = useListMySavedFoods();
  const remove = useDeleteMySavedFood();

  const useFood = (food: SavedFood) => {
    router.push({
      pathname: "/food-entry",
      params: {
        mode: "saved",
        source: food.source,
        sourceRef: food.sourceRef ?? undefined,
        name: food.name,
        serving: food.servingDescription,
        calories: String(food.caloriesKcal),
        protein: String(food.proteinG),
        carbs: String(food.carbsG),
        fat: String(food.fatG),
        fiber: String(food.fiberG),
      },
    });
  };

  const removeFood = (food: SavedFood) => {
    Alert.alert("Remove from My Foods?", food.name, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void remove
            .mutateAsync({ savedFoodId: food.id })
            .then(() =>
              qc.invalidateQueries({
                queryKey: getListMySavedFoodsQueryKey(),
              }),
            )
            .catch(() =>
              Alert.alert(
                "Couldn't remove food",
                "Check your connection and try again.",
              ),
            );
        },
      },
    ]);
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top + 8 }]}>
      <View style={s.nav}>
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          style={s.navButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={26} color={c.foreground} />
        </Pressable>
        <Text accessibilityRole="header" style={s.navTitle}>
          My Foods
        </Text>
        <Pressable
          accessibilityLabel="Create a saved food"
          accessibilityRole="button"
          style={s.navButton}
          onPress={() =>
            router.push({ pathname: "/food-entry", params: { mode: "manual" } })
          }
        >
          <Ionicons name="add" size={27} color={c.primary} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.intro}>
          Your reviewed foods stay private to your account. Tap to add one;
          press and hold to remove it.
        </Text>
        {foods.isLoading ? (
          <View style={s.center}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : foods.isError ? (
          <View style={s.stateCard}>
            <Text style={s.stateTitle}>My Foods unavailable</Text>
            <Text style={s.stateBody}>
              Check your connection. Your food diary still works.
            </Text>
            <Pressable
              accessibilityRole="button"
              style={s.retry}
              onPress={() => void foods.refetch()}
            >
              <Text style={s.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : foods.data?.length ? (
          <View style={s.card}>
            {foods.data.map((food, index) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${food.name}, ${Math.round(food.caloriesKcal)} calories, ${Math.round(food.proteinG)} grams protein`}
                key={food.id}
                style={({ pressed }) => [
                  s.row,
                  index > 0 && s.divider,
                  pressed && s.pressed,
                ]}
                onPress={() => useFood(food)}
                onLongPress={() => removeFood(food)}
              >
                <View style={s.icon}>
                  <Ionicons name="bookmark" size={18} color={c.primary} />
                </View>
                <View style={s.copy}>
                  <Text style={s.foodName}>{food.name}</Text>
                  <Text style={s.meta}>
                    {food.servingDescription} · {Math.round(food.caloriesKcal)}{" "}
                    cal · {Math.round(food.proteinG)}g protein
                  </Text>
                </View>
                <Ionicons name="add-circle" size={25} color={c.primary} />
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={s.stateCard}>
            <Ionicons name="bookmark-outline" size={34} color={c.primary} />
            <Text style={s.stateTitle}>Build your own food library</Text>
            <Text style={s.stateBody}>
              Add any food and leave “Save to My Foods” checked. It will appear
              here next time.
            </Text>
            <Pressable
              accessibilityRole="button"
              style={s.primaryButton}
              onPress={() =>
                router.push({
                  pathname: "/food-entry",
                  params: { mode: "manual" },
                })
              }
            >
              <Text style={s.primaryText}>Create a food</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    nav: {
      minHeight: 54,
      paddingHorizontal: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    navButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    navTitle: { color: c.foreground, fontSize: 18, fontWeight: "800" },
    intro: {
      color: c.mutedForeground,
      fontSize: 14,
      lineHeight: 20,
      marginVertical: 12,
    },
    center: { minHeight: 180, alignItems: "center", justifyContent: "center" },
    card: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 18,
      backgroundColor: c.card,
      overflow: "hidden",
    },
    row: {
      minHeight: 78,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
    },
    divider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    icon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: c.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    copy: { flex: 1, minWidth: 0 },
    foodName: { color: c.foreground, fontSize: 16, fontWeight: "700" },
    meta: {
      color: c.mutedForeground,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 3,
    },
    stateCard: {
      minHeight: 220,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 18,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    stateTitle: {
      color: c.foreground,
      fontSize: 19,
      fontWeight: "800",
      marginTop: 10,
      textAlign: "center",
    },
    stateBody: {
      color: c.mutedForeground,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 7,
      textAlign: "center",
    },
    retry: { minHeight: 44, justifyContent: "center", marginTop: 8 },
    retryText: { color: c.primary, fontSize: 15, fontWeight: "700" },
    primaryButton: {
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 22,
      marginTop: 18,
    },
    primaryText: {
      color: c.primaryForeground,
      fontSize: 15,
      fontWeight: "800",
    },
    pressed: { opacity: 0.72 },
  });
}
