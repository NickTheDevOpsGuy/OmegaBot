// src/services/github/githubCache.ts
import { SimpleCache } from "../cache/simpleCache.js";
import { logger } from "../../utils/logger.js";

const cache = new SimpleCache<any>();
const CACHE_TTL = 300; // 5 minutes

export async function cachedGitHubRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = cache.get(key);
  if (cached !== null) {
    logger.debug({ key }, "GitHub cache HIT");
    return cached as T;
  }

  logger.debug({ key }, "GitHub cache MISS");

  try {
    const data = await fetcher();
    cache.set(key, data, CACHE_TTL);
    return data;
  } catch (error) {
    logger.error({ error, key }, "GitHub API request failed");
    throw error;
  }
}

export function clearGitHubCache(): void {
  cache.clear();
  logger.info("GitHub cache cleared");
}

export function getGitHubCacheStats() {
  return cache.getStats();
}
