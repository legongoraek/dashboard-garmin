import { test } from "node:test";
import assert from "node:assert/strict";
import { withCache } from "./cache.js";

function fakeClient(initial = {}) {
  const store = { ...initial };
  return {
    store,
    async get(key) {
      return key in store ? store[key] : null;
    },
    async set(key, value) {
      store[key] = value;
    },
  };
}

test("withCache returns the cached value without calling fn on a hit", async () => {
  const client = fakeClient({ "cache:daily:2026-08-25": { sleep: 7 } });
  let called = false;

  const result = await withCache(
    "daily:2026-08-25",
    60,
    async () => {
      called = true;
      return { sleep: 0 };
    },
    client
  );

  assert.deepEqual(result, { sleep: 7 });
  assert.equal(called, false);
});

test("withCache calls fn and stores the result on a miss", async () => {
  const client = fakeClient();

  const result = await withCache("daily:2026-08-26", 60, async () => ({ sleep: 8 }), client);

  assert.deepEqual(result, { sleep: 8 });
  assert.deepEqual(client.store["cache:daily:2026-08-26"], { sleep: 8 });
});

test("withCache falls back to fn when client is null", async () => {
  const result = await withCache("daily:2026-08-27", 60, async () => ({ sleep: 9 }), null);

  assert.deepEqual(result, { sleep: 9 });
});

test("withCache falls back to fn when the read fails", async () => {
  const client = {
    async get() {
      throw new Error("boom");
    },
    async set() {},
  };

  const result = await withCache("daily:2026-08-28", 60, async () => ({ sleep: 10 }), client);

  assert.deepEqual(result, { sleep: 10 });
});

test("withCache still returns fn's result when the write fails", async () => {
  const client = {
    async get() {
      return null;
    },
    async set() {
      throw new Error("boom");
    },
  };

  const result = await withCache("daily:2026-08-29", 60, async () => ({ sleep: 11 }), client);

  assert.deepEqual(result, { sleep: 11 });
});
