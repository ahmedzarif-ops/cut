export type CustomFetchOptions = RequestInit & {
  responseType?: "json" | "text" | "blob" | "auto";
};

export type ErrorType<T = unknown> = ApiError<T>;

export type BodyType<T> = T;

export type AuthTokenGetter = () => Promise<string | null> | string | null;
export type GoneResponseHandler = (
  error: ApiError<unknown>,
) => Promise<void> | void;

export const API_REQUEST_TIMEOUT_MS = 20_000;

const NO_BODY_STATUS = new Set([204, 205, 304]);
const DEFAULT_JSON_ACCEPT = "application/json, application/problem+json";

// ---------------------------------------------------------------------------
// Module-level configuration
// ---------------------------------------------------------------------------

let _baseUrl: string | null = null;
let _authTokenGetter: AuthTokenGetter | null = null;
let _goneResponseHandler: GoneResponseHandler | null = null;

export class ApiRequestTimeoutError extends Error {
  readonly name = "ApiRequestTimeoutError";

  constructor() {
    super("The request timed out. Check your connection and try again.");
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

interface RequestDeadline {
  signal: AbortSignal;
  race<T>(operation: PromiseLike<T>): Promise<T>;
  dispose(): void;
}

function createAbortError(): Error {
  const error = new Error("The request was cancelled.");
  error.name = "AbortError";
  return error;
}

/**
 * React Native does not consistently expose AbortSignal.timeout/any. Build a
 * small deadline that combines caller cancellation with an internal timeout,
 * aborts the underlying fetch, and still settles when a transport ignores
 * abort signals.
 */
function createRequestDeadline(
  callerSignals: Array<AbortSignal | null | undefined>,
): RequestDeadline {
  const controller = new AbortController();
  const watchedSignals = Array.from(
    new Set(callerSignals.filter((signal): signal is AbortSignal => !!signal)),
  );
  let rejectBoundary!: (error: Error) => void;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let interrupted = false;
  let disposed = false;
  const boundary = new Promise<never>((_resolve, reject) => {
    rejectBoundary = reject;
  });

  const interrupt = (error: Error) => {
    if (interrupted || disposed) return;
    interrupted = true;
    // Reject first so a timeout remains distinguishable from the AbortError
    // produced when aborting the underlying transport.
    rejectBoundary(error);
    controller.abort();
  };
  const onCallerAbort = () => interrupt(createAbortError());

  for (const signal of watchedSignals) {
    signal.addEventListener("abort", onCallerAbort, { once: true });
  }

  if (watchedSignals.some((signal) => signal.aborted)) {
    onCallerAbort();
  } else {
    timer = setTimeout(
      () => interrupt(new ApiRequestTimeoutError()),
      API_REQUEST_TIMEOUT_MS,
    );
  }

  return {
    signal: controller.signal,
    race<T>(operation: PromiseLike<T>): Promise<T> {
      return Promise.race([Promise.resolve(operation), boundary]);
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      if (timer !== undefined) clearTimeout(timer);
      for (const signal of watchedSignals) {
        signal.removeEventListener("abort", onCallerAbort);
      }
    },
  };
}

/**
 * Set a base URL that is prepended to every relative request URL
 * (i.e. paths that start with `/`).
 *
 * Useful for Expo bundles that need to call a remote API server.
 * Pass `null` to clear the base URL.
 */
export function setBaseUrl(url: string | null): void {
  _baseUrl = url ? url.replace(/\/+$/, "") : null;
}

/**
 * Register a getter that supplies a bearer auth token.  Before every fetch
 * the getter is invoked; when it returns a non-null string, an
 * `Authorization: Bearer <token>` header is attached to the request.
 *
 * Useful for Expo bundles making token-gated API calls.
 * Pass `null` to clear the getter.
 *
 * NOTE: This function should never be used in web applications where session
 * token cookies are automatically associated with API calls by the browser.
 */
export function setAuthTokenGetter(getter: AuthTokenGetter | null): void {
  _authTokenGetter = getter;
}

/**
 * Register a process-wide callback for HTTP 410 responses.
 *
 * The callback is snapshotted synchronously when each request starts. This is
 * important for multi-session clients: a late response issued by user A can
 * invoke only A's callback, never a callback installed later for user B.
 */
export function setGoneResponseHandler(
  handler: GoneResponseHandler | null,
): void {
  _goneResponseHandler = handler;
}

function isRequest(input: RequestInfo | URL): input is Request {
  return typeof Request !== "undefined" && input instanceof Request;
}

function resolveMethod(
  input: RequestInfo | URL,
  explicitMethod?: string,
): string {
  if (explicitMethod) return explicitMethod.toUpperCase();
  if (isRequest(input)) return input.method.toUpperCase();
  return "GET";
}

// Use loose check for URL — some runtimes (e.g. React Native) polyfill URL
// differently, so `instanceof URL` can fail.
function isUrl(input: RequestInfo | URL): input is URL {
  return typeof URL !== "undefined" && input instanceof URL;
}

function applyBaseUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (!_baseUrl) return input;
  const url = resolveUrl(input);
  // Only prepend to relative paths (starting with /)
  if (!url.startsWith("/")) return input;

  const absolute = `${_baseUrl}${url}`;
  if (typeof input === "string") return absolute;
  if (isUrl(input)) return new URL(absolute);
  return new Request(absolute, input as Request);
}

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (isUrl(input)) return input.toString();
  return input.url;
}

function isAllowedAuthenticatedTarget(url: string): boolean {
  if (!_baseUrl) return false;

  try {
    const base = new URL(_baseUrl);
    const target = new URL(url);
    return (
      base.protocol === "https:" &&
      target.protocol === "https:" &&
      target.origin === base.origin
    );
  } catch {
    return false;
  }
}

function assertAllowedAuthenticatedTarget(url: string): void {
  if (!isAllowedAuthenticatedTarget(url)) {
    throw new TypeError(
      "customFetch: refusing to send authorization without a configured, matching HTTPS API origin.",
    );
  }
}

function mergeHeaders(...sources: Array<HeadersInit | undefined>): Headers {
  const headers = new Headers();

  for (const source of sources) {
    if (!source) continue;
    new Headers(source).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  return headers;
}

function getMediaType(headers: Headers): string | null {
  const value = headers.get("content-type");
  return value ? value.split(";", 1)[0].trim().toLowerCase() : null;
}

function isJsonMediaType(mediaType: string | null): boolean {
  return (
    mediaType === "application/json" || Boolean(mediaType?.endsWith("+json"))
  );
}

function isTextMediaType(mediaType: string | null): boolean {
  return Boolean(
    mediaType &&
    (mediaType.startsWith("text/") ||
      mediaType === "application/xml" ||
      mediaType === "text/xml" ||
      mediaType.endsWith("+xml") ||
      mediaType === "application/x-www-form-urlencoded"),
  );
}

// Use strict equality: in browsers, `response.body` is `null` when the
// response genuinely has no content.  In React Native, `response.body` is
// always `undefined` because the ReadableStream API is not implemented —
// even when the response carries a full payload readable via `.text()` or
// `.json()`.  Loose equality (`== null`) matches both `null` and `undefined`,
// which causes every React Native response to be treated as empty.
function hasNoBody(response: Response, method: string): boolean {
  if (method === "HEAD") return true;
  if (NO_BODY_STATUS.has(response.status)) return true;
  if (response.headers.get("content-length") === "0") return true;
  if (response.body === null) return true;
  return false;
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function looksLikeJson(text: string): boolean {
  const trimmed = text.trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function getStringField(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object") return undefined;

  const candidate = (value as Record<string, unknown>)[key];
  if (typeof candidate !== "string") return undefined;

  const trimmed = candidate.trim();
  return trimmed === "" ? undefined : trimmed;
}

function truncate(text: string, maxLength = 300): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function buildErrorMessage(response: Response, data: unknown): string {
  const prefix = `HTTP ${response.status} ${response.statusText}`;

  if (typeof data === "string") {
    const text = data.trim();
    return text ? `${prefix}: ${truncate(text)}` : prefix;
  }

  const title = getStringField(data, "title");
  const detail = getStringField(data, "detail");
  const message =
    getStringField(data, "message") ??
    getStringField(data, "error_description") ??
    getStringField(data, "error");

  if (title && detail) return `${prefix}: ${title} — ${detail}`;
  if (detail) return `${prefix}: ${detail}`;
  if (message) return `${prefix}: ${message}`;
  if (title) return `${prefix}: ${title}`;

  return prefix;
}

export class ApiError<T = unknown> extends Error {
  readonly name = "ApiError";
  readonly status: number;
  readonly statusText: string;
  readonly data: T | null;
  readonly headers: Headers;
  readonly response: Response;
  readonly method: string;
  readonly url: string;

  constructor(
    response: Response,
    data: T | null,
    requestInfo: { method: string; url: string },
  ) {
    super(buildErrorMessage(response, data));
    Object.setPrototypeOf(this, new.target.prototype);

    this.status = response.status;
    this.statusText = response.statusText;
    this.data = data;
    this.headers = response.headers;
    this.response = response;
    this.method = requestInfo.method;
    this.url = response.url || requestInfo.url;
  }
}

export class ResponseParseError extends Error {
  readonly name = "ResponseParseError";
  readonly status: number;
  readonly statusText: string;
  readonly method: string;

  constructor(
    response: Response,
    requestInfo: { method: string; url: string },
  ) {
    super(
      `Failed to parse the server response (${response.status} ${response.statusText}) as JSON`,
    );
    Object.setPrototypeOf(this, new.target.prototype);

    this.status = response.status;
    this.statusText = response.statusText;
    this.method = requestInfo.method;
  }
}

async function parseJsonBody(
  response: Response,
  requestInfo: { method: string; url: string },
): Promise<unknown> {
  const raw = await response.text();
  const normalized = stripBom(raw);

  if (normalized.trim() === "") {
    return null;
  }

  try {
    return JSON.parse(normalized);
  } catch {
    // Do not retain the raw body, Response, headers, URL, or parser cause on
    // the thrown object. A malformed success payload can contain weight,
    // nutrition, or account data and may otherwise survive in query/error
    // state or a future crash report.
    throw new ResponseParseError(response, requestInfo);
  }
}

async function parseErrorBody(
  response: Response,
  method: string,
): Promise<unknown> {
  if (hasNoBody(response, method)) {
    return null;
  }

  const mediaType = getMediaType(response.headers);

  // Fall back to text when blob() is unavailable (e.g. some React Native builds).
  if (mediaType && !isJsonMediaType(mediaType) && !isTextMediaType(mediaType)) {
    return typeof response.blob === "function"
      ? response.blob()
      : response.text();
  }

  const raw = await response.text();
  const normalized = stripBom(raw);
  const trimmed = normalized.trim();

  if (trimmed === "") {
    return null;
  }

  if (isJsonMediaType(mediaType) || looksLikeJson(normalized)) {
    try {
      return JSON.parse(normalized);
    } catch {
      return raw;
    }
  }

  return raw;
}

function inferResponseType(response: Response): "json" | "text" | "blob" {
  const mediaType = getMediaType(response.headers);

  if (isJsonMediaType(mediaType)) return "json";
  if (isTextMediaType(mediaType) || mediaType == null) return "text";
  return "blob";
}

async function parseSuccessBody(
  response: Response,
  responseType: "json" | "text" | "blob" | "auto",
  requestInfo: { method: string; url: string },
): Promise<unknown> {
  if (hasNoBody(response, requestInfo.method)) {
    // Generated no-content operations are typed as `void`. Resolve them to
    // JavaScript's absence value rather than `null`, which is a distinct value
    // and violates that contract at runtime.
    return undefined;
  }

  const effectiveType =
    responseType === "auto" ? inferResponseType(response) : responseType;

  switch (effectiveType) {
    case "json":
      return parseJsonBody(response, requestInfo);

    case "text": {
      const text = await response.text();
      return text === "" ? null : text;
    }

    case "blob":
      if (typeof response.blob !== "function") {
        throw new TypeError(
          "Blob responses are not supported in this runtime. " +
            'Use responseType "json" or "text" instead.',
        );
      }
      return response.blob();
  }
}

export async function customFetch<T = unknown>(
  input: RequestInfo | URL,
  options: CustomFetchOptions = {},
): Promise<T> {
  const goneResponseHandler = _goneResponseHandler;
  const authTokenGetter = _authTokenGetter;
  input = applyBaseUrl(input);
  const { responseType = "auto", headers: headersInit, ...init } = options;

  const method = resolveMethod(input, init.method);

  if (init.body != null && (method === "GET" || method === "HEAD")) {
    throw new TypeError(`customFetch: ${method} requests cannot have a body.`);
  }

  const headers = mergeHeaders(
    isRequest(input) ? input.headers : undefined,
    headersInit,
  );

  if (
    typeof init.body === "string" &&
    !headers.has("content-type") &&
    looksLikeJson(init.body)
  ) {
    headers.set("content-type", "application/json");
  }

  if (responseType === "json" && !headers.has("accept")) {
    headers.set("accept", DEFAULT_JSON_ACCEPT);
  }

  const requestInfo = { method, url: resolveUrl(input) };

  // Validate explicit authorization before starting any request work.
  if (headers.has("authorization")) {
    assertAllowedAuthenticatedTarget(requestInfo.url);
  }

  const deadline = createRequestDeadline([
    init.signal,
    isRequest(input) ? input.signal : undefined,
  ]);
  try {
    // Attach bearer token when an auth getter is configured and no
    // Authorization header has been explicitly provided. The deadline also
    // bounds custom getters; the Expo getter retains its own shorter timeout.
    if (!headers.has("authorization") && authTokenGetter) {
      const token = await deadline.race(
        Promise.resolve().then(() => authTokenGetter()),
      );
      if (token) {
        assertAllowedAuthenticatedTarget(requestInfo.url);
        headers.set("authorization", `Bearer ${token}`);
      }
    }

    const response = await deadline.race(
      Promise.resolve().then(() =>
        fetch(input, { ...init, method, headers, signal: deadline.signal }),
      ),
    );

    if (!response.ok) {
      const errorData = await deadline.race(parseErrorBody(response, method));
      const error = new ApiError(response, errorData, requestInfo);
      if (response.status === 410 && goneResponseHandler) {
        try {
          void Promise.resolve(goneResponseHandler(error)).catch(
            () => undefined,
          );
        } catch {
          // Response handling must never replace the transport's original error.
        }
      }
      throw error;
    }

    return (await deadline.race(
      parseSuccessBody(response, responseType, requestInfo),
    )) as T;
  } finally {
    deadline.dispose();
  }
}
