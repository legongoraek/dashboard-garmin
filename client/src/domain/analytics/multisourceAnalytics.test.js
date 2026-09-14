import test from "node:test";
import assert from "node:assert/strict";
import {
  activityFingerprint,
  deduplicateCanonicalActivities,
  buildYearOverYearWeeklyComparison,
} from "./multisourceAnalytics.js";

function activity(overrides = {}) {
  return {
    activityUid: "garmin:1",
    source: "garmin",
    sourceActivityId: "1",
    activityTypeNorm: "run",
    startedAtLocal: "2026-09-10T06:00:00",
    startedAtUtc: "2026-09-10T12:00:00Z",
    durationS: 3600,
    distanceM: 10000,
    elevationGainM: 120,
    ...overrides,
  };
}

test("fingerprint groups equivalent activities across providers", () => {
  const garmin = activity();
  const strava = activity({
    activityUid: "strava:22",
    source: "strava",
    sourceActivityId: "22",
    startedAtLocal: "2026-09-10T06:02:10",
    durationS: 3585,
    distanceM: 10040,
  });

  assert.equal(activityFingerprint(garmin), activityFingerprint(strava));
});

test("dedup keeps one logical activity and preserves all source evidence", () => {
  const garmin = activity();
  const strava = activity({
    activityUid: "strava:22",
    source: "strava",
    sourceActivityId: "22",
    startedAtLocal: "2026-09-10T06:01:00",
    durationS: 3595,
    distanceM: 10020,
  });

  const [logical] = deduplicateCanonicalActivities([garmin, strava]);
  assert.equal(logical.activityUid, "garmin:1");
  assert.equal(logical.sources.length, 2);
  assert.deepEqual(logical.sources.map((row) => row.source).sort(), ["garmin", "strava"]);
});

test("dedup does not merge different activities just because date and sport match", () => {
  const morning = activity();
  const evening = activity({
    activityUid: "strava:evening",
    source: "strava",
    startedAtLocal: "2026-09-10T18:00:00",
    durationS: 3600,
    distanceM: 10000,
  });

  assert.equal(deduplicateCanonicalActivities([morning, evening]).length, 2);
});

test("YoY compares weekly canonical volume without requesting provider data", () => {
  const rows = [
    activity({ activityUid: "2026-a", startedAtLocal: "2026-01-05T06:00:00", distanceM: 12000, durationS: 3600 }),
    activity({ activityUid: "2025-a", startedAtLocal: "2025-01-06T06:00:00", startedAtUtc: "2025-01-06T12:00:00Z", distanceM: 10000, durationS: 3300 }),
  ];

  const result = buildYearOverYearWeeklyComparison(rows, 2026);
  assert.equal(result.length, 1);
  assert.equal(result[0].current.distanceM, 12000);
  assert.equal(result[0].previous.distanceM, 10000);
  assert.equal(result[0].distanceDeltaM, 2000);
});
