import { Ionicons } from "@expo/vector-icons";
import { useListMyWeightEntries, useGetMe } from "@workspace/api-client-react";
import { kilogramsToPounds, roundWeight } from "@workspace/domain";
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { CutScreen } from "@/components/CutScreen";
import { useColors } from "@/hooks/useColors";

const RANGES = [7, 30, 90] as const;

export default function ProgressScreen() {
  const c = useColors();
  const s = makeStyles(c);
  const router = useRouter();
  const [range, setRange] = React.useState<(typeof RANGES)[number]>(30);
  const meQuery = useGetMe();
  const weightsQuery = useListMyWeightEntries({ limit: range });
  const units = meQuery.data?.units ?? "metric";
  const unitLabel = units === "imperial" ? "lb" : "kg";
  const values = weightsQuery.data ?? [];
  const newest = values[0];
  const oldest = values.at(-1);
  const changeKg = newest && oldest ? newest.weightKg - oldest.weightKg : null;
  const displayValue = (valueKg: number) =>
    roundWeight(units === "imperial" ? kilogramsToPounds(valueKg) : valueKg).toFixed(1);
  const displayChange =
    changeKg == null
      ? null
      : roundWeight(units === "imperial" ? kilogramsToPounds(changeKg) : changeKg);

  return (
    <CutScreen title="Progress" eyebrow="Trend, not noise">
      <View style={s.rangeControl} accessibilityRole="tablist">
        {RANGES.map((days) => {
          const selected = days === range;
          return (
            <Pressable
              key={days}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={[s.rangeButton, selected && s.rangeSelected]}
              onPress={() => setRange(days)}
            >
              <Text style={[s.rangeLabel, selected && s.rangeLabelSelected]}>{days}D</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={s.heroCard}>
        <View style={s.heroTop}>
          <View>
            <Text style={s.overline}>WEIGHT TREND</Text>
            {newest ? (
              <View style={s.weightLine}>
                <Text style={s.weightValue}>{displayValue(newest.weightKg)}</Text>
                <Text style={s.weightUnit}>{unitLabel}</Text>
              </View>
            ) : (
              <Text style={s.weightValue}>—</Text>
            )}
          </View>
          <View style={[s.trendPill, { backgroundColor: c.secondary }]}>
            <Ionicons
              name={displayChange != null && displayChange > 0 ? "trending-up" : "trending-down"}
              size={17}
              color={c.primary}
            />
            <Text style={s.trendText}>
              {displayChange == null ? "Need 2 logs" : `${displayChange > 0 ? "+" : ""}${displayChange.toFixed(1)} ${unitLabel}`}
            </Text>
          </View>
        </View>

        {weightsQuery.isLoading ? (
          <View style={s.chartState}><ActivityIndicator color={c.primary} /></View>
        ) : weightsQuery.isError ? (
          <View style={s.chartState}>
            <Text style={s.chartMessage}>Couldn&apos;t load weight history.</Text>
            <Pressable accessibilityRole="button" style={s.retry} onPress={() => void weightsQuery.refetch()}>
              <Text style={s.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : values.length === 0 ? (
          <View style={s.chartState}>
            <Ionicons name="analytics-outline" size={30} color={c.mutedForeground} />
            <Text style={s.emptyTitle}>Your trend starts with one weigh-in</Text>
            <Text style={s.chartMessage}>Daily changes are noisy. CUT OS will make the direction easier to see.</Text>
          </View>
        ) : (
          <WeightBars values={values.map((entry) => entry.weightKg).reverse()} />
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [s.primaryButton, pressed && s.pressed]}
        onPress={() => router.push("/today?action=weight")}
      >
        <Ionicons name="add" size={19} color={c.primaryForeground} />
        <Text style={s.primaryButtonText}>Log weight</Text>
      </Pressable>

      <Text style={s.sectionTitle}>Recent weigh-ins</Text>
      <View style={s.listCard}>
        {values.length === 0 ? (
          <View style={s.emptyRow}><Text style={s.chartMessage}>No weight history yet.</Text></View>
        ) : (
          values.slice(0, 8).map((entry, index) => (
            <View key={entry.id} style={[s.historyRow, index > 0 && s.rowDivider]}>
              <Text style={s.historyDate}>{new Date(`${entry.recordedOn}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</Text>
              <Text style={s.historyValue}>{displayValue(entry.weightKg)} {unitLabel}</Text>
            </View>
          ))
        )}
      </View>
    </CutScreen>
  );

  function WeightBars({ values: chartValues }: { values: number[] }) {
    const min = Math.min(...chartValues);
    const max = Math.max(...chartValues);
    const span = Math.max(max - min, 0.5);
    const visible = chartValues.slice(-24);
    return (
      <View accessible accessibilityLabel={`Weight chart with ${visible.length} entries`} style={s.chart}>
        {visible.map((value, index) => (
          <View
            key={`${value}-${index}`}
            style={[
              s.bar,
              {
                height: 28 + ((value - min) / span) * 74,
                backgroundColor: index === visible.length - 1 ? c.primary : c.accent,
              },
            ]}
          />
        ))}
      </View>
    );
  }
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    rangeControl: { height: 42, borderRadius: 12, backgroundColor: c.secondary, flexDirection: "row", padding: 4, marginBottom: 12 },
    rangeButton: { flex: 1, borderRadius: 9, alignItems: "center", justifyContent: "center" },
    rangeSelected: { backgroundColor: c.card },
    rangeLabel: { color: c.mutedForeground, fontSize: 13, fontWeight: "700" },
    rangeLabelSelected: { color: c.foreground },
    heroCard: { backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 20 },
    heroTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
    overline: { color: c.primary, fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
    weightLine: { flexDirection: "row", alignItems: "baseline", marginTop: 5 },
    weightValue: { color: c.foreground, fontSize: 40, lineHeight: 46, letterSpacing: -1.4, fontWeight: "800", fontVariant: ["tabular-nums"] },
    weightUnit: { color: c.mutedForeground, fontSize: 15, fontWeight: "700", marginLeft: 5 },
    trendPill: { minHeight: 36, borderRadius: 18, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11 },
    trendText: { color: c.foreground, fontSize: 12, fontWeight: "700", fontVariant: ["tabular-nums"] },
    chart: { height: 132, flexDirection: "row", alignItems: "flex-end", gap: 4, marginTop: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border, paddingHorizontal: 2 },
    bar: { flex: 1, minWidth: 4, maxWidth: 18, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
    chartState: { minHeight: 132, alignItems: "center", justifyContent: "center", paddingTop: 18 },
    chartMessage: { color: c.mutedForeground, fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 6 },
    emptyTitle: { color: c.foreground, fontSize: 16, fontWeight: "700", marginTop: 9, textAlign: "center" },
    retry: { minHeight: 44, justifyContent: "center", paddingHorizontal: 14 },
    retryText: { color: c.primary, fontSize: 14, fontWeight: "700" },
    primaryButton: { minHeight: 52, borderRadius: 14, backgroundColor: c.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12 },
    primaryButtonText: { color: c.primaryForeground, fontSize: 16, fontWeight: "700" },
    sectionTitle: { color: c.foreground, fontSize: 19, fontWeight: "700", marginTop: 24, marginBottom: 10 },
    listCard: { backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 16, overflow: "hidden" },
    historyRow: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
    rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    historyDate: { color: c.mutedForeground, fontSize: 14 },
    historyValue: { color: c.foreground, fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] },
    emptyRow: { minHeight: 86, alignItems: "center", justifyContent: "center", padding: 18 },
    pressed: { opacity: 0.72 },
  });
}
