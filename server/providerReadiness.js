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
  { stravaAuthorized = false } = {}
) {
  const strava = getStravaReadiness(env);
  const databaseUrlPresent = Boolean(env.DATABASE_URL);

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
      postgresPostgisConfigured: false,
      blocker: databaseUrlPresent
        ? "PostgreSQL schema is ready, but a runtime pg adapter is not installed yet"
        : "DATABASE_URL and a runtime pg adapter are required for server persistence",
    },
  };
}

export { officialGarminReadiness };
