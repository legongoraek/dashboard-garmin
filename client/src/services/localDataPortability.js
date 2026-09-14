const ARCHIVE_SCHEMA_VERSION = 1;

export function buildCanonicalArchiveExport(
  details = [],
  exportedAt = new Date().toISOString()
) {
  return {
    schemaVersion: ARCHIVE_SCHEMA_VERSION,
    exportedAt,
    activities: structuredClone(details),
  };
}

export function parseCanonicalArchiveExport(jsonText) {
  let payload;
  try {
    payload = JSON.parse(jsonText);
  } catch {
    throw new Error("Invalid canonical archive JSON");
  }

  if (!payload || !Array.isArray(payload.activities)) {
    throw new Error("Invalid canonical archive payload");
  }

  if (payload.schemaVersion !== ARCHIVE_SCHEMA_VERSION) {
    throw new Error(`Unsupported canonical archive schema version: ${payload.schemaVersion}`);
  }

  for (const detail of payload.activities) {
    if (!detail?.activity?.activityUid) {
      throw new Error("Canonical archive activity requires activityUid");
    }
  }

  return structuredClone(payload.activities);
}

export { ARCHIVE_SCHEMA_VERSION };
