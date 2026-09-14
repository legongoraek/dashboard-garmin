import test from "node:test";
import assert from "node:assert/strict";
import { parseGpxToCanonical } from "./gpxProvider.js";

const GPX = `<?xml version="1.0"?><gpx><trk><name>Morning Route</name><trkseg>
<trkpt lat="20.970" lon="-89.620"><ele>8.5</ele><time>2026-09-14T12:00:00Z</time></trkpt>
<trkpt lat="20.971" lon="-89.619"><ele>9.0</ele><time>2026-09-14T12:00:10Z</time></trkpt>
</trkseg></trk></gpx>`;

test("parses GPX into canonical activity and track points", () => {
  const result = parseGpxToCanonical(GPX, { source: "gpx", fileName: "route.gpx" });
  assert.equal(result.activity.source, "gpx");
  assert.equal(result.activity.name, "Morning Route");
  assert.equal(result.activity.startedAtUtc, "2026-09-14T12:00:00Z");
  assert.equal(result.trackPoints.length, 2);
  assert.equal(result.trackPoints[0].altitudeM, 8.5);
  assert.ok(result.activity.distanceM > 0);
});

test("Komoot GPX keeps Komoot provenance", () => {
  const result = parseGpxToCanonical(GPX, { source: "komoot", fileName: "komoot-tour.gpx" });
  assert.equal(result.activity.source, "komoot");
  assert.match(result.activity.activityUid, /^komoot:/);
});
