// src/services/cache/simpleCache.ts
import { logger } from "../../../utils/logger.js";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private hits = 0;
  private misses = 0;

  set(key: string, value: T, ttlSeconds: number): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      logger.debug({ key }, "Cache miss");
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      logger.debug({ key }, "Cache expired");
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    logger.debug({ key }, "Cache hit");
    this.hits++;
    return entry.value;
  }

  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;

    logger.info({ cleared: size }, "Cache cleared");
  }

  getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: hitRate.toFixed(1) + "%",
      size: this.cache.size,
    };
  }
}
