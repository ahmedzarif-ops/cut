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
} from "@/lib/clerk-launch-state";
import { resolveRuntimeConfig } from "@/lib/runtime-config";

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

function ConfigurationErrorScreen() {
  return (
    <View accessibilityRole="alert" style={configurationErrorStyles.container}>
      <Text style={configurationErrorStyles.eyebrow}>CUT OS</Text>
      <Text style={configurationErrorStyles.title}>
        This build is not ready
      </Text>
      <Text style={configurationErrorStyles.message}>
        The app is missing required launch settings. Please install a newer
        build or contact CUT OS support.
      </Text>
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
              <StatusBar style="light" />
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
    <View accessibilityRole="alert" style={launchStyles.container}>
      <Text style={launchStyles.eyebrow}>CUT OS</Text>
      <Text style={launchStyles.title}>We couldn't open the app</Text>
      <Text style={launchStyles.message}>
        Please close CUT OS and try again. If this continues, contact CUT OS
        support.
      </Text>
    </View>
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

  useEffect(() => {
    if (fontsLoaded || fontError) {
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
    if (clerkLaunch.phase !== "loading") return;
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

  if (!fontsLoaded && !fontError) return null;

  if (!runtimeConfig.ok) return <ConfigurationErrorScreen />;

  const launchFallback = resolveClerkLaunchFallback(clerkLaunch);

  return (
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
          publishableKey={runtimeConfig.config.clerkPublishableKey}
          tokenCache={tokenCache}
          proxyUrl={runtimeConfig.config.clerkProxyUrl}
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

const configurationErrorStyles = launchStyles;
