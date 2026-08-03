import React from "react";

export const DEVICE_TIME_ZONE_HEADER = "X-CUT-Device-Timezone";
export const DEVICE_TIME_ZONE_REQUIRED_CODE = "device_timezone_required";
const DAILY_TIME_ZONE_PATHS = new Set([
  "/api/me/today",
  "/api/me/meals/today",
]);

export interface DailyDeviceTimeZoneContext {
  ownerClerkUserId: string;
  timeZone: string;
  request: RequestInit;
  reject: (error: unknown) => boolean;
}

const Context = React.createContext<DailyDeviceTimeZoneContext | null>(null);

export function isDeviceTimeZoneContextError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as {
    status?: unknown;
    data?: { code?: unknown } | null;
  };
  return (
    candidate.status === 400 &&
    candidate.data?.code === DEVICE_TIME_ZONE_REQUIRED_CODE
  );
}

export function dailyDeviceTimeZoneQueryKey(
  base: readonly unknown[],
  context: Pick<DailyDeviceTimeZoneContext, "ownerClerkUserId" | "timeZone">,
): readonly unknown[] {
  return [
    ...base,
    {
      ownerClerkUserId: context.ownerClerkUserId,
      deviceTimeZone: context.timeZone,
    },
  ] as const;
}

export function isDailyDeviceTimeZoneQueryKey(
  queryKey: readonly unknown[],
): boolean {
  return (
    typeof queryKey[0] === "string" && DAILY_TIME_ZONE_PATHS.has(queryKey[0])
  );
}

export function dailyDeviceTimeZoneRequest(timeZone: string): RequestInit {
  return { headers: { [DEVICE_TIME_ZONE_HEADER]: timeZone } };
}

export function DeviceTimeZoneGateProvider({
  ownerClerkUserId,
  timeZone,
  onRejected,
  children,
}: {
  ownerClerkUserId: string;
  timeZone: string;
  onRejected: () => void;
  children: React.ReactNode;
}) {
  const value = React.useMemo<DailyDeviceTimeZoneContext>(() => {
    const request = dailyDeviceTimeZoneRequest(timeZone);
    return {
      ownerClerkUserId,
      timeZone,
      request,
      reject(error: unknown): boolean {
        if (!isDeviceTimeZoneContextError(error)) return false;
        onRejected();
        return true;
      },
    };
  }, [onRejected, ownerClerkUserId, timeZone]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useDeviceTimeZoneGate(): DailyDeviceTimeZoneContext {
  const value = React.useContext(Context);
  if (!value) {
    throw new Error("Daily device timezone gate is unavailable");
  }
  return value;
}
