import { test } from "node:test";
import assert from "node:assert/strict";

test("redis is null when Upstash env vars are not set", async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  const { redis } = await import("./redisClient.js");

  assert.equal(redis, null);
});
