import {
  CANONICAL_SOURCE,
  createCanonicalActivity,
  createCanonicalDailyHealth,
  createCanonicalRecovery,
  createCanonicalSleep,
} from "./canonical.js";

function valueOrNull(value) {
  return value === undefined || value === null || value === "" ? null : value;
}

function firstPresent(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return null;
}

function numericOrNull(...values) {
  const value = firstPresent(...values);
  if (value === null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function stringOrNull(...values) {
  const value = firstPresent(...values);
  return value === null ? null : String(value);
}

function normalizeActivityType(rawType) {
  const key = String(rawType ?? "").toLowerCase();
  if (["running", "run", "trail_running"].includes(key)) return "run";
  if (["cycling", "biking", "road_biking", "mountain_biking", "bike"].includes(key)) return "ride";
  if (["walking", "walk"].includes(key)) return "walk";
  if (["hiking", "hike"].includes(key)) return "hike";
  if (["swimming", "swim", "lap_swimming", "open_water_swimming"].includes(key)) return "swim";
  if (["strength", "strength_training"].includes(key)) return "strength";
  return "other";
}

export function normalizeGarminActivity(raw = {}) {
  const sourceActivityId = stringOrNull(raw.activityId, raw.id);
  const startedAtUtc = stringOrNull(raw.startTimeGMT, raw.startTimeUtc, raw.startTimeUTC);
  const startedAtLocal = stringOrNull(raw.startTimeLocal, raw.startTime);
  const activityTypeRaw = stringOrNull(
    raw.activityType?.typeKey,
    raw.activityType?.key,
    raw.activityType,
    raw.type
  );
  const sourceQualityFlags = [];

  if (!sourceActivityId) {
    sourceQualityFlags.push("MISSING_SOURCE_ID");
  }

  const fallbackIdentity = startedAtUtc || startedAtLocal || "unknown";

  return createCanonicalActivity({
    activityUid: sourceActivityId
      ? `${CANONICAL_SOURCE.GARMIN}:${sourceActivityId}`
      : `${CANONICAL_SOURCE.GARMIN}:unknown:${fallbackIdentity}`,
    source: CANONICAL_SOURCE.GARMIN,
    sourceActivityId,
    activityTypeRaw,
    activityTypeNorm: normalizeActivityType(activityTypeRaw),
    name: stringOrNull(raw.activityName, raw.name),
    startedAtUtc,
    startedAtLocal,
    timezone: stringOrNull(raw.timeZoneUnitDTO?.unitKey, raw.timeZone, raw.timezone),
    durationS: numericOrNull(raw.duration, raw.durationSeconds),
    movingTimeS: numericOrNull(raw.movingDuration, raw.movingTime, raw.movingTimeSeconds),
    distanceM: numericOrNull(raw.distance, raw.distanceMeters),
    elevationGainM: numericOrNull(raw.elevationGain, raw.elevationGainMeters, raw.totalElevationGain),
    avgHeartRateBpm: numericOrNull(raw.averageHR, raw.averageHeartRate, raw.avgHeartRate),
    maxHeartRateBpm: numericOrNull(raw.maxHR, raw.maxHeartRate),
    avgCadenceRpm: numericOrNull(raw.averageRunningCadenceInStepsPerMinute, raw.averageCadence, raw.avgCadence),
    avgPowerW: numericOrNull(raw.avgPower, raw.averagePower),
    avgSpeedMps: numericOrNull(raw.averageSpeed, raw.avgSpeed),
    caloriesKcal: numericOrNull(raw.calories, raw.totalKilocalories),
    deviceManufacturer: stringOrNull(raw.deviceManufacturer, raw.manufacturer),
    deviceModel: stringOrNull(raw.deviceModel, raw.deviceName),
    sourceQualityFlags,
  });
}

export function normalizeGarminDailyHealth(raw = {}, fallbackDate = null) {
  return createCanonicalDailyHealth({
    dateLocal: stringOrNull(raw.calendarDate, raw.date, fallbackDate),
    source: CANONICAL_SOURCE.GARMIN,
    steps: numericOrNull(raw.totalSteps),
    totalCaloriesKcal: numericOrNull(raw.totalKilocalories),
    activeCaloriesKcal: numericOrNull(raw.activeKilocalories),
    distanceM: numericOrNull(raw.totalDistanceMeters),
    restingHeartRateBpm: numericOrNull(raw.restingHeartRate),
    maxHeartRateBpm: numericOrNull(raw.maxHeartRate),
    averageStress: numericOrNull(raw.averageStressLevel, raw.averageStress),
    bodyBatteryCurrent: numericOrNull(raw.bodyBatteryMostRecentValue),
    bodyBatteryHigh: numericOrNull(raw.bodyBatteryHighestValue),
    bodyBatteryLow: numericOrNull(raw.bodyBatteryLowestValue),
    moderateIntensityMinutes: numericOrNull(raw.moderateIntensityMinutes),
    vigorousIntensityMinutes: numericOrNull(raw.vigorousIntensityMinutes),
  });
}

export function normalizeGarminSleep(raw = {}, fallbackDate = null) {
  const dto = raw?.dailySleepDTO ?? raw ?? {};

  return createCanonicalSleep({
    dateLocal: stringOrNull(dto.calendarDate, raw?.calendarDate, fallbackDate),
    source: CANONICAL_SOURCE.GARMIN,
    totalSleepS: numericOrNull(dto.sleepTimeSeconds),
    deepSleepS: numericOrNull(dto.deepSleepSeconds),
    lightSleepS: numericOrNull(dto.lightSleepSeconds),
    remSleepS: numericOrNull(dto.remSleepSeconds),
    awakeS: numericOrNull(dto.awakeSleepSeconds),
    sleepScore: numericOrNull(dto.sleepScores?.overall?.value, dto.sleepScore),
    startLocal: stringOrNull(dto.sleepStartTimestampLocal, dto.sleepStartLocal),
    endLocal: stringOrNull(dto.sleepEndTimestampLocal, dto.sleepEndLocal),
  });
}

export function normalizeGarminRecovery({
  dateLocal = null,
  hrv = null,
  readiness = null,
  daily = null,
  sleep = null,
} = {}) {
  const normalizedDaily = normalizeGarminDailyHealth(daily ?? {}, dateLocal);
  const normalizedSleep = normalizeGarminSleep(sleep ?? {}, dateLocal);

  return createCanonicalRecovery({
    dateLocal: stringOrNull(dateLocal, normalizedDaily.dateLocal, normalizedSleep.dateLocal),
    source: CANONICAL_SOURCE.GARMIN,
    hrvMs: numericOrNull(hrv?.lastNightAvg, hrv?.weeklyAvg, hrv?.hrvSummary?.lastNightAvg, hrv?.hrvSummary?.weeklyAvg),
    hrvStatus: stringOrNull(hrv?.status, hrv?.hrvStatus, hrv?.hrvSummary?.status),
    readinessScore: numericOrNull(
      readiness?.score,
      readiness?.readinessScore,
      readiness?.trainingReadinessScore,
      readiness?.dailyTrainingReadinessDTO?.score
    ),
    readinessLabel: stringOrNull(
      readiness?.level,
      readiness?.readinessLevel,
      readiness?.dailyTrainingReadinessDTO?.feedbackLong,
      readiness?.dailyTrainingReadinessDTO?.feedbackShort
    ),
    restingHeartRateBpm: normalizedDaily.restingHeartRateBpm,
    bodyBattery: normalizedDaily.bodyBatteryCurrent,
    stress: normalizedDaily.averageStress,
    sleepScore: normalizedSleep.sleepScore,
  });
}

export function normalizeGarminWeeklyDay(raw = {}) {
  const dateLocal = stringOrNull(raw.date, raw.calendarDate);

  return {
    dateLocal,
    source: CANONICAL_SOURCE.GARMIN,
    daily: normalizeGarminDailyHealth(raw.daily ?? {}, dateLocal),
    sleep: normalizeGarminSleep(raw.sleep ?? {}, dateLocal),
  };
}

export { valueOrNull };
