import test from "node:test";
import assert from "node:assert/strict";
import {
  buildActivityUpsert,
  buildTrackPointInsert,
  saveCanonicalActivityBundle,
} from "./postgresAnalyticsStore.js";

test("builds activity upsert preserving null metrics", () => {
  const { text, values } = buildActivityUpsert({
    activityUid: "garmin:1",
    source: "garmin",
    sourceActivityId: "1",
    activityTypeNorm: "run",
    distanceM: null,
    durationS: 3600,
  });

  assert.match(text, /insert into activities/i);
  assert.match(text, /on conflict \(activity_uid\)/i);
  assert.equal(values[0], "garmin:1");
  assert.equal(values.includes(null), true);
});

test("track point insert uses PostGIS point with longitude then latitude", () => {
  const { text, values } = buildTrackPointInsert({
    activityUid: "garmin:1",
    sequence: 2,
    latitude: 20.97,
    longitude: -89.62,
  });

  assert.match(text, /ST_MakePoint\(\$4, \$3\)/);
  assert.equal(values[2], 20.97);
  assert.equal(values[3], -89.62);
});

test("saves one canonical bundle inside a transaction", async () => {
  const calls = [];
  const client = {
    async query(text, values) {
      calls.push({ text, values });
      return { rowCount: 1 };
    },
    release() {
      calls.push({ text: "RELEASE" });
    },
  };
  const pool = { async connect() { return client; } };

  await saveCanonicalActivityBundle(pool, {
    activity: {
      activityUid: "garmin:1",
      source: "garmin",
      sourceActivityId: "1",
      activityTypeNorm: "run",
    },
    samples: [{ activityUid: "garmin:1", tOffsetS: 0, heartRateBpm: 140 }],
    trackPoints: [{ activityUid: "garmin:1", sequence: 0, latitude: 20.97, longitude: -89.62 }],
  });

  assert.equal(calls[0].text, "BEGIN");
  assert.equal(calls.at(-2).text, "COMMIT");
  assert.equal(calls.at(-1).text, "RELEASE");
  assert.ok(calls.some((call) => /insert into activity_sources/i.test(call.text)));
  assert.ok(calls.some((call) => /insert into activity_samples/i.test(call.text)));
  assert.ok(calls.some((call) => /insert into activity_track_points/i.test(call.text)));
});
