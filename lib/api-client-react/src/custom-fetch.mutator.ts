import {
  customFetch as executeCustomFetch,
  type CustomFetchOptions,
} from "./custom-fetch";
import type {
  BodyType as TransportBodyType,
  ErrorType as TransportErrorType,
} from "./custom-fetch";

export type ErrorType<T = unknown> = TransportErrorType<T>;
export type BodyType<T> = TransportBodyType<T>;

// Orval statically inspects its mutator file. Keep this adapter deliberately
// small so code generation does not need to parse the full transport module.
export function customFetch<T = unknown>(
  input: RequestInfo | URL,
  options: CustomFetchOptions = {},
): Promise<T> {
  return executeCustomFetch<T>(input, options);
}
