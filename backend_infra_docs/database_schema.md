# HH-LEWS — Database Schema & ER Diagram

## 1. Overview
The HH-LEWS data layer relies heavily on **PostgreSQL 15** combined with **PostGIS 3.3** for topological spatial indexing.

## 2. ASCII ER Diagram

```text
  +------------------+         +----------------+
  |      USERS       |         |   DISTRICTS    |
  |------------------|         |----------------|
  | id (PK)          |         | id (PK)        |
  | email            |         | name           |
  | password_hash    |    +--->| geometry       |
  | role             |    |    +----------------+
  | district_id (FK)-+----+             |
  +------------------+                  | 1:N
                                        v
  +------------------+         +----------------+
  |    SAFEZONES     |         |     ZONES      |
  |------------------|         |----------------|
  | id (PK)          |    +----| id (PK)        |
  | zone_id (FK)  ---+----+    | district_id (FK)
  | name             |    |    | name           |
  | location         |    |    | geometry       |
  | capacity         |    |    | slope_avg      |
  +------------------+    |    +----------------+
                          |             | 1:N
                          |             v
  +------------------+    |    +----------------+
  | SENSOR_READINGS  |    +----|    SENSORS     |
  |------------------|    |    |----------------|
  | id (PK)          |    |    | id (PK)        |
  | zone_id (FK)  ---+----+    | zone_id (FK)   |
  | saturation_pct   |    |    | type           |
  | vibration_mps2   |    |    | location       |
  | recorded_at      |    |    | status         |
  +------------------+    |    +----------------+
                          |             | 1:N
                          |             v
  +------------------+    |    +----------------+
  | RISK_PREDICTIONS |    +----|  ALERT_EVENTS  |
  |------------------|    |    |----------------|
  | id (PK)          |    |    | id (PK)        |
  | zone_id (FK)  ---+----+    | zone_id (FK)   |
  | risk_score       |         | risk_level     |
  | risk_level       |         | channels       |
  | confidence       |         | user_id (FK)   |
  | predicted_at     |         +----------------+
  +------------------+                  | 1:N
                                        v
  +------------------+         +----------------+
  |    AUDIT_LOGS    |         |    RAINFALL    |
  |------------------|         |----------------|
  | id (PK)          |         | id (PK)        |
  | entity           |         | zone_id (FK)   |
  | action           |         | rainfall_mm_hr |
  | user_id (FK)     |         | recorded_at    |
  +------------------+         +----------------+
```

## 3. Table Definitions

### 3.1. `users` Table
Stores official credentials and role mapping.
*   **id**: `UUID`, Primary Key, Defaults to `uuid_generate_v4()`.
*   **email**: `VARCHAR(200)`, UNIQUE, NOT NULL.
*   **password_hash**: `VARCHAR(200)`, NOT NULL.
*   **role**: `VARCHAR(30)`, NOT NULL (Enum equivalent: ADMIN, DISTRICT_OFFICIAL, VIEWER).
*   **district_id**: `UUID`, Foreign Key pointing to `districts.id`.
*   **is_active**: `BOOLEAN`, Default `TRUE`.
*   **created_at**: `TIMESTAMPTZ`, Default `NOW()`.

### 3.2. `districts` Table
Used for RBAC bounding and grouping zones.
*   **id**: `UUID`, Primary Key.
*   **name**: `VARCHAR(100)`, UNIQUE, NOT NULL (e.g., 'Chamoli').
*   **helpline_number**: `VARCHAR(20)`.
*   **geometry**: `GEOMETRY(POLYGON, 4326)`, Spatial boundaries.
*   *Index:* `GIST (geometry)`

### 3.3. `zones` Table
Physical monitoring locations that contain IoT sensors and act as prediction targets.
*   **id**: `UUID`, Primary Key.
*   **name**: `VARCHAR(200)`.
*   **district_id**: `UUID`, FK to `districts.id`.
*   **geometry**: `GEOMETRY(POLYGON, 4326)`, PostGIS topology bounds.
*   **centroid**: `GEOMETRY(POINT, 4326)`.
*   **slope_avg**: `FLOAT` (Derived safely from SRTM static maps).
*   **aspect_avg**: `FLOAT`.
*   **curvature**: `FLOAT`.
*   **soil_type**: `INTEGER` (1=clay, 2=sandy, 3=rocky).
*   *Index:* `GIST (geometry)`

### 3.4. `sensors` & `sensor_readings` Tables
*   **`sensors`**:
    *   **id**: `UUID`, PK.
    *   **zone_id**: `UUID`, FK to `zones`.
    *   **type**: `VARCHAR(50)` (piezometer, tiltmeter).
    *   **status**: `VARCHAR(20)`. (online, offline).
*   **`sensor_readings`**:
    *   **id**: `BIGSERIAL`, PK.
    *   **zone_id**: `UUID`, FK to `zones`.
    *   **saturation_pct**: `FLOAT`.
    *   **vibration_mps2**: `FLOAT`.
    *   **battery_pct**: `FLOAT`.
    *   **recorded_at**: `TIMESTAMPTZ`, NOT NULL.
    *   *Constraints/Structure:* Partitioned by `RANGE (recorded_at)` per month.

### 3.5. `rainfall` Table
Stores external meteorological api responses cache.
*   **id**: `BIGSERIAL`, PK.
*   **zone_id**: `UUID`, FK to `zones.id`.
*   **rainfall_mm_hr**: `FLOAT`.
*   **humidity_pct**: `FLOAT`.
*   **recorded_at**: `TIMESTAMPTZ`, Indexed.
*   *Constraints/Structure:* Time-series partitioned globally, identical to sensors.

### 3.6. `risk_predictions` Table
Full audit pipeline containing model inference statistics.
*   **id**: `UUID`, PK.
*   **zone_id**: `UUID`, FK `zones.id`.
*   **risk_score**: `FLOAT`, (0.00 to 1.00). Constraints: `CHECK (risk_score >= 0.0 AND risk_score <= 1.0)`.
*   **risk_level**: `VARCHAR(20)` (LOW, MODERATE, HIGH, CRITICAL).
*   **confidence**: `FLOAT`.
*   **model_version**: `VARCHAR(50)`.
*   **feature_vector**: `JSONB`, Used to persist inputs to retrain future models.
*   **predicted_at**: `TIMESTAMPTZ`. B-Tree Index for history dashboards.

### 3.7. `alert_events` Table
Record of all system-dispatched updates to subscribers.
*   **id**: `UUID`, PK.
*   **zone_id**: `UUID`, FK `zones.id`.
*   **risk_level**: `VARCHAR(20)`.
*   **triggered_by**: `VARCHAR(20)` ('ml_auto', 'manual').
*   **user_id**: `UUID`, FK `users.id` (Nullable, present if manual override).
*   **channels**: `TEXT[]` (Array tracking SMS, WhatsApp, IVR).
*   **recipient_count**: `INTEGER`.
*   **delivered_count**: `INTEGER`.
*   **created_at**: `TIMESTAMPTZ`.

### 3.8. `safe_zones` Table
Navigational targets populated into Citizen PWA endpoints.
*   **id**: `UUID`, PK.
*   **zone_id**: `UUID`, FK `zones.id`.
*   **name**: `VARCHAR(200)` (e.g. Gram Panchayat Bhawan).
*   **location**: `GEOMETRY(POINT, 4326)`.
*   **landmark_directions_hi**: `TEXT` (Landmark descriptions in Hindi).
*   **capacity**: `INTEGER`.

### 3.9. `audit_logs` Table
Tracks system mutations for accountability and reporting to NDMA.
*   **id**: `UUID`, PK.
*   **entity**: `VARCHAR(50)` (E.g. "USER", "MODEL", "ACCOUNT").
*   **entity_id**: `UUID`
*   **action**: `VARCHAR(50)` (E.g. "SUPPRESS_ALERT", "SWAP_MODEL", "LOGIN", "EXPORT").
*   **user_id**: `UUID`, FK `users.id`.
*   **ip_address**: `VARCHAR(45)`.
*   **created_at**: `TIMESTAMPTZ`.
