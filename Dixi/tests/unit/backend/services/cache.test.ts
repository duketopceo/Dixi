import { LRUCache, generateQueryCacheKey, generateGestureCacheKey, aiResponseCache, gestureAnalysisCache } from '../../../../packages/backend/src/services/cache';

describe('Cache Service', () => {
  describe('LRUCache', () => {
    let cache: LRUCache<string>;

    beforeEach(() => {
      cache = new LRUCache<string>(5, 1000); // Max 5 entries, 1 second TTL
    });

    describe('get and set', () => {
      it('should store and retrieve values', () => {
        cache.set('key1', 'value1');
        expect(cache.get('key1')).toBe('value1');
      });

      it('should return null for non-existent keys', () => {
        expect(cache.get('non-existent')).toBeNull();
      });

      it('should update existing keys', () => {
        cache.set('key1', 'value1');
        cache.set('key1', 'value2');
        expect(cache.get('key1')).toBe('value2');
      });
    });

    describe('LRU eviction', () => {
      it('should evict least recently used when at capacity', () => {
        // Fill cache to capacity
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');
        cache.set('key3', 'value3');
        cache.set('key4', 'value4');
        cache.set('key5', 'value5');

        // Access key1 to make it recently used
        cache.get('key1');

        // Add one more (should evict least recently used, which is key2)
        cache.set('key6', 'value6');

        expect(cache.get('key1')).toBe('value1'); // Still in cache
        expect(cache.get('key2')).toBeNull(); // Evicted
        expect(cache.get('key6')).toBe('value6'); // New entry
      });
    });

    describe('TTL expiration', () => {
      it('should expire entries after TTL', (done) => {
        cache.set('key1', 'value1', 100); // 100ms TTL

        setTimeout(() => {
          expect(cache.get('key1')).toBeNull(); // Expired
          done();
        }, 150);
      });

      it('should not expire entries before TTL', (done) => {
        cache.set('key1', 'value1', 200); // 200ms TTL

        setTimeout(() => {
          expect(cache.get('key1')).toBe('value1'); // Still valid
          done();
        }, 100);
      });
    });

    describe('has', () => {
      it('should return true for existing non-expired keys', () => {
        cache.set('key1', 'value1');
        expect(cache.has('key1')).toBe(true);
      });

      it('should return false for non-existent keys', () => {
        expect(cache.has('non-existent')).toBe(false);
      });

      it('should return false for expired keys', (done) => {
        cache.set('key1', 'value1', 50);
        setTimeout(() => {
          expect(cache.has('key1')).toBe(false);
          done();
        }, 100);
      });
    });

    describe('delete', () => {
      it('should delete entries', () => {
        cache.set('key1', 'value1');
        expect(cache.delete('key1')).toBe(true);
        expect(cache.get('key1')).toBeNull();
      });

      it('should return false for non-existent keys', () => {
        expect(cache.delete('non-existent')).toBe(false);
      });
    });

    describe('clear', () => {
      it('should clear all entries', () => {
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');
        cache.clear();
        expect(cache.get('key1')).toBeNull();
        expect(cache.get('key2')).toBeNull();
      });

      it('should reset statistics', () => {
        cache.set('key1', 'value1');
        cache.get('key1'); // Hit
        cache.get('key2'); // Miss
        cache.clear();
        const stats = cache.getStats();
        expect(stats.hits).toBe(0);
        expect(stats.misses).toBe(0);
        expect(stats.evictions).toBe(0);
      });
    });

    describe('getStats', () => {
      it('should return cache statistics', () => {
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');
        cache.get('key1'); // Hit
        cache.get('key3'); // Miss

        const stats = cache.getStats();
        expect(stats.size).toBe(2);
        expect(stats.hits).toBe(1);
        expect(stats.misses).toBe(1);
        expect(stats.hitRate).toBeGreaterThan(0);
      });

      it('should calculate hit rate correctly', () => {
        cache.set('key1', 'value1');
        cache.get('key1'); // Hit
        cache.get('key1'); // Hit
        cache.get('key2'); // Miss

        const stats = cache.getStats();
        expect(stats.hitRate).toBeCloseTo(66.67, 1); // 2 hits / 3 total = 66.67%
      });
    });

    describe('cleanExpired', () => {
      it('should remove expired entries', (done) => {
        cache.set('key1', 'value1', 50);
        cache.set('key2', 'value2', 200);

        setTimeout(() => {
          const cleaned = cache.cleanExpired();
          expect(cleaned).toBe(1); // key1 expired
          expect(cache.get('key1')).toBeNull();
          expect(cache.get('key2')).toBe('value2'); // Still valid
          done();
        }, 100);
      });
    });
  });

  describe('generateQueryCacheKey', () => {
    it('should generate consistent keys for same query', () => {
      const key1 = generateQueryCacheKey('test query', 'model1');
      const key2 = generateQueryCacheKey('test query', 'model1');
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different queries', () => {
      const key1 = generateQueryCacheKey('query 1', 'model1');
      const key2 = generateQueryCacheKey('query 2', 'model1');
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different models', () => {
      const key1 = generateQueryCacheKey('test query', 'model1');
      const key2 = generateQueryCacheKey('test query', 'model2');
      expect(key1).not.toBe(key2);
    });

    it('should handle queries without model', () => {
      const key = generateQueryCacheKey('test query');
      expect(key).toContain('query:');
    });
  });

  describe('generateGestureCacheKey', () => {
    it('should generate consistent keys for same gesture', () => {
      const gesture = { type: 'point', position: { x: 0.5, y: 0.5 }, confidence: 0.8 };
      const key1 = generateGestureCacheKey(gesture);
      const key2 = generateGestureCacheKey(gesture);
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different gestures', () => {
      const gesture1 = { type: 'point', position: { x: 0.5, y: 0.5 }, confidence: 0.8 };
      const gesture2 = { type: 'pinch', position: { x: 0.5, y: 0.5 }, confidence: 0.8 };
      const key1 = generateGestureCacheKey(gesture1);
      const key2 = generateGestureCacheKey(gesture2);
      expect(key1).not.toBe(key2);
    });
  });

  describe('Global cache instances', () => {
    it('should have aiResponseCache instance', () => {
      expect(aiResponseCache).toBeInstanceOf(LRUCache);
    });

    it('should have gestureAnalysisCache instance', () => {
      expect(gestureAnalysisCache).toBeInstanceOf(LRUCache);
    });
  });
});

