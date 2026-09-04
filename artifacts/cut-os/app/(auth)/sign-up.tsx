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
import {
  createExclusiveOperationRunner,
  resetSignUpAttempt,
  runPasswordSignUp,
  sendSignUpEmailCode,
  verifySignUpEmailCode,
} from "@/lib/auth-flow";
import {
  isSignUpSubmissionDisabled,
  SIGN_UP_TERMS_ASSENT_COPY,
} from "@/lib/sign-up-consent";

const SIGN_UP_LEGAL_LINK_IDS = ["terms", "privacyPolicy"] as const;
type SignUpStep = "account" | "email-code" | "finalize";

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
  const [termsAssented, setTermsAssented] = React.useState(false);
  const [step, setStep] = React.useState<SignUpStep>("account");
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
  const createDisabled = isSignUpSubmissionDisabled({
    emailAddress,
    password,
    adultConfirmed,
    termsAssented,
    busy,
  });
  const codeDisabled = busy || (step === "email-code" && !code.trim());

  const handleSubmit = async () => {
    if (createDisabled) return;
    const submittedEmail = emailAddress.trim();
    const submittedPassword = password;

    await operationRunner.run(async ({ isCurrent }) => {
      setSubmitError(null);
      setVerificationNotice(null);
      const outcome = await runPasswordSignUp({
        createAccount: () =>
          signUp.password({
            emailAddress: submittedEmail,
            password: submittedPassword,
          }),
        getStatus: () => signUp.status,
        getMissingFields: () => signUp.missingFields,
        getUnverifiedFields: () => signUp.unverifiedFields,
        sendEmailCode: () => signUp.verifications.sendEmailCode(),
        finalize: () =>
          signUp.finalize({
            navigate: () => {
              if (isCurrent()) router.replace("/today");
            },
          }),
        isCurrent,
      });
      if (!isCurrent() || outcome.kind === "stale") return;

      if (outcome.kind === "account_failed") {
        setSubmitError(
          "Couldn't create your account. Try another email or a stronger password.",
        );
        return;
      }
      if (outcome.kind === "unsupported") {
        setPassword("");
        setSubmitError(
          "This account requires a sign-up step that CUT doesn't support yet.",
        );
        return;
      }
      if (outcome.kind === "finalize_failed") {
        setPassword("");
        setStep("finalize");
        setSubmitError(
          "Your account was created, but we couldn't finish signing you in. Tap Finish signing in to try again.",
        );
        return;
      }
      if (
        outcome.kind === "email_code_sent" ||
        outcome.kind === "email_code_send_failed"
      ) {
        setEmailAddress(submittedEmail);
        setPassword("");
        setCode("");
        setStep("email-code");
        if (outcome.kind === "email_code_sent") {
          setVerificationNotice(`We sent a 6-digit code to ${submittedEmail}.`);
        } else {
          setSubmitError(
            "We couldn't send a verification code. Tap Send a new code to try again.",
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
      const outcome = await verifySignUpEmailCode({
        verifyEmailCode: () =>
          signUp.verifications.verifyEmailCode({ code: submittedCode }),
        getStatus: () => signUp.status,
        finalize: () =>
          signUp.finalize({
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
        setStep("finalize");
        setSubmitError(
          "Your email was verified, but we couldn't finish signing you in. Tap Finish signing in to try again.",
        );
      }
    });
  };

  const handleResend = async () => {
    if (busy) return;
    await operationRunner.run(async ({ isCurrent }) => {
      setSubmitError(null);
      setVerificationNotice(null);
      const outcome = await sendSignUpEmailCode({
        sendEmailCode: () => signUp.verifications.sendEmailCode(),
        isCurrent,
      });
      if (!isCurrent() || outcome.kind === "stale") return;

      if (outcome.kind === "failed") {
        setSubmitError(
          "We couldn't send a new verification code. Check your connection and try again.",
        );
      } else {
        setCode("");
        setVerificationNotice(
          `A new 6-digit code was sent to ${emailAddress}.`,
        );
      }
    });
  };

  const useDifferentEmail = async () => {
    if (busy) return;
    await operationRunner.run(async ({ isCurrent }) => {
      setSubmitError(null);
      const outcome = await resetSignUpAttempt({
        reset: () => signUp.reset(),
        isCurrent,
      });
      if (!isCurrent() || outcome.kind === "stale") return;

      if (outcome.kind === "failed") {
        setSubmitError(
          "We couldn't restart account creation. Close this screen and try again.",
        );
        return;
      }

      setEmailAddress("");
      setPassword("");
      setCode("");
      setAdultConfirmed(false);
      setTermsAssented(false);
      setStep("account");
      setVerificationNotice(null);
    });
  };

  const returnToSignIn = async () => {
    if (busy) return;
    await operationRunner.run(async ({ isCurrent }) => {
      setSubmitError(null);
      const outcome = await resetSignUpAttempt({
        reset: () => signUp.reset(),
        isCurrent,
      });
      if (!isCurrent() || outcome.kind === "stale") return;

      if (outcome.kind === "failed") {
        setSubmitError(
          "We couldn't restart sign-in. Close this screen and try again.",
        );
        return;
      }
      router.replace("/sign-in");
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

        {step !== "account" ? (
          <>
            <Text accessibilityRole="header" style={s.title}>
              {step === "email-code"
                ? "Verify your email"
                : "Finish signing in"}
            </Text>
            <Text style={s.subtitle}>
              {step === "email-code"
                ? "Enter the email code to finish creating your account."
                : "Your account is ready. Try once more to finish signing in."}
            </Text>
            {step === "email-code" && verificationNotice ? (
              <Text
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                style={s.notice}
              >
                {verificationNotice}
              </Text>
            ) : null}

            {step === "email-code" ? (
              <>
                <Text style={s.label}>Verification code</Text>
                <TextInput
                  accessibilityLabel="Email verification code"
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
              </>
            ) : null}
            {submitError && (
              <Text accessibilityRole="alert" style={s.error}>
                {submitError}
              </Text>
            )}

            <Pressable
              accessibilityLabel={
                step === "email-code"
                  ? "Verify and continue"
                  : "Finish signing in"
              }
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
                <Text style={s.buttonText}>
                  {step === "email-code"
                    ? "Verify & continue"
                    : "Finish signing in"}
                </Text>
              )}
            </Pressable>

            {step === "email-code" ? (
              <>
                <Pressable
                  accessibilityLabel="Send a new code"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busy, busy }}
                  disabled={busy}
                  style={[s.secondaryButton, busy && s.buttonDisabled]}
                  onPress={handleResend}
                >
                  <Text style={s.secondaryButtonText}>Send a new code</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Use a different email"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busy }}
                  disabled={busy}
                  style={[s.secondaryButton, busy && s.buttonDisabled]}
                  onPress={useDifferentEmail}
                >
                  <Text style={s.secondaryButtonText}>
                    Use a different email
                  </Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                accessibilityLabel="Return to sign in"
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                style={[s.secondaryButton, busy && s.buttonDisabled]}
                onPress={returnToSignIn}
              >
                <Text style={s.secondaryButtonText}>Return to sign in</Text>
              </Pressable>
            )}
          </>
        ) : (
          <>
            <Text accessibilityRole="header" style={s.title}>
              Create your account
            </Text>
            <Text style={s.subtitle}>
              CUT OS is available only to people age 18 or older.
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
            {errors.fields.emailAddress && (
              <Text accessibilityRole="alert" style={s.error}>
                {errors.fields.emailAddress.message}
              </Text>
            )}

            <Text style={s.label}>Password</Text>
            <TextInput
              accessibilityLabel="Password"
              style={s.input}
              secureTextEntry
              autoComplete="new-password"
              placeholder="At least 8 characters"
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
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel={SIGN_UP_TERMS_ASSENT_COPY}
              accessibilityState={{ checked: termsAssented, disabled: busy }}
              disabled={busy}
              style={({ pressed }) => [
                s.confirmationRow,
                busy && s.buttonDisabled,
                pressed && !busy && s.buttonPressed,
              ]}
              onPress={() => setTermsAssented((current) => !current)}
            >
              <View
                importantForAccessibility="no-hide-descendants"
                style={[s.checkbox, termsAssented && s.checkboxSelected]}
              >
                {termsAssented ? <Text style={s.checkmark}>✓</Text> : null}
              </View>
              <Text style={s.confirmationText}>
                {SIGN_UP_TERMS_ASSENT_COPY}
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
              accessibilityLabel="Create account"
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
      borderColor: c.inputBorder,
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
