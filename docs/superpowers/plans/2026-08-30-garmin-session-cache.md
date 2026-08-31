# Garmin Session Persistence + Response Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Garmin auth survive a Render cold start, and stop re-hitting Garmin's API for data that hasn't changed, by backing both with one shared Upstash Redis store.

**Architecture:** Two small, independently-testable modules (`garminConfigStore.js` for session tokens, `cache.js` for response caching) sit in front of the existing `execFile`-based `runGarminCommand()` in `server/garminService.js`. Both degrade to today's exact behavior when Redis is unreachable or unconfigured — this plan only adds a fast path, it never removes the slow path.

**Tech Stack:** Node.js 22 (ESM, `"type": "module"`), Express 5, `@upstash/redis` (new dependency), Node's built-in `node:test` + `node:assert/strict` test runner (no new test framework — this repo has none, and Node 22 ships one).

**Spec:** [docs/superpowers/specs/2026-08-30-garmin-session-cache-design.md](../specs/2026-08-30-garmin-session-cache-design.md)

## Global Constraints

- ESM only: every import needs an explicit `.js` extension (matches existing `server/garminService.js` / `server/index.js`).
- No new test framework. Tests use `node:test` + `node:assert/strict`, run via `node --test` from `server/`.
- `garmin.ts` (the sibling script at `../ai-skill-garmin/skills/garmin-connect/scripts/garmin.ts`) is never modified — it is a separate repo, treated as a black box. Its token path is fixed: `~/.config/garmin-api/{tokens,mfa-state,consumer}.json`.
- Any Redis failure (unreachable, unconfigured, corrupt data) must degrade to current behavior, never throw and never fail a request.
- Env vars: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

---

## Task 1: Redis client + test runner setup

**Files:**
- Modify: `server/package.json`
- Create: `server/redisClient.js`
- Test: `server/redisClient.test.js`

**Interfaces:**
- Produces: `export const redis` from `server/redisClient.js` — an `@upstash/redis` `Redis` instance when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are both set, otherwise `null`. Later tasks import this as the default client for their functions.

- [ ] **Step 1: Add the `@upstash/redis` dependency and wire up the test script**

Run from `server/`:

```bash
npm install @upstash/redis
```

Then edit `server/package.json`'s `scripts` block — replace:

```json
    "test": "echo \"Error: no test specified\" && exit 1",
```

with:

```json
    "test": "node --test",
```

- [ ] **Step 2: Write the failing test**

Create `server/redisClient.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";

test("redis is null when Upstash env vars are not set", async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  const { redis } = await import("./redisClient.js");

  assert.equal(redis, null);
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `npm test` (from `server/`)
Expected: FAIL — `Cannot find module './redisClient.js'` (the file doesn't exist yet).

- [ ] **Step 4: Create `server/redisClient.js`**

```js
import { Redis } from "@upstash/redis";

export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

if (!redis) {
  console.warn(
    "[redis] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not set — session persistence and response cache are disabled."
  );
}
```

- [ ] **Step 5: Run the test again to confirm it passes**

Run: `npm test`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add server/package.json server/package-lock.json server/redisClient.js server/redisClient.test.js
git commit -m "feat: add Upstash Redis client, gated on env vars

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: Garmin config (session token) store

**Files:**
- Create: `server/garminConfigStore.js`
- Test: `server/garminConfigStore.test.js`

**Interfaces:**
- Consumes: `redis` from `server/redisClient.js` (Task 1) as the default client.
- Produces:
  - `export const CONFIG_DIR` — `~/.config/garmin-api` (matches `garmin.ts`'s hardcoded path).
  - `export const CONFIG_FILES` — `{ tokens, mfaState, consumer }`, each an absolute path under `CONFIG_DIR`.
  - `export async function restoreConfig(client = redis, files = CONFIG_FILES)` — writes any cached pieces from Redis to disk. No-op if `client` is falsy or Redis has no `garmin:config` key yet.
  - `export async function persistConfig(client = redis, files = CONFIG_FILES)` — reads whichever files exist on disk and saves them as one blob to Redis. No-op if `client` is falsy or none of the files exist.
  - Task 4 calls both of these with no arguments (using the real client and real paths).

- [ ] **Step 1: Write the failing tests**

Create `server/garminConfigStore.test.js`:

```js
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
```

- [ ] **Step 2: Run to confirm the tests fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './garminConfigStore.js'`.

- [ ] **Step 3: Create `server/garminConfigStore.js`**

```js
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
```

- [ ] **Step 4: Run the tests again to confirm they pass**

Run: `npm test`
Expected: PASS (6 tests total: 1 from Task 1 + 5 here).

- [ ] **Step 5: Commit**

```bash
git add server/garminConfigStore.js server/garminConfigStore.test.js
git commit -m "feat: persist Garmin session tokens to Redis across restarts

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: Response cache wrapper

**Files:**
- Create: `server/cache.js`
- Test: `server/cache.test.js`

**Interfaces:**
- Consumes: `redis` from `server/redisClient.js` (Task 1) as the default client.
- Produces: `export async function withCache(key, ttlSeconds, fn, client = redis)` — returns the cached value under Redis key `` `cache:${key}` `` if present; otherwise calls `fn()`, stores its resolved value with expiry `ttlSeconds`, and returns it. Any Redis error (read or write) is caught and logged; on a read error it falls through to calling `fn()` exactly as on a cache miss. Task 4's `getDailySummary` etc. call this directly.

- [ ] **Step 1: Write the failing tests**

Create `server/cache.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { withCache } from "./cache.js";

function fakeClient(initial = {}) {
  const store = { ...initial };
  return {
    store,
    async get(key) {
      return key in store ? store[key] : null;
    },
    async set(key, value) {
      store[key] = value;
    },
  };
}

test("withCache returns the cached value without calling fn on a hit", async () => {
  const client = fakeClient({ "cache:daily:2026-08-25": { sleep: 7 } });
  let called = false;

  const result = await withCache(
    "daily:2026-08-25",
    60,
    async () => {
      called = true;
      return { sleep: 0 };
    },
    client
  );

  assert.deepEqual(result, { sleep: 7 });
  assert.equal(called, false);
});

test("withCache calls fn and stores the result on a miss", async () => {
  const client = fakeClient();

  const result = await withCache("daily:2026-08-26", 60, async () => ({ sleep: 8 }), client);

  assert.deepEqual(result, { sleep: 8 });
  assert.deepEqual(client.store["cache:daily:2026-08-26"], { sleep: 8 });
});

test("withCache falls back to fn when client is null", async () => {
  const result = await withCache("daily:2026-08-27", 60, async () => ({ sleep: 9 }), null);

  assert.deepEqual(result, { sleep: 9 });
});

test("withCache falls back to fn when the read fails", async () => {
  const client = {
    async get() {
      throw new Error("boom");
    },
    async set() {},
  };

  const result = await withCache("daily:2026-08-28", 60, async () => ({ sleep: 10 }), client);

  assert.deepEqual(result, { sleep: 10 });
});

test("withCache still returns fn's result when the write fails", async () => {
  const client = {
    async get() {
      return null;
    },
    async set() {
      throw new Error("boom");
    },
  };

  const result = await withCache("daily:2026-08-29", 60, async () => ({ sleep: 11 }), client);

  assert.deepEqual(result, { sleep: 11 });
});
```

- [ ] **Step 2: Run to confirm the tests fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './cache.js'`.

- [ ] **Step 3: Create `server/cache.js`**

```js
import { redis } from "./redisClient.js";

export async function withCache(key, ttlSeconds, fn, client = redis) {
  if (!client) return fn();

  const cacheKey = `cache:${key}`;

  try {
    const cached = await client.get(cacheKey);
    if (cached !== null) return cached;
  } catch (error) {
    console.warn(`[cache] read failed for ${cacheKey}: ${error.message}`);
  }

  const value = await fn();

  try {
    await client.set(cacheKey, value, { ex: ttlSeconds });
  } catch (error) {
    console.warn(`[cache] write failed for ${cacheKey}: ${error.message}`);
  }

  return value;
}
```

- [ ] **Step 4: Run the tests again to confirm they pass**

Run: `npm test`
Expected: PASS (11 tests total: 6 from Tasks 1–2 + 5 here).

- [ ] **Step 5: Commit**

```bash
git add server/cache.js server/cache.test.js
git commit -m "feat: add generic Redis-backed response cache

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: Wire session persistence + caching into `garminService.js`

**Files:**
- Modify: `server/garminService.js` (full-file replacement — small file, safer than a partial diff)

**Interfaces:**
- Consumes: `restoreConfig`, `persistConfig` from `server/garminConfigStore.js` (Task 2); `withCache` from `server/cache.js` (Task 3).
- Produces: no change to any exported function's name or signature — `loginGarmin`, `loginGarminWithMfa`, `checkSession`, `getDailySummary`, `getSleepSummary`, `getWeeklySummary`, `getActivities`, `getHrvSummary`, `getTrainingReadiness`, `getTrainingStatus` keep the exact same exports `server/index.js` already imports.

This task has no unit tests — it wires already-tested modules into a function (`runGarminCommand`) that shells out to a real external script and, transitively, Garmin's live API. That path is verified manually (Step 4 below), matching the spec's Testing section.

- [ ] **Step 1: Replace the full contents of `server/garminService.js`**

```js
import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { restoreConfig, persistConfig } from "./garminConfigStore.js";
import { withCache } from "./cache.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GARMIN_PROJECT_PATH = path.resolve(
  __dirname,
  "../ai-skill-garmin/skills/garmin-connect"
);

const GARMIN_SCRIPT_PATH = path.resolve(
  GARMIN_PROJECT_PATH,
  "scripts/garmin.ts"
);

const BUN_PATH = process.env.BUN_PATH || process.env.BUN_COMMAND || "bun";

const SHORT_CACHE_TTL_SECONDS = 5 * 60;
const LONG_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function ttlForDate(date) {
  return !date || date === todayStr() ? SHORT_CACHE_TTL_SECONDS : LONG_CACHE_TTL_SECONDS;
}

function runGarminCommand(args = [], env = {}) {
  return restoreConfig().then(
    () =>
      new Promise((resolve, reject) => {
        execFile(
          BUN_PATH,
          ["run", GARMIN_SCRIPT_PATH, ...args],
          {
            cwd: GARMIN_PROJECT_PATH,
            env: {
              ...process.env,
              ...env,
            },
          },
          async (error, stdout, stderr) => {
            const cleanStdout = stdout?.trim();
            const cleanStderr = stderr?.trim();

            const fullOutput = [cleanStdout, cleanStderr]
              .filter(Boolean)
              .join("\n");

            if (fullOutput.includes("MFA required")) {
              return resolve({
                ok: false,
                requiresMfa: true,
                message: "Garmin requiere código MFA",
              });
            }

            if (fullOutput.includes("429") || fullOutput.toLowerCase().includes("rate limited")) {
              return reject(
                new Error(
                  "Garmin bloqueó temporalmente el login por demasiados intentos. Espera unos minutos antes de volver a intentar."
                )
              );
            }

            if (error) {
              return reject(
                new Error(cleanStderr || cleanStdout || error.message)
              );
            }

            await persistConfig();

            try {
              const data = cleanStdout ? JSON.parse(cleanStdout) : null;

              return resolve({
                ok: true,
                data,
              });
            } catch {
              return resolve({
                ok: true,
                data: cleanStdout,
              });
            }
          }
        );
      })
  );
}

export async function loginGarmin(email, password) {
  const result = await runGarminCommand(["login"], {
    GARMIN_EMAIL: email,
    GARMIN_PASSWORD: password,
  });

  if (result.requiresMfa) {
    return result;
  }

  return {
    ok: true,
    authenticated: true,
    message: "Sesión iniciada correctamente",
  };
}

export async function loginGarminWithMfa(email, password, mfaCode) {
  await runGarminCommand(["login"], {
    GARMIN_EMAIL: email,
    GARMIN_PASSWORD: password,
    GARMIN_MFA: mfaCode,
  });

  return {
    ok: true,
    authenticated: true,
    message: "Sesión iniciada correctamente",
  };
}

export async function checkSession() {
  const result = await runGarminCommand(["whoami"]);

  return {
    ok: true,
    authenticated: true,
    user: result.data,
  };
}

export async function getDailySummary(date) {
  return withCache(`daily:${date ?? "latest"}`, ttlForDate(date), () =>
    runGarminCommand(["daily", date, "--pretty"])
  );
}

export async function getSleepSummary(date) {
  return withCache(`sleep:${date ?? "latest"}`, ttlForDate(date), () =>
    runGarminCommand(["sleep", date, "--pretty"])
  );
}

export async function getWeeklySummary(date) {
  return withCache(`weekly:${date ?? "latest"}`, ttlForDate(date), () =>
    runGarminCommand(["weekly", date, "--pretty"])
  );
}

export async function getActivities({ from, to, limit = 10 }) {
  const args = ["activities"];

  if (from) {
    args.push("--from", from);
  }

  if (to) {
    args.push("--to", to);
  }

  if (limit) {
    args.push("--limit", String(limit));
  }

  args.push("--pretty");

  return withCache(`activities:${from ?? ""}:${to ?? ""}:${limit}`, SHORT_CACHE_TTL_SECONDS, () =>
    runGarminCommand(args)
  );
}

export async function getHrvSummary(date) {
  return withCache(`hrv:${date ?? "latest"}`, ttlForDate(date), () =>
    runGarminCommand(["hrv", date, "--pretty"])
  );
}

export async function getTrainingReadiness(date) {
  return withCache(`readiness:${date ?? "latest"}`, ttlForDate(date), () =>
    runGarminCommand(["readiness", date, "--pretty"])
  );
}

export async function getTrainingStatus(date) {
  return withCache(`training-status:${date ?? "latest"}`, ttlForDate(date), () =>
    runGarminCommand(["training-status", date, "--pretty"])
  );
}
```

- [ ] **Step 2: Run the existing test suite to confirm nothing else broke**

Run: `npm test`
Expected: PASS (still 11 tests — this file has no tests of its own, but Tasks 1–3's tests must still pass unchanged).

- [ ] **Step 3: Sanity-check the app still boots**

Run: `npm run dev` (from `server/`)
Expected: `Garmin API running on http://localhost:4000` — no crash on startup (confirms the new imports resolve correctly).

Stop the server (Ctrl+C) once confirmed.

- [ ] **Step 4: Manually verify the real integration (requires a working Garmin login and a real Upstash database — see Task 5 for creating one)**

With `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` exported in your shell and the server running (`npm run dev`):

1. **Session survives a simulated cold start:**
   - Log in once via `POST /api/login` (with real Garmin credentials, completing MFA via `POST /api/login/mfa` if prompted) so `~/.config/garmin-api/tokens.json` exists and Redis has been populated.
   - Delete the local cache directory to simulate Render's filesystem reset. On Windows PowerShell: `Remove-Item -Recurse -Force "$env:USERPROFILE\.config\garmin-api"`. On Linux/macOS: `rm -rf ~/.config/garmin-api`.
   - Call `GET /api/daily`. Expected: a successful response, **without** calling `/api/login` again, and `~/.config/garmin-api/tokens.json` exists again on disk (restored from Redis).

2. **Cache hit skips the bun process:**
   - Call `GET /api/daily?date=2026-08-25` (or any past date) twice in a row.
   - Expected: the second call returns noticeably faster (no `bun run garmin.ts` process spawn). Confirm by temporarily adding a `console.log("[garmin] spawning bun")` right before `execFile(...)` inside `runGarminCommand` — it should log once, not twice, then remove the log line.

3. **Today's data still refreshes:**
   - Call `GET /api/daily` (no `date`, or today's date) twice, more than 5 minutes apart.
   - Expected: both calls hit `bun`/Garmin (the 5-minute TTL expired between them) — confirm with the same temporary log line as above.

4. **Redis down degrades cleanly:**
   - Unset `UPSTASH_REDIS_REST_URL` (and restart the server so `redisClient.js` re-evaluates it as `null`).
   - Call `GET /api/daily`. Expected: works exactly as it does on `main` today — no crash, no hang, just no caching/persistence (you'll see the `[redis] ... disabled` warning logged once at startup).

- [ ] **Step 5: Commit**

```bash
git add server/garminService.js
git commit -m "feat: restore/persist Garmin session and cache read endpoints via Redis

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Rollout (manual — requires Upstash/Render account access)

This task has no code changes. It's the checklist for taking Tasks 1–4 from "works locally" to "works on Render." These steps need a human with access to the Upstash and Render accounts — hand this list to whoever owns those.

- [ ] **Step 1: Create the Upstash Redis database**
  - Go to the Upstash console, create a new Redis database (free tier is enough for a single-user dashboard).
  - Copy the **REST URL** and **REST TOKEN** it gives you (not the raw Redis connection string — this project uses the REST client).

- [ ] **Step 2: Add the env vars to Render**
  - In the Render dashboard, open the `server` service's Environment settings.
  - Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` with the values from Step 1.
  - Save — Render will redeploy the service with the new env vars.

- [ ] **Step 3: Add the same env vars locally**
  - Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to whatever mechanism you currently use to run `server/` locally (this repo has no `.env` loader wired up yet — `dotenv` is a dependency but unused; export the vars in your shell, or wire up `dotenv.config()` in `index.js` if you want file-based local env vars, as a separate small change outside this plan's scope).

- [ ] **Step 4: Confirm the real cold-start case**
  - After the Render deploy from Step 2 finishes and the service has had a chance to spin down from inactivity (or manually restart it from the Render dashboard), hit the deployed dashboard once so it wakes up, then check that a Garmin data request succeeds without forcing a fresh login. This is the same check as Task 4 Step 4.1, but against the real Render environment instead of a simulated local one — the one thing that can't be fully verified locally, since Render's actual filesystem-reset behavior can only be observed there.
