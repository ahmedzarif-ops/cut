import type { ErrorRequestHandler } from "express";
import { HttpError } from "../lib/httpError";

/**
 * Catch-all error normalizer. Must be registered LAST, after all routes.
 * Express 5 forwards rejected promises from async handlers here automatically,
 * so route handlers can simply `throw` (or call a service that throws).
 *
 * - `HttpError` → its status + message (a deliberate client-facing error).
 * - trusted Express body-parser failures → a generic 400/413 without echoing
 *   parser details or request content.
 * - anything else → logged and returned as a generic 500, never leaking the
 *   underlying message/stack to the client.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  const parserType = (err as { type?: unknown } | null)?.type;
  if (parserType === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  if (parserType === "entity.too.large") {
    res.status(413).json({ error: "Request body too large" });
    return;
  }
  // Health/fitness values can appear inside database error details. Never pass
  // an unknown error object to the logger: Pino would serialize its message,
  // stack, cause, and provider-specific fields. Keep only coarse diagnostic
  // metadata that cannot contain a request body or database row.
  const errorName = err instanceof Error ? err.name : typeof err;
  const candidateCode = (err as { code?: unknown } | null)?.code;
  const errorCode =
    typeof candidateCode === "string" &&
    /^[A-Z0-9_]{1,40}$/i.test(candidateCode)
      ? candidateCode
      : undefined;
  req.log?.error({ errorName, errorCode }, "Unhandled error");
  res.status(500).json({ error: "Internal Server Error" });
};
