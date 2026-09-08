# Training heatmap (first slice of a Baseline-style visual dashboard)

Date: 2026-09-08
Status: Approved for planning

## Problem / motivation

The user wants to bring ideas from two reference products into this personal Garmin dashboard:

- [athletedata.health](https://athletedata.health) — a proactive AI coach that texts you based on your training/recovery data.
- [baselineathlete.com](https://baselineathlete.com) — a visual dashboard: a heatmap of every place you've trained, a critical pace curve, CTL/ATL/TSB training load, and a recovery-vs-performance correlation view.

These are two independent subsystems (a visual data dashboard vs. an LLM-driven coach) plus a third, unrelated axis (which specific chart/feature). Per the brainstorming process, this got decomposed rather than speced as one giant project:

1. **This spec**: the Baseline-style visual dashboard, starting with its most concrete, most-requested piece — a heatmap of training locations.
2. Deferred, separate future specs: the rest of the Baseline-style visuals (critical pace curve, training load, recovery correlation) and the athletedata-style AI coach (needs an LLM integration decision that doesn't belong in this spec).

## Goal

Show a heatmap of every GPS-tracked location the user has trained in, for a date range they pick, inside the existing dashboard (same page, same visual language — this is not a new product, it's a card in an app that already has one).

## Non-goals (this spec only)

- Training load (CTL/ATL/TSB), critical pace curve, recovery-vs-performance correlation — separate future specs.
- Any AI/LLM-generated insight or coaching — separate future spec, needs its own decision on which LLM/API and its cost.
- Automatically loading "all-time" history — the user explicitly chose a manual date-range picker over an automatic window, to keep the number of Garmin API calls (and therefore load time) under the user's own control.
- Any change to `garmin.ts`'s existing commands (`daily`, `sleep`, `hrv`, `readiness`, `training`, `activities`, `weekly`, `login`, `whoami`) — this spec only *adds* a new one.

## Architecture

Garmin's activity-list endpoint (already used by `getActivities`) never included GPS coordinates — confirmed by reading `ai-skill-garmin/skills/garmin-connect/scripts/garmin.ts` in full: no field in `activities()`'s response touches location data, matching `references/endpoints.md`'s documented field list for that endpoint. GPS lives in a separate, per-activity **detail** endpoint that this codebase has never called before. This spec adds a new `garmin.ts` command, `activity-detail`, for it — the black-box precedent from earlier specs bends here because there is no other source for this data; the sibling repo is being extended, not replaced or worked around.

```
Client (per activity, sequential)                 Server                         garmin.ts (new)
┌─────────────────────────────┐                    ┌──────────────────┐          ┌──────────────────────────┐
│ TrainingHeatmap.jsx          │                    │                    │          │ activity-detail <id>      │
│  date range picker           │                    │                    │          │  GET .../activity/{id}/   │
│  "Cargar" button              │                    │                    │          │      details              │
│                               │  GET /api/activities                    │          │  extract geoPolylineDTO.  │
│ heatmapData.js                │─────────────────▶ │ index.js           │          │  polyline, downsample to  │
│  1. getActivities(from,to)    │                    │  (existing route)  │          │  <=500 points              │
│  2. for each activity:         │  GET /api/activity-detail?activityId=X │          │  output {activityId,      │
│     await getActivityDetail    │─────────────────▶ │ (new route)        │────────▶ │   points:[{lat,lon}]}      │
│     accumulate [lat,lon]       │ ◀───────────────── │  same cookie       │ ◀──────── └──────────────────────────┘
│     onProgress(i, total)       │                    │  session pattern   │
│                               │                    │  as every other    │
│  cache: PERMANENT_TTL_MS       │                    │  route             │
│  (an activity's GPS track      │                    └──────────────────┘
│   never changes once           │
│   recorded)                    │
│                               │
│  react-leaflet MapContainer   │
│   + leaflet.heat heat layer   │
└─────────────────────────────┘
```

### Why sequential, not parallel, per-activity fetching

The previous branch's final review found a real bug: the dashboard's existing parallel requests (7 read endpoints firing at once on page load) raced the server's per-request disk write of the session token file. A heatmap over a busy month can mean fetching 30-100+ activity details. Firing all of them in parallel would multiply that exact class of risk (many concurrent `execFile` calls spawning `bun` processes, all writing/reading the same `tokens.json`) for zero real benefit in a single-user hobby app where a few extra seconds of sequential loading is a non-issue. Sequential fetching, with a progress indicator ("cargando actividad 5 de 40"), is the deliberately lazy, safer choice here.

### Garmin endpoint assumption — the one real unknown

`GET /activity-service/activity/{activityId}/details` is documented across widely-used community Garmin Connect reverse-engineering projects (e.g. `python-garminconnect`, `GarminDB`) as returning a `geoPolylineDTO.polyline` array of `{lat, lon, ...}` points. This project has no way to verify the exact field names without a live Garmin account and a real activity ID — flagged explicitly, verified in the manual-testing task, isolated to one small parsing function (`extractPolyline`) that's cheap to patch if the real shape differs.

## `garmin.ts` changes (new command, existing file's own conventions)

Add to the `Api` interface (`ai-skill-garmin/skills/garmin-connect/scripts/garmin.ts`, near the existing interface):

```ts
interface Api {
  displayName: string;
  daily: (date: string) => Promise<any>;
  sleep: (date: string) => Promise<any>;
  hrv: (date: string) => Promise<any>;
  readiness: (date: string) => Promise<any>;
  training: (date: string) => Promise<any>;
  activities: (fromDate: string, toDate: string, limit?: number) => Promise<any[]>;
  activityDetail: (activityId: string, maxPoints?: number) => Promise<{ activityId: string; points: { lat: number; lon: number }[] }>;
}
```

Add two small helpers near `apiGet` (same file, "API calls" section):

```ts
function extractPolyline(detail: any): { lat: number; lon: number }[] {
  const raw = detail?.geoPolylineDTO?.polyline;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p: any) => typeof p?.lat === 'number' && typeof p?.lon === 'number')
    .map((p: any) => ({ lat: p.lat, lon: p.lon }));
}

function downsamplePoints(points: { lat: number; lon: number }[], max: number): { lat: number; lon: number }[] {
  if (points.length <= max) return points;
  const stride = Math.ceil(points.length / max);
  return points.filter((_, i) => i % stride === 0);
}
```

Add to `makeApi()`'s returned object (same file, alongside `activities`):

```ts
    activityDetail: async (activityId, maxPoints = 500) => {
      const detail = await apiGet<any>(`/activity-service/activity/${activityId}/details`, session.oauth2);
      const points = downsamplePoints(extractPolyline(detail), maxPoints);
      return { activityId, points };
    },
```

Add a CLI case (same file, `main()`'s `switch (sub)`, alongside `case 'activities'`):

```ts
    case 'activity-detail': {
      const activityId = argv[1];
      if (!activityId) throw new Error('activity-detail requires <activityId>');
      const maxPoints = parseInt(parseFlag(argv, 'max-points') ?? '500', 10);
      output(await api.activityDetail(activityId, maxPoints), pretty);
      return;
    }
```

Add one line to `printHelp()`'s "Single-date queries" or a new small section:

```
Per-activity queries:
  activity-detail <activityId> [--max-points N]   GPS points for one activity (default max 500)
```

This command is reached the same way every other data command is (`getSession()` runs first via `main()`'s existing flow before the `switch`), so it inherits the exact same session-refresh behavior as `daily`/`sleep`/etc. — no new auth logic needed.

**Note on committing this change:** `ai-skill-garmin` is a separate git repository (cloned into this project, gitignored from `dashboard-garmin`'s own history). This change is committed there, not in `dashboard-garmin`.

## Server changes (`server/`)

`server/garminService.js` — add one function, following the exact pattern every other read function already uses:

```js
export async function getActivityDetail(activityId, incomingTokens) {
  return runGarminCommand(["activity-detail", activityId, "--pretty"], {}, incomingTokens);
}
```

`server/index.js` — import it alongside the others, add one route following the exact `{tokens, ...body}` pattern every route already uses:

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

No new session/caching infrastructure — this reuses everything Tasks 1-5 of the previous plan already built.

## Client changes (`client/`)

### `client/src/services/cache.js` — one new export

An activity's GPS track never changes once recorded (unlike "today's" data, which is why `ttlForDate` exists at all) — it deserves a longer TTL than the existing 30-day `LONG_TTL_MS`:

```js
export const PERMANENT_TTL_MS = 365 * 24 * 60 * 60 * 1000;
```

### `client/src/services/garminApi.js` — one new function

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

### New file: `client/src/services/heatmapData.js`

Owns the sequential-fetch-and-accumulate logic, kept out of the already-sizeable `DashboardPage.jsx`:

```js
import { getActivities, getActivityDetail } from "./garminApi";

export const MAX_ACTIVITIES = 200;

export async function loadHeatmapPoints({ from, to }, onProgress) {
  const activitiesResponse = await getActivities({ from, to, limit: MAX_ACTIVITIES });
  const activities = (activitiesResponse.data ?? []).filter((a) => a.activityId);

  const points = [];
  let skippedCount = 0;

  for (let i = 0; i < activities.length; i++) {
    const activity = activities[i];

    try {
      const detail = await getActivityDetail(activity.activityId);
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

A single activity's fetch failure only increments `skippedCount` — it never aborts the rest of the range, matching this project's established "degrade, don't fail the whole thing" posture.

### New file: `client/src/components/TrainingHeatmap.jsx`

A presentational component following `RecentActivities.jsx`'s existing shape (a `Card`, props for data/loading/error passed down, no data-fetching of its own — `DashboardPage.jsx` owns that, same as every other section). Two new dependencies: `leaflet`, `react-leaflet`, `leaflet.heat` (all free, no API key — OpenStreetMap tiles).

```jsx
import { useEffect, useState } from "react";
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

### `client/src/pages/DashboardPage.jsx` — wiring

New state (`heatmapFrom`, `heatmapTo`, `heatmapLoading`, `heatmapProgress`, `heatmapError`, `heatmapResult`), a handler that calls `loadHeatmapPoints` and updates that state, and rendering `<TrainingHeatmap {...} />` as a new section alongside the existing cards. No changes to any existing state, handler, or section — purely additive.

## Error handling

- An activity with no GPS (e.g. an indoor strength session): `extractPolyline` returns `[]`, `points: []` in the response — no error, that activity simply contributes nothing to the heat layer.
- One activity's detail fetch fails (network blip, unexpected 4xx/5xx): caught per-iteration in `loadHeatmapPoints`, counted in `skippedCount`, the loop continues — never aborts the whole range for one bad activity.
- Empty range (no activities at all between `from`/`to`): a plain "no hay actividades en este rango" message, not an empty map.
- Range with `>= MAX_ACTIVITIES` (200) results: a visible note that the range may hold more than what's shown — never a silent truncation.
- Every failure mode here follows the same "degrade, never break the page" posture already established for every other endpoint in this codebase.

## Testing

`ai-skill-garmin`'s `extractPolyline`/`downsamplePoints`: pure functions, testable with a synthetic `geoPolylineDTO` payload — no live Garmin account needed for this part. (This sibling repo's own test setup, if any, is out of scope to establish here; a minimal inline check is enough — see the plan for the exact form.)

`server/garminService.js`: no dedicated test for `getActivityDetail`, matching every other function in this file (shells to a real external process, verified manually).

`client/src/services/heatmapData.js`: testable with `node:test` and a fake `getActivityDetail`/`getActivities` (dependency-injectable or mocked via the same patterns already used in `cache.test.js`) — covering: points accumulate across multiple activities, one failing activity is skipped without aborting the rest, `truncated` is set correctly at the `MAX_ACTIVITIES` boundary.

`client/src/components/TrainingHeatmap.jsx`: the map/heat-layer rendering itself needs a browser, not `node:test` — verified by a manual dev-server smoke check using **synthetic dummy coordinates** (no live Garmin account needed for this check): confirm the map renders, tiles load, and a heat layer appears for a hardcoded set of test points.

Manual verification requiring a real Garmin account (this is the one part nothing above can substitute for):
1. Real endpoint shape: call the new `activity-detail` command against a real activity ID, confirm `geoPolylineDTO.polyline` is indeed where the GPS points live — if not, `extractPolyline` is the one small function to fix.
2. End-to-end: pick a real date range with real activities, confirm the heatmap shows real routes.
3. The 200-activity cap and the per-activity failure counter both showing correctly under real, imperfect data (e.g. an indoor activity with no GPS in the mix).

## Rollout

1. Extend `garmin.ts` (separate repo, its own commit).
2. Add `getActivityDetail` to `garminService.js`, the new route to `index.js`.
3. Add `PERMANENT_TTL_MS` to `cache.js`, `getActivityDetail` to `garminApi.js`.
4. Add `leaflet`, `react-leaflet`, `leaflet.heat` to `client/package.json`.
5. Add `heatmapData.js`, `TrainingHeatmap.jsx`, wire into `DashboardPage.jsx`.
6. Automated tests + the dummy-coordinate manual smoke check, locally, before touching a real Garmin account.
7. Manual verification against a real account (see Testing above).

No new environment variables, no new external services, no new costs — consistent with everything decided so far in this project.

## Open questions / deferred

- Exact Garmin response shape for `activity-service/activity/{id}/details` — flagged above, resolved during manual testing.
- Heat layer visual tuning (radius/blur/gradient colors) — the values above (`radius: 20, blur: 15`, default gradient) are a reasonable starting point, not a final answer; adjust once real data is on screen and looks right or wrong.
- The rest of the Baseline-style dashboard (training load, critical pace curve, recovery correlation) and the athletedata-style AI coach are explicitly out of scope here — each gets its own spec when its turn comes.
