import { describe, expect, it, vi } from "vitest";

import {
  getEasBuildPreInstallSteps,
  runEasBuildPreInstall,
} from "../scripts/eas-build-pre-install.mjs";

describe("EAS pre-install release gate", () => {
  it.each(["development", "preview"])(
    "runs only release configuration for %s",
    (profile) => {
      const { steps } = getEasBuildPreInstallSteps({
        EAS_BUILD_PROFILE: profile,
      });
      expect(steps.map(({ name }) => name)).toEqual(["release configuration"]);
    },
  );

  it.each(["production", undefined])(
    "adds local and live legal verification for %s",
    (profile) => {
      const { steps } = getEasBuildPreInstallSteps({
        EAS_BUILD_PROFILE: profile,
      });
      expect(steps.map(({ name }) => name)).toEqual([
        "release configuration",
        "approved legal source",
        "live legal site",
      ]);
    },
  );

  it("runs checks in order and stops at the first failure", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const runStep = vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(1);

    expect(
      runEasBuildPreInstall({
        environment: { EAS_BUILD_PROFILE: "production" },
        runStep,
      }),
    ).toBe(1);
    expect(runStep.mock.calls.map(([step]) => step.name)).toEqual([
      "release configuration",
      "approved legal source",
    ]);
    expect(error).toHaveBeenCalledWith(
      "EAS pre-install failed at approved legal source.",
    );
    error.mockRestore();
  });
});
