import test from "node:test";
import assert from "node:assert/strict";
import { buildProviderReadiness } from "./providerReadiness.js";

test("reports FIT binary import as configured once SDK is part of the client build", () => {
  const result = buildProviderReadiness({});
  assert.equal(result.providers.fit.configured, true);
  assert.equal(result.providers.fit.mode, "file_import");
  assert.equal(result.providers.fit.blocker, null);
});

test("keeps official Garmin blocked until approval and credentials exist", () => {
  const result = buildProviderReadiness({});
  assert.equal(result.providers.garmin_official.configured, false);
  assert.match(result.providers.garmin_official.blocker, /Developer Program/i);
});

test("reports PostgreSQL runtime as configured when DATABASE_URL is present", () => {
  const result = buildProviderReadiness({ DATABASE_URL: "postgres://example" });
  assert.equal(result.persistence.databaseUrlPresent, true);
  assert.equal(result.persistence.runtimeInstalled, true);
  assert.equal(result.persistence.postgresPostgisConfigured, true);
  assert.equal(result.persistence.connectionVerified, false);
});

test("keeps PostgreSQL disabled when DATABASE_URL is absent", () => {
  const result = buildProviderReadiness({});
  assert.equal(result.persistence.postgresPostgisConfigured, false);
  assert.match(result.persistence.blocker, /DATABASE_URL/);
});
