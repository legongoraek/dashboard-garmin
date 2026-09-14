import { CANONICAL_SOURCE, createCanonicalActivity } from "../domain/analytics/canonical.js";

function num(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sportNorm(value) {
  const sport = String(value ?? "").toLowerCase();
  if (sport.includes("run")) return "run";
  if (sport.includes("ride") || sport.includes("cycl")) return "ride";
  if (sport.includes("walk")) return "walk";
  if (sport.includes("hik")) return "hike";
  if (sport.includes("swim")) return "swim";
  if (sport.includes("weight") || sport.includes("strength")) return "strength";
  return "other";
}

export function normalizeStravaActivity(raw = {}) {
  const sourceId = raw.id == null ? "unknown" : String(raw.id);
  return createCanonicalActivity({
    activityUid: `strava:${sourceId}`,
    source: CANONICAL_SOURCE.STRAVA,
    sourceActivityId: sourceId,
    activityTypeRaw: raw.sport_type ?? raw.type ?? null,
    activityTypeNorm: sportNorm(raw.sport_type ?? raw.type),
    name: raw.name ?? null,
    startedAtUtc: raw.start_date ?? null,
    startedAtLocal: raw.start_date_local ?? null,
    timezone: raw.timezone ?? null,
    durationS: num(raw.elapsed_time),
    movingTimeS: num(raw.moving_time),
    distanceM: num(raw.distance),
    elevationGainM: num(raw.total_elevation_gain),
    avgHeartRateBpm: num(raw.average_heartrate),
    maxHeartRateBpm: num(raw.max_heartrate),
    avgCadenceRpm: num(raw.average_cadence),
    avgPowerW: num(raw.average_watts),
    avgSpeedMps: num(raw.average_speed),
    caloriesKcal: num(raw.calories),
    deviceModel: raw.device_name ?? null,
    sourceQualityFlags: [],
  });
}

export function normalizeStravaStreams(activityUid, streams = {}) {
  const time = streams.time?.data ?? [];
  const distance = streams.distance?.data ?? [];
  const speed = streams.velocity_smooth?.data ?? [];
  const heartRate = streams.heartrate?.data ?? [];
  const cadence = streams.cadence?.data ?? [];
  const watts = streams.watts?.data ?? [];
  const altitude = streams.altitude?.data ?? [];
  const temperature = streams.temp?.data ?? [];
  const latlng = streams.latlng?.data ?? [];
  const count = Math.max(time.length, distance.length, speed.length, heartRate.length, cadence.length, watts.length, altitude.length, temperature.length, latlng.length);

  const samples = Array.from({ length: count }, (_, index) => ({
    activityUid,
    tOffsetS: num(time[index]) ?? index,
    timestampUtc: null,
    distanceM: num(distance[index]),
    speedMps: num(speed[index]),
    heartRateBpm: num(heartRate[index]),
    cadenceRpm: num(cadence[index]),
    powerW: num(watts[index]),
    altitudeM: num(altitude[index]),
    temperatureC: num(temperature[index]),
    sourceQualityFlags: [],
  }));

  const trackPoints = latlng
    .map((pair, sequence) => {
      if (!Array.isArray(pair) || pair.length < 2) return null;
      const latitude = num(pair[0]);
      const longitude = num(pair[1]);
      if (latitude === null || longitude === null) return null;
      return {
        activityUid,
        sequence,
        timestampUtc: null,
        latitude,
        longitude,
        altitudeM: num(altitude[sequence]),
        distanceM: num(distance[sequence]),
      };
    })
    .filter(Boolean);

  return { samples, trackPoints };
}
