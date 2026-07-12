import { useAuth } from "@clerk/expo";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Redirect, Stack } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export default function AppLayout() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const c = useColors();

  // Attach the Clerk bearer token to every generated API request (mobile has
  // no browser cookie jar, so the token must be sent explicitly).
  //
  // Clerk's very first getToken() on expo-web can hang indefinitely, so we
  // time-box it. On timeout we resolve `null` (not throw): the request then
  // fires without a token and the server returns 401, which customFetch turns
  // into an ApiError that react-query retries (and that mutations surface to
  // the user via their catch handlers) — so a failed token is never silent.
  // Throwing here instead made a hanging getToken() loop without recovering.
  //
  // INVARIANT: the getter is registered in an effect, and React runs child
  // effects before parent effects — so a screen's very first query can fire
  // before the getter exists and go out unauthenticated. That self-heals ONLY
  // because react-query retries re-fire it once the getter is registered.
  // Therefore first-screen queries must keep retries enabled; a `retry: false`
  // query on the entry screen would reintroduce the token race.
  useEffect(() => {
    setAuthTokenGetter(async () => {
      try {
        return await Promise.race([
          getToken(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
        ]);
      } catch {
        return null;
      }
    });
    return () => setAuthTokenGetter(null);
  }, [getToken]);

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

  if (!isSignedIn) return <Redirect href="/sign-in" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.background },
      }}
    />
  );
}
