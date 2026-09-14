import { createCanonicalActivity, CANONICAL_SOURCE } from "./canonical.js";

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function firstPresent(...values) {
  return values.find((value) => value !== null && value !== undefined && value !== "") ?? null;
}

function normalizeSport(raw) {
  const value = String(raw ?? "").toLowerCase();
  if (value.includes("run")) return "run";
  if (value.includes("cycl") || value.includes("bike") || value.includes("ride")) return "ride";
  if (value.includes("walk")) return "walk";
  if (value.includes("hik")) return "hike";
  if (value.includes("swim")) return "swim";
  if (value.includes("strength")) return "strength";
  return "other";
}

export function normalizeGarminActivityDetail(activityId, response) {
  const raw = response?.data ?? response ?? {};
  const sourceId = String(firstPresent(raw.activityId, activityId) ?? activityId ?? "unknown");
  const activityUid = `${CANONICAL_SOURCE.GARMIN}:${sourceId}`;
  const points = Array.isArray(raw.points)
    ? raw.points
    : Array.isArray(raw.geoPolylineDTO?.polyline)
      ? raw.geoPolylineDTO.polyline
      : [];

  const typeRaw = firstPresent(raw.activityType?.typeKey, raw.activityType, raw.sportType);
  const activity = createCanonicalActivity({
    activityUid,
    source: CANONICAL_SOURCE.GARMIN,
    sourceActivityId: sourceId,
    activityTypeRaw: typeRaw,
    activityTypeNorm: normalizeSport(typeRaw),
    name: firstPresent(raw.activityName, raw.name),
    startedAtUtc: firstPresent(raw.startTimeGMT, raw.startTimeUtc),
    startedAtLocal: firstPresent(raw.startTimeLocal, raw.startTimeLocalFormatted),
    timezone: firstPresent(raw.timeZoneUnitDTO?.unitKey, raw.timezone),
    durationS: numberOrNull(firstPresent(raw.duration, raw.elapsedDuration, raw.elapsedTime)),
    movingTimeS: numberOrNull(firstPresent(raw.movingDuration, raw.movingTime)),
    distanceM: numberOrNull(firstPresent(raw.distance, raw.totalDistanceMeters)),
    elevationGainM: numberOrNull(firstPresent(raw.elevationGain, raw.totalElevationGain)),
    avgHeartRateBpm: numberOrNull(firstPresent(raw.averageHR, raw.averageHeartRate)),
    maxHeartRateBpm: numberOrNull(firstPresent(raw.maxHR, raw.maxHeartRate)),
    avgCadenceRpm: numberOrNull(firstPresent(raw.averageRunCadence, raw.averageBikingCadence, raw.averageCadence)),
    avgPowerW: numberOrNull(firstPresent(raw.avgPower, raw.averagePower)),
    avgSpeedMps: numberOrNull(firstPresent(raw.averageSpeed, raw.avgSpeed)),
    caloriesKcal: numberOrNull(firstPresent(raw.calories, raw.totalKilocalories)),
  });

  const samples = points.map((point, sequence) => ({
    activityUid,
    tOffsetS: numberOrNull(firstPresent(point.tOffsetS, point.elapsedSeconds, point.elapsedTime, sequence)),
    timestampUtc: firstPresent(point.timestampUtc, point.timestamp, point.time),
    distanceM: numberOrNull(firstPresent(point.distanceM, point.distance)),
    speedMps: numberOrNull(firstPresent(point.speedMps, point.speed)),
    heartRateBpm: numberOrNull(firstPresent(point.heartRateBpm, point.heartRate, point.hr)),
    cadenceRpm: numberOrNull(firstPresent(point.cadenceRpm, point.cadence)),
    powerW: numberOrNull(firstPresent(point.powerW, point.power, point.watts)),
    altitudeM: numberOrNull(firstPresent(point.altitudeM, point.altitude, point.elevation)),
    temperatureC: numberOrNull(firstPresent(point.temperatureC, point.temperature)),
    sourceQualityFlags: [],
  }));

  const trackPoints = points
    .map((point, sequence) => {
      const latitude = numberOrNull(firstPresent(point.lat, point.latitude));
      const longitude = numberOrNull(firstPresent(point.lon, point.lng, point.longitude));
      if (latitude === null || longitude === null) return null;
      return {
        activityUid,
        sequence,
        timestampUtc: firstPresent(point.timestampUtc, point.timestamp, point.time),
        latitude,
        longitude,
        altitudeM: numberOrNull(firstPresent(point.altitudeM, point.altitude, point.elevation)),
        distanceM: numberOrNull(firstPresent(point.distanceM, point.distance)),
      };
    })
    .filter(Boolean);

  return { activity, samples, trackPoints, raw };
}

export function buildMetricSeries(samples = [], metricKey) {
  return samples.map((sample, index) => ({
    x: sample?.tOffsetS ?? index,
    value: numberOrNull(sample?.[metricKey]),
  }));
}
