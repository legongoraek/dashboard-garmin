export const PERIODS = Object.freeze({
  "7d": { label: "7 días", days: 7 },
  "4w": { label: "4 semanas", days: 28 },
  "12w": { label: "12 semanas", days: 84 },
  "6m": { label: "6 meses", months: 6 },
  "1y": { label: "1 año", years: 1 },
});

function parseLocalDate(dateString) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateString ?? ""));
  if (!match) return null;

  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function numeric(value) {
  const number = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(number)
    ? null
    : number;
}

function mondayForDate(date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = result.getDay();
  const distance = weekday === 0 ? 6 : weekday - 1;
  result.setDate(result.getDate() - distance);
  return result;
}

export function getPeriodStartDate(endDate, key) {
  const period = PERIODS[key];
  if (!period) {
    throw new Error(`Unsupported analytics period: ${key}`);
  }

  const end = parseLocalDate(endDate);
  if (!end) {
    throw new Error(`Invalid end date: ${endDate}`);
  }

  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  if (period.days) {
    start.setDate(start.getDate() - (period.days - 1));
  } else if (period.months) {
    start.setMonth(start.getMonth() - period.months);
  } else if (period.years) {
    start.setFullYear(start.getFullYear() - period.years);
  }

  return formatLocalDate(start);
}

export function aggregateActivitiesByWeek(activities = []) {
  const buckets = new Map();

  for (const activity of activities) {
    const localDate = parseLocalDate(activity?.startedAtLocal ?? activity?.startedAtUtc);
    if (!localDate) continue;

    const weekStart = formatLocalDate(mondayForDate(localDate));
    let bucket = buckets.get(weekStart);

    if (!bucket) {
      bucket = {
        weekStart,
        activityCount: 0,
        distanceM: null,
        durationS: null,
        elevationGainM: null,
      };
      buckets.set(weekStart, bucket);
    }

    bucket.activityCount += 1;

    for (const key of ["distanceM", "durationS", "elevationGainM"]) {
      const value = numeric(activity?.[key]);
      if (value === null) continue;
      bucket[key] = (bucket[key] ?? 0) + value;
    }
  }

  return [...buckets.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

export function buildRecoverySeries(recovery = []) {
  return recovery
    .filter((row) => row?.dateLocal)
    .map((row) => ({
      dateLocal: row.dateLocal,
      hrvMs: numeric(row.hrvMs),
      restingHeartRateBpm: numeric(row.restingHeartRateBpm),
      sleepScore: numeric(row.sleepScore),
      stress: numeric(row.stress),
      bodyBattery: numeric(row.bodyBattery),
      readinessScore: numeric(row.readinessScore),
    }))
    .sort((a, b) => a.dateLocal.localeCompare(b.dateLocal));
}

export function addRollingAverage(rows = [], valueKey, outputKey, windowSize) {
  if (!Number.isInteger(windowSize) || windowSize <= 0) {
    throw new Error("windowSize must be a positive integer");
  }

  return rows.map((row, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const values = rows
      .slice(start, index + 1)
      .map((item) => numeric(item?.[valueKey]))
      .filter((value) => value !== null);

    return {
      ...row,
      [outputKey]: values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : null,
    };
  });
}

export { parseLocalDate, formatLocalDate };
