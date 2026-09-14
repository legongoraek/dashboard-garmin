import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeGarminActivity,
  normalizeGarminDailyHealth,
  normalizeGarminSleep,
  normalizeGarminRecovery,
  normalizeGarminWeeklyDay,
} from "./garminNormalizer.js";

test("normalizes Garmin activity without mutating source", () => {
  const raw = {
    activityId: 42,
    activityName: "Morning Ride",
    activityType: { typeKey: "cycling" },
    startTimeGMT: "2026-09-13 12:00:00",
    startTimeLocal: "2026-09-13 06:00:00",
    duration: 3600,
    movingDuration: 3500,
    distance: 25000,
    elevationGain: 180,
    averageHR: 142,
    maxHR: 171,
    averageSpeed: 6.94,
    calories: 700,
  };
  const snapshot = structuredClone(raw);
  const result = normalizeGarminActivity(raw);

  assert.equal(result.source, "garmin");
  assert.equal(result.sourceActivityId, "42");
  assert.equal(result.activityUid, "garmin:42");
  assert.equal(result.activityTypeNorm, "ride");
  assert.equal(result.distanceM, 25000);
  assert.equal(result.avgHeartRateBpm, 142);
  assert.deepEqual(raw, snapshot);
});

test("preserves missing Garmin daily measurements as null and real zero as zero", () => {
  const result = normalizeGarminDailyHealth({
    calendarDate: "2026-09-13",
    totalSteps: 0,
  });

  assert.equal(result.dateLocal, "2026-09-13");
  assert.equal(result.steps, 0);
  assert.equal(result.restingHeartRateBpm, null);
  assert.equal(result.bodyBatteryCurrent, null);
});

test("normalizes nested Garmin sleep fields", () => {
  const result = normalizeGarminSleep(
    {
      dailySleepDTO: {
        calendarDate: "2026-09-13",
        sleepTimeSeconds: 27000,
        deepSleepSeconds: 5400,
        lightSleepSeconds: 15000,
        remSleepSeconds: 5400,
        awakeSleepSeconds: 1200,
        sleepScores: { overall: { value: 84 } },
      },
    },
    "2026-09-13"
  );

  assert.equal(result.totalSleepS, 27000);
  assert.equal(result.sleepScore, 84);
});

test("combines HRV, readiness, daily and sleep into canonical recovery", () => {
  const result = normalizeGarminRecovery({
    dateLocal: "2026-09-13",
    hrv: { lastNightAvg: 52, status: "BALANCED" },
    readiness: { score: 76, level: "HIGH" },
    daily: {
      restingHeartRate: 48,
      bodyBatteryMostRecentValue: 72,
      averageStressLevel: 23,
    },
    sleep: {
      dailySleepDTO: {
        sleepScores: { overall: { value: 86 } },
      },
    },
  });

  assert.equal(result.hrvMs, 52);
  assert.equal(result.readinessScore, 76);
  assert.equal(result.restingHeartRateBpm, 48);
  assert.equal(result.bodyBattery, 72);
  assert.equal(result.stress, 23);
  assert.equal(result.sleepScore, 86);
});

test("normalizes one weekly day using its local date", () => {
  const result = normalizeGarminWeeklyDay({
    date: "2026-09-13",
    daily: { totalSteps: 10000, totalDistanceMeters: 8000 },
    sleep: { dailySleepDTO: { sleepTimeSeconds: 28000 } },
  });

  assert.equal(result.dateLocal, "2026-09-13");
  assert.equal(result.daily.distanceM, 8000);
  assert.equal(result.sleep.totalSleepS, 28000);
});

test("flags activities without source IDs", () => {
  const result = normalizeGarminActivity({
    startTimeLocal: "2026-09-13 06:00:00",
    activityType: { typeKey: "running" },
  });

  assert.equal(result.activityUid, "garmin:unknown:2026-09-13 06:00:00");
  assert.deepEqual(result.sourceQualityFlags, ["MISSING_SOURCE_ID"]);
});
