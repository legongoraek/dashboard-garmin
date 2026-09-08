import { test } from "node:test";
import assert from "node:assert/strict";
import { loadHeatmapPoints, MAX_ACTIVITIES } from "./heatmapData.js";

function fakeActivities(ids) {
  return async () => ({ ok: true, data: ids.map((activityId) => ({ activityId })) });
}

test("accumulates points across multiple activities", async () => {
  const getActivities = fakeActivities(["a1", "a2"]);
  const getActivityDetail = async (activityId) => ({
    ok: true,
    data: {
      activityId,
      points:
        activityId === "a1"
          ? [{ lat: 1, lon: 1 }]
          : [{ lat: 2, lon: 2 }, { lat: 3, lon: 3 }],
    },
  });

  const result = await loadHeatmapPoints(
    { from: "2026-08-01", to: "2026-08-31" },
    undefined,
    getActivities,
    getActivityDetail
  );

  assert.deepEqual(result.points, [[1, 1], [2, 2], [3, 3]]);
  assert.equal(result.activitiesCount, 2);
  assert.equal(result.skippedCount, 0);
  assert.equal(result.truncated, false);
});

test("skips a failing activity without aborting the rest", async () => {
  const getActivities = fakeActivities(["a1", "a2"]);
  const getActivityDetail = async (activityId) => {
    if (activityId === "a1") throw new Error("network blip");
    return { ok: true, data: { activityId, points: [{ lat: 9, lon: 9 }] } };
  };

  const result = await loadHeatmapPoints(
    { from: "2026-08-01", to: "2026-08-31" },
    undefined,
    getActivities,
    getActivityDetail
  );

  assert.deepEqual(result.points, [[9, 9]]);
  assert.equal(result.skippedCount, 1);
  assert.equal(result.activitiesCount, 2);
});

test("truncated is true when the activity count hits MAX_ACTIVITIES", async () => {
  const ids = Array.from({ length: MAX_ACTIVITIES }, (_, i) => `a${i}`);
  const getActivities = fakeActivities(ids);
  const getActivityDetail = async (activityId) => ({
    ok: true,
    data: { activityId, points: [] },
  });

  const result = await loadHeatmapPoints(
    { from: "2026-01-01", to: "2026-12-31" },
    undefined,
    getActivities,
    getActivityDetail
  );

  assert.equal(result.activitiesCount, MAX_ACTIVITIES);
  assert.equal(result.truncated, true);
});

test("stops the loop and reports rateLimited on a Garmin rate-limit error, without counting it as a skip", async () => {
  const getActivities = fakeActivities(["a1", "a2", "a3"]);
  const getActivityDetail = async (activityId) => {
    if (activityId === "a2") {
      throw new Error(
        "Garmin bloqueó temporalmente el login por demasiados intentos. Espera unos minutos antes de volver a intentar."
      );
    }
    return { ok: true, data: { activityId, points: [{ lat: 1, lon: 1 }] } };
  };

  const result = await loadHeatmapPoints(
    { from: "2026-08-01", to: "2026-08-31" },
    undefined,
    getActivities,
    getActivityDetail
  );

  assert.equal(result.rateLimited, true);
  assert.equal(result.skippedCount, 0);
  assert.deepEqual(result.points, [[1, 1]]);
});

test("calls onProgress once per activity with the running count and total", async () => {
  const getActivities = fakeActivities(["a1", "a2", "a3"]);
  const getActivityDetail = async (activityId) => ({
    ok: true,
    data: { activityId, points: [] },
  });

  const calls = [];
  await loadHeatmapPoints(
    { from: "2026-08-01", to: "2026-08-31" },
    (current, total) => calls.push([current, total]),
    getActivities,
    getActivityDetail
  );

  assert.deepEqual(calls, [[1, 3], [2, 3], [3, 3]]);
});
