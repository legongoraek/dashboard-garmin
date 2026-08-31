import { Redis } from "@upstash/redis";

export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
        retry: {
          retries: 1,
          backoff: () => 100,
        },
        signal: () => AbortSignal.timeout(2000),
      })
    : null;

if (!redis) {
  console.warn(
    "[redis] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not set — session persistence and response cache are disabled."
  );
}
