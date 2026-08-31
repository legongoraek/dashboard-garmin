import { readFile, writeFile, mkdir, chmod } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { redis } from "./redisClient.js";

export const CONFIG_DIR = join(homedir(), ".config", "garmin-api");

export const CONFIG_FILES = {
  tokens: join(CONFIG_DIR, "tokens.json"),
  mfaState: join(CONFIG_DIR, "mfa-state.json"),
  consumer: join(CONFIG_DIR, "consumer.json"),
};

const CONFIG_KEY = "garmin:config";

async function readIfExists(path) {
  try {
    return JSON.parse(await readFile(path, "utf-8"));
  } catch {
    return null;
  }
}

export async function restoreConfig(client = redis, files = CONFIG_FILES) {
  if (!client) return;

  let blob;
  try {
    blob = await client.get(CONFIG_KEY);
  } catch (error) {
    console.warn(`[garmin-config] restore read failed: ${error.message}`);
    return;
  }

  if (!blob) return;

  for (const [name, path] of Object.entries(files)) {
    const value = blob[name];
    if (!value) continue;

    try {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, JSON.stringify(value, null, 2), "utf-8");
      await chmod(path, 0o600);
    } catch (error) {
      console.warn(`[garmin-config] restore write failed for ${name}: ${error.message}`);
    }
  }
}

export async function persistConfig(client = redis, files = CONFIG_FILES) {
  if (!client) return;

  const blob = {};
  for (const [name, path] of Object.entries(files)) {
    blob[name] = await readIfExists(path);
  }

  if (Object.values(blob).every((value) => value === null)) return;

  try {
    await client.set(CONFIG_KEY, blob);
  } catch (error) {
    console.warn(`[garmin-config] persist write failed: ${error.message}`);
  }
}
