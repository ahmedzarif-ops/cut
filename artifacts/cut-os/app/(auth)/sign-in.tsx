import { useSignIn } from "@clerk/expo";
import { type Href, Link, useRouter } from "expo-router";
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
  createExclusiveOperationRunner,
  resetSignInAttempt,
  runPasswordSignIn,
  sendSignInEmailCode,
  verifySignInEmailCode,
} from "@/lib/auth-flow";

type SignInStep = "password" | "email-code";

export default function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const s = makeStyles(c);

  const [step, setStep] = React.useState<SignInStep>("password");
  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [safeIdentifier, setSafeIdentifier] = React.useState<string | null>(
    null,
  );
  const [verificationNotice, setVerificationNotice] = React.useState<
    string | null
  >(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [localBusy, setLocalBusy] = React.useState(false);
  const mountedRef = React.useRef(true);
  const operationRunnerRef = React.useRef<ReturnType<
    typeof createExclusiveOperationRunner
  > | null>(null);
  if (operationRunnerRef.current === null) {
    operationRunnerRef.current = createExclusiveOperationRunner({
      isActive: () => mountedRef.current,
      onBusyChange: setLocalBusy,
    });
  }
  const operationRunner = operationRunnerRef.current;

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      operationRunner.invalidate();
    };
  }, [operationRunner]);

  const busy = localBusy || fetchStatus === "fetching";
  const passwordDisabled = !emailAddress.trim() || !password || busy;
  const codeDisabled = !code.trim() || busy;

  const handleSubmit = async () => {
    if (passwordDisabled) return;
    const submittedEmail = emailAddress.trim();
    const submittedPassword = password;

    await operationRunner.run(async ({ isCurrent }) => {
      setSubmitError(null);
      setVerificationNotice(null);
      const outcome = await runPasswordSignIn({
        authenticate: () =>
          signIn.password({
            emailAddress: submittedEmail,
            password: submittedPassword,
          }),
        getStatus: () => signIn.status,
        getSupportedSecondFactors: () => signIn.supportedSecondFactors,
        sendEmailCode: () => signIn.mfa.sendEmailCode(),
        finalize: () =>
          signIn.finalize({
            navigate: () => {
              if (isCurrent()) router.replace("/today");
            },
          }),
        isCurrent,
      });
      if (!isCurrent() || outcome.kind === "stale") return;

      if (outcome.kind === "password_failed") {
        setSubmitError(
          "Couldn't sign in. Double-check your email and password.",
        );
        return;
      }
      if (outcome.kind === "unsupported") {
        setSubmitError(
          "This account requires a sign-in method that CUT doesn't support yet.",
        );
        return;
      }
      if (outcome.kind === "finalize_failed") {
        setSubmitError(
          "Couldn't finish signing in. Check your connection and try again.",
        );
        return;
      }
      if (
        outcome.kind === "email_code_sent" ||
        outcome.kind === "email_code_send_failed"
      ) {
        setPassword("");
        setCode("");
        setSafeIdentifier(outcome.safeIdentifier);
        setStep("email-code");
        if (outcome.kind === "email_code_sent") {
          setVerificationNotice(
            `We sent a 6-digit code to ${outcome.safeIdentifier ?? "the email on your account"}.`,
          );
        } else {
          setSubmitError(
            "We couldn't send a sign-in code. Tap Send a new code to try again.",
          );
        }
      }
    });
  };

  const handleVerify = async () => {
    if (codeDisabled) return;
    const submittedCode = code.trim();

    await operationRunner.run(async ({ isCurrent }) => {
      setSubmitError(null);
      const outcome = await verifySignInEmailCode({
        verifyEmailCode: () =>
          signIn.mfa.verifyEmailCode({ code: submittedCode }),
        getStatus: () => signIn.status,
        finalize: () =>
          signIn.finalize({
            navigate: () => {
              if (isCurrent()) router.replace("/today");
            },
          }),
        isCurrent,
      });
      if (!isCurrent() || outcome.kind === "stale") return;

      if (outcome.kind === "verification_failed") {
        setSubmitError(
          "That code didn't work. Request a new one and try again.",
        );
      } else if (outcome.kind === "finalize_failed") {
        setSubmitError(
          "Your code was accepted, but we couldn't finish signing in. Tap Verify & continue to try again.",
        );
      }
    });
  };

  const handleResend = async () => {
    if (busy) return;
    await operationRunner.run(async ({ isCurrent }) => {
      setSubmitError(null);
      setVerificationNotice(null);
      const outcome = await sendSignInEmailCode({
        sendEmailCode: () => signIn.mfa.sendEmailCode(),
        isCurrent,
      });
      if (!isCurrent() || outcome.kind === "stale") return;

      if (outcome.kind === "failed") {
        setSubmitError(
          "We couldn't send a new sign-in code. Check your connection and try again.",
        );
      } else {
        setCode("");
        setVerificationNotice(
          `A new 6-digit code was sent to ${safeIdentifier ?? "the email on your account"}.`,
        );
      }
    });
  };

  const useDifferentAccount = async () => {
    if (busy) return;
    await operationRunner.run(async ({ isCurrent }) => {
      setSubmitError(null);
      const outcome = await resetSignInAttempt({
        reset: () => signIn.reset(),
        isCurrent,
      });
      if (!isCurrent() || outcome.kind === "stale") return;

      if (outcome.kind === "failed") {
        setSubmitError(
          "We couldn't restart sign-in. Close this screen and try again.",
        );
        return;
      }

      setStep("password");
      setEmailAddress("");
      setPassword("");
      setCode("");
      setSafeIdentifier(null);
      setVerificationNotice(null);
    });
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

        {step === "email-code" ? (
          <>
            <Text accessibilityRole="header" style={s.title}>
              Verify your sign-in
            </Text>
            <Text style={s.subtitle}>
              For your security, enter the email code to continue.
            </Text>
            {verificationNotice ? (
              <Text
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                style={s.notice}
              >
                {verificationNotice}
              </Text>
            ) : null}

            <Text style={s.label}>Sign-in code</Text>
            <TextInput
              accessibilityLabel="Email sign-in code"
              style={s.input}
              autoComplete="one-time-code"
              keyboardType="number-pad"
              maxLength={6}
              placeholder="123456"
              placeholderTextColor={c.mutedForeground}
              value={code}
              onChangeText={setCode}
              editable={!busy}
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
              accessibilityLabel="Verify and continue"
              accessibilityRole="button"
              accessibilityState={{ disabled: codeDisabled, busy }}
              style={({ pressed }) => [
                s.button,
                codeDisabled && s.buttonDisabled,
                pressed && !codeDisabled && s.buttonPressed,
              ]}
              onPress={handleVerify}
              disabled={codeDisabled}
            >
              {busy ? (
                <ActivityIndicator color={c.primaryForeground} />
              ) : (
                <Text style={s.buttonText}>Verify & continue</Text>
              )}
            </Pressable>

            <Pressable
              accessibilityLabel="Send a new code"
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, busy }}
              style={[s.secondaryButton, busy && s.buttonDisabled]}
              onPress={handleResend}
              disabled={busy}
            >
              <Text style={s.secondaryButtonText}>Send a new code</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Use a different account"
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              style={[s.secondaryButton, busy && s.buttonDisabled]}
              onPress={useDifferentAccount}
              disabled={busy}
            >
              <Text style={s.secondaryButtonText}>Use a different account</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text accessibilityRole="header" style={s.title}>
              Welcome back
            </Text>
            <Text style={s.subtitle}>Sign in to continue your cut.</Text>

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
            {errors.fields.identifier && (
              <Text accessibilityRole="alert" style={s.error}>
                {errors.fields.identifier.message}
              </Text>
            )}

            <Text style={s.label}>Password</Text>
            <TextInput
              accessibilityLabel="Password"
              style={s.input}
              secureTextEntry
              autoComplete="password"
              placeholder="Your password"
              placeholderTextColor={c.mutedForeground}
              value={password}
              onChangeText={setPassword}
              editable={!busy}
            />
            {errors.fields.password && (
              <Text accessibilityRole="alert" style={s.error}>
                {errors.fields.password.message}
              </Text>
            )}
            {submitError && (
              <Text accessibilityRole="alert" style={s.error}>
                {submitError}
              </Text>
            )}

            <Link href={"/forgot-password" as Href} style={s.forgotLink}>
              Forgot password?
            </Link>

            <Pressable
              accessibilityLabel="Sign in"
              accessibilityRole="button"
              accessibilityState={{ disabled: passwordDisabled, busy }}
              style={({ pressed }) => [
                s.button,
                passwordDisabled && s.buttonDisabled,
                pressed && !passwordDisabled && s.buttonPressed,
              ]}
              onPress={handleSubmit}
              disabled={passwordDisabled}
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
      borderColor: c.inputBorder,
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
    notice: {
      color: c.foreground,
      backgroundColor: c.secondary,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: c.radius,
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 4,
      padding: 14,
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
    forgotLink: {
      alignSelf: "flex-end",
      color: c.primary,
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
      marginTop: 12,
      minHeight: 44,
      paddingVertical: 12,
    },
  });
}
