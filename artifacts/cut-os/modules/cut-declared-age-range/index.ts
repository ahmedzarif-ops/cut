import { requireOptionalNativeModule } from "expo";

export interface NativeDeclaredAgeRangeStatus {
  supported: boolean;
  isEligibleForAgeFeatures: boolean;
  requiredFeatures: string[];
}

export type NativeDeclaredAgeRangeResponse =
  | { status: "declined" }
  | {
      status: "sharing";
      lowerBound: number | null;
      upperBound: number | null;
    };

interface CutDeclaredAgeRangeNativeModule {
  getStatusAsync(): Promise<NativeDeclaredAgeRangeStatus>;
  requestAdultAgeRangeAsync(): Promise<NativeDeclaredAgeRangeResponse>;
}

const nativeModule =
  requireOptionalNativeModule<CutDeclaredAgeRangeNativeModule>(
    "CutDeclaredAgeRange",
  );

export function getNativeDeclaredAgeRangeModule(): CutDeclaredAgeRangeNativeModule | null {
  return nativeModule;
}
