# Garmin session via HttpOnly cookie + response cache via localStorage

Date: 2026-08-30
Status: Approved for planning
Supersedes: [2026-08-30-garmin-session-cache-design.md](2026-08-30-garmin-session-cache-design.md) — the Upstash Redis approach implemented by that spec's plan is being removed and replaced by this one. No live Upstash database was ever provisioned (that spec's Task 5 rollout was never run), so there is no external state to migrate.

## Problem

The previous spec solved two real problems (Garmin session lost on Render's cold start; redundant Garmin API calls) by adding Upstash Redis as shared server-side infrastructure. That work shipped (`server/redisClient.js`, `server/garminConfigStore.js`, `server/cache.js`, wired into `server/garminService.js`) and is live on `main`.

The requirement has changed: no third-party server-side store at all. Both the Garmin session and the response cache should live in the browser instead — "que se mantenga en cache o storage del navegador."

## Goals

1. The Garmin OAuth session (`tokens.json`, currently written by the sibling `garmin.ts` script to `~/.config/garmin-api/tokens.json`) survives a Render cold start by round-tripping through the browser instead of Redis.
2. The response cache (daily/sleep/weekly/activities/hrv/readiness/training-status) lives entirely client-side, no server involvement.
3. Zero external accounts or paid services. Zero server-side persistence of Garmin credentials.
4. The session token is not readable by page JavaScript (closes the XSS exposure that a `localStorage`-based token would have had).
5. Everything from the previous spec's implementation (`@upstash/redis`, `redisClient.js`, `cache.js`, the Redis-backed half of `garminConfigStore.js`) is removed, not just deprecated.

## Non-goals

- `mfa-state.json` and `consumer.json` (the sibling script's other two on-disk files) are **not** carried to the browser. `mfa-state.json` is only needed between the two steps of an MFA login (server writes it in step 1, reads it in step 2); in the near-universal case both steps land on the same warm Render process within the MFA code's 10-minute window. If Render happens to cold-start in that narrow window, the MFA completion fails cleanly and the user retries login from scratch — an accepted, rare edge case, not worth transporting. `consumer.json` caches Garmin's own OAuth consumer key/secret (not user-specific, 24h TTL in `garmin.ts`); losing it on a cold start just costs one extra internal lookup during login, not a login failure.
- No change to what data the dashboard shows or how the UI looks.
- No new test framework in `client/` — `node:test` (already used in `server/`) covers the one new piece of non-trivial client logic (cache TTL rules) via a tiny built-in-`localStorage`-mock, no Vitest/Jest added.

## Architecture

```
Browser                                          Render (server/)
┌─────────────────────────────┐                  ┌──────────────────────────────┐
│ axios instance                │  HttpOnly       │ cookie-parser middleware      │
│ withCredentials: true         │  cookie          │                                │
│                                │  "garmin_tokens" │                                │
│ localStorage                  │◀────────────────▶│ garminService.js               │
│  garmin_cache:daily:2026-08-25│  (browser sends  │  runGarminCommand(args, env,   │
│  garmin_cache:sleep:latest    │   it, JS never   │    incomingTokens)              │
│  ...                          │   reads it)      │   1. write incomingTokens to   │
│                                │                  │      ~/.config/garmin-api/     │
│ cachedRequest(key, ttl, fn)   │  JSON body        │      tokens.json (if present)  │
│  - localStorage hit? return   │  (NO tokens       │   2. execFile bun garmin.ts    │
│  - miss: call fn(), store     │   field — that's  │   3. read tokens.json back     │
└─────────────────────────────┘  cookie-only)      │   4. return { ok, data, tokens }│
                                                     │                                │
                                                     │ index.js route handler:        │
                                                     │  strip `tokens` from the       │
                                                     │  JSON body, res.cookie(...)    │
                                                     │  with the fresh value          │
                                                     └──────────────────────────────┘
```

**Why a cookie, not `localStorage`, for the token specifically:** an `HttpOnly` cookie is invisible to page JavaScript — a cross-site-scripting bug in the dashboard cannot read it. `localStorage` has no such boundary; anything running on the page can read it. The response cache holds no secrets (it's the same dashboard data already visible on screen), so `localStorage` is the right, simpler tool there.

**Why the JSON response body never carries `tokens`:** if `res.json({...result, tokens})` ever shipped the token in the body, `response.data.tokens` would be readable by any script on the page — the exact thing `HttpOnly` is meant to prevent. Every route handler must destructure `tokens` out before calling `res.json(...)` and pass it only to `res.cookie(...)`. This is the single most important invariant in this design; get it wrong and the cookie's `HttpOnly` flag stops meaning anything.

## Server changes

### `server/garminConfigStore.js` (rewritten, no Redis)

Shrinks to plain disk I/O for one file:

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

Both take an optional `path` for the same temp-directory test pattern the previous spec used. Neither throws — matches the "never fail a request over local disk trouble" posture of the code being replaced.

### `server/garminService.js`

`runGarminCommand(args, env, incomingTokens)` gains a third parameter. Before `execFile`, write `incomingTokens` to disk if present; after a successful exec, read `tokens.json` back and attach it to the resolved value. No more `withCache`, no more `restoreOnce`/`persistConfig` — caching and cross-request memoization both go away with Redis.

```js
import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { writeTokens, readTokens } from "./garminConfigStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GARMIN_PROJECT_PATH = path.resolve(__dirname, "../ai-skill-garmin/skills/garmin-connect");
const GARMIN_SCRIPT_PATH = path.resolve(GARMIN_PROJECT_PATH, "scripts/garmin.ts");
const BUN_PATH = process.env.BUN_PATH || process.env.BUN_COMMAND || "bun";

async function runGarminCommand(args = [], env = {}, incomingTokens = null) {
  if (incomingTokens) {
    await writeTokens(incomingTokens);
  }

  return new Promise((resolve, reject) => {
    execFile(
      BUN_PATH,
      ["run", GARMIN_SCRIPT_PATH, ...args],
      { cwd: GARMIN_PROJECT_PATH, env: { ...process.env, ...env } },
      async (error, stdout, stderr) => {
        const cleanStdout = stdout?.trim();
        const cleanStderr = stderr?.trim();
        const fullOutput = [cleanStdout, cleanStderr].filter(Boolean).join("\n");

        if (fullOutput.includes("MFA required")) {
          return resolve({ ok: false, requiresMfa: true, message: "Garmin requiere código MFA" });
        }

        if (fullOutput.includes("429") || fullOutput.toLowerCase().includes("rate limited")) {
          return reject(
            new Error("Garmin bloqueó temporalmente el login por demasiados intentos. Espera unos minutos antes de volver a intentar.")
          );
        }

        if (error) {
          return reject(new Error(cleanStderr || cleanStdout || error.message));
        }

        const tokens = await readTokens();

        try {
          const data = cleanStdout ? JSON.parse(cleanStdout) : null;
          return resolve({ ok: true, data, tokens });
        } catch {
          return resolve({ ok: true, data: cleanStdout, tokens });
        }
      }
    );
  });
}

export async function loginGarmin(email, password) {
  const result = await runGarminCommand(["login"], { GARMIN_EMAIL: email, GARMIN_PASSWORD: password });
  if (result.requiresMfa) return result;
  return { ok: true, authenticated: true, message: "Sesión iniciada correctamente", tokens: result.tokens };
}

export async function loginGarminWithMfa(email, password, mfaCode) {
  const result = await runGarminCommand(["login"], {
    GARMIN_EMAIL: email,
    GARMIN_PASSWORD: password,
    GARMIN_MFA: mfaCode,
  });
  return { ok: true, authenticated: true, message: "Sesión iniciada correctamente", tokens: result.tokens };
}

export async function checkSession(incomingTokens) {
  const result = await runGarminCommand(["whoami"], {}, incomingTokens);
  return { ok: true, authenticated: true, user: result.data, tokens: result.tokens };
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
  if (from) args.push("--from", from);
  if (to) args.push("--to", to);
  if (limit) args.push("--limit", String(limit));
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

Every exported function's result may now include a `tokens` field. `loginGarmin`'s MFA-required branch is the one case that returns early without one (no tokens exist yet).

### `server/index.js`

Add `cookie-parser` (`app.use(cookieParser())`, imported at the top) and two small helpers:

```js
const isProd = process.env.NODE_ENV === "production";
const TOKENS_COOKIE = "garmin_tokens";
const TOKENS_COOKIE_MAX_AGE_MS = 400 * 24 * 60 * 60 * 1000; // 400 days — Chrome's own cap on cookie lifetime

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
```

`secure`/`sameSite` are environment-conditional because the client and server are cross-site in production (Vercel + Render, both HTTPS, needs `Secure; SameSite=None`) but same-site in local dev once the Vite proxy (below) is in place (plain `Lax` works, and `Secure` would block the cookie entirely over local `http://`).

Every route touching `garminService.js` follows this shape — destructure `tokens` out, set the cookie, send the rest as the body:

```js
app.post("/api/login", async (req, res) => {
  try {
    if (loginBlockedUntil && Date.now() < loginBlockedUntil) {
      return res.status(429).json({ ok: false, error: "Login temporalmente bloqueado por límite de Garmin. Intenta más tarde." });
    }
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "Falta email o password" });
    }
    const { tokens, ...body } = await loginGarmin(email, password);
    setTokensCookie(res, tokens);
    return res.json(body);
  } catch (error) {
    if (error.message.includes("Garmin bloqueó temporalmente")) {
      loginBlockedUntil = Date.now() + 15 * 60 * 1000;
    }
    return res.status(500).json({ ok: false, error: error.message });
  }
});
```

The same `const { tokens, ...body } = await xyz(...); setTokensCookie(res, tokens); return res.json(body);` pattern applies to `/api/login/mfa`, `/api/session`, `/api/daily`, `/api/sleep`, `/api/weekly`, `/api/activities`, `/api/hrv`, `/api/readiness`, `/api/training-status` — each of the last seven also passes `getIncomingTokens(req)` as the extra argument to its `garminService.js` function. `/api/health`, `/api/health-garmin`, `/api/debug-network` are untouched.

### Removed entirely

- `server/redisClient.js`, `server/redisClient.test.js`
- `server/cache.js`, `server/cache.test.js`
- The `@upstash/redis` dependency from `server/package.json`
- Everything from the previous spec's Task 5 (no Upstash account, no Render/local env vars for it)

### Accepted residual risk (carried over in spirit from the previous design)

The dashboard fires several read requests in parallel on load. Each one independently writes the (identical, since they all read the same cookie at request time) incoming tokens to `tokens.json` before exec. Unlike the Redis version — where concurrent writers could race with *different* stale-vs-fresh blobs — every concurrent writer here has the same bytes, so the realistic failure mode (a torn write producing a corrupt file) is far less likely, though not provably impossible. Not worth adding request-level locking for a single-user hobby app; revisit only if this is ever observed to actually happen.

## Client changes

### `client/src/services/garminApi.js`

Add `withCredentials: true` so the browser sends/stores the cookie cross-site:

```js
const api = axios.create({
  baseURL: import.meta.env.VITE_GARMIN_API_URL || "/api",
  withCredentials: true,
});
```

(The `baseURL` fallback changes from the absolute `http://localhost:4000/api` to the relative `/api` — see the Vite proxy below. `VITE_GARMIN_API_URL` in production still points at the deployed Render URL and is unaffected.)

No other change needed for the token itself — it's `HttpOnly`, so client JS never touches it; the browser attaches and updates it automatically.

Wrap the seven read functions in the new cache helper:

```js
import { cachedRequest, ttlForDate, SHORT_TTL_MS } from "./cache.js";

export function getDaily(date) {
  return cachedRequest(`daily:${date ?? "latest"}`, ttlForDate(date), () =>
    requestApi(() => api.get("/daily", { params: { date } }), "Error al obtener los datos diarios")
  );
}
// ...same pattern for getSleep, getWeekly, getHrv, getReadiness, getTrainingStatus (all date-keyed, ttlForDate(date))
// getActivities uses SHORT_TTL_MS flat, keyed by from/to/limit, same as the server version did:
export function getActivities({ from, to, limit = 10 }) {
  return cachedRequest(`activities:${from ?? ""}:${to ?? ""}:${limit}`, SHORT_TTL_MS, () =>
    requestApi(() => api.get("/activities", { params: { from, to, limit } }), "Error al obtener las actividades")
  );
}
```

`loginGarmin`, `loginGarminMfa`, `checkGarminSession` stay exactly as they are — not cached, same as before.

`requestApi` already throws an `Error` on any `{ok: false}` or `{error: ...}` response (`garminApi.js:45-47`), so a failed request never resolves into `cachedRequest`'s "store on success" path — no separate failure-guard needed on the client side, unlike the server-side cache which had to add one.

### New file: `client/src/services/cache.js`

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

Note `date < todayStr()` (strictly less than) rather than `date === todayStr()`: this also fixes a bug the previous implementation's final review found (a future date, from an unbounded date picker, was being classified as "historical" and cached for 30 days). Here, `date < today` is the only case that gets the long TTL — today and any future date both get the short one.

### `client/vite.config.js`

Add a dev proxy so local requests are same-origin (required for the cookie to behave predictably without `Secure`/`SameSite=None` friction over plain `http://localhost`):

```js
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },
})
```

### `server/package.json`

Remove `@upstash/redis`. Add `cookie-parser`.

## Data flow (full login, then a data request)

1. User submits email/password. `POST /api/login` → `loginGarmin` → `runGarminCommand(["login"], {...})` with no incoming tokens (first-ever login) → Garmin requires MFA → resolves `{ok:false, requiresMfa:true, message}` with no `tokens` field → route handler has nothing to cookie, returns the body as-is.
2. User submits the MFA code. `POST /api/login/mfa` → `loginGarminWithMfa` → `runGarminCommand(["login"], {...GARMIN_MFA})` — same warm process still has the on-disk `mfa-state.json` from step 1 (not carried via any cookie, per Non-goals) → succeeds → `tokens.json` now holds real OAuth1+OAuth2 tokens → route handler sets `garmin_tokens` cookie, returns `{ok:true, authenticated:true, message}` (no `tokens` in the body).
3. Dashboard loads, fires `GET /api/daily`, `/api/sleep`, etc. in parallel. Each request's axios call automatically carries the `garmin_tokens` cookie (browser-managed, `withCredentials:true`). Each hits a cache miss (nothing in `localStorage` yet) → server writes the incoming cookie's tokens to `tokens.json`, execs, reads tokens back (unchanged, since `getSession()` found a valid cached OAuth2 token and made no network call) → route handler re-sets the same cookie value, returns the data (no `tokens` field) → client stores the data in `localStorage` under `garmin_cache:daily:<date>` with the appropriate TTL.
4. A later request for the same past date, within 30 days, is served straight from `localStorage` — no network call, no cookie round-trip needed for that read.
5. Weeks later, the OAuth2 access token expires. The next request's `getSession()` inside `garmin.ts` silently refreshes it using the cached OAuth1 token (no MFA) and rewrites `tokens.json` — the server reads the new value back and the route handler's `setTokensCookie` call ships the refreshed cookie to the browser, which starts sending the new value from then on.

## Error handling

- Any disk read/write failure in `writeTokens`/`readTokens` is caught and logged, never thrown — matches the existing posture.
- A missing or corrupt `garmin_tokens` cookie (`getIncomingTokens` returns `null`, or `JSON.parse` fails) is treated exactly like "no session yet": `runGarminCommand` skips the write, `garmin.ts`'s own `getSession()` falls through to requiring a full login (same as today when no `tokens.json` exists at all).
- A corrupt or expired `localStorage` cache entry (`JSON.parse` fails, or `expiresAt` has passed) is treated as a miss — re-fetch, don't throw.
- `localStorage.setItem` failing (quota exceeded, private browsing mode in some browsers) is caught and swallowed — caching is a pure optimization, never a requirement for correctness.

## Testing

`server/garminConfigStore.test.js` (rewritten, no Redis/fake-client scaffolding needed):
- `writeTokens` + `readTokens` round-trip through a temp file.
- `readTokens` returns `null` for a missing file.
- `writeTokens(null, ...)` is a no-op (doesn't create a file).

`server/garminService.js` — no dedicated test file, same as the previous spec (shells out to a real external script; verified manually).

`client/src/services/cache.test.js` (new — `node:test`, run via a new `"test": "node --test src/services"` script in `client/package.json`, mirroring `server/`'s existing convention; needs a tiny hand-rolled `localStorage` mock since `node:test` runs outside a browser):
- Cache hit within TTL returns the stored value without calling `fetchFn`.
- Cache miss calls `fetchFn` and stores its result.
- Expired entry (`expiresAt` in the past) is treated as a miss.
- `ttlForDate(pastDate)` returns the long TTL; `ttlForDate(todayStr())` and `ttlForDate(futureDate)` both return the short TTL; `ttlForDate(undefined)` returns the short TTL.

Manual verification (same spirit as the previous spec, updated for the new mechanism):
1. **Cookie is HttpOnly:** after logging in, open DevTools → Application → Cookies, confirm `garmin_tokens` shows `HttpOnly: true`; confirm `document.cookie` in the console does NOT include it.
2. **Session survives a cold start:** log in, delete `~/.config/garmin-api/tokens.json` locally (simulating Render's filesystem reset) *without* clearing the browser cookie, then reload the dashboard — the cookie should re-populate the file server-side and no login prompt should appear.
3. **Cookie size fits:** inspect the actual `Set-Cookie` header's length after a real login — confirm it's comfortably under the ~4KB per-cookie limit. If a real account's combined OAuth1+OAuth2 payload ever gets close, the fallback is splitting into two cookies (`garmin_oauth1`, `garmin_oauth2`) — not needed unless this check fails.
4. **Cache actually skips the network:** load the dashboard for a past date twice; confirm (via the Network tab) the second load makes no `/api/daily` request for that date.
5. **Cross-site cookie in production:** after deploying, confirm the Vercel-hosted frontend successfully receives and re-sends the cookie to the Render backend (different domains) — this is the one behavior that can't be verified from local dev even with the Vite proxy, since the proxy specifically makes dev same-site.

## Rollout

1. Remove `@upstash/redis`, delete `redisClient.js`/`.test.js`, `cache.js`/`.test.js`.
2. Add `cookie-parser` to `server/package.json`.
3. Rewrite `garminConfigStore.js`, `garminConfigStore.test.js`, `garminService.js` as above.
4. Update `server/index.js` with the cookie helpers and the per-route `{tokens, ...body}` pattern.
5. Add `client/src/services/cache.js` + its test, wire it into `garminApi.js`, add `withCredentials: true`.
6. Add the Vite dev proxy, adjust the `baseURL` fallback.
7. Run the automated tests, then the manual verification list above, locally first.
8. Deploy; run manual check 5 (the one thing only production can confirm) against the real cross-site setup.
9. No environment variables to add or remove on Render — this rollout has none.

## Open questions / deferred

- Real cookie size for a live Garmin account's OAuth1+OAuth2 payload is unverified until manual check 3 runs against a real login — flagged, with a named fallback (split into two cookies) if it doesn't fit.
- If multi-user support is ever added (a previously-noted future idea, still out of scope), a single `garmin_tokens` cookie per browser is already inherently per-visitor — no extra work needed there, unlike the Redis version which would have needed a user-scoped key prefix.
