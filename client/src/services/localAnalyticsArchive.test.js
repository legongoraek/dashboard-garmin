import test from "node:test";
import assert from "node:assert/strict";
import { archiveCanonicalActivities } from "./localAnalyticsArchive.js";

test("archives canonical summaries as detail envelopes without samples when no detail exists", async () => {
  const saved = [];
  const activities = [
    { activityUid: "garmin:1", source: "garmin", distanceM: 5000 },
    { activityUid: null, source: "garmin", distanceM: 3000 },
  ];

  const result = await archiveCanonicalActivities(
    activities,
    async (detail) => saved.push(detail),
    async () => null
  );

  assert.equal(result.saved, 1);
  assert.equal(result.skipped, 1);
  assert.equal(saved[0].activity.activityUid, "garmin:1");
  assert.deepEqual(saved[0].samples, []);
  assert.deepEqual(saved[0].trackPoints, []);
});

test("preserves enriched samples and track points when archiving a newer Garmin summary", async () => {
  const saved = [];
  const existing = {
    activity: {
      activityUid: "garmin:1",
      source: "garmin",
      distanceM: 4900,
      avgHeartRateBpm: 145,
    },
    samples: [{ activityUid: "garmin:1", tOffsetS: 0, heartRateBpm: 140 }],
    trackPoints: [{ activityUid: "garmin:1", sequence: 0, latitude: 20.9, longitude: -89.6 }],
    raw: { retained: true },
  };

  await archiveCanonicalActivities(
    [{ activityUid: "garmin:1", source: "garmin", distanceM: 5000, elevationGainM: 50 }],
    async (detail) => saved.push(detail),
    async () => existing
  );

  assert.equal(saved.length, 1);
  assert.equal(saved[0].activity.distanceM, 5000);
  assert.equal(saved[0].activity.avgHeartRateBpm, 145);
  assert.equal(saved[0].activity.elevationGainM, 50);
  assert.deepEqual(saved[0].samples, existing.samples);
  assert.deepEqual(saved[0].trackPoints, existing.trackPoints);
  assert.deepEqual(saved[0].raw, existing.raw);
});
