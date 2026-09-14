import test from "node:test";
import assert from "node:assert/strict";
import { buildVerificationSteps } from "./verificationPlan.mjs";

test("full verification covers root tests, client tests lint build and server tests", () => {
  assert.deepEqual(buildVerificationSteps({ rootDir: "/repo" }), [
    { label: "root:test", cwd: "/repo", args: ["test"] },
    { label: "client:test", cwd: "/repo/client", args: ["test"] },
    { label: "client:lint", cwd: "/repo/client", args: ["run", "lint"] },
    { label: "client:build", cwd: "/repo/client", args: ["run", "build"] },
    { label: "server:test", cwd: "/repo/server", args: ["test"] },
  ]);
});

test("quick verification only runs root, client and server tests", () => {
  assert.deepEqual(buildVerificationSteps({ rootDir: "/repo", quick: true }), [
    { label: "root:test", cwd: "/repo", args: ["test"] },
    { label: "client:test", cwd: "/repo/client", args: ["test"] },
    { label: "server:test", cwd: "/repo/server", args: ["test"] },
  ]);
});

test("install verification uses npm ci before validation", () => {
  const steps = buildVerificationSteps({ rootDir: "/repo", install: true });
  assert.deepEqual(steps.slice(0, 2), [
    { label: "client:install", cwd: "/repo/client", args: ["ci"] },
    { label: "server:install", cwd: "/repo/server", args: ["ci"] },
  ]);
  assert.equal(steps[2].label, "root:test");
  assert.equal(steps.at(-1).label, "server:test");
});
