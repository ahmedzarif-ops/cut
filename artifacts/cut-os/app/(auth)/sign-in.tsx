import { useSignIn } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
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

export default function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const s = makeStyles(c);

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const busy = fetchStatus === "fetching";
  const disabled = !emailAddress || !password || busy;

  const handleSubmit = async () => {
    setSubmitError(null);
    const { error } = await signIn.password({ emailAddress, password });
    if (error) {
      setSubmitError("Couldn't sign in. Double-check your email and password.");
      return;
    }
    if (signIn.status === "complete") {
      await signIn.finalize({ navigate: () => router.replace("/today") });
    } else {
      setSubmitError("Additional verification is required to sign in.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          s.container,
          { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.brandMark}>
          <Text style={s.brandMarkText}>CUT</Text>
        </View>
        <Text style={s.title}>Welcome back</Text>
        <Text style={s.subtitle}>Sign in to continue your cut.</Text>

        <Text style={s.label}>Email</Text>
        <TextInput
          style={s.input}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor={c.mutedForeground}
          value={emailAddress}
          onChangeText={setEmailAddress}
        />
        {errors.fields.identifier && (
          <Text style={s.error}>{errors.fields.identifier.message}</Text>
        )}

        <Text style={s.label}>Password</Text>
        <TextInput
          style={s.input}
          secureTextEntry
          autoComplete="password"
          placeholder="Your password"
          placeholderTextColor={c.mutedForeground}
          value={password}
          onChangeText={setPassword}
        />
        {errors.fields.password && (
          <Text style={s.error}>{errors.fields.password.message}</Text>
        )}
        {submitError && <Text style={s.error}>{submitError}</Text>}

        <Pressable
          style={({ pressed }) => [
            s.button,
            disabled && s.buttonDisabled,
            pressed && !disabled && s.buttonPressed,
          ]}
          onPress={handleSubmit}
          disabled={disabled}
        >
          {busy ? (
            <ActivityIndicator color={c.primaryForeground} />
          ) : (
            <Text style={s.buttonText}>Sign in</Text>
          )}
        </Pressable>

        <View style={s.linkRow}>
          <Text style={s.muted}>Don&apos;t have an account? </Text>
          <Link href="/sign-up" style={s.link}>
            Create one
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    container: {
      flexGrow: 1,
      paddingHorizontal: 24,
      backgroundColor: c.background,
    },
    brandMark: {
      width: 56,
      height: 56,
      borderRadius: c.radius,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
    },
    brandMarkText: {
      color: c.primaryForeground,
      fontFamily: "Inter_700Bold",
      fontSize: 18,
      letterSpacing: 1,
    },
    title: {
      color: c.foreground,
      fontFamily: "Inter_700Bold",
      fontSize: 30,
    },
    subtitle: {
      color: c.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 16,
      marginTop: 6,
      marginBottom: 28,
    },
    label: {
      color: c.foreground,
      fontFamily: "Inter_500Medium",
      fontSize: 14,
      marginBottom: 8,
      marginTop: 16,
    },
    input: {
      backgroundColor: c.input,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: c.radius,
      color: c.foreground,
      fontFamily: "Inter_400Regular",
      fontSize: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    error: {
      color: c.destructive,
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      marginTop: 8,
    },
    button: {
      backgroundColor: c.primary,
      borderRadius: c.radius,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
      marginTop: 28,
      minHeight: 54,
    },
    buttonDisabled: { opacity: 0.5 },
    buttonPressed: { opacity: 0.85 },
    buttonText: {
      color: c.primaryForeground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 16,
    },
    linkRow: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 24,
    },
    muted: {
      color: c.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 14,
    },
    link: {
      color: c.primary,
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
    },
  });
}
