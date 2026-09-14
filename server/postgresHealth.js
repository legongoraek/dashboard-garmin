import { getPostgresPool, verifyPostgresConnection } from "./postgresRuntime.js";

export async function getPostgresHealth({
  pool = getPostgresPool(),
  verifyFn = verifyPostgresConnection,
} = {}) {
  if (!pool) {
    return {
      ok: false,
      configured: false,
      postgisVersion: null,
      error: "DATABASE_URL is not configured",
    };
  }

  try {
    return await verifyFn(pool);
  } catch {
    return {
      ok: false,
      configured: true,
      postgisVersion: null,
      error: "PostgreSQL/PostGIS connection unavailable",
    };
  }
}
