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

import { LegalSupportLinks } from "@/components/LegalSupportLinks";
import { useColors } from "@/hooks/useColors";
import { clerkOperationSucceeded } from "@/lib/auth-flow";

const SIGN_UP_LEGAL_LINK_IDS = ["terms", "privacyPolicy"] as const;

export default function SignUpScreen() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const router = useRouter();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const s = makeStyles(c);

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [adultConfirmed, setAdultConfirmed] = React.useState(false);
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [verificationNotice, setVerificationNotice] = React.useState<
    string | null
  >(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const busy = fetchStatus === "fetching";
  const createDisabled = !emailAddress || !password || !adultConfirmed || busy;

  const handleSubmit = async () => {
    if (createDisabled) return;
    setSubmitError(null);
    setVerificationNotice(null);
    const accountCreated = await clerkOperationSucceeded(() =>
      signUp.password({ emailAddress, password }),
    );
    if (!accountCreated) {
      setSubmitError(
        "Couldn't create your account. Try another email or a stronger password.",
      );
      return;
    }

    setPendingVerification(true);
    const codeSent = await clerkOperationSucceeded(() =>
      signUp.verifications.sendEmailCode(),
    );
    if (!codeSent) {
      setSubmitError(
        "We couldn't send a verification code. Tap Send a new code to try again.",
      );
      return;
    }
    setVerificationNotice(`We sent a 6-digit code to ${emailAddress}.`);
  };

  const handleVerify = async () => {
    if (!code || busy) return;
    setSubmitError(null);
    const codeVerified = await clerkOperationSucceeded(() =>
      signUp.verifications.verifyEmailCode({ code }),
    );
    if (!codeVerified || signUp.status !== "complete") {
      setSubmitError("That code didn't work. Request a new one and try again.");
      return;
    }

    const finalized = await clerkOperationSucceeded(() =>
      signUp.finalize({ navigate: () => router.replace("/today") }),
    );
    if (!finalized) {
      setSubmitError(
        "Your email was verified, but we couldn't finish signing you in. Return to sign in and try again.",
      );
    }
  };

  const handleResend = async () => {
    if (busy) return;
    setSubmitError(null);
    setVerificationNotice(null);
    const codeSent = await clerkOperationSucceeded(() =>
      signUp.verifications.sendEmailCode(),
    );
    if (!codeSent) {
      setSubmitError(
        "We couldn't send a new verification code. Check your connection and try again.",
      );
      return;
    }
    setVerificationNotice(`A new 6-digit code was sent to ${emailAddress}.`);
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
              {verificationNotice ??
                "Request a verification code, then enter it here to continue."}
            </Text>

            <Text style={s.label}>Verification code</Text>
            <TextInput
              accessibilityLabel="Email verification code"
              style={s.input}
              autoComplete="one-time-code"
              keyboardType="number-pad"
              placeholder="123456"
              placeholderTextColor={c.mutedForeground}
              value={code}
              onChangeText={setCode}
            />
            {errors.fields.code && (
              <Text accessibilityRole="alert" style={s.error}>
                {errors.fields.code.message}
              </Text>
            )}
            {submitError && (
              <Text accessibilityRole="alert" style={s.error}>
                {submitError}
              </Text>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy || !code, busy }}
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
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, busy }}
              disabled={busy}
              style={[s.secondaryButton, busy && s.buttonDisabled]}
              onPress={handleResend}
            >
              <Text style={s.secondaryButtonText}>Send a new code</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={s.title}>Create your account</Text>
            <Text style={s.subtitle}>
              CUT OS is available only to people age 18 or older.
            </Text>

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

            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel="I confirm I am at least 18 years old"
              accessibilityState={{ checked: adultConfirmed, disabled: busy }}
              disabled={busy}
              style={({ pressed }) => [
                s.confirmationRow,
                busy && s.buttonDisabled,
                pressed && !busy && s.buttonPressed,
              ]}
              onPress={() => setAdultConfirmed((current) => !current)}
            >
              <View
                importantForAccessibility="no-hide-descendants"
                style={[s.checkbox, adultConfirmed && s.checkboxSelected]}
              >
                {adultConfirmed ? <Text style={s.checkmark}>✓</Text> : null}
              </View>
              <Text style={s.confirmationText}>
                I confirm I am at least 18 years old.
              </Text>
            </Pressable>
            <LegalSupportLinks
              variant="compact"
              includedIds={SIGN_UP_LEGAL_LINK_IDS}
            />
            {submitError && (
              <Text accessibilityRole="alert" style={s.error}>
                {submitError}
              </Text>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: createDisabled, busy }}
              style={({ pressed }) => [
                s.button,
                createDisabled && s.buttonDisabled,
                pressed && !createDisabled && s.buttonPressed,
              ]}
              onPress={handleSubmit}
              disabled={createDisabled}
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
      color: c.destructiveText,
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      marginTop: 8,
    },
    confirmationRow: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginTop: 22,
      paddingVertical: 4,
    },
    checkbox: {
      width: 26,
      height: 26,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxSelected: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    checkmark: {
      color: c.primaryForeground,
      fontFamily: "Inter_700Bold",
      fontSize: 17,
      lineHeight: 20,
    },
    confirmationText: {
      flex: 1,
      color: c.foreground,
      fontFamily: "Inter_500Medium",
      fontSize: 15,
      lineHeight: 21,
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
    secondaryButton: {
      alignItems: "center",
      paddingVertical: 16,
      marginTop: 8,
    },
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
