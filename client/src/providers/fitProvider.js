import { CANONICAL_SOURCE, createCanonicalActivity } from "../domain/analytics/canonical.js";

function num(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function iso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function positionDegrees(value) {
  const parsed = num(value);
  if (parsed === null) return null;
  return Math.abs(parsed) <= 180 ? parsed : parsed * (180 / 2147483648);
}

function sportNorm(value) {
  const sport = String(value ?? "").toLowerCase();
  if (sport.includes("run")) return "run";
  if (sport.includes("cycl") || sport.includes("bike")) return "ride";
  if (sport.includes("walk")) return "walk";
  if (sport.includes("hik")) return "hike";
  if (sport.includes("swim")) return "swim";
  if (sport.includes("strength")) return "strength";
  return "other";
}

function stableFitId(fileName, startTime) {
  const seed = `${fileName ?? "activity.fit"}:${startTime ?? "unknown"}`;
  let hash = 2166136261;
  for (const char of seed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `fit:${(hash >>> 0).toString(16)}`;
}

export function fitMessagesToCanonical(messages = {}, { fileName = "activity.fit" } = {}) {
  const sessions = messages.sessionMesgs ?? messages.sessions ?? [];
  const records = messages.recordMesgs ?? messages.records ?? [];
  const session = sessions[0] ?? {};
  const startedAtUtc = iso(session.startTime ?? records[0]?.timestamp);
  const activityUid = stableFitId(fileName, startedAtUtc);
  const typeRaw = session.sport ?? session.subSport ?? null;

  const activity = createCanonicalActivity({
    activityUid,
    source: CANONICAL_SOURCE.FIT,
    sourceActivityId: fileName,
    activityTypeRaw: typeRaw,
    activityTypeNorm: sportNorm(typeRaw),
    name: fileName.replace(/\.fit$/i, ""),
    startedAtUtc,
    durationS: num(session.totalElapsedTime),
    movingTimeS: num(session.totalTimerTime),
    distanceM: num(session.totalDistance),
    elevationGainM: num(session.totalAscent),
    avgHeartRateBpm: num(session.avgHeartRate),
    maxHeartRateBpm: num(session.maxHeartRate),
    avgCadenceRpm: num(session.avgCadence),
    avgPowerW: num(session.avgPower),
    avgSpeedMps: num(session.avgSpeed),
    caloriesKcal: num(session.totalCalories),
    sourceQualityFlags: ["IMPORTED_FILE", "FIT_SDK"],
  });

  const startMs = startedAtUtc ? Date.parse(startedAtUtc) : null;
  const samples = records.map((record, index) => {
    const timestampUtc = iso(record.timestamp);
    const timestampMs = timestampUtc ? Date.parse(timestampUtc) : null;
    return {
      activityUid,
      tOffsetS: startMs != null && timestampMs != null ? Math.max(0, (timestampMs - startMs) / 1000) : index,
      timestampUtc,
      distanceM: num(record.distance),
      speedMps: num(record.enhancedSpeed ?? record.speed),
      heartRateBpm: num(record.heartRate),
      cadenceRpm: num(record.cadence),
      powerW: num(record.power),
      altitudeM: num(record.enhancedAltitude ?? record.altitude),
      temperatureC: num(record.temperature),
      sourceQualityFlags: ["FIT_SDK"],
    };
  });

  const trackPoints = records
    .map((record, sequence) => {
      const latitude = positionDegrees(record.positionLat);
      const longitude = positionDegrees(record.positionLong);
      if (latitude === null || longitude === null) return null;
      return {
        activityUid,
        sequence,
        timestampUtc: iso(record.timestamp),
        latitude,
        longitude,
        altitudeM: num(record.enhancedAltitude ?? record.altitude),
        distanceM: num(record.distance),
      };
    })
    .filter(Boolean);

  return { activity, samples, trackPoints, raw: null };
}

export async function parseFitToCanonical(arrayBuffer, options = {}) {
  const moduleName = "@garmin/fitsdk";
  let sdk;
  try {
    sdk = await import(/* @vite-ignore */ moduleName);
  } catch {
    throw new Error("FIT import requires @garmin/fitsdk to be installed and bundled in the client build");
  }

  const { Decoder, Stream } = sdk;
  const stream = Stream.fromArrayBuffer(arrayBuffer);
  const decoder = new Decoder(stream);
  if (!decoder.isFIT()) throw new Error("El archivo no es un FIT válido");
  if (!decoder.checkIntegrity()) throw new Error("El archivo FIT no supera la verificación de integridad");
  const { messages, errors } = decoder.read();
  if (errors?.length) throw new Error(`FIT decode error: ${errors.join(", ")}`);
  return fitMessagesToCanonical(messages, options);
}
