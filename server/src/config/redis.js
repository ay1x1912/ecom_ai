import Redis from 'ioredis';
import { env } from './env.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 2,
  retryStrategy: (attempt) => Math.min(attempt * 200, 2000),
});

// ioredis emits 'error' on every failed reconnect. An unhandled 'error' event
// takes the process down, so this listener is mandatory, not optional.
redis.on('error', (err) => {
  console.error(`[redis] ${err.message}`);
});

redis.on('connect', () => {
  console.log('[redis] connected');
});

/**
 * The cache fails OPEN: if Redis is unreachable we serve from MySQL, slower but
 * correct. Only the database is allowed to fail the request.
 */
export const cacheGet = async (key) => {
  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error(`[redis] get failed for ${key}: ${err.message}`);
    return null;
  }
};

export const cacheSet = async (key, value, ttlSeconds = env.CACHE_TTL_SECONDS) => {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    console.error(`[redis] set failed for ${key}: ${err.message}`);
  }
};

/**
 * Invalidation by namespace version: bumping the counter makes every existing key
 * in that namespace unreachable, and the old entries expire on their own TTL.
 * Avoids KEYS/SCAN entirely. See implementation.md 8.3.
 */
export const cacheNamespaceVersion = async (resource) => {
  try {
    const v = await redis.get(`cache:ver:${resource}`);
    return v ?? '1';
  } catch {
    return '1';
  }
};

export const bumpCacheNamespace = async (resource) => {
  try {
    await redis.incr(`cache:ver:${resource}`);
  } catch (err) {
    console.error(`[redis] bump failed for ${resource}: ${err.message}`);
  }
};
