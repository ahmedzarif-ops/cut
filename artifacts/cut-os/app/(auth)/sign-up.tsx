import { useSignUp } from "@clerk/expo";
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

export default function SignUpScreen() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const router = useRouter();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const s = makeStyles(c);

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const busy = fetchStatus === "fetching";

  const handleSubmit = async () => {
    setSubmitError(null);
    const { error } = await signUp.password({ emailAddress, password });
    if (error) {
      setSubmitError(
        "Couldn't create your account. Try another email or a stronger password.",
      );
      return;
    }
    await signUp.verifications.sendEmailCode();
    setPendingVerification(true);
  };

  const handleVerify = async () => {
    setSubmitError(null);
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === "complete") {
      await signUp.finalize({ navigate: () => router.replace("/today") });
    } else {
      setSubmitError("That code didn't work. Request a new one and try again.");
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

        {pendingVerification ? (
          <>
            <Text style={s.title}>Verify your email</Text>
            <Text style={s.subtitle}>
              We sent a 6-digit code to {emailAddress}.
            </Text>

            <Text style={s.label}>Verification code</Text>
            <TextInput
              style={s.input}
              keyboardType="number-pad"
              placeholder="123456"
              placeholderTextColor={c.mutedForeground}
              value={code}
              onChangeText={setCode}
            />
            {errors.fields.code && (
              <Text style={s.error}>{errors.fields.code.message}</Text>
            )}
            {submitError && <Text style={s.error}>{submitError}</Text>}

            <Pressable
              style={({ pressed }) => [
                s.button,
                (busy || !code) && s.buttonDisabled,
                pressed && !busy && !!code && s.buttonPressed,
              ]}
              onPress={handleVerify}
              disabled={busy || !code}
            >
              {busy ? (
                <ActivityIndicator color={c.primaryForeground} />
              ) : (
                <Text style={s.buttonText}>Verify & continue</Text>
              )}
            </Pressable>

            <Pressable
              style={s.secondaryButton}
              onPress={() => signUp.verifications.sendEmailCode()}
            >
              <Text style={s.secondaryButtonText}>Send a new code</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={s.title}>Create your account</Text>
            <Text style={s.subtitle}>Start your cut in under a minute.</Text>

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
            {errors.fields.emailAddress && (
              <Text style={s.error}>{errors.fields.emailAddress.message}</Text>
            )}

            <Text style={s.label}>Password</Text>
            <TextInput
              style={s.input}
              secureTextEntry
              placeholder="At least 8 characters"
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
                (!emailAddress || !password || busy) && s.buttonDisabled,
                pressed &&
                  !!emailAddress &&
                  !!password &&
                  !busy &&
                  s.buttonPressed,
              ]}
              onPress={handleSubmit}
              disabled={!emailAddress || !password || busy}
            >
              {busy ? (
                <ActivityIndicator color={c.primaryForeground} />
              ) : (
                <Text style={s.buttonText}>Create account</Text>
              )}
            </Pressable>

            <View style={s.linkRow}>
              <Text style={s.muted}>Already have an account? </Text>
              <Link href="/sign-in" style={s.link}>
                Sign in
              </Link>
            </View>

            {/* Required for Clerk's bot sign-up protection. */}
            <View nativeID="clerk-captcha" />
          </>
        )}
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
    title: { color: c.foreground, fontFamily: "Inter_700Bold", fontSize: 30 },
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
    secondaryButton: { alignItems: "center", paddingVertical: 16, marginTop: 8 },
    secondaryButtonText: {
      color: c.primary,
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
    },
    linkRow: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
    muted: {
      color: c.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 14,
    },
    link: { color: c.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  });
}
