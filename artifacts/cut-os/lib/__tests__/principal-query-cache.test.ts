import { describe, expect, it, vi } from "vitest";

import { transitionPrincipalQueryCache } from "../principal-query-cache";

function createCache() {
  return {
    cancelQueries: vi.fn(async () => undefined),
    clear: vi.fn(),
  };
}

describe("transitionPrincipalQueryCache", () => {
  it("retains verified query state across route remounts for one principal", () => {
    const cache = createCache();

    expect(transitionPrincipalQueryCache(cache, "principal-a")).toBe(true);
    expect(transitionPrincipalQueryCache(cache, "principal-a")).toBe(false);

    expect(cache.cancelQueries).toHaveBeenCalledOnce();
    expect(cache.clear).toHaveBeenCalledOnce();
  });

  it("clears before a different user or session can claim the cache", () => {
    const cache = createCache();

    transitionPrincipalQueryCache(cache, "principal-a:session-1");
    expect(transitionPrincipalQueryCache(cache, "principal-a:session-2")).toBe(
      true,
    );
    expect(transitionPrincipalQueryCache(cache, "principal-b:session-1")).toBe(
      true,
    );

    expect(cache.cancelQueries).toHaveBeenCalledTimes(3);
    expect(cache.clear).toHaveBeenCalledTimes(3);
  });

  it("clears retained private state when the principal signs out", () => {
    const cache = createCache();

    transitionPrincipalQueryCache(cache, "principal-a");
    expect(transitionPrincipalQueryCache(cache, null)).toBe(true);
    expect(transitionPrincipalQueryCache(cache, null)).toBe(false);

    expect(cache.cancelQueries).toHaveBeenCalledTimes(2);
    expect(cache.clear).toHaveBeenCalledTimes(2);
  });
});
