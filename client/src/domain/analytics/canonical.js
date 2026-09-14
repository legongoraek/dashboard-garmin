export const CANONICAL_SOURCE = Object.freeze({
  GARMIN: "garmin",
  GARMIN_OFFICIAL: "garmin_official",
  STRAVA: "strava",
  FIT: "fit",
  GPX: "gpx",
  KOMOOT: "komoot",
});

export function createCanonicalActivity(values = {}) {
  return {
    activityUid: null,
    source: CANONICAL_SOURCE.GARMIN,
    sourceActivityId: null,
    activityTypeRaw: null,
    activityTypeNorm: "other",
    name: null,
    startedAtUtc: null,
    startedAtLocal: null,
    timezone: null,
    durationS: null,
    movingTimeS: null,
    distanceM: null,
    elevationGainM: null,
    avgHeartRateBpm: null,
    maxHeartRateBpm: null,
    avgCadenceRpm: null,
    avgPowerW: null,
    avgSpeedMps: null,
    caloriesKcal: null,
    deviceManufacturer: null,
    deviceModel: null,
    sourceQualityFlags: [],
    ...values,
  };
}

export function createCanonicalDailyHealth(values = {}) {
  return {
    dateLocal: null,
    source: CANONICAL_SOURCE.GARMIN,
    steps: null,
    totalCaloriesKcal: null,
    activeCaloriesKcal: null,
    distanceM: null,
    restingHeartRateBpm: null,
    maxHeartRateBpm: null,
    averageStress: null,
    bodyBatteryCurrent: null,
    bodyBatteryHigh: null,
    bodyBatteryLow: null,
    moderateIntensityMinutes: null,
    vigorousIntensityMinutes: null,
    ...values,
  };
}

export function createCanonicalSleep(values = {}) {
  return {
    dateLocal: null,
    source: CANONICAL_SOURCE.GARMIN,
    totalSleepS: null,
    deepSleepS: null,
    lightSleepS: null,
    remSleepS: null,
    awakeS: null,
    sleepScore: null,
    startLocal: null,
    endLocal: null,
    ...values,
  };
}

export function createCanonicalRecovery(values = {}) {
  return {
    dateLocal: null,
    source: CANONICAL_SOURCE.GARMIN,
    hrvMs: null,
    hrvStatus: null,
    readinessScore: null,
    readinessLabel: null,
    restingHeartRateBpm: null,
    bodyBattery: null,
    stress: null,
    sleepScore: null,
    ...values,
  };
}
