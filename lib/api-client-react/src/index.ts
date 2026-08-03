export * from "./generated/api";
export * from "./generated/api.schemas";
export {
  setBaseUrl,
  setAuthTokenGetter,
  setGoneResponseHandler,
} from "./custom-fetch";
export type { AuthTokenGetter, GoneResponseHandler } from "./custom-fetch";
