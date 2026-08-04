export const CLERK_LOADING_TIMEOUT_MS = 15_000;

export type ClerkLaunchPhase = "loading" | "retry" | "loaded";

export interface ClerkLaunchState {
  attempt: number;
  phase: ClerkLaunchPhase;
}

export type ClerkLaunchEvent =
  | { type: "timeout"; attempt: number }
  | { type: "loaded"; attempt: number }
  | { type: "retry" };

export type ClerkLaunchFallback = "loading" | "retry" | null;

export function createClerkLaunchState(): ClerkLaunchState {
  return { attempt: 0, phase: "loading" };
}

/**
 * Keeps launch recovery independent from Clerk's rendered control components.
 * Clerk can internally catch a rejected initialization and render neither its
 * loading nor loaded branch, so CUT OS must own the fallback lifecycle.
 */
export function reduceClerkLaunchState(
  state: ClerkLaunchState,
  event: ClerkLaunchEvent,
): ClerkLaunchState {
  if (event.type === "retry") {
    if (state.phase !== "retry") return state;
    return { attempt: state.attempt + 1, phase: "loading" };
  }

  if (event.attempt !== state.attempt) return state;

  if (event.type === "loaded") {
    return state.phase === "loaded" ? state : { ...state, phase: "loaded" };
  }

  return state.phase === "loading" ? { ...state, phase: "retry" } : state;
}

export function resolveClerkLaunchFallback(
  state: ClerkLaunchState,
): ClerkLaunchFallback {
  if (state.phase === "loaded") return null;
  return state.phase;
}
