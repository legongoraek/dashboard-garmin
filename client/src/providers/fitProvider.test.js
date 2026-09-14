import test from "node:test";
import assert from "node:assert/strict";
import { fitMessagesToCanonical, parseFitToCanonical } from "./fitProvider.js";

test("maps decoded FIT session and records to canonical detail", () => {
  const result = fitMessagesToCanonical({
    sessionMesgs: [{
      startTime: new Date("2026-09-14T12:00:00Z"),
      sport: "running",
      totalDistance: 5000,
      totalElapsedTime: 1500,
      totalAscent: 45,
      avgHeartRate: 145,
      maxHeartRate: 172,
    }],
    recordMesgs: [
      { timestamp: new Date("2026-09-14T12:00:00Z"), positionLat: 250000000, positionLong: -1070000000, altitude: 8, heartRate: 140 },
      { timestamp: new Date("2026-09-14T12:00:05Z"), positionLat: 250010000, positionLong: -1069990000, altitude: 9, heartRate: 142, power: 230 },
    ],
  }, { fileName: "run.fit" });

  assert.equal(result.activity.source, "fit");
  assert.equal(result.activity.distanceM, 5000);
  assert.equal(result.samples.length, 2);
  assert.equal(result.samples[1].powerW, 230);
  assert.equal(result.trackPoints.length, 2);
});

test("loads the installed Garmin FIT SDK and rejects non-FIT binary input", async () => {
  const invalid = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer;
  await assert.rejects(
    () => parseFitToCanonical(invalid, { fileName: "invalid.fit" }),
    /no es un FIT válido/i
  );
});
