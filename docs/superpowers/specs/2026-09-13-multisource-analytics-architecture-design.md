# Multisource Analytics Architecture Design

Date: 2026-09-13
Status: Proposed / user-approved direction
Repository: `legongoraek/dashboard-garmin`

## 1. Context

`dashboard-garmin` currently provides a working Garmin-focused dashboard with daily summaries, sleep, HRV, training readiness, recent activities, weekly summaries, and a GPS training heatmap. The current integration is implemented through the existing Garmin Connect skill/CLI flow and exposes data to the React client through an Express API.

The new goal is to evolve the project from a Garmin-specific dashboard into a provider-agnostic sports analytics platform while preserving the existing Garmin flow during the transition. The system should eventually support Garmin, Strava, FIT, GPX, and Komoot GPX without forcing the UI or analytics layer to understand provider-specific payloads.

The approved strategy is incremental migration rather than a full rewrite.

## 2. Goals

The architecture must:

- Preserve the current Garmin dashboard and heatmap while new layers are introduced.
- Decouple analytics and UI code from Garmin-specific field names and payload shapes.
- Introduce a canonical data model for activities, health summaries, samples, and GPS tracks.
- Support historical trends across configurable ranges such as 7 days, 4 weeks, 12 weeks, 6 months, one year, and year-over-year comparisons.
- Enable future ingestion from Strava, FIT, GPX, Komoot GPX, and the official Garmin Developer Program without redesigning the UI.
- Keep provenance so every canonical field can be traced back to its source.
- Preserve nullability and source quality rather than converting absent measurements to zero.
- Make future deduplication of the same activity across multiple sources possible.
- Keep the existing Leaflet heatmap while allowing richer geospatial capabilities later.
- Provide a path from browser cache to PostgreSQL/PostGIS without requiring that infrastructure immediately.

## 3. Non-goals for the first implementation cycle

The first implementation cycle will not:

- Replace the existing Garmin Connect integration.
- Add PostgreSQL/PostGIS yet.
- Add Strava OAuth yet.
- Add the official Garmin Developer Program integration yet.
- Add FIT or GPX file upload yet.
- Implement medical interpretation or clinical recommendations.
- Add a full AI coach.
- Build InfluxDB or another time-series database.

These remain later phases after the canonical layer is proven with the current Garmin source.

## 4. Current architecture

Current flow:

```text
Garmin Connect
      ↓
ai-skill-garmin / garmin.ts
      ↓
server/garminService.js
      ↓
Express endpoints
      ↓
client/src/services/garminApi.js
      ↓
React dashboard
      ↓
localStorage response cache
```

The current integration is useful and already validated with real Garmin data. However, provider-specific fields currently flow directly into the UI, which makes future multisource analytics difficult.

The existing Garmin flow therefore becomes the first provider adapter rather than being removed.

## 5. Target architecture

```text
                        ┌────────────────────────┐
                        │ Garmin Connect Adapter │
                        │      (existing)        │
                        └───────────┬────────────┘
                                    │
             ┌──────────────────────┼──────────────────────┐
             │                      │                      │
             ▼                      ▼                      ▼
      Strava Adapter          FIT Import Adapter     GPX Import Adapter
        (future)                 (future)               (future)
             │                      │                      │
             └──────────────────────┼──────────────────────┘
                                    ▼
                         Canonical Normalization
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
          Activity               Samples             TrackPoints
              │                     │                     │
              └─────────────────────┼─────────────────────┘
                                    ▼
                           Analytics Engine
                                    │
             ┌──────────────────────┼──────────────────────┐
             ▼                      ▼                      ▼
           Trends               Recovery                  Geo
                                    │
                                    ▼
                              React Dashboard
```

Provider adapters own translation from raw provider payloads into canonical objects. The rest of the application consumes only canonical models.

## 6. Canonical model

### 6.1 Activity

```ts
interface CanonicalActivity {
  activityUid: string;
  source: "garmin" | "strava" | "fit" | "gpx" | "komoot";
  sourceActivityId: string | null;
  activityTypeRaw: string | null;
  activityTypeNorm:
    | "run"
    | "ride"
    | "walk"
    | "hike"
    | "swim"
    | "strength"
    | "other";
  name: string | null;
  startedAtUtc: string | null;
  startedAtLocal: string | null;
  timezone: string | null;
  durationS: number | null;
  movingTimeS: number | null;
  distanceM: number | null;
  elevationGainM: number | null;
  avgHeartRateBpm: number | null;
  maxHeartRateBpm: number | null;
  avgCadenceRpm: number | null;
  avgPowerW: number | null;
  avgSpeedMps: number | null;
  caloriesKcal: number | null;
  deviceManufacturer: string | null;
  deviceModel: string | null;
  sourceQualityFlags: string[];
}
```

### 6.2 Daily health

```ts
interface CanonicalDailyHealth {
  dateLocal: string;
  source: string;
  steps: number | null;
  totalCaloriesKcal: number | null;
  activeCaloriesKcal: number | null;
  distanceM: number | null;
  restingHeartRateBpm: number | null;
  maxHeartRateBpm: number | null;
  averageStress: number | null;
  bodyBatteryCurrent: number | null;
  bodyBatteryHigh: number | null;
  bodyBatteryLow: number | null;
  moderateIntensityMinutes: number | null;
  vigorousIntensityMinutes: number | null;
}
```

### 6.3 Sleep

```ts
interface CanonicalSleep {
  dateLocal: string;
  source: string;
  totalSleepS: number | null;
  deepSleepS: number | null;
  lightSleepS: number | null;
  remSleepS: number | null;
  awakeS: number | null;
  sleepScore: number | null;
  startLocal: string | null;
  endLocal: string | null;
}
```

### 6.4 Recovery

```ts
interface CanonicalRecovery {
  dateLocal: string;
  source: string;
  hrvMs: number | null;
  hrvStatus: string | null;
  readinessScore: number | null;
  readinessLabel: string | null;
  restingHeartRateBpm: number | null;
  bodyBattery: number | null;
  stress: number | null;
  sleepScore: number | null;
}
```

### 6.5 Sample

```ts
interface CanonicalSample {
  activityUid: string;
  tOffsetS: number | null;
  timestampUtc: string | null;
  distanceM: number | null;
  speedMps: number | null;
  heartRateBpm: number | null;
  cadenceRpm: number | null;
  powerW: number | null;
  altitudeM: number | null;
  temperatureC: number | null;
  sourceQualityFlags: string[];
}
```

### 6.6 Track point

```ts
interface CanonicalTrackPoint {
  activityUid: string;
  sequence: number;
  timestampUtc: string | null;
  latitude: number;
  longitude: number;
  altitudeM: number | null;
  distanceM: number | null;
}
```

## 7. Garmin adapter

The first adapter wraps the existing Garmin source.

Proposed boundary:

```text
raw Garmin payload
      ↓
GarminNormalizer
      ↓
CanonicalActivity / CanonicalDailyHealth / CanonicalSleep / CanonicalRecovery
```

The React dashboard should no longer directly read fields such as:

```text
totalDistanceMeters
bodyBatteryMostRecentValue
dailySleepDTO.sleepTimeSeconds
activity.activityType.typeKey
```

Instead the adapter translates them once into canonical names.

Example:

```text
Garmin totalDistanceMeters   → distanceM
Garmin totalKilocalories     → totalCaloriesKcal
Garmin restingHeartRate      → restingHeartRateBpm
Garmin activityId            → sourceActivityId
Garmin startTimeGMT          → startedAtUtc
Garmin startTimeLocal        → startedAtLocal
```

This adapter is intentionally independent of how Garmin is authenticated. A future official Garmin provider can produce the same canonical models.

## 8. Analytics engine

Analytics functions must be pure whenever possible: given canonical data, return derived datasets without performing network requests or mutating provider responses.

Initial analytics:

### Activity trends

- activity count per week
- distance per week
- duration per week
- elevation per week
- calories per week
- distance by sport
- duration by sport

### Recovery trends

- resting HR trend
- HRV trend
- sleep duration trend
- sleep score trend
- stress trend
- Body Battery trend
- readiness trend

### Rolling periods

Supported periods:

- 7 days
- 4 weeks
- 12 weeks
- 6 months
- 1 year
- year over year

Derived series should support rolling averages without replacing raw values.

Example:

```text
hrvRaw
hrv7dAverage
hrv28dAverage
```

Missing values remain `null`. A missing HR measurement must never become `0 bpm`.

## 9. Frontend design

The dashboard becomes section-based rather than a single long data summary.

### Overview

Current-day cards remain available:

- steps
- sleep
- HRV
- readiness
- Body Battery
- resting HR

### Training trends

Charts:

- weekly distance
- weekly duration
- weekly activities
- weekly elevation

### Recovery

Charts:

- HRV
- resting HR
- sleep
- stress
- Body Battery
- readiness

### Activity explorer

Later route:

```text
/activities/:id
```

It will display:

- canonical metadata
- route map
- elevation
- HR
- speed/pace
- cadence
- power
- laps/splits when available

### Geo

The existing heatmap remains. Later additions can include:

- single activity route
- sport/date filters
- frequently used routes
- density by period
- privacy-zone filtering

## 10. Charting

The repository already includes Recharts, so the first analytics implementation should use it rather than introduce another chart library.

Reusable components:

```text
TrendLineChart
MetricAreaChart
WeeklyVolumeChart
RecoveryTrendChart
SportDistributionChart
```

Charts receive canonical datasets only.

No provider-specific parsing belongs inside chart components.

## 11. Cache and persistence strategy

### Phase 1

Continue using the current browser cache for network response optimization, but treat it strictly as cache rather than canonical persistence.

Canonical datasets can initially be derived in memory from provider responses.

### Phase 2

Introduce a persistent analytics store when history or multisource ingestion requires it.

Preferred target:

```text
PostgreSQL + PostGIS
```

Suggested logical entities:

```text
activities
activity_sources
activity_samples
activity_track_points
daily_health
sleep
recovery_metrics
raw_objects
consents
```

InfluxDB is intentionally deferred unless future sample volume proves PostgreSQL insufficient.

## 12. Provenance and deduplication

Every canonical activity keeps its origin:

```text
source
sourceActivityId
```

When multisource is introduced, a logical activity can link to multiple source records:

```text
CanonicalActivity
    ├─ Garmin source
    ├─ Strava source
    └─ GPX source
```

A future deduplication fingerprint can use:

```text
user
start time bucket
duration bucket
distance bucket
normalized activity type
```

The duplicate source record should not be discarded automatically. Provider-specific evidence remains available.

## 13. GPS and track fidelity

The current heatmap uses reduced activity-detail points to keep browser cache size manageable. Those reduced tracks remain appropriate for visualization but must not become the canonical high-fidelity representation for future calculations.

Future FIT or provider-stream ingestion should preserve the original track/sample density separately from display simplification.

Conceptually:

```text
raw track
   ↓
canonical high-fidelity track
   ↓
visual simplification
   ↓
map/heatmap
```

Distance, elevation, speed, and similar calculations should use the best available canonical source rather than a display-decimated polyline.

## 14. Time handling

The canonical layer must distinguish:

```text
startedAtUtc
startedAtLocal
timezone
```

Samples should use UTC internally where possible.

Daily, weekly, and monthly aggregation should use the athlete's local date so sessions close to midnight are assigned to the expected training day.

## 15. Privacy and security

The architecture must assume HR, HRV, sleep, recovery metrics, and exact GPS tracks are sensitive user data.

Requirements:

- private authenticated dashboard remains non-indexable
- no secrets inside frontend source
- provider tokens must remain outside ordinary UI state
- exact GPS should never be exposed through the public landing page
- future public/group maps require privacy-zone filtering or spatial aggregation
- raw source payloads and derived data must remain traceable for deletion workflows
- future multisource OAuth integrations use minimum scopes
- AI processing, if later added, must be opt-in and independently configurable

The current Garmin integration is preserved for the personal dashboard, but it is explicitly treated as a legacy provider boundary rather than the long-term multiuser authentication architecture.

## 16. Error handling

Provider failures should be translated at the adapter/service boundary.

Canonical analytics and visualization code must not need to know about provider-specific error strings.

Categories:

```text
AUTH_REQUIRED
RATE_LIMITED
SOURCE_UNAVAILABLE
MISSING_DATA
INVALID_SOURCE_DATA
PARTIAL_ACTIVITY
```

Partial data is not necessarily an error. For example, an activity without power should remain a valid activity with `avgPowerW = null`.

## 17. Testing strategy

### Normalizer tests

Fixtures for current Garmin responses should verify field mapping and null behavior.

### Analytics tests

Pure deterministic tests for:

- weekly aggregation
- rolling averages
- null handling
- local-date grouping
- sport grouping

### Component tests

Charts should verify:

- empty state
- partial data
- expected axis/metric selection
- period changes

### Regression tests

Existing session/cache/heatmap functionality must remain functional throughout the migration.

## 18. Implementation sequence

The implementation should be divided into independent increments.

### Phase 1 — Canonical core

Create canonical types/models and Garmin normalization functions.

Success condition: existing Garmin payloads can be converted to canonical data without UI changes yet.

### Phase 2 — Analytics functions

Create pure aggregation and trend functions using canonical data.

Success condition: canonical fixtures produce validated weekly and recovery datasets.

### Phase 3 — Trends UI

Add reusable Recharts components and period controls.

Success condition: dashboard displays real historical Garmin trend charts while current cards/table/heatmap still work.

### Phase 4 — Activity explorer

Add canonical activity detail and route/metric visualization.

### Phase 5 — Persistent analytics store

Introduce PostgreSQL/PostGIS only when historical volume, multisource ingestion, or server-side aggregation requires it.

### Phase 6 — Additional providers

Add Strava, FIT, GPX, and Komoot GPX through the same adapter contract.

### Phase 7 — Official Garmin provider

When Garmin Developer Program access is available, add it as another provider implementation without changing canonical consumers.

## 19. First implementation scope

The first implementation plan should cover only Phases 1–3:

```text
Canonical models
     ↓
Garmin normalizer
     ↓
Analytics functions
     ↓
Historical trends
     ↓
Recharts dashboard components
```

It should not add infrastructure or another data provider yet.

This keeps the first change reviewable, independently testable, and useful immediately.

## 20. Acceptance criteria for the first implementation scope

The first implementation scope is complete when:

1. The existing Garmin login/session flow still works unchanged.
2. Existing daily, sleep, HRV, readiness, activities, weekly, and heatmap features continue to work.
3. Garmin responses are converted through reusable normalization functions.
4. At least activity, daily health, sleep, and recovery canonical structures are covered by tests.
5. Weekly distance, duration, activity count, and recovery trends are derived from canonical inputs.
6. Trend components use Recharts and do not access Garmin-specific field names.
7. The user can switch among at least 7-day, 4-week, 12-week, 6-month, and 1-year views when sufficient source data is available.
8. Missing source values remain missing rather than being silently converted to zero.
9. Existing heatmap behavior is not regressed.
10. No PostgreSQL, Strava, FIT, or GPX dependency is required for this first scope.

## 21. Future extension contract

A new source must satisfy the same conceptual contract:

```ts
interface ActivityProvider {
  listActivities(range): Promise<CanonicalActivity[]>;
  getActivity(id): Promise<CanonicalActivity>;
  getSamples?(id): Promise<CanonicalSample[]>;
  getTrack?(id): Promise<CanonicalTrackPoint[]>;
}
```

Health-capable sources may additionally implement:

```ts
interface HealthProvider {
  getDailyHealth(date): Promise<CanonicalDailyHealth | null>;
  getSleep(date): Promise<CanonicalSleep | null>;
  getRecovery(date): Promise<CanonicalRecovery | null>;
}
```

This is the principal architectural boundary of the project going forward.

## 22. Decision summary

Chosen approach: incremental multisource architecture.

Key decisions:

- Keep the working Garmin source.
- Wrap it behind a provider/normalizer boundary.
- Introduce canonical models before adding more providers.
- Build trends from canonical data.
- Use existing Recharts and Leaflet dependencies.
- Keep localStorage as cache only.
- Defer PostgreSQL/PostGIS until historical or multisource requirements justify it.
- Treat the current direct Garmin Connect flow as a legacy provider implementation, not the long-term multiuser integration model.
- Preserve source provenance, null semantics, raw fidelity, and future deduplication capability from the start.
