import test from "node:test";
import assert from "node:assert/strict";
import { loadLocalMultisourceInsights } from "./localMultisourceInsights.js";

test("builds deduped source counts and YoY from persisted canonical details", async () => {
  const details = [
    {
      activity: {
        activityUid: "garmin:1",
        source: "garmin",
        sourceActivityId: "1",
        activityTypeNorm: "run",
        startedAtLocal: "2026-01-05T06:00:00",
        distanceM: 12000,
        durationS: 3600,
      },
    },
    {
      activity: {
        activityUid: "strava:1",
        source: "strava",
        sourceActivityId: "1",
        activityTypeNorm: "run",
        startedAtLocal: "2026-01-05T06:01:00",
        distanceM: 12020,
        durationS: 3590,
      },
    },
    {
      activity: {
        activityUid: "gpx:old",
        source: "gpx",
        sourceActivityId: "old.gpx",
        activityTypeNorm: "run",
        startedAtLocal: "2025-01-06T06:00:00",
        distanceM: 10000,
        durationS: 3300,
      },
    },
  ];

  const result = await loadLocalMultisourceInsights({
    currentYear: 2026,
    listFn: async () => details,
  });

  assert.equal(result.persistedCount, 3);
  assert.equal(result.logicalCount, 2);
  assert.equal(result.duplicateSourceRecords, 1);
  assert.deepEqual(result.sourceCounts, { garmin: 1, strava: 1, gpx: 1 });
  assert.equal(result.yoy[0].distanceDeltaM, 2000);
});
