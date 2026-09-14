function nullable(value) {
  return value === undefined ? null : value;
}

export function buildActivityUpsert(activity) {
  const values = [
    activity.activityUid,
    activity.activityTypeNorm ?? "other",
    nullable(activity.name),
    nullable(activity.startedAtUtc),
    nullable(activity.startedAtLocal),
    nullable(activity.timezone),
    nullable(activity.durationS),
    nullable(activity.movingTimeS),
    nullable(activity.distanceM),
    nullable(activity.elevationGainM),
    nullable(activity.avgHeartRateBpm),
    nullable(activity.maxHeartRateBpm),
    nullable(activity.avgCadenceRpm),
    nullable(activity.avgPowerW),
    nullable(activity.avgSpeedMps),
    nullable(activity.caloriesKcal),
  ];

  return {
    text: `
      INSERT INTO activities (
        activity_uid, activity_type_norm, name, started_at_utc, started_at_local,
        timezone, duration_s, moving_time_s, distance_m, elevation_gain_m,
        avg_heart_rate_bpm, max_heart_rate_bpm, avg_cadence_rpm, avg_power_w,
        avg_speed_mps, calories_kcal, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,now()
      )
      ON CONFLICT (activity_uid) DO UPDATE SET
        activity_type_norm = EXCLUDED.activity_type_norm,
        name = EXCLUDED.name,
        started_at_utc = EXCLUDED.started_at_utc,
        started_at_local = EXCLUDED.started_at_local,
        timezone = EXCLUDED.timezone,
        duration_s = EXCLUDED.duration_s,
        moving_time_s = EXCLUDED.moving_time_s,
        distance_m = EXCLUDED.distance_m,
        elevation_gain_m = EXCLUDED.elevation_gain_m,
        avg_heart_rate_bpm = EXCLUDED.avg_heart_rate_bpm,
        max_heart_rate_bpm = EXCLUDED.max_heart_rate_bpm,
        avg_cadence_rpm = EXCLUDED.avg_cadence_rpm,
        avg_power_w = EXCLUDED.avg_power_w,
        avg_speed_mps = EXCLUDED.avg_speed_mps,
        calories_kcal = EXCLUDED.calories_kcal,
        updated_at = now()
      RETURNING id
    `,
    values,
  };
}

function buildSourceUpsert(activityId, activity) {
  return {
    text: `
      INSERT INTO activity_sources (
        activity_id, source, source_activity_id, source_quality_flags
      ) VALUES ($1, $2, $3, $4::jsonb)
      ON CONFLICT (source, source_activity_id) DO UPDATE SET
        activity_id = EXCLUDED.activity_id,
        source_quality_flags = EXCLUDED.source_quality_flags
    `,
    values: [
      activityId,
      activity.source,
      nullable(activity.sourceActivityId),
      JSON.stringify(activity.sourceQualityFlags ?? []),
    ],
  };
}

function buildSampleInsert(activityId, sample) {
  return {
    text: `
      INSERT INTO activity_samples (
        activity_id, t_offset_s, timestamp_utc, distance_m, speed_mps,
        heart_rate_bpm, cadence_rpm, power_w, altitude_m, temperature_c,
        source_quality_flags
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
    `,
    values: [
      activityId,
      nullable(sample.tOffsetS),
      nullable(sample.timestampUtc),
      nullable(sample.distanceM),
      nullable(sample.speedMps),
      nullable(sample.heartRateBpm),
      nullable(sample.cadenceRpm),
      nullable(sample.powerW),
      nullable(sample.altitudeM),
      nullable(sample.temperatureC),
      JSON.stringify(sample.sourceQualityFlags ?? []),
    ],
  };
}

export function buildTrackPointInsert(point, activityIdOverride = null) {
  const activityId = activityIdOverride ?? point.activityUid;
  return {
    text: `
      INSERT INTO activity_track_points (
        activity_id, sequence, timestamp_utc, point, altitude_m, distance_m
      ) VALUES (
        $1, $2, $5, ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography, $6, $7
      )
      ON CONFLICT (activity_id, sequence) DO UPDATE SET
        timestamp_utc = EXCLUDED.timestamp_utc,
        point = EXCLUDED.point,
        altitude_m = EXCLUDED.altitude_m,
        distance_m = EXCLUDED.distance_m
    `,
    values: [
      activityId,
      point.sequence,
      point.latitude,
      point.longitude,
      nullable(point.timestampUtc),
      nullable(point.altitudeM),
      nullable(point.distanceM),
    ],
  };
}

export async function saveCanonicalActivityBundle(pool, detail) {
  if (!detail?.activity?.activityUid) {
    throw new Error("Canonical activity bundle requires activityUid");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const activityQuery = buildActivityUpsert(detail.activity);
    const activityResult = await client.query(activityQuery.text, activityQuery.values);
    const activityId = activityResult.rows?.[0]?.id ?? activityResult.rowCount;

    const sourceQuery = buildSourceUpsert(activityId, detail.activity);
    await client.query(sourceQuery.text, sourceQuery.values);

    await client.query("DELETE FROM activity_samples WHERE activity_id = $1", [activityId]);
    for (const sample of detail.samples ?? []) {
      const query = buildSampleInsert(activityId, sample);
      await client.query(query.text, query.values);
    }

    await client.query("DELETE FROM activity_track_points WHERE activity_id = $1", [activityId]);
    for (const point of detail.trackPoints ?? []) {
      const query = buildTrackPointInsert(point, activityId);
      await client.query(query.text, query.values);
    }

    await client.query("COMMIT");
    return { activityId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
