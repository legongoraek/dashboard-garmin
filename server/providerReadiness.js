import { getStravaReadiness } from "./stravaService.js";

function officialGarminReadiness(env = process.env) {
  const approved = env.GARMIN_DEVELOPER_APPROVED === "true";
  const configured = Boolean(
    approved && env.GARMIN_DEVELOPER_CLIENT_ID && env.GARMIN_DEVELOPER_CLIENT_SECRET
  );

  return {
    approved,
    configured,
    blocker: configured
      ? null
      : "Garmin Developer Program approval and issued credentials are required",
  };
}

export function buildProviderReadiness(
  env = process.env,
  { stravaAuthorized = false, databaseConnectionVerified = false } = {}
) {
  const strava = getStravaReadiness(env);
  const databaseUrlPresent = Boolean(env.DATABASE_URL);
  const postgresPostgisConfigured = databaseUrlPresent;

  return {
    ok: true,
    providers: {
      garmin: { configured: true, mode: "legacy_personal" },
      strava: { ...strava, authorized: stravaAuthorized },
      garmin_official: officialGarminReadiness(env),
      fit: {
        configured: true,
        mode: "file_import",
        blocker: null,
        sdk: "@garmin/fitsdk",
      },
      gpx: { configured: true, mode: "file_import" },
      komoot: { configured: true, mode: "gpx_import" },
    },
    persistence: {
      browserIndexedDb: true,
      databaseUrlPresent,
      runtimeInstalled: true,
      postgresPostgisConfigured,
      connectionVerified: Boolean(databaseConnectionVerified),
      migration: "server/migrations/001_analytics_postgis.sql",
      blocker: postgresPostgisConfigured
        ? null
        : "DATABASE_URL is required to activate PostgreSQL/PostGIS persistence",
    },
  };
}

export { officialGarminReadiness };
