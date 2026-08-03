import {
  API_REQUEST_TIMEOUT_MS,
  ApiRequestTimeoutError,
  customFetch,
  deleteMe,
  getMe,
  setBaseUrl,
  setAuthTokenGetter,
  setGoneResponseHandler,
} from "@workspace/api-client-react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  setBaseUrl(null);
  setAuthTokenGetter(null);
  setGoneResponseHandler(null);
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("API client principal isolation", () => {
  it("resolves a typed 204 response as undefined", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 204 })),
    );

    await expect(deleteMe()).resolves.toBeUndefined();
  });

  it("never overwrites an explicit captured Authorization header", async () => {
    const globalTokenGetter = vi.fn(async () => "token-for-user-b");
    const fetchMock = vi.fn(async (_input: unknown, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("authorization")).toBe(
        "Bearer token-for-user-a",
      );
      return new Response(null, { status: 204 });
    });
    setBaseUrl("https://api.example.com");
    setAuthTokenGetter(globalTokenGetter);
    vi.stubGlobal("fetch", fetchMock);

    await deleteMe({
      headers: { Authorization: "Bearer token-for-user-a" },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(globalTokenGetter).not.toHaveBeenCalled();
  });

  it("never sends a bearer token to an unresolved relative API URL", async () => {
    const fetchMock = vi.fn();
    setAuthTokenGetter(async () => "token-for-user-a");
    vi.stubGlobal("fetch", fetchMock);

    await expect(getMe()).rejects.toThrow(/matching HTTPS API origin/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends a bearer token only after resolving the configured HTTPS API", async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        expect(input.toString()).toBe("https://api.example.com/api/me");
        expect(new Headers(init?.headers).get("authorization")).toBe(
          "Bearer token-for-user-a",
        );
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    );
    setBaseUrl("https://api.example.com");
    setAuthTokenGetter(async () => "token-for-user-a");
    vi.stubGlobal("fetch", fetchMock);

    await getMe();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each([
    "https://other.example.com/api/me",
    "http://api.example.com/api/me",
  ])(
    "rejects explicit authorization for an unsafe absolute target: %s",
    async (target) => {
      const fetchMock = vi.fn();
      setBaseUrl("https://api.example.com");
      vi.stubGlobal("fetch", fetchMock);

      await expect(
        customFetch(target, {
          headers: { Authorization: "Bearer caller-provided-token" },
        }),
      ).rejects.toThrow(/matching HTTPS API origin/i);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("uses the snapshotted 410 handler instead of a later principal handler", async () => {
    const response = deferred<Response>();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => response.promise),
    );
    const userAHandler = vi.fn();
    const userBHandler = vi.fn();

    setGoneResponseHandler(userAHandler);
    const requestForUserA = getMe();
    setGoneResponseHandler(userBHandler);
    response.resolve(goneResponse());

    await expect(requestForUserA).rejects.toMatchObject({ status: 410 });
    expect(userAHandler).toHaveBeenCalledOnce();
    expect(userBHandler).not.toHaveBeenCalled();
  });

  it("rejects the original 410 without waiting for an async handler", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => goneResponse()),
    );
    setGoneResponseHandler(() => new Promise<void>(() => undefined));

    const outcome = await Promise.race([
      getMe().then(
        () => "resolved",
        (error: unknown) =>
          typeof error === "object" &&
          error !== null &&
          "status" in error &&
          error.status === 410
            ? "rejected-410"
            : "rejected-other",
      ),
      new Promise<string>((resolve) =>
        setTimeout(() => resolve("timed-out"), 100),
      ),
    ]);

    expect(outcome).toBe("rejected-410");
  });

  it("fails a stalled request at a bounded deadline without exposing its target", async () => {
    vi.useFakeTimers();
    let transportSignal: AbortSignal | null | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
        transportSignal = init?.signal;
        return new Promise<Response>(() => undefined);
      }),
    );

    const request = customFetch("https://api.example.com/private-value", {
      responseType: "json",
    });
    const rejection = request.catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(API_REQUEST_TIMEOUT_MS);
    const error = await rejection;

    expect(error).toBeInstanceOf(ApiRequestTimeoutError);
    expect((error as Error).message).toBe(
      "The request timed out. Check your connection and try again.",
    );
    expect((error as Error).message).not.toContain("private-value");
    expect(transportSignal?.aborted).toBe(true);
  });

  it("preserves caller cancellation even when the transport never settles", async () => {
    let transportSignal: AbortSignal | null | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
        transportSignal = init?.signal;
        return new Promise<Response>(() => undefined);
      }),
    );
    const caller = new AbortController();

    const request = customFetch("https://api.example.com/api/me", {
      signal: caller.signal,
    });
    caller.abort();

    await expect(request).rejects.toMatchObject({ name: "AbortError" });
    expect(transportSignal?.aborted).toBe(true);
  });

  it("applies the same deadline while waiting for a stalled response body", async () => {
    vi.useFakeTimers();
    const body = new Promise<string>(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const response = new Response("{}", {
          status: 200,
          headers: { "content-type": "application/json" },
        });
        return Object.assign(response, { text: () => body });
      }),
    );

    const request = customFetch("https://api.example.com/api/me", {
      responseType: "json",
    });
    const rejection = request.catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(API_REQUEST_TIMEOUT_MS);

    await expect(rejection).resolves.toBeInstanceOf(ApiRequestTimeoutError);
  });
});

function goneResponse(): Response {
  return new Response(JSON.stringify({ detail: "Account deletion pending" }), {
    status: 410,
    statusText: "Gone",
    headers: { "content-type": "application/problem+json" },
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}
