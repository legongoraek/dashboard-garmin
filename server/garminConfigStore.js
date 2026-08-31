import { readFile, writeFile, mkdir, chmod } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const CONFIG_DIR = join(homedir(), ".config", "garmin-api");
export const TOKENS_PATH = join(CONFIG_DIR, "tokens.json");

export async function writeTokens(tokens, path = TOKENS_PATH) {
  if (!tokens) return;

  try {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(tokens, null, 2), "utf-8");
    await chmod(path, 0o600);
  } catch (error) {
    console.warn(`[garmin-config] write failed: ${error.message}`);
  }
}

export async function readTokens(path = TOKENS_PATH) {
  try {
    return JSON.parse(await readFile(path, "utf-8"));
  } catch {
    return null;
  }
}
