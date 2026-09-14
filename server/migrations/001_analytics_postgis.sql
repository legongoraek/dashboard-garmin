CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS activities (
  id BIGSERIAL PRIMARY KEY,
  activity_uid TEXT UNIQUE NOT NULL,
  activity_type_norm TEXT NOT NULL DEFAULT 'other',
  name TEXT,
  started_at_utc TIMESTAMPTZ,
  started_at_local TIMESTAMP,
  timezone TEXT,
  duration_s DOUBLE PRECISION,
  moving_time_s DOUBLE PRECISION,
  distance_m DOUBLE PRECISION,
  elevation_gain_m DOUBLE PRECISION,
  avg_heart_rate_bpm DOUBLE PRECISION,
  max_heart_rate_bpm DOUBLE PRECISION,
  avg_cadence_rpm DOUBLE PRECISION,
  avg_power_w DOUBLE PRECISION,
  avg_speed_mps DOUBLE PRECISION,
  calories_kcal DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_sources (
  id BIGSERIAL PRIMARY KEY,
  activity_id BIGINT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  source_activity_id TEXT,
  source_quality_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_object_id BIGINT,
  UNIQUE(source, source_activity_id)
);

CREATE TABLE IF NOT EXISTS activity_samples (
  id BIGSERIAL PRIMARY KEY,
  activity_id BIGINT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  t_offset_s DOUBLE PRECISION,
  timestamp_utc TIMESTAMPTZ,
  distance_m DOUBLE PRECISION,
  speed_mps DOUBLE PRECISION,
  heart_rate_bpm DOUBLE PRECISION,
  cadence_rpm DOUBLE PRECISION,
  power_w DOUBLE PRECISION,
  altitude_m DOUBLE PRECISION,
  temperature_c DOUBLE PRECISION,
  source_quality_flags JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS activity_samples_activity_timestamp_idx
  ON activity_samples(activity_id, timestamp_utc);

CREATE TABLE IF NOT EXISTS activity_track_points (
  id BIGSERIAL PRIMARY KEY,
  activity_id BIGINT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  timestamp_utc TIMESTAMPTZ,
  point geography(Point, 4326) NOT NULL,
  altitude_m DOUBLE PRECISION,
  distance_m DOUBLE PRECISION,
  UNIQUE(activity_id, sequence)
);

CREATE INDEX IF NOT EXISTS activity_track_points_gix
  ON activity_track_points USING GIST(point);

CREATE TABLE IF NOT EXISTS daily_health (
  id BIGSERIAL PRIMARY KEY,
  date_local DATE NOT NULL,
  source TEXT NOT NULL,
  payload JSONB NOT NULL,
  UNIQUE(date_local, source)
);

CREATE TABLE IF NOT EXISTS sleep (
  id BIGSERIAL PRIMARY KEY,
  date_local DATE NOT NULL,
  source TEXT NOT NULL,
  payload JSONB NOT NULL,
  UNIQUE(date_local, source)
);

CREATE TABLE IF NOT EXISTS recovery_metrics (
  id BIGSERIAL PRIMARY KEY,
  date_local DATE NOT NULL,
  source TEXT NOT NULL,
  payload JSONB NOT NULL,
  UNIQUE(date_local, source)
);

CREATE TABLE IF NOT EXISTS raw_objects (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  source_object_id TEXT,
  content_type TEXT,
  sha256 TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE activity_sources
  ADD CONSTRAINT activity_sources_raw_object_fk
  FOREIGN KEY (raw_object_id) REFERENCES raw_objects(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS consents (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  scope TEXT NOT NULL,
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
