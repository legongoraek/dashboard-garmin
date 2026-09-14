const START_BUCKET_MS = 5 * 60 * 1000;
const DURATION_BUCKET_S = 120;
const DISTANCE_BUCKET_M = 250;

function numeric(value) {
  const parsed = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(parsed)
    ? null
    : parsed;
}

function parseActivityTime(activity) {
  const value = activity?.startedAtUtc ?? activity?.startedAtLocal;
  if (!value) return null;
  const normalized = typeof value === "string" && value.includes(" ") && !value.includes("T")
    ? value.replace(" ", "T")
    : value;
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function roundedBucket(value, size) {
  const number = numeric(value);
  return number === null ? "na" : String(Math.round(number / size));
}

export function buildActivityFingerprint(activity) {
  const startedAt = parseActivityTime(activity);
  const startBucket = startedAt === null ? "na" : String(Math.round(startedAt / START_BUCKET_MS));
  return [
    activity?.activityTypeNorm ?? "other",
    startBucket,
    roundedBucket(activity?.durationS, DURATION_BUCKET_S),
    roundedBucket(activity?.distanceM, DISTANCE_BUCKET_M),
  ].join(":");
}

function richnessScore(activity) {
  const fields = [
    "distanceM",
    "durationS",
    "movingTimeS",
    "elevationGainM",
    "avgHeartRateBpm",
    "maxHeartRateBpm",
    "avgCadenceRpm",
    "avgPowerW",
    "avgSpeedMps",
    "caloriesKcal",
    "timezone",
    "deviceModel",
  ];
  return fields.reduce((score, key) => score + (activity?.[key] !== null && activity?.[key] !== undefined ? 1 : 0), 0);
}

export function selectPrimaryActivity(activities = []) {
  return [...activities].sort((a, b) => {
    const scoreDiff = richnessScore(b) - richnessScore(a);
    if (scoreDiff !== 0) return scoreDiff;
    return String(a?.activityUid ?? "").localeCompare(String(b?.activityUid ?? ""));
  })[0] ?? null;
}

export function groupDuplicateActivities(activities = []) {
  const grouped = new Map();
  for (const activity of activities) {
    const fingerprint = buildActivityFingerprint(activity);
    if (!grouped.has(fingerprint)) grouped.set(fingerprint, []);
    grouped.get(fingerprint).push(activity);
  }

  return [...grouped.entries()].map(([fingerprint, sources]) => ({
    fingerprint,
    primary: selectPrimaryActivity(sources),
    sources: [...sources],
  }));
}

export function deduplicateActivities(activities = []) {
  return groupDuplicateActivities(activities).map((group) => group.primary).filter(Boolean);
}
