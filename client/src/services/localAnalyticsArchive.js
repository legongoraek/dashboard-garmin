import { saveCanonicalActivity } from "../persistence/activityRepository.js";

export async function archiveCanonicalActivities(
  activities = [],
  saveFn = saveCanonicalActivity
) {
  let saved = 0;
  let skipped = 0;

  for (const activity of activities) {
    if (!activity?.activityUid) {
      skipped += 1;
      continue;
    }

    await saveFn({
      activity,
      samples: [],
      trackPoints: [],
      raw: null,
    });
    saved += 1;
  }

  return { saved, skipped };
}
