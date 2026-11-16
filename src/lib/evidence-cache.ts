// Evidence images are fetched once (the token is single use). Small images are
// persisted in the CTF store; larger ones stay in this module-level cache so the
// browser is not asked for a token it can no longer spend.
const cache = new Map<number, string>();

export function cacheImage(id: number, dataUrl: string): void {
  cache.set(id, dataUrl);
}

export function getCachedImage(id: number): string | undefined {
  return cache.get(id);
}

/** Reset: drop images held only in memory. */
export function clearImageCache(): void {
  cache.clear();
}
