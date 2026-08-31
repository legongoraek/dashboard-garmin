import { redis } from "./redisClient.js";

export async function withCache(key, ttlSeconds, fn, client = redis) {
  if (!client) return fn();

  const cacheKey = `cache:${key}`;

  try {
    const cached = await client.get(cacheKey);
    if (cached !== null) return cached;
  } catch (error) {
    console.warn(`[cache] read failed for ${cacheKey}: ${error.message}`);
  }

  const value = await fn();

  try {
    await client.set(cacheKey, value, { ex: ttlSeconds });
  } catch (error) {
    console.warn(`[cache] write failed for ${cacheKey}: ${error.message}`);
  }

  return value;
}
