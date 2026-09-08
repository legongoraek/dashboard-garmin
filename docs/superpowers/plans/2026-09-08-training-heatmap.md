# Training Heatmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a heatmap of every GPS-tracked location the user has trained in, for a date range they pick, as a new card in the existing dashboard.

**Architecture:** `garmin.ts` (a separate sibling repo, previously treated as an untouched black box) gains one new command, `activity-detail`, since Garmin's activity-list endpoint never carries GPS data. The server and client extend with the exact same session-cookie and localStorage-cache patterns every other endpoint already uses — no new infrastructure. The client fetches activity details **sequentially, never in parallel**, to avoid recreating a concurrent-file-write race a previous branch's final review found and fixed.

**Tech Stack:** Bun/TypeScript (`ai-skill-garmin`, its own repo — uses Bun's built-in test runner, `bun test`, no new dependency there). Node.js/Express (`server/`) — `node:test`, no new dependency. React/Vite (`client/`) — `node:test` for logic, plus three new runtime dependencies: `leaflet`, `react-leaflet`, `leaflet.heat` (all free, no API key, OpenStreetMap tiles).

**Spec:** [docs/superpowers/specs/2026-09-08-training-heatmap-design.md](../specs/2026-09-08-training-heatmap-design.md)

## Global Constraints

- `garmin.ts`'s existing commands (`daily`, `sleep`, `hrv`, `readiness`, `training`, `activities`, `weekly`, `login`, `whoami`) are never modified — only a new `activity-detail` command is added.
- Activity-detail fetching on the client is strictly sequential — never `Promise.all` or any other concurrent fan-out over activities. This is the one hard rule carried over from a real bug found in the previous plan's final review.
- ESM `.js` extensions on every relative import in `server/` and `client/` (established repo-wide convention).
- No new test framework beyond what each part already has or is adding here: Bun's built-in `bun test` in `ai-skill-garmin`; `node:test` in `server/` and `client/`.
- No new environment variables, no new paid/external services — everything here runs on infrastructure this project already has.
- Cache TTL for an activity's GPS detail: `PERMANENT_TTL_MS` (365 days) — distinct from `ttlForDate`'s date-based rule, because a past activity's recorded GPS track never changes.
- Safety cap: at most `MAX_ACTIVITIES` (200) activities per heatmap load.

---

## Task 1: `garmin.ts` — new `activity-detail` command

**Files:**
- Modify: `ai-skill-garmin/skills/garmin-connect/scripts/garmin.ts` (this is a separate git repository from `dashboard-garmin` — commit there, not in the main repo)
- Test: `ai-skill-garmin/skills/garmin-connect/scripts/garmin.test.ts` (new file, run via Bun's built-in test runner)

**Interfaces:**
- Produces: `extractPolyline(detail: any): { lat: number; lon: number }[]`, `downsamplePoints(points, max: number): { lat: number; lon: number }[]`, and a new `activity-detail <activityId> [--max-points N]` CLI command that outputs `{ activityId: string, points: { lat: number; lon: number }[] }`. Task 2 invokes this exact CLI command via `execFile` and expects this exact JSON output shape.

- [ ] **Step 1: Write the failing tests**

Create `ai-skill-garmin/skills/garmin-connect/scripts/garmin.test.ts`:

```ts
import { test, expect } from 'bun:test';
import { extractPolyline, downsamplePoints } from './garmin.ts';

test('extractPolyline reads geoPolylineDTO.polyline and keeps only numeric lat/lon', () => {
  const detail = {
    geoPolylineDTO: {
      polyline: [
        { lat: 19.43, lon: -99.13, altitude: 2240 },
        { lat: 19.44, lon: -99.14 },
        { lat: null, lon: -99.15 },
        { foo: 'bar' },
      ],
    },
  };

  const result = extractPolyline(detail);

  expect(result).toEqual([
    { lat: 19.43, lon: -99.13 },
    { lat: 19.44, lon: -99.14 },
  ]);
});

test('extractPolyline returns an empty array when there is no polyline (e.g. an indoor activity)', () => {
  expect(extractPolyline({})).toEqual([]);
  expect(extractPolyline({ geoPolylineDTO: {} })).toEqual([]);
  expect(extractPolyline(null)).toEqual([]);
});

test('downsamplePoints returns the input unchanged when already under the max', () => {
  const points = [
    { lat: 1, lon: 1 },
    { lat: 2, lon: 2 },
  ];

  expect(downsamplePoints(points, 500)).toEqual(points);
});

test('downsamplePoints reduces a large set to at most max points', () => {
  const points = Array.from({ length: 1000 }, (_, i) => ({ lat: i, lon: i }));

  const result = downsamplePoints(points, 500);

  expect(result.length).toBeLessThanOrEqual(500);
  expect(result[0]).toEqual({ lat: 0, lon: 0 });
});
```

- [ ] **Step 2: Run to confirm the tests fail**

Run (from `ai-skill-garmin/skills/garmin-connect/scripts/`): `bun test`
Expected: FAIL — `extractPolyline`/`downsamplePoints` are not exported yet (they don't exist in `garmin.ts`).

- [ ] **Step 3: Add the two helper functions to `garmin.ts`**

Add near the existing `apiGet` function (the "API calls" section):

```ts
export function extractPolyline(detail: any): { lat: number; lon: number }[] {
  const raw = detail?.geoPolylineDTO?.polyline;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p: any) => typeof p?.lat === 'number' && typeof p?.lon === 'number')
    .map((p: any) => ({ lat: p.lat, lon: p.lon }));
}

export function downsamplePoints(points: { lat: number; lon: number }[], max: number): { lat: number; lon: number }[] {
  if (points.length <= max) return points;
  const stride = Math.ceil(points.length / max);
  return points.filter((_, i) => i % stride === 0);
}
```

- [ ] **Step 4: Run the tests again to confirm they pass**

Run: `bun test`
Expected: PASS (4 tests).

- [ ] **Step 5: Add the CLI command and API method**

Add to the `Api` interface (near the existing `activities` entry):

```ts
  activityDetail: (activityId: string, maxPoints?: number) => Promise<{ activityId: string; points: { lat: number; lon: number }[] }>;
```

Add to `makeApi()`'s returned object (alongside `activities`):

```ts
    activityDetail: async (activityId, maxPoints = 500) => {
      const detail = await apiGet<any>(`/activity-service/activity/${activityId}/details`, session.oauth2);
      const points = downsamplePoints(extractPolyline(detail), maxPoints);
      return { activityId, points };
    },
```

Add a case to `main()`'s `switch (sub)` (alongside `case 'activities'`):

```ts
    case 'activity-detail': {
      const activityId = argv[1];
      if (!activityId) throw new Error('activity-detail requires <activityId>');
      const maxPoints = parseInt(parseFlag(argv, 'max-points') ?? '500', 10);
      output(await api.activityDetail(activityId, maxPoints), pretty);
      return;
    }
```

Add to `printHelp()`'s usage text, after the `activities` line:

```
  activity-detail <activityId> [--max-points N]  GPS points for one activity (default max 500)
```

- [ ] **Step 6: Run the tests one more time**

Run: `bun test`
Expected: PASS (still 4 tests — the CLI/API wiring has no dedicated test, matching this file's existing pattern of testing pure logic only, not the live network calls).

- [ ] **Step 7: Sanity-check the CLI wiring compiles and runs**

Run (from `ai-skill-garmin/skills/garmin-connect/scripts/`): `bun run garmin.ts activity-detail --help` — this will fail with `Unknown subcommand` if you typo'd `--help` as an activity ID (expected, `--help` isn't a real ID), but confirms the file still parses and runs. Then run `bun run garmin.ts --help` and confirm the new `activity-detail` line appears in the output.

- [ ] **Step 8: Commit (in the `ai-skill-garmin` repository, not `dashboard-garmin`)**

```bash
cd ai-skill-garmin
git add skills/garmin-connect/scripts/garmin.ts skills/garmin-connect/scripts/garmin.test.ts
git commit -m "feat: add activity-detail command for GPS polyline data

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: Server — `getActivityDetail` + `/api/activity-detail` route

**Files:**
- Modify: `server/garminService.js`
- Modify: `server/index.js`

**Interfaces:**
- Consumes: the `activity-detail <activityId> --pretty` CLI command from Task 1 (via the existing `runGarminCommand` helper already in `garminService.js`).
- Produces: `export async function getActivityDetail(activityId, incomingTokens)` — same shape every other function in this file already returns (`{ ok, data, tokens }`). No test file — matches every other function in `garminService.js` (shells to a real external process, verified manually).

- [ ] **Step 1: Add `getActivityDetail` to `server/garminService.js`**

Add after the existing `getTrainingStatus` function, following its exact shape:

```js
export async function getActivityDetail(activityId, incomingTokens) {
  return runGarminCommand(["activity-detail", activityId, "--pretty"], {}, incomingTokens);
}
```

- [ ] **Step 2: Add the route to `server/index.js`**

Add `getActivityDetail` to the existing import from `./garminService.js` (alongside `getTrainingStatus`).

Add a new route after the existing `/api/training-status` route:

```js
app.get("/api/activity-detail", async (req, res) => {
  try {
    const { activityId } = req.query;

    if (!activityId) {
      return res.status(400).json({ ok: false, error: "Falta activityId" });
    }

    const { tokens, ...body } = await getActivityDetail(activityId, getIncomingTokens(req));
    setTokensCookie(res, tokens);
    return res.json(body);
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});
```

- [ ] **Step 3: Run the existing test suite**

Run: `npm test` (from `server/`)
Expected: PASS (3/3 — unaffected, neither changed file has tests of its own).

- [ ] **Step 4: Boot the server and confirm no wiring errors**

Run: `npm run dev` (from `server/`)
Expected: `Garmin API running on http://localhost:4000`, no crash. `curl -i "http://localhost:4000/api/activity-detail"` (no `activityId`) should return `400` with `{"ok":false,"error":"Falta activityId"}`.

Stop the server (Ctrl+C) once confirmed.

- [ ] **Step 5: Commit**

```bash
git add server/garminService.js server/index.js
git commit -m "feat: add /api/activity-detail endpoint for GPS polyline data

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: Client API layer — `getActivityDetail` + long-lived cache TTL

**Files:**
- Modify: `client/src/services/cache.js`
- Modify: `client/src/services/garminApi.js`

**Interfaces:**
- Produces: `export const PERMANENT_TTL_MS` (365-day TTL, in `cache.js`) and `export function getActivityDetail(activityId)` (in `garminApi.js`, returning a Promise resolving to `{ ok, data: { activityId, points } }`). Task 4 imports and calls `getActivityDetail(activityId)` with exactly one argument.

No dedicated test — both additions are thin wrappers around already-tested logic (`cachedRequest` from `cache.test.js`, `requestApi` unchanged).

- [ ] **Step 1: Add `PERMANENT_TTL_MS` to `client/src/services/cache.js`**

Add alongside the existing `SHORT_TTL_MS`/`LONG_TTL_MS` constants at the top of the file:

```js
export const PERMANENT_TTL_MS = 365 * 24 * 60 * 60 * 1000;
```

- [ ] **Step 2: Add `getActivityDetail` to `client/src/services/garminApi.js`**

Add `PERMANENT_TTL_MS` to the existing `import { cachedRequest, ttlForDate, SHORT_TTL_MS } from "./cache.js";` line.

Add the function after the existing `getTrainingStatus`:

```js
export function getActivityDetail(activityId) {
  return cachedRequest(`activity-detail:${activityId}`, PERMANENT_TTL_MS, () =>
    requestApi(
      () => api.get("/activity-detail", { params: { activityId } }),
      "Error al obtener el detalle de la actividad"
    )
  );
}
```

- [ ] **Step 3: Run the existing test suite**

Run: `npm test` (from `client/`)
Expected: PASS (5/5 — unaffected).

- [ ] **Step 4: Commit**

```bash
git add client/src/services/cache.js client/src/services/garminApi.js
git commit -m "feat: add client getActivityDetail with a permanent cache TTL

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: `heatmapData.js` — sequential fetch-and-accumulate logic

**Files:**
- Create: `client/src/services/heatmapData.js`
- Test: `client/src/services/heatmapData.test.js`

**Interfaces:**
- Consumes: `getActivities` (already exists in `garminApi.js`, returns `{ ok, data: [{ activityId, ... }, ...] }`), `getActivityDetail(activityId)` from Task 3 (returns `{ ok, data: { activityId, points } }`).
- Produces: `export const MAX_ACTIVITIES` (= `200`) and `export async function loadHeatmapPoints({ from, to }, onProgress, getActivitiesFn = getActivities, getActivityDetailFn = getActivityDetail)`, resolving to `{ points: [[lat, lon], ...], activitiesCount: number, skippedCount: number, truncated: boolean }`. Task 5's `DashboardPage.jsx` calls this with just `({ from, to }, onProgress)`, relying on the real-function defaults; the two trailing parameters exist purely so this task's tests can inject fakes.

- [ ] **Step 1: Write the failing tests**

Create `client/src/services/heatmapData.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadHeatmapPoints, MAX_ACTIVITIES } from "./heatmapData.js";

function fakeActivities(ids) {
  return async () => ({ ok: true, data: ids.map((activityId) => ({ activityId })) });
}

test("accumulates points across multiple activities", async () => {
  const getActivities = fakeActivities(["a1", "a2"]);
  const getActivityDetail = async (activityId) => ({
    ok: true,
    data: {
      activityId,
      points:
        activityId === "a1"
          ? [{ lat: 1, lon: 1 }]
          : [{ lat: 2, lon: 2 }, { lat: 3, lon: 3 }],
    },
  });

  const result = await loadHeatmapPoints(
    { from: "2026-08-01", to: "2026-08-31" },
    undefined,
    getActivities,
    getActivityDetail
  );

  assert.deepEqual(result.points, [[1, 1], [2, 2], [3, 3]]);
  assert.equal(result.activitiesCount, 2);
  assert.equal(result.skippedCount, 0);
  assert.equal(result.truncated, false);
});

test("skips a failing activity without aborting the rest", async () => {
  const getActivities = fakeActivities(["a1", "a2"]);
  const getActivityDetail = async (activityId) => {
    if (activityId === "a1") throw new Error("network blip");
    return { ok: true, data: { activityId, points: [{ lat: 9, lon: 9 }] } };
  };

  const result = await loadHeatmapPoints(
    { from: "2026-08-01", to: "2026-08-31" },
    undefined,
    getActivities,
    getActivityDetail
  );

  assert.deepEqual(result.points, [[9, 9]]);
  assert.equal(result.skippedCount, 1);
  assert.equal(result.activitiesCount, 2);
});

test("truncated is true when the activity count hits MAX_ACTIVITIES", async () => {
  const ids = Array.from({ length: MAX_ACTIVITIES }, (_, i) => `a${i}`);
  const getActivities = fakeActivities(ids);
  const getActivityDetail = async (activityId) => ({
    ok: true,
    data: { activityId, points: [] },
  });

  const result = await loadHeatmapPoints(
    { from: "2026-01-01", to: "2026-12-31" },
    undefined,
    getActivities,
    getActivityDetail
  );

  assert.equal(result.activitiesCount, MAX_ACTIVITIES);
  assert.equal(result.truncated, true);
});

test("calls onProgress once per activity with the running count and total", async () => {
  const getActivities = fakeActivities(["a1", "a2", "a3"]);
  const getActivityDetail = async (activityId) => ({
    ok: true,
    data: { activityId, points: [] },
  });

  const calls = [];
  await loadHeatmapPoints(
    { from: "2026-08-01", to: "2026-08-31" },
    (current, total) => calls.push([current, total]),
    getActivities,
    getActivityDetail
  );

  assert.deepEqual(calls, [[1, 3], [2, 3], [3, 3]]);
});
```

- [ ] **Step 2: Run to confirm the tests fail**

Run: `npm test` (from `client/`)
Expected: FAIL — `Cannot find module './heatmapData.js'`.

- [ ] **Step 3: Create `client/src/services/heatmapData.js`**

```js
import { getActivities, getActivityDetail } from "./garminApi.js";

export const MAX_ACTIVITIES = 200;

export async function loadHeatmapPoints(
  { from, to },
  onProgress,
  getActivitiesFn = getActivities,
  getActivityDetailFn = getActivityDetail
) {
  const activitiesResponse = await getActivitiesFn({ from, to, limit: MAX_ACTIVITIES });
  const activities = (activitiesResponse.data ?? []).filter((a) => a.activityId);

  const points = [];
  let skippedCount = 0;

  for (let i = 0; i < activities.length; i++) {
    const activity = activities[i];

    try {
      const detail = await getActivityDetailFn(activity.activityId);
      const activityPoints = detail.data?.points ?? [];

      for (const point of activityPoints) {
        if (typeof point.lat === "number" && typeof point.lon === "number") {
          points.push([point.lat, point.lon]);
        }
      }
    } catch {
      skippedCount += 1;
    }

    onProgress?.(i + 1, activities.length);
  }

  return {
    points,
    activitiesCount: activities.length,
    skippedCount,
    truncated: activities.length >= MAX_ACTIVITIES,
  };
}
```

- [ ] **Step 4: Run the tests again to confirm they pass**

Run: `npm test` (from `client/`)
Expected: PASS (9 tests total: 5 from Tasks unaffected earlier + 4 here).

- [ ] **Step 5: Commit**

```bash
git add client/src/services/heatmapData.js client/src/services/heatmapData.test.js
git commit -m "feat: add sequential activity-detail fetch/accumulate logic for the heatmap

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: `TrainingHeatmap.jsx` component + wiring into the dashboard

**Files:**
- Modify: `client/package.json` (add `leaflet`, `react-leaflet`, `leaflet.heat`)
- Create: `client/src/components/TrainingHeatmap.jsx`
- Modify: `client/src/pages/DashboardPage.jsx`

**Interfaces:**
- Consumes: `loadHeatmapPoints` from `client/src/services/heatmapData.js` (Task 4).
- Produces: no new exports consumed by later tasks — this is the final, user-facing task in this plan.

No dedicated test for the component itself (map/heat-layer rendering needs a real browser, not `node:test`) — verified by the manual dummy-coordinate smoke check in Step 5 below, and by the real-account check in Task 6.

- [ ] **Step 1: Add the map dependencies**

Run from `client/`:

```bash
npm install leaflet react-leaflet leaflet.heat
```

- [ ] **Step 2: Create `client/src/components/TrainingHeatmap.jsx`**

```jsx
import { useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Box,
  Alert,
  TextField,
  Button,
} from "@mui/material";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

const DEFAULT_CENTER = [19.4326, -99.1332];
const DEFAULT_ZOOM = 5;

function HeatLayer({ points }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return undefined;

    const heat = L.heatLayer(points, { radius: 20, blur: 15 }).addTo(map);
    map.fitBounds(heat.getBounds(), { padding: [30, 30] });

    return () => {
      map.removeLayer(heat);
    };
  }, [map, points]);

  return null;
}

export default function TrainingHeatmap({
  from,
  to,
  onFromChange,
  onToChange,
  onLoad,
  loading,
  progress,
  error,
  result,
}) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight={800} gutterBottom>
          Mapa de entrenamientos
        </Typography>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ mb: 2 }}
          alignItems={{ sm: "center" }}
        >
          <TextField
            type="date"
            size="small"
            label="Desde"
            value={from}
            onChange={(event) => onFromChange(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            type="date"
            size="small"
            label="Hasta"
            value={to}
            onChange={(event) => onToChange(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Button variant="contained" onClick={onLoad} disabled={loading}>
            {loading ? "Cargando..." : "Cargar"}
          </Button>
        </Stack>

        {loading && progress && (
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Cargando actividad {progress.current} de {progress.total}...
          </Typography>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && result && result.activitiesCount === 0 && (
          <Typography color="text.secondary">
            No hay actividades en este rango.
          </Typography>
        )}

        {!loading && result && result.activitiesCount > 0 && (
          <>
            {result.truncated && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Mostrando un máximo de {result.activitiesCount} actividades — el
                rango elegido puede tener más.
              </Alert>
            )}
            {result.skippedCount > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {result.skippedCount} actividad(es) no se pudieron cargar.
              </Alert>
            )}

            <Box sx={{ height: 400, borderRadius: 2, overflow: "hidden" }}>
              <MapContainer
                center={DEFAULT_CENTER}
                zoom={DEFAULT_ZOOM}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <HeatLayer points={result.points} />
              </MapContainer>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Wire it into `client/src/pages/DashboardPage.jsx`**

Add to the existing imports at the top of the file:

```js
import TrainingHeatmap from "../components/TrainingHeatmap";
import { loadHeatmapPoints } from "../services/heatmapData";
```

Add new state, alongside the component's other `useState` declarations:

```js
const [heatmapFrom, setHeatmapFrom] = useState(() => getSevenDaysAgoFrom(getToday()));
const [heatmapTo, setHeatmapTo] = useState(() => getToday());
const [heatmapLoading, setHeatmapLoading] = useState(false);
const [heatmapProgress, setHeatmapProgress] = useState(null);
const [heatmapError, setHeatmapError] = useState(null);
const [heatmapResult, setHeatmapResult] = useState(null);
```

Add a handler, alongside the component's other handlers (using `useCallback`, matching the file's existing style — `useCallback` is already imported at the top of this file):

```js
const handleLoadHeatmap = useCallback(async () => {
  setHeatmapLoading(true);
  setHeatmapError(null);
  setHeatmapProgress(null);

  try {
    const result = await loadHeatmapPoints(
      { from: heatmapFrom, to: heatmapTo },
      (current, total) => setHeatmapProgress({ current, total })
    );
    setHeatmapResult(result);
  } catch (error) {
    setHeatmapError(error.message);
  } finally {
    setHeatmapLoading(false);
  }
}, [heatmapFrom, heatmapTo]);
```

Render the component in the page's JSX, alongside the existing cards (e.g. after the `<RecentActivities ... />` element):

```jsx
<TrainingHeatmap
  from={heatmapFrom}
  to={heatmapTo}
  onFromChange={setHeatmapFrom}
  onToChange={setHeatmapTo}
  onLoad={handleLoadHeatmap}
  loading={heatmapLoading}
  progress={heatmapProgress}
  error={heatmapError}
  result={heatmapResult}
/>
```

- [ ] **Step 4: Run the existing test suite**

Run: `npm test` (from `client/`)
Expected: PASS (9/9 — unaffected, this task adds no new test files).

- [ ] **Step 5: Manual smoke check with dummy coordinates (no Garmin account needed)**

Temporarily replace the `handleLoadHeatmap` body with a version that sets fake data instead of calling `loadHeatmapPoints`, to confirm the map itself renders correctly before ever touching a real account:

```js
const handleLoadHeatmap = useCallback(async () => {
  setHeatmapResult({
    points: [
      [19.4326, -99.1332],
      [19.4340, -99.1345],
      [19.4300, -99.1300],
    ],
    activitiesCount: 3,
    skippedCount: 0,
    truncated: false,
  });
}, []);
```

Run `npm run dev` (from `client/`) and `npm run dev` (from `server/`, in a separate terminal — needed for the page to load at all, even though this check doesn't hit any Garmin endpoint). Open the dashboard, click "Cargar" on the new "Mapa de entrenamientos" card.

Expected: an OpenStreetMap tile map renders inside the card, and a heat glow appears over central Mexico City at the three hardcoded points.

Once confirmed, **revert `handleLoadHeatmap` back to the real version from Step 3** before committing — the dummy version above must not ship.

Stop both dev servers once confirmed.

- [ ] **Step 6: Commit**

```bash
git add client/package.json client/package-lock.json client/src/components/TrainingHeatmap.jsx client/src/pages/DashboardPage.jsx
git commit -m "feat: add training heatmap card to the dashboard

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: Manual verification against a real Garmin account (hand off to the user)

This task has no code changes. It needs a real Garmin account and a browser, which per this project's own rules is something the user runs themselves, not something to automate.

- [ ] **Step 1: Confirm the real endpoint shape**
  - With the server running and a real Garmin login completed, find a real `activityId` (e.g. from the existing "Actividades recientes" card, or from `GET /api/activities`).
  - Call the new command directly: from `ai-skill-garmin/skills/garmin-connect/scripts/`, run `bun run garmin.ts activity-detail <realActivityId> --pretty` (with `GARMIN_EMAIL`/`GARMIN_PASSWORD` set, or relying on the already-cached `~/.config/garmin-api/tokens.json` from a prior login).
  - Expected: a `{ "activityId": "...", "points": [...] }` output with a non-empty `points` array for an outdoor activity (running/cycling/hiking). If `points` is empty for an activity you know has GPS, `extractPolyline`'s assumed field path (`geoPolylineDTO.polyline`) is wrong — inspect the real JSON Garmin returned (drop the `--pretty` output to a file and look at it) and fix `extractPolyline` in `garmin.ts` accordingly.

- [ ] **Step 2: End-to-end check in the dashboard**
  - Pick a real date range with known outdoor activities in the new "Mapa de entrenamientos" card.
  - Expected: the map renders with a heat glow over the real routes you trained.

- [ ] **Step 3: Mixed data check**
  - Pick a range that includes at least one indoor activity (e.g. strength training) alongside outdoor ones.
  - Expected: the indoor activity contributes nothing to the map (no error, no gap in the loading sequence) — confirmed by the total activity count in any warning banner matching what you expect, with no unexplained "skipped" count for an activity you know just has no GPS (that's not a failure, it's `points: []`, which is different from the `skippedCount` failure counter).

- [ ] **Step 4: Cap and failure-counter check**
  - Pick a range with more than 200 activities if you have that much history, or temporarily lower `MAX_ACTIVITIES` in `client/src/services/heatmapData.js` to something small (e.g. `3`) to force the truncation banner to appear, then revert it.
  - Expected: the "mostrando un máximo de N actividades" banner appears exactly when `activitiesCount >= MAX_ACTIVITIES`, and never otherwise.
