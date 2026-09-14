import { Pool } from "pg";

export function buildPoolConfig(env = process.env) {
  if (!env.DATABASE_URL) return null;

  const disableSsl = env.PGSSL === "disable" || env.PGSSLMODE === "disable";
  const useSsl = !disableSsl && env.NODE_ENV === "production";

  return {
    connectionString: env.DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    max: Number(env.PGPOOL_MAX || 5),
    idleTimeoutMillis: Number(env.PG_IDLE_TIMEOUT_MS || 30_000),
    connectionTimeoutMillis: Number(env.PG_CONNECT_TIMEOUT_MS || 10_000),
  };
}

let sharedPool = null;

export function getPostgresPool(env = process.env) {
  const config = buildPoolConfig(env);
  if (!config) return null;
  if (!sharedPool) sharedPool = new Pool(config);
  return sharedPool;
}

export async function verifyPostgresConnection(pool = getPostgresPool()) {
  if (!pool) {
    return { ok: false, configured: false, postgisVersion: null };
  }

  const result = await pool.query(
    "SELECT postgis_lib_version() AS postgis_version"
  );

  return {
    ok: true,
    configured: true,
    postgisVersion: result.rows?.[0]?.postgis_version ?? null,
  };
}

export async function closePostgresPool() {
  if (!sharedPool) return;
  const pool = sharedPool;
  sharedPool = null;
  await pool.end();
}
