import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetTodayMealsQueryKey,
  getGetTodayQueryKey,
  getListMyProMealFitsQueryKey,
  useDeleteMyMealEntry,
  useGetMyNutritionPreferences,
  useGetTodayMeals,
  useListMyFoodLibrary,
  useListMyMealOptions,
  useListMyProMealFits,
  useUpsertMyMealFeedback,
  type FoodLibraryItem,
  type MealEntry,
  type MealOption,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { CutScreen } from "@/components/CutScreen";
import { useColors } from "@/hooks/useColors";
import {
  dailyDeviceTimeZoneQueryKey,
  useDeviceTimeZoneGate,
} from "@/lib/device-time-zone-gate";
import { useSubscriptionGate } from "@/lib/subscription-gate";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function nutritionLine(item: MealEntry | MealOption | FoodLibraryItem): string {
  return `${Math.round(item.caloriesKcal)} cal · ${Math.round(item.proteinG)}g protein`;
}

export default function FoodScreen() {
  const c = useColors();
  const s = makeStyles(c);
  const router = useRouter();
  const qc = useQueryClient();
  const subscription = useSubscriptionGate();
  const dailyTimeZone = useDeviceTimeZoneGate();
  const [search, setSearch] = React.useState("");
  const [showAllFoods, setShowAllFoods] = React.useState(false);
  const [showAllMeals, setShowAllMeals] = React.useState(false);
  const mealsQuery = useGetTodayMeals({
    query: {
      queryKey: dailyDeviceTimeZoneQueryKey(
        getGetTodayMealsQueryKey(),
        dailyTimeZone,
      ),
      refetchInterval: 60_000,
    },
    request: dailyTimeZone.request,
  });
  const optionsQuery = useListMyMealOptions();
  const preferencesQuery = useGetMyNutritionPreferences();
  const foodsQuery = useListMyFoodLibrary(
    search.trim() ? { query: search.trim().slice(0, 80) } : undefined,
  );
  const proFitsQuery = useListMyProMealFits({
    query: {
      queryKey: dailyDeviceTimeZoneQueryKey(
        getListMyProMealFitsQueryKey(),
        dailyTimeZone,
      ),
      enabled: subscription.isEntitled,
      retry: false,
    },
    request: dailyTimeZone.request,
  });
  const deleteMeal = useDeleteMyMealEntry();
  const feedback = useUpsertMyMealFeedback();

  React.useEffect(() => {
    if (mealsQuery.error) dailyTimeZone.reject(mealsQuery.error);
  }, [dailyTimeZone, mealsQuery.error]);

  const query = search.trim().toLocaleLowerCase();
  const calorieTarget = preferencesQuery.data?.dailyCalorieTarget;
  const suggestions = (optionsQuery.data ?? []).filter((option) => {
    if (!query) return true;
    return [
      option.name,
      option.description,
      option.cuisine,
      ...option.dietaryTags,
    ]
      .join(" ")
      .toLocaleLowerCase()
      .includes(query);
  });
  const visibleFoods =
    query || showAllFoods
      ? (foodsQuery.data ?? [])
      : (foodsQuery.data ?? []).slice(0, 7);
  const visibleSuggestions =
    query || showAllMeals ? suggestions : suggestions.slice(0, 5);

  const removeEntry = (entry: MealEntry) => {
    Alert.alert("Remove food?", entry.name, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void deleteMeal
            .mutateAsync({ mealEntryId: entry.id })
            .then(async () => {
              await Promise.all([
                qc.invalidateQueries({ queryKey: getGetTodayMealsQueryKey() }),
                qc.invalidateQueries({ queryKey: getGetTodayQueryKey() }),
              ]);
            })
            .catch(() => {
              Alert.alert(
                "Couldn't remove food",
                "Check your connection and try again.",
              );
            });
        },
      },
    ]);
  };

  return (
    <CutScreen title="Food" eyebrow="Today’s diary">
      <View
        style={[
          s.search,
          { backgroundColor: c.input, borderColor: c.inputBorder },
        ]}
      >
        <Ionicons name="search" size={20} color={c.mutedForeground} />
        <TextInput
          accessibilityLabel="Search foods and meals"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          placeholder="Search foods and meals"
          placeholderTextColor={c.mutedForeground}
          style={[s.searchInput, { color: c.foreground }]}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={s.actionGrid}>
        <FoodAction
          label="Barcode"
          icon="barcode-outline"
          onPress={() => router.push("/barcode")}
        />
        <FoodAction
          label="Photo"
          icon="camera-outline"
          badge="PRO"
          onPress={() => router.push("/photo-estimate")}
        />
        <FoodAction
          label="Manual"
          icon="create-outline"
          onPress={() =>
            router.push({ pathname: "/food-entry", params: { mode: "manual" } })
          }
        />
        <FoodAction
          label="Saved"
          icon="bookmark-outline"
          onPress={() => router.push("/saved-foods")}
        />
      </View>

      <Pressable
        accessibilityLabel="Make me a personalized meal, CUT OS Pro"
        accessibilityRole="button"
        style={({ pressed }) => [s.mealMakerCard, pressed && s.pressed]}
        onPress={() => router.push("/meal-creator" as never)}
      >
        <View style={s.mealMakerIcon}>
          <Ionicons name="sparkles" size={24} color={c.primary} />
        </View>
        <View style={s.rowCopy}>
          <View style={s.proHeading}>
            <Text style={s.mealMakerTitle}>Make me a meal</Text>
            <Text style={s.proPill}>PRO</Text>
          </View>
          <Text style={s.rowMeta}>
            Built for your targets, preferences, confirmed meals, and what you
            have right now.
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={20} color={c.primary} />
      </Pressable>

      <View style={s.sectionHeader}>
        <View>
          <Text style={s.sectionTitle}>Today</Text>
          <Text style={s.sectionMeta}>
            {mealsQuery.data
              ? `${Math.round(mealsQuery.data.totals.caloriesKcal)}${calorieTarget ? ` / ${calorieTarget}` : ""} cal · ${Math.round(mealsQuery.data.totals.proteinG)}g protein`
              : "Daily totals"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          style={s.textButton}
          onPress={() => router.push("/meal-one")}
        >
          <Ionicons name="add" size={18} color={c.primary} />
          <Text style={s.textButtonLabel}>Add food</Text>
        </Pressable>
      </View>

      <View style={s.diaryCard}>
        {mealsQuery.isLoading ? (
          <View style={s.loadingRow}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : mealsQuery.isError ? (
          <StateRow
            title="Diary unavailable"
            detail="Check your connection and retry."
            action="Retry"
            onPress={() => void mealsQuery.refetch()}
          />
        ) : (mealsQuery.data?.entries.length ?? 0) === 0 ? (
          <StateRow
            title="Start your food log"
            detail="Search, scan, or add a food. Your calories and macros update here."
            action="Add first food"
            onPress={() => router.push("/meal-one")}
          />
        ) : (
          mealsQuery.data?.entries.map((entry, index) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${entry.name}, ${nutritionLine(entry)}. Double tap for options.`}
              key={entry.id}
              style={({ pressed }) => [
                s.diaryRow,
                index > 0 && s.rowDivider,
                pressed && s.pressed,
              ]}
              onLongPress={() => removeEntry(entry)}
              onPress={() => router.push("/meal-one")}
            >
              <View style={s.rowCopy}>
                <Text style={s.rowTitle}>{entry.name}</Text>
                <Text style={s.rowMeta}>{entry.servingDescription}</Text>
              </View>
              <View style={s.rowValueWrap}>
                <Text style={s.rowValue}>{Math.round(entry.caloriesKcal)}</Text>
                <Text style={s.rowMeta}>cal</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={c.mutedForeground}
              />
            </Pressable>
          ))
        )}
      </View>

      <View style={s.sectionHeader}>
        <View>
          <View style={s.proHeading}>
            <Text style={s.sectionTitle}>Adaptive meal fits</Text>
            <Text style={s.proPill}>PRO</Text>
          </View>
          <Text style={s.sectionMeta}>Learns from meals you confirm</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          style={s.textButton}
          onPress={() => router.push("/nutrition-preferences")}
        >
          <Ionicons name="options-outline" size={17} color={c.primary} />
          <Text style={s.textButtonLabel}>Tune</Text>
        </Pressable>
      </View>

      {!subscription.isEntitled ? (
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [s.proCard, pressed && s.pressed]}
          onPress={() => router.push("/subscription")}
        >
          <View style={s.proIcon}>
            <Ionicons name="sparkles" size={22} color={c.primary} />
          </View>
          <View style={s.rowCopy}>
            <Text style={s.rowTitle}>Meals that adapt to your logs</Text>
            <Text style={s.rowMeta}>
              See three transparent fits based on meals you chose. Nothing is
              auto-logged.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color={c.primary} />
        </Pressable>
      ) : proFitsQuery.isLoading ? (
        <View style={s.loadingRow}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : proFitsQuery.isError ? (
        <StateRow
          title="Adaptive fits unavailable"
          detail="Your free food library and meal ideas still work."
          action="Retry"
          onPress={() => void proFitsQuery.refetch()}
        />
      ) : (
        <View style={s.suggestionList}>
          {proFitsQuery.data?.map((option) => (
            <Pressable
              accessibilityRole="button"
              key={`pro-${option.id}`}
              style={({ pressed }) => [s.proFitCard, pressed && s.pressed]}
              onPress={() =>
                router.push({
                  pathname: "/meal-one",
                  params: {
                    mealTemplateId: option.id,
                    servings: String(option.recommendedServings),
                  },
                })
              }
            >
              <View style={s.suggestionTop}>
                <View style={s.rowCopy}>
                  <Text style={s.rowTitle}>{option.name}</Text>
                  <Text style={s.rowMeta}>{nutritionLine(option)}</Text>
                </View>
                <Ionicons name="sparkles" size={20} color={c.primary} />
              </View>
              <Text style={s.fitReason}>{option.fitReason}</Text>
              <View style={s.fitFooter}>
                <Text style={s.servingHint}>
                  Suggested: {option.recommendedServings} serving
                  {option.recommendedServings === 1 ? "" : "s"}
                </Text>
                <View style={s.feedbackActions}>
                  <Pressable
                    accessibilityLabel={`Like ${option.name}`}
                    accessibilityRole="button"
                    disabled={feedback.isPending}
                    style={s.feedbackButton}
                    onPress={(event) => {
                      event.stopPropagation();
                      void feedback
                        .mutateAsync({
                          templateId: option.id,
                          data: { preference: "liked" },
                        })
                        .then(() =>
                          qc.invalidateQueries({
                            queryKey: getListMyProMealFitsQueryKey(),
                          }),
                        )
                        .catch(() =>
                          Alert.alert(
                            "Couldn't save feedback",
                            "Check your connection and try again.",
                          ),
                        );
                    }}
                  >
                    <Ionicons
                      name="thumbs-up-outline"
                      size={17}
                      color={c.primary}
                    />
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Hide ${option.name} from adaptive meal fits`}
                    accessibilityRole="button"
                    disabled={feedback.isPending}
                    style={s.feedbackButton}
                    onPress={(event) => {
                      event.stopPropagation();
                      void feedback
                        .mutateAsync({
                          templateId: option.id,
                          data: { preference: "not_for_me" },
                        })
                        .then(() =>
                          qc.invalidateQueries({
                            queryKey: getListMyProMealFitsQueryKey(),
                          }),
                        )
                        .catch(() =>
                          Alert.alert(
                            "Couldn't save feedback",
                            "Check your connection and try again.",
                          ),
                        );
                    }}
                  >
                    <Ionicons
                      name="close"
                      size={19}
                      color={c.mutedForeground}
                    />
                  </Pressable>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <View style={s.sectionHeader}>
        <View>
          <Text style={s.sectionTitle}>
            {query ? "Foods" : "Everyday foods"}
          </Text>
          <Text style={s.sectionMeta}>Free · USDA-linked · editable</Text>
        </View>
        {!query && (foodsQuery.data?.length ?? 0) > 7 ? (
          <Pressable
            accessibilityRole="button"
            style={s.textButton}
            onPress={() => setShowAllFoods((current) => !current)}
          >
            <Text style={s.textButtonLabel}>
              {showAllFoods
                ? "Show less"
                : `View all ${foodsQuery.data?.length ?? 0}`}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {foodsQuery.isLoading ? (
        <View style={s.loadingRow}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : foodsQuery.isError ? (
        <StateRow
          title="Food library unavailable"
          detail="You can still add a food manually or scan a barcode."
          action="Retry"
          onPress={() => void foodsQuery.refetch()}
        />
      ) : (foodsQuery.data?.length ?? 0) === 0 ? (
        <StateRow
          title="No built-in food match"
          detail="Try a meal below, scan a package, or add the label manually."
          action="Add manually"
          onPress={() =>
            router.push({
              pathname: "/food-entry",
              params: { mode: "manual", name: search },
            })
          }
        />
      ) : (
        <View style={s.libraryCard}>
          {visibleFoods.map((food, index) => (
            <Pressable
              accessibilityRole="button"
              key={food.id}
              style={({ pressed }) => [
                s.diaryRow,
                index > 0 && s.rowDivider,
                pressed && s.pressed,
              ]}
              onPress={() =>
                router.push({
                  pathname: "/food-entry",
                  params: {
                    mode: "library",
                    source: "curated",
                    sourceRef: food.id,
                    name: food.name,
                    serving: food.servingDescription,
                    calories: String(food.caloriesKcal),
                    protein: String(food.proteinG),
                    carbs: String(food.carbsG),
                    fat: String(food.fatG),
                    fiber: String(food.fiberG),
                  },
                })
              }
            >
              <View style={s.rowCopy}>
                <Text style={s.rowTitle}>{food.name}</Text>
                <Text style={s.rowMeta}>
                  {food.servingDescription} · {nutritionLine(food)}
                </Text>
              </View>
              {food.cuisineTags.includes("desi") ||
              food.cuisineTags.includes("bengali") ? (
                <Text style={s.cuisineBadge}>DESI</Text>
              ) : null}
              <Ionicons name="add-circle" size={24} color={c.primary} />
            </Pressable>
          ))}
        </View>
      )}

      <View style={s.sectionHeader}>
        <View>
          <Text style={s.sectionTitle}>
            {query ? "Meal matches" : "Balanced meal ideas"}
          </Text>
          <Text style={s.sectionMeta}>Editable nutrition estimates</Text>
        </View>
        {!query && suggestions.length > 5 ? (
          <Pressable
            accessibilityRole="button"
            style={s.textButton}
            onPress={() => setShowAllMeals((current) => !current)}
          >
            <Text style={s.textButtonLabel}>
              {showAllMeals ? "Show less" : `View all ${suggestions.length}`}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {optionsQuery.isLoading ? (
        <View style={s.loadingRow}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : optionsQuery.isError ? (
        <StateRow
          title="Suggestions unavailable"
          detail="You can still add a food manually."
          action="Retry"
          onPress={() => void optionsQuery.refetch()}
        />
      ) : suggestions.length === 0 ? (
        <StateRow
          title="No preset match"
          detail="Add this food manually instead."
          action="Add manually"
          onPress={() =>
            router.push({
              pathname: "/food-entry",
              params: { mode: "manual", name: search },
            })
          }
        />
      ) : (
        <View style={s.suggestionList}>
          {visibleSuggestions.map((option) => (
            <Pressable
              accessibilityRole="button"
              key={option.id}
              style={({ pressed }) => [s.suggestionCard, pressed && s.pressed]}
              onPress={() =>
                router.push({
                  pathname: "/meal-one",
                  params: { mealTemplateId: option.id },
                })
              }
            >
              <View style={s.suggestionTop}>
                <View style={s.rowCopy}>
                  <Text style={s.rowTitle}>{option.name}</Text>
                  <Text style={s.rowMeta}>{option.servingDescription}</Text>
                </View>
                <Text style={s.suggestionCalories}>
                  {Math.round(option.caloriesKcal)} cal
                </Text>
              </View>
              <Text style={s.fitReason} numberOfLines={2}>
                {option.fitReason}
              </Text>
              <View style={s.suggestionFooter}>
                <Text style={s.macroLine}>{nutritionLine(option)}</Text>
                <View style={s.addCircle}>
                  <Ionicons name="add" size={20} color={c.primaryForeground} />
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </CutScreen>
  );

  function FoodAction({
    label,
    icon,
    badge,
    onPress,
  }: {
    label: string;
    icon: IoniconName;
    badge?: string;
    onPress: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}${badge ? `, ${badge}` : ""}`}
        style={({ pressed }) => [s.action, pressed && s.pressed]}
        onPress={onPress}
      >
        <View style={s.actionIcon}>
          <Ionicons name={icon} size={22} color={c.primary} />
          {badge ? <Text style={s.proBadge}>{badge}</Text> : null}
        </View>
        <Text style={s.actionLabel}>{label}</Text>
      </Pressable>
    );
  }

  function StateRow({
    title,
    detail,
    action,
    onPress,
  }: {
    title: string;
    detail: string;
    action: string;
    onPress: () => void;
  }) {
    return (
      <View style={s.stateRow}>
        <Text style={s.rowTitle}>{title}</Text>
        <Text style={s.stateDetail}>{detail}</Text>
        <Pressable
          accessibilityRole="button"
          style={s.stateAction}
          onPress={onPress}
        >
          <Text style={s.textButtonLabel}>{action}</Text>
          <Ionicons name="arrow-forward" size={16} color={c.primary} />
        </Pressable>
      </View>
    );
  }
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    search: {
      minHeight: 50,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      gap: 10,
    },
    searchInput: { flex: 1, fontSize: 16, minHeight: 48 },
    actionGrid: { flexDirection: "row", gap: 8, marginTop: 12 },
    mealMakerCard: {
      minHeight: 94,
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: 17,
      backgroundColor: c.card,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      marginTop: 12,
    },
    mealMakerIcon: {
      width: 48,
      height: 48,
      borderRadius: 15,
      backgroundColor: c.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    mealMakerTitle: {
      color: c.foreground,
      fontSize: 17,
      lineHeight: 22,
      fontWeight: "800",
    },
    action: {
      flex: 1,
      minHeight: 74,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
    },
    actionIcon: { position: "relative" },
    actionLabel: { color: c.foreground, fontSize: 12, fontWeight: "600" },
    proBadge: {
      position: "absolute",
      left: 18,
      top: -8,
      color: c.primary,
      fontSize: 8,
      fontWeight: "900",
    },
    sectionHeader: {
      minHeight: 64,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginTop: 14,
    },
    sectionTitle: { color: c.foreground, fontSize: 19, fontWeight: "700" },
    proHeading: { flexDirection: "row", alignItems: "center", gap: 7 },
    proPill: {
      color: c.primaryForeground,
      backgroundColor: c.primary,
      borderRadius: 8,
      overflow: "hidden",
      paddingHorizontal: 7,
      paddingVertical: 3,
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 0.6,
    },
    proCard: {
      minHeight: 92,
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: 16,
      backgroundColor: c.card,
      padding: 15,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    proIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: c.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    proFitCard: {
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: 16,
      backgroundColor: c.card,
      padding: 16,
    },
    fitFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      marginTop: 11,
    },
    servingHint: {
      flex: 1,
      color: c.foreground,
      fontSize: 12,
      fontWeight: "700",
    },
    feedbackActions: { flexDirection: "row", gap: 6 },
    feedbackButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionMeta: { color: c.mutedForeground, fontSize: 13, marginTop: 2 },
    textButton: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 3,
      paddingHorizontal: 4,
    },
    textButtonLabel: { color: c.primary, fontSize: 14, fontWeight: "700" },
    diaryCard: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      backgroundColor: c.card,
      overflow: "hidden",
    },
    libraryCard: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      backgroundColor: c.card,
      overflow: "hidden",
    },
    diaryRow: {
      minHeight: 70,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 11,
      gap: 10,
    },
    rowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    rowCopy: { flex: 1, minWidth: 0 },
    rowTitle: {
      color: c.foreground,
      fontSize: 16,
      lineHeight: 21,
      fontWeight: "600",
    },
    rowMeta: {
      color: c.mutedForeground,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 2,
    },
    rowValueWrap: { alignItems: "flex-end" },
    rowValue: {
      color: c.foreground,
      fontSize: 17,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    cuisineBadge: {
      color: c.primary,
      backgroundColor: c.secondary,
      borderRadius: 8,
      overflow: "hidden",
      paddingHorizontal: 6,
      paddingVertical: 4,
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 0.5,
    },
    loadingRow: {
      minHeight: 100,
      alignItems: "center",
      justifyContent: "center",
    },
    stateRow: {
      minHeight: 146,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      backgroundColor: c.card,
      padding: 18,
      justifyContent: "center",
    },
    stateDetail: {
      color: c.mutedForeground,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 5,
    },
    stateAction: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 6,
    },
    suggestionList: { gap: 10 },
    suggestionCard: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      backgroundColor: c.card,
      padding: 16,
    },
    suggestionTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    suggestionCalories: {
      color: c.foreground,
      fontSize: 14,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    fitReason: {
      color: c.mutedForeground,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 9,
    },
    suggestionFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginTop: 12,
    },
    macroLine: { color: c.foreground, fontSize: 12, fontWeight: "600" },
    addCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    pressed: { opacity: 0.72 },
  });
}
