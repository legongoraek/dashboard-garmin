import {
  getActivities,
  getWeekly,
  getHrv,
  getReadiness,
} from "./garminApi.js";
import {
  normalizeGarminActivity,
  normalizeGarminRecovery,
  normalizeGarminWeeklyDay,
} from "../domain/analytics/garminNormalizer.js";
import {
  aggregateActivitiesByWeek,
  buildRecoverySeries,
  getPeriodStartDate,
} from "../domain/analytics/trends.js";
import { archiveCanonicalActivities } from "./localAnalyticsArchive.js";

const defaultApi = { getActivities, getWeekly, getHrv, getReadiness };

function parseDate(dateString) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateString ?? ""));
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function enumerateDates(from, to) {
  const start = parseDate(from);
  const end = parseDate(to);
  if (!start || !end || start > end) return [];

  const dates = [];
  for (
    let current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    current <= end;
    current.setDate(current.getDate() + 1)
  ) {
    dates.push(formatDate(current));
  }
  return dates;
}

function unwrapData(response) {
  return response?.data ?? response;
}

function errorMessage(error) {
  return error?.message || String(error);
}

function isTerminalSourceError(error) {
  const message = errorMessage(error).toLowerCase();
  return (
    message.includes("429") ||
    message.includes("rate limit") ||
    message.includes("rate-limit") ||
    message.includes("sesión") ||
    message.includes("session") ||
    message.includes("unauthorized") ||
    message.includes("authentication") ||
    message.includes("iniciar sesión") ||
    message.includes("login")
  );
}

function ensureEntry(map, dateLocal) {
  if (!map.has(dateLocal)) {
    map.set(dateLocal, {
      dateLocal,
      daily: null,
      sleep: null,
      hrv: null,
      readiness: null,
    });
  }
  return map.get(dateLocal);
}

function addPartialError(partialErrors, source, date, error) {
  partialErrors.push({
    source,
    date,
    message: errorMessage(error),
  });
}

export async function loadAnalyticsTrends({
  endDate,
  period = "4w",
  api = defaultApi,
  archiveFn = typeof indexedDB === "undefined" ? null : archiveCanonicalActivities,
} = {}) {
  const from = getPeriodStartDate(endDate, period);
  const to = endDate;
  const partialErrors = [];
  const recoveryByDate = new Map();

  let activities = [];
  try {
    const response = await api.getActivities({ from, to, limit: 200 });
    const rawActivities = unwrapData(response);
    activities = Array.isArray(rawActivities)
      ? rawActivities.map(normalizeGarminActivity)
      : [];

    if (archiveFn && activities.length) {
      try {
        await archiveFn(activities);
      } catch (archiveError) {
        addPartialError(partialErrors, "local-archive", null, archiveError);
      }
    }
  } catch (error) {
    if (isTerminalSourceError(error)) throw error;
    addPartialError(partialErrors, "activities", null, error);
  }

  const dates = enumerateDates(from, to);

  for (let index = 0; index < dates.length; index += 7) {
    const anchorDate = dates[Math.min(index + 6, dates.length - 1)];
    try {
      const response = await api.getWeekly(anchorDate);
      const weekly = unwrapData(response);
      const days = Array.isArray(weekly?.days) ? weekly.days : [];

      for (const rawDay of days) {
        const normalized = normalizeGarminWeeklyDay(rawDay);
        if (!normalized.dateLocal || normalized.dateLocal < from || normalized.dateLocal > to) {
          continue;
        }
        const entry = ensureEntry(recoveryByDate, normalized.dateLocal);
        entry.daily = rawDay?.daily ?? null;
        entry.sleep = rawDay?.sleep ?? null;
      }
    } catch (error) {
      if (isTerminalSourceError(error)) throw error;
      addPartialError(partialErrors, "weekly", anchorDate, error);
    }
  }

  for (const date of dates) {
    const entry = ensureEntry(recoveryByDate, date);

    try {
      entry.hrv = unwrapData(await api.getHrv(date)) ?? null;
    } catch (error) {
      if (isTerminalSourceError(error)) throw error;
      addPartialError(partialErrors, "hrv", date, error);
    }

    try {
      entry.readiness = unwrapData(await api.getReadiness(date)) ?? null;
    } catch (error) {
      if (isTerminalSourceError(error)) throw error;
      addPartialError(partialErrors, "readiness", date, error);
    }
  }

  const canonicalRecovery = [...recoveryByDate.values()].map((entry) =>
    normalizeGarminRecovery(entry)
  );

  return {
    period,
    from,
    to,
    weeklyActivity: aggregateActivitiesByWeek(activities),
    recovery: buildRecoverySeries(canonicalRecovery),
    partialErrors,
  };
}

export { enumerateDates, isTerminalSourceError };
