import { useAuth } from "@clerk/expo";
import {
  createMyProPhotoEstimate,
  type PhotoEstimate,
} from "@workspace/api-client-react";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useSubscriptionGate } from "@/lib/subscription-gate";

export default function PhotoEstimateScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const subscription = useSubscriptionGate();
  const { userId, sessionId } = useAuth();
  const principal = `${userId}:${sessionId}:${subscription.isEntitled}`;
  const currentPrincipal = React.useRef(principal);
  currentPrincipal.current = principal;
  const [permission, requestPermission] = useCameraPermissions();
  const camera = React.useRef<CameraView>(null);
  const lock = React.useRef(false);
  const mounted = React.useRef(true);
  const abort = React.useRef<AbortController | null>(null);
  const [ready, setReady] = React.useState(false);
  const [pictureSize, setPictureSize] = React.useState<string>();
  const [photo, setPhoto] = React.useState<string | null>(null);
  const [estimate, setEstimate] = React.useState<PhotoEstimate | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abort.current?.abort();
    };
  }, []);
  React.useEffect(() => {
    abort.current?.abort();
    setPhoto(null);
    setEstimate(null);
    setError(null);
    setBusy(false);
  }, [principal, subscription.isEntitled]);
  const active = (owner: string) =>
    mounted.current && currentPrincipal.current === owner;

  async function capture() {
    if (lock.current || !ready || !subscription.isEntitled) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    const owner = principal;
    try {
      const image = await camera.current?.takePictureAsync({
        base64: true,
        quality: 0.2,
        exif: false,
      });
      try {
        if (!active(owner)) return;
        if (!image?.base64 || image.base64.length > 400_000)
          throw new Error("large_image");
        setPhoto(image.base64);
        setEstimate(null);
      } finally {
        if (image?.uri)
          await FileSystem.deleteAsync(image.uri, { idempotent: true });
      }
    } catch {
      if (active(owner))
        setError(
          "Couldn’t prepare that photo. Try again, or add the food manually.",
        );
    } finally {
      lock.current = false;
      if (active(owner)) setBusy(false);
    }
  }

  async function analyze() {
    if (lock.current || !photo || !subscription.isEntitled) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    const owner = principal;
    const controller = new AbortController();
    abort.current = controller;
    try {
      const result = await createMyProPhotoEstimate(
        { imageBase64: photo, consent: true },
        { signal: controller.signal },
      );
      if (active(owner) && !controller.signal.aborted) {
        setEstimate(result);
        setPhoto(null);
      }
    } catch (cause) {
      if (active(owner) && !controller.signal.aborted) {
        const payload = (cause as { data?: { error?: unknown } })?.data;
        setError(
          typeof payload?.error === "string"
            ? payload.error
            : "Photo analysis didn’t finish. Check your connection or add food manually.",
        );
      }
    } finally {
      lock.current = false;
      if (active(owner)) setBusy(false);
    }
  }

  function review() {
    if (!estimate || !subscription.isEntitled) return;
    router.replace({
      pathname: "/food-entry",
      params: {
        mode: "photo",
        name: estimate.name,
        serving: `Photo estimate — ${estimate.servingDescription}`,
        calories: String(estimate.caloriesKcal),
        protein: String(estimate.proteinG),
        carbs: String(estimate.carbsG),
        fat: String(estimate.fatG),
        fiber: String(estimate.fiberG),
      },
    });
  }
  const button = (label: string, action: () => void, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={action}
      style={[
        s.button,
        { backgroundColor: c.primary, opacity: disabled ? 0.5 : 1 },
      ]}
    >
      <Text
        style={{ color: c.primaryForeground, fontWeight: "700", fontSize: 16 }}
      >
        {label}
      </Text>
    </Pressable>
  );
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{
        padding: 20,
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 28,
      }}
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        style={s.close}
      >
        <Text style={{ color: c.primary }}>Close</Text>
      </Pressable>
      <Text
        accessibilityRole="header"
        style={[s.title, { color: c.foreground }]}
      >
        Estimate a food photo
      </Text>
      {!subscription.isEntitled ? (
        <>
          <Text style={[s.body, { color: c.mutedForeground }]}>
            Photo analysis is a DawatFit Pro feature. You can still log food
            manually or scan barcodes for free.
          </Text>
          {button("See Pro", () => router.replace("/subscription"))}
        </>
      ) : (
        <>
          <Text style={[s.body, { color: c.mutedForeground }]}>
            A photo gives a rough estimate, not a measurement. Review foods,
            portions and nutrition before saving. Hidden oils and ingredients
            can change the result.
          </Text>
          {estimate ? (
            <View
              style={[
                s.card,
                { backgroundColor: c.card, borderColor: c.border },
              ]}
            >
              <Text style={[s.heading, { color: c.foreground }]}>
                {estimate.name}
              </Text>
              <Text style={[s.body, { color: c.mutedForeground }]}>
                {estimate.servingDescription}
              </Text>
              <Text style={[s.heading, { color: c.foreground }]}>
                {Math.round(estimate.caloriesKcal)} estimated calories
              </Text>
              <Text style={[s.body, { color: c.foreground }]}>
                {estimate.proteinG}g protein · {estimate.carbsG}g carbs ·{" "}
                {estimate.fatG}g fat · {estimate.fiberG}g fiber
              </Text>
              <Text style={[s.body, { color: c.mutedForeground }]}>
                {estimate.uncertainty}
              </Text>
              {button("Review and edit before logging", review)}
              {button("Take another photo", () => {
                setEstimate(null);
                setReady(false);
              })}
            </View>
          ) : photo ? (
            <>
              <Image
                accessibilityLabel="Food photo to analyze"
                source={{ uri: `data:image/jpeg;base64,${photo}` }}
                style={s.preview}
                resizeMode="contain"
              />
              <Text style={[s.body, { color: c.mutedForeground }]}>
                By tapping “Send photo for estimate,” you send this photo to CUT
                and OpenAI for analysis. CUT does not save the photo on its
                server. OpenAI processes it under its data policies. Avoid faces
                and private information. Nothing enters your diary until you
                confirm.
              </Text>
              <Pressable
                accessibilityRole="link"
                onPress={() =>
                  void Linking.openURL(
                    "https://openai.com/policies/privacy-policy/",
                  )
                }
                style={s.close}
              >
                <Text style={{ color: c.primary }}>OpenAI privacy policy</Text>
              </Pressable>
              {button(
                busy ? "Estimating…" : "Send photo for estimate",
                () => void analyze(),
                busy,
              )}
              {button(
                "Retake",
                () => {
                  setPhoto(null);
                  setReady(false);
                  setError(null);
                },
                busy,
              )}
            </>
          ) : !permission?.granted ? (
            <>
              {button(
                permission?.canAskAgain === false
                  ? "Open camera settings"
                  : "Allow camera",
                () => {
                  if (permission?.canAskAgain === false)
                    void Linking.openSettings();
                  else void requestPermission();
                },
              )}
            </>
          ) : (
            <>
              <CameraView
                ref={camera}
                style={s.preview}
                facing="back"
                pictureSize={pictureSize}
                onMountError={() => {
                  setReady(false);
                  setError("Camera unavailable. Add food manually instead.");
                }}
                onCameraReady={() => {
                  void camera.current
                    ?.getAvailablePictureSizesAsync()
                    .then((sizes) => {
                      if (!mounted.current) return;
                      const sorted = sizes
                        .filter((size) => /^\d+x\d+$/.test(size))
                        .sort((a, b) => {
                          const area = (v: string) =>
                            v.split("x").reduce((x, y) => x * Number(y), 1);
                          return area(a) - area(b);
                        });
                      setPictureSize(
                        sorted.find(
                          (size) => Number(size.split("x")[0]) >= 640,
                        ) ?? sorted[0],
                      );
                      setReady(true);
                    })
                    .catch(() => {
                      if (mounted.current) setReady(true);
                    });
                }}
              />
              {button("Take food photo", () => void capture(), busy || !ready)}
            </>
          )}
          {busy ? (
            <ActivityIndicator color={c.primary} style={{ marginTop: 12 }} />
          ) : null}
          {error ? (
            <Text
              accessibilityRole="alert"
              style={[s.body, { color: c.foreground }]}
            >
              {error}
            </Text>
          ) : null}
        </>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace("/food-entry")}
        style={s.close}
      >
        <Text style={{ color: c.primary }}>Add food manually instead</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 30, fontWeight: "800", marginBottom: 12 },
  heading: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 22, marginBottom: 16 },
  button: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    padding: 12,
  },
  close: { minHeight: 48, justifyContent: "center" },
  preview: {
    height: 320,
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    marginVertical: 12,
  },
  card: { padding: 18, borderWidth: 1, borderRadius: 18 },
});
