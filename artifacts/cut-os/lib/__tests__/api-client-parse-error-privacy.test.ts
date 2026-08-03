import {
  customFetch,
  setAuthTokenGetter,
  setBaseUrl,
} from "@workspace/api-client-react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  setBaseUrl(null);
  setAuthTokenGetter(null);
  vi.unstubAllGlobals();
});

describe("API parse-error privacy", () => {
  it("does not retain a malformed response body, headers, URL, or cause", async () => {
    const sensitiveBody =
      '{"weightKg":91.7,"meal":"private meal","email":"person@example.com"';
    setBaseUrl("https://api.example.com");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(sensitiveBody, {
          status: 200,
          headers: {
            "content-type": "application/json",
            "x-private-debug": "do-not-retain",
          },
        }),
      ),
    );

    const error = await customFetch("/api/me/today", {
      responseType: "json",
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      name: "ResponseParseError",
      status: 200,
      method: "GET",
    });
    expect(Object.keys(error as object)).not.toEqual(
      expect.arrayContaining([
        "rawBody",
        "headers",
        "response",
        "url",
        "cause",
      ]),
    );
    expect(String(error)).not.toContain("91.7");
    expect(String(error)).not.toContain("private meal");
    expect(String(error)).not.toContain("person@example.com");
    expect(String(error)).not.toContain("api.example.com");
  });
});
