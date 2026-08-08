import type {
  NativeDeclaredAgeRangeResponse,
  NativeDeclaredAgeRangeStatus,
} from "@/modules/cut-declared-age-range";

export const DECLARED_AGE_RANGE_REQUIRED_FEATURE =
  "declaredAgeRangeRequired" as const;

export type DeclaredAgeRangeGateStatus =
  | "idle"
  | "checking"
  | "not_required"
  | "required"
  | "verified_adult"
  | "ineligible"
  | "declined"
  | "error";

export function resolveDeclaredAgeRangeRequirement(
  value: NativeDeclaredAgeRangeStatus,
): "not_required" | "required" {
  if (
    typeof value.supported !== "boolean" ||
    typeof value.isEligibleForAgeFeatures !== "boolean" ||
    !Array.isArray(value.requiredFeatures) ||
    value.requiredFeatures.some((feature) => typeof feature !== "string")
  ) {
    throw new Error("Apple returned an invalid age-range requirement.");
  }

  if (!value.supported || !value.isEligibleForAgeFeatures) {
    return "not_required";
  }
  return value.requiredFeatures.includes(DECLARED_AGE_RANGE_REQUIRED_FEATURE)
    ? "required"
    : "not_required";
}

export function resolveAdultAgeRangeResponse(
  value: NativeDeclaredAgeRangeResponse,
): "verified_adult" | "ineligible" | "declined" {
  if (value.status === "declined") return "declined";
  if (value.status !== "sharing") {
    throw new Error("Apple returned an invalid age-range response.");
  }

  const { lowerBound, upperBound } = value;
  const validBound = (bound: unknown): bound is number | null =>
    bound === null ||
    (typeof bound === "number" && Number.isInteger(bound) && bound >= 0);
  if (!validBound(lowerBound) || !validBound(upperBound)) {
    throw new Error("Apple returned invalid age-range bounds.");
  }
  if (lowerBound !== null && upperBound !== null && lowerBound > upperBound) {
    throw new Error("Apple returned contradictory age-range bounds.");
  }

  if (lowerBound !== null && lowerBound >= 18) return "verified_adult";
  if (upperBound !== null && upperBound < 18) return "ineligible";
  throw new Error("Apple returned an ambiguous adult age range.");
}

export function declaredAgeRangeAllowsPrivateAccess(
  status: DeclaredAgeRangeGateStatus,
): boolean {
  return status === "not_required" || status === "verified_adult";
}
