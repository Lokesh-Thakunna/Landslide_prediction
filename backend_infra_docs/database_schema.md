# BHURAKSHAN Database Schema

## 1. Overview

The v1 schema is centered on monitored zones and avoids mandatory hardware-sensor tables.

## 2. Core Tables

### `users`

Official dashboard users.

Suggested fields:

- `id`
- `name`
- `email`
- `password_hash`
- `role`
- `district_id`
- `created_at`

### `districts`

- `id`
- `name`
- `state_name`
- `geom`

### `zones`

- `id`
- `district_id`
- `name`
- `geom`
- `centroid_lat`
- `centroid_lon`
- `slope_degrees`
- `historical_landslide_frequency`
- `risk_priority`
- `is_active`

### `rainfall_readings`

- `id`
- `zone_id`
- `observed_at`
- `rainfall_mm_hr`
- `source`
- `is_stale`

### `risk_predictions`

Current horizon prediction.

- `id`
- `zone_id`
- `predicted_at`
- `risk_score`
- `risk_level`
- `soil_moisture_proxy_pct`
- `ground_movement_proxy_pct`
- `top_features_json`

### `forecast_snapshots`

Future horizon prediction records.

- `id`
- `zone_id`
- `horizon_hours`
- `forecast_for`
- `risk_score`
- `risk_level`
- `soil_moisture_proxy_pct`

### `safe_shelters`

- `id`
- `zone_id`
- `name`
- `geom`
- `capacity`
- `contact_number`

### `evacuation_routes`

- `id`
- `zone_id`
- `safe_shelter_id`
- `route_geom`
- `distance_km`
- `estimated_minutes`
- `instruction_summary`

### `subscribers`

- `id`
- `zone_id`
- `phone_hash`
- `phone_encrypted`
- `channel_sms_enabled`
- `channel_whatsapp_enabled`
- `is_active`
- `created_at`

### `alert_events`

- `id`
- `zone_id`
- `trigger_source`
- `trigger_horizon_hours`
- `risk_score`
- `risk_level`
- `channels`
- `message_body`
- `recipient_count`
- `delivery_status`
- `created_at`

### `audit_logs`

- `id`
- `actor_type`
- `actor_id`
- `action`
- `target_type`
- `target_id`
- `metadata_json`
- `created_at`

## 3. Notes

- partition `rainfall_readings`, `risk_predictions`, and `forecast_snapshots` by time when implementation starts
- use PostGIS geometry for districts, zones, shelters, and routes
- encrypt phone numbers at rest
- treat `zones` as the primary unit for model inference and alerting

## 4. Removed From v1

The updated v1 schema does not require:

- `sensors`
- `sensor_readings`
- MQTT status tracking

Those can be added later if physical instrumentation is introduced.
