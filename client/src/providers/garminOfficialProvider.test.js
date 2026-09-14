import test from "node:test";
import assert from "node:assert/strict";
import { normalizeGarminOfficialFitMessages } from "./garminOfficialProvider.js";

test("relabels official Garmin FIT ingestion without changing canonical consumers", () => {
  const result = normalizeGarminOfficialFitMessages({
    sessionMesgs: [{ startTime: new Date("2026-09-14T12:00:00Z"), sport: "running", totalDistance: 5000 }],
    recordMesgs: [],
  }, { sourceActivityId: "garmin-official-123", fileName: "activity.fit" });

  assert.equal(result.activity.source, "garmin_official");
  assert.equal(result.activity.sourceActivityId, "garmin-official-123");
  assert.equal(result.activity.activityUid, "garmin_official:garmin-official-123");
  assert.equal(result.activity.distanceM, 5000);
});
