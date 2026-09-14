import { normalizeStravaActivity, normalizeStravaStreams } from "../providers/stravaProvider.js";
import { saveCanonicalActivity } from "../persistence/activityRepository.js";
import { getStravaActivities, getStravaActivityStreams } from "./providerApi.js";

export async function syncStravaRecentActivities({ limit = 20, api } = {}) {
  const deps = api ?? {
    getActivities: (params) => getStravaActivities(params),
    getStreams: (id) => getStravaActivityStreams(id),
    save: (detail) => saveCanonicalActivity(detail),
  };

  const response = await deps.getActivities({ perPage: limit, page: 1 });
  const rawActivities = Array.isArray(response?.data) ? response.data.slice(0, limit) : [];
  let synced = 0;
  let failed = 0;
  const errors = [];

  for (const raw of rawActivities) {
    const activity = normalizeStravaActivity(raw);
    let samples = [];
    let trackPoints = [];

    try {
      const streamResponse = await deps.getStreams(raw.id);
      const normalized = normalizeStravaStreams(activity.activityUid, streamResponse?.data ?? {});
      samples = normalized.samples;
      trackPoints = normalized.trackPoints;
    } catch (error) {
      failed += 1;
      errors.push({ activityUid: activity.activityUid, message: error?.message || String(error) });
    }

    await deps.save({ activity, samples, trackPoints, raw: null });
    synced += 1;
  }

  return { synced, failed, errors };
}
