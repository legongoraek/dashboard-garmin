import { CANONICAL_SOURCE } from "../domain/analytics/canonical.js";
import { fitMessagesToCanonical } from "./fitProvider.js";

export function normalizeGarminOfficialFitMessages(messages, {
  sourceActivityId,
  fileName = "garmin-activity.fit",
} = {}) {
  const detail = fitMessagesToCanonical(messages, { fileName });
  const officialId = sourceActivityId ?? detail.activity.sourceActivityId ?? "unknown";
  const activityUid = `${CANONICAL_SOURCE.GARMIN_OFFICIAL}:${officialId}`;

  return {
    ...detail,
    activity: {
      ...detail.activity,
      activityUid,
      source: CANONICAL_SOURCE.GARMIN_OFFICIAL,
      sourceActivityId: String(officialId),
      sourceQualityFlags: [...(detail.activity.sourceQualityFlags ?? []), "GARMIN_OFFICIAL"],
    },
    samples: detail.samples.map((sample) => ({ ...sample, activityUid })),
    trackPoints: detail.trackPoints.map((point) => ({ ...point, activityUid })),
  };
}

export function getGarminOfficialCapability(readiness = {}) {
  return {
    id: CANONICAL_SOURCE.GARMIN_OFFICIAL,
    configured: Boolean(readiness.configured),
    approved: Boolean(readiness.approved),
    supports: {
      activities: true,
      health: true,
      fitActivityFiles: true,
    },
  };
}
