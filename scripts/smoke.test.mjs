import test from "node:test";
import assert from "node:assert/strict";
import * as smoke from "./smoke.mjs";

test("smoke targets cover liveness and provider readiness", () => {
  assert.deepEqual(smoke.buildSmokeTargets("http://localhost:4000"), [
    "http://localhost:4000/api/health",
    "http://localhost:4000/api/providers",
  ]);
});

test("checkEndpoint accepts a successful JSON response", async () => {
  const result = await smoke.checkEndpoint("http://local/api/health", async () => ({
    ok: true,
    status: 200,
    headers: { get: () => "application/json" },
    json: async () => ({ ok: true }),
  }));

  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
});

test("checkEndpoint reports non-2xx responses as failures", async () => {
  const result = await smoke.checkEndpoint("http://local/api/health", async () => ({
    ok: false,
    status: 503,
    headers: { get: () => "application/json" },
    json: async () => ({ ok: false }),
  }));

  assert.equal(result.ok, false);
  assert.equal(result.status, 503);
});

test("checkEndpoint converts network errors into a failed result", async () => {
  const result = await smoke.checkEndpoint("http://local/api/health", async () => {
    throw new Error("connection refused");
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /connection refused/);
});

test("serverBaseUrl resolves the port assigned to an ephemeral server", () => {
  assert.equal(typeof smoke.serverBaseUrl, "function");
  assert.equal(
    smoke.serverBaseUrl({ address: () => ({ address: "::", family: "IPv6", port: 4567 }) }),
    "http://127.0.0.1:4567"
  );
});

test("runRuntimeSmoke passes the ephemeral URL to smoke and always closes the server", async () => {
  let closed = 0;
  let observedBaseUrl = null;
  const server = {
    listening: true,
    address: () => ({ port: 49152 }),
    close(callback) {
      this.listening = false;
      closed += 1;
      callback();
    },
  };

  const result = await smoke.runRuntimeSmoke({
    startServerFn: async () => server,
    smokeFn: async ({ baseUrl }) => {
      observedBaseUrl = baseUrl;
      return { ok: true, results: [] };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(observedBaseUrl, "http://127.0.0.1:49152");
  assert.equal(closed, 1);
});

test("runRuntimeSmoke closes the server when smoke throws", async () => {
  let closed = 0;
  const server = {
    listening: true,
    address: () => ({ port: 49153 }),
    close(callback) {
      this.listening = false;
      closed += 1;
      callback();
    },
  };

  await assert.rejects(
    smoke.runRuntimeSmoke({
      startServerFn: async () => server,
      smokeFn: async () => {
        throw new Error("smoke exploded");
      },
    }),
    /smoke exploded/
  );
  assert.equal(closed, 1);
});
