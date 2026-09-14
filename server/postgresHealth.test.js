import test from "node:test";
import assert from "node:assert/strict";
import { getPostgresHealth } from "./postgresHealth.js";

test("reports unconfigured without attempting a connection", async () => {
  let verified = false;
  const result = await getPostgresHealth({
    pool: null,
    verifyFn: async () => {
      verified = true;
      return { ok: true };
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.configured, false);
  assert.equal(verified, false);
});

test("reports verified PostGIS connection", async () => {
  const pool = {};
  const result = await getPostgresHealth({
    pool,
    verifyFn: async (received) => {
      assert.equal(received, pool);
      return { ok: true, configured: true, postgisVersion: "3.5.0" };
    },
  });
  assert.deepEqual(result, {
    ok: true,
    configured: true,
    postgisVersion: "3.5.0",
  });
});

test("converts connection errors to a safe unavailable response", async () => {
  const result = await getPostgresHealth({
    pool: {},
    verifyFn: async () => {
      throw new Error("password authentication failed for user secret-user");
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.configured, true);
  assert.equal(result.error, "PostgreSQL/PostGIS connection unavailable");
});
