import test from "node:test";
import assert from "node:assert/strict";
import {
  aggregateActivitiesByWeek,
  buildRecoverySeries,
  addRollingAverage,
  getPeriodStartDate,
} from "./trends.js";

test("aggregates canonical activities into Monday-based local weeks", () => {
  const result = aggregateActivitiesByWeek([
    {
      activityUid: "garmin:1",
      startedAtLocal: "2026-09-07 07:00:00",
      activityTypeNorm: "run",
      distanceM: 5000,
      durationS: 1800,
      elevationGainM: 40,
    },
    {
      activityUid: "garmin:2",
      startedAtLocal: "2026-09-09 07:00:00",
      activityTypeNorm: "ride",
      distanceM: 20000,
      durationS: 3600,
      elevationGainM: 100,
    },
  ]);

  assert.deepEqual(result[0], {
    weekStart: "2026-09-07",
    activityCount: 2,
    distanceM: 25000,
    durationS: 5400,
    elevationGainM: 140,
  });
});

test("keeps weekly metric null when every activity lacks that metric", () => {
  const result = aggregateActivitiesByWeek([
    {
      activityUid: "garmin:1",
      startedAtLocal: "2026-09-07 07:00:00",
      distanceM: null,
      durationS: 1800,
      elevationGainM: null,
    },
  ]);

  assert.equal(result[0].distanceM, null);
  assert.equal(result[0].durationS, 1800);
  assert.equal(result[0].elevationGainM, null);
});

test("does not turn missing recovery values into zero", () => {
  const result = buildRecoverySeries([
    { dateLocal: "2026-09-12", hrvMs: null, restingHeartRateBpm: 49 },
  ]);

  assert.equal(result[0].hrvMs, null);
  assert.equal(result[0].restingHeartRateBpm, 49);
});

test("sorts recovery values chronologically", () => {
  const result = buildRecoverySeries([
    { dateLocal: "2026-09-13", hrvMs: 51 },
    { dateLocal: "2026-09-11", hrvMs: 49 },
  ]);

  assert.deepEqual(result.map((row) => row.dateLocal), ["2026-09-11", "2026-09-13"]);
});

test("rolling average ignores null samples and remains null with no samples", () => {
  const result = addRollingAverage(
    [{ value: null }, { value: 10 }, { value: 20 }],
    "value",
    "avg2",
    2
  );

  assert.equal(result[0].avg2, null);
  assert.equal(result[1].avg2, 10);
  assert.equal(result[2].avg2, 15);
});

test("4w period returns 27 days before the inclusive end date", () => {
  assert.equal(getPeriodStartDate("2026-09-13", "4w"), "2026-08-17");
});

test("6m and 1y periods use calendar subtraction", () => {
  assert.equal(getPeriodStartDate("2026-09-13", "6m"), "2026-03-13");
  assert.equal(getPeriodStartDate("2026-09-13", "1y"), "2025-09-13");
});

test("calendar subtraction clamps to the last valid target day", () => {
  assert.equal(getPeriodStartDate("2026-08-31", "6m"), "2026-02-28");
  assert.equal(getPeriodStartDate("2024-02-29", "1y"), "2023-02-28");
});
