function numeric(value) {
  const number = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(number)
    ? null
    : number;
}

function activityDate(activity) {
  const value = activity?.startedAtLocal ?? activity?.startedAtUtc;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function bucket(value, size) {
  const number = numeric(value);
  return number === null ? "na" : String(Math.round(number / size));
}

export function activityFingerprint(activity) {
  const date = activityDate(activity);
  if (!date) return `uid:${activity?.activityUid ?? "unknown"}`;

  const fiveMinutesMs = 5 * 60 * 1000;
  const startBucket = Math.round(date.getTime() / fiveMinutesMs);
  const type = activity?.activityTypeNorm ?? "other";
  const durationBucket = bucket(activity?.durationS, 300);
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

function preferredActivity(group) {
  const priority = new Map([
    ["garmin_official", 0],
    ["garmin", 1],
    ["fit", 2],
    ["strava", 3],
    ["komoot", 4],
    ["gpx", 5],
  ]);

  return [...group].sort((a, b) => {
    const aPriority = priority.get(a?.source) ?? 99;
    const bPriority = priority.get(b?.source) ?? 99;
    return aPriority - bPriority;
  })[0];
}

export function deduplicateCanonicalActivities(activities = []) {
  const groups = new Map();

  for (const activity of activities) {
    const fingerprint = activityFingerprint(activity);
    const current = groups.get(fingerprint) ?? [];
    current.push(activity);
    groups.set(fingerprint, current);
  }

  return [...groups.entries()]
    .map(([fingerprint, group]) => {
      const preferred = preferredActivity(group);
      return {
        ...preferred,
        dedupFingerprint: fingerprint,
        sources: group.map(sourceEvidence),
      };
    })
    .sort((a, b) => {
      const aDate = activityDate(a)?.getTime() ?? 0;
      const bDate = activityDate(b)?.getTime() ?? 0;
      return bDate - aDate;
    });
}

function mondayForDate(date) {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = local.getDay();
  const distance = weekday === 0 ? 6 : weekday - 1;
  local.setDate(local.getDate() - distance);
  return local;
}

function isoWeekKey(date) {
  const monday = mondayForDate(date);
  const thursday = new Date(monday);
  thursday.setDate(thursday.getDate() + 3);
  const isoYear = thursday.getFullYear();
  const jan4 = new Date(isoYear, 0, 4);
  const firstMonday = mondayForDate(jan4);
  const week = Math.floor((monday - firstMonday) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return { isoYear, week };
}

function emptyTotals() {
  return {
    activityCount: 0,
    distanceM: null,
    durationS: null,
    elevationGainM: null,
  };
}

function addMetric(target, key, value) {
  const number = numeric(value);
  if (number === null) return;
  target[key] = (target[key] ?? 0) + number;
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
