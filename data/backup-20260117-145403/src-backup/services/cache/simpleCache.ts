// src/services/cache/simpleCache.ts
import { logger } from "../../utils/logger.js";

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
    logger.debug({ key, ttlSeconds }, "Cache SET");
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      logger.debug({ key }, "Cache MISS");
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      logger.debug({ key }, "Cache MISS (expired)");
      return null;
    }

    this.hits++;
    logger.debug({ key }, "Cache HIT");
    return entry.value;
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    logger.info("Cache cleared");
  }

  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  getStats() {
    let valid = 0;
    let expired = 0;
    const now = Date.now();

    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) expired++;
      else valid++;
    }

    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    return {
      size: this.cache.size,
      valid,
      expired,
      hits: this.hits,
      misses: this.misses,
      hitRate: hitRate.toFixed(1) + "%",
    };
  }
}
