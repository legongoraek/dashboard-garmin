# Garmin session persistence + response cache

Date: 2026-08-30
Status: Approved for planning

## Problem

The backend (`server/`) runs on Render's free tier, which spins the
process down after inactivity and gives it a fresh, ephemeral
filesystem on the next request ("cold start"). `wakeUpBackend()`
(client-side ping) exists specifically to fight this sleep behavior.

`server/garminService.js` calls a separate script,
`ai-skill-garmin/skills/garmin-connect/scripts/garmin.ts` (a
sibling repo, cloned locally at
`D:\Proyectos\dashboard-garmin\ai-skill-garmin`, gitignored from this
repo), via `execFile` for every Garmin Connect operation (login,
daily, sleep, weekly, activities, hrv, readiness, training-status).

That script already has its own session-reuse logic
(`getSession()` in `garmin.ts`): it caches OAuth1/OAuth2 tokens and
MFA state as three JSON files under a **fixed, non-configurable**
path, `~/.config/garmin-api/` (`tokens.json`, `mfa-state.json`,
`consumer.json`). Within a single warm Render process, this works
correctly — one login is reused across many subsequent commands.

The problem is what happens across a cold start: Render wipes the
container's filesystem, so `~/.config/garmin-api/` is gone. The next
request forces a full login again, which can require a fresh MFA code
(not automatable) and repeated login attempts are what triggers
Garmin's rate limit, already handled defensively in
`server/index.js` via `loginBlockedUntil` and the `429` error path in
`garminService.js`.

Separately, every read endpoint (`/api/daily`, `/api/sleep`,
`/api/weekly`, `/api/activities`, `/api/hrv`, `/api/readiness`,
`/api/training-status`) spawns a bun child process and hits Garmin's
API on every request, even when the underlying data hasn't changed
(e.g. a closed day's sleep summary never changes).

## Goals

1. Garmin auth state survives a Render cold start, so the dashboard
   doesn't force a fresh login/MFA every time the backend wakes up.
2. Repeated reads of unchanging data don't re-spawn the bun script or
   re-hit Garmin's API.
3. Both problems are solved with one small piece of shared
   infrastructure, not two separate subsystems.
4. No behavior change when the new infra (Redis) is unreachable —
   degrade to today's behavior, never fail the request because of it.

## Non-goals

- No local historical database / long-range analytics store (a
  separate, later idea).
- No changes to the Garmin login/MFA UX in the frontend.
- No change to `garmin.ts` itself — it lives in a separate repo and is
  treated as a black box; the fixed token path
  (`~/.config/garmin-api/*.json`) is worked around from
  `garminService.js`, not edited in place.

## Store choice

Upstash Redis, free tier (10k commands/day, 256MB). Accessed over its
REST API (`@upstash/redis` package) — no TCP connection pooling to
manage, fits a process that may cold-start on every request. A
single-user dashboard's request volume is far under the free-tier
ceiling.

New env vars (Render + local `.env`): `UPSTASH_REDIS_REST_URL`,
`UPSTASH_REDIS_REST_TOKEN`.

## Architecture

Two independent-but-adjacent features share the same Redis client:

```
                     ┌────────────────────────┐
   HTTP request  ──▶ │  index.js route handler │
                     └───────────┬─────────────┘
                                 ▼
                     ┌────────────────────────┐
                     │   garminService.js      │
                     │                          │
                     │  getXSummary(date) ──▶ withCache(key, ttl, fn)
                     │                          │      │
                     │                          │  cache hit → return
                     │                          │      │ miss
                     │                          │      ▼
                     │  runGarminCommand(args) ◀┘
                     │      │
                     │      ├─ restoreConfig()   (Redis → ~/.config/garmin-api/*.json)
                     │      ├─ execFile(bun, garmin.ts, args)
                     │      └─ persistConfig()   (~/.config/garmin-api/*.json → Redis)
                     └────────────────────────┘
                                 │
                                 ▼
                     ┌────────────────────────┐
                     │   Upstash Redis (REST)  │
                     │  garmin:config          │
                     │  cache:<endpoint>:<key> │
                     └────────────────────────┘
```

### New files

- **`server/redisClient.js`** — creates and exports a single
  `@upstash/redis` client built from `UPSTASH_REDIS_REST_URL` /
  `UPSTASH_REDIS_REST_TOKEN`. Throws no errors at import time if env
  vars are missing; callers handle a disabled client (see Error
  handling).

- **`server/garminConfigStore.js`** — session persistence.
  - `restoreConfig()`: reads the `garmin:config` Redis key (one JSON
    blob containing `{ tokens, mfaState, consumer }`, each the parsed
    contents of the corresponding file, or `null` if absent), and
    writes each present piece to its real path under
    `~/.config/garmin-api/` (creating the directory if needed). No-op
    if the Redis key doesn't exist yet.
  - `persistConfig()`: reads back whichever of the three files exist
    on disk after the script ran, and writes the combined blob to
    `garmin:config`.
  - Both are best-effort: any failure (Redis or filesystem) is caught
    and logged, never thrown.

- **`server/cache.js`** — generic response cache.
  - `withCache(key, ttlSeconds, fn)`: reads `cache:<key>` from Redis;
    on hit, returns the parsed value; on miss, calls `fn()`, stores
    the result with `EX ttlSeconds`, and returns it. Redis failures
    are treated as a miss (falls through to `fn()`).

### Changes to `server/garminService.js`

- `runGarminCommand()` calls `await restoreConfig()` before
  `execFile`, and `await persistConfig()` after a successful exec
  (including the MFA-required and 429 branches skip persist, since no
  new tokens were written; only the plain success path persists).
- Each of `getDailySummary`, `getSleepSummary`, `getWeeklySummary`,
  `getHrvSummary`, `getTrainingReadiness`, `getTrainingStatus` wraps
  its existing `runGarminCommand(...)` call in
  `withCache(cacheKey, ttl, () => runGarminCommand(...))`.
  - `cacheKey` = `` `${endpointName}:${date ?? "latest"}` ``.
  - `ttl` = 300 (5 minutes) if `date` is missing or equals today's
    date (server-local `YYYY-MM-DD`); otherwise 30 days (a closed past
    day's data doesn't change).
- `getActivities` wraps its call with `withCache`, key derived from
  `from`/`to`/`limit`, flat TTL = 300 seconds (an activity can appear
  at any time, so no long-TTL branch).
- `loginGarmin`, `loginGarminWithMfa`, `checkSession` are **not**
  cached (each must always talk to Garmin), but still go through
  `runGarminCommand()` so they get restore/persist for free.

## Data flow (cold start, happy path)

1. Render wakes the process; `~/.config/garmin-api/` doesn't exist.
2. Frontend calls e.g. `/api/daily?date=2026-08-25` (a past date).
3. Cache miss (`cache:daily:2026-08-25` not set, or first-ever call).
4. `restoreConfig()` finds `garmin:config` in Redis from a prior warm
   period, writes `tokens.json` back to disk.
5. `runGarminCommand(["daily", ...])` runs; `garmin.ts`'s own
   `getSession()` finds a valid (or refreshable) OAuth token on disk —
   no login, no MFA.
6. `persistConfig()` re-reads the files (unchanged, or refreshed
   OAuth2) and re-saves to Redis.
7. Result cached in `cache:daily:2026-08-25` for 30 days; response
   returned.
8. A later request for the same past date is served straight from
   Redis without touching the filesystem or Garmin at all.

If Redis has never been populated (very first deploy, or the account
was never logged in from this backend), step 4 is a no-op and the
existing full-login flow (`/api/login`, possibly `/api/login/mfa`)
runs exactly as it does today.

## Error handling

- **Redis unreachable or env vars missing:** `redisClient.js` exposes
  the client as `null`/disabled; `restoreConfig`, `persistConfig`, and
  `withCache` check for this and short-circuit to today's behavior
  (no restore, no cache — always call `fn()`/exec the script). Logged
  once as a warning, not per-request spam.
- **Corrupt or partial blob in `garmin:config`:** wrapped in try/catch
  per file; a bad piece is skipped (treated as absent) rather than
  aborting the whole restore.
- **`garmin.ts` still ends up requiring login/MFA** (e.g. refresh
  token itself expired, or first run ever): unchanged — surfaces as
  today's `requiresMfa` / error response. This spec does not change
  the MFA UX, only reduces how often it's needed.

## Testing

No existing test suite (`server/package.json`'s `test` script is a
placeholder). Manual verification only, matching the project's
current practice:

1. **Session survives cold start:** with a working login, delete the
   local `~/.config/garmin-api/` directory (simulating Render's
   filesystem reset), then call `/api/daily`. Confirm the response
   succeeds without hitting `/api/login`, and confirm the directory
   was recreated with tokens restored from Redis.
2. **Cache hit skips exec:** call `/api/daily?date=<past date>` twice.
   Add a temporary `console.log` (or check Render logs) confirming the
   second call never spawns `bun`/`execFile`.
3. **Today's data still refreshes:** call `/api/daily` (no date, or
   today's date) twice more than 5 minutes apart; confirm the second
   call does re-execute (not stuck on stale cache).
4. **Redis down / misconfigured:** unset `UPSTASH_REDIS_REST_URL`
   locally, confirm the app behaves exactly as it does on `main`
   today (no crash, no hang).

## Rollout

1. Add `@upstash/redis` to `server/package.json`.
2. Create an Upstash Redis database (free tier), add
   `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` to Render's
   environment and local `.env`.
3. Implement `redisClient.js`, `garminConfigStore.js`, `cache.js`.
4. Wire into `garminService.js`.
5. Manually run through the Testing section above against the local
   dev server before deploying.
6. Deploy to Render, do one real cold-start check (wait for the free
   tier to sleep, or manually restart the service) to confirm step 1
   of Testing holds in the real environment, not just simulated
   locally.

## Open questions / deferred

- Exact Redis key TTL for `garmin:config` itself: proposed no TTL
  (persists until overwritten) since it's small and reused
  indefinitely; revisit if stale-credential edge cases show up.
- If multiple Garmin accounts are ever supported (multi-user, listed
  as a separate future idea), the flat `garmin:config` / `cache:*`
  keys need a user-scoping prefix. Out of scope while this stays
  single-user.
