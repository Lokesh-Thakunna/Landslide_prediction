CREATE TABLE IF NOT EXISTS districts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  state_name TEXT NOT NULL,
  default_language TEXT NOT NULL DEFAULT 'hi',
  geom JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS zones (
  id TEXT PRIMARY KEY,
  district_id TEXT NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  geom JSONB,
  centroid_lat DOUBLE PRECISION NOT NULL,
  centroid_lon DOUBLE PRECISION NOT NULL,
  slope_degrees DOUBLE PRECISION NOT NULL CHECK (slope_degrees >= 0),
  historical_landslide_frequency DOUBLE PRECISION NOT NULL CHECK (historical_landslide_frequency >= 0),
  risk_priority INTEGER NOT NULL CHECK (risk_priority >= 1),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rainfall_readings (
  id BIGSERIAL PRIMARY KEY,
  zone_id TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  observed_at TIMESTAMPTZ NOT NULL,
  rainfall_mm_hr DOUBLE PRECISION NOT NULL CHECK (rainfall_mm_hr >= 0),
  source TEXT NOT NULL,
  is_stale BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risk_predictions (
  id BIGSERIAL PRIMARY KEY,
  zone_id TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  predicted_at TIMESTAMPTZ NOT NULL,
  risk_score DOUBLE PRECISION NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('SAFE', 'WATCH', 'DANGER')),
  soil_moisture_proxy_pct DOUBLE PRECISION NOT NULL CHECK (soil_moisture_proxy_pct >= 0 AND soil_moisture_proxy_pct <= 100),
  ground_movement_proxy_pct DOUBLE PRECISION NOT NULL CHECK (ground_movement_proxy_pct >= 0 AND ground_movement_proxy_pct <= 100),
  top_features_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forecast_snapshots (
  id BIGSERIAL PRIMARY KEY,
  zone_id TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  horizon_hours INTEGER NOT NULL CHECK (horizon_hours >= 1),
  forecast_for TIMESTAMPTZ NOT NULL,
  risk_score DOUBLE PRECISION NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('SAFE', 'WATCH', 'DANGER')),
  soil_moisture_proxy_pct DOUBLE PRECISION NOT NULL CHECK (soil_moisture_proxy_pct >= 0 AND soil_moisture_proxy_pct <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (zone_id, horizon_hours, forecast_for)
);

CREATE TABLE IF NOT EXISTS safe_shelters (
  id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  district_id TEXT NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  geom JSONB,
  lat DOUBLE PRECISION NOT NULL DEFAULT 0,
  lon DOUBLE PRECISION NOT NULL DEFAULT 0,
  capacity INTEGER NOT NULL CHECK (capacity >= 0),
  elevation_m DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (elevation_m >= 0),
  contact_number TEXT NOT NULL,
  distance_km DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (distance_km >= 0),
  instruction_summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evacuation_routes (
  id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  safe_shelter_id TEXT NOT NULL REFERENCES safe_shelters(id) ON DELETE CASCADE,
  route_geom JSONB,
  distance_km DOUBLE PRECISION NOT NULL CHECK (distance_km >= 0),
  estimated_minutes INTEGER NOT NULL CHECK (estimated_minutes >= 0),
  instruction_summary TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  route_type TEXT NOT NULL DEFAULT 'verified_path',
  bearing_degrees DOUBLE PRECISION,
  is_uphill BOOLEAN NOT NULL DEFAULT FALSE,
  path_category TEXT NOT NULL DEFAULT 'primary',
  avoids_streams BOOLEAN NOT NULL DEFAULT FALSE,
  hazard_notes TEXT NOT NULL DEFAULT '',
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscribers (
  id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  phone_hash TEXT NOT NULL UNIQUE,
  phone_encrypted TEXT NOT NULL,
  channel_sms_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  channel_whatsapp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  app_language TEXT NOT NULL DEFAULT 'hi',
  alert_language TEXT NOT NULL DEFAULT 'hi',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (channel_sms_enabled OR channel_whatsapp_enabled)
);

ALTER TABLE districts
  ADD COLUMN IF NOT EXISTS default_language TEXT NOT NULL DEFAULT 'hi';

ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS app_language TEXT NOT NULL DEFAULT 'hi';

ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS alert_language TEXT NOT NULL DEFAULT 'hi';

ALTER TABLE safe_shelters
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE safe_shelters
  ADD COLUMN IF NOT EXISTS lon DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE safe_shelters
  ADD COLUMN IF NOT EXISTS elevation_m DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE evacuation_routes
  ADD COLUMN IF NOT EXISTS steps JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE evacuation_routes
  ADD COLUMN IF NOT EXISTS route_type TEXT NOT NULL DEFAULT 'verified_path';

ALTER TABLE evacuation_routes
  ADD COLUMN IF NOT EXISTS bearing_degrees DOUBLE PRECISION;

ALTER TABLE evacuation_routes
  ADD COLUMN IF NOT EXISTS is_uphill BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE evacuation_routes
  ADD COLUMN IF NOT EXISTS path_category TEXT NOT NULL DEFAULT 'primary';

ALTER TABLE evacuation_routes
  ADD COLUMN IF NOT EXISTS avoids_streams BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE evacuation_routes
  ADD COLUMN IF NOT EXISTS hazard_notes TEXT NOT NULL DEFAULT '';

ALTER TABLE evacuation_routes
  ADD COLUMN IF NOT EXISTS verified_by TEXT;

ALTER TABLE evacuation_routes
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS alert_events (
  id BIGSERIAL PRIMARY KEY,
  zone_id TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  trigger_source TEXT NOT NULL CHECK (trigger_source IN ('AUTO_CURRENT', 'AUTO_FORECAST', 'MANUAL')),
  trigger_horizon_hours INTEGER NOT NULL CHECK (trigger_horizon_hours >= 0),
  risk_score DOUBLE PRECISION NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('SAFE', 'WATCH', 'DANGER')),
  channels JSONB NOT NULL DEFAULT '[]'::jsonb,
  message_body TEXT NOT NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0 CHECK (recipient_count >= 0),
  delivery_status TEXT NOT NULL CHECK (delivery_status IN ('SIMULATED', 'QUEUED', 'DELIVERED', 'FAILED', 'PARTIAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media_reports (
  id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  district_id TEXT NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes >= 0),
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  accuracy_meters DOUBLE PRECISION,
  device_timestamp TIMESTAMPTZ NOT NULL,
  server_received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'hi',
  verification_status TEXT NOT NULL DEFAULT 'pending',
  verification_score DOUBLE PRECISION,
  ai_labels JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  duplicate_hash TEXT NOT NULL DEFAULT '',
  review_notes TEXT NOT NULL DEFAULT '',
  reviewed_at TIMESTAMPTZ,
  risk_boost_applied BOOLEAN NOT NULL DEFAULT FALSE,
  risk_boost_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  uploaded_by_phone_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'DISTRICT_OFFICIAL', 'ANALYST')),
  district_id TEXT REFERENCES districts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zones_district_id ON zones(district_id);
CREATE INDEX IF NOT EXISTS idx_zones_is_active ON zones(is_active);
CREATE INDEX IF NOT EXISTS idx_rainfall_readings_zone_observed_at ON rainfall_readings(zone_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_predictions_zone_predicted_at ON risk_predictions(zone_id, predicted_at DESC);
CREATE INDEX IF NOT EXISTS idx_forecast_snapshots_zone_forecast_for ON forecast_snapshots(zone_id, forecast_for DESC);
CREATE INDEX IF NOT EXISTS idx_safe_shelters_zone_id ON safe_shelters(zone_id);
CREATE INDEX IF NOT EXISTS idx_evacuation_routes_zone_id ON evacuation_routes(zone_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_zone_id ON subscribers(zone_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_active ON subscribers(is_active);
CREATE INDEX IF NOT EXISTS idx_alert_events_zone_created_at ON alert_events(zone_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_reports_zone_received ON media_reports(zone_id, server_received_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_district_id ON users(district_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
