import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";

import { useColors } from "@/hooks/useColors";

export default function AuthLayout() {
  const { isSignedIn } = useAuth();
  const c = useColors();

  if (isSignedIn) return <Redirect href="/today" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.background },
      }}
    />
  );
}
