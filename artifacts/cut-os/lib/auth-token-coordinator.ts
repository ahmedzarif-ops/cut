import type {
  AuthTokenGetter,
  AuthTokenGetterOptions,
} from "@workspace/api-client-react";

const DEFAULT_TOKEN_REUSE_MS = 10_000;

type ProviderTokenGetter = AuthTokenGetter;
type ForceRefreshPreparation = () => Promise<void> | void;

interface CachedToken {
  token: string;
  reusableUntilMs: number;
}

/**
 * Serializes Clerk token reads and briefly reuses one in-memory token across
 * the parallel startup gates. Native client synchronization can otherwise
 * rotate Clerk's device state between adjacent requests and issue a token the
 * backend cannot yet verify. Nothing is persisted, decoded, or logged.
 */
export class AuthTokenCoordinator {
  private cached: CachedToken | null = null;
  private normalInFlight: Promise<string | null> | null = null;
  private refreshInFlight: Promise<string | null> | null = null;
  private disposed = false;

  constructor(
    private readonly providerGetToken: ProviderTokenGetter,
    private readonly now: () => number = Date.now,
    private readonly tokenReuseMs = DEFAULT_TOKEN_REUSE_MS,
    private readonly prepareForceRefresh?: ForceRefreshPreparation,
  ) {}

  getToken(options?: AuthTokenGetterOptions): Promise<string | null> {
    if (this.disposed) return Promise.resolve(null);

    if (options?.skipCache) {
      this.cached = null;
      return this.startOrJoin(true);
    }

    if (this.cached && this.cached.reusableUntilMs > this.now()) {
      return Promise.resolve(this.cached.token);
    }

    this.cached = null;
    return this.startOrJoin(false);
  }

  dispose(): void {
    this.disposed = true;
    this.cached = null;
    this.normalInFlight = null;
    this.refreshInFlight = null;
  }

  private startOrJoin(forceRefresh: boolean): Promise<string | null> {
    const existing = forceRefresh ? this.refreshInFlight : this.normalInFlight;
    if (existing) return existing;

    const request = Promise.resolve()
      .then(async () => {
        if (forceRefresh && this.prepareForceRefresh) {
          // Native Clerk can preserve a signed-in session while its one-minute
          // bearer token has gone stale. Give the provider a chance to touch
          // that session before asking for a cache-bypassing replacement. A
          // failed touch must not suppress Clerk's normal getToken recovery.
          try {
            await this.prepareForceRefresh();
          } catch {
            // Continue with the provider's explicit skip-cache read.
          }
        }

        return this.providerGetToken(
          forceRefresh ? { skipCache: true } : undefined,
        );
      })
      .then((token) => {
        if (!this.disposed && token) {
          this.cached = {
            token,
            reusableUntilMs: this.now() + this.tokenReuseMs,
          };
        }
        return this.disposed ? null : token;
      })
      .catch(() => null)
      .finally(() => {
        if (forceRefresh) {
          if (this.refreshInFlight === request) this.refreshInFlight = null;
        } else if (this.normalInFlight === request) {
          this.normalInFlight = null;
        }
      });

    if (forceRefresh) this.refreshInFlight = request;
    else this.normalInFlight = request;
    return request;
  }
}
