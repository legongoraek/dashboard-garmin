import test from "node:test";
import assert from "node:assert/strict";
import { runAnalyticsMigration } from "./postgresMigration.js";

test("runs the analytics migration SQL inside a transaction", async () => {
  const calls = [];
  const client = {
    async query(text) {
      calls.push(text);
    },
    release() {
      calls.push("RELEASE");
    },
  };
  const pool = { async connect() { return client; } };

  await runAnalyticsMigration(pool, "CREATE TABLE example(id int);");

  assert.deepEqual(calls, [
    "BEGIN",
    "CREATE TABLE example(id int);",
    "COMMIT",
    "RELEASE",
  ]);
});

test("rolls back migration failures", async () => {
  const calls = [];
  const client = {
    async query(text) {
      calls.push(text);
      if (text.includes("BROKEN")) throw new Error("migration failed");
    },
    release() {
      calls.push("RELEASE");
    },
  };
  const pool = { async connect() { return client; } };

  await assert.rejects(
    () => runAnalyticsMigration(pool, "BROKEN SQL"),
    /migration failed/
  );
  assert.deepEqual(calls, ["BEGIN", "BROKEN SQL", "ROLLBACK", "RELEASE"]);
});
