import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMyNutritionPreferencesQueryKey,
  getListMyProMealFitsQueryKey,
  useGetMyNutritionPreferences,
  useResetMyNutritionPreferences,
  useUpsertMyNutritionPreferences,
  type NutritionPreferencesDietStyle,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const DIET_OPTIONS: Array<{
  value: NutritionPreferencesDietStyle;
  label: string;
}> = [
  { value: "no_preference", label: "No preference" },
  { value: "omnivore", label: "Omnivore" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "pescatarian", label: "Pescatarian" },
];

function splitChoices(value: string, max: number): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);
}

export default function NutritionPreferencesScreen() {
  const c = useColors();
  const s = makeStyles(c);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const preferences = useGetMyNutritionPreferences();
  const update = useUpsertMyNutritionPreferences();
  const reset = useResetMyNutritionPreferences();
  const initialized = React.useRef(false);
  const [calories, setCalories] = React.useState("");
  const [protein, setProtein] = React.useState("");
  const [dietStyle, setDietStyle] =
    React.useState<NutritionPreferencesDietStyle>("no_preference");
  const [cuisines, setCuisines] = React.useState("");
  const [avoided, setAvoided] = React.useState("");
  const [learningEnabled, setLearningEnabled] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!preferences.data || initialized.current) return;
    initialized.current = true;
    setCalories(
      preferences.data.dailyCalorieTarget === null
        ? ""
        : String(preferences.data.dailyCalorieTarget),
    );
    setProtein(
      preferences.data.dailyProteinTargetG === null
        ? ""
        : String(preferences.data.dailyProteinTargetG),
    );
    setDietStyle(preferences.data.dietStyle);
    setCuisines(preferences.data.preferredCuisines.join(", "));
    setAvoided(preferences.data.avoidedIngredients.join(", "));
    setLearningEnabled(preferences.data.learningEnabled);
  }, [preferences.data]);

  const save = async () => {
    const calorieTarget = calories.trim() ? Number(calories) : null;
    const proteinTarget = protein.trim() ? Number(protein) : null;
    if (
      (calorieTarget !== null &&
        (!Number.isInteger(calorieTarget) ||
          calorieTarget < 800 ||
          calorieTarget > 6000)) ||
      (proteinTarget !== null &&
        (!Number.isInteger(proteinTarget) ||
          proteinTarget < 20 ||
          proteinTarget > 400))
    ) {
      setError("Use 800–6000 calories and 20–400 g protein, or leave blank.");
      return;
    }

    try {
      await update.mutateAsync({
        data: {
          dailyCalorieTarget: calorieTarget,
          dailyProteinTargetG: proteinTarget,
          dietStyle,
          preferredCuisines: splitChoices(cuisines, 10),
          avoidedIngredients: splitChoices(avoided, 20),
          learningEnabled,
        },
      });
      await Promise.all([
        qc.invalidateQueries({
          queryKey: getGetMyNutritionPreferencesQueryKey(),
        }),
        qc.invalidateQueries({ queryKey: getListMyProMealFitsQueryKey() }),
      ]);
      router.back();
    } catch {
      setError(
        "Couldn't save preferences. Check your connection and try again.",
      );
    }
  };

  const resetPreferences = () => {
    Alert.alert(
      "Reset food goals?",
      "This clears your targets and food preferences. Your diary and saved foods stay intact.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            void reset
              .mutateAsync()
              .then(async () => {
                setCalories("");
                setProtein("");
                setDietStyle("no_preference");
                setCuisines("");
                setAvoided("");
                setLearningEnabled(true);
                await Promise.all([
                  qc.invalidateQueries({
                    queryKey: getGetMyNutritionPreferencesQueryKey(),
                  }),
                  qc.invalidateQueries({
                    queryKey: getListMyProMealFitsQueryKey(),
                  }),
                ]);
              })
              .catch(() =>
                setError(
                  "Couldn't reset preferences. Check your connection and try again.",
                ),
              );
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={s.flex}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 34,
          paddingHorizontal: 16,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
            Food goals
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: update.isPending }}
            disabled={update.isPending}
            style={s.navButton}
            onPress={() => void save()}
          >
            {update.isPending ? (
              <ActivityIndicator color={c.primary} />
            ) : (
              <Text style={s.save}>Save</Text>
            )}
          </Pressable>
        </View>

        {preferences.isLoading ? (
          <View style={s.loading}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : (
          <>
            <Text style={s.sectionTitle}>Daily targets</Text>
            <Text style={s.sectionCopy}>
              Optional. Pro uses what is left today to rank meals and suggest a
              serving size.
            </Text>
            <View style={s.row}>
              <Field
                label="Calories"
                value={calories}
                placeholder="e.g. 2200"
                suffix="cal"
                onChangeText={(value) => {
                  setCalories(value.replace(/\D/gu, ""));
                  setError(null);
                }}
              />
              <Field
                label="Protein"
                value={protein}
                placeholder="e.g. 180"
                suffix="g"
                onChangeText={(value) => {
                  setProtein(value.replace(/\D/gu, ""));
                  setError(null);
                }}
              />
            </View>

            <Text style={s.sectionTitle}>Eating style</Text>
            <View style={s.chips}>
              {DIET_OPTIONS.map((option) => {
                const selected = option.value === dietStyle;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    key={option.value}
                    style={[s.chip, selected && s.chipSelected]}
                    onPress={() => setDietStyle(option.value)}
                  >
                    <Text style={[s.chipText, selected && s.chipTextSelected]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={s.sectionTitle}>Cuisine preferences</Text>
            <Text style={s.sectionCopy}>
              Separate choices with commas. Try Desi, Bengali, Mediterranean.
            </Text>
            <TextInput
              accessibilityLabel="Preferred cuisines"
              autoCapitalize="words"
              placeholder="Desi, Bengali"
              placeholderTextColor={c.mutedForeground}
              style={s.textInput}
              value={cuisines}
              onChangeText={setCuisines}
            />

            <Text style={s.sectionTitle}>Foods you prefer to avoid</Text>
            <Text style={s.sectionCopy}>
              Preference filter only—not an allergy safety tool. Always review
              ingredients and labels.
            </Text>
            <TextInput
              accessibilityLabel="Foods to avoid"
              placeholder="cilantro, mushrooms"
              placeholderTextColor={c.mutedForeground}
              style={s.textInput}
              value={avoided}
              onChangeText={setAvoided}
            />

            <View style={s.learningCard}>
              <View style={s.learningCopy}>
                <Text style={s.learningTitle}>Learn from my choices</Text>
                <Text style={s.learningMeta}>
                  Pro can use confirmed meal logs and direct feedback. Turning
                  this off keeps only your explicit settings.
                </Text>
              </View>
              <Switch
                accessibilityLabel="Learn from my choices"
                value={learningEnabled}
                onValueChange={setLearningEnabled}
                trackColor={{ false: c.border, true: c.primary }}
              />
            </View>

            <View style={s.privacyCard}>
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color={c.primary}
              />
              <Text style={s.privacyText}>
                CUT uses these choices inside your account. It does not infer
                allergies, medical conditions, religion, or identity.
              </Text>
            </View>

            {error ? (
              <Text accessibilityRole="alert" style={s.error}>
                {error}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: update.isPending }}
              disabled={update.isPending}
              style={({ pressed }) => [
                s.primaryButton,
                update.isPending && s.disabled,
                pressed && s.pressed,
              ]}
              onPress={() => void save()}
            >
              {update.isPending ? (
                <ActivityIndicator color={c.primaryForeground} />
              ) : (
                <Text style={s.primaryText}>Save food goals</Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={reset.isPending}
              style={s.resetButton}
              onPress={resetPreferences}
            >
              {reset.isPending ? (
                <ActivityIndicator color={c.mutedForeground} />
              ) : (
                <Text style={s.resetText}>Reset food goals</Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  function Field({
    label,
    value,
    placeholder,
    suffix,
    onChangeText,
  }: {
    label: string;
    value: string;
    placeholder: string;
    suffix: string;
    onChangeText: (value: string) => void;
  }) {
    return (
      <View style={s.field}>
        <Text style={s.label}>{label}</Text>
        <View style={s.fieldInput}>
          <TextInput
            accessibilityLabel={label}
            keyboardType="number-pad"
            maxLength={4}
            placeholder={placeholder}
            placeholderTextColor={c.mutedForeground}
            style={s.fieldText}
            value={value}
            onChangeText={onChangeText}
          />
          <Text style={s.suffix}>{suffix}</Text>
        </View>
      </View>
    );
  }
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    nav: {
      minHeight: 54,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    navButton: {
      minWidth: 54,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    navTitle: { color: c.foreground, fontSize: 18, fontWeight: "800" },
    save: { color: c.primary, fontSize: 16, fontWeight: "800" },
    loading: { minHeight: 240, alignItems: "center", justifyContent: "center" },
    sectionTitle: {
      color: c.foreground,
      fontSize: 19,
      fontWeight: "800",
      marginTop: 22,
    },
    sectionCopy: {
      color: c.mutedForeground,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 4,
      marginBottom: 10,
    },
    row: { flexDirection: "row", gap: 12, marginTop: 10 },
    field: { flex: 1 },
    label: {
      color: c.foreground,
      fontSize: 13,
      fontWeight: "700",
      marginBottom: 6,
    },
    fieldInput: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 14,
      backgroundColor: c.input,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 13,
    },
    fieldText: { flex: 1, minHeight: 50, color: c.foreground, fontSize: 16 },
    suffix: { color: c.mutedForeground, fontSize: 13, fontWeight: "700" },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
    chip: {
      minHeight: 42,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 21,
      backgroundColor: c.card,
      justifyContent: "center",
      paddingHorizontal: 14,
    },
    chipSelected: { borderColor: c.primary, backgroundColor: c.primary },
    chipText: { color: c.foreground, fontSize: 13, fontWeight: "700" },
    chipTextSelected: { color: c.primaryForeground },
    textInput: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 14,
      backgroundColor: c.input,
      color: c.foreground,
      fontSize: 16,
      paddingHorizontal: 14,
    },
    learningCard: {
      minHeight: 94,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      backgroundColor: c.card,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 15,
      marginTop: 24,
    },
    learningCopy: { flex: 1 },
    learningTitle: { color: c.foreground, fontSize: 15, fontWeight: "800" },
    learningMeta: {
      color: c.mutedForeground,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 3,
    },
    privacyCard: {
      borderRadius: 14,
      backgroundColor: c.secondary,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      padding: 14,
      marginTop: 12,
    },
    privacyText: {
      flex: 1,
      color: c.secondaryForeground,
      fontSize: 12,
      lineHeight: 18,
    },
    error: {
      color: c.destructiveText,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 12,
    },
    primaryButton: {
      minHeight: 52,
      borderRadius: 14,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 18,
    },
    primaryText: {
      color: c.primaryForeground,
      fontSize: 16,
      fontWeight: "800",
    },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.72 },
    resetButton: {
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
    },
    resetText: {
      color: c.destructiveText,
      fontSize: 14,
      fontWeight: "700",
    },
  });
}
