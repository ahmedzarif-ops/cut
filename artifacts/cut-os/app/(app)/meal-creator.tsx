import { Ionicons } from "@expo/vector-icons";
import {
  useCreateMyProMealDrafts,
  type MealDraft,
  type MealDraftInputGoal,
  type MealDraftInputMealTime,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useDeviceTimeZoneGate } from "@/lib/device-time-zone-gate";
import { useSubscriptionGate } from "@/lib/subscription-gate";

const GOALS: Array<{ value: MealDraftInputGoal; label: string }> = [
  { value: "desi", label: "Desi" },
  { value: "high_protein", label: "High protein" },
  { value: "balanced", label: "Balanced" },
  { value: "quick", label: "Quick" },
];

const TIMES: Array<{ value: MealDraftInputMealTime; label: string }> = [
  { value: "any", label: "Any" },
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

function number(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default function MealCreatorScreen() {
  const c = useColors();
  const s = makeStyles(c);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const subscription = useSubscriptionGate();
  const timeZone = useDeviceTimeZoneGate();
  const createDrafts = useCreateMyProMealDrafts({ request: timeZone.request });
  const [goal, setGoal] = React.useState<MealDraftInputGoal>("desi");
  const [mealTime, setMealTime] = React.useState<MealDraftInputMealTime>("any");
  const [maxPrepMinutes, setMaxPrepMinutes] = React.useState(30);
  const [ingredients, setIngredients] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    if (!subscription.isEntitled) {
      router.push("/subscription");
      return;
    }
    setError(null);
    try {
      await createDrafts.mutateAsync({
        data: {
          goal,
          mealTime,
          maxPrepMinutes,
          availableIngredients: ingredients
            .split(/[,\n]/u)
            .map((value) => value.trim())
            .filter(Boolean)
            .slice(0, 20),
          notes: notes.trim().slice(0, 300),
        },
      });
    } catch (caught) {
      if (timeZone.reject(caught)) return;
      setError(
        "CUT couldn't create meal ideas right now. Your food library and saved foods are still available.",
      );
    }
  };

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[
        s.content,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 36 },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={s.nav}>
        <Pressable
          accessibilityLabel="Close personalized meal maker"
          accessibilityRole="button"
          style={s.navButton}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={24} color={c.foreground} />
        </Pressable>
        <View style={s.proPill}>
          <Ionicons name="sparkles" size={13} color={c.primary} />
          <Text style={s.proPillText}>CUT OS PRO</Text>
        </View>
        <View style={s.navButton} />
      </View>

      <Text accessibilityRole="header" style={s.title}>
        Make me a meal
      </Text>
      <Text style={s.subtitle}>
        Tell CUT what fits right now. You&apos;ll review every ingredient,
        amount, and nutrition estimate before logging.
      </Text>

      {!subscription.isEntitled ? (
        <View style={s.lockedCard}>
          <View style={s.lockedIcon}>
            <Ionicons name="sparkles" size={24} color={c.primary} />
          </View>
          <View style={s.flex}>
            <Text style={s.cardTitle}>Personal meal creation is Pro</Text>
            <Text style={s.cardBody}>
              Free food search, Desi meal ideas, barcode scanning, manual logs,
              and saved foods stay free.
            </Text>
          </View>
        </View>
      ) : null}

      <FieldLabel>What should it optimize for?</FieldLabel>
      <View style={s.chipRow}>
        {GOALS.map((item) => (
          <Chip
            key={item.value}
            label={item.label}
            selected={goal === item.value}
            onPress={() => setGoal(item.value)}
          />
        ))}
      </View>

      <FieldLabel>Meal</FieldLabel>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.horizontalChips}
      >
        {TIMES.map((item) => (
          <Chip
            key={item.value}
            label={item.label}
            selected={mealTime === item.value}
            onPress={() => setMealTime(item.value)}
          />
        ))}
      </ScrollView>

      <View style={s.prepRow}>
        <View style={s.flex}>
          <FieldLabel>Max prep time</FieldLabel>
          <Text style={s.helper}>Keep the plan realistic.</Text>
        </View>
        <View style={s.stepper}>
          <Pressable
            accessibilityLabel="Reduce prep time"
            accessibilityRole="button"
            disabled={maxPrepMinutes <= 5}
            style={s.stepButton}
            onPress={() => setMaxPrepMinutes((value) => Math.max(5, value - 5))}
          >
            <Ionicons name="remove" size={20} color={c.primary} />
          </Pressable>
          <Text style={s.stepValue}>{maxPrepMinutes} min</Text>
          <Pressable
            accessibilityLabel="Increase prep time"
            accessibilityRole="button"
            disabled={maxPrepMinutes >= 120}
            style={s.stepButton}
            onPress={() =>
              setMaxPrepMinutes((value) => Math.min(120, value + 5))
            }
          >
            <Ionicons name="add" size={20} color={c.primary} />
          </Pressable>
        </View>
      </View>

      <FieldLabel>What do you have? (optional)</FieldLabel>
      <TextInput
        accessibilityLabel="Available ingredients"
        autoCapitalize="sentences"
        placeholder="Chicken, rice, spinach…"
        placeholderTextColor={c.mutedForeground}
        style={s.input}
        value={ingredients}
        onChangeText={setIngredients}
      />

      <FieldLabel>Anything else? (optional)</FieldLabel>
      <TextInput
        accessibilityLabel="Meal notes"
        maxLength={300}
        multiline
        placeholder="Example: mild spice, one pan, use leftovers"
        placeholderTextColor={c.mutedForeground}
        style={[s.input, s.notes]}
        textAlignVertical="top"
        value={notes}
        onChangeText={setNotes}
      />
      <Text style={s.privacyCopy}>
        CUT sends only this request and the minimum enabled food preferences,
        confirmed meals, and targets. Never your email or birth date.
      </Text>

      {error ? (
        <View style={s.errorCard}>
          <Text accessibilityRole="alert" style={s.errorText}>
            {error}
          </Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={createDrafts.isPending}
        style={({ pressed }) => [
          s.primaryButton,
          createDrafts.isPending && s.disabled,
          pressed && s.pressed,
        ]}
        onPress={() => void submit()}
      >
        {createDrafts.isPending ? (
          <ActivityIndicator color={c.primaryForeground} />
        ) : (
          <>
            <Ionicons name="sparkles" size={20} color={c.primaryForeground} />
            <Text style={s.primaryButtonText}>
              {subscription.isEntitled
                ? "Create my meal ideas"
                : "Unlock meal creation"}
            </Text>
          </>
        )}
      </Pressable>

      {createDrafts.data ? (
        <View style={s.results}>
          <View style={s.resultsHeader}>
            <View style={s.flex}>
              <Text style={s.resultsTitle}>Your meal ideas</Text>
              <Text style={s.resultsMeta}>{createDrafts.data.notice}</Text>
            </View>
            <Text style={s.sourceBadge}>
              {createDrafts.data.source === "ai" ? "AI DRAFT" : "CURATED"}
            </Text>
          </View>
          {createDrafts.data.drafts.map((draft) => (
            <DraftCard key={draft.id} draft={draft} />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );

  function FieldLabel({ children }: { children: React.ReactNode }) {
    return <Text style={s.fieldLabel}>{children}</Text>;
  }

  function Chip({
    label,
    selected,
    onPress,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        style={({ pressed }) => [
          s.chip,
          selected && s.chipSelected,
          pressed && s.pressed,
        ]}
        onPress={onPress}
      >
        <Text style={[s.chipText, selected && s.chipTextSelected]}>
          {label}
        </Text>
      </Pressable>
    );
  }

  function DraftCard({ draft }: { draft: MealDraft }) {
    const [expanded, setExpanded] = React.useState(false);
    const review = () => {
      router.push({
        pathname: "/food-entry",
        params: {
          mode: "manual",
          source: "manual",
          sourceRef: draft.id,
          name: draft.name,
          serving: draft.servingDescription,
          calories: String(draft.caloriesKcal),
          protein: String(draft.proteinG),
          carbs: String(draft.carbsG),
          fat: String(draft.fatG),
          fiber: String(draft.fiberG),
        },
      });
    };
    return (
      <View style={s.draftCard}>
        <View style={s.draftTop}>
          <View style={s.flex}>
            <Text style={s.draftTitle}>{draft.name}</Text>
            <Text style={s.draftSummary}>{draft.summary}</Text>
          </View>
          <View style={s.timePill}>
            <Ionicons name="time-outline" size={14} color={c.mutedForeground} />
            <Text style={s.timeText}>{draft.estimatedPrepMinutes}m</Text>
          </View>
        </View>
        <View style={s.macroRow}>
          <Macro value={number(draft.caloriesKcal)} label="cal" />
          <Macro value={number(draft.proteinG)} label="protein" />
          <Macro value={number(draft.carbsG)} label="carbs" />
          <Macro value={number(draft.fatG)} label="fat" />
        </View>
        <Text style={s.fitReason}>{draft.whyItFits}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          style={s.detailToggle}
          onPress={() => setExpanded((value) => !value)}
        >
          <Text style={s.detailToggleText}>
            {expanded ? "Hide recipe" : "Ingredients & steps"}
          </Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={c.primary}
          />
        </Pressable>
        {expanded ? (
          <View style={s.recipe}>
            <Text style={s.recipeLabel}>INGREDIENTS</Text>
            {draft.ingredients.map((ingredient) => (
              <Text key={ingredient} style={s.recipeLine}>
                • {ingredient}
              </Text>
            ))}
            <Text style={[s.recipeLabel, s.stepsLabel]}>STEPS</Text>
            {draft.instructions.map((instruction, index) => (
              <Text key={`${index}-${instruction}`} style={s.recipeLine}>
                {index + 1}. {instruction}
              </Text>
            ))}
            {draft.allergens.length > 0 ? (
              <Text style={s.allergenText}>
                Common allergens: {draft.allergens.join(", ")}. Verify your own
                ingredients and labels.
              </Text>
            ) : null}
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [s.reviewButton, pressed && s.pressed]}
          onPress={review}
        >
          <Text style={s.reviewButtonText}>Review & log</Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color={c.primaryForeground}
          />
        </Pressable>
      </View>
    );
  }

  function Macro({ value, label }: { value: string; label: string }) {
    return (
      <View style={s.macro}>
        <Text style={s.macroValue}>{value}</Text>
        <Text style={s.macroLabel}>{label}</Text>
      </View>
    );
  }
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 16 },
    nav: {
      minHeight: 52,
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
    proPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      borderRadius: 999,
      backgroundColor: c.secondary,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    proPillText: {
      color: c.primary,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 0.8,
    },
    title: {
      color: c.foreground,
      fontSize: 34,
      lineHeight: 40,
      fontWeight: "800",
      letterSpacing: -1,
      marginTop: 10,
    },
    subtitle: {
      color: c.mutedForeground,
      fontSize: 15,
      lineHeight: 22,
      marginTop: 8,
      marginBottom: 18,
    },
    lockedCard: {
      flexDirection: "row",
      gap: 12,
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: 16,
      backgroundColor: c.card,
      padding: 14,
      marginBottom: 4,
    },
    lockedIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: c.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    cardTitle: { color: c.foreground, fontSize: 15, fontWeight: "800" },
    cardBody: {
      color: c.mutedForeground,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 3,
    },
    flex: { flex: 1 },
    fieldLabel: {
      color: c.foreground,
      fontSize: 14,
      fontWeight: "700",
      marginTop: 20,
      marginBottom: 9,
    },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    horizontalChips: { gap: 8, paddingRight: 16 },
    chip: {
      minHeight: 42,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      paddingHorizontal: 15,
      alignItems: "center",
      justifyContent: "center",
    },
    chipSelected: { borderColor: c.primary, backgroundColor: c.primary },
    chipText: { color: c.foreground, fontSize: 13, fontWeight: "700" },
    chipTextSelected: { color: c.primaryForeground },
    prepRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 12,
      marginTop: 2,
    },
    helper: { color: c.mutedForeground, fontSize: 12, marginBottom: 4 },
    stepper: {
      height: 46,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 13,
      backgroundColor: c.card,
    },
    stepButton: {
      width: 42,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    stepValue: {
      minWidth: 54,
      textAlign: "center",
      color: c.foreground,
      fontSize: 13,
      fontWeight: "800",
    },
    input: {
      minHeight: 50,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 14,
      backgroundColor: c.input,
      color: c.foreground,
      fontSize: 15,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    notes: { minHeight: 92 },
    privacyCopy: {
      color: c.mutedForeground,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 9,
    },
    errorCard: {
      borderRadius: 12,
      backgroundColor: c.secondary,
      padding: 12,
      marginTop: 14,
    },
    errorText: { color: c.destructive, fontSize: 13, lineHeight: 18 },
    primaryButton: {
      minHeight: 56,
      borderRadius: 15,
      backgroundColor: c.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
      marginTop: 20,
    },
    primaryButtonText: {
      color: c.primaryForeground,
      fontSize: 16,
      fontWeight: "800",
    },
    disabled: { opacity: 0.55 },
    pressed: { opacity: 0.72 },
    results: { marginTop: 32 },
    resultsHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 12,
    },
    resultsTitle: { color: c.foreground, fontSize: 24, fontWeight: "800" },
    resultsMeta: {
      color: c.mutedForeground,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 4,
    },
    sourceBadge: {
      color: c.primary,
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 0.7,
      marginTop: 5,
    },
    draftCard: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 18,
      backgroundColor: c.card,
      padding: 16,
      marginBottom: 12,
    },
    draftTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    draftTitle: { color: c.foreground, fontSize: 19, fontWeight: "800" },
    draftSummary: {
      color: c.mutedForeground,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 4,
    },
    timePill: {
      flexDirection: "row",
      gap: 4,
      alignItems: "center",
      backgroundColor: c.secondary,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    timeText: { color: c.mutedForeground, fontSize: 11, fontWeight: "700" },
    macroRow: { flexDirection: "row", gap: 7, marginTop: 15 },
    macro: {
      flex: 1,
      borderRadius: 11,
      backgroundColor: c.secondary,
      alignItems: "center",
      paddingVertical: 8,
    },
    macroValue: { color: c.foreground, fontSize: 14, fontWeight: "800" },
    macroLabel: { color: c.mutedForeground, fontSize: 9, marginTop: 1 },
    fitReason: {
      color: c.mutedForeground,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 13,
    },
    detailToggle: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 6,
    },
    detailToggleText: { color: c.primary, fontSize: 13, fontWeight: "800" },
    recipe: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      paddingTop: 12,
      paddingBottom: 4,
    },
    recipeLabel: {
      color: c.mutedForeground,
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    stepsLabel: { marginTop: 14 },
    recipeLine: { color: c.foreground, fontSize: 12, lineHeight: 18 },
    allergenText: {
      color: c.destructive,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 12,
    },
    reviewButton: {
      minHeight: 48,
      borderRadius: 13,
      backgroundColor: c.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 12,
    },
    reviewButtonText: {
      color: c.primaryForeground,
      fontSize: 14,
      fontWeight: "800",
    },
  });
}
