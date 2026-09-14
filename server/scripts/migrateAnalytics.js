import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getPostgresPool, closePostgresPool, verifyPostgresConnection } from "../postgresRuntime.js";
import { runAnalyticsMigration } from "../postgresMigration.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationPath = path.resolve(__dirname, "../migrations/001_analytics_postgis.sql");

const pool = getPostgresPool();
if (!pool) {
  throw new Error("DATABASE_URL is required to run analytics migrations");
}

try {
  const sql = await readFile(migrationPath, "utf8");
  await runAnalyticsMigration(pool, sql);
  const health = await verifyPostgresConnection(pool);
  console.log(`Analytics migration applied. PostGIS ${health.postgisVersion ?? "available"}.`);
} finally {
  await closePostgresPool();
}
