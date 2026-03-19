import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SimpleCache } from './cache.js';

describe('SimpleCache', () => {
  let cache: SimpleCache;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new SimpleCache(1000); // 1 second TTL
  });

  afterEach(() => {
    cache.destroy();
    vi.useRealTimers();
  });

  describe('get/set', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should return undefined for expired entries', () => {
      cache.set('key1', 'value1', 1000);
      vi.advanceTimersByTime(1500);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should not expire entries before TTL', () => {
      cache.set('key1', 'value1', 5000);
      vi.advanceTimersByTime(2000);
      expect(cache.get('key1')).toBe('value1');
    });

    it('should support different data types', () => {
      cache.set('string', 'hello');
      cache.set('number', 42);
      cache.set('object', { foo: 'bar' });
      cache.set('array', [1, 2, 3]);

      expect(cache.get('string')).toBe('hello');
      expect(cache.get('number')).toBe(42);
      expect(cache.get('object')).toEqual({ foo: 'bar' });
      expect(cache.get('array')).toEqual([1, 2, 3]);
    });
  });

  describe('getOrSet', () => {
    it('should compute and cache value on miss', async () => {
      const result = await cache.getOrSet('key1', async () => 'computed');
      
      expect(result).toBe('computed');
      expect(cache.get('key1')).toBe('computed');
    });

    it('should return cached value on hit', async () => {
      cache.set('key1', 'cached');
      const compute = vi.fn(async () => 'computed');
      
      const result = await cache.getOrSet('key1', compute);
      
      expect(result).toBe('cached');
      expect(compute).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete specific keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      cache.delete('key1');
      
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
    });
  });

  describe('deletePattern', () => {
    it('should delete keys matching pattern', () => {
      cache.set('user:1', 'Alice');
      cache.set('user:2', 'Bob');
      cache.set('product:1', 'Widget');
      
      const deleted = cache.deletePattern('user:*');
      
      expect(deleted).toBe(2);
      expect(cache.get('user:1')).toBeUndefined();
      expect(cache.get('user:2')).toBeUndefined();
      expect(cache.get('product:1')).toBe('Widget');
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      cache.clear();
      
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.stats().size).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', () => {
      cache.set('short', 'value1', 1000);
      cache.set('long', 'value2', 10000);
      
      vi.advanceTimersByTime(2000);
      cache.cleanup();
      
      expect(cache.get('short')).toBeUndefined();
      expect(cache.get('long')).toBe('value2');
    });
  });

  describe('stats', () => {
    it('should return cache statistics', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      const stats = cache.stats();
      
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('key1');
      expect(stats.keys).toContain('key2');
    });
  });
});
