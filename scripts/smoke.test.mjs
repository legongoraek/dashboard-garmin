import test from "node:test";
import assert from "node:assert/strict";
import { checkEndpoint, buildSmokeTargets } from "./smoke.mjs";

test("smoke targets cover liveness and provider readiness", () => {
  assert.deepEqual(buildSmokeTargets("http://localhost:4000"), [
    "http://localhost:4000/api/health",
    "http://localhost:4000/api/providers",
  ]);
});

test("checkEndpoint accepts a successful JSON response", async () => {
  const result = await checkEndpoint("http://local/api/health", async () => ({
    ok: true,
    status: 200,
    headers: { get: () => "application/json" },
    json: async () => ({ ok: true }),
  }));

  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
});

test("checkEndpoint reports non-2xx responses as failures", async () => {
  const result = await checkEndpoint("http://local/api/health", async () => ({
    ok: false,
    status: 503,
    headers: { get: () => "application/json" },
    json: async () => ({ ok: false }),
  }));

  assert.equal(result.ok, false);
  assert.equal(result.status, 503);
});

test("checkEndpoint converts network errors into a failed result", async () => {
  const result = await checkEndpoint("http://local/api/health", async () => {
    throw new Error("connection refused");
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /connection refused/);
});
