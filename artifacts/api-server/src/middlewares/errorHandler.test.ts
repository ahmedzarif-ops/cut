import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import { errorHandler } from "./errorHandler";
import { HttpError } from "../lib/httpError";

function fakeRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

const fakeReq = { log: { error: () => {} } } as unknown as Request;
const noop = () => {};

describe("errorHandler", () => {
  it("maps an HttpError to its status and message", () => {
    const res = fakeRes();
    errorHandler(new HttpError(400, "Invalid timezone"), fakeReq, res, noop);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Invalid timezone" });
  });

  it("normalizes body-parser syntax and size failures without reporting 500", () => {
    const invalidJson = fakeRes();
    errorHandler(
      Object.assign(new SyntaxError("private malformed body"), {
        type: "entity.parse.failed",
      }),
      fakeReq,
      invalidJson,
      noop,
    );
    expect(invalidJson.statusCode).toBe(400);
    expect(invalidJson.body).toEqual({ error: "Invalid request body" });

    const tooLarge = fakeRes();
    errorHandler(
      { type: "entity.too.large", body: "private oversized body" },
      fakeReq,
      tooLarge,
      noop,
    );
    expect(tooLarge.statusCode).toBe(413);
    expect(tooLarge.body).toEqual({ error: "Request body too large" });
  });

  it("normalizes an unexpected error to a 500 without leaking its message", () => {
    const res = fakeRes();
    const error = Object.assign(
      new Error("weight=91.2; calories=610; secret internal detail"),
      { code: "23514", detail: "meal row contains private nutrition" },
    );
    const logError = vi.fn();
    const privateReq = {
      log: { error: logError },
      body: { weightKg: 91.2, caloriesKcal: 610 },
    } as unknown as Request;

    errorHandler(error, privateReq, res, noop);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Internal Server Error" });
    expect(logError).toHaveBeenCalledWith(
      { errorName: "Error", errorCode: "23514" },
      "Unhandled error",
    );
    expect(JSON.stringify(logError.mock.calls)).not.toContain("91.2");
    expect(JSON.stringify(logError.mock.calls)).not.toContain("610");
    expect(JSON.stringify(logError.mock.calls)).not.toContain(
      "private nutrition",
    );
  });
});
