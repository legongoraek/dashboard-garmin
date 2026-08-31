import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeTokens, readTokens } from "./garminConfigStore.js";

async function makePath() {
  const dir = await mkdtemp(join(tmpdir(), "garmin-config-"));
  return { dir, path: join(dir, "tokens.json") };
}

test("writeTokens then readTokens round-trips through disk", async () => {
  const { dir, path } = await makePath();

  await writeTokens({ oauth2: { access_token: "abc" } }, path);
  const result = await readTokens(path);

  assert.deepEqual(result, { oauth2: { access_token: "abc" } });

  await rm(dir, { recursive: true, force: true });
});

test("readTokens returns null for a missing file", async () => {
  const { dir, path } = await makePath();

  const result = await readTokens(path);

  assert.equal(result, null);

  await rm(dir, { recursive: true, force: true });
});

test("writeTokens is a no-op when tokens is null", async () => {
  const { dir, path } = await makePath();

  await writeTokens(null, path);

  await assert.rejects(() => readFile(path, "utf-8"));

  await rm(dir, { recursive: true, force: true });
});
