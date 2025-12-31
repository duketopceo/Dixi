/**
 * LRU Cache Service
 * 
 * Implements a Least Recently Used (LRU) cache with TTL support
 * for caching AI responses and gesture analysis results.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  lastAccessed: number;
}

interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
}

/**
 * LRU Cache with TTL support
 */
export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private defaultTTL: number; // in milliseconds
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(maxSize: number = 100, defaultTTL: number = 3600000) { // 1 hour default
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Update last accessed time (LRU)
    entry.lastAccessed = Date.now();
    this.hits++;
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);

    // If key exists, update it
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      entry.value = value;
      entry.expiresAt = expiresAt;
      entry.lastAccessed = now;
      return;
    }

    // If at capacity, evict least recently used
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      expiresAt,
      lastAccessed: now,
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate,
    };
  }

  /**
   * Reset statistics (keep cache entries)
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.evictions++;
    }
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

/**
 * Generate cache key from query string
 */
export function generateQueryCacheKey(query: string, model?: string): string {
  const normalized = query.trim().toLowerCase();
  const modelPart = model ? `:${model}` : '';
  return `query:${hashString(normalized)}${modelPart}`;
}

/**
 * Generate cache key from gesture data
 */
export function generateGestureCacheKey(gesture: {
  type: string;
  position: { x: number; y: number };
  confidence?: number;
}): string {
  const normalized = `${gesture.type}:${gesture.position.x.toFixed(2)}:${gesture.position.y.toFixed(2)}:${gesture.confidence?.toFixed(2) || '0'}`;
  return `gesture:${hashString(normalized)}`;
}

/**
 * Simple hash function for strings
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Global cache instances
 */
export const aiResponseCache = new LRUCache<string>(
  parseInt(process.env.AI_CACHE_SIZE || '100'),
  parseInt(process.env.AI_CACHE_TTL || '3600000') // 1 hour
);

export const gestureAnalysisCache = new LRUCache<any>(
  parseInt(process.env.GESTURE_CACHE_SIZE || '200'),
  parseInt(process.env.GESTURE_CACHE_TTL || '1800000') // 30 minutes
);

