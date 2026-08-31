import { Redis } from "@upstash/redis";

export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

if (!redis) {
  console.warn(
    "[redis] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not set — session persistence and response cache are disabled."
  );
}
