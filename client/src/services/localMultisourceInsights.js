import { listCanonicalActivities } from "../persistence/activityRepository.js";
import {
  buildYearOverYearSummary,
  buildYearOverYearWeeklyComparison,
  deduplicateCanonicalActivities,
} from "../domain/analytics/multisourceAnalytics.js";

function todayLocal() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export async function loadLocalMultisourceInsights({
  currentYear,
  endDate = todayLocal(),
  listFn = listCanonicalActivities,
} = {}) {
  const details = await listFn();
  const activities = (details ?? [])
    .map((detail) => detail?.activity)
    .filter(Boolean);
  const logical = deduplicateCanonicalActivities(activities);
  const sourceCounts = {};

  for (const activity of activities) {
    const source = activity.source ?? "unknown";
    sourceCounts[source] = (sourceCounts[source] ?? 0) + 1;
  }

  const resolvedYear = currentYear ?? Number(String(endDate).slice(0, 4));

  return {
    persistedCount: activities.length,
    logicalCount: logical.length,
    duplicateSourceRecords: Math.max(0, activities.length - logical.length),
    sourceCounts,
    logicalActivities: logical,
    yoy: buildYearOverYearWeeklyComparison(activities, resolvedYear),
    yoySummary: buildYearOverYearSummary(activities, endDate),
  };
}
