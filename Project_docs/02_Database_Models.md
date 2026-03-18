# HH-LEWS — Database Models Documentation

**Version:** 1.0 | **ORM:** Prisma | **Database:** PostgreSQL 15 + PostGIS 3.3  
**Classification:** Internal — Engineering

---

## Index

1. [Overview & Setup](#1-overview--setup)
2. [Prisma Schema — Full Definition](#2-prisma-schema--full-definition)
3. [Model Reference](#3-model-reference)
4. [Field Validation Rules](#4-field-validation-rules)
5. [Relationships Matrix](#5-relationships-matrix)
6. [Migration Notes](#6-migration-notes)
7. [Spatial Query Patterns](#7-spatial-query-patterns)
8. [Data Retention Policy](#8-data-retention-policy)

---

## 1. Overview & Setup

### Database Stack

| Component | Version | Purpose |
|-----------|---------|---------|
| PostgreSQL | 15+ | Primary relational store |
| PostGIS | 3.3 | Spatial geometry storage and indexing |
| Prisma | 5.x | ORM for Node.js API layer |
| pg_partman | 4.x | Automated time-series partition management |
| asyncpg | 0.29 | Python async driver (Celery workers) |

### Key Design Decisions

- **PostGIS `GEOMETRY` types** are declared as `Unsupported("geometry")` in Prisma — all spatial reads/writes use `$queryRaw`.
- **`sensor_readings` and `weather_readings`** are `PARTITION BY RANGE (recorded_at)` tables managed outside Prisma. Prisma models exist for type-safety but migrations do not create these tables.
- **Phone numbers** are stored as `BYTEA` (AES-256 Fernet encrypted) — never `VARCHAR`. Deduplication uses a SHA-256 hash column.
- **`feature_vector`** on `risk_predictions` is `JSONB` — preserves full ML input for retraining without schema changes.

### Initial Setup Sequence

```bash
# 1. Enable PostGIS extension (run once before first migration):
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS postgis;"
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

# 2. Run Prisma migrations:
npx prisma migrate deploy

# 3. Run spatial index migration (separate SQL script):
psql $DATABASE_URL -f migrations/spatial_indexes.sql

# 4. Create time-series partitions:
psql $DATABASE_URL -f migrations/partitioned_tables.sql
```

---

## 2. Prisma Schema — Full Definition

```prisma
// schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

enum UserRole {
  ADMIN
  DISTRICT_OFFICIAL
  VIEWER
}

enum RiskLevel {
  LOW
  MODERATE
  HIGH
  CRITICAL
}

enum SensorStatus {
  online
  offline
  degraded
}

enum AlertChannel {
  SMS
  WhatsApp
  IVR
}

enum AlertTriggerType {
  ml_auto
  manual
}

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────

model User {
  id            String    @id @default(uuid()) @db.Uuid
  email         String    @unique @db.VarChar(200)
  password_hash String    @db.VarChar(200)
  role          UserRole
  district_id   String?   @db.Uuid       // Nullable — ADMIN has no district binding
  is_active     Boolean   @default(true)
  created_at    DateTime  @default(now()) @db.Timestamptz

  district      District?    @relation(fields: [district_id], references: [id])
  alert_events  AlertEvent[]
  audit_logs    AuditLog[]

  @@map("users")
}

// ─────────────────────────────────────────────
// DISTRICTS
// ─────────────────────────────────────────────

model District {
  id              String    @id @default(uuid()) @db.Uuid
  name            String    @unique @db.VarChar(100)
  helpline_number String?   @db.VarChar(20)
  // PostGIS GEOMETRY(POLYGON, 4326) — managed via raw SQL
  geometry        Unsupported("geometry")?
  created_at      DateTime  @default(now()) @db.Timestamptz

  users  User[]
  zones  Zone[]

  @@map("districts")
}

// ─────────────────────────────────────────────
// ZONES
// ─────────────────────────────────────────────

model Zone {
  id                                String   @id @default(uuid()) @db.Uuid
  name                              String   @db.VarChar(200)
  district_id                       String   @db.Uuid
  // PostGIS types — managed via raw SQL
  geometry                          Unsupported("geometry")?   // POLYGON
  centroid                          Unsupported("geometry")?   // POINT
  slope_avg                         Float?
  slope_max                         Float?
  aspect_avg                        Float?
  curvature                         Float?
  soil_type                         Int?     // 1=clay  2=sandy  3=rocky
  historical_landslide_proximity_km Float?
  is_active                         Boolean  @default(true)
  created_at                        DateTime @default(now()) @db.Timestamptz

  district         District         @relation(fields: [district_id], references: [id])
  sensors          Sensor[]
  sensor_readings  SensorReading[]
  weather_readings WeatherReading[]
  risk_predictions RiskPrediction[]
  alert_events     AlertEvent[]
  safe_zones       SafeZone[]
  subscribers      Subscriber[]

  @@map("zones")
}

// ─────────────────────────────────────────────
// SENSORS
// ─────────────────────────────────────────────

model Sensor {
  id          String       @id @default(uuid()) @db.Uuid
  zone_id     String       @db.Uuid
  type        String       @db.VarChar(50)     // "piezometer" | "tiltmeter"
  mqtt_topic  String       @unique @db.VarChar(200)
  status      SensorStatus @default(online)
  battery_pct Float?
  last_seen   DateTime?    @db.Timestamptz
  created_at  DateTime     @default(now()) @db.Timestamptz

  zone Zone @relation(fields: [zone_id], references: [id])

  @@map("sensors")
}

// ─────────────────────────────────────────────
// SENSOR_READINGS  (partitioned — see migration notes)
// ─────────────────────────────────────────────

model SensorReading {
  id             BigInt   @id @default(autoincrement())
  zone_id        String   @db.Uuid
  sensor_id      String   @db.Uuid
  saturation_pct Float    // DB CHECK: 0 ≤ value ≤ 100
  vibration_mps2 Float    // DB CHECK: 0 ≤ value ≤ 50
  battery_pct    Float?
  recorded_at    DateTime @db.Timestamptz

  zone Zone @relation(fields: [zone_id], references: [id])

  @@index([zone_id, recorded_at])
  @@map("sensor_readings")
}

// ─────────────────────────────────────────────
// WEATHER_READINGS  (partitioned)
// ─────────────────────────────────────────────

model WeatherReading {
  id             BigInt   @id @default(autoincrement())
  zone_id        String   @db.Uuid
  rainfall_mm_hr Float
  humidity_pct   Float?
  pressure_hpa   Float?
  temperature_c  Float?
  wind_speed_ms  Float?
  source         String   @default("openweathermap") @db.VarChar(50)
  is_stale       Boolean  @default(false)
  recorded_at    DateTime @db.Timestamptz

  zone Zone @relation(fields: [zone_id], references: [id])

  @@index([zone_id, recorded_at])
  @@map("weather_readings")
}

// ─────────────────────────────────────────────
// RISK_PREDICTIONS
// ─────────────────────────────────────────────

model RiskPrediction {
  id             String    @id @default(uuid()) @db.Uuid
  zone_id        String    @db.Uuid
  risk_score     Float     // DB CHECK: 0.0 ≤ value ≤ 1.0
  risk_level     RiskLevel
  confidence     Float?
  model_version  String    @db.VarChar(50)
  feature_vector Json      // JSONB — full ML input preserved for retraining
  predicted_at   DateTime  @default(now()) @db.Timestamptz

  zone Zone @relation(fields: [zone_id], references: [id])

  @@index([zone_id, predicted_at])
  @@map("risk_predictions")
}

// ─────────────────────────────────────────────
// ALERT_EVENTS
// ─────────────────────────────────────────────

model AlertEvent {
  id              String           @id @default(uuid()) @db.Uuid
  zone_id         String           @db.Uuid
  risk_level      RiskLevel
  triggered_by    AlertTriggerType
  user_id         String?          @db.Uuid   // null for ml_auto
  channels        AlertChannel[]
  recipient_count Int              @default(0)
  delivered_count Int              @default(0)
  created_at      DateTime         @default(now()) @db.Timestamptz

  zone Zone  @relation(fields: [zone_id], references: [id])
  user User? @relation(fields: [user_id], references: [id])

  @@map("alert_events")
}

// ─────────────────────────────────────────────
// SUBSCRIBERS
// ─────────────────────────────────────────────

model Subscriber {
  id              String    @id @default(uuid()) @db.Uuid
  zone_id         String    @db.Uuid
  phone_encrypted Bytes                   // AES-256 Fernet encrypted — BYTEA column
  phone_hash      String    @db.VarChar(64)  // SHA-256 hex — for dedup lookup only
  is_active       Boolean   @default(true)
  subscribed_at   DateTime  @default(now()) @db.Timestamptz
  unsubscribed_at DateTime? @db.Timestamptz

  zone Zone @relation(fields: [zone_id], references: [id])

  @@unique([phone_hash, zone_id])   // Prevents duplicate subscription per zone
  @@map("subscribers")
}

// ─────────────────────────────────────────────
// SAFE_ZONES
// ─────────────────────────────────────────────

model SafeZone {
  id                     String   @id @default(uuid()) @db.Uuid
  zone_id                String   @db.Uuid
  name                   String   @db.VarChar(200)
  location               Unsupported("geometry")?   // POINT(lon lat, SRID 4326)
  capacity               Int?
  landmark_directions_hi String?                    // Hindi navigation instructions
  created_at             DateTime @default(now()) @db.Timestamptz

  zone Zone @relation(fields: [zone_id], references: [id])

  @@map("safe_zones")
}

// ─────────────────────────────────────────────
// AUDIT_LOGS
// ─────────────────────────────────────────────

model AuditLog {
  id         String    @id @default(uuid()) @db.Uuid
  entity     String    @db.VarChar(50)   // "USER" | "ALERT" | "MODEL" | "SENSOR" | "EXPORT"
  entity_id  String?   @db.Uuid
  action     String    @db.VarChar(50)   // "LOGIN" | "SUPPRESS_ALERT" | "SWAP_MODEL" | "TRIGGER_ALERT"
  user_id    String    @db.Uuid
  ip_address String?   @db.VarChar(45)
  metadata   Json?     // JSONB — additional context (zone_id, risk_level, reason, etc.)
  created_at DateTime  @default(now()) @db.Timestamptz

  user User @relation(fields: [user_id], references: [id])

  @@map("audit_logs")
}
```

---

## 3. Model Reference

### 3.1 `users`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `UUID` | PK, `uuid_generate_v4()` | |
| `email` | `VARCHAR(200)` | UNIQUE, NOT NULL | Lowercase enforced at app layer |
| `password_hash` | `VARCHAR(200)` | NOT NULL | bcrypt, cost factor 12 |
| `role` | `UserRole` enum | NOT NULL | ADMIN / DISTRICT_OFFICIAL / VIEWER |
| `district_id` | `UUID` | FK → `districts.id`, nullable | Null for ADMIN (cross-district) |
| `is_active` | `BOOLEAN` | Default `true` | Set `false` to disable without deleting |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()` | |

### 3.2 `districts`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `name` | `VARCHAR(100)` | UNIQUE, NOT NULL | e.g., "Chamoli", "Rudraprayag" |
| `helpline_number` | `VARCHAR(20)` | Nullable | District DDMO emergency line |
| `geometry` | `GEOMETRY(POLYGON, 4326)` | PostGIS | GIST index required |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()` | |

### 3.3 `zones`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `name` | `VARCHAR(200)` | NOT NULL | Human-readable zone name |
| `district_id` | `UUID` | FK → `districts.id`, NOT NULL | |
| `geometry` | `GEOMETRY(POLYGON, 4326)` | PostGIS | Zone boundary polygon |
| `centroid` | `GEOMETRY(POINT, 4326)` | PostGIS | Used for weather API coordinate lookup |
| `slope_avg` | `FLOAT` | Nullable | Degrees; derived from SRTM DEM preprocessing |
| `slope_max` | `FLOAT` | Nullable | |
| `aspect_avg` | `FLOAT` | Nullable | Degrees 0–360; slope face direction |
| `curvature` | `FLOAT` | Nullable | Profile curvature from DEM |
| `soil_type` | `INT` | Nullable | 1=clay, 2=sandy, 3=rocky |
| `historical_landslide_proximity_km` | `FLOAT` | Nullable | Distance to nearest GSI-recorded event |
| `is_active` | `BOOLEAN` | Default `true` | Inactive zones excluded from inference |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()` | |

### 3.4 `sensors`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `zone_id` | `UUID` | FK → `zones.id`, NOT NULL | |
| `type` | `VARCHAR(50)` | NOT NULL | `"piezometer"` or `"tiltmeter"` |
| `mqtt_topic` | `VARCHAR(200)` | UNIQUE | Format: `sensors/{zone_id}/{sensor_id}/readings` |
| `status` | `SensorStatus` enum | Default `online` | Updated by MQTT LWT handler |
| `battery_pct` | `FLOAT` | Nullable | Updated on each reading |
| `last_seen` | `TIMESTAMPTZ` | Nullable | Updated on each MQTT publish |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()` | |

### 3.5 `sensor_readings` _(partitioned)_

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `BIGSERIAL` | PK | Auto-increment — not UUID (high write volume) |
| `zone_id` | `UUID` | FK → `zones.id`, NOT NULL | |
| `sensor_id` | `UUID` | NOT NULL | References `sensors.id` (no FK on partition) |
| `saturation_pct` | `FLOAT` | `CHECK (0 ≤ x ≤ 100)` | |
| `vibration_mps2` | `FLOAT` | `CHECK (0 ≤ x ≤ 50)` | Values > 50 flagged as anomaly pre-write |
| `battery_pct` | `FLOAT` | Nullable | |
| `recorded_at` | `TIMESTAMPTZ` | NOT NULL, partition key | |

**Partition:** `RANGE (recorded_at)` monthly. Managed by `pg_partman`.

### 3.6 `weather_readings` _(partitioned)_

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `BIGSERIAL` | PK | |
| `zone_id` | `UUID` | FK → `zones.id`, NOT NULL | |
| `rainfall_mm_hr` | `FLOAT` | NOT NULL | `CHECK (x >= 0 AND x < 500)` |
| `humidity_pct` | `FLOAT` | Nullable | |
| `pressure_hpa` | `FLOAT` | Nullable | |
| `temperature_c` | `FLOAT` | Nullable | |
| `wind_speed_ms` | `FLOAT` | Nullable | |
| `source` | `VARCHAR(50)` | Default `"openweathermap"` | `"openweathermap"` / `"openmeteo"` / `"cached"` |
| `is_stale` | `BOOLEAN` | Default `false` | Set `true` when sourced from cache fallback |
| `recorded_at` | `TIMESTAMPTZ` | NOT NULL, partition key | |

### 3.7 `risk_predictions`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `zone_id` | `UUID` | FK → `zones.id`, NOT NULL | |
| `risk_score` | `FLOAT` | `CHECK (0.0 ≤ x ≤ 1.0)` | Ensemble output |
| `risk_level` | `RiskLevel` enum | NOT NULL | LOW / MODERATE / HIGH / CRITICAL |
| `confidence` | `FLOAT` | Nullable | Model confidence metric |
| `model_version` | `VARCHAR(50)` | NOT NULL | e.g., `"v1.2.0"` |
| `feature_vector` | `JSONB` | NOT NULL | Full input vector — used for retraining export |
| `predicted_at` | `TIMESTAMPTZ` | Default `NOW()` | B-Tree indexed for history dashboard queries |

### 3.8 `alert_events`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `zone_id` | `UUID` | FK → `zones.id`, NOT NULL | |
| `risk_level` | `RiskLevel` enum | NOT NULL | Level at time of dispatch |
| `triggered_by` | `AlertTriggerType` enum | NOT NULL | `"ml_auto"` or `"manual"` |
| `user_id` | `UUID` | FK → `users.id`, nullable | Null for `ml_auto` |
| `channels` | `AlertChannel[]` | Array | e.g., `["SMS", "WhatsApp"]` |
| `recipient_count` | `INT` | Default `0` | Subscribers queued for dispatch |
| `delivered_count` | `INT` | Default `0` | Updated by Twilio webhook |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()` | |

### 3.9 `subscribers`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `zone_id` | `UUID` | FK → `zones.id`, NOT NULL | |
| `phone_encrypted` | `BYTEA` | NOT NULL | AES-256 Fernet encrypted phone number |
| `phone_hash` | `VARCHAR(64)` | NOT NULL | SHA-256 hex — for dedup only, never decrypted for lookup |
| `is_active` | `BOOLEAN` | Default `true` | Set `false` on "STOP" reply |
| `subscribed_at` | `TIMESTAMPTZ` | Default `NOW()` | |
| `unsubscribed_at` | `TIMESTAMPTZ` | Nullable | Set on unsubscribe; physical delete after 30 days |

**Unique constraint:** `(phone_hash, zone_id)` — prevents duplicate subscriptions per zone.

### 3.10 `safe_zones`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `zone_id` | `UUID` | FK → `zones.id`, NOT NULL | |
| `name` | `VARCHAR(200)` | NOT NULL | e.g., "Gram Panchayat Bhawan" |
| `location` | `GEOMETRY(POINT, 4326)` | PostGIS | GIST indexed |
| `capacity` | `INT` | Nullable | Max persons |
| `landmark_directions_hi` | `TEXT` | Nullable | Hindi navigation string |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()` | |

### 3.11 `audit_logs`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `entity` | `VARCHAR(50)` | NOT NULL | `"USER"` / `"ALERT"` / `"MODEL"` / `"SENSOR"` / `"EXPORT"` |
| `entity_id` | `UUID` | Nullable | The affected record's ID |
| `action` | `VARCHAR(50)` | NOT NULL | `"LOGIN"` / `"SUPPRESS_ALERT"` / `"SWAP_MODEL"` / `"TRIGGER_ALERT"` |
| `user_id` | `UUID` | FK → `users.id`, NOT NULL | Acting user |
| `ip_address` | `VARCHAR(45)` | Nullable | IPv4/IPv6 |
| `metadata` | `JSONB` | Nullable | Contextual data (zone_id, risk_level, reason, etc.) |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()` | Immutable — no updates to this table |

---

## 4. Field Validation Rules

| Model.Field | Constraint | Where Enforced |
|-------------|-----------|----------------|
| `RiskPrediction.risk_score` | `0.0 ≤ value ≤ 1.0` | DB `CHECK` + Pydantic validator |
| `SensorReading.saturation_pct` | `0 ≤ value ≤ 100` | DB `CHECK` + MQTT schema validator |
| `SensorReading.vibration_mps2` | `0 ≤ value ≤ 50` (>50 = anomaly) | DB `CHECK` + Celery pre-write filter |
| `WeatherReading.rainfall_mm_hr` | `value >= 0 AND value < 500` | DB `CHECK` + physical plausibility gate |
| `User.email` | Valid email format, UNIQUE | Express validator + DB UNIQUE |
| `User.password_hash` | Min 12 chars (enforced at input, not hash) | Express validator before hashing |
| `Subscriber.phone_encrypted` | Non-null, BYTEA | Fernet encrypt enforced before write |
| `Subscriber.phone_hash` | SHA-256 hex, UNIQUE per zone | Node `crypto` before write; DB UNIQUE |
| `Zone.slope_avg` | > 0, typical 0–90° | SRTM preprocessor + manual QA |
| `AlertEvent.delivered_count` | `<= recipient_count` | App logic (Twilio webhook handler) |
| `Sensor.mqtt_topic` | Format: `sensors/{zone_id}/{sensor_id}/readings` | App-layer format check on creation |

---

## 5. Relationships Matrix

| From | Cardinality | To | FK / Notes |
|------|------------|-----|-----------|
| `User` | N:1 | `District` | `User.district_id → District.id` — nullable for ADMIN |
| `Zone` | N:1 | `District` | `Zone.district_id → District.id` — NOT NULL |
| `Sensor` | N:1 | `Zone` | `Sensor.zone_id → Zone.id` |
| `SensorReading` | N:1 | `Zone` | Partitioned table — application-enforced FK; no DB FK on partition |
| `WeatherReading` | N:1 | `Zone` | Same partition strategy |
| `RiskPrediction` | N:1 | `Zone` | Full audit row per inference cycle per zone |
| `AlertEvent` | N:1 | `Zone` | One row per dispatch event |
| `AlertEvent` | N:1 | `User` | Nullable — null for `ml_auto` triggered events |
| `Subscriber` | N:1 | `Zone` | Citizens not linked to `User` table — separate entity |
| `SafeZone` | N:1 | `Zone` | Multiple safe shelters can map to one monitoring zone |
| `AuditLog` | N:1 | `User` | Every auditable action records acting `user_id` — NOT NULL |

---

## 6. Migration Notes

### 6.1 Initial Migration Order

```sql
-- 1. Extensions first:
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_partman;

-- 2. Prisma generates and runs standard table migrations:
--    users, districts, zones, sensors, risk_predictions,
--    alert_events, subscribers, safe_zones, audit_logs

-- 3. Run spatial index script (post-Prisma):
CREATE INDEX idx_zones_geometry     ON zones      USING GIST (geometry);
CREATE INDEX idx_zones_centroid     ON zones      USING GIST (centroid);
CREATE INDEX idx_districts_geometry ON districts  USING GIST (geometry);
CREATE INDEX idx_safe_zones_location ON safe_zones USING GIST (location);
```

### 6.2 Partitioned Tables (Raw SQL — Not Prisma)

Prisma models exist for type safety, but these tables are created manually:

```sql
-- sensor_readings parent table:
CREATE TABLE sensor_readings (
  id             BIGSERIAL,
  zone_id        UUID NOT NULL REFERENCES zones(id),
  sensor_id      UUID NOT NULL,
  saturation_pct FLOAT NOT NULL CHECK (saturation_pct >= 0 AND saturation_pct <= 100),
  vibration_mps2 FLOAT NOT NULL CHECK (vibration_mps2 >= 0 AND vibration_mps2 <= 50),
  battery_pct    FLOAT,
  recorded_at    TIMESTAMPTZ NOT NULL
) PARTITION BY RANGE (recorded_at);

-- Monthly partition example (automate with pg_partman):
CREATE TABLE sensor_readings_2025_06
  PARTITION OF sensor_readings
  FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

CREATE TABLE sensor_readings_2025_07
  PARTITION OF sensor_readings
  FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');

-- Index on each partition:
CREATE INDEX ON sensor_readings (zone_id, recorded_at);

-- weather_readings parent table (same pattern):
CREATE TABLE weather_readings (
  id             BIGSERIAL,
  zone_id        UUID NOT NULL REFERENCES zones(id),
  rainfall_mm_hr FLOAT NOT NULL CHECK (rainfall_mm_hr >= 0 AND rainfall_mm_hr < 500),
  humidity_pct   FLOAT,
  pressure_hpa   FLOAT,
  temperature_c  FLOAT,
  wind_speed_ms  FLOAT,
  source         VARCHAR(50) DEFAULT 'openweathermap',
  is_stale       BOOLEAN DEFAULT false,
  recorded_at    TIMESTAMPTZ NOT NULL
) PARTITION BY RANGE (recorded_at);

CREATE TABLE weather_readings_2025_06
  PARTITION OF weather_readings
  FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

CREATE INDEX ON weather_readings (zone_id, recorded_at);
```

### 6.3 pg_partman Automation

```sql
-- Automate future partition creation:
SELECT partman.create_parent(
  p_parent_table   := 'public.sensor_readings',
  p_control        := 'recorded_at',
  p_type           := 'range',
  p_interval       := 'monthly',
  p_premake        := 3   -- pre-create 3 months ahead
);

-- Run maintenance (called by nightly Celery maintenance_queue task):
SELECT partman.run_maintenance();

-- Drop partitions older than 90 days:
UPDATE partman.part_config
  SET retention = '90 days', retention_keep_table = false
  WHERE parent_table = 'public.sensor_readings';
```

### 6.4 Add CHECK Constraints (Post-Prisma)

Prisma does not generate `CHECK` constraints. Run these after `prisma migrate deploy`:

```sql
ALTER TABLE risk_predictions
  ADD CONSTRAINT chk_risk_score
  CHECK (risk_score >= 0.0 AND risk_score <= 1.0);

ALTER TABLE sensor_readings
  ADD CONSTRAINT chk_saturation
  CHECK (saturation_pct >= 0 AND saturation_pct <= 100),
  ADD CONSTRAINT chk_vibration
  CHECK (vibration_mps2 >= 0 AND vibration_mps2 <= 50);

ALTER TABLE weather_readings
  ADD CONSTRAINT chk_rainfall
  CHECK (rainfall_mm_hr >= 0 AND rainfall_mm_hr < 500);
```

### 6.5 SRTM Static Data Load

One-time operation after zone records are created:

```python
# Run preprocessing script once at deployment:
# scripts/load_srtm.py

import rasterio
import numpy as np
from prisma import Prisma

async def load_srtm(zones):
    with rasterio.open("data/srtm_uttarakhand.tif") as src:
        for zone in zones:
            # Clip raster to zone bounding box
            # Compute slope_avg, slope_max, aspect_avg, curvature
            # Update zone record via raw SQL (geometry writes)
            await prisma.execute_raw(
                "UPDATE zones SET slope_avg=$1, slope_max=$2, aspect_avg=$3, curvature=$4 WHERE id=$5",
                slope_avg, slope_max, aspect_avg, curvature, zone.id
            )
```

---

## 7. Spatial Query Patterns

All PostGIS queries use `prisma.$queryRaw` or raw `asyncpg` in Python:

```javascript
// Node.js — Get zones with GeoJSON geometry for Leaflet:
const zones = await prisma.$queryRaw`
  SELECT
    id,
    name,
    district_id,
    slope_avg,
    ST_AsGeoJSON(geometry)::json AS geojson,
    ST_Y(centroid::geometry) AS lat,
    ST_X(centroid::geometry) AS lon
  FROM zones
  WHERE district_id = ${districtId}::uuid
    AND is_active = true
`;

// Node.js — Find nearest safe zone to a point:
const nearestSafe = await prisma.$queryRaw`
  SELECT
    id,
    name,
    capacity,
    landmark_directions_hi,
    ST_Distance(
      location::geography,
      ST_SetSRID(ST_Point(${lon}, ${lat}), 4326)::geography
    ) AS distance_m
  FROM safe_zones
  WHERE zone_id = ${zoneId}::uuid
  ORDER BY distance_m ASC
  LIMIT 1
`;

// Python (asyncpg) — Get all zones within a district polygon:
rows = await conn.fetch("""
  SELECT z.id, z.name, z.slope_avg
  FROM zones z
  JOIN districts d ON z.district_id = d.id
  WHERE d.name = $1
    AND ST_Within(z.centroid, d.geometry)
    AND z.is_active = true
""", district_name)
```

---

## 8. Data Retention Policy

| Table | Retention | Cleanup Method |
|-------|-----------|----------------|
| `sensor_readings` | 90 days | `pg_partman` drop old partitions (nightly) |
| `weather_readings` | 90 days | Same partition strategy |
| `risk_predictions` | 2 years | Manual archive + delete (NDMA compliance) |
| `alert_events` | 1 year (then anonymize) | Nightly Celery task removes IDs, retains counts |
| `subscribers` (inactive) | 30 days after unsubscribe | Nightly Celery task physical delete |
| `audit_logs` | 5 years | Manual review + archive; never auto-deleted |
| `users` | Until manual admin deletion | Soft delete (`is_active=false`); no auto-delete |

---

_HH-LEWS Database Models Documentation — v1.0 — Internal Engineering_
