import { groupDuplicateActivities } from "../domain/analytics/deduplication.js";
import { buildYearOverYearSummary } from "../domain/analytics/yearOverYear.js";

export function buildLocalAnalytics(details = [], endDate) {
  const activities = details.map((detail) => detail?.activity).filter(Boolean);
  const groups = groupDuplicateActivities(activities);
  const logicalActivities = groups.map((group) => group.primary).filter(Boolean);

  return {
    sourceRecords: activities.length,
    logicalActivities,
    duplicateGroups: groups.filter((group) => group.sources.length > 1).length,
    groups,
    yearOverYear: buildYearOverYearSummary(logicalActivities, endDate),
  };
}
