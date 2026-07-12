import { describe, it, expect } from "vitest";
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

  it("normalizes an unexpected error to a 500 without leaking its message", () => {
    const res = fakeRes();
    errorHandler(new Error("secret internal detail"), fakeReq, res, noop);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Internal Server Error" });
  });
});
