import test from "node:test";
import assert from "node:assert/strict";
import { normalizeStravaActivity, normalizeStravaStreams } from "./stravaProvider.js";

test("maps a Strava activity summary to canonical activity", () => {
  const result = normalizeStravaActivity({
    id: 123,
    name: "Lunch Ride",
    sport_type: "Ride",
    start_date: "2026-09-14T18:00:00Z",
    start_date_local: "2026-09-14T12:00:00",
    elapsed_time: 3600,
    moving_time: 3400,
    distance: 22000,
    total_elevation_gain: 120,
    average_heartrate: 141,
    max_heartrate: 174,
    average_watts: 190,
    average_speed: 6.4,
    kilojoules: 700,
  });

  assert.equal(result.activityUid, "strava:123");
  assert.equal(result.activityTypeNorm, "ride");
  assert.equal(result.distanceM, 22000);
  assert.equal(result.avgPowerW, 190);
});

test("aligns Strava stream values by timestamp/index into canonical samples", () => {
  const result = normalizeStravaStreams("strava:123", {
    time: { data: [0, 5] },
    heartrate: { data: [130, 132] },
    watts: { data: [200, 210] },
    latlng: { data: [[20.97, -89.62], [20.98, -89.61]] },
  });

  assert.equal(result.samples[1].tOffsetS, 5);
  assert.equal(result.samples[1].heartRateBpm, 132);
  assert.equal(result.trackPoints[0].latitude, 20.97);
});
