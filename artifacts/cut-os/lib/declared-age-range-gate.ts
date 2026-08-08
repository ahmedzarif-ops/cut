import React from "react";
import { Platform } from "react-native";

import {
  declaredAgeRangeAllowsPrivateAccess,
  resolveAdultAgeRangeResponse,
  resolveDeclaredAgeRangeRequirement,
  type DeclaredAgeRangeGateStatus,
} from "@/lib/declared-age-range";
import { getNativeDeclaredAgeRangeModule } from "@/modules/cut-declared-age-range";

export interface DeclaredAgeRangeGateValue {
  status: DeclaredAgeRangeGateStatus;
  isLoading: boolean;
  isRequesting: boolean;
  error: string | null;
  allowsPrivateAccess: boolean;
  requiredFeatures: readonly string[];
  retry(): void;
  requestAdultAgeRange(): Promise<void>;
}

const INSPECTION_ERROR =
  "CUT OS couldn't verify Apple's age requirement. Health and nutrition features remain locked.";
const REQUEST_ERROR =
  "CUT OS couldn't complete Apple's age check. Try again; private health and nutrition features remain locked.";

export function useDeclaredAgeRangeGate(input: {
  enabled: boolean;
  principalId: string | null;
}): DeclaredAgeRangeGateValue {
  const [status, setStatus] =
    React.useState<DeclaredAgeRangeGateStatus>("idle");
  const [requiredFeatures, setRequiredFeatures] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [isRequesting, setIsRequesting] = React.useState(false);
  const [retryToken, setRetryToken] = React.useState(0);
  const activePrincipal = React.useRef(input.principalId);
  activePrincipal.current = input.principalId;

  React.useEffect(() => {
    const owner = input.principalId;
    if (!input.enabled || !owner) {
      setStatus("idle");
      setRequiredFeatures([]);
      setError(null);
      setIsRequesting(false);
      return;
    }

    if (Platform.OS !== "ios") {
      setStatus("not_required");
      setRequiredFeatures([]);
      setError(null);
      return;
    }

    const module = getNativeDeclaredAgeRangeModule();
    if (!module) {
      setStatus("error");
      setRequiredFeatures([]);
      setError(INSPECTION_ERROR);
      return;
    }

    let active = true;
    setStatus("checking");
    setRequiredFeatures([]);
    setError(null);
    void module
      .getStatusAsync()
      .then((value) => {
        if (!active || activePrincipal.current !== owner) return;
        setRequiredFeatures([...value.requiredFeatures]);
        setStatus(resolveDeclaredAgeRangeRequirement(value));
      })
      .catch(() => {
        if (!active || activePrincipal.current !== owner) return;
        setStatus("error");
        setRequiredFeatures([]);
        setError(INSPECTION_ERROR);
      });

    return () => {
      active = false;
    };
  }, [input.enabled, input.principalId, retryToken]);

  const requestAdultAgeRange = React.useCallback(async () => {
    const owner = input.principalId;
    if (
      !input.enabled ||
      !owner ||
      (status !== "required" && status !== "declined") ||
      isRequesting
    ) {
      return;
    }

    const module = getNativeDeclaredAgeRangeModule();
    if (!module) {
      setStatus("error");
      setError(INSPECTION_ERROR);
      return;
    }

    setIsRequesting(true);
    setError(null);
    try {
      const value = await module.requestAdultAgeRangeAsync();
      if (activePrincipal.current !== owner) return;
      setStatus(resolveAdultAgeRangeResponse(value));
    } catch {
      if (activePrincipal.current !== owner) return;
      setStatus("required");
      setError(REQUEST_ERROR);
    } finally {
      if (activePrincipal.current === owner) setIsRequesting(false);
    }
  }, [input.enabled, input.principalId, isRequesting, status]);

  return {
    status,
    isLoading: status === "checking" || status === "idle",
    isRequesting,
    error,
    allowsPrivateAccess: declaredAgeRangeAllowsPrivateAccess(status),
    requiredFeatures,
    retry: () => setRetryToken((value) => value + 1),
    requestAdultAgeRange,
  };
}
