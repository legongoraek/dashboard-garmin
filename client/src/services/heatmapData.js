import { getActivities, getActivityDetail } from "./garminApi.js";

export const MAX_ACTIVITIES = 200;

export async function loadHeatmapPoints(
  { from, to },
  onProgress,
  getActivitiesFn = getActivities,
  getActivityDetailFn = getActivityDetail
) {
  const activitiesResponse = await getActivitiesFn({ from, to, limit: MAX_ACTIVITIES });
  const activities = (activitiesResponse.data ?? []).filter((a) => a.activityId);

  const points = [];
  let skippedCount = 0;

  for (let i = 0; i < activities.length; i++) {
    const activity = activities[i];

    try {
      const detail = await getActivityDetailFn(activity.activityId);
      const activityPoints = detail.data?.points ?? [];

      for (const point of activityPoints) {
        if (typeof point.lat === "number" && typeof point.lon === "number") {
          points.push([point.lat, point.lon]);
        }
      }
    } catch {
      skippedCount += 1;
    }

    onProgress?.(i + 1, activities.length);
  }

  return {
    points,
    activitiesCount: activities.length,
    skippedCount,
    truncated: activities.length >= MAX_ACTIVITIES,
  };
}
