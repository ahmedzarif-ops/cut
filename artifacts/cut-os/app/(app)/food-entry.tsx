import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetTodayMealsQueryKey,
  getGetTodayQueryKey,
  getListMySavedFoodsQueryKey,
  useCreateMyFoodEntry,
  useGetTodayMeals,
  useSaveMyFood,
} from "@workspace/api-client-react";
import * as Crypto from "expo-crypto";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
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
  dailyDeviceTimeZoneQueryKey,
  useDeviceTimeZoneGate,
} from "@/lib/device-time-zone-gate";

type Draft = {
  name: string;
  serving: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  serving: "1 serving",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  fiber: "",
};

export default function FoodEntryScreen() {
  const c = useColors();
  const s = makeStyles(c);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{
    name?: string;
    mode?: string;
    serving?: string;
    calories?: string;
    protein?: string;
    carbs?: string;
    fat?: string;
    fiber?: string;
    source?: string;
    sourceRef?: string;
  }>();
  const dailyTimeZone = useDeviceTimeZoneGate();
  const todayQuery = useGetTodayMeals({
    query: {
      queryKey: dailyDeviceTimeZoneQueryKey(
        getGetTodayMealsQueryKey(),
        dailyTimeZone,
      ),
    },
    request: dailyTimeZone.request,
  });
  const createFood = useCreateMyFoodEntry({ request: dailyTimeZone.request });
  const saveFood = useSaveMyFood();
  const [draft, setDraft] = React.useState<Draft>(() => ({
    ...EMPTY_DRAFT,
    name: typeof params.name === "string" ? params.name : "",
    serving: typeof params.serving === "string" ? params.serving : "1 serving",
    calories: typeof params.calories === "string" ? params.calories : "",
    protein: typeof params.protein === "string" ? params.protein : "",
    carbs: typeof params.carbs === "string" ? params.carbs : "",
    fat: typeof params.fat === "string" ? params.fat : "",
    fiber: typeof params.fiber === "string" ? params.fiber : "",
  }));
  const [requestId, setRequestId] = React.useState(() => Crypto.randomUUID());
  const [error, setError] = React.useState<string | null>(null);
  const [saveForLater, setSaveForLater] = React.useState(
    params.mode !== "saved",
  );
  const busy = createFood.isPending || saveFood.isPending;

  const update = (key: keyof Draft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  const parseNumber = (value: string) => Number(value.trim().replace(",", "."));
  const save = async () => {
    if (!todayQuery.data?.dayKey || busy) return;
    const caloriesKcal = parseNumber(draft.calories);
    const proteinG = parseNumber(draft.protein || "0");
    const carbsG = parseNumber(draft.carbs || "0");
    const fatG = parseNumber(draft.fat || "0");
    const fiberG = parseNumber(draft.fiber || "0");
    if (!draft.name.trim() || !draft.serving.trim()) {
      setError("Add a food name and serving.");
      return;
    }
    if (
      !Number.isFinite(caloriesKcal) ||
      caloriesKcal < 0 ||
      ![proteinG, carbsG, fatG, fiberG].every(
        (value) => Number.isFinite(value) && value >= 0,
      )
    ) {
      setError("Enter valid calories and macros. Use 0 if a macro is unknown.");
      return;
    }

    try {
      await createFood.mutateAsync({
        data: {
          clientRequestId: requestId,
          dayKey: todayQuery.data.dayKey,
          name: draft.name.trim(),
          servingDescription: draft.serving.trim(),
          servings: 1,
          caloriesKcal,
          proteinG,
          carbsG,
          fatG,
          fiberG,
        },
      });
      let libraryWarning = false;
      if (saveForLater) {
        const source =
          params.source === "curated" || params.source === "barcode"
            ? params.source
            : params.mode === "library"
              ? "curated"
              : params.mode === "barcode"
                ? "barcode"
                : "manual";
        try {
          await saveFood.mutateAsync({
            data: {
              source,
              sourceRef:
                typeof params.sourceRef === "string"
                  ? params.sourceRef.slice(0, 160)
                  : null,
              name: draft.name.trim(),
              servingDescription: draft.serving.trim(),
              caloriesKcal,
              proteinG,
              carbsG,
              fatG,
              fiberG,
            },
          });
        } catch {
          libraryWarning = true;
        }
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: getGetTodayMealsQueryKey() }),
        qc.invalidateQueries({ queryKey: getGetTodayQueryKey() }),
        qc.invalidateQueries({ queryKey: getListMySavedFoodsQueryKey() }),
      ]);
      setRequestId(Crypto.randomUUID());
      if (libraryWarning) {
        Alert.alert(
          "Added to today",
          "The diary entry is safe, but CUT couldn't save this food to My Foods. You can try again later.",
        );
      }
      router.replace("/food");
    } catch (caught) {
      if (dailyTimeZone.reject(caught)) return;
      const status = (caught as { status?: number }).status;
      if (status === 412) {
        await todayQuery.refetch().catch(() => undefined);
        setRequestId(Crypto.randomUUID());
        setError("Today changed. Review the food and save it again.");
        return;
      }
      setError("Couldn't save this food. Check your connection and try again.");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[s.flex, { backgroundColor: c.background }]}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.nav}>
          <Pressable
            accessibilityRole="button"
            style={s.navButton}
            onPress={() => router.back()}
          >
            <Text style={s.cancel}>Cancel</Text>
          </Pressable>
          <Text accessibilityRole="header" style={s.navTitle}>
            Add food
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              disabled: busy || !todayQuery.data,
            }}
            disabled={busy || !todayQuery.data}
            style={s.navButton}
            onPress={() => void save()}
          >
            {busy ? (
              <ActivityIndicator color={c.primary} />
            ) : (
              <Text style={s.save}>Save</Text>
            )}
          </Pressable>
        </View>

        {params.mode === "saved" ? (
          <View style={s.notice}>
            <Ionicons name="bookmark-outline" size={18} color={c.primary} />
            <Text style={s.noticeText}>
              This food came from My Foods. Review it before adding it again.
            </Text>
          </View>
        ) : null}
        {params.mode === "barcode" ? (
          <View style={s.notice}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={c.primary}
            />
            <Text style={s.noticeText}>
              Barcode data comes from Open Food Facts. Review the serving,
              calories, and macros before saving.
            </Text>
          </View>
        ) : null}
        {params.mode === "library" ? (
          <View style={s.notice}>
            <Ionicons name="library-outline" size={18} color={c.primary} />
            <Text style={s.noticeText}>
              This generic USDA-linked estimate is free to use. Adjust the
              serving and values if your food or preparation differs.
            </Text>
          </View>
        ) : null}

        <Text style={s.sectionTitle}>Food</Text>
        <Field
          label="Name"
          value={draft.name}
          placeholder="Chicken breast"
          onChangeText={(value) => update("name", value)}
        />
        <Field
          label="Serving"
          value={draft.serving}
          placeholder="1 serving"
          onChangeText={(value) => update("serving", value)}
        />

        <Text style={s.sectionTitle}>Nutrition per serving</Text>
        <Field
          label="Calories"
          value={draft.calories}
          placeholder="0"
          keyboardType="decimal-pad"
          suffix="cal"
          onChangeText={(value) => update("calories", value)}
        />
        <View style={s.twoColumns}>
          <View style={s.column}>
            <Field
              label="Protein"
              value={draft.protein}
              placeholder="0"
              keyboardType="decimal-pad"
              suffix="g"
              onChangeText={(value) => update("protein", value)}
            />
          </View>
          <View style={s.column}>
            <Field
              label="Carbs"
              value={draft.carbs}
              placeholder="0"
              keyboardType="decimal-pad"
              suffix="g"
              onChangeText={(value) => update("carbs", value)}
            />
          </View>
        </View>
        <View style={s.twoColumns}>
          <View style={s.column}>
            <Field
              label="Fat"
              value={draft.fat}
              placeholder="0"
              keyboardType="decimal-pad"
              suffix="g"
              onChangeText={(value) => update("fat", value)}
            />
          </View>
          <View style={s.column}>
            <Field
              label="Fiber"
              value={draft.fiber}
              placeholder="0"
              keyboardType="decimal-pad"
              suffix="g"
              onChangeText={(value) => update("fiber", value)}
            />
          </View>
        </View>
        <Text style={s.helper}>
          Use the nutrition label when you have one. You can edit this entry
          later.
        </Text>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: saveForLater }}
          style={s.saveToggle}
          onPress={() => setSaveForLater((value) => !value)}
        >
          <View style={[s.checkbox, saveForLater && s.checkboxSelected]}>
            {saveForLater ? (
              <Ionicons
                name="checkmark"
                size={16}
                color={c.primaryForeground}
              />
            ) : null}
          </View>
          <View style={s.toggleCopy}>
            <Text style={s.toggleTitle}>Save to My Foods</Text>
            <Text style={s.toggleMeta}>
              Reuse this serving and nutrition without typing it again.
            </Text>
          </View>
        </Pressable>
        {error ? (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            disabled: busy || !todayQuery.data,
          }}
          disabled={busy || !todayQuery.data}
          style={({ pressed }) => [
            s.primaryButton,
            (busy || !todayQuery.data) && s.disabled,
            pressed && s.pressed,
          ]}
          onPress={() => void save()}
        >
          {busy ? (
            <ActivityIndicator color={c.primaryForeground} />
          ) : (
            <Text style={s.primaryButtonText}>Add to today</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  function Field({
    label,
    value,
    placeholder,
    suffix,
    keyboardType,
    onChangeText,
  }: {
    label: string;
    value: string;
    placeholder: string;
    suffix?: string;
    keyboardType?: "default" | "decimal-pad";
    onChangeText: (value: string) => void;
  }) {
    return (
      <View style={s.field}>
        <Text style={s.label}>{label}</Text>
        <View style={s.inputWrap}>
          <TextInput
            accessibilityLabel={label}
            keyboardType={keyboardType}
            placeholder={placeholder}
            placeholderTextColor={c.mutedForeground}
            style={s.input}
            value={value}
            onChangeText={onChangeText}
          />
          {suffix ? <Text style={s.suffix}>{suffix}</Text> : null}
        </View>
      </View>
    );
  }
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    flex: { flex: 1 },
    nav: {
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    navButton: { minWidth: 64, minHeight: 44, justifyContent: "center" },
    navTitle: {
      color: c.foreground,
      fontSize: 17,
      fontWeight: "700",
      textAlign: "center",
    },
    cancel: { color: c.primary, fontSize: 16 },
    save: {
      color: c.primary,
      fontSize: 16,
      fontWeight: "700",
      textAlign: "right",
    },
    notice: {
      borderRadius: 14,
      backgroundColor: c.secondary,
      flexDirection: "row",
      gap: 9,
      padding: 14,
      marginTop: 10,
    },
    noticeText: {
      flex: 1,
      color: c.secondaryForeground,
      fontSize: 13,
      lineHeight: 18,
    },
    sectionTitle: {
      color: c.foreground,
      fontSize: 20,
      fontWeight: "700",
      marginTop: 22,
      marginBottom: 10,
    },
    field: { marginBottom: 12 },
    label: {
      color: c.foreground,
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 6,
    },
    inputWrap: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 14,
      backgroundColor: c.input,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
    },
    input: { flex: 1, minHeight: 50, color: c.foreground, fontSize: 16 },
    suffix: {
      color: c.mutedForeground,
      fontSize: 14,
      fontWeight: "700",
      marginLeft: 8,
    },
    twoColumns: { flexDirection: "row", gap: 12 },
    column: { flex: 1 },
    helper: {
      color: c.mutedForeground,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 2,
    },
    saveToggle: {
      minHeight: 72,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      backgroundColor: c.card,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      marginTop: 16,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: c.inputBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxSelected: {
      borderColor: c.primary,
      backgroundColor: c.primary,
    },
    toggleCopy: { flex: 1 },
    toggleTitle: { color: c.foreground, fontSize: 15, fontWeight: "700" },
    toggleMeta: {
      color: c.mutedForeground,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 2,
    },
    error: {
      color: c.destructiveText,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 10,
    },
    primaryButton: {
      minHeight: 52,
      borderRadius: 14,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 18,
    },
    primaryButtonText: {
      color: c.primaryForeground,
      fontSize: 16,
      fontWeight: "700",
    },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.72 },
  });
}
