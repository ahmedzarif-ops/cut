import { useAuth, useSession } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import {
  decideMyAdultEligibility,
  getGetMyAdultEligibilityQueryKey,
  getGetMeQueryKey,
  useGetMe,
} from "@workspace/api-client-react";
import { Redirect, useRouter } from "expo-router";
import React from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  findNodeHandle,
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
  ADULT_ELIGIBILITY_POLICY_VERSION,
  ADULT_MINIMUM_AGE,
  AdultEligibilityPrincipalChangedError,
  executeOwnedAdultEligibilityWrite,
  formatDateOfBirth,
  parseAdultEligibilityResponse,
  shouldClearAdultEligibilityInput,
  validateDateOfBirth,
  type DateOfBirthFields,
} from "@/lib/adult-eligibility";
import { useAdultEligibilityGate } from "@/lib/adult-eligibility-gate";

const PRIVACY_POLICY_LINK_ID = ["privacyPolicy"] as const;

export default function AdultEligibilityScreen() {
  const { userId, sessionId, signOut } = useAuth();
  const { session } = useSession();
  const qc = useQueryClient();
  const router = useRouter();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const s = makeStyles(c);
  const gate = useAdultEligibilityGate();
  const declaredAgeRange = gate.declaredAgeRange;

  const meQuery = useGetMe({
    query: {
      queryKey: [...getGetMeQueryKey(), userId],
      enabled:
        gate.status === "eligible" &&
        declaredAgeRange.allowsPrivateAccess &&
        Boolean(userId),
      retry: false,
    },
  });

  const [fields, setFields] = React.useState<DateOfBirthFields>({
    month: "",
    day: "",
    year: "",
  });
  const [formError, setFormError] = React.useState<string | null>(null);
  const [errorField, setErrorField] = React.useState<
    keyof DateOfBirthFields | null
  >(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);
  const mutationLock = React.useRef(false);
  const mounted = React.useRef(true);
  const currentPrincipal = React.useRef({
    userId: userId ?? null,
    sessionId: sessionId ?? null,
  });
  const monthRef = React.useRef<TextInput>(null);
  const dayRef = React.useRef<TextInput>(null);
  const yearRef = React.useRef<TextInput>(null);
  currentPrincipal.current = {
    userId: userId ?? null,
    sessionId: sessionId ?? null,
  };

  React.useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  React.useEffect(() => {
    mutationLock.current = false;
    setFields({ month: "", day: "", year: "" });
    setFormError(null);
    setErrorField(null);
    setActionError(null);
    setSubmitting(false);
    setSigningOut(false);
  }, [sessionId, userId]);

  React.useEffect(() => {
    if (!shouldClearAdultEligibilityInput(gate.status)) return;
    setFields({ month: "", day: "", year: "" });
    setFormError(null);
    setErrorField(null);
  }, [gate.status]);

  const isCurrentPrincipal = (ownerUserId: string, ownerSessionId: string) =>
    mounted.current &&
    currentPrincipal.current.userId === ownerUserId &&
    currentPrincipal.current.sessionId === ownerSessionId;

  const manageAccount = () => {
    if (!submitting && !signingOut) router.push("/settings");
  };

  const handleSignOut = async () => {
    if (!userId || !sessionId || signingOut || submitting) return;
    const ownerUserId = userId;
    const ownerSessionId = sessionId;
    setSigningOut(true);
    setActionError(null);
    try {
      if (!isCurrentPrincipal(ownerUserId, ownerSessionId)) return;
      qc.clear();
      await signOut({ sessionId: ownerSessionId });
      if (isCurrentPrincipal(ownerUserId, ownerSessionId)) {
        router.replace("/sign-in");
      }
    } catch {
      if (isCurrentPrincipal(ownerUserId, ownerSessionId)) {
        setActionError(
          "Couldn't sign out. Check your connection and try again.",
        );
      }
    } finally {
      if (isCurrentPrincipal(ownerUserId, ownerSessionId)) setSigningOut(false);
    }
  };

  const setNumericField = (
    field: keyof DateOfBirthFields,
    value: string,
    maxLength: number,
  ) => {
    setFields((current) => ({
      ...current,
      [field]: value.replace(/\D/g, "").slice(0, maxLength),
    }));
    setFormError(null);
    setErrorField(null);
    setActionError(null);
  };

  const focusInvalidField = (field: keyof DateOfBirthFields) => {
    const refs = { month: monthRef, day: dayRef, year: yearRef };
    requestAnimationFrame(() => refs[field].current?.focus());
  };

  const submitDateOfBirth = async (dateOfBirth: string) => {
    if (
      !userId ||
      !sessionId ||
      !session ||
      session.id !== sessionId ||
      session.user?.id !== userId ||
      mutationLock.current
    ) {
      return;
    }

    const ownerUserId = userId;
    const ownerSessionId = sessionId;
    const ownerSession = session;
    mutationLock.current = true;
    setSubmitting(true);
    setActionError(null);

    try {
      const rawResponse = await executeOwnedAdultEligibilityWrite({
        ownerUserId,
        ownerSessionId,
        currentPrincipal: () => currentPrincipal.current,
        getToken: () =>
          tokenWithinTimeout(() => ownerSession.getToken({ skipCache: true })),
        sendRequest: (token) =>
          decideMyAdultEligibility(
            {
              dateOfBirth,
              policyVersion: ADULT_ELIGIBILITY_POLICY_VERSION,
              adultAttestation: true,
            },
            { headers: { Authorization: `Bearer ${token}` } },
          ),
      });
      if (!isCurrentPrincipal(ownerUserId, ownerSessionId)) return;

      const response = parseAdultEligibilityResponse(rawResponse);
      setFields({ month: "", day: "", year: "" });
      qc.setQueryData(
        [...getGetMyAdultEligibilityQueryKey(), ownerUserId],
        response,
      );
      if (response.status === "eligible") {
        void qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
      }
    } catch (error) {
      if (
        error instanceof AdultEligibilityPrincipalChangedError ||
        !isCurrentPrincipal(ownerUserId, ownerSessionId)
      ) {
        return;
      }
      const status = apiStatus(error);
      if (status === 403) {
        // The server persists an ineligible decision before returning its
        // denial. Erase the transient DOB and publish the terminal decision
        // immediately; the form must never offer a second decision while the
        // background GET reconciles with the server.
        setFields({ month: "", day: "", year: "" });
        setFormError(null);
        setErrorField(null);
        setActionError(null);
        qc.setQueryData([...getGetMyAdultEligibilityQueryKey(), ownerUserId], {
          status: "ineligible",
          minimumAge: ADULT_MINIMUM_AGE,
          policyVersion: ADULT_ELIGIBILITY_POLICY_VERSION,
        });
        gate.retry();
        return;
      }
      if (status === 400) {
        setFormError("Enter a valid date of birth.");
        setErrorField("year");
        focusInvalidField("year");
        return;
      }
      if (status === 409) {
        setFields({ month: "", day: "", year: "" });
        setActionError(
          "The adult-only policy changed. Review the current requirement before confirming again.",
        );
        gate.retry();
        return;
      }
      setActionError(
        "CUT OS couldn't confirm your age. Check your connection and try again. Health and nutrition features remain locked.",
      );
      gate.retry();
    } finally {
      mutationLock.current = false;
      if (isCurrentPrincipal(ownerUserId, ownerSessionId)) setSubmitting(false);
    }
  };

  const confirmDateOfBirth = () => {
    const validation = validateDateOfBirth(fields);
    if (!validation.ok) {
      setFormError(validation.message);
      setErrorField(validation.field);
      focusInvalidField(validation.field);
      return;
    }

    const dateOfBirth = validation.dateOfBirth;
    Alert.alert(
      "Confirm your date of birth",
      `${formatDateOfBirth(dateOfBirth)}. You won't be able to change this in the app.`,
      [
        { text: "Edit date", style: "cancel" },
        {
          text: "Confirm date",
          onPress: () => void submitDateOfBirth(dateOfBirth),
        },
      ],
    );
  };

  if (declaredAgeRange.isLoading) {
    return (
      <MessageScreen
        title="Checking Apple's age requirement"
        message="Private health and nutrition features remain locked while CUT OS checks whether Apple requires an age range on this device."
        loading
        onManage={manageAccount}
        onSignOut={() => void handleSignOut()}
        signingOut={signingOut}
        actionError={actionError}
      />
    );
  }

  if (declaredAgeRange.status === "error") {
    return (
      <MessageScreen
        title="Apple age check needed"
        message={
          declaredAgeRange.error ??
          "CUT OS couldn't verify Apple's age requirement."
        }
        primaryLabel="Try again"
        onPrimary={declaredAgeRange.retry}
        onManage={manageAccount}
        onSignOut={() => void handleSignOut()}
        signingOut={signingOut}
        actionError={actionError}
      />
    );
  }

  if (
    declaredAgeRange.status === "required" ||
    declaredAgeRange.status === "declined"
  ) {
    return (
      <MessageScreen
        title="Share your age range with CUT OS"
        message={
          declaredAgeRange.status === "declined"
            ? "Apple didn't share an age range. CUT OS is adults-only, so private health and nutrition features remain locked."
            : "Apple requires an age-range check on this device. CUT OS asks only whether your range is 18 or older and does not receive your exact birth date."
        }
        loading={declaredAgeRange.isRequesting}
        primaryLabel={
          declaredAgeRange.isRequesting
            ? undefined
            : declaredAgeRange.status === "declined"
              ? "Try Apple's age check again"
              : "Continue with Apple"
        }
        onPrimary={
          declaredAgeRange.isRequesting
            ? undefined
            : () => void declaredAgeRange.requestAdultAgeRange()
        }
        onManage={manageAccount}
        onSignOut={() => void handleSignOut()}
        signingOut={signingOut}
        actionError={declaredAgeRange.error ?? actionError}
      />
    );
  }

  if (declaredAgeRange.status === "ineligible") {
    return (
      <MessageScreen
        title="CUT OS is for adults"
        message="Apple's shared age range does not meet CUT OS's 18-or-older requirement. Private health and nutrition features remain locked."
        primaryLabel="Manage or delete account"
        onPrimary={manageAccount}
        onSignOut={() => void handleSignOut()}
        signingOut={signingOut}
        actionError={actionError}
      />
    );
  }

  if (gate.status === "eligible") {
    if (meQuery.data) {
      return (
        <Redirect
          href={meQuery.data.onboardingComplete ? "/today" : "/onboarding"}
        />
      );
    }
    return (
      <MessageScreen
        title={meQuery.isError ? "Couldn't open CUT OS" : "Age confirmed"}
        message={
          meQuery.isError
            ? "Your age is confirmed, but CUT OS couldn't load your account. Check your connection and try again."
            : "Opening CUT OS…"
        }
        loading={!meQuery.isError}
        primaryLabel={meQuery.isError ? "Try again" : undefined}
        onPrimary={meQuery.isError ? () => void meQuery.refetch() : undefined}
        onManage={manageAccount}
        onSignOut={() => void handleSignOut()}
        signingOut={signingOut}
        actionError={actionError}
      />
    );
  }

  if (gate.isLoading) {
    return (
      <MessageScreen
        title="Checking age requirement"
        message="Health and nutrition features remain locked while CUT OS verifies your account."
        loading
        onManage={manageAccount}
        onSignOut={() => void handleSignOut()}
        signingOut={signingOut}
        actionError={actionError}
      />
    );
  }

  if (gate.error) {
    return (
      <MessageScreen
        title="Age check needed"
        message={gate.error}
        primaryLabel="Try again"
        onPrimary={gate.retry}
        onManage={manageAccount}
        onSignOut={() => void handleSignOut()}
        signingOut={signingOut}
        actionError={actionError}
      />
    );
  }

  if (gate.status === "ineligible") {
    return (
      <MessageScreen
        title="CUT OS is for adults"
        message="You must be at least 18 years old to use CUT OS. This account's decision is final, so health and nutrition features will remain locked. If you later turn 18, delete this account and create a new one."
        primaryLabel="Manage or delete account"
        onPrimary={manageAccount}
        onSignOut={() => void handleSignOut()}
        signingOut={signingOut}
        actionError={actionError}
      />
    );
  }

  const busy = submitting || signingOut;
  const reviewingCurrentPolicy = gate.status === "review_required";
  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={s.flex}
        contentContainerStyle={[
          s.container,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <AutoFocusedHeading style={s.title}>
          {reviewingCurrentPolicy
            ? "Review the age requirement"
            : "Confirm you're 18 or older"}
        </AutoFocusedHeading>
        <Text style={s.subtitle}>
          {reviewingCurrentPolicy
            ? "CUT OS's adult-only policy needs your confirmation again. Enter your date of birth to continue."
            : "CUT OS is only available to adults age 18 or older. Enter your date of birth to continue."}
        </Text>

        <View style={s.disclosureCard}>
          <Text style={s.disclosureTitle}>Your date is not saved</Text>
          <Text style={s.disclosureText}>
            CUT OS does not save your date of birth on this device or put it in
            links. It is sent to the server only for this eligibility check and
            discarded after the decision.
          </Text>
          <LegalSupportLinks
            variant="compact"
            includedIds={PRIVACY_POLICY_LINK_ID}
          />
        </View>

        <Text accessibilityRole="header" style={s.sectionTitle}>
          Date of birth
        </Text>
        <Text style={s.sectionHint}>
          Enter the date exactly as it appears on your records.
        </Text>

        <Text style={s.label}>Month</Text>
        <TextInput
          ref={monthRef}
          accessibilityLabel="Birth month"
          accessibilityHint="Enter the month as one or two digits"
          style={[s.input, errorField === "month" && s.inputError]}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="MM"
          placeholderTextColor={c.mutedForeground}
          value={fields.month}
          editable={!busy}
          onChangeText={(value) => setNumericField("month", value, 2)}
        />

        <Text style={s.label}>Day</Text>
        <TextInput
          ref={dayRef}
          accessibilityLabel="Birth day"
          accessibilityHint="Enter the day as one or two digits"
          style={[s.input, errorField === "day" && s.inputError]}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="DD"
          placeholderTextColor={c.mutedForeground}
          value={fields.day}
          editable={!busy}
          onChangeText={(value) => setNumericField("day", value, 2)}
        />

        <Text style={s.label}>Year</Text>
        <TextInput
          ref={yearRef}
          accessibilityLabel="Birth year"
          accessibilityHint="Enter the four digit year"
          style={[s.input, errorField === "year" && s.inputError]}
          keyboardType="number-pad"
          maxLength={4}
          placeholder="YYYY"
          placeholderTextColor={c.mutedForeground}
          value={fields.year}
          editable={!busy}
          onChangeText={(value) => setNumericField("year", value, 4)}
        />

        {formError ? (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            style={s.errorText}
          >
            {formError}
          </Text>
        ) : null}
        {actionError ? (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            style={s.errorText}
          >
            {actionError}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Confirm age"
          accessibilityState={{ disabled: busy, busy: submitting }}
          disabled={busy}
          style={({ pressed }) => [
            s.primaryButton,
            busy && s.disabled,
            pressed && !busy && s.pressed,
          ]}
          onPress={confirmDateOfBirth}
        >
          {submitting ? (
            <View style={s.busyRow}>
              <ActivityIndicator color={c.primaryForeground} />
              <Text style={s.primaryButtonText}>Confirming…</Text>
            </View>
          ) : (
            <Text style={s.primaryButtonText}>Confirm age</Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          style={({ pressed }) => [
            s.secondaryButton,
            busy && s.disabled,
            pressed && !busy && s.pressed,
          ]}
          onPress={manageAccount}
        >
          <Text style={s.secondaryButtonText}>Manage account</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy, busy: signingOut }}
          disabled={busy}
          style={({ pressed }) => [
            s.secondaryButton,
            busy && s.disabled,
            pressed && !busy && s.pressed,
          ]}
          onPress={() => void handleSignOut()}
        >
          <Text style={s.secondaryButtonText}>
            {signingOut ? "Signing out…" : "Sign out"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function MessageScreen({
  title,
  message,
  loading = false,
  primaryLabel,
  onPrimary,
  onManage,
  onSignOut,
  signingOut,
  actionError,
}: {
  title: string;
  message: string;
  loading?: boolean;
  primaryLabel?: string;
  onPrimary?: () => void;
  onManage?: () => void;
  onSignOut: () => void;
  signingOut: boolean;
  actionError: string | null;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const s = makeStyles(c);
  return (
    <View
      style={[
        s.messageContainer,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
    >
      {loading ? <ActivityIndicator color={c.primary} /> : null}
      <AutoFocusedHeading style={s.messageTitle}>{title}</AutoFocusedHeading>
      <Text
        accessibilityLiveRegion={loading ? "polite" : "none"}
        style={s.messageText}
      >
        {message}
      </Text>
      {actionError ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          style={s.errorText}
        >
          {actionError}
        </Text>
      ) : null}
      {primaryLabel && onPrimary ? (
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [s.primaryButton, pressed && s.pressed]}
          onPress={onPrimary}
        >
          <Text style={s.primaryButtonText}>{primaryLabel}</Text>
        </Pressable>
      ) : null}
      {onManage ? (
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [s.secondaryButton, pressed && s.pressed]}
          onPress={onManage}
        >
          <Text style={s.secondaryButtonText}>Manage account</Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: signingOut, busy: signingOut }}
        disabled={signingOut}
        style={({ pressed }) => [
          s.secondaryButton,
          signingOut && s.disabled,
          pressed && !signingOut && s.pressed,
        ]}
        onPress={onSignOut}
      >
        <Text style={s.secondaryButtonText}>
          {signingOut ? "Signing out…" : "Sign out"}
        </Text>
      </Pressable>
    </View>
  );
}

function AutoFocusedHeading({
  children,
  style,
}: {
  children: React.ReactNode;
  style: object;
}) {
  const headingRef = React.useRef<Text>(null);
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      const node = findNodeHandle(headingRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 100);
    return () => clearTimeout(timeout);
  }, []);
  return (
    <Text ref={headingRef} accessibilityRole="header" style={style}>
      {children}
    </Text>
  );
}

async function tokenWithinTimeout(
  getToken: () => Promise<string | null>,
): Promise<string | null> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      getToken().catch(() => null),
      new Promise<null>((resolve) => {
        timeout = setTimeout(() => resolve(null), 5000);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function apiStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object" || !("status" in error)) {
    return undefined;
  }
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    container: { paddingHorizontal: 24 },
    title: {
      color: c.foreground,
      fontFamily: "Inter_700Bold",
      fontSize: 30,
      lineHeight: 37,
    },
    subtitle: {
      color: c.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 16,
      lineHeight: 24,
      marginTop: 10,
    },
    disclosureCard: {
      backgroundColor: c.card,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: c.radius,
      padding: 18,
      marginTop: 24,
    },
    disclosureTitle: {
      color: c.foreground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
    },
    disclosureText: {
      color: c.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      lineHeight: 21,
      marginTop: 6,
    },
    sectionTitle: {
      color: c.foreground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 19,
      marginTop: 28,
    },
    sectionHint: {
      color: c.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      lineHeight: 20,
      marginTop: 5,
    },
    label: {
      color: c.foreground,
      fontFamily: "Inter_500Medium",
      fontSize: 15,
      marginTop: 20,
      marginBottom: 8,
    },
    input: {
      minHeight: 54,
      backgroundColor: c.input,
      borderColor: c.inputBorder,
      borderWidth: 1,
      borderRadius: c.radius,
      color: c.foreground,
      fontFamily: "Inter_400Regular",
      fontSize: 18,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    inputError: { borderColor: c.destructive, borderWidth: 2 },
    errorText: {
      color: c.destructiveText,
      fontFamily: "Inter_500Medium",
      fontSize: 14,
      lineHeight: 21,
      marginTop: 16,
    },
    primaryButton: {
      minHeight: 54,
      backgroundColor: c.primary,
      borderRadius: c.radius,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 20,
      paddingVertical: 14,
      marginTop: 24,
    },
    primaryButtonText: {
      color: c.primaryForeground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 16,
      textAlign: "center",
    },
    secondaryButton: {
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      marginTop: 8,
    },
    secondaryButtonText: {
      color: c.primary,
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
      textAlign: "center",
    },
    busyRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.84 },
    messageContainer: {
      flex: 1,
      backgroundColor: c.background,
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    messageTitle: {
      color: c.foreground,
      fontFamily: "Inter_700Bold",
      fontSize: 28,
      lineHeight: 35,
      textAlign: "center",
      marginTop: 16,
    },
    messageText: {
      color: c.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 16,
      lineHeight: 24,
      textAlign: "center",
      marginTop: 10,
    },
  });
}
