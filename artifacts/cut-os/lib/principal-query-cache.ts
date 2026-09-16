interface PrincipalQueryCache {
  cancelQueries(): Promise<unknown>;
  clear(): void;
}

const owners = new WeakMap<object, string>();

/**
 * Isolates the process-wide React Query cache by authenticated principal.
 * Route-level layout remounts for the same principal retain verified gate
 * responses; an actual user/session transition cancels and clears everything.
 */
export function transitionPrincipalQueryCache(
  cache: PrincipalQueryCache,
  ownerKey: string | null,
): boolean {
  const previousOwner = owners.get(cache) ?? null;
  if (previousOwner === ownerKey) return false;

  void cache.cancelQueries();
  cache.clear();
  if (ownerKey === null) owners.delete(cache);
  else owners.set(cache, ownerKey);
  return true;
}
