import { describe, expect, it } from "vitest";

import {
  createClerkLaunchState,
  reduceClerkLaunchState,
  resolveClerkLaunchFallback,
  resolveClerkLaunchStatusBarStyle,
  type ClerkLaunchState,
} from "../clerk-launch-state";

describe("Clerk launch state", () => {
  it("keeps an app-owned loading fallback visible before Clerk loads", () => {
    const state = createClerkLaunchState();

    expect(resolveClerkLaunchFallback(state)).toBe("loading");
  });

  it("turns a loading timeout into visible recovery UI", () => {
    const initial = createClerkLaunchState();
    const timedOut = reduceClerkLaunchState(initial, {
      type: "timeout",
      attempt: initial.attempt,
    });

    expect(timedOut).toEqual({ attempt: 0, phase: "retry" });
    expect(resolveClerkLaunchFallback(timedOut)).toBe("retry");
  });

  it("increments the provider attempt and restores loading on retry", () => {
    const timedOut: ClerkLaunchState = { attempt: 2, phase: "retry" };
    const retrying = reduceClerkLaunchState(timedOut, { type: "retry" });

    expect(retrying).toEqual({ attempt: 3, phase: "loading" });
    expect(resolveClerkLaunchFallback(retrying)).toBe("loading");
  });

  it("ignores stale timeout and loaded signals from an earlier provider", () => {
    const current: ClerkLaunchState = { attempt: 3, phase: "loading" };

    expect(
      reduceClerkLaunchState(current, { type: "timeout", attempt: 2 }),
    ).toBe(current);
    expect(
      reduceClerkLaunchState(current, { type: "loaded", attempt: 2 }),
    ).toBe(current);
  });

  it("removes the fallback only after the current loaded branch is visible", () => {
    const loading: ClerkLaunchState = { attempt: 1, phase: "loading" };
    const loaded = reduceClerkLaunchState(loading, {
      type: "loaded",
      attempt: loading.attempt,
    });

    expect(loaded).toEqual({ attempt: 1, phase: "loaded" });
    expect(resolveClerkLaunchFallback(loaded)).toBeNull();
  });

  it("never models a blank root when Clerk renders no branch after a rejection", () => {
    const loading = createClerkLaunchState();
    const timedOut = reduceClerkLaunchState(loading, {
      type: "timeout",
      attempt: loading.attempt,
    });
    const loaded: ClerkLaunchState = { attempt: 0, phase: "loaded" };

    for (const state of [loading, timedOut, loaded]) {
      const hasFallback = resolveClerkLaunchFallback(state) !== null;
      const hasLoadedApp = state.phase === "loaded";
      expect(hasFallback || hasLoadedApp).toBe(true);
    }
  });

  it("keeps dark launch fallbacks legible and follows appearance once loaded", () => {
    expect(resolveClerkLaunchStatusBarStyle("loading")).toBe("light");
    expect(resolveClerkLaunchStatusBarStyle("retry")).toBe("light");
    expect(resolveClerkLaunchStatusBarStyle(null)).toBe("auto");
  });
});
