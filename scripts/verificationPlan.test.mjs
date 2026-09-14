import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { buildVerificationSteps } from "./verificationPlan.mjs";

const rootDir = path.resolve("/repo");
const clientDir = path.join(rootDir, "client");
const serverDir = path.join(rootDir, "server");

test("full verification covers root tests, client tests lint build, server tests and runtime smoke", () => {
  assert.deepEqual(buildVerificationSteps({ rootDir }), [
    { label: "root:test", cwd: rootDir, args: ["test"] },
    { label: "client:test", cwd: clientDir, args: ["test"] },
    { label: "client:lint", cwd: clientDir, args: ["run", "lint"] },
    { label: "client:build", cwd: clientDir, args: ["run", "build"] },
    { label: "server:test", cwd: serverDir, args: ["test"] },
    { label: "root:runtime", cwd: rootDir, args: ["run", "verify:runtime"] },
  ]);
});

test("quick verification only runs root, client and server tests", () => {
  assert.deepEqual(buildVerificationSteps({ rootDir, quick: true }), [
    { label: "root:test", cwd: rootDir, args: ["test"] },
    { label: "client:test", cwd: clientDir, args: ["test"] },
    { label: "server:test", cwd: serverDir, args: ["test"] },
  ]);
});

test("install verification uses npm ci before validation", () => {
  const steps = buildVerificationSteps({ rootDir, install: true });
  assert.deepEqual(steps.slice(0, 2), [
    { label: "client:install", cwd: clientDir, args: ["ci"] },
    { label: "server:install", cwd: serverDir, args: ["ci"] },
  ]);
  assert.equal(steps[2].label, "root:test");
  assert.equal(steps.at(-1).label, "root:runtime");
});
