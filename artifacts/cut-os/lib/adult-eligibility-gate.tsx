import React from "react";

import type {
  AdultEligibilityResponse,
  AdultEligibilityStatus,
} from "@/lib/adult-eligibility";
import type { DeclaredAgeRangeGateValue } from "@/lib/declared-age-range-gate";

export interface AdultEligibilityGateValue {
  response: AdultEligibilityResponse | null;
  status: AdultEligibilityStatus | null;
  isLoading: boolean;
  error: string | null;
  isRequired: boolean;
  declaredAgeRange: DeclaredAgeRangeGateValue;
  retry(): void;
}

const AdultEligibilityGateContext =
  React.createContext<AdultEligibilityGateValue | null>(null);

export const AdultEligibilityGateProvider =
  AdultEligibilityGateContext.Provider;

export function useAdultEligibilityGate(): AdultEligibilityGateValue {
  const value = React.useContext(AdultEligibilityGateContext);
  if (!value) {
    throw new Error(
      "useAdultEligibilityGate must be used inside AdultEligibilityGateProvider",
    );
  }
  return value;
}
