import { useSignIn } from "@clerk/expo";
import { useRouter } from "expo-router";
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
import {
  clerkOperationSucceeded,
  PASSWORD_RESET_REQUEST_NOTICE,
  requestPasswordResetEmailCode,
} from "@/lib/auth-flow";

type RecoveryStep = "request" | "verify" | "password";

export default function ForgotPasswordScreen() {
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const s = makeStyles(c);

  const [step, setStep] = React.useState<RecoveryStep>("request");
  const [emailAddress, setEmailAddress] = React.useState("");
  const [code, setCode] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const busy = fetchStatus === "fetching";

  const requestCode = async () => {
    const normalizedEmail = emailAddress.trim();
    if (!normalizedEmail || busy) return;

    setSubmitError(null);
    setNotice(null);
    await requestPasswordResetEmailCode({
      createSignIn: () => signIn.create({ identifier: normalizedEmail }),
      sendCode: () => signIn.resetPasswordEmailCode.sendCode(),
    });

    // This deliberately does not vary with Clerk's result. The same response
    // prevents the recovery screen from confirming whether an account exists.
    setCode("");
    setNotice(PASSWORD_RESET_REQUEST_NOTICE);
    setStep("verify");
  };

  const verifyCode = async () => {
    if (!code.trim() || busy) return;
    setSubmitError(null);
    const verified = await clerkOperationSucceeded(() =>
      signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() }),
    );
    if (!verified || signIn.status !== "needs_new_password") {
      setSubmitError(
        "We couldn't verify that code. Check it or request a new code and try again.",
      );
      return;
    }

    setNotice(null);
    setStep("password");
  };

  const submitNewPassword = async () => {
    if (busy) return;
    setSubmitError(null);
    if (!password || password !== confirmPassword) {
      setSubmitError("Enter the same new password in both fields.");
      return;
    }

    const passwordSubmitted = await clerkOperationSucceeded(() =>
      signIn.resetPasswordEmailCode.submitPassword({
        password,
        signOutOfOtherSessions: true,
      }),
    );
    if (!passwordSubmitted) {
      setSubmitError(
        "We couldn't set that password. Make sure it meets the password requirements and try again.",
      );
      return;
    }
    if (signIn.status !== "complete") {
      setSubmitError(
        "Your password may have changed, but we couldn't finish signing you in. Return to sign in with your new password.",
      );
      return;
    }

    const finalized = await clerkOperationSucceeded(() =>
      signIn.finalize({ navigate: () => router.replace("/today") }),
    );
    if (!finalized) {
      setSubmitError(
        "Your password changed, but we couldn't finish signing you in. Return to sign in with your new password.",
      );
    }
  };

  const changeEmail = async () => {
    if (busy) return;
    await clerkOperationSucceeded(() => signIn.reset());
    setCode("");
    setPassword("");
    setConfirmPassword("");
    setNotice(null);
    setSubmitError(null);
    setStep("request");
  };

  const returnToSignIn = async () => {
    if (busy) return;
    await clerkOperationSucceeded(() => signIn.reset());
    router.replace("/sign-in");
  };

  const primaryDisabled =
    busy ||
    (step === "request"
      ? !emailAddress.trim()
      : step === "verify"
        ? !code.trim()
        : !password || !confirmPassword);

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

        {step === "request" ? (
          <>
            <Text accessibilityRole="header" style={s.title}>
              Reset your password
            </Text>
            <Text style={s.subtitle}>
              Enter your account email. We&apos;ll send reset instructions when
              that email can receive them.
            </Text>

            <Text style={s.label}>Email</Text>
            <TextInput
              accessibilityLabel="Account email"
              style={s.input}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={c.mutedForeground}
              value={emailAddress}
              onChangeText={setEmailAddress}
              editable={!busy}
            />
          </>
        ) : step === "verify" ? (
          <>
            <Text accessibilityRole="header" style={s.title}>
              Check your email
            </Text>
            <Text style={s.subtitle}>
              Enter the 6-digit password reset code if one arrives.
            </Text>

            <Text style={s.label}>Password reset code</Text>
            <TextInput
              accessibilityLabel="Password reset code"
              style={s.input}
              autoComplete="one-time-code"
              keyboardType="number-pad"
              placeholder="123456"
              placeholderTextColor={c.mutedForeground}
              value={code}
              onChangeText={setCode}
              editable={!busy}
            />
          </>
        ) : (
          <>
            <Text accessibilityRole="header" style={s.title}>
              Choose a new password
            </Text>
            <Text style={s.subtitle}>
              Your new password must meet the account security requirements.
            </Text>

            <Text style={s.label}>New password</Text>
            <TextInput
              accessibilityLabel="New password"
              style={s.input}
              secureTextEntry
              autoComplete="new-password"
              placeholder="New password"
              placeholderTextColor={c.mutedForeground}
              value={password}
              onChangeText={setPassword}
              editable={!busy}
            />

            <Text style={s.label}>Confirm new password</Text>
            <TextInput
              accessibilityLabel="Confirm new password"
              style={s.input}
              secureTextEntry
              autoComplete="new-password"
              placeholder="Enter it again"
              placeholderTextColor={c.mutedForeground}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!busy}
            />
          </>
        )}

        {notice ? (
          <Text accessibilityRole="alert" style={s.notice}>
            {notice}
          </Text>
        ) : null}
        {submitError ? (
          <Text accessibilityRole="alert" style={s.error}>
            {submitError}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: primaryDisabled, busy }}
          style={({ pressed }) => [
            s.button,
            primaryDisabled && s.buttonDisabled,
            pressed && !primaryDisabled && s.buttonPressed,
          ]}
          onPress={
            step === "request"
              ? requestCode
              : step === "verify"
                ? verifyCode
                : submitNewPassword
          }
          disabled={primaryDisabled}
        >
          {busy ? (
            <ActivityIndicator color={c.primaryForeground} />
          ) : (
            <Text style={s.buttonText}>
              {step === "request"
                ? "Send reset code"
                : step === "verify"
                  ? "Verify code"
                  : "Set new password"}
            </Text>
          )}
        </Pressable>

        {step === "verify" ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, busy }}
              style={[s.secondaryButton, busy && s.buttonDisabled]}
              onPress={requestCode}
              disabled={busy}
            >
              <Text style={s.secondaryButtonText}>Send a new code</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              style={[s.secondaryButton, busy && s.buttonDisabled]}
              onPress={changeEmail}
              disabled={busy}
            >
              <Text style={s.secondaryButtonText}>Use a different email</Text>
            </Pressable>
          </>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          style={[s.signInButton, busy && s.buttonDisabled]}
          onPress={returnToSignIn}
          disabled={busy}
        >
          <Text style={s.signInButtonText}>Back to sign in</Text>
        </Pressable>
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
      lineHeight: 23,
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
    notice: {
      color: c.foreground,
      backgroundColor: c.secondary,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: c.radius,
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      lineHeight: 20,
      marginTop: 18,
      padding: 14,
    },
    error: {
      color: c.destructiveText,
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      lineHeight: 19,
      marginTop: 12,
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
      minHeight: 48,
      justifyContent: "center",
      marginTop: 6,
    },
    secondaryButtonText: {
      color: c.primary,
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
    },
    signInButton: {
      alignItems: "center",
      minHeight: 48,
      justifyContent: "center",
      marginTop: 14,
    },
    signInButtonText: {
      color: c.mutedForeground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
    },
  });
}
