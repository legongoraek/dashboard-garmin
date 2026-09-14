# Complete Multisource Platform Implementation Plan

Date: 2026-09-14
Base: `main`
Execution: direct to `main` by explicit user request.

## Goal

Complete the remaining architecture phases after canonical analytics/trends: Activity Explorer, persistence foundation, additional provider adapters/imports, and official Garmin readiness without breaking the existing Garmin Connect flow.

## External blockers that must not be fabricated

- Strava live OAuth requires `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, redirect configuration, and user authorization.
- Garmin Connect Developer Program Activity/Health APIs require Garmin approval and issued credentials.
- PostgreSQL/PostGIS production persistence requires `DATABASE_URL` and a provisioned database.

Implementation must continue around those blockers. Provider contracts, normalizers, importers, SQL schema, configuration/readiness checks, and UI affordances can be completed without secrets.

## Phase 4 — Activity Explorer

1. Extend canonical activity-detail contracts with samples and track points.
2. Normalize the existing Garmin `activity-detail` response into canonical detail data.
3. Add pure metric-series helpers with null-safe handling.
4. Add `/activities/:id` protected route.
5. Add Activity Explorer page with canonical metadata, route map, elevation, HR, speed/pace, cadence and power charts when available.
6. Link recent activities to the explorer.
7. Keep current heatmap path unchanged.

## Phase 5 — Persistence foundation

1. Add provider-agnostic repository contract.
2. Add browser IndexedDB persistence for imported/canonical activities as the zero-infrastructure default.
3. Add PostgreSQL/PostGIS migration SQL for future server persistence (`activities`, `activity_sources`, `activity_samples`, `activity_track_points`, `daily_health`, `sleep`, `recovery_metrics`, `raw_objects`, `consents`).
4. Add persistence capability/readiness metadata; do not require a database for the existing dashboard.
5. Document `DATABASE_URL` as the activation blocker for production server persistence.

## Phase 6 — Additional providers

### Provider contract
- `ActivityProvider` interface/capability description.
- Shared provider registry.

### GPX / Komoot GPX
- Browser-native GPX parser/importer.
- Preserve source metadata and track points.
- Komoot GPX uses the same GPX importer with `source=komoot` when selected by the user.

### FIT
- Use official `@garmin/fitsdk` package.
- Decode activity/session/record messages into canonical activity, samples and track points.
- Keep raw FIT file local unless persistence is explicitly enabled.

### Strava
- Add Strava normalizer for activity summaries and streams.
- Add server-side OAuth/readiness module and API client using current V3 base URL.
- Live activation remains disabled until Strava credentials are configured and the user authorizes access.

## Phase 7 — Official Garmin provider

1. Add provider capability/readiness module for Garmin Activity API + Health API.
2. Add official-Garmin normalizer boundary targeting the same canonical model.
3. Keep the current Garmin Connect adapter as legacy/personal default.
4. Do not pretend live official Garmin access exists until Developer Program approval/credentials are present.

## Validation

- Canonical/provider/importer functions have Node tests where browser APIs are not required.
- Existing analytics boundary test remains green conceptually: chart components never parse provider payloads.
- Public landing/login/dashboard routing remains unchanged except protected Activity Explorer route.
- No credentials committed.
- Existing Garmin heatmap remains untouched.
- Main remains deployable without Strava/Garmin official/Postgres configuration.
