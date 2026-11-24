import test from "node:test";
import assert from "node:assert/strict";
import {
  INSERT_BATCH_SIZE,
  buildActivityUpsert,
  buildSampleBatchInsert,
  buildTrackPointBatchInsert,
  buildTrackPointInsert,
  chunk,
  lastTrackPointPerSequence,
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

test("saves one canonical bundle inside a transaction and replaces sample/track children", async () => {
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
  assert.ok(calls.some((call) => /delete from activity_samples/i.test(call.text)));
  assert.ok(calls.some((call) => /delete from activity_track_points/i.test(call.text)));
  assert.ok(calls.some((call) => /insert into activity_samples/i.test(call.text)));
  assert.ok(calls.some((call) => /insert into activity_track_points/i.test(call.text)));
});

function recordingPool() {
  const calls = [];
  const client = {
    async query(text, values) {
      calls.push({ text, values });
      return { rows: [{ id: 7 }], rowCount: 1 };
    },
    release() {},
  };
  return { calls, pool: { async connect() { return client; } } };
}

function maxPlaceholder(text) {
  return Math.max(...[...text.matchAll(/\$(\d+)/g)].map((m) => Number(m[1])));
}

test("batches samples and track points instead of one round trip per row", async () => {
  const { calls, pool } = recordingPool();
  const samples = Array.from({ length: 2500 }, (_, i) => ({ tOffsetS: i, heartRateBpm: 120 + (i % 40) }));
  const trackPoints = Array.from({ length: 2500 }, (_, i) => ({ sequence: i, latitude: 20.9 + i / 1e5, longitude: -89.6 }));

  await saveCanonicalActivityBundle(pool, {
    activity: { activityUid: "garmin:big", source: "garmin", sourceActivityId: "big", activityTypeNorm: "run" },
    samples,
    trackPoints,
  });

  const sampleInserts = calls.filter((c) => /insert into activity_samples/i.test(c.text));
  const pointInserts = calls.filter((c) => /insert into activity_track_points/i.test(c.text));
  // 2,500 rows / 1,000 per batch = 3 statements each (was 2,500 each).
  assert.equal(sampleInserts.length, Math.ceil(2500 / INSERT_BATCH_SIZE));
  assert.equal(pointInserts.length, Math.ceil(2500 / INSERT_BATCH_SIZE));
  assert.equal(sampleInserts.reduce((n, c) => n + c.values.length, 0), 2500 * 11);
  assert.equal(pointInserts.reduce((n, c) => n + c.values.length, 0), 2500 * 7);
  for (const c of [...sampleInserts, ...pointInserts]) {
    assert.equal(maxPlaceholder(c.text), c.values.length, "every bind parameter is referenced");
    assert.ok(c.values.length <= 65535, "stays under the PostgreSQL parameter limit");
  }
  // Order is preserved across batches.
  assert.equal(sampleInserts[1].values[1], 1000);
  assert.equal(pointInserts[2].values[1], 2000);
  assert.equal(calls.at(-1).text, "COMMIT");
});

test("sample batch keeps column order and jsonb cast per row", () => {
  const { text, values } = buildSampleBatchInsert(7, [{ tOffsetS: 0 }, { tOffsetS: 1, powerW: 250 }]);
  assert.match(text, /\(\$1,\$2,\$3,\$4,\$5,\$6,\$7,\$8,\$9,\$10,\$11::jsonb\)/);
  assert.match(text, /\(\$12,\$13,\$14,\$15,\$16,\$17,\$18,\$19,\$20,\$21,\$22::jsonb\)/);
  assert.equal(values.length, 22);
  assert.equal(values[11], 7);
  assert.equal(values[18], 250);
  assert.equal(values[10], "[]");
});

test("track point batch keeps longitude-then-latitude for every row", () => {
  const { text, values } = buildTrackPointBatchInsert(7, [
    { sequence: 0, latitude: 1, longitude: 2 },
    { sequence: 1, latitude: 3, longitude: 4 },
  ]);
  assert.match(text, /ST_MakePoint\(\$4, \$3\)/);
  assert.match(text, /ST_MakePoint\(\$11, \$10\)/);
  assert.match(text, /on conflict \(activity_id, sequence\) do update/i);
  assert.deepEqual(values.slice(7, 11), [7, 1, 3, 4]);
});

test("duplicate sequences keep the last value, like the previous row-by-row upsert", () => {
  const points = lastTrackPointPerSequence([
    { sequence: 0, latitude: 1, longitude: 1 },
    { sequence: 1, latitude: 2, longitude: 2 },
    { sequence: 0, latitude: 9, longitude: 9 },
  ]);
  assert.deepEqual(points.map((p) => [p.sequence, p.latitude]), [[0, 9], [1, 2]]);
});

test("empty bundles issue no child inserts", async () => {
  const { calls, pool } = recordingPool();
  await saveCanonicalActivityBundle(pool, {
    activity: { activityUid: "garmin:empty", source: "garmin", sourceActivityId: "e", activityTypeNorm: "run" },
  });
  assert.equal(calls.filter((c) => /insert into activity_(samples|track_points)/i.test(c.text)).length, 0);
  assert.equal(chunk([]).length, 0);
});
