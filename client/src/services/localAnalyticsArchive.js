import {
  getCanonicalActivity,
  saveCanonicalActivity,
} from "../persistence/activityRepository.js";

export async function archiveCanonicalActivities(
  activities = [],
  saveFn = saveCanonicalActivity,
  getFn = getCanonicalActivity
) {
  let saved = 0;
  let skipped = 0;

  for (const activity of activities) {
    if (!activity?.activityUid) {
      skipped += 1;
      continue;
    }

    const existing = await getFn(activity.activityUid);
    await saveFn({
      activity: {
        ...(existing?.activity ?? {}),
        ...activity,
      },
      samples: existing?.samples ?? [],
      trackPoints: existing?.trackPoints ?? [],
      raw: existing?.raw ?? null,
    });
    saved += 1;
  }

  return { saved, skipped };
}
