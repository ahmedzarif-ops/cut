import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { describe, expect, it } from "vitest";
const source = readFileSync(new URL("../../app/(app)/photo-estimate.tsx", import.meta.url), "utf8");
describe("Photo estimate UI boundary", () => {
  it("gates capture and transfer to Pro, including direct navigation", () => {
    expect(source).toContain('!subscription.isEntitled');
    expect(source).toContain('Photo analysis is a DawatFit Pro feature.');
    expect(source).toContain('if (lock.current || !photo || !subscription.isEntitled) return');
    expect(source).toContain('if (lock.current || !ready || !subscription.isEntitled) return');
  });
  it("requires a separate consent action, avoids automatic logging, and clears local camera files", () => {
    expect(source).toContain('Send photo for estimate');
    expect(source).toContain('consent: true');
    expect(source).toMatch(/CUT\s+and OpenAI/);
    expect(source).toContain('FileSystem.deleteAsync');
    expect(source).toContain('Review and edit before logging');
    expect(source).toContain('mode: "photo"');
    expect(source).not.toMatch(/useCreateMyFoodEntry|createMyMealEntry/);
  });
  it("aborts transfer on unmount or owner/entitlement change and hides stale results", () => {
    expect(source).toContain('abort.current?.abort()');
    expect(source).toContain('currentPrincipal.current === owner');
    expect(source).toContain('!controller.signal.aborted');
  });
});
