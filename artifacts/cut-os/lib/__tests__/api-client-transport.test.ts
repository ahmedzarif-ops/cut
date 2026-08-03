import {
  deleteMe,
  getMe,
  setAuthTokenGetter,
  setGoneResponseHandler,
} from "@workspace/api-client-react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  setAuthTokenGetter(null);
  setGoneResponseHandler(null);
  vi.unstubAllGlobals();
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
    setAuthTokenGetter(globalTokenGetter);
    vi.stubGlobal("fetch", fetchMock);

    await deleteMe({
      headers: { Authorization: "Bearer token-for-user-a" },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(globalTokenGetter).not.toHaveBeenCalled();
  });

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
