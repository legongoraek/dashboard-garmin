import test from "node:test";
import assert from "node:assert/strict";
import { buildActivityFingerprint, groupDuplicateActivities, selectPrimaryActivity } from "./deduplication.js";

function activity(overrides = {}) {
  return {
    activityUid: "garmin:1",
    source: "garmin",
    sourceActivityId: "1",
    activityTypeNorm: "run",
    startedAtLocal: "2026-09-14T06:00:00",
    durationS: 3600,
    distanceM: 10000,
    ...overrides,
  };
}

test("builds the same fingerprint for likely duplicate activities from different sources", () => {
  const garmin = activity();
  const strava = activity({
    activityUid: "strava:9",
    source: "strava",
    sourceActivityId: "9",
    startedAtLocal: "2026-09-14T06:01:15",
    durationS: 3575,
    distanceM: 10040,
  });

  assert.equal(buildActivityFingerprint(garmin), buildActivityFingerprint(strava));
});

test("does not collapse materially different activities", () => {
  const first = activity();
  const second = activity({ activityUid: "gpx:2", source: "gpx", startedAtLocal: "2026-09-14T09:00:00" });

  const groups = groupDuplicateActivities([first, second]);
  assert.equal(groups.length, 2);
});

test("keeps all source evidence while selecting the richest record as primary", () => {
  const garmin = activity({ avgHeartRateBpm: 152, avgPowerW: null });
  const strava = activity({
    activityUid: "strava:9",
    source: "strava",
    sourceActivityId: "9",
    avgHeartRateBpm: 151,
    avgPowerW: 238,
    elevationGainM: 120,
  });

  const primary = selectPrimaryActivity([garmin, strava]);
  assert.equal(primary.activityUid, "strava:9");

  const [group] = groupDuplicateActivities([garmin, strava]);
  assert.equal(group.sources.length, 2);
  assert.deepEqual(group.sources.map((item) => item.source).sort(), ["garmin", "strava"]);
});
