import { describe, expect, it } from "vitest";

import { parseBoundedInteger } from "./boundedInteger";

const options = { minimum: 1, maximum: 100, defaultValue: 30 };

describe("bounded integer configuration", () => {
  it("uses the trusted default only when the override is absent", () => {
    expect(parseBoundedInteger(undefined, options)).toBe(30);
  });

  it.each([
    ["1", 1],
    ["30", 30],
    ["100", 100],
  ])("accepts canonical in-range value %s", (value, expected) => {
    expect(parseBoundedInteger(value, options)).toBe(expected);
  });

  it.each([
    "",
    " ",
    "01",
    "0",
    "-1",
    "1.5",
    "NaN",
    "101",
    "999999999999999999999",
  ])("rejects malformed or out-of-range value %s", (value) => {
    expect(parseBoundedInteger(value, options)).toBeNull();
  });
});
