function numeric(value) {
  const number = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(number)
    ? null
    : number;
}

function activityDate(activity) {
  const value = activity?.startedAtLocal ?? activity?.startedAtUtc;
  if (!value) return null;
  const normalized = typeof value === "string" && value.includes(" ") && !value.includes("T")
    ? value.replace(" ", "T")
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function bucket(value, size) {
  const number = numeric(value);
  return number === null ? "na" : String(Math.round(number / size));
}

export function activityFingerprint(activity) {
  const date = activityDate(activity);
  if (!date) return `uid:${activity?.activityUid ?? "unknown"}`;
  const startBucket = Math.round(date.getTime() / (5 * 60 * 1000));
  const type = activity?.activityTypeNorm ?? "other";
  const durationBucket = bucket(activity?.durationS, 120);
  const distanceBucket = bucket(activity?.distanceM, 250);
  return `${type}:${startBucket}:${durationBucket}:${distanceBucket}`;
}

function sourceEvidence(activity) {
  return {
    source: activity?.source ?? null,
    sourceActivityId: activity?.sourceActivityId ?? null,
    activityUid: activity?.activityUid ?? null,
  };
}

function richnessScore(activity) {
  const fields = ["distanceM", "durationS", "movingTimeS", "elevationGainM", "avgHeartRateBpm", "maxHeartRateBpm", "avgCadenceRpm", "avgPowerW", "avgSpeedMps", "caloriesKcal", "timezone", "deviceModel"];
  return fields.reduce((score, key) => score + (activity?.[key] !== null && activity?.[key] !== undefined ? 1 : 0), 0);
}

function preferredActivity(group) {
  const sourcePriority = new Map([["garmin_official", 0], ["fit", 1], ["garmin", 2], ["strava", 3], ["komoot", 4], ["gpx", 5]]);
  return [...group].sort((a, b) => {
    const richness = richnessScore(b) - richnessScore(a);
    if (richness !== 0) return richness;
    const priority = (sourcePriority.get(a?.source) ?? 99) - (sourcePriority.get(b?.source) ?? 99);
    if (priority !== 0) return priority;
    return String(a?.activityUid ?? "").localeCompare(String(b?.activityUid ?? ""));
  })[0];
}

function mergedLogicalActivity(group) {
  const primary = preferredActivity(group);
  const merged = { ...primary };
  const identityKeys = new Set(["activityUid", "source", "sourceActivityId"]);

  for (const activity of group) {
    if (activity === primary) continue;
    for (const [key, value] of Object.entries(activity ?? {})) {
      if (identityKeys.has(key)) continue;
      if ((merged[key] === null || merged[key] === undefined) && value !== null && value !== undefined) {
        merged[key] = value;
      }
    }
  }

  const qualityFlags = group
    .flatMap((activity) => Array.isArray(activity?.sourceQualityFlags) ? activity.sourceQualityFlags : [])
    .filter((flag, index, values) => values.indexOf(flag) === index);
  if (qualityFlags.length) merged.sourceQualityFlags = qualityFlags;

  return merged;
}

export function deduplicateCanonicalActivities(activities = []) {
  const groups = new Map();
  for (const activity of activities) {
    const fingerprint = activityFingerprint(activity);
    const current = groups.get(fingerprint) ?? [];
    current.push(activity);
    groups.set(fingerprint, current);
  }
  return [...groups.entries()].map(([fingerprint, group]) => ({
    ...mergedLogicalActivity(group),
    dedupFingerprint: fingerprint,
    sources: group.map(sourceEvidence),
  })).sort((a, b) => (activityDate(b)?.getTime() ?? 0) - (activityDate(a)?.getTime() ?? 0));
}

function mondayForDate(date) {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = local.getDay();
  local.setDate(local.getDate() - (weekday === 0 ? 6 : weekday - 1));
  return local;
}

function isoWeekKey(date) {
  const monday = mondayForDate(date);
  const thursday = new Date(monday);
  thursday.setDate(thursday.getDate() + 3);
  const isoYear = thursday.getFullYear();
  const jan4 = new Date(isoYear, 0, 4);
  const firstMonday = mondayForDate(jan4);
  return { isoYear, week: Math.floor((monday - firstMonday) / (7 * 24 * 60 * 60 * 1000)) + 1 };
}

function emptyTotals() {
  return { activityCount: 0, distanceM: null, durationS: null, elevationGainM: null };
}

function addMetric(target, key, value) {
  const number = numeric(value);
  if (number !== null) target[key] = (target[key] ?? 0) + number;
}

function aggregateByIsoWeek(activities, year) {
  const weeks = new Map();
  for (const activity of activities) {
    const date = activityDate(activity);
    if (!date) continue;
    const { isoYear, week } = isoWeekKey(date);
    if (isoYear !== year) continue;
    const totals = weeks.get(week) ?? emptyTotals();
    totals.activityCount += 1;
    addMetric(totals, "distanceM", activity.distanceM);
    addMetric(totals, "durationS", activity.durationS);
    addMetric(totals, "elevationGainM", activity.elevationGainM);
    weeks.set(week, totals);
  }
  return weeks;
}

function delta(current, previous, key) {
  const a = numeric(current?.[key]);
  const b = numeric(previous?.[key]);
  return a === null || b === null ? null : a - b;
}

export function buildYearOverYearWeeklyComparison(activities = [], currentYear = new Date().getFullYear()) {
  const deduped = deduplicateCanonicalActivities(activities);
  const current = aggregateByIsoWeek(deduped, currentYear);
  const previous = aggregateByIsoWeek(deduped, currentYear - 1);
  const weeks = [...new Set([...current.keys(), ...previous.keys()])].sort((a, b) => a - b);
  return weeks.map((week) => {
    const currentTotals = current.get(week) ?? emptyTotals();
    const previousTotals = previous.get(week) ?? emptyTotals();
    return {
      week,
      current: currentTotals,
      previous: previousTotals,
      distanceDeltaM: delta(currentTotals, previousTotals, "distanceM"),
      durationDeltaS: delta(currentTotals, previousTotals, "durationS"),
      elevationDeltaM: delta(currentTotals, previousTotals, "elevationGainM"),
      activityCountDelta: currentTotals.activityCount - previousTotals.activityCount,
    };
  });
}

function summarizeWindow(activities, from, to) {
  const selected = activities.filter((activity) => {
    const date = activityDate(activity);
    if (!date) return false;
    const key = formatDate(date);
    return key >= from && key <= to;
  });
  const totals = { from, to, activityCount: selected.length, distanceM: null, durationS: null, elevationGainM: null };
  for (const key of ["distanceM", "durationS", "elevationGainM"]) {
    const values = selected.map((activity) => numeric(activity?.[key])).filter((value) => value !== null);
    totals[key] = values.length ? values.reduce((sum, value) => sum + value, 0) : null;
  }
  return totals;
}

function pct(current, previous) {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function buildYearOverYearSummary(activities = [], endDate) {
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(end.getTime())) throw new Error(`Invalid end date: ${endDate}`);
  const deduped = deduplicateCanonicalActivities(activities);
  const currentFrom = `${end.getFullYear()}-01-01`;
  const currentTo = formatDate(end);
  const previousEnd = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate());
  const previousFrom = `${previousEnd.getFullYear()}-01-01`;
  const previousTo = formatDate(previousEnd);
  const current = summarizeWindow(deduped, currentFrom, currentTo);
  const previous = summarizeWindow(deduped, previousFrom, previousTo);
  return {
    current,
    previous,
    change: {
      activityCountPct: pct(current.activityCount, previous.activityCount),
      distancePct: pct(current.distanceM, previous.distanceM),
      durationPct: pct(current.durationS, previous.durationS),
      elevationGainPct: pct(current.elevationGainM, previous.elevationGainM),
    },
  };
}
