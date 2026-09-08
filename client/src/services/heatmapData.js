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
  let rateLimited = false;

  for (let i = 0; i < activities.length; i++) {
    const activity = activities[i];
    let stop = false;

    try {
      const detail = await getActivityDetailFn(activity.activityId);
      const activityPoints = detail.data?.points ?? [];

      for (const point of activityPoints) {
        if (typeof point.lat === "number" && typeof point.lon === "number") {
          points.push([point.lat, point.lon]);
        }
      }
    } catch (error) {
      if (error?.message?.includes("bloqueó temporalmente")) {
        rateLimited = true;
        stop = true;
      } else {
        skippedCount += 1;
      }
    }

    onProgress?.(i + 1, activities.length);
    if (stop) break;
  }

  return {
    points,
    activitiesCount: activities.length,
    skippedCount,
    truncated: activities.length >= MAX_ACTIVITIES,
    rateLimited,
  };
}
