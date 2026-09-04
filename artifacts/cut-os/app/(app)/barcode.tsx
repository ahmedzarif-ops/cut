import { Ionicons } from "@expo/vector-icons";
import {
  getGetMyBarcodeFoodQueryKey,
  useGetMyBarcodeFood,
} from "@workspace/api-client-react";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

function normalizeBarcode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 14);
}

export default function BarcodeScreen() {
  const c = useColors();
  const s = makeStyles(c);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [barcode, setBarcode] = React.useState("");
  const [submittedBarcode, setSubmittedBarcode] = React.useState("");
  const [torch, setTorch] = React.useState(false);
  const lookup = useGetMyBarcodeFood(submittedBarcode || "000000", {
    query: {
      queryKey: getGetMyBarcodeFoodQueryKey(submittedBarcode || "000000"),
      enabled: /^\d{6,14}$/.test(submittedBarcode),
      retry: false,
    },
  });

  const reviewFood = () => {
    if (!lookup.data) return;
    router.replace({
      pathname: "/food-entry",
      params: {
        mode: "barcode",
        source: "barcode",
        sourceRef: lookup.data.barcode,
        name: lookup.data.name,
        serving: lookup.data.servingDescription,
        calories: String(lookup.data.caloriesKcal),
        protein: String(lookup.data.proteinG),
        carbs: String(lookup.data.carbsG),
        fat: String(lookup.data.fatG),
        fiber: String(lookup.data.fiberG),
      },
    });
  };

  const submit = (value = barcode) => {
    const normalized = normalizeBarcode(value);
    if (!/^\d{6,14}$/.test(normalized)) return;
    setBarcode(normalized);
    setSubmittedBarcode(normalized);
  };

  const permissionSurface = !permission?.granted ? (
    <View style={s.permissionCard}>
      <Ionicons name="barcode-outline" size={42} color={c.primary} />
      <Text style={s.permissionTitle}>Scan a food barcode</Text>
      <Text style={s.permissionBody}>
        Camera access is used only when you open this scanner. You review the
        food and nutrition before saving.
      </Text>
      <Pressable
        accessibilityRole="button"
        style={s.primaryButton}
        onPress={() => {
          if (permission?.canAskAgain === false) {
            void Linking.openSettings();
          } else {
            void requestPermission();
          }
        }}
      >
        <Text style={s.primaryButtonText}>
          {permission?.canAskAgain === false ? "Open Settings" : "Allow camera"}
        </Text>
      </Pressable>
    </View>
  ) : (
    <View style={s.cameraWrap}>
      <CameraView
        active={!submittedBarcode}
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"],
        }}
        enableTorch={torch}
        onBarcodeScanned={
          submittedBarcode ? undefined : ({ data }) => submit(data)
        }
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={s.scanFrame} />
      <Pressable
        accessibilityLabel={
          torch ? "Turn flashlight off" : "Turn flashlight on"
        }
        accessibilityRole="button"
        style={s.torch}
        onPress={() => setTorch((value) => !value)}
      >
        <Ionicons
          name={torch ? "flash" : "flash-outline"}
          size={22}
          color="#FFFFFF"
        />
      </Pressable>
      <Text style={s.cameraHint}>Center the barcode inside the frame</Text>
    </View>
  );

  return (
    <View
      style={[
        s.screen,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 },
      ]}
    >
      <View style={s.nav}>
        <Pressable
          accessibilityLabel="Close scanner"
          accessibilityRole="button"
          style={s.navButton}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={25} color={c.foreground} />
        </Pressable>
        <Text accessibilityRole="header" style={s.navTitle}>
          Scan barcode
        </Text>
        <View style={s.navButton} />
      </View>

      {permissionSurface}

      <View style={s.manual}>
        <Text style={s.manualLabel}>Or enter the number</Text>
        <View style={s.manualRow}>
          <TextInput
            accessibilityLabel="Barcode number"
            keyboardType="number-pad"
            maxLength={14}
            placeholder="012345678905"
            placeholderTextColor={c.mutedForeground}
            style={s.input}
            value={barcode}
            onChangeText={(value) => {
              setBarcode(normalizeBarcode(value));
              setSubmittedBarcode("");
            }}
            onSubmitEditing={() => submit()}
          />
          <Pressable
            accessibilityRole="button"
            style={s.lookupButton}
            onPress={() => submit()}
          >
            <Text style={s.lookupText}>Look up</Text>
          </Pressable>
        </View>
      </View>

      {lookup.isFetching ? (
        <View style={s.resultCard}>
          <ActivityIndicator color={c.primary} />
          <Text style={s.resultLoading}>Looking up food…</Text>
        </View>
      ) : lookup.data ? (
        <View style={s.resultCard}>
          <Text style={s.source}>OPEN FOOD FACTS · REVIEW REQUIRED</Text>
          <Text style={s.resultTitle}>{lookup.data.name}</Text>
          {lookup.data.brand ? (
            <Text style={s.resultMeta}>{lookup.data.brand}</Text>
          ) : null}
          <Text style={s.resultNutrition}>
            {Math.round(lookup.data.caloriesKcal)} cal ·{" "}
            {Math.round(lookup.data.proteinG)}g protein ·{" "}
            {lookup.data.servingDescription}
          </Text>
          <Pressable
            accessibilityRole="button"
            style={s.primaryButton}
            onPress={reviewFood}
          >
            <Text style={s.primaryButtonText}>Review and add</Text>
          </Pressable>
        </View>
      ) : lookup.isError ? (
        <View style={s.resultCard}>
          <Text style={s.resultTitle}>Food not found</Text>
          <Text style={s.permissionBody}>
            The barcode may be missing or incomplete. Add the label details
            manually.
          </Text>
          <Pressable
            accessibilityRole="button"
            style={s.primaryButton}
            onPress={() => router.replace("/food-entry")}
          >
            <Text style={s.primaryButtonText}>Add manually</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={s.secondaryButton}
            onPress={() => setSubmittedBarcode("")}
          >
            <Text style={s.secondaryText}>Scan again</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background, paddingHorizontal: 16 },
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
    navTitle: { color: c.foreground, fontSize: 17, fontWeight: "700" },
    cameraWrap: {
      height: 280,
      borderRadius: 20,
      overflow: "hidden",
      backgroundColor: "#05070A",
      marginTop: 12,
      justifyContent: "flex-end",
      alignItems: "center",
    },
    scanFrame: {
      position: "absolute",
      width: "78%",
      height: 112,
      top: 72,
      borderWidth: 2,
      borderColor: "#FFFFFF",
      borderRadius: 14,
    },
    torch: {
      position: "absolute",
      right: 14,
      top: 14,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(0,0,0,0.5)",
      alignItems: "center",
      justifyContent: "center",
    },
    cameraHint: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 22,
      backgroundColor: "rgba(0,0,0,0.5)",
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 13,
    },
    permissionCard: {
      minHeight: 280,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 20,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      marginTop: 12,
    },
    permissionTitle: {
      color: c.foreground,
      fontSize: 22,
      fontWeight: "800",
      marginTop: 13,
    },
    permissionBody: {
      color: c.mutedForeground,
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center",
      marginTop: 7,
    },
    manual: { marginTop: 18 },
    manualLabel: {
      color: c.foreground,
      fontSize: 14,
      fontWeight: "700",
      marginBottom: 7,
    },
    manualRow: { flexDirection: "row", gap: 8 },
    input: {
      flex: 1,
      minHeight: 50,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 14,
      backgroundColor: c.input,
      color: c.foreground,
      fontSize: 16,
      paddingHorizontal: 14,
    },
    lookupButton: {
      minHeight: 50,
      borderRadius: 14,
      backgroundColor: c.secondary,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 15,
    },
    lookupText: { color: c.primary, fontSize: 14, fontWeight: "700" },
    resultCard: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      backgroundColor: c.card,
      padding: 18,
      marginTop: 14,
      alignItems: "stretch",
    },
    source: {
      color: c.primary,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 0.7,
    },
    resultTitle: {
      color: c.foreground,
      fontSize: 19,
      lineHeight: 24,
      fontWeight: "700",
      marginTop: 5,
    },
    resultMeta: { color: c.mutedForeground, fontSize: 13, marginTop: 3 },
    resultNutrition: {
      color: c.foreground,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "600",
      marginTop: 10,
    },
    resultLoading: {
      color: c.mutedForeground,
      fontSize: 14,
      textAlign: "center",
      marginTop: 8,
    },
    primaryButton: {
      minHeight: 50,
      borderRadius: 14,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      marginTop: 14,
    },
    primaryButtonText: {
      color: c.primaryForeground,
      fontSize: 15,
      fontWeight: "700",
    },
    secondaryButton: {
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },
    secondaryText: { color: c.primary, fontSize: 14, fontWeight: "700" },
  });
}
