import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { ClerkLoaded, ClerkLoading, ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { setBaseUrl } from "@workspace/api-client-react";
import {
  focusManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { reloadAppAsync } from "expo";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { ErrorFallbackProps } from "@/components/ErrorFallback";
import {
  CLERK_LOADING_TIMEOUT_MS,
  createClerkLaunchState,
  reduceClerkLaunchState,
  resolveClerkLaunchFallback,
  resolveClerkLaunchStatusBarStyle,
} from "@/lib/clerk-launch-state";
import {
  resolveRuntimeLaunchDecision,
  resolveRuntimeConfig,
  runtimeConfigEnvironmentNames,
  type RuntimeConfigIssue,
} from "@/lib/runtime-config";

const runtimeConfig = resolveRuntimeConfig({
  EXPO_PUBLIC_DOMAIN: process.env.EXPO_PUBLIC_DOMAIN,
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
  EXPO_PUBLIC_CLERK_PROXY_URL: process.env.EXPO_PUBLIC_CLERK_PROXY_URL,
  EXPO_PUBLIC_REVENUECAT_IOS_API_KEY:
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
});

if (runtimeConfig.ok) {
  setBaseUrl(runtimeConfig.config.apiBaseUrl);
} else {
  // Report only stable issue codes. Environment values can include sensitive
  // deployment details and must never be printed to a device log.
  console.error("CUT OS build configuration is invalid", runtimeConfig.issues);
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();
const ASSET_LOADING_TIMEOUT_MS = 10_000;

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

function ConfigurationErrorScreen({
  issues,
}: {
  issues: readonly RuntimeConfigIssue[];
}) {
  const localWebPreview = __DEV__ && Platform.OS === "web";
  const environmentNames = runtimeConfigEnvironmentNames(issues);

  return (
    <View accessibilityRole="alert" style={configurationErrorStyles.container}>
      <Text style={configurationErrorStyles.eyebrow}>CUT OS</Text>
      <Text style={configurationErrorStyles.title}>
        {localWebPreview
          ? "Local preview needs setup"
          : "This build is not ready"}
      </Text>
      <Text style={configurationErrorStyles.message}>
        {localWebPreview
          ? "Launch is safely paused because required services are not configured. Add real development settings and restart Expo; authentication is not mocked or bypassed."
          : "The app is missing required launch settings. Please install a newer build or contact CUT OS support."}
      </Text>
      {localWebPreview ? (
        <Text style={configurationErrorStyles.detail}>
          Check: {environmentNames.join(", ")}
        </Text>
      ) : null}
    </View>
  );
}

function LaunchLoadingScreen() {
  return (
    <View style={launchStyles.fallback}>
      <ActivityIndicator
        accessibilityLabel="Loading CUT OS"
        color="#64D8CB"
        size="large"
      />
      <Text style={launchStyles.loadingText}>Loading CUT OS</Text>
    </View>
  );
}

function AssetLaunchScreen({ timedOut }: { timedOut: boolean }) {
  const [restartFailed, setRestartFailed] = React.useState(false);

  const restart = async () => {
    setRestartFailed(false);
    try {
      await reloadAppAsync();
    } catch {
      setRestartFailed(true);
    }
  };

  return (
    <React.Fragment>
      <StatusBar style="light" />
      <View
        accessibilityRole={timedOut ? "alert" : undefined}
        style={launchStyles.fallback}
      >
        {timedOut ? (
          <React.Fragment>
            <Text style={launchStyles.systemEyebrow}>CUT OS</Text>
            <Text style={launchStyles.systemTitle}>Startup needs a retry</Text>
            <Text style={launchStyles.systemMessage}>
              CUT OS could not finish loading its display resources. Restart the
              app to try again.
            </Text>
            <Pressable
              accessibilityLabel="Restart CUT OS after startup timeout"
              accessibilityRole="button"
              style={({ pressed }) => [
                launchStyles.retryButton,
                pressed && launchStyles.retryButtonPressed,
              ]}
              onPress={() => void restart()}
            >
              <Text style={launchStyles.systemRetryButtonText}>
                Restart CUT OS
              </Text>
            </Pressable>
            {restartFailed ? (
              <Text accessibilityRole="alert" style={launchStyles.systemError}>
                Close CUT OS from the app switcher, then open it again.
              </Text>
            ) : null}
          </React.Fragment>
        ) : (
          <React.Fragment>
            <ActivityIndicator
              accessibilityLabel="Loading CUT OS display"
              color="#64D8CB"
              size="large"
            />
            <Text style={launchStyles.systemLoadingText}>Loading CUT OS</Text>
          </React.Fragment>
        )}
      </View>
    </React.Fragment>
  );
}

function ClerkLaunchRetry({ onRetry }: { onRetry: () => void }) {
  return (
    <View accessibilityRole="alert" style={launchStyles.fallback}>
      <Text style={launchStyles.eyebrow}>CUT OS</Text>
      <Text style={launchStyles.title}>We couldn&apos;t connect</Text>
      <Text style={launchStyles.message}>
        Secure sign-in is taking longer than expected. Check your connection and
        try again.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Try secure sign-in again"
        style={({ pressed }) => [
          launchStyles.retryButton,
          pressed && launchStyles.retryButtonPressed,
        ]}
        onPress={onRetry}
      >
        <Text style={launchStyles.retryButtonText}>Try again</Text>
      </Pressable>
    </View>
  );
}

function ClerkLoadedApp({
  attempt,
  onLoaded,
}: {
  attempt: number;
  onLoaded: (attempt: number) => void;
}) {
  useEffect(() => onLoaded(attempt), [attempt, onLoaded]);

  return (
    <SafeAreaProvider style={launchStyles.loadedRoot}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <RootLayoutNav />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

function LaunchErrorScreen(_props: ErrorFallbackProps) {
  return (
    <React.Fragment>
      <StatusBar style="light" />
      <View accessibilityRole="alert" style={launchStyles.container}>
        <Text style={launchStyles.eyebrow}>CUT OS</Text>
        <Text style={launchStyles.title}>We couldn't open the app</Text>
        <Text style={launchStyles.message}>
          Please close CUT OS and try again. If this continues, contact CUT OS
          support.
        </Text>
      </View>
    </React.Fragment>
  );
}

export default function RootLayout() {
  const [clerkLaunch, dispatchClerkLaunch] = React.useReducer(
    reduceClerkLaunchState,
    undefined,
    createClerkLaunchState,
  );
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [assetLoadingTimedOut, setAssetLoadingTimedOut] = React.useState(false);

  useEffect(() => {
    if (!runtimeConfig.ok || fontsLoaded || fontError) {
      setAssetLoadingTimedOut(false);
      return;
    }

    const timeout = setTimeout(() => {
      setAssetLoadingTimedOut(true);
      void SplashScreen.hideAsync();
    }, ASSET_LOADING_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (!runtimeConfig.ok || fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    // Browsers already have TanStack Query's visibility/focus integration.
    // Native apps need AppState so returning to the foreground refetches
    // security-sensitive queries such as account-deletion status.
    if (Platform.OS === "web") return;

    focusManager.setFocused(AppState.currentState === "active");
    const subscription = AppState.addEventListener("change", (state) => {
      focusManager.setFocused(state === "active");
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!runtimeConfig.ok || clerkLaunch.phase !== "loading") return;
    const attempt = clerkLaunch.attempt;
    const timeout = setTimeout(
      () => dispatchClerkLaunch({ type: "timeout", attempt }),
      CLERK_LOADING_TIMEOUT_MS,
    );
    return () => clearTimeout(timeout);
  }, [clerkLaunch.attempt, clerkLaunch.phase]);

  const handleClerkLoaded = React.useCallback((attempt: number) => {
    dispatchClerkLaunch({ type: "loaded", attempt });
  }, []);

  const launchDecision = resolveRuntimeLaunchDecision(runtimeConfig, {
    loaded: fontsLoaded,
    failed: Boolean(fontError),
  });
  if (launchDecision.surface === "configuration_error") {
    return (
      <React.Fragment>
        <StatusBar style="light" />
        <ConfigurationErrorScreen issues={launchDecision.issues} />
      </React.Fragment>
    );
  }

  if (launchDecision.surface === "asset_loading") {
    return <AssetLaunchScreen timedOut={assetLoadingTimedOut} />;
  }

  const launchFallback = resolveClerkLaunchFallback(clerkLaunch);

  return (
    <React.Fragment>
      <StatusBar style={resolveClerkLaunchStatusBarStyle(launchFallback)} />
      <ErrorBoundary FallbackComponent={LaunchErrorScreen}>
        <View style={launchStyles.root}>
          {launchFallback === "loading" ? <LaunchLoadingScreen /> : null}
          {launchFallback === "retry" ? (
            <ClerkLaunchRetry
              onRetry={() => dispatchClerkLaunch({ type: "retry" })}
            />
          ) : null}

          <ClerkProvider
            key={clerkLaunch.attempt}
            publishableKey={launchDecision.config.clerkPublishableKey}
            tokenCache={tokenCache}
            proxyUrl={launchDecision.config.clerkProxyUrl}
          >
            {/*
              Keep using Clerk's exported loading/loaded controls, but never put
              CUT OS's only launch UI inside ClerkLoading. A rejected Clerk load
              is caught internally and can cause that branch to render nothing.
            */}
            <ClerkLoading>
              <React.Fragment />
            </ClerkLoading>
            <ClerkLoaded>
              <ClerkLoadedApp
                attempt={clerkLaunch.attempt}
                onLoaded={handleClerkLoaded}
              />
            </ClerkLoaded>
          </ClerkProvider>
        </View>
      </ErrorBoundary>
    </React.Fragment>
  );
}

const launchStyles = StyleSheet.create({
  root: {
    backgroundColor: "#07111F",
    flex: 1,
    position: "relative",
  },
  loadedRoot: { flex: 1 },
  container: {
    alignItems: "center",
    backgroundColor: "#07111F",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "#07111F",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    color: "#B4C1D1",
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    marginTop: 16,
  },
  systemLoadingText: {
    color: "#B4C1D1",
    fontSize: 16,
    fontWeight: "500",
    marginTop: 16,
  },
  systemEyebrow: {
    color: "#64D8CB",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 14,
  },
  systemTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  systemMessage: {
    color: "#B4C1D1",
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 420,
    textAlign: "center",
  },
  systemRetryButtonText: {
    color: "#07111F",
    fontSize: 16,
    fontWeight: "600",
  },
  systemError: {
    color: "#FFB4AB",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 16,
    textAlign: "center",
  },
  eyebrow: {
    color: "#64D8CB",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: 2,
    marginBottom: 14,
  },
  title: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    color: "#B4C1D1",
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 420,
    textAlign: "center",
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: "#64D8CB",
    borderRadius: 14,
    justifyContent: "center",
    marginTop: 24,
    minHeight: 52,
    minWidth: 160,
    paddingHorizontal: 24,
  },
  retryButtonPressed: { opacity: 0.84 },
  retryButtonText: {
    color: "#07111F",
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
});

const configurationErrorStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#07111F",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  eyebrow: {
    color: "#64D8CB",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 14,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    color: "#B4C1D1",
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 520,
    textAlign: "center",
  },
  detail: {
    color: "#64D8CB",
    fontFamily: Platform.OS === "web" ? "monospace" : undefined,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 20,
    maxWidth: 520,
    textAlign: "center",
  },
});
