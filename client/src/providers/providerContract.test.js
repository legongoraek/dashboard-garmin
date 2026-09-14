import test from "node:test";
import assert from "node:assert/strict";
import { createProviderDescriptor, providerRegistry } from "./providerContract.js";

test("provider descriptors expose stable capability flags", () => {
  const provider = createProviderDescriptor({
    id: "example",
    label: "Example",
    capabilities: { activities: true, health: false, fileImport: true },
  });

  assert.deepEqual(provider.capabilities, {
    activities: true,
    health: false,
    fileImport: true,
    oauth: false,
    live: false,
  });
});

test("registry includes all architecture providers", () => {
  for (const id of ["garmin", "garmin_official", "strava", "fit", "gpx", "komoot"]) {
    assert.ok(providerRegistry[id]);
  }
});
