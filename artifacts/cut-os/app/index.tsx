import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();
  const c = useColors();

  if (!isLoaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.background,
        }}
      >
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  return <Redirect href={isSignedIn ? "/today" : "/sign-in"} />;
}
