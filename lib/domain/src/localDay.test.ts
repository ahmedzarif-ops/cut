import { describe, it, expect } from "vitest";
import { localDayKey, todayKey } from "./localDay";
import type { Clock } from "./clock";

describe("localDayKey", () => {
  it("resolves the local calendar day per time zone", () => {
    // 02:00 UTC on the 12th is still the 11th in LA, already the 12th in Dhaka.
    const instant = new Date("2026-07-12T02:00:00Z");
    expect(localDayKey(instant, "America/Los_Angeles")).toBe("2026-07-11");
    expect(localDayKey(instant, "Asia/Dhaka")).toBe("2026-07-12");
    expect(localDayKey(instant, "UTC")).toBe("2026-07-12");
  });

  it("is stable for a midday instant across zones", () => {
    const noonUtc = new Date("2026-07-12T12:00:00Z");
    expect(localDayKey(noonUtc, "Asia/Dhaka")).toBe("2026-07-12");
    expect(localDayKey(noonUtc, "America/Los_Angeles")).toBe("2026-07-12");
  });

  it("throws RangeError on an unknown time zone", () => {
    expect(() => localDayKey(new Date(), "Not/AZone")).toThrow(RangeError);
  });
});

describe("todayKey", () => {
  it("composes localDayKey with an injected clock (deterministic)", () => {
    const fixed: Clock = { now: () => new Date("2026-07-12T02:00:00Z") };
    expect(todayKey(fixed, "America/Los_Angeles")).toBe("2026-07-11");
    expect(todayKey(fixed, "Asia/Dhaka")).toBe("2026-07-12");
  });
});
