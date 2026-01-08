import type { CachedResponse } from "./types.js";

/** TTL for not-found responses (24 hours in seconds) */
const NOT_FOUND_TTL = 60 * 60 * 24;

/**
 * Generate cache key from type and word.
 *
 * Uses pipe separator which is safe (not in dictionary words).
 * Lowercase for case-insensitive matching.
 */
export function getCacheKey(
  type: "define" | "synonyms",
  word: string
): string {
  return `${type}|${word.toLowerCase()}`;
}

/**
 * Get cached response from KV.
 *
 * Returns null if not cached or expired.
 */
export async function getCached(
  kv: KVNamespace,
  type: "define" | "synonyms",
  word: string
): Promise<CachedResponse | null> {
  const key = getCacheKey(type, word);
  return kv.get(key, "json");
}

/**
 * Cache a response in KV.
 *
 * - Found responses: cached forever (no TTL)
 * - Not-found responses: cached for 24 hours
 *
 * The TTL difference allows MW to add new words while still
 * preventing repeated lookups for typos.
 */
export async function setCache(
  kv: KVNamespace,
  type: "define" | "synonyms",
  word: string,
  data: unknown,
  found: boolean
): Promise<void> {
  const key = getCacheKey(type, word);
  const value: CachedResponse = {
    data,
    cachedAt: new Date().toISOString(),
    found,
  };

  // Found responses: cache forever. Not-found: 24h TTL
  const options = found ? {} : { expirationTtl: NOT_FOUND_TTL };
  await kv.put(key, JSON.stringify(value), options);
}

/**
 * Delete a cached response from KV.
 *
 * Used by admin endpoint for cache invalidation.
 */
export async function deleteCache(
  kv: KVNamespace,
  type: "define" | "synonyms",
  word: string
): Promise<void> {
  const key = getCacheKey(type, word);
  await kv.delete(key);
}

/**
 * Check if a word exists in cache (without retrieving full data).
 *
 * Useful for admin/debugging endpoints.
 */
export async function hasCache(
  kv: KVNamespace,
  type: "define" | "synonyms",
  word: string
): Promise<boolean> {
  const key = getCacheKey(type, word);
  const metadata = await kv.getWithMetadata(key);
  return metadata.value !== null;
}
