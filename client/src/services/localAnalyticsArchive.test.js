import test from "node:test";
import assert from "node:assert/strict";
import { archiveCanonicalActivities } from "./localAnalyticsArchive.js";

test("archives canonical summaries as detail envelopes without samples", async () => {
  const saved = [];
  const activities = [
    { activityUid: "garmin:1", source: "garmin", distanceM: 5000 },
    { activityUid: null, source: "garmin", distanceM: 3000 },
  ];

  const result = await archiveCanonicalActivities(activities, async (detail) => {
    saved.push(detail);
  });

  assert.equal(result.saved, 1);
  assert.equal(result.skipped, 1);
  assert.equal(saved[0].activity.activityUid, "garmin:1");
  assert.deepEqual(saved[0].samples, []);
  assert.deepEqual(saved[0].trackPoints, []);
});
