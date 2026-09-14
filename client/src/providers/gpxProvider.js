import { CANONICAL_SOURCE, createCanonicalActivity } from "../domain/analytics/canonical.js";

function decodeXml(value = "") {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function tagValue(xml, tag) {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i").exec(xml);
  return match ? decodeXml(match[1].trim()) : null;
}

function haversineMeters(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earth = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return earth * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function stableId(source, fileName, startedAtUtc, count) {
  const seed = `${fileName ?? "import"}:${startedAtUtc ?? "unknown"}:${count}`;
  let hash = 2166136261;
  for (const char of seed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `${source}:${(hash >>> 0).toString(16)}`;
}

export function parseGpxToCanonical(xml, { source = CANONICAL_SOURCE.GPX, fileName = null } = {}) {
  if (![CANONICAL_SOURCE.GPX, CANONICAL_SOURCE.KOMOOT].includes(source)) {
    throw new Error(`Unsupported GPX source: ${source}`);
  }

  const points = [];
  const pointRegex = /<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>/gi;
  let match;
  while ((match = pointRegex.exec(String(xml)))) {
    const attrs = match[1];
    const body = match[2];
    const lat = Number(/\blat=["']([^"']+)["']/i.exec(attrs)?.[1]);
    const lon = Number(/\blon=["']([^"']+)["']/i.exec(attrs)?.[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const elevation = Number(tagValue(body, "ele"));
    points.push({
      latitude: lat,
      longitude: lon,
      altitudeM: Number.isFinite(elevation) ? elevation : null,
      timestampUtc: tagValue(body, "time"),
    });
  }

  if (!points.length) throw new Error("GPX file does not contain valid track points");

  const startedAtUtc = points.find((point) => point.timestampUtc)?.timestampUtc ?? null;
  const activityUid = stableId(source, fileName, startedAtUtc, points.length);
  let cumulativeDistance = 0;
  let elevationGain = 0;

  const trackPoints = points.map((point, sequence) => {
    if (sequence > 0) {
      cumulativeDistance += haversineMeters(points[sequence - 1], point);
      const previousElevation = points[sequence - 1].altitudeM;
      if (previousElevation != null && point.altitudeM != null && point.altitudeM > previousElevation) {
        elevationGain += point.altitudeM - previousElevation;
      }
    }
    return {
      activityUid,
      sequence,
      timestampUtc: point.timestampUtc,
      latitude: point.latitude,
      longitude: point.longitude,
      altitudeM: point.altitudeM,
      distanceM: cumulativeDistance,
    };
  });

  const firstTime = startedAtUtc ? Date.parse(startedAtUtc) : NaN;
  const lastTime = points.at(-1)?.timestampUtc ? Date.parse(points.at(-1).timestampUtc) : NaN;
  const durationS = Number.isFinite(firstTime) && Number.isFinite(lastTime) ? Math.max(0, (lastTime - firstTime) / 1000) : null;
  const name = tagValue(String(xml), "name") ?? fileName?.replace(/\.gpx$/i, "") ?? "Imported GPX";

  const activity = createCanonicalActivity({
    activityUid,
    source,
    sourceActivityId: fileName,
    activityTypeRaw: "gpx",
    activityTypeNorm: "other",
    name,
    startedAtUtc,
    startedAtLocal: null,
    durationS,
    movingTimeS: durationS,
    distanceM: cumulativeDistance,
    elevationGainM: elevationGain,
    sourceQualityFlags: ["IMPORTED_FILE"],
  });

  const samples = trackPoints.map((point, index) => ({
    activityUid,
    tOffsetS: point.timestampUtc && startedAtUtc ? Math.max(0, (Date.parse(point.timestampUtc) - Date.parse(startedAtUtc)) / 1000) : index,
    timestampUtc: point.timestampUtc,
    distanceM: point.distanceM,
    speedMps: null,
    heartRateBpm: null,
    cadenceRpm: null,
    powerW: null,
    altitudeM: point.altitudeM,
    temperatureC: null,
    sourceQualityFlags: ["IMPORTED_FILE"],
  }));

  return { activity, samples, trackPoints, raw: null };
}
