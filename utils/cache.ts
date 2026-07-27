import { pushLog } from "@/libs/scraper";

export const CACHE_TTL = {
  /** 10 min */
  SHORT: 10 * 60,
  /** 30 min */
  MEDIUM: 30 * 60,
  /** 24h */
  LONG: 24 * 60 * 60,
  /** 7 days */
  STATIC: 7 * 24 * 60 * 60,
} as const;

export function cacheHeader(ttl: number): string {
  return `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`;
}

// ─── In-memory cache (per serverless instance) ───────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  staleUntil: number; // stale-while-revalidate window
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

// Tracks keys yang sedang di-refresh di background (hindari double fetch)
const revalidating = new Set<string>();

/**
 * Get or fetch data with in-memory caching + stale-while-revalidate.
 *
 * - FRESH  (expiresAt > now)              → return cache langsung
 * - STALE  (expiresAt < now < staleUntil) → return cache langsung + refresh di background
 * - MISS   (staleUntil < now / tidak ada) → fetch, tunggu, simpan
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const cached = memoryCache.get(key) as CacheEntry<T> | undefined;

  if (cached) {
    if (cached.expiresAt > now) {
      // FRESH — return langsung
      console.log(`[cache] HIT   ${key}`);
      pushLog({
        level: "info",
        strategy: "CACHE",
        status: "HIT",
        elapsed: 0,
        path: key,
        extra: `In-memory cache (fresh, TTL: ${ttlSeconds}s)`,
        ts: Date.now(),
      });
      return cached.data;
    }

    if (cached.staleUntil > now) {
      // STALE — return stale data dulu, refresh di background
      console.log(`[cache] STALE ${key}`);
      pushLog({
        level: "info",
        strategy: "CACHE",
        status: "STALE",
        elapsed: 0,
        path: key,
        extra: `Stale cache served, background revalidating`,
        ts: Date.now(),
      });

      if (!revalidating.has(key)) {
        revalidating.add(key);
        fetcher()
          .then((fresh) => {
            memoryCache.set(key, {
              data: fresh,
              expiresAt: Date.now() + ttlSeconds * 1000,
              staleUntil: Date.now() + ttlSeconds * 3 * 1000,
            });
            console.log(`[cache] REVALIDATED ${key}`);
          })
          .catch((err) => {
            console.warn(
              `[cache] Background revalidation failed for ${key}: ${err.message}`,
            );
          })
          .finally(() => {
            revalidating.delete(key);
          });
      }

      return cached.data;
    }
  }

  // MISS — fetch dan tunggu
  console.log(`[cache] MISS  ${key}`);
  pushLog({
    level: "info",
    strategy: "CACHE",
    status: "MISS",
    elapsed: 0,
    path: key,
    extra: `Cache miss, fetching from source...`,
    ts: Date.now(),
  });
  const data = await fetcher();

  memoryCache.set(key, {
    data,
    expiresAt: now + ttlSeconds * 1000,
    staleUntil: now + ttlSeconds * 3 * 1000, // stale window = 2x TTL setelah expired
  });

  return data;
}

export function invalidateCache(key: string): void {
  memoryCache.delete(key);
}

export function clearCache(): void {
  memoryCache.clear();
}
