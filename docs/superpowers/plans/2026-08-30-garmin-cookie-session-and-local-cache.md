# Garmin Cookie Session + Local Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the just-shipped Upstash Redis session/cache layer with an `HttpOnly` cookie (Garmin session tokens) and browser `localStorage` (response cache) — zero server-side or third-party storage.

**Architecture:** The server stops holding any cross-request state of its own. Each request carries the Garmin session as an `HttpOnly` cookie the browser manages automatically; the server writes it to the sibling script's expected disk path before shelling out, reads it back after, and re-sets the cookie — never putting the token in a JSON response body. The response cache moves entirely client-side: a small `localStorage`-backed wrapper around the existing API-call functions, with no server involvement at all.

**Tech Stack:** Node.js 22 (ESM), Express 5, `cookie-parser` (new dependency — needed only to read the incoming `Cookie` header into `req.cookies`; `res.cookie()` for setting cookies is built into Express itself). React 19 + Vite 8 (client). `node:test` on both sides (server already uses it; client gains one new test file using the same runner, no new framework).

**Spec:** [docs/superpowers/specs/2026-08-30-garmin-cookie-session-and-local-cache-design.md](../specs/2026-08-30-garmin-cookie-session-and-local-cache-design.md)

## Global Constraints

- ESM only: every relative import needs an explicit `.js` extension.
- No new test framework anywhere in this repo. Server tests: `node:test` + `node:assert/strict` via `npm test` (`node --test`) in `server/`. Client tests: the same runner, via a new `"test": "node --test src/services"` script in `client/package.json`.
- The Garmin session token must **never** appear in a JSON response body — only in the `Set-Cookie` header. Every route handler that receives a `{ ..., tokens }` result from `garminService.js` must destructure `tokens` out before calling `res.json(...)`.
- `garmin.ts` (the sibling script) is never modified. Its fixed token path, `~/.config/garmin-api/tokens.json`, is the only file this plan still touches on disk — `mfa-state.json` and `consumer.json` are left alone (per the spec's Non-goals, they are not carried to the browser).
- `mfa-state.json` and `consumer.json` are explicitly **out of scope** — do not add any code to persist, read, or transport them.
- Cookie attributes: `httpOnly: true` always; `secure`/`sameSite` are environment-conditional (`secure: isProd`, `sameSite: isProd ? "none" : "lax"`) because production is cross-site (Vercel + Render) and local dev is made same-site by the new Vite proxy.
- Env var `NODE_ENV` (already standard for Express/Node, not a new var to add anywhere) determines `isProd` in `server/index.js`.

---

## Task 1: Rewrite `garminConfigStore.js`, remove the Redis client

**Files:**
- Modify: `server/garminConfigStore.js` (full-file replacement)
- Modify: `server/garminConfigStore.test.js` (full-file replacement)
- Delete: `server/redisClient.js`
- Delete: `server/redisClient.test.js`

**Interfaces:**
- Produces: `export const CONFIG_DIR`, `export const TOKENS_PATH` (`~/.config/garmin-api/tokens.json`), `export async function writeTokens(tokens, path = TOKENS_PATH)`, `export async function readTokens(path = TOKENS_PATH)`. Task 2 imports both functions and calls them with no arguments (using the real path) in production code.

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `server/garminConfigStore.test.js`:

```js
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
```

- [ ] **Step 2: Run to confirm the tests fail**

Run: `npm test` (from `server/`)
Expected: FAIL — `writeTokens`/`readTokens` don't exist yet on the current `garminConfigStore.js` (it still exports `restoreConfig`/`persistConfig`).

- [ ] **Step 3: Replace the full contents of `server/garminConfigStore.js`**

```js
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
```

- [ ] **Step 4: Run the tests again to confirm they pass**

Run: `npm test`
Expected: PASS (3 tests). `garminConfigStore.js` no longer imports `./redisClient.js` at this point, so it's now safe to delete.

- [ ] **Step 5: Delete the now-unused Redis client and remove its dependency**

```bash
rm server/redisClient.js server/redisClient.test.js
npm uninstall @upstash/redis
```

Confirm `server/package.json`'s `dependencies` no longer lists `@upstash/redis`.

- [ ] **Step 6: Run the tests one more time**

Run: `npm test`
Expected: PASS (still 3 tests — the total count will drop from the previous branch's count since `redisClient.test.js` is gone — that's expected).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: replace Redis-backed config store with plain tokens.json I/O

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: Rewrite `garminService.js`, remove the response cache

**Files:**
- Modify: `server/garminService.js` (full-file replacement)
- Delete: `server/cache.js`
- Delete: `server/cache.test.js`

**Interfaces:**
- Consumes: `writeTokens`, `readTokens` from `server/garminConfigStore.js` (Task 1).
- Produces: every exported function's result may now include a `tokens` field (the current on-disk token contents after the command ran) alongside its existing fields (`ok`, `data`, `authenticated`, etc.). `loginGarmin`'s `requiresMfa` branch is the one case with no `tokens` field. New parameter shape: `getDailySummary(date, incomingTokens)`, `getSleepSummary(date, incomingTokens)`, `getWeeklySummary(date, incomingTokens)`, `getActivities({from, to, limit}, incomingTokens)`, `getHrvSummary(date, incomingTokens)`, `getTrainingReadiness(date, incomingTokens)`, `getTrainingStatus(date, incomingTokens)`, `checkSession(incomingTokens)` — Task 3 calls each of these with the cookie's parsed contents (or `null`) as the last argument.

This task has no dedicated test file — `runGarminCommand` shells out to a real external script; this is verified manually in Task 6, matching the previous branch's precedent for this same file.

- [ ] **Step 1: Delete the two cache files**

```bash
rm server/cache.js server/cache.test.js
```

- [ ] **Step 2: Replace the full contents of `server/garminService.js`**

```js
import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { writeTokens, readTokens } from "./garminConfigStore.js";

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

async function runGarminCommand(args = [], env = {}, incomingTokens = null) {
  if (incomingTokens) {
    await writeTokens(incomingTokens);
  }

  return new Promise((resolve, reject) => {
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

        const tokens = await readTokens();

        try {
          const data = cleanStdout ? JSON.parse(cleanStdout) : null;

          return resolve({
            ok: true,
            data,
            tokens,
          });
        } catch {
          return resolve({
            ok: true,
            data: cleanStdout,
            tokens,
          });
        }
      }
    );
  });
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
    tokens: result.tokens,
  };
}

export async function loginGarminWithMfa(email, password, mfaCode) {
  const result = await runGarminCommand(["login"], {
    GARMIN_EMAIL: email,
    GARMIN_PASSWORD: password,
    GARMIN_MFA: mfaCode,
  });

  return {
    ok: true,
    authenticated: true,
    message: "Sesión iniciada correctamente",
    tokens: result.tokens,
  };
}

export async function checkSession(incomingTokens) {
  const result = await runGarminCommand(["whoami"], {}, incomingTokens);

  return {
    ok: true,
    authenticated: true,
    user: result.data,
    tokens: result.tokens,
  };
}

export async function getDailySummary(date, incomingTokens) {
  return runGarminCommand(["daily", date, "--pretty"], {}, incomingTokens);
}

export async function getSleepSummary(date, incomingTokens) {
  return runGarminCommand(["sleep", date, "--pretty"], {}, incomingTokens);
}

export async function getWeeklySummary(date, incomingTokens) {
  return runGarminCommand(["weekly", date, "--pretty"], {}, incomingTokens);
}

export async function getActivities({ from, to, limit = 10 }, incomingTokens) {
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

  return runGarminCommand(args, {}, incomingTokens);
}

export async function getHrvSummary(date, incomingTokens) {
  return runGarminCommand(["hrv", date, "--pretty"], {}, incomingTokens);
}

export async function getTrainingReadiness(date, incomingTokens) {
  return runGarminCommand(["readiness", date, "--pretty"], {}, incomingTokens);
}

export async function getTrainingStatus(date, incomingTokens) {
  return runGarminCommand(["training-status", date, "--pretty"], {}, incomingTokens);
}
```

- [ ] **Step 3: Run the existing test suite to confirm nothing else broke**

Run: `npm test` (from `server/`)
Expected: PASS (still just the 3 tests from Task 1 — this file has none of its own).

- [ ] **Step 4: Sanity-check the app still boots**

Run: `npm run dev` (from `server/`)
Expected: `Garmin API running on http://localhost:4000` — no crash on startup.

Stop the server (Ctrl+C) once confirmed. (It will still fail actual Garmin requests at this point — `server/index.js` hasn't been updated to pass `incomingTokens` or handle the new `tokens` field yet. That's Task 3.)

- [ ] **Step 5: Commit**

```bash
git add -A server/garminService.js
git rm server/cache.js server/cache.test.js
git commit -m "refactor: carry Garmin session tokens through function results instead of a server-side cache

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: Wire cookie handling into `server/index.js`

**Files:**
- Modify: `server/index.js`
- Modify: `server/package.json` (add `cookie-parser`)

**Interfaces:**
- Consumes: every function from `server/garminService.js` (Task 2) — same names as today, called with an extra `incomingTokens` argument (from `getIncomingTokens(req)`) where the brief's Step 2 code shows one.
- Produces: no new exports (this is the app's entry point). Two internal helpers, `setTokensCookie(res, tokens)` and `getIncomingTokens(req)`, used only within this file.

No dedicated test file — this is Express route wiring around already-tested/verified pieces (Tasks 1–2) plus a real external script; verified manually in Task 6, same as `garminService.js`.

- [ ] **Step 1: Add the `cookie-parser` dependency**

Run from `server/`:

```bash
npm install cookie-parser
```

- [ ] **Step 2: Replace the full contents of `server/index.js`**

```js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import {
  loginGarmin,
  loginGarminWithMfa,
  getDailySummary,
  getSleepSummary,
  getWeeklySummary,
  getActivities,
  getHrvSummary,
  getTrainingReadiness,
  getTrainingStatus,
  checkSession,
} from "./garminService.js";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://dashboard-garmin-azure.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origen no permitido por CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

const isProd = process.env.NODE_ENV === "production";
const TOKENS_COOKIE = "garmin_tokens";
const TOKENS_COOKIE_MAX_AGE_MS = 400 * 24 * 60 * 60 * 1000;

function setTokensCookie(res, tokens) {
  if (!tokens) return;

  res.cookie(TOKENS_COOKIE, JSON.stringify(tokens), {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: TOKENS_COOKIE_MAX_AGE_MS,
    path: "/",
  });
}

function getIncomingTokens(req) {
  const raw = req.cookies?.[TOKENS_COOKIE];
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

let loginBlockedUntil = null;

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/login", async (req, res) => {
  try {
    if (loginBlockedUntil && Date.now() < loginBlockedUntil) {
      return res.status(429).json({
        ok: false,
        error: "Login temporalmente bloqueado por límite de Garmin. Intenta más tarde.",
      });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        error: "Falta email o password",
      });
    }

    const { tokens, ...body } = await loginGarmin(email, password);
    setTokensCookie(res, tokens);
    return res.json(body);
  } catch (error) {
    if (error.message.includes("Garmin bloqueó temporalmente")) {
      loginBlockedUntil = Date.now() + 15 * 60 * 1000;
    }
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.post("/api/login/mfa", async (req, res) => {
  try {
    const { email, password, mfaCode } = req.body;

    if (!email || !password || !mfaCode) {
      return res.status(400).json({
        ok: false,
        error: "Falta email, password o código MFA",
      });
    }

    const { tokens, ...body } = await loginGarminWithMfa(email, password, mfaCode);
    setTokensCookie(res, tokens);
    return res.json(body);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.get("/api/session", async (req, res) => {
  try {
    const { tokens, ...body } = await checkSession(getIncomingTokens(req));
    setTokensCookie(res, tokens);
    return res.json(body);
  } catch {
    return res.status(401).json({
      ok: false,
      authenticated: false,
    });
  }
});

app.get("/api/daily", async (req, res) => {
  try {
    const { date } = req.query;
    const { tokens, ...body } = await getDailySummary(date, getIncomingTokens(req));
    setTokensCookie(res, tokens);
    return res.json(body);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.get("/api/sleep", async (req, res) => {
  try {
    const { date } = req.query;
    const { tokens, ...body } = await getSleepSummary(date, getIncomingTokens(req));
    setTokensCookie(res, tokens);
    return res.json(body);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.get("/api/weekly", async (req, res) => {
  try {
    const { date } = req.query;
    const { tokens, ...body } = await getWeeklySummary(date, getIncomingTokens(req));
    setTokensCookie(res, tokens);
    return res.json(body);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.get("/api/activities", async (req, res) => {
  try {
    const { from, to, limit } = req.query;

    const { tokens, ...body } = await getActivities(
      { from, to, limit },
      getIncomingTokens(req)
    );
    setTokensCookie(res, tokens);
    return res.json(body);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.get("/api/hrv", async (req, res) => {
  try {
    const { date } = req.query;
    const { tokens, ...body } = await getHrvSummary(date, getIncomingTokens(req));
    setTokensCookie(res, tokens);
    return res.json(body);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.get("/api/readiness", async (req, res) => {
  try {
    const { date } = req.query;
    const { tokens, ...body } = await getTrainingReadiness(date, getIncomingTokens(req));
    setTokensCookie(res, tokens);
    return res.json(body);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.get("/api/training-status", async (req, res) => {
  try {
    const { date } = req.query;
    const { tokens, ...body } = await getTrainingStatus(date, getIncomingTokens(req));
    setTokensCookie(res, tokens);
    return res.json(body);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.get("/api/health-garmin", async (req, res) => {
  try {
    const response = await fetch("https://connect.garmin.com");
    res.json({
      ok: true,
      status: response.status,
      statusText: response.statusText,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: String(error),
    });
  }
});

app.get("/api/debug-network", async (req, res) => {
  const tests = [
    "https://connect.garmin.com",
    "https://sso.garmin.com",
  ];

  const results = [];

  for (const url of tests) {
    try {
      const response = await fetch(url);
      results.push({
        url,
        ok: true,
        status: response.status,
      });
    } catch (error) {
      results.push({
        url,
        ok: false,
        error: String(error),
      });
    }
  }

  res.json({
    ok: true,
    results,
  });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Garmin API running on http://localhost:${PORT}`);
});
```

- [ ] **Step 3: Run the existing test suite**

Run: `npm test` (from `server/`)
Expected: PASS (still the 3 tests from Task 1 — `index.js` has no tests of its own).

- [ ] **Step 4: Boot the server and confirm the cookie plumbing has no wiring errors**

Run: `npm run dev` (from `server/`)
Expected: `Garmin API running on http://localhost:4000` — no crash. `curl -i http://localhost:4000/api/health` should return `{"ok":true}` with no errors in the server log.

A real Garmin login round-trip (confirming the cookie is actually set as `HttpOnly` and actually round-trips) needs a live Garmin account and a browser — that's Task 6, not this step. This step only confirms the server starts and the plumbing compiles/runs.

Stop the server (Ctrl+C) once confirmed.

- [ ] **Step 5: Commit**

```bash
git add -A server/index.js server/package.json server/package-lock.json
git commit -m "feat: carry Garmin session as an HttpOnly cookie instead of server-side storage

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: Client response cache (`localStorage`)

**Files:**
- Create: `client/src/services/cache.js`
- Test: `client/src/services/cache.test.js`
- Modify: `client/package.json` (add a `test` script)

**Interfaces:**
- Produces: `export function ttlForDate(date)`, `export const SHORT_TTL_MS`, `export async function cachedRequest(key, ttlMs, fetchFn)`. Task 5 imports all three into `client/src/services/garminApi.js`.

- [ ] **Step 1: Add the client test script**

Edit `client/package.json`'s `scripts` block — add a `test` entry (order doesn't matter, but keep the block valid JSON):

```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "node --test src/services"
  },
```

- [ ] **Step 2: Write the failing tests**

Create `client/src/services/cache.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";

function installFakeLocalStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
  return store;
}

test("cachedRequest calls fetchFn and stores the result on a miss", async () => {
  installFakeLocalStorage();
  const { cachedRequest } = await import("./cache.js");

  let calls = 0;
  const result = await cachedRequest("daily:2026-08-25", 60_000, async () => {
    calls += 1;
    return { sleep: 7 };
  });

  assert.deepEqual(result, { sleep: 7 });
  assert.equal(calls, 1);
});

test("cachedRequest returns the cached value without calling fetchFn on a hit", async () => {
  installFakeLocalStorage();
  const { cachedRequest } = await import("./cache.js");

  let calls = 0;
  const fetchFn = async () => {
    calls += 1;
    return { sleep: 7 };
  };

  await cachedRequest("daily:2026-08-25", 60_000, fetchFn);
  const second = await cachedRequest("daily:2026-08-25", 60_000, fetchFn);

  assert.deepEqual(second, { sleep: 7 });
  assert.equal(calls, 1);
});

test("cachedRequest treats an expired entry as a miss", async () => {
  installFakeLocalStorage();
  const { cachedRequest } = await import("./cache.js");

  let calls = 0;
  const fetchFn = async () => {
    calls += 1;
    return { sleep: calls };
  };

  await cachedRequest("daily:2026-08-25", -1, fetchFn);
  const second = await cachedRequest("daily:2026-08-25", -1, fetchFn);

  assert.equal(calls, 2);
  assert.deepEqual(second, { sleep: 2 });
});

test("ttlForDate: past date gets the long TTL, today and future get the short one", async () => {
  const { ttlForDate, SHORT_TTL_MS } = await import("./cache.js");

  const LONG_TTL_MS = 30 * 24 * 60 * 60 * 1000;

  assert.equal(ttlForDate("2020-01-01"), LONG_TTL_MS);
  assert.equal(ttlForDate(undefined), SHORT_TTL_MS);

  const today = new Date().toISOString().slice(0, 10);
  assert.equal(ttlForDate(today), SHORT_TTL_MS);

  const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  assert.equal(ttlForDate(future), SHORT_TTL_MS);
});
```

- [ ] **Step 3: Run to confirm the tests fail**

Run: `npm test` (from `client/`)
Expected: FAIL — `Cannot find module './cache.js'`.

- [ ] **Step 4: Create `client/src/services/cache.js`**

```js
const SHORT_TTL_MS = 5 * 60 * 1000;
const LONG_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function ttlForDate(date) {
  if (!date) return SHORT_TTL_MS;
  return date < todayStr() ? LONG_TTL_MS : SHORT_TTL_MS;
}

export { SHORT_TTL_MS };

export async function cachedRequest(key, ttlMs, fetchFn) {
  const cacheKey = `garmin_cache:${key}`;

  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const { expiresAt, value } = JSON.parse(raw);
      if (Date.now() < expiresAt) return value;
    }
  } catch {
    // corrupt/unreadable entry — fall through to a real fetch
  }

  const value = await fetchFn();

  try {
    localStorage.setItem(cacheKey, JSON.stringify({ expiresAt: Date.now() + ttlMs, value }));
  } catch {
    // localStorage full or unavailable (private browsing) — non-fatal, just skip caching
  }

  return value;
}
```

- [ ] **Step 5: Run the tests again to confirm they pass**

Run: `npm test` (from `client/`)
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add client/package.json client/src/services/cache.js client/src/services/cache.test.js
git commit -m "feat: add localStorage-backed response cache for the client

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Wire the client cache into `garminApi.js`, cross-site cookie support

**Files:**
- Modify: `client/src/services/garminApi.js`
- Modify: `client/vite.config.js`

**Interfaces:**
- Consumes: `cachedRequest`, `ttlForDate`, `SHORT_TTL_MS` from `client/src/services/cache.js` (Task 4).
- Produces: no change to any exported function's name — `loginGarmin`, `loginGarminMfa`, `checkGarminSession`, `getDaily`, `getSleep`, `getWeekly`, `getActivities`, `getHrv`, `getReadiness`, `getTrainingStatus`, `wakeUpBackend` keep the exact signatures every calling component (`DashboardPage.jsx`, `LoginPage.jsx`) already uses.

No dedicated test file — this wires an already-tested utility (Task 4) into existing API-call wrappers with no new logic of its own; verified by the dev-server boot check below and manually in Task 6.

- [ ] **Step 1: Add the Vite dev proxy**

Replace the full contents of `client/vite.config.js`:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },
})
```

- [ ] **Step 2: Replace the full contents of `client/src/services/garminApi.js`**

```js
import axios from "axios";
import { cachedRequest, ttlForDate, SHORT_TTL_MS } from "./cache.js";

const api = axios.create({
  baseURL: import.meta.env.VITE_GARMIN_API_URL || "/api",
  withCredentials: true,
});

const WAKE_UP_TTL_MS = 5 * 60 * 1000;
let wakeUpPromise = null;
let backendAwakeUntil = 0;

export function wakeUpBackend() {
  if (Date.now() < backendAwakeUntil) {
    return Promise.resolve();
  }

  if (!wakeUpPromise) {
    wakeUpPromise = api
      .get("/health", { timeout: 60_000 })
      .then(() => {
        backendAwakeUntil = Date.now() + WAKE_UP_TTL_MS;
      })
      .finally(() => {
        wakeUpPromise = null;
      });
  }

  return wakeUpPromise;
}

function getBackendError(error, fallbackMessage) {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    fallbackMessage
  );
}

async function requestApi(requestFn, fallbackMessage) {
  try {
    await wakeUpBackend();
    const response = await requestFn();
    const data = response.data;

    if (data?.ok === false || data?.error) {
      throw new Error(data?.error || fallbackMessage);
    }

    return data;
  } catch (error) {
    throw new Error(getBackendError(error, fallbackMessage), { cause: error });
  }
}

export function loginGarmin(email, password) {
  return requestApi(
    () => api.post("/login", { email, password }),
    "Error al iniciar sesión en Garmin"
  );
}

export function loginGarminMfa(email, password, mfaCode) {
  return requestApi(
    () => api.post("/login/mfa", { email, password, mfaCode }),
    "Error al iniciar sesión en Garmin con MFA"
  );
}

export function checkGarminSession() {
  return requestApi(
    () => api.get("/session"),
    "Error al verificar la sesión de Garmin"
  );
}

export function getDaily(date) {
  return cachedRequest(`daily:${date ?? "latest"}`, ttlForDate(date), () =>
    requestApi(
      () => api.get("/daily", { params: { date } }),
      "Error al obtener los datos diarios"
    )
  );
}

export function getSleep(date) {
  return cachedRequest(`sleep:${date ?? "latest"}`, ttlForDate(date), () =>
    requestApi(
      () => api.get("/sleep", { params: { date } }),
      "Error al obtener los datos de sueño"
    )
  );
}

export function getWeekly(date) {
  return cachedRequest(`weekly:${date ?? "latest"}`, ttlForDate(date), () =>
    requestApi(
      () => api.get("/weekly", { params: { date } }),
      "Error al obtener los datos semanales"
    )
  );
}

export function getActivities({ from, to, limit = 10 }) {
  return cachedRequest(
    `activities:${from ?? ""}:${to ?? ""}:${limit}`,
    SHORT_TTL_MS,
    () =>
      requestApi(
        () => api.get("/activities", { params: { from, to, limit } }),
        "Error al obtener las actividades"
      )
  );
}

export function getHrv(date) {
  return cachedRequest(`hrv:${date ?? "latest"}`, ttlForDate(date), () =>
    requestApi(
      () => api.get("/hrv", { params: { date } }),
      "Error al obtener los datos de HRV"
    )
  );
}

export function getReadiness(date) {
  return cachedRequest(`readiness:${date ?? "latest"}`, ttlForDate(date), () =>
    requestApi(
      () => api.get("/readiness", { params: { date } }),
      "Error al obtener los datos de readiness"
    )
  );
}

export async function getTrainingStatus(date) {
  return cachedRequest(`training-status:${date ?? "latest"}`, ttlForDate(date), () =>
    requestApi(
      () => api.get("/training-status", { params: { date } }),
      "Error al obtener los datos de estado de entrenamiento"
    )
  );
}
```

- [ ] **Step 3: Run the client test suite**

Run: `npm test` (from `client/`)
Expected: PASS (still the 4 tests from Task 4 — this file has none of its own).

- [ ] **Step 4: Boot both dev servers and smoke-check the proxy**

In `server/`: `npm run dev` (leave running).
In `client/`: `npm run dev` (leave running), then open the printed URL (usually `http://localhost:5173`) in a browser.

Expected: the page loads with no console errors about CORS or failed `/api/health` calls (the wake-up ping). Open DevTools → Network, confirm `/api/health` shows as a request to `localhost:5173/api/health` (proxied), not a direct cross-origin call to `localhost:4000`.

Stop both servers once confirmed.

- [ ] **Step 5: Commit**

```bash
git add client/vite.config.js client/src/services/garminApi.js
git commit -m "feat: cache dashboard reads in localStorage, proxy /api in dev for same-site cookies

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: Manual verification (requires a real Garmin account — hand off to the user)

This task has no code changes. The pieces this plan can't verify without a live Garmin login and a real browser: whether the cookie actually round-trips correctly, is genuinely `HttpOnly`, and fits within cookie size limits. Per this project's own rules, entering real Garmin credentials anywhere is something the user does themselves, not something to automate.

- [ ] **Step 1: Cookie is HttpOnly**
  - Run both dev servers (`server/`: `npm run dev`, `client/`: `npm run dev`), open the dashboard, log in with a real Garmin account (completing MFA if prompted).
  - In DevTools → Application → Cookies, find `garmin_tokens` on `localhost:5173` (proxied) — confirm its `HttpOnly` column shows checked.
  - In the DevTools console, run `document.cookie` — confirm the output does **not** include `garmin_tokens`.

- [ ] **Step 2: Session survives a simulated cold start**
  - While still logged in (cookie set), delete the local token file: Windows PowerShell `Remove-Item "$env:USERPROFILE\.config\garmin-api\tokens.json"`; Linux/macOS `rm ~/.config/garmin-api/tokens.json`.
  - Reload the dashboard (don't clear cookies). Expected: data loads normally, no login prompt — the cookie repopulated the file server-side on the next request.

- [ ] **Step 3: Cookie size**
  - In DevTools → Network, inspect any `/api/daily`-style response's `Set-Cookie` response header length after a real login.
  - Expected: comfortably under ~4KB. If it's close to or over that limit, that's a real finding — report it; the documented fallback (see the spec's Open Questions) is splitting into two cookies (`garmin_oauth1`, `garmin_oauth2`), not implemented here since it isn't expected to be needed.

- [ ] **Step 4: Cache skips the network**
  - Pick a past date in the dashboard's date picker, let it load, then switch away and back to that same date.
  - In DevTools → Network, confirm the second load does not re-issue `/api/daily` (or the other endpoints) for that date.

- [ ] **Step 5: Cross-site cookie in production**
  - After deploying both `client/` (Vercel) and `server/` (Render) with this branch, repeat Step 1 and Step 2 against the real deployed URLs (different domains — this is the one behavior the local dev proxy specifically cannot exercise, since it makes dev same-site on purpose).
  - Expected: same results as Steps 1–2, confirming `secure: true; sameSite: "none"` actually works browser-to-browser across `vercel.app` and `onrender.com`.
