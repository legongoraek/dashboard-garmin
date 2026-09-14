import test from "node:test";
import assert from "node:assert/strict";
import {
  activityFingerprint,
  deduplicateCanonicalActivities,
  buildYearOverYearWeeklyComparison,
  buildYearOverYearSummary,
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

test("fingerprint prefers UTC when providers represent the same instant with different local times", () => {
  const garmin = activity({
    startedAtLocal: "2026-09-10T06:00:00",
    startedAtUtc: "2026-09-10T12:00:00Z",
  });
  const strava = activity({
    activityUid: "strava:timezone",
    source: "strava",
    startedAtLocal: "2026-09-10T07:00:00",
    startedAtUtc: "2026-09-10T12:00:20Z",
  });

  assert.equal(activityFingerprint(garmin), activityFingerprint(strava));
});

test("dedup matches equivalent cross-provider activities across a rounded fingerprint boundary", () => {
  const garmin = activity({
    startedAtUtc: "2026-09-10T12:02:29Z",
  });
  const strava = activity({
    activityUid: "strava:boundary",
    source: "strava",
    sourceActivityId: "boundary",
    startedAtUtc: "2026-09-10T12:02:31Z",
  });

  assert.notEqual(activityFingerprint(garmin), activityFingerprint(strava));
  assert.equal(deduplicateCanonicalActivities([garmin, strava]).length, 1);
});

test("dedup keeps one logical activity, preserves evidence, prefers the richest record, and fills its missing metrics from other sources", () => {
  const garmin = activity({
    avgHeartRateBpm: 152,
    avgPowerW: null,
    caloriesKcal: 620,
  });
  const strava = activity({
    activityUid: "strava:22",
    source: "strava",
    sourceActivityId: "22",
    startedAtLocal: "2026-09-10T06:01:00",
    durationS: 3595,
    distanceM: 10020,
    avgHeartRateBpm: 151,
    avgPowerW: 238,
    caloriesKcal: null,
    deviceModel: "Edge",
  });

  const [logical] = deduplicateCanonicalActivities([garmin, strava]);
  assert.equal(logical.activityUid, "strava:22");
  assert.equal(logical.avgPowerW, 238);
  assert.equal(logical.caloriesKcal, 620);
  assert.equal(logical.avgHeartRateBpm, 151);
  assert.equal(logical.sources.length, 2);
  assert.deepEqual(logical.sources.map((row) => row.source).sort(), ["garmin", "strava"]);
});

test("dedup does not merge different activities just because date and sport match", () => {
  const morning = activity();
  const evening = activity({
    activityUid: "strava:evening",
    source: "strava",
    startedAtLocal: "2026-09-10T18:00:00",
    startedAtUtc: "2026-09-11T00:00:00Z",
    durationS: 3600,
    distanceM: 10000,
  });

  assert.equal(deduplicateCanonicalActivities([morning, evening]).length, 2);
});

test("YoY compares weekly canonical volume without requesting provider data", () => {
  const rows = [
    activity({ activityUid: "2026-a", sourceActivityId: "2026-a", startedAtLocal: "2026-01-05T06:00:00", startedAtUtc: "2026-01-05T12:00:00Z", distanceM: 12000, durationS: 3600 }),
    activity({ activityUid: "2025-a", sourceActivityId: "2025-a", startedAtLocal: "2025-01-06T06:00:00", startedAtUtc: "2025-01-06T12:00:00Z", distanceM: 10000, durationS: 3300 }),
  ];

  const result = buildYearOverYearWeeklyComparison(rows, 2026);
  assert.equal(result.length, 1);
  assert.equal(result[0].current.distanceM, 12000);
  assert.equal(result[0].previous.distanceM, 10000);
  assert.equal(result[0].distanceDeltaM, 2000);
});

test("YoY summary compares current YTD with the equivalent previous-year window", () => {
  const rows = [
    activity({ activityUid: "2026-a", sourceActivityId: "2026-a", startedAtLocal: "2026-01-10T06:00:00", startedAtUtc: "2026-01-10T12:00:00Z", distanceM: 10000, durationS: 3600 }),
    activity({ activityUid: "2026-b", sourceActivityId: "2026-b", startedAtLocal: "2026-02-10T06:00:00", startedAtUtc: "2026-02-10T12:00:00Z", distanceM: 5000, durationS: 1800, elevationGainM: null }),
    activity({ activityUid: "2025-a", sourceActivityId: "2025-a", startedAtLocal: "2025-01-10T06:00:00", startedAtUtc: "2025-01-10T12:00:00Z", distanceM: 8000, durationS: 3200 }),
  ];

  const result = buildYearOverYearSummary(rows, "2026-02-28");
  assert.equal(result.current.activityCount, 2);
  assert.equal(result.previous.activityCount, 1);
  assert.equal(result.current.distanceM, 15000);
  assert.equal(result.previous.distanceM, 8000);
  assert.equal(result.change.distancePct, 87.5);
});

test("YoY summary keeps all-missing metrics null", () => {
  const rows = [
    activity({ activityUid: "2026-a", sourceActivityId: "2026-a", startedAtLocal: "2026-01-10T06:00:00", startedAtUtc: "2026-01-10T12:00:00Z", elevationGainM: null }),
    activity({ activityUid: "2025-a", sourceActivityId: "2025-a", startedAtLocal: "2025-01-10T06:00:00", startedAtUtc: "2025-01-10T12:00:00Z", elevationGainM: null }),
  ];

  const result = buildYearOverYearSummary(rows, "2026-02-28");
  assert.equal(result.current.elevationGainM, null);
  assert.equal(result.previous.elevationGainM, null);
  assert.equal(result.change.elevationGainPct, null);
});
