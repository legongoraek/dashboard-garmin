import test from "node:test";
import assert from "node:assert/strict";
import { buildPoolConfig, verifyPostgresConnection } from "./postgresRuntime.js";

test("buildPoolConfig returns null when DATABASE_URL is absent", () => {
  assert.equal(buildPoolConfig({}), null);
});

test("buildPoolConfig uses connection string and production SSL by default", () => {
  const config = buildPoolConfig({
    DATABASE_URL: "postgres://example/db",
    NODE_ENV: "production",
  });
  assert.equal(config.connectionString, "postgres://example/db");
  assert.deepEqual(config.ssl, { rejectUnauthorized: false });
});

test("buildPoolConfig allows explicit SSL disable", () => {
  const config = buildPoolConfig({
    DATABASE_URL: "postgres://localhost/db",
    NODE_ENV: "production",
    PGSSL: "disable",
  });
  assert.equal(config.ssl, false);
});

test("verifyPostgresConnection checks PostGIS without mutating schema", async () => {
  const queries = [];
  const pool = {
    async query(text) {
      queries.push(text);
      return { rows: [{ postgis_version: "3.5.0" }] };
    },
  };
  const result = await verifyPostgresConnection(pool);
  assert.equal(result.ok, true);
  assert.equal(result.postgisVersion, "3.5.0");
  assert.match(queries[0], /postgis_lib_version/i);
});
