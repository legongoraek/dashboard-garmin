import test from "node:test";
import assert from "node:assert/strict";
import { buildLocalAnalytics } from "./localAnalytics.js";

const details = [
  { activity: { activityUid: "garmin:1", source: "garmin", activityTypeNorm: "run", startedAtLocal: "2026-02-10T07:00:00", durationS: 3600, distanceM: 10000, avgHeartRateBpm: 150 } },
  { activity: { activityUid: "strava:1", source: "strava", activityTypeNorm: "run", startedAtLocal: "2026-02-10T07:01:00", durationS: 3590, distanceM: 10020, avgHeartRateBpm: 149, avgPowerW: 240 } },
  { activity: { activityUid: "gpx:old", source: "gpx", activityTypeNorm: "run", startedAtLocal: "2025-02-10T07:00:00", durationS: 3300, distanceM: 8000 } },
];

test("deduplicates local multisource activities before analytics", () => {
  const result = buildLocalAnalytics(details, "2026-02-28");
  assert.equal(result.sourceRecords, 3);
  assert.equal(result.logicalActivities.length, 2);
  assert.equal(result.duplicateGroups, 1);
});

test("builds YoY from deduplicated local history", () => {
  const result = buildLocalAnalytics(details, "2026-02-28");
  assert.equal(result.yearOverYear.current.activityCount, 1);
  assert.equal(result.yearOverYear.previous.activityCount, 1);
  assert.equal(result.yearOverYear.current.distanceM, 10020);
  assert.equal(result.yearOverYear.previous.distanceM, 8000);
});
