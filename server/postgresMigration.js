export async function runAnalyticsMigration(pool, sql) {
  if (!pool) throw new Error("PostgreSQL pool is required");
  if (!sql?.trim()) throw new Error("Migration SQL is required");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
