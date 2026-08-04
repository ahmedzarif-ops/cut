import { AuthView } from "@clerk/expo/native";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

/**
 * App Store builds delegate account recovery to Clerk's prebuilt native
 * authentication view. `signIn` mode is intentional: Clerk's strict user
 * enumeration setting does not support the sign-in-or-up mode, and CUT keeps
 * its separately tested adult/terms sign-up flow on the Sign up route.
 */
export default function NativeForgotPasswordScreen() {
  const router = useRouter();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const s = makeStyles(c);

  return (
    <View
      style={[
        s.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={s.instructions}>
        <Text accessibilityRole="header" style={s.title}>
          Secure account recovery
        </Text>
        <Text style={s.subtitle}>
          Choose Get help below, then follow Clerk&apos;s secure password
          recovery steps.
        </Text>
      </View>
      <View style={s.authView}>
        <AuthView
          mode="signIn"
          isDismissible
          onDismiss={() => router.replace("/sign-in")}
        />
      </View>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    instructions: {
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 12,
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
      marginTop: 6,
    },
    authView: {
      flex: 1,
    },
  });
}
