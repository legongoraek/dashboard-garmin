function parseDate(value) {
  if (!value) return null;
  const normalized = String(value).includes(" ") && !String(value).includes("T")
    ? String(value).replace(" ", "T")
    : String(value);
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function numeric(value) {
  const parsed = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(parsed) ? null : parsed;
}

function summarize(activities, from, to) {
  const selected = activities.filter((activity) => {
    const date = parseDate(activity?.startedAtLocal ?? activity?.startedAtUtc);
    if (!date) return false;
    const key = formatDate(date);
    return key >= from && key <= to;
  });

  const result = {
    from,
    to,
    activityCount: selected.length,
    distanceM: null,
    durationS: null,
    elevationGainM: null,
  };

  for (const key of ["distanceM", "durationS", "elevationGainM"]) {
    const values = selected.map((activity) => numeric(activity?.[key])).filter((value) => value !== null);
    result[key] = values.length ? values.reduce((sum, value) => sum + value, 0) : null;
  }

  return result;
}

function pct(current, previous) {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function buildYearOverYearSummary(activities = [], endDate) {
  const end = parseDate(`${endDate}T00:00:00`);
  if (!end) throw new Error(`Invalid end date: ${endDate}`);

  const currentFrom = `${end.getFullYear()}-01-01`;
  const currentTo = formatDate(end);
  const previousEnd = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate());
  const previousFrom = `${previousEnd.getFullYear()}-01-01`;
  const previousTo = formatDate(previousEnd);

  const current = summarize(activities, currentFrom, currentTo);
  const previous = summarize(activities, previousFrom, previousTo);

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
