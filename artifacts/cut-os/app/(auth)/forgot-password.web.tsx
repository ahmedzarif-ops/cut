import { SignIn } from "@clerk/expo/web";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

/**
 * The public web surface also stays inside Clerk's prebuilt sign-in flow.
 * Disabling transfer and pinning Clerk's sign-up navigation to CUT's guarded
 * route are deliberate: recovery must never bypass adult confirmation or
 * Terms assent.
 */
export default function WebForgotPasswordScreen() {
  const c = useColors();
  const s = makeStyles(c);

  return (
    <View style={s.container}>
      <Text accessibilityRole="header" style={s.title}>
        Secure account recovery
      </Text>
      <Text style={s.subtitle}>
        Choose Forgot password in Clerk&apos;s secure sign-in window.
      </Text>
      <SignIn
        routing="hash"
        signUpUrl="/sign-up"
        transferable={false}
        withSignUp={false}
      />
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      alignItems: "center",
      backgroundColor: c.background,
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 56,
    },
    title: {
      color: c.foreground,
      fontFamily: "Inter_700Bold",
      fontSize: 24,
    },
    subtitle: {
      color: c.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 20,
      marginTop: 6,
      textAlign: "center",
    },
  });
}
