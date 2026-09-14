import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeGarminActivityDetail,
  buildMetricSeries,
} from "./activityDetail.js";

test("normalizes Garmin detail points into canonical track points and samples", () => {
  const result = normalizeGarminActivityDetail("42", {
    data: {
      activityId: 42,
      activityName: "Morning Run",
      activityType: { typeKey: "running" },
      distance: 5000,
      duration: 1500,
      points: [
        { lat: 20.97, lon: -89.62, altitude: 9, heartRate: 140, speed: 3.1, cadence: 82, timestamp: "2026-09-14T12:00:00Z" },
        { lat: 20.98, lon: -89.61, altitude: 11, heartRate: 145, speed: 3.3, cadence: 84, timestamp: "2026-09-14T12:00:05Z" },
      ],
    },
  });

  assert.equal(result.activity.activityUid, "garmin:42");
  assert.equal(result.activity.distanceM, 5000);
  assert.equal(result.trackPoints.length, 2);
  assert.deepEqual(result.trackPoints[0], {
    activityUid: "garmin:42",
    sequence: 0,
    timestampUtc: "2026-09-14T12:00:00Z",
    latitude: 20.97,
    longitude: -89.62,
    altitudeM: 9,
    distanceM: null,
  });
  assert.equal(result.samples[1].heartRateBpm, 145);
  assert.equal(result.samples[1].cadenceRpm, 84);
});

test("ignores invalid GPS points but preserves metric samples", () => {
  const result = normalizeGarminActivityDetail("7", {
    data: {
      points: [{ heartRate: 120, power: 210 }],
    },
  });

  assert.equal(result.trackPoints.length, 0);
  assert.equal(result.samples.length, 1);
  assert.equal(result.samples[0].powerW, 210);
});

test("buildMetricSeries preserves null gaps", () => {
  const result = buildMetricSeries([
    { tOffsetS: 0, heartRateBpm: 130 },
    { tOffsetS: 5, heartRateBpm: null },
  ], "heartRateBpm");

  assert.deepEqual(result, [
    { x: 0, value: 130 },
    { x: 5, value: null },
  ]);
});
