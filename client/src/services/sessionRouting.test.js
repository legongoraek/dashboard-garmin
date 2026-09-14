import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SESSION_STORAGE_KEY,
  clearSession,
  hasStoredSession,
  normalizePublicPath,
  resolveLoginRoute,
  resolveProtectedRoute,
  storeSession,
} from "./sessionRouting.js";

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test("session storage helpers preserve the existing garmin_session contract", () => {
  const storage = createStorage();
  assert.equal(hasStoredSession(storage), false);

  storeSession(storage);
  assert.equal(storage.getItem(SESSION_STORAGE_KEY), "true");
  assert.equal(hasStoredSession(storage), true);

  clearSession(storage);
  assert.equal(hasStoredSession(storage), false);
});

test("route policy sends authenticated users to dashboard and guests to login", () => {
  assert.equal(resolveLoginRoute(false), "/login");
  assert.equal(resolveLoginRoute(true), "/dashboard");
  assert.equal(resolveProtectedRoute(false), "/login");
  assert.equal(resolveProtectedRoute(true), "/dashboard");
});

test("unknown client routes fall back to the public landing", () => {
  assert.equal(normalizePublicPath("/"), "/");
  assert.equal(normalizePublicPath("/login"), "/login");
  assert.equal(normalizePublicPath("/dashboard"), "/dashboard");
  assert.equal(normalizePublicPath("/missing"), "/");
});
