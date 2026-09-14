import test from "node:test";
import assert from "node:assert/strict";
import { syncStravaRecentActivities } from "./stravaSync.js";

test("syncs Strava summaries and streams sequentially into canonical persistence", async () => {
  const calls = [];
  const saved = [];
  const api = {
    async getActivities() {
      return { data: [{ id: 1, name: "Run", sport_type: "Run", distance: 5000 }] };
    },
    async getStreams(id) {
      calls.push(id);
      return { data: { time: { data: [0] }, heartrate: { data: [140] }, latlng: { data: [[20.97, -89.62]] } } };
    },
    async save(detail) {
      saved.push(detail);
    },
  };

  const result = await syncStravaRecentActivities({ limit: 10, api });
  assert.deepEqual(calls, [1]);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].activity.activityUid, "strava:1");
  assert.equal(saved[0].samples[0].heartRateBpm, 140);
  assert.equal(result.synced, 1);
  assert.equal(result.failed, 0);
});

test("continues when one Strava stream request fails", async () => {
  const saved = [];
  const result = await syncStravaRecentActivities({
    limit: 10,
    api: {
      async getActivities() { return { data: [{ id: 1, sport_type: "Run" }, { id: 2, sport_type: "Ride" }] }; },
      async getStreams(id) { if (id === 1) throw new Error("partial"); return { data: {} }; },
      async save(detail) { saved.push(detail); },
    },
  });
  assert.equal(result.synced, 2);
  assert.equal(result.failed, 1);
  assert.equal(saved.length, 2);
});
