import { describe, it, expect } from "vitest";
import { isValidTimeZone } from "./timeZone";

describe("isValidTimeZone", () => {
  it("accepts real IANA zones, including UTC and aliases", () => {
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Etc/UTC")).toBe(true);
    expect(isValidTimeZone("America/Chicago")).toBe(true);
    expect(isValidTimeZone("Asia/Dhaka")).toBe(true);
    expect(isValidTimeZone("Asia/Calcutta")).toBe(true);
  });

  it("rejects empty and garbage values", () => {
    expect(isValidTimeZone("")).toBe(false);
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    expect(isValidTimeZone("Mars/Phobos")).toBe(false);
  });
});
