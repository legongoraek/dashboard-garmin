import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCanonicalArchiveExport,
  parseCanonicalArchiveExport,
} from "./localDataPortability.js";

test("builds a versioned canonical archive export without mutating details", () => {
  const details = [{ activity: { activityUid: "garmin:1", source: "garmin" }, samples: [], trackPoints: [] }];
  const before = structuredClone(details);

  const payload = buildCanonicalArchiveExport(details, "2026-09-14T11:00:00.000Z");

  assert.equal(payload.schemaVersion, 1);
  assert.equal(payload.exportedAt, "2026-09-14T11:00:00.000Z");
  assert.equal(payload.activities.length, 1);
  assert.deepEqual(details, before);
});

test("parses only canonical archive payloads with activity UIDs", () => {
  const json = JSON.stringify({
    schemaVersion: 1,
    exportedAt: "2026-09-14T11:00:00.000Z",
    activities: [
      { activity: { activityUid: "strava:2", source: "strava" }, samples: [], trackPoints: [] },
    ],
  });

  const result = parseCanonicalArchiveExport(json);
  assert.equal(result.length, 1);
  assert.equal(result[0].activity.activityUid, "strava:2");
});

test("rejects malformed or unsupported archive exports", () => {
  assert.throws(() => parseCanonicalArchiveExport("{}"), /canonical archive/i);
  assert.throws(
    () => parseCanonicalArchiveExport(JSON.stringify({ schemaVersion: 99, activities: [] })),
    /schema version/i
  );
  assert.throws(
    () => parseCanonicalArchiveExport(JSON.stringify({ schemaVersion: 1, activities: [{ activity: {} }] })),
    /activityUid/i
  );
});
