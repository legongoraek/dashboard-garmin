import test from "node:test";
import assert from "node:assert/strict";
import { createPersistenceEnvelope } from "./activityRepository.js";

test("creates a versioned persistence envelope without mutating canonical data", () => {
  const detail = {
    activity: { activityUid: "gpx:abc", source: "gpx", distanceM: 1000 },
    samples: [{ activityUid: "gpx:abc", heartRateBpm: null }],
    trackPoints: [{ activityUid: "gpx:abc", sequence: 0, latitude: 1, longitude: 2 }],
  };

  const snapshot = structuredClone(detail);
  const envelope = createPersistenceEnvelope(detail, "2026-09-14T10:00:00.000Z");

  assert.equal(envelope.id, "gpx:abc");
  assert.equal(envelope.schemaVersion, 1);
  assert.equal(envelope.savedAt, "2026-09-14T10:00:00.000Z");
  assert.deepEqual(detail, snapshot);
});
