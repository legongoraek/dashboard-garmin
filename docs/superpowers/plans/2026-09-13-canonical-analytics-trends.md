# Canonical Analytics and Trends Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a source-agnostic canonical Garmin data boundary, pure analytics functions, and historical Recharts trends without breaking the existing Garmin dashboard, session flow, weekly summary, or heatmap.

**Architecture:** Keep `garminApi.js` as the transport/cache boundary, normalize Garmin payloads into small canonical objects in a new domain module, and derive chart-ready datasets through pure analytics functions. The first UI migration consumes those canonical datasets only for the new trends section; existing cards, weekly table, and heatmap remain operational while later tasks can migrate them incrementally.

**Tech Stack:** React 19, Vite 8, JavaScript ES modules, Node built-in test runner, MUI 9, Recharts 3.9, existing Axios/localStorage Garmin services.

**Spec:** `docs/superpowers/specs/2026-09-13-multisource-analytics-architecture-design.md`

## Global Constraints

- Preserve the existing Garmin Connect integration and authentication flow.
- Do not add PostgreSQL, PostGIS, InfluxDB, Strava OAuth, FIT upload, GPX upload, Komoot integration, or the official Garmin Developer Program in this plan.
- Missing provider values remain `null`; never coerce absent health or sensor measurements to zero.
- Provider-specific field names are allowed only at provider/normalizer boundaries, never inside reusable analytics or chart components.
- Keep raw Garmin responses untouched; normalization returns new objects.
- Keep the existing sequential heatmap detail loading and reduced display tracks unchanged.
- Recharts is the chart library for this implementation; add no second chart dependency.
- Daily aggregation uses the athlete-facing local date supplied by Garmin/weekly data; do not regroup days through UTC conversions.
- Existing public landing and authenticated-route behavior must remain unchanged.

---

## File Structure

Create focused domain files under `client/src/domain/analytics/` rather than expanding `DashboardPage.jsx` with more Garmin-specific parsing:

- `client/src/domain/analytics/canonical.js` — canonical constructors/default shapes and source constants.
- `client/src/domain/analytics/garminNormalizer.js` — Garmin-only field mapping into canonical activity, daily-health, sleep, and recovery objects.
- `client/src/domain/analytics/garminNormalizer.test.js` — provider mapping/nullability regression tests.
- `client/src/domain/analytics/trends.js` — pure weekly aggregation, recovery series, rolling averages, and period helpers.
- `client/src/domain/analytics/trends.test.js` — deterministic analytics tests.
- `client/src/services/trendsData.js` — orchestration that fetches existing Garmin endpoints sequentially and returns canonical historical datasets; no chart formatting.
- `client/src/services/trendsData.test.js` — orchestration/range/error tests with injected fetchers.
- `client/src/components/analytics/PeriodSelector.jsx` — 7d/4w/12w/6m/1y period selection.
- `client/src/components/analytics/TrendLineChart.jsx` — generic null-safe Recharts line chart.
- `client/src/components/analytics/WeeklyVolumeChart.jsx` — generic weekly bar chart for distance/duration/count/elevation.
- `client/src/components/analytics/TrainingTrends.jsx` — training trend section composed from canonical chart-ready data.
- `client/src/components/analytics/RecoveryTrends.jsx` — recovery trend section composed from canonical chart-ready data.
- `client/src/components/analytics/AnalyticsTrendsSection.jsx` — period state, loading/error state, and composition of both trend groups.
- `client/src/pages/DashboardPage.jsx` — mount the analytics section without rewriting existing summary/heatmap behavior.
- `client/package.json` — widen Node test glob so tests outside `src/services` execute.
- `.claude/ESTADO.md` — record the new canonical/trends architecture and current implementation state after verification.

---

### Task 1: Canonical Data Contracts and Garmin Normalizer

**Files:**
- Create: `client/src/domain/analytics/canonical.js`
- Create: `client/src/domain/analytics/garminNormalizer.js`
- Create: `client/src/domain/analytics/garminNormalizer.test.js`
- Modify: `client/package.json`

**Interfaces:**
- Consumes: raw values currently returned by `/api/daily`, `/api/sleep`, `/api/hrv`, `/api/readiness`, `/api/activities`, and items from `/api/weekly`.
- Produces: `createCanonicalActivity`, `createCanonicalDailyHealth`, `createCanonicalSleep`, `createCanonicalRecovery`, `normalizeGarminActivity`, `normalizeGarminDailyHealth`, `normalizeGarminSleep`, `normalizeGarminRecovery`, and `normalizeGarminWeeklyDay`.

- [ ] **Step 1: Expand the test command before adding domain tests**

Change the client test script to run every `*.test.js` under `src`:

```json
"test": "node --test src/**/*.test.js"
```

Run:

```bash
cd client && npm test
```

Expected: all existing cache, heatmap, routing, favicon, landing, and SEO tests pass.

- [ ] **Step 2: Write failing canonical normalizer tests**

Create `garminNormalizer.test.js` with fixtures that assert exact canonical field names and `null` behavior. Include at least these cases:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeGarminActivity,
  normalizeGarminDailyHealth,
  normalizeGarminSleep,
  normalizeGarminRecovery,
  normalizeGarminWeeklyDay,
} from "./garminNormalizer.js";

test("normalizes Garmin activity without mutating source", () => {
  const raw = {
    activityId: 42,
    activityName: "Morning Ride",
    activityType: { typeKey: "cycling" },
    startTimeGMT: "2026-09-13 12:00:00",
    startTimeLocal: "2026-09-13 06:00:00",
    duration: 3600,
    movingDuration: 3500,
    distance: 25000,
    elevationGain: 180,
    averageHR: 142,
    maxHR: 171,
    averageSpeed: 6.94,
    calories: 700,
  };
  const snapshot = structuredClone(raw);
  const result = normalizeGarminActivity(raw);

  assert.equal(result.source, "garmin");
  assert.equal(result.sourceActivityId, "42");
  assert.equal(result.activityTypeNorm, "ride");
  assert.equal(result.distanceM, 25000);
  assert.equal(result.avgHeartRateBpm, 142);
  assert.deepEqual(raw, snapshot);
});

test("preserves missing Garmin daily measurements as null", () => {
  const result = normalizeGarminDailyHealth({ calendarDate: "2026-09-13", totalSteps: 0 });
  assert.equal(result.dateLocal, "2026-09-13");
  assert.equal(result.steps, 0);
  assert.equal(result.restingHeartRateBpm, null);
  assert.equal(result.bodyBatteryCurrent, null);
});

test("normalizes nested Garmin sleep fields", () => {
  const result = normalizeGarminSleep({
    dailySleepDTO: {
      calendarDate: "2026-09-13",
      sleepTimeSeconds: 27000,
      deepSleepSeconds: 5400,
      lightSleepSeconds: 15000,
      remSleepSeconds: 5400,
      awakeSleepSeconds: 1200,
      sleepScores: { overall: { value: 84 } },
    },
  }, "2026-09-13");
  assert.equal(result.totalSleepS, 27000);
  assert.equal(result.sleepScore, 84);
});

test("combines HRV, readiness, daily and sleep into canonical recovery", () => {
  const result = normalizeGarminRecovery({
    dateLocal: "2026-09-13",
    hrv: { lastNightAvg: 52, status: "BALANCED" },
    readiness: { score: 76, level: "HIGH" },
    daily: { restingHeartRate: 48, bodyBatteryMostRecentValue: 72, averageStressLevel: 23 },
    sleep: { dailySleepDTO: { sleepScores: { overall: { value: 86 } } } },
  });
  assert.equal(result.hrvMs, 52);
  assert.equal(result.readinessScore, 76);
  assert.equal(result.sleepScore, 86);
});

test("normalizes one weekly day using its local date", () => {
  const result = normalizeGarminWeeklyDay({
    date: "2026-09-13",
    daily: { totalSteps: 10000, totalDistanceMeters: 8000 },
    sleep: { dailySleepDTO: { sleepTimeSeconds: 28000 } },
  });
  assert.equal(result.dateLocal, "2026-09-13");
  assert.equal(result.daily.distanceM, 8000);
  assert.equal(result.sleep.totalSleepS, 28000);
});
```

- [ ] **Step 3: Run the new test and confirm RED**

Run:

```bash
cd client && node --test src/domain/analytics/garminNormalizer.test.js
```

Expected: FAIL because `garminNormalizer.js` does not exist.

- [ ] **Step 4: Implement canonical constructors**

Create `canonical.js`. Constructors must copy supplied values over explicit nullable defaults. Activity UIDs for the current source use `garmin:<sourceActivityId>`; if an activity lacks an ID, use `garmin:unknown:<startedAtUtc-or-startedAtLocal-or-unknown>` only as an in-memory fallback and add `MISSING_SOURCE_ID` to `sourceQualityFlags`.

```js
export const CANONICAL_SOURCE = Object.freeze({ GARMIN: "garmin" });

export function createCanonicalDailyHealth(values = {}) {
  return {
    dateLocal: null,
    source: CANONICAL_SOURCE.GARMIN,
    steps: null,
    totalCaloriesKcal: null,
    activeCaloriesKcal: null,
    distanceM: null,
    restingHeartRateBpm: null,
    maxHeartRateBpm: null,
    averageStress: null,
    bodyBatteryCurrent: null,
    bodyBatteryHigh: null,
    bodyBatteryLow: null,
    moderateIntensityMinutes: null,
    vigorousIntensityMinutes: null,
    ...values,
  };
}
```

Implement equivalent explicit defaults for Activity, Sleep, and Recovery from the approved spec.

- [ ] **Step 5: Implement Garmin mapping with null-safe helpers**

In `garminNormalizer.js`, use helpers that distinguish `0` from missing values:

```js
function valueOrNull(value) {
  return value === undefined || value === null || value === "" ? null : value;
}

function firstPresent(...values) {
  return valueOrNull(values.find((value) => value !== undefined && value !== null && value !== ""));
}
```

Map known activity aliases defensively (`distance` and `distanceMeters`; `duration` and `durationSeconds`; HR aliases). Normalize sport keys with a small explicit map: running→run, cycling/biking→ride, walking→walk, hiking→hike, swimming→swim, strength_training/strength→strength, otherwise other. Do not guess units when a provider field is ambiguous; only map fields already known to be meters/seconds/mps from current payloads.

- [ ] **Step 6: Run normalizer tests and full suite**

Run:

```bash
cd client && node --test src/domain/analytics/garminNormalizer.test.js
cd client && npm test
cd client && npm run lint
```

Expected: all commands exit 0.

- [ ] **Step 7: Commit Task 1**

```bash
git add client/package.json client/src/domain/analytics/canonical.js client/src/domain/analytics/garminNormalizer.js client/src/domain/analytics/garminNormalizer.test.js
git commit -m "feat: add canonical Garmin analytics model"
```

---

### Task 2: Pure Trend and Rolling Analytics

**Files:**
- Create: `client/src/domain/analytics/trends.js`
- Create: `client/src/domain/analytics/trends.test.js`

**Interfaces:**
- Consumes: arrays of canonical activities, daily health, sleep, and recovery objects from Task 1.
- Produces: `PERIODS`, `getPeriodStartDate`, `aggregateActivitiesByWeek`, `buildRecoverySeries`, and `addRollingAverage`.

- [ ] **Step 1: Write failing analytics tests**

Cover weekly grouping, missing values, sport totals, rolling averages, and local-date behavior:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  aggregateActivitiesByWeek,
  buildRecoverySeries,
  addRollingAverage,
  getPeriodStartDate,
} from "./trends.js";

test("aggregates canonical activities into Monday-based local weeks", () => {
  const result = aggregateActivitiesByWeek([
    { activityUid: "garmin:1", startedAtLocal: "2026-09-07 07:00:00", activityTypeNorm: "run", distanceM: 5000, durationS: 1800, elevationGainM: 40 },
    { activityUid: "garmin:2", startedAtLocal: "2026-09-09 07:00:00", activityTypeNorm: "ride", distanceM: 20000, durationS: 3600, elevationGainM: 100 },
  ]);
  assert.deepEqual(result[0], {
    weekStart: "2026-09-07",
    activityCount: 2,
    distanceM: 25000,
    durationS: 5400,
    elevationGainM: 140,
  });
});

test("does not turn missing recovery values into zero", () => {
  const result = buildRecoverySeries([
    { dateLocal: "2026-09-12", hrvMs: null, restingHeartRateBpm: 49 },
  ]);
  assert.equal(result[0].hrvMs, null);
  assert.equal(result[0].restingHeartRateBpm, 49);
});

test("rolling average ignores null samples and remains null with no samples", () => {
  const result = addRollingAverage(
    [{ value: null }, { value: 10 }, { value: 20 }],
    "value",
    "avg2",
    2
  );
  assert.equal(result[0].avg2, null);
  assert.equal(result[1].avg2, 10);
  assert.equal(result[2].avg2, 15);
});

test("4w period returns 27 days before the inclusive end date", () => {
  assert.equal(getPeriodStartDate("2026-09-13", "4w"), "2026-08-17");
});
```

- [ ] **Step 2: Run analytics tests and confirm RED**

```bash
cd client && node --test src/domain/analytics/trends.test.js
```

Expected: FAIL because `trends.js` does not exist.

- [ ] **Step 3: Implement exact period definitions**

```js
export const PERIODS = Object.freeze({
  "7d": { label: "7 días", days: 7 },
  "4w": { label: "4 semanas", days: 28 },
  "12w": { label: "12 semanas", days: 84 },
  "6m": { label: "6 meses", months: 6 },
  "1y": { label: "1 año", years: 1 },
});
```

`getPeriodStartDate(endDate, key)` is inclusive: subtract `days - 1` for day periods and use calendar month/year subtraction for 6m/1y. Format as `YYYY-MM-DD` without UTC round-trips that can shift local dates.

- [ ] **Step 4: Implement weekly aggregation and recovery series**

`aggregateActivitiesByWeek()` must return chronological Monday-based buckets. Count every valid activity, but sum a metric only when its value is numeric. A bucket with activities but no elevation measurements must return `elevationGainM: null`, not zero; apply the same rule to distance and duration.

`buildRecoverySeries()` sorts by `dateLocal` and returns only canonical names:

```js
{
  dateLocal,
  hrvMs,
  restingHeartRateBpm,
  sleepScore,
  stress,
  bodyBattery,
  readinessScore,
}
```

- [ ] **Step 5: Implement immutable rolling averages**

`addRollingAverage(rows, valueKey, outputKey, windowSize)` returns new row objects. For each row, average numeric values in the inclusive trailing window and emit `null` if the window has no numeric samples.

- [ ] **Step 6: Run analytics tests and full quality gates**

```bash
cd client && node --test src/domain/analytics/trends.test.js
cd client && npm test
cd client && npm run lint
```

Expected: all pass.

- [ ] **Step 7: Commit Task 2**

```bash
git add client/src/domain/analytics/trends.js client/src/domain/analytics/trends.test.js
git commit -m "feat: add canonical trend analytics"
```

---

### Task 3: Historical Garmin Trend Loader

**Files:**
- Create: `client/src/services/trendsData.js`
- Create: `client/src/services/trendsData.test.js`

**Interfaces:**
- Consumes: existing `getActivities`, `getWeekly`, `getHrv`, and `getReadiness`; Task 1 normalizers; Task 2 analytics functions.
- Produces: `loadAnalyticsTrends({ endDate, period, api? }) -> Promise<{ period, from, to, weeklyActivity, recovery, partialErrors }>`.

- [ ] **Step 1: Write failing orchestration tests with injected API functions**

The test must not call Garmin. Inject deterministic functions:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { loadAnalyticsTrends } from "./trendsData.js";

test("loads canonical trend data for a requested period", async () => {
  const api = {
    getActivities: async () => ({ data: [{ activityId: 1, startTimeLocal: "2026-09-10 07:00:00", distance: 5000, duration: 1800 }] }),
    getWeekly: async () => ({ data: { days: [{ date: "2026-09-10", daily: { restingHeartRate: 49, averageStressLevel: 22, bodyBatteryMostRecentValue: 70 }, sleep: { dailySleepDTO: { sleepScores: { overall: { value: 85 } } } } }] } }),
    getHrv: async () => ({ data: { lastNightAvg: 55, status: "BALANCED" } }),
    getReadiness: async () => ({ data: { score: 78, level: "HIGH" } }),
  };

  const result = await loadAnalyticsTrends({ endDate: "2026-09-13", period: "7d", api });
  assert.equal(result.from, "2026-09-07");
  assert.equal(result.weeklyActivity[0].distanceM, 5000);
  assert.equal(result.recovery.find((row) => row.dateLocal === "2026-09-10").hrvMs, 55);
});
```

Add a second test where HRV throws and verify the loader still returns weekly activity plus `partialErrors` containing `{ source: "hrv", date: "...", message: "..." }`.

- [ ] **Step 2: Run loader tests and confirm RED**

```bash
cd client && node --test src/services/trendsData.test.js
```

Expected: FAIL because `trendsData.js` does not exist.

- [ ] **Step 3: Implement the loader without creating a request burst**

Default `api` imports existing Garmin API functions. Fetch activities once for `{ from, to, limit: 200 }`. For recovery history, iterate requested local dates sequentially. Prefer `getWeekly(date)` to obtain daily/sleep values in seven-day chunks; do not refetch daily and sleep separately when weekly already contains them. Fetch HRV/readiness sequentially for each date so the current Garmin source is not hit with a `Promise.all` burst.

Use an internal `Map` keyed by `dateLocal` to merge canonical daily/sleep/HRV/readiness into one recovery row. Deduplicate dates returned by overlapping weekly windows.

- [ ] **Step 4: Define partial-failure behavior**

A single unavailable HRV/readiness date must not discard the entire chart. Record partial failures and preserve `null` for missing measurements. Authentication errors and rate-limit errors are terminal for the loader: rethrow them so the UI shows one actionable error and stops further source calls.

Use the existing error payload/message patterns to detect terminal auth/rate-limit failures; do not parse those strings in chart components.

- [ ] **Step 5: Run loader and regression tests**

```bash
cd client && node --test src/services/trendsData.test.js
cd client && npm test
cd client && npm run lint
```

Expected: all pass and existing `heatmapData.test.js` still verifies sequential heatmap loading.

- [ ] **Step 6: Commit Task 3**

```bash
git add client/src/services/trendsData.js client/src/services/trendsData.test.js
git commit -m "feat: load historical Garmin analytics trends"
```

---

### Task 4: Reusable Recharts Components

**Files:**
- Create: `client/src/components/analytics/PeriodSelector.jsx`
- Create: `client/src/components/analytics/TrendLineChart.jsx`
- Create: `client/src/components/analytics/WeeklyVolumeChart.jsx`
- Create: `client/src/components/analytics/TrainingTrends.jsx`
- Create: `client/src/components/analytics/RecoveryTrends.jsx`

**Interfaces:**
- Consumes: Task 2/3 canonical chart datasets only.
- Produces: provider-agnostic presentation components; no network requests and no Garmin field names.

- [ ] **Step 1: Add a static architecture guard test before UI code**

Create `client/src/domain/analytics/chartBoundary.test.js` that reads the analytics component source files after they are created and fails if Garmin-specific payload names appear. Start with the expected file list and forbidden names:

```js
const forbidden = [
  "totalDistanceMeters",
  "totalKilocalories",
  "bodyBatteryMostRecentValue",
  "dailySleepDTO",
  "activityType.typeKey",
];
```

Before the files exist, the test should fail with `ENOENT`, proving RED.

- [ ] **Step 2: Implement `PeriodSelector`**

Use MUI `ToggleButtonGroup` with values `7d`, `4w`, `12w`, `6m`, `1y`. Props:

```js
PeriodSelector({ value, onChange, disabled = false })
```

Ignore deselection events where the next value is `null`.

- [ ] **Step 3: Implement null-safe generic charts**

`TrendLineChart` props:

```js
{
  title,
  data,
  xKey = "dateLocal",
  series: [{ key, label, unit }],
  height = 280,
}
```

Use `ResponsiveContainer`, `LineChart`, `CartesianGrid`, `XAxis`, `YAxis`, `Tooltip`, `Legend`, and one `Line` per series. Set `connectNulls={false}` so missing measurements remain visible as gaps.

`WeeklyVolumeChart` props:

```js
{ title, data, dataKey, label, unit, transformValue = (value) => value }
```

Map canonical values to display values before rendering; e.g. distance meters → kilometers and duration seconds → hours. Do not modify the input array.

- [ ] **Step 4: Compose training and recovery sections**

`TrainingTrends` renders four `WeeklyVolumeChart`s for `distanceM`, `durationS`, `activityCount`, and `elevationGainM`.

`RecoveryTrends` renders line charts for HRV, resting HR, sleep score, stress, Body Battery, and readiness. Keep raw series available; do not replace raw values with rolling averages.

Use the existing MUI card/layout conventions rather than introducing a new visual system.

- [ ] **Step 5: Run the boundary test, lint, and build**

```bash
cd client && node --test src/domain/analytics/chartBoundary.test.js
cd client && npm run lint
cd client && npm run build
```

Expected: boundary test passes; lint passes; Vite production build succeeds with Recharts bundled.

- [ ] **Step 6: Commit Task 4**

```bash
git add client/src/components/analytics client/src/domain/analytics/chartBoundary.test.js
git commit -m "feat: add reusable analytics trend charts"
```

---

### Task 5: Dashboard Analytics Section and Period Loading

**Files:**
- Create: `client/src/components/analytics/AnalyticsTrendsSection.jsx`
- Modify: `client/src/pages/DashboardPage.jsx`

**Interfaces:**
- Consumes: `loadAnalyticsTrends` from Task 3 and chart components from Task 4.
- Produces: an authenticated dashboard section with selectable historical periods and independent loading/error state.

- [ ] **Step 1: Implement the section with isolated state**

`AnalyticsTrendsSection` owns:

```js
const [period, setPeriod] = useState("4w");
const [data, setData] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
```

Props:

```js
AnalyticsTrendsSection({ endDate })
```

On `endDate` or period change, call `loadAnalyticsTrends({ endDate, period })`. Use an effect cancellation flag so a slower previous request cannot overwrite a newer selection.

- [ ] **Step 2: Render explicit states**

While loading, keep the previous successful chart data visible and show a MUI loading indicator/text. On terminal error, show `Alert severity="error"`. If `partialErrors.length > 0`, show a warning that some dates/metrics could not be loaded while still rendering available charts. Empty arrays render a neutral `No hay datos para este periodo` state rather than zero-filled charts.

- [ ] **Step 3: Mount it in `DashboardPage.jsx` without migrating existing cards**

Import:

```js
import AnalyticsTrendsSection from "../components/analytics/AnalyticsTrendsSection";
```

Place:

```jsx
<AnalyticsTrendsSection endDate={selectedDate} />
```

between the current weekly summary and training heatmap (or immediately after the weekly summary if that is the current composition order). Do not remove the current `WeeklySummary`, `RecentActivities`, daily cards, or `TrainingHeatmap` in this task.

- [ ] **Step 4: Verify no Garmin-specific parsing was added to chart files**

Run:

```bash
cd client && node --test src/domain/analytics/chartBoundary.test.js
```

Expected: PASS.

- [ ] **Step 5: Run full client gates**

```bash
cd client && npm test
cd client && npm run lint
cd client && npm run build
```

Expected: all pass.

- [ ] **Step 6: Manual authenticated smoke test**

Run the existing frontend/backend development commands and verify with the user performing their own Garmin login if authentication is needed. Check:

```text
- / remains the public landing page
- /login remains usable
- authenticated dashboard loads existing daily cards
- weekly summary still renders
- recent activities still render
- heatmap can still be loaded
- Analytics Trends defaults to 4 weeks
- switching 7d / 4w / 12w / 6m / 1y refreshes only the analytics section
- missing HRV/readiness values create chart gaps, not zeros
- selecting another dashboard date uses that date as the analytics period end
```

Do not enter or store the user's real Garmin password in automation.

- [ ] **Step 7: Commit Task 5**

```bash
git add client/src/components/analytics/AnalyticsTrendsSection.jsx client/src/pages/DashboardPage.jsx
git commit -m "feat: add historical analytics to dashboard"
```

---

### Task 6: Documentation, State Update, and Final Regression Verification

**Files:**
- Modify: `.claude/ESTADO.md`
- Optionally modify: `README.md` only if its feature list/architecture description would otherwise be inaccurate after Tasks 1–5.

**Interfaces:**
- Consumes: completed Tasks 1–5 and their verification output.
- Produces: current repository state documentation and final acceptance evidence.

- [ ] **Step 1: Update `.claude/ESTADO.md` with factual current state**

Record:

```text
- Canonical analytics layer implemented for Garmin
- Canonical objects: activity, daily health, sleep, recovery
- Historical periods: 7d, 4w, 12w, 6m, 1y
- Recharts trend section implemented
- Existing heatmap remains separate and sequential
- No PostgreSQL/PostGIS yet
- No Strava/FIT/GPX provider yet
- Current Garmin integration remains the legacy/personal provider boundary
```

Also correct stale statements that claim the Garmin rate-limit/MFA fix is uncommitted if the repository history confirms it is already present.

- [ ] **Step 2: Run the complete client verification suite from a clean install-compatible state**

Run:

```bash
cd client && npm test
cd client && npm run lint
cd client && npm run build
```

Expected: every command exits 0. Record actual test count and build result in the implementation handoff; do not invent counts in advance.

- [ ] **Step 3: Verify scope did not drift**

Run repository searches:

```bash
git grep -n -E "postgres|postgis|strava|komoot|\.fit|gpx" -- client/src || true
git grep -n -E "totalDistanceMeters|dailySleepDTO|bodyBatteryMostRecentValue" -- client/src/components/analytics || true
```

Expected: no new database/provider implementation in `client/src`; no Garmin payload names in analytics chart components. Documentation labels are acceptable outside executable source.

- [ ] **Step 4: Verify existing heatmap and routing files were not accidentally rewritten**

Review:

```bash
git diff HEAD~5 -- client/src/services/heatmapData.js client/src/components/TrainingHeatmap.jsx client/src/services/sessionRouting.js client/src/App.jsx
```

Expected: no unrelated changes from this feature.

- [ ] **Step 5: Commit documentation**

```bash
git add .claude/ESTADO.md README.md
git commit -m "docs: record canonical analytics rollout"
```

If `README.md` did not require a change, omit it from `git add`.

---

## Self-Review Results

- **Spec coverage:** Phases 1–3 of the approved spec are covered: canonical Activity/DailyHealth/Sleep/Recovery, Garmin normalization, null-safe analytics, historical periods, Recharts visualization, and regression protection. Sample/TrackPoint contracts remain design-level because the approved first implementation scope does not yet ingest high-fidelity samples/tracks; the existing heatmap remains untouched. Activity Explorer, persistence, additional providers, and official Garmin remain explicitly outside this plan.
- **Placeholder scan:** No implementation step depends on TBD/TODO or an unspecified error-handling instruction. Terminal vs partial source failure behavior is defined in Task 3.
- **Type/name consistency:** Canonical camelCase names match the approved spec. `loadAnalyticsTrends`, `weeklyActivity`, `recovery`, `partialErrors`, and period keys are used consistently across Tasks 2–5.
- **Risk control:** Historical source calls are intentionally sequential to respect the current Garmin integration's rate-limit/race behavior. The 6m/1y modes may be slower with the legacy source; that is acceptable for this first implementation and should be measured before adding concurrency or persistent storage.

## Acceptance Gate

The implementation is ready to move to the next architecture phase only when all of these are true:

1. Existing login/session behavior still works.
2. Existing daily, sleep, weekly, recent-activity, and heatmap views still work.
3. Canonical normalizer tests prove missing values stay `null` and legitimate zeros stay `0`.
4. Analytics tests prove local weekly grouping and rolling calculations.
5. Historical trends render from canonical fields only.
6. 7d, 4w, 12w, 6m, and 1y selections work.
7. Client tests, lint, and production build all pass.
8. No new database or additional provider was introduced during this scope.
