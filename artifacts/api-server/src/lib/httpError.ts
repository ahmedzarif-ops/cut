/**
 * An error that carries an HTTP status code. Services throw it to signal a
 * client-facing failure (e.g. 400 for bad input); the error middleware maps it
 * to `res.status(statusCode).json({ error: message })`. Any error that is NOT
 * an HttpError is treated as unexpected and normalized to a 500.
 */
export class HttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}
