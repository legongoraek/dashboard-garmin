import test from "node:test";
import assert from "node:assert/strict";
import { loadAnalyticsTrends } from "./trendsData.js";

test("loads canonical trend data for a requested period", async () => {
  const api = {
    getActivities: async () => ({
      data: [
        {
          activityId: 1,
          startTimeLocal: "2026-09-10 07:00:00",
          distance: 5000,
          duration: 1800,
        },
      ],
    }),
    getWeekly: async () => ({
      data: {
        days: [
          {
            date: "2026-09-10",
            daily: {
              restingHeartRate: 49,
              averageStressLevel: 22,
              bodyBatteryMostRecentValue: 70,
            },
            sleep: {
              dailySleepDTO: {
                sleepScores: { overall: { value: 85 } },
              },
            },
          },
        ],
      },
    }),
    getHrv: async (date) => ({
      data: date === "2026-09-10" ? { lastNightAvg: 55, status: "BALANCED" } : {},
    }),
    getReadiness: async (date) => ({
      data: date === "2026-09-10" ? { score: 78, level: "HIGH" } : {},
    }),
  };

  const result = await loadAnalyticsTrends({
    endDate: "2026-09-13",
    period: "7d",
    api,
  });

  assert.equal(result.from, "2026-09-07");
  assert.equal(result.to, "2026-09-13");
  assert.equal(result.weeklyActivity[0].distanceM, 5000);
  const recovery = result.recovery.find((row) => row.dateLocal === "2026-09-10");
  assert.equal(recovery.hrvMs, 55);
  assert.equal(recovery.readinessScore, 78);
  assert.equal(recovery.sleepScore, 85);
});

test("keeps available data when one metric source fails", async () => {
  const api = {
    getActivities: async () => ({ data: [] }),
    getWeekly: async () => ({
      data: {
        days: [
          {
            date: "2026-09-10",
            daily: { restingHeartRate: 50 },
          },
        ],
      },
    }),
    getHrv: async (date) => {
      if (date === "2026-09-10") throw new Error("HRV unavailable");
      return { data: {} };
    },
    getReadiness: async () => ({ data: {} }),
  };

  const result = await loadAnalyticsTrends({
    endDate: "2026-09-13",
    period: "7d",
    api,
  });

  const recovery = result.recovery.find((row) => row.dateLocal === "2026-09-10");
  assert.equal(recovery.restingHeartRateBpm, 50);
  assert.equal(recovery.hrvMs, null);
  assert.ok(
    result.partialErrors.some(
      (item) => item.source === "hrv" && item.date === "2026-09-10"
    )
  );
});

test("rethrows terminal Garmin rate limit failures", async () => {
  const api = {
    getActivities: async () => {
      throw new Error("Garmin rate limited request (429)");
    },
    getWeekly: async () => ({ data: { days: [] } }),
    getHrv: async () => ({ data: {} }),
    getReadiness: async () => ({ data: {} }),
  };

  await assert.rejects(
    () =>
      loadAnalyticsTrends({
        endDate: "2026-09-13",
        period: "7d",
        api,
      }),
    /rate limited/i
  );
});
