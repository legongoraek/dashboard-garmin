import { test } from "node:test";
import assert from "node:assert/strict";

function installFakeLocalStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
  return store;
}

test("cachedRequest calls fetchFn and stores the result on a miss", async () => {
  installFakeLocalStorage();
  const { cachedRequest } = await import("./cache.js");

  let calls = 0;
  const result = await cachedRequest("daily:2026-08-25", 60_000, async () => {
    calls += 1;
    return { sleep: 7 };
  });

  assert.deepEqual(result, { sleep: 7 });
  assert.equal(calls, 1);
});

test("cachedRequest returns the cached value without calling fetchFn on a hit", async () => {
  installFakeLocalStorage();
  const { cachedRequest } = await import("./cache.js");

  let calls = 0;
  const fetchFn = async () => {
    calls += 1;
    return { sleep: 7 };
  };

  await cachedRequest("daily:2026-08-25", 60_000, fetchFn);
  const second = await cachedRequest("daily:2026-08-25", 60_000, fetchFn);

  assert.deepEqual(second, { sleep: 7 });
  assert.equal(calls, 1);
});

test("cachedRequest treats an expired entry as a miss", async () => {
  installFakeLocalStorage();
  const { cachedRequest } = await import("./cache.js");

  let calls = 0;
  const fetchFn = async () => {
    calls += 1;
    return { sleep: calls };
  };

  await cachedRequest("daily:2026-08-25", -1, fetchFn);
  const second = await cachedRequest("daily:2026-08-25", -1, fetchFn);

  assert.equal(calls, 2);
  assert.deepEqual(second, { sleep: 2 });
});

test("ttlForDate: past date gets the long TTL, today and future get the short one", async () => {
  const { ttlForDate, SHORT_TTL_MS } = await import("./cache.js");

  const LONG_TTL_MS = 30 * 24 * 60 * 60 * 1000;

  assert.equal(ttlForDate("2020-01-01"), LONG_TTL_MS);
  assert.equal(ttlForDate(undefined), SHORT_TTL_MS);

  const today = new Date().toISOString().slice(0, 10);
  assert.equal(ttlForDate(today), SHORT_TTL_MS);

  const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  assert.equal(ttlForDate(future), SHORT_TTL_MS);
});
