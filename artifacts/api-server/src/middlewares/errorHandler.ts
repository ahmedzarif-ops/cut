import type { ErrorRequestHandler } from "express";
import { HttpError } from "../lib/httpError";

/**
 * Catch-all error normalizer. Must be registered LAST, after all routes.
 * Express 5 forwards rejected promises from async handlers here automatically,
 * so route handlers can simply `throw` (or call a service that throws).
 *
 * - `HttpError` → its status + message (a deliberate client-facing error).
 * - anything else → logged and returned as a generic 500, never leaking the
 *   underlying message/stack to the client.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  req.log?.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal Server Error" });
};
