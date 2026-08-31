import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { restoreConfig, persistConfig } from "./garminConfigStore.js";

function fakeClient(initial = null) {
  let stored = initial;
  return {
    async get() {
      return stored;
    },
    async set(_key, value) {
      stored = value;
    },
    get stored() {
      return stored;
    },
  };
}

async function makeFiles() {
  const dir = await mkdtemp(join(tmpdir(), "garmin-config-"));
  return {
    dir,
    files: {
      tokens: join(dir, "tokens.json"),
      mfaState: join(dir, "mfa-state.json"),
      consumer: join(dir, "consumer.json"),
    },
  };
}

test("persistConfig reads files from disk and writes a combined blob to redis", async () => {
  const { dir, files } = await makeFiles();
  await writeFile(files.tokens, JSON.stringify({ oauth2: { access_token: "abc" } }));

  const client = fakeClient();
  await persistConfig(client, files);

  assert.deepEqual(client.stored.tokens, { oauth2: { access_token: "abc" } });
  assert.equal(client.stored.mfaState, null);
  assert.equal(client.stored.consumer, null);

  await rm(dir, { recursive: true, force: true });
});

test("persistConfig is a no-op when no files exist on disk", async () => {
  const { dir, files } = await makeFiles();
  const client = fakeClient({ tokens: { oauth2: { access_token: "should-not-be-overwritten" } } });

  await persistConfig(client, files);

  assert.deepEqual(client.stored, { tokens: { oauth2: { access_token: "should-not-be-overwritten" } } });

  await rm(dir, { recursive: true, force: true });
});

test("restoreConfig writes blob pieces back to their files", async () => {
  const { dir, files } = await makeFiles();
  const client = fakeClient({
    tokens: { oauth2: { access_token: "xyz" } },
    mfaState: null,
    consumer: { consumer_key: "k" },
  });

  await restoreConfig(client, files);

  const tokens = JSON.parse(await readFile(files.tokens, "utf-8"));
  assert.deepEqual(tokens, { oauth2: { access_token: "xyz" } });

  const consumer = JSON.parse(await readFile(files.consumer, "utf-8"));
  assert.deepEqual(consumer, { consumer_key: "k" });

  await rm(dir, { recursive: true, force: true });
});

test("restoreConfig is a no-op when redis has no config yet", async () => {
  const { dir, files } = await makeFiles();
  const client = fakeClient(null);

  await restoreConfig(client, files);

  await assert.rejects(() => readFile(files.tokens, "utf-8"));

  await rm(dir, { recursive: true, force: true });
});

test("restoreConfig is a no-op when client is null", async () => {
  const { dir, files } = await makeFiles();

  await restoreConfig(null, files);

  await assert.rejects(() => readFile(files.tokens, "utf-8"));

  await rm(dir, { recursive: true, force: true });
});
