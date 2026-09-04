import { useAuth, useSession } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import {
  createMyMealEntry as createMyMealEntryRequest,
  getGetTodayMealsQueryKey,
  getGetTodayQueryKey,
  getListMyMealOptionsQueryKey,
  useDeleteMyMealEntry,
  useGetTodayMeals,
  useListMyMealOptions,
  useUpdateMyMealEntry,
  type MealEntry,
  type MealOption,
} from "@workspace/api-client-react";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import {
  dailyDeviceTimeZoneQueryKey,
  DEVICE_TIME_ZONE_HEADER,
  useDeviceTimeZoneGate,
} from "@/lib/device-time-zone-gate";
import {
  createPendingMealIntent,
  executeOwnedMealCreate,
  MealCreatePrincipalChangedError,
  parsePendingMealIntent,
  pendingMealCreateKey,
  serializePendingMealIntent,
  type PendingMealCreateIntent,
} from "@/lib/meal-create-intent";
import {
  MAX_MEAL_SERVINGS,
  MEAL_SERVING_STEP,
  MIN_MEAL_SERVINGS,
  clampMealServings,
  formatMealServings,
  isMealCreatePreconditionFailed,
  scaleMealNutrition,
  type MealNutrition,
} from "@/lib/meal-form";
import { resolveMealScreenState } from "@/lib/meal-screen-state";

function nutritionFromOption(option: MealOption): MealNutrition {
  return {
    caloriesKcal: option.caloriesKcal,
    proteinG: option.proteinG,
    carbsG: option.carbsG,
    fatG: option.fatG,
    fiberG: option.fiberG,
  };
}

function compactNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function nutritionAccessibilityLabel(nutrition: MealNutrition): string {
  return `${compactNumber(nutrition.caloriesKcal)} calories, ${compactNumber(nutrition.proteinG)} grams protein, ${compactNumber(nutrition.carbsG)} grams carbohydrates, ${compactNumber(nutrition.fatG)} grams fat, and ${compactNumber(nutrition.fiberG)} grams fiber`;
}

export default function MealOneScreen() {
  const { userId, sessionId } = useAuth();
  const { session } = useSession();
  const router = useRouter();
  const params = useLocalSearchParams<{
    mealTemplateId?: string;
    servings?: string;
  }>();
  const qc = useQueryClient();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const s = makeStyles(c);
  const dailyTimeZone = useDeviceTimeZoneGate();

  const optionsQuery = useListMyMealOptions();
  const mealsQuery = useGetTodayMeals({
    query: {
      queryKey: dailyDeviceTimeZoneQueryKey(
        getGetTodayMealsQueryKey(),
        dailyTimeZone,
      ),
      // Refresh the authoritative day while this screen remains foregrounded.
      refetchInterval: 60_000,
    },
    request: dailyTimeZone.request,
  });
  const updateMeal = useUpdateMyMealEntry();
  const deleteMeal = useDeleteMyMealEntry();

  const [selectedId, setSelectedId] = React.useState<string | null>(() =>
    typeof params.mealTemplateId === "string" ? params.mealTemplateId : null,
  );
  const [servings, setServings] = React.useState(() => {
    const suggested = Number(params.servings);
    return Number.isFinite(suggested) ? clampMealServings(suggested) : 1;
  });
  const [editingEntryId, setEditingEntryId] = React.useState<string | null>(
    null,
  );
  const [editingServings, setEditingServings] = React.useState(1);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [recoveryNotice, setRecoveryNotice] = React.useState<string | null>(
    null,
  );
  const [pendingIntent, setPendingIntent] =
    React.useState<PendingMealCreateIntent | null>(null);
  const [intentReadyOwner, setIntentReadyOwner] = React.useState<string | null>(
    null,
  );
  const [intentLoadError, setIntentLoadError] = React.useState<string | null>(
    null,
  );
  const [intentRetry, setIntentRetry] = React.useState(0);
  const [createBusy, setCreateBusy] = React.useState(false);
  const createRequestId = React.useRef<string | null>(null);
  const mutationLock = React.useRef(false);
  const reconciledRequestId = React.useRef<string | null>(null);
  const mounted = React.useRef(true);
  const currentPrincipal = React.useRef({
    userId: userId ?? null,
    sessionId: sessionId ?? null,
  });
  currentPrincipal.current = {
    userId: userId ?? null,
    sessionId: sessionId ?? null,
  };

  React.useEffect(() => {
    if (mealsQuery.error) dailyTimeZone.reject(mealsQuery.error);
  }, [dailyTimeZone, mealsQuery.error]);

  const catalogOptions = optionsQuery.data ?? [];
  const loggedMeals = mealsQuery.data?.entries ?? [];
  const screenState = resolveMealScreenState({
    hasPendingIntent: pendingIntent !== null,
    mealsLoading: mealsQuery.isLoading,
    mealsError: mealsQuery.isError,
    catalogLoading: optionsQuery.isLoading,
    catalogError: optionsQuery.isError,
    optionCount: catalogOptions.length,
    hasLoggedMeals: loggedMeals.length > 0,
  });
  const options = screenState.catalogState === "ready" ? catalogOptions : [];
  const selectedOption = options.find((option) => option.id === selectedId);
  const preview = selectedOption
    ? scaleMealNutrition(nutritionFromOption(selectedOption), servings)
    : null;
  const busy = createBusy || updateMeal.isPending || deleteMeal.isPending;
  const recoveryLocked = pendingIntent !== null;

  React.useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  React.useEffect(() => {
    setCreateBusy(false);
    mutationLock.current = false;
    createRequestId.current = null;
    reconciledRequestId.current = null;
    setPendingIntent(null);
    setRecoveryNotice(null);
    setIntentLoadError(null);
    setIntentReadyOwner(null);
    if (!userId) return;

    let active = true;
    void SecureStore.getItemAsync(pendingMealCreateKey(userId))
      .then((storedValue) => parsePendingMealIntent(storedValue, userId))
      .then((intent) => {
        if (!active) return;
        setPendingIntent(intent);
        if (intent) {
          createRequestId.current = intent.clientRequestId;
          setSelectedId(intent.mealTemplateId);
          setServings(intent.servings);
          setRecoveryNotice(
            "A previous meal log may already be saved. Verify it before changing or adding another meal.",
          );
        }
        setIntentReadyOwner(userId);
      })
      .catch(() => {
        if (!active) return;
        setIntentLoadError(
          "CUT OS couldn't safely check for an unfinished meal log on this device. No new meal was sent.",
        );
        setIntentReadyOwner(userId);
      });

    return () => {
      active = false;
    };
  }, [intentRetry, userId]);

  // A response can be lost after the server commits. Reconcile the durable
  // client request ID against today's authoritative entries before asking the
  // user to send anything again.
  React.useEffect(() => {
    if (
      !userId ||
      dailyTimeZone.ownerClerkUserId !== userId ||
      !pendingIntent ||
      reconciledRequestId.current === pendingIntent.clientRequestId ||
      !mealsQuery.data?.entries.some(
        (entry) => entry.clientRequestId === pendingIntent.clientRequestId,
      )
    ) {
      return;
    }

    const requestId = pendingIntent.clientRequestId;
    reconciledRequestId.current = requestId;
    let active = true;
    void SecureStore.deleteItemAsync(pendingMealCreateKey(userId))
      .then(() => {
        if (!active) return;
        createRequestId.current = null;
        setPendingIntent(null);
        setRecoveryNotice(
          "Your previous meal was already logged. Review today’s totals before adding another.",
        );
      })
      .catch(() => {
        if (!active) return;
        setActionError(
          "Your previous meal is saved, but CUT OS couldn't clear its device recovery checkpoint. Retry verification before logging another meal.",
        );
      });

    return () => {
      active = false;
    };
  }, [
    dailyTimeZone.ownerClerkUserId,
    mealsQuery.data?.entries,
    pendingIntent,
    userId,
  ]);

  React.useEffect(() => {
    setSelectedId((current) => {
      if (current && options.some((option) => option.id === current)) {
        return current;
      }
      return options[0]?.id ?? null;
    });
  }, [options]);

  const refreshMealState = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: getGetTodayQueryKey() }),
      qc.invalidateQueries({ queryKey: getGetTodayMealsQueryKey() }),
      qc.invalidateQueries({ queryKey: getListMyMealOptionsQueryKey() }),
    ]);
  };

  const selectOption = (id: string) => {
    if (busy || recoveryLocked) return;
    setSelectedId(id);
    setServings(1);
    setActionError(null);
    createRequestId.current = null;
    void Haptics.selectionAsync().catch(() => undefined);
  };

  const adjustNewMealServings = (delta: number) => {
    if (busy || recoveryLocked) return;
    setServings((current) => clampMealServings(current + delta));
    setActionError(null);
    // A changed payload needs a fresh idempotency key. A plain retry keeps it.
    createRequestId.current = null;
  };

  const handleCreate = async () => {
    if (
      !userId ||
      dailyTimeZone.ownerClerkUserId !== userId ||
      !sessionId ||
      !session ||
      session.id !== sessionId ||
      session.user?.id !== userId ||
      (!pendingIntent && (!selectedOption || !mealsQuery.data?.dayKey)) ||
      busy ||
      mutationLock.current ||
      intentReadyOwner !== userId ||
      intentLoadError
    ) {
      return;
    }

    const ownerUserId = userId;
    const ownerSessionId = sessionId;
    const ownerSession = session;
    const isCurrentPrincipal = () =>
      mounted.current &&
      currentPrincipal.current.userId === ownerUserId &&
      currentPrincipal.current.sessionId === ownerSessionId;
    const intent =
      pendingIntent ??
      createPendingMealIntent({
        ownerClerkUserId: ownerUserId,
        clientRequestId: createRequestId.current ?? Crypto.randomUUID(),
        catalogVersion: selectedOption!.catalogVersion,
        dayKey: mealsQuery.data!.dayKey,
        mealTemplateId: selectedOption!.id,
        mealName: selectedOption!.name,
        servings,
        createdAt: new Date().toISOString(),
      });

    mutationLock.current = true;
    setCreateBusy(true);
    setActionError(null);
    let intentPersisted = pendingIntent !== null;
    let requestStarted = false;

    try {
      await executeOwnedMealCreate({
        ownerUserId,
        ownerSessionId,
        currentPrincipal: () => currentPrincipal.current,
        getToken: () =>
          tokenWithinTimeout(() => ownerSession.getToken({ skipCache: true })),
        persistIntent: async () => {
          await SecureStore.setItemAsync(
            pendingMealCreateKey(ownerUserId),
            serializePendingMealIntent(intent),
          );
          intentPersisted = true;
        },
        sendRequest: async (token) => {
          requestStarted = true;
          return createMyMealEntryRequest(
            {
              clientRequestId: intent.clientRequestId,
              catalogVersion: intent.catalogVersion,
              dayKey: intent.dayKey,
              mealTemplateId: intent.mealTemplateId,
              servings: intent.servings,
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                [DEVICE_TIME_ZONE_HEADER]: dailyTimeZone.timeZone,
              },
            },
          );
        },
      });

      if (!isCurrentPrincipal()) return;
      createRequestId.current = null;
      const markerCleared = await SecureStore.deleteItemAsync(
        pendingMealCreateKey(ownerUserId),
      )
        .then(() => true)
        .catch(() => false);
      if (!isCurrentPrincipal()) return;
      if (markerCleared) {
        setPendingIntent(null);
        setRecoveryNotice(null);
      }
      // The write is already confirmed. Cache refresh and haptics are
      // best-effort UI work and must never turn a saved meal into an error.
      await refreshMealState().catch(() => undefined);
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => undefined);
      router.replace("/today");
    } catch (error) {
      if (
        error instanceof MealCreatePrincipalChangedError ||
        !isCurrentPrincipal()
      ) {
        return;
      }

      if (dailyTimeZone.reject(error)) return;

      if (isMealCreatePreconditionFailed(error)) {
        // The selected snapshot is no longer current. Never auto-submit
        // changed nutrition/day. A 412 is returned before insertion for this
        // server version, so reconcile once more before clearing the intent.
        const refreshed = await mealsQuery.refetch().catch(() => undefined);
        if (!isCurrentPrincipal()) return;
        const committed = refreshed?.data?.entries.some(
          (entry) => entry.clientRequestId === intent.clientRequestId,
        );
        if (committed) {
          await SecureStore.deleteItemAsync(
            pendingMealCreateKey(ownerUserId),
          ).catch(() => undefined);
          if (!isCurrentPrincipal()) return;
          createRequestId.current = null;
          setPendingIntent(null);
          setRecoveryNotice(
            "Your previous meal was already logged. Review today’s totals before adding another.",
          );
          return;
        }

        const markerCleared = await SecureStore.deleteItemAsync(
          pendingMealCreateKey(ownerUserId),
        )
          .then(() => true)
          .catch(() => false);
        if (!isCurrentPrincipal()) return;
        if (markerCleared) {
          createRequestId.current = null;
          setPendingIntent(null);
          setRecoveryNotice(null);
        }
        await optionsQuery.refetch().catch(() => undefined);
        if (!isCurrentPrincipal()) return;
        setActionError(
          markerCleared
            ? "The saved meal request is no longer active. Review today’s meals and the latest options before logging again. CUT OS did not create a new meal from this retry."
            : "The saved meal request is no longer active, but CUT OS couldn't clear its device checkpoint. Retry verification before logging again.",
        );
        return;
      }

      if (intentPersisted) {
        createRequestId.current = intent.clientRequestId;
        setPendingIntent(intent);
        setRecoveryNotice(
          "This exact meal request is saved on this device until the server confirms it.",
        );
      }
      if (requestStarted) void mealsQuery.refetch();
      setActionError(
        requestStarted
          ? "CUT OS couldn't confirm whether this meal was saved. Retry safely—the exact same request is preserved and cannot create a duplicate."
          : "No meal was sent because CUT OS couldn't secure this request. Retry when your session and device storage are available.",
      );
    } finally {
      mutationLock.current = false;
      if (isCurrentPrincipal()) setCreateBusy(false);
    }
  };

  const beginEdit = (entry: MealEntry) => {
    if (busy || recoveryLocked) return;
    setEditingEntryId(entry.id);
    setEditingServings(entry.servings);
    setActionError(null);
  };

  const handleUpdate = async (entry: MealEntry) => {
    if (busy || recoveryLocked || mutationLock.current) return;
    mutationLock.current = true;
    setActionError(null);
    try {
      await updateMeal.mutateAsync({
        mealEntryId: entry.id,
        data: { servings: editingServings },
      });
      await refreshMealState().catch(() => undefined);
      setEditingEntryId(null);
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => undefined);
    } catch {
      setActionError(
        "Couldn't update this meal. Your serving change is still here—retry when you're ready.",
      );
    } finally {
      mutationLock.current = false;
    }
  };

  const handleDelete = async (entry: MealEntry) => {
    if (busy || recoveryLocked || mutationLock.current) return;
    mutationLock.current = true;
    setActionError(null);
    try {
      await deleteMeal.mutateAsync({ mealEntryId: entry.id });
      await refreshMealState().catch(() => undefined);
      if (editingEntryId === entry.id) setEditingEntryId(null);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
        () => undefined,
      );
    } catch {
      setActionError("Couldn't delete this meal. Nothing was removed.");
    } finally {
      mutationLock.current = false;
    }
  };

  const confirmDelete = (entry: MealEntry) => {
    if (busy || recoveryLocked) return;
    Alert.alert(
      "Delete this meal?",
      `Remove ${entry.name} from today's nutrition totals?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void handleDelete(entry),
        },
      ],
    );
  };

  const retryMeals = () => {
    void mealsQuery.refetch();
  };

  if (!userId || intentReadyOwner !== userId) {
    return (
      <View
        style={[
          s.centered,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <ActivityIndicator color={c.primary} />
        <Text style={s.loadingText}>Checking unfinished meal logs…</Text>
      </View>
    );
  }

  if (intentLoadError) {
    return (
      <View
        style={[
          s.centered,
          s.centeredPad,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <Text accessibilityRole="header" style={s.title}>
          Meal check needed
        </Text>
        <Text accessibilityRole="alert" style={s.subtitle}>
          {intentLoadError}
        </Text>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [s.button, pressed && s.buttonPressed]}
          onPress={() => setIntentRetry((value) => value + 1)}
        >
          <Text style={s.buttonText}>Retry safe meal check</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Today"
          style={s.secondaryButton}
          onPress={() => router.back()}
        >
          <Text style={s.secondaryButtonText}>Back to Today</Text>
        </Pressable>
      </View>
    );
  }

  if (screenState.blockingState === "loading") {
    return (
      <View
        style={[
          s.centered,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <ActivityIndicator color={c.primary} />
        <Text style={s.loadingText}>Loading today&apos;s meals…</Text>
      </View>
    );
  }

  if (screenState.blockingState === "error") {
    return (
      <View
        style={[
          s.centered,
          s.centeredPad,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <Text accessibilityRole="header" style={s.title}>
          Couldn&apos;t load meals
        </Text>
        <Text style={s.subtitle}>
          Check your connection and try again. Nothing has been changed.
        </Text>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [s.button, pressed && s.buttonPressed]}
          onPress={retryMeals}
        >
          <Text style={s.buttonText}>Retry</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Today"
          style={s.secondaryButton}
          onPress={() => router.back()}
        >
          <Text style={s.secondaryButtonText}>Back to Today</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.flex}
      contentContainerStyle={[
        s.container,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
      ]}
    >
      <View style={s.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Today"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          hitSlop={8}
          style={({ pressed }) => [
            s.backButton,
            busy && s.controlDisabled,
            pressed && !busy && s.buttonPressed,
          ]}
          onPress={() => router.back()}
        >
          <Text style={s.backButtonText}>‹</Text>
        </Pressable>
        <Text style={s.headerContext}>TODAY</Text>
      </View>

      <Text accessibilityRole="header" style={s.title}>
        {pendingIntent
          ? "Verify your previous meal"
          : loggedMeals.length > 0
            ? "Review today’s meals"
            : "Build your first balanced meal"}
      </Text>
      <Text style={s.subtitle}>
        {pendingIntent
          ? "Finish this safe recovery check before changing or adding meals."
          : loggedMeals.length > 0
            ? "Review what you’ve logged, add another option, or return to today’s totals."
            : "Choose a fixed recipe and review its ingredients, portions, and estimates before logging."}
      </Text>

      {recoveryNotice && !pendingIntent ? (
        <View style={s.recoveryCard}>
          <Text accessibilityLiveRegion="polite" style={s.recoveryText}>
            {recoveryNotice}
          </Text>
        </View>
      ) : null}

      {actionError ? (
        <View style={s.errorCard}>
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            style={s.errorText}
          >
            {actionError}
          </Text>
        </View>
      ) : null}

      {pendingIntent ? (
        <View style={[s.optionCard, s.recoveryReviewCard]}>
          <Text style={s.recoveryOverline}>SAFE MEAL RECOVERY</Text>
          <Text accessibilityRole="header" style={s.cardTitle}>
            Verify previous meal log
          </Text>
          <Text style={s.cardDescription}>
            CUT OS will verify the exact saved request before you change or add
            another meal.
          </Text>
          <Text style={s.recoveryPayload}>
            {pendingIntent.mealName} ·{" "}
            {formatMealServings(pendingIntent.servings)} ·{" "}
            {pendingIntent.dayKey}
          </Text>
          <Text style={s.estimateDisclosure}>
            The saved catalog version is replayed only for idempotent recovery;
            current estimates are hidden until this check finishes.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              "Verify previous log for " +
              pendingIntent.mealName +
              ", " +
              formatMealServings(pendingIntent.servings) +
              ", " +
              pendingIntent.dayKey
            }
            accessibilityState={{ disabled: busy, busy: createBusy }}
            disabled={busy}
            style={({ pressed }) => [
              s.button,
              busy && s.controlDisabled,
              pressed && !busy && s.buttonPressed,
            ]}
            onPress={() => void handleCreate()}
          >
            {createBusy ? (
              <View style={s.savingRow}>
                <ActivityIndicator color={c.primaryForeground} />
                <Text style={s.buttonText}>Verifying meal…</Text>
              </View>
            ) : (
              <Text style={s.buttonText}>Verify previous meal log</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {screenState.showLoggedMeals ? (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Logged today</Text>
          <Text style={s.sectionDetail}>
            {compactNumber(mealsQuery.data!.totals.caloriesKcal)} kcal ·{" "}
            {compactNumber(mealsQuery.data!.totals.proteinG)}g protein total
          </Text>
          {loggedMeals.map((entry) => {
            const editing = editingEntryId === entry.id;
            return (
              <View key={entry.id} style={s.loggedCard}>
                <Text style={s.successLabel}>MEAL LOGGED</Text>
                <Text style={s.cardTitle}>{entry.name}</Text>
                <Text style={s.servingDescription}>
                  {formatMealServings(entry.servings)} ·{" "}
                  {entry.servingDescription}
                </Text>
                <Text style={s.loggedMacros}>
                  {compactNumber(entry.caloriesKcal)} kcal ·{" "}
                  {compactNumber(entry.proteinG)}g protein
                </Text>

                {editing ? (
                  <View style={s.editArea}>
                    <ServingStepper
                      label="Logged servings"
                      value={editingServings}
                      disabled={busy || recoveryLocked}
                      onDecrease={() =>
                        setEditingServings((current) =>
                          clampMealServings(current - MEAL_SERVING_STEP),
                        )
                      }
                      onIncrease={() =>
                        setEditingServings((current) =>
                          clampMealServings(current + MEAL_SERVING_STEP),
                        )
                      }
                      c={c}
                      s={s}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{
                        disabled: busy || recoveryLocked,
                        busy,
                      }}
                      disabled={busy || recoveryLocked}
                      style={({ pressed }) => [
                        s.button,
                        (busy || recoveryLocked) && s.controlDisabled,
                        pressed && !busy && !recoveryLocked && s.buttonPressed,
                      ]}
                      onPress={() => void handleUpdate(entry)}
                    >
                      {updateMeal.isPending ? (
                        <ActivityIndicator color={c.primaryForeground} />
                      ) : (
                        <Text style={s.buttonText}>Save serving</Text>
                      )}
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{
                        disabled: busy || recoveryLocked,
                      }}
                      disabled={busy || recoveryLocked}
                      style={[
                        s.secondaryButton,
                        (busy || recoveryLocked) && s.controlDisabled,
                      ]}
                      onPress={() => {
                        setEditingEntryId(null);
                        setActionError(null);
                      }}
                    >
                      <Text style={s.secondaryButtonText}>Cancel</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={s.loggedActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Adjust servings for ${entry.name}`}
                      accessibilityState={{
                        disabled: busy || recoveryLocked,
                      }}
                      disabled={busy || recoveryLocked}
                      style={[
                        s.loggedAction,
                        (busy || recoveryLocked) && s.controlDisabled,
                      ]}
                      onPress={() => beginEdit(entry)}
                    >
                      <Text style={s.secondaryButtonText}>Adjust serving</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${entry.name}`}
                      accessibilityState={{
                        disabled: busy || recoveryLocked,
                      }}
                      disabled={busy || recoveryLocked}
                      style={[
                        s.loggedAction,
                        (busy || recoveryLocked) && s.controlDisabled,
                      ]}
                      onPress={() => confirmDelete(entry)}
                    >
                      <Text style={s.deleteText}>Delete</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ) : null}

      {!recoveryLocked ? (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Balanced options</Text>
          <Text style={s.sectionDetail}>
            Fixed single-serving recipe estimates—not personalized medical or
            allergy advice.
          </Text>
          {screenState.catalogState === "loading" ? (
            <View style={s.catalogStateCard}>
              <ActivityIndicator color={c.primary} />
              <Text accessibilityLiveRegion="polite" style={s.catalogStateText}>
                Loading balanced options… Your logged meals remain available
                above.
              </Text>
            </View>
          ) : screenState.catalogState === "error" ? (
            <View style={[s.catalogStateCard, s.catalogErrorCard]}>
              <Text accessibilityRole="alert" style={s.catalogStateText}>
                CUT OS couldn&apos;t load balanced options. Your logged meals
                remain available above.
              </Text>
              <Pressable
                accessibilityRole="button"
                style={s.catalogRetryButton}
                onPress={() => void optionsQuery.refetch()}
              >
                <Text style={s.secondaryButtonText}>
                  Retry balanced options
                </Text>
              </Pressable>
            </View>
          ) : screenState.catalogState === "empty" ? (
            <View style={s.catalogStateCard}>
              <Text style={s.catalogStateText}>
                No curated meals are available yet. Your logged meals remain
                available above.
              </Text>
              <Pressable
                accessibilityRole="button"
                style={s.catalogRetryButton}
                onPress={() => void optionsQuery.refetch()}
              >
                <Text style={s.secondaryButtonText}>Check for options</Text>
              </Pressable>
            </View>
          ) : (
            <View accessibilityRole="radiogroup" style={s.optionStack}>
              {options.map((option) => {
                const selected = option.id === selectedId;
                const optionNutrition = nutritionFromOption(option);
                const allergenText =
                  option.allergens.length > 0
                    ? `Recipe ingredients include these common allergens: ${option.allergens.join(", ")}. Cross-contact is not assessed; review every ingredient and package label`
                    : "No common allergens are identified from this recipe. This is not an allergen-free or cross-contact claim; review every ingredient and package label";
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected, disabled: busy }}
                    accessibilityLabel={`${option.name}. ${option.cuisine}. ${option.description}. Ingredients: ${option.ingredients.join(", ")}. ${nutritionAccessibilityLabel(optionNutrition)}. ${allergenText}. ${option.fitReason}. Estimated nutrition.`}
                    accessibilityHint="Select this meal"
                    disabled={busy}
                    style={({ pressed }) => [
                      s.optionCard,
                      selected && s.optionCardSelected,
                      busy && s.controlDisabled,
                      pressed && !busy && s.buttonPressed,
                    ]}
                    onPress={() => selectOption(option.id)}
                  >
                    <View style={s.optionHeader}>
                      <View style={s.optionTitleWrap}>
                        <Text style={s.cardTitle}>{option.name}</Text>
                      </View>
                      <View
                        style={[s.radioMark, selected && s.radioMarkSelected]}
                      >
                        {selected ? <Text style={s.checkMark}>✓</Text> : null}
                      </View>
                    </View>
                    <Text style={s.cuisineLabel}>{option.cuisine}</Text>
                    <Text style={s.cardDescription}>{option.description}</Text>
                    <Text style={s.optionMacros}>
                      {compactNumber(option.caloriesKcal)} kcal ·{" "}
                      {compactNumber(option.proteinG)}g protein
                    </Text>
                    <Text style={s.optionDetails}>
                      {compactNumber(option.carbsG)}g carbs ·{" "}
                      {compactNumber(option.fatG)}g fat ·{" "}
                      {compactNumber(option.fiberG)}g fiber
                    </Text>
                    <Text style={s.ingredients}>
                      Per 1× recipe: {option.ingredients.join(", ")}
                    </Text>
                    <Text style={s.allergens}>{allergenText}</Text>
                    <Text style={s.fitReason}>{option.fitReason}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      ) : null}

      {!recoveryLocked &&
      screenState.catalogState === "ready" &&
      selectedOption &&
      preview ? (
        <View style={[s.optionCard, s.reviewCard]}>
          <Text style={s.overline}>YOUR MEAL</Text>
          <Text style={s.cardTitle}>{selectedOption.name}</Text>
          <Text style={s.servingDescription}>
            {selectedOption.servingDescription}
          </Text>

          <ServingStepper
            label="Servings"
            value={servings}
            disabled={busy}
            onDecrease={() => adjustNewMealServings(-MEAL_SERVING_STEP)}
            onIncrease={() => adjustNewMealServings(MEAL_SERVING_STEP)}
            c={c}
            s={s}
          />

          <View
            accessible
            accessibilityLiveRegion="polite"
            accessibilityLabel={`Meal preview, ${formatMealServings(servings)}, ${nutritionAccessibilityLabel(preview)}. Estimated nutrition.`}
            style={s.previewGrid}
          >
            <MacroMetric
              label="Calories"
              value={compactNumber(preview.caloriesKcal)}
              suffix="kcal"
              s={s}
            />
            <MacroMetric
              label="Protein"
              value={compactNumber(preview.proteinG)}
              suffix="g"
              s={s}
            />
            <MacroMetric
              label="Carbs"
              value={compactNumber(preview.carbsG)}
              suffix="g"
              s={s}
            />
            <MacroMetric
              label="Fat"
              value={compactNumber(preview.fatG)}
              suffix="g"
              s={s}
            />
            <MacroMetric
              label="Fiber"
              value={compactNumber(preview.fiberG)}
              suffix="g"
              s={s}
            />
          </View>

          <Text style={s.estimateDisclosure}>
            Estimated nutrition. Review every ingredient and package label;
            cross-contact is not assessed.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Log ${selectedOption.name}`}
            accessibilityState={{ disabled: busy, busy: createBusy }}
            disabled={busy}
            style={({ pressed }) => [
              s.button,
              busy && s.controlDisabled,
              pressed && !busy && s.buttonPressed,
            ]}
            onPress={() => void handleCreate()}
          >
            {createBusy ? (
              <View style={s.savingRow}>
                <ActivityIndicator color={c.primaryForeground} />
                <Text style={s.buttonText}>Logging meal…</Text>
              </View>
            ) : (
              <Text style={s.buttonText}>Log {selectedOption.name}</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

async function tokenWithinTimeout(
  getToken: () => Promise<string | null>,
  timeoutMs = 5_000,
): Promise<string | null> {
  return Promise.race([
    getToken().catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

function ServingStepper({
  label,
  value,
  disabled,
  onDecrease,
  onIncrease,
  c,
  s,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  c: ReturnType<typeof useColors>;
  s: ReturnType<typeof makeStyles>;
}) {
  const atMinimum = value <= MIN_MEAL_SERVINGS;
  const atMaximum = value >= MAX_MEAL_SERVINGS;
  return (
    <View style={s.servingRow}>
      <Text style={s.servingLabel}>{label}</Text>
      <View style={s.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label.toLowerCase()}`}
          accessibilityState={{ disabled: disabled || atMinimum }}
          disabled={disabled || atMinimum}
          hitSlop={4}
          style={({ pressed }) => [
            s.stepperButton,
            (disabled || atMinimum) && s.controlDisabled,
            pressed && !disabled && !atMinimum && s.buttonPressed,
          ]}
          onPress={onDecrease}
        >
          <Text style={[s.stepperSymbol, { color: c.foreground }]}>−</Text>
        </Pressable>
        <Text
          accessibilityLiveRegion="polite"
          accessibilityLabel={`${formatMealServings(value).replace("×", "")} servings`}
          style={s.servingValue}
        >
          {formatMealServings(value)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label.toLowerCase()}`}
          accessibilityState={{ disabled: disabled || atMaximum }}
          disabled={disabled || atMaximum}
          hitSlop={4}
          style={({ pressed }) => [
            s.stepperButton,
            (disabled || atMaximum) && s.controlDisabled,
            pressed && !disabled && !atMaximum && s.buttonPressed,
          ]}
          onPress={onIncrease}
        >
          <Text style={[s.stepperSymbol, { color: c.foreground }]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function MacroMetric({
  label,
  value,
  suffix,
  s,
}: {
  label: string;
  value: string;
  suffix: string;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={s.metric}>
      <Text style={s.metricLabel}>{label}</Text>
      <Text style={s.metricValue}>
        {value}
        <Text style={s.metricSuffix}> {suffix}</Text>
      </Text>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    container: { paddingHorizontal: 24 },
    centered: {
      flex: 1,
      backgroundColor: c.background,
      alignItems: "center",
      justifyContent: "center",
    },
    centeredPad: { paddingHorizontal: 24 },
    loadingText: {
      color: c.mutedForeground,
      fontFamily: "Inter_500Medium",
      fontSize: 15,
      marginTop: 14,
    },
    headerRow: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    backButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 22,
      backgroundColor: c.secondary,
    },
    backButtonText: {
      color: c.foreground,
      fontFamily: "Inter_500Medium",
      fontSize: 34,
      lineHeight: 38,
      marginTop: -2,
    },
    headerContext: {
      color: c.mutedForeground,
      fontFamily: "Inter_700Bold",
      fontSize: 12,
      letterSpacing: 1.4,
      marginLeft: 12,
    },
    title: {
      color: c.foreground,
      fontFamily: "Inter_700Bold",
      fontSize: 30,
      lineHeight: 37,
      textAlign: "left",
    },
    subtitle: {
      color: c.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      lineHeight: 22,
      marginTop: 8,
      marginBottom: 24,
      textAlign: "left",
    },
    section: { marginTop: 8, marginBottom: 22 },
    sectionTitle: {
      color: c.foreground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 20,
    },
    sectionDetail: {
      color: c.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      lineHeight: 20,
      marginTop: 5,
      marginBottom: 12,
    },
    optionStack: { gap: 12 },
    catalogStateCard: {
      minHeight: 96,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.card,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: c.radius,
      padding: 16,
    },
    catalogErrorCard: { borderColor: c.destructive },
    catalogStateText: {
      color: c.cardForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center",
    },
    catalogRetryButton: {
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12,
      marginTop: 8,
    },
    optionCard: {
      backgroundColor: c.card,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: c.radius,
      padding: 18,
    },
    optionCardSelected: { borderColor: c.primary, borderWidth: 2 },
    optionHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    optionTitleWrap: { flex: 1 },
    radioMark: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: c.inputBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    radioMarkSelected: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    checkMark: {
      color: c.primaryForeground,
      fontFamily: "Inter_700Bold",
      fontSize: 14,
    },
    cardTitle: {
      color: c.cardForeground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 18,
      lineHeight: 24,
    },
    cuisineLabel: {
      color: c.primary,
      fontFamily: "Inter_600SemiBold",
      fontSize: 13,
      marginTop: 6,
    },
    cardDescription: {
      color: c.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      lineHeight: 20,
      marginTop: 8,
    },
    optionMacros: {
      color: c.foreground,
      fontFamily: "Inter_700Bold",
      fontSize: 17,
      marginTop: 14,
    },
    optionDetails: {
      color: c.mutedForeground,
      fontFamily: "Inter_500Medium",
      fontSize: 13,
      marginTop: 5,
    },
    ingredients: {
      color: c.foreground,
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      lineHeight: 19,
      marginTop: 12,
    },
    allergens: {
      color: c.warning,
      fontFamily: "Inter_500Medium",
      fontSize: 13,
      lineHeight: 19,
      marginTop: 5,
    },
    fitReason: {
      color: c.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      fontStyle: "italic",
      lineHeight: 19,
      marginTop: 8,
    },
    reviewCard: { borderColor: c.primary, marginBottom: 8 },
    overline: {
      color: c.primary,
      fontFamily: "Inter_700Bold",
      fontSize: 12,
      letterSpacing: 1.4,
      marginBottom: 7,
    },
    servingDescription: {
      color: c.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      lineHeight: 20,
      marginTop: 5,
    },
    servingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      marginTop: 18,
    },
    servingLabel: {
      color: c.foreground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
    },
    stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
    stepperButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.secondary,
      borderColor: c.border,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    stepperSymbol: {
      fontFamily: "Inter_500Medium",
      fontSize: 24,
      lineHeight: 28,
    },
    servingValue: {
      color: c.foreground,
      fontFamily: "Inter_700Bold",
      fontSize: 17,
      minWidth: 50,
      textAlign: "center",
    },
    previewGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      borderTopColor: c.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      marginTop: 18,
      paddingTop: 12,
    },
    metric: { width: "50%", paddingVertical: 7 },
    metricLabel: {
      color: c.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 12,
    },
    metricValue: {
      color: c.foreground,
      fontFamily: "Inter_700Bold",
      fontSize: 20,
      marginTop: 2,
    },
    metricSuffix: {
      color: c.mutedForeground,
      fontFamily: "Inter_500Medium",
      fontSize: 12,
    },
    estimateDisclosure: {
      color: c.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      lineHeight: 18,
      marginTop: 12,
    },
    button: {
      minHeight: 54,
      backgroundColor: c.primary,
      borderRadius: c.radius,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 18,
      paddingVertical: 15,
      marginTop: 16,
      alignSelf: "stretch",
    },
    buttonText: {
      color: c.primaryForeground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 16,
      textAlign: "center",
    },
    buttonPressed: { opacity: 0.84 },
    controlDisabled: { opacity: 0.5 },
    savingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    secondaryButton: {
      minHeight: 44,
      alignSelf: "stretch",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginTop: 8,
    },
    secondaryButtonText: {
      color: c.primary,
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
      textAlign: "center",
    },
    errorCard: {
      backgroundColor: c.card,
      borderColor: c.destructive,
      borderWidth: 1,
      borderRadius: c.radius,
      padding: 14,
      marginBottom: 14,
    },
    errorText: {
      color: c.destructiveText,
      fontFamily: "Inter_500Medium",
      fontSize: 14,
      lineHeight: 20,
    },
    recoveryCard: {
      backgroundColor: c.card,
      borderColor: c.primary,
      borderWidth: 1,
      borderRadius: c.radius,
      padding: 14,
      marginBottom: 14,
    },
    recoveryText: {
      color: c.foreground,
      fontFamily: "Inter_500Medium",
      fontSize: 14,
      lineHeight: 20,
    },
    recoveryReviewCard: {
      borderColor: c.primary,
      borderWidth: 2,
      marginBottom: 18,
    },
    recoveryOverline: {
      color: c.primary,
      fontFamily: "Inter_700Bold",
      fontSize: 11,
      letterSpacing: 1.1,
      marginBottom: 7,
    },
    recoveryPayload: {
      color: c.foreground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
      lineHeight: 20,
      marginTop: 12,
    },
    loggedCard: {
      backgroundColor: c.card,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: c.radius,
      padding: 18,
      marginBottom: 10,
    },
    successLabel: {
      color: c.success,
      fontFamily: "Inter_700Bold",
      fontSize: 11,
      letterSpacing: 1.1,
      marginBottom: 7,
    },
    loggedMacros: {
      color: c.foreground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
      marginTop: 10,
    },
    loggedActions: {
      flexDirection: "row",
      borderTopColor: c.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      marginTop: 14,
      paddingTop: 6,
      gap: 8,
    },
    loggedAction: {
      minHeight: 44,
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 8,
    },
    deleteText: {
      color: c.destructiveText,
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
    },
    editArea: {
      borderTopColor: c.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      marginTop: 14,
      paddingTop: 2,
    },
  });
}
