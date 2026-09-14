import { listCanonicalActivities } from "../persistence/activityRepository.js";
import {
  buildYearOverYearWeeklyComparison,
  deduplicateCanonicalActivities,
} from "../domain/analytics/multisourceAnalytics.js";

export async function loadLocalMultisourceInsights({
  currentYear = new Date().getFullYear(),
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

  return {
    persistedCount: activities.length,
    logicalCount: logical.length,
    duplicateSourceRecords: Math.max(0, activities.length - logical.length),
    sourceCounts,
    logicalActivities: logical,
    yoy: buildYearOverYearWeeklyComparison(activities, currentYear),
  };
}
