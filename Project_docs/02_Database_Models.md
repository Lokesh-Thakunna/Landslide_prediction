# BHURAKSHAN Database Models

This file defines the planned data model for the updated architecture.

## 1. Overview

The data model is zone-centric.

Each monitored zone stores:

- static geography and slope
- historical landslide frequency
- recent rainfall observations
- current prediction
- forecast snapshots
- linked shelters and evacuation routes

## 2. Recommended Tables

### `users`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | primary key |
| `name` | TEXT | |
| `email` | TEXT | unique |
| `password_hash` | TEXT | |
| `role` | ENUM | `ADMIN`, `DISTRICT_OFFICIAL`, `ANALYST` |
| `district_id` | UUID | nullable for admin |
| `created_at` | TIMESTAMP | |

### `districts`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | primary key |
| `name` | TEXT | unique |
| `state_name` | TEXT | default `Uttarakhand` in pilot |
| `geom` | GEOMETRY | district polygon |

### `zones`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | primary key |
| `district_id` | UUID | foreign key |
| `name` | TEXT | |
| `geom` | GEOMETRY | zone polygon |
| `centroid_lat` | NUMERIC | |
| `centroid_lon` | NUMERIC | |
| `slope_degrees` | NUMERIC | static terrain feature |
| `historical_landslide_frequency` | NUMERIC | normalized zone hazard baseline |
| `risk_priority` | INTEGER | seed order for pilot monitoring |
| `is_active` | BOOLEAN | |

### `rainfall_readings`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | primary key |
| `zone_id` | UUID | foreign key |
| `observed_at` | TIMESTAMP | |
| `rainfall_mm_hr` | NUMERIC | |
| `source` | TEXT | weather provider |
| `is_stale` | BOOLEAN | |

### `risk_predictions`

Stores the latest current-horizon output and optional history.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | primary key |
| `zone_id` | UUID | foreign key |
| `predicted_at` | TIMESTAMP | |
| `risk_score` | INTEGER | `0-100` |
| `risk_level` | TEXT | `SAFE`, `WATCH`, `DANGER` |
| `soil_moisture_proxy_pct` | NUMERIC | derived |
| `ground_movement_proxy_pct` | NUMERIC | derived |
| `top_features_json` | JSONB | explainability |

### `forecast_snapshots`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | primary key |
| `zone_id` | UUID | foreign key |
| `horizon_hours` | INTEGER | `1` or `2` |
| `forecast_for` | TIMESTAMP | |
| `risk_score` | INTEGER | `0-100` |
| `risk_level` | TEXT | `SAFE`, `WATCH`, `DANGER` |
| `soil_moisture_proxy_pct` | NUMERIC | derived |

### `safe_shelters`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | primary key |
| `zone_id` | UUID | foreign key |
| `name` | TEXT | |
| `geom` | GEOMETRY | |
| `capacity` | INTEGER | |
| `contact_number` | TEXT | optional |

### `evacuation_routes`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | primary key |
| `zone_id` | UUID | foreign key |
| `safe_shelter_id` | UUID | foreign key |
| `route_geom` | GEOMETRY | path geometry |
| `distance_km` | NUMERIC | |
| `estimated_minutes` | INTEGER | |
| `instruction_summary` | TEXT | short human-readable guidance |

### `subscribers`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | primary key |
| `zone_id` | UUID | foreign key |
| `phone_hash` | TEXT | unique per zone |
| `phone_encrypted` | BYTEA | encrypted at rest |
| `channel_sms_enabled` | BOOLEAN | |
| `channel_whatsapp_enabled` | BOOLEAN | |
| `is_active` | BOOLEAN | |
| `created_at` | TIMESTAMP | |

### `alert_events`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | primary key |
| `zone_id` | UUID | foreign key |
| `trigger_source` | TEXT | `AUTO_CURRENT`, `AUTO_FORECAST`, `MANUAL` |
| `trigger_horizon_hours` | INTEGER | `0`, `1`, or `2` |
| `risk_score` | INTEGER | |
| `risk_level` | TEXT | |
| `channels` | TEXT[] | SMS and WhatsApp for v1 |
| `message_body` | TEXT | final composed message |
| `recipient_count` | INTEGER | |
| `delivery_status` | TEXT | queued, partial, delivered, failed |
| `created_at` | TIMESTAMP | |

### `audit_logs`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | primary key |
| `actor_type` | TEXT | user or system |
| `actor_id` | TEXT | |
| `action` | TEXT | |
| `target_type` | TEXT | |
| `target_id` | TEXT | |
| `metadata_json` | JSONB | |
| `created_at` | TIMESTAMP | |

## 3. Relationships

- one `district` has many `zones`
- one `zone` has many `rainfall_readings`
- one `zone` has many `risk_predictions`
- one `zone` has many `forecast_snapshots`
- one `zone` has many `safe_shelters`
- one `zone` has many `evacuation_routes`
- one `zone` has many `subscribers`
- one `zone` has many `alert_events`

## 4. Removed From The Previous Draft

The updated schema does not require:

- `sensors`
- `sensor_readings`
- MQTT state
- IVR-only delivery tables

Those belong to future phases only.

## 5. Retention Guidance

- keep `rainfall_readings` for a shorter rolling analytics window if cost matters
- keep `risk_predictions` and `forecast_snapshots` long enough for evaluation and tuning
- keep `alert_events`, `subscribers`, and `audit_logs` with stricter durability

## 6. Spatial Notes

- use PostGIS for districts, zones, shelters, and routes
- precompute zone centroids for weather lookup
- precompute nearest shelter candidates to make alert assembly fast
