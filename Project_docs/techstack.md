# HH-LEWS — Technology Stack Document

**Document Version:** 1.0.0  
**Last Updated:** 2025-06-14  
**Status:** Active  
**Owner:** HH-LEWS Engineering Team

---

## Table of Contents

1. [System Component Overview](#1-system-component-overview)
2. [Backend — Python / FastAPI](#2-backend--python--fastapi)
3. [Database — PostgreSQL + PostGIS](#3-database--postgresql--postgis)
4. [Cache & Task Queue — Redis + Celery](#4-cache--task-queue--redis--celery)
5. [ML Engine — scikit-learn + XGBoost](#5-ml-engine--scikit-learn--xgboost)
6. [IoT Communication — MQTT](#6-iot-communication--mqtt)
7. [Alert Delivery — Twilio / MSG91 / WhatsApp / IVR](#7-alert-delivery--twilio--msg91--whatsapp--ivr)
8. [Frontend — React + Leaflet.js + Tailwind CSS](#8-frontend--react--leafletjs--tailwind-css)
9. [Infrastructure — Docker + AWS / DigitalOcean](#9-infrastructure--docker--aws--digitalocean)
10. [Alternatives Considered](#10-alternatives-considered)
11. [Data Flow Diagram](#11-data-flow-diagram)
12. [Scaling Strategy](#12-scaling-strategy)
13. [Cost Optimization](#13-cost-optimization)
14. [Technology Decision Log](#14-technology-decision-log)

---

## 1. System Component Overview

HH-LEWS is composed of six discrete, independently deployable services. Each service has a single responsibility, communicates via well-defined APIs or message queues, and can be scaled independently.

```
┌──────────────────────────────────────────────────────────────────────┐
│                    HH-LEWS SYSTEM COMPONENTS                         │
├─────────────────────┬────────────────────────────────────────────────┤
│  COMPONENT          │  TECHNOLOGY                                    │
├─────────────────────┼────────────────────────────────────────────────┤
│  API Gateway        │  Node.js + Express (main backend)              │
│  ML Microservice    │  Python + FastAPI                              │
│  Database           │  PostgreSQL 15 + PostGIS 3.3                   │
│  Cache              │  Redis 7.x                                     │
│  Task Queue         │  Celery 5.x (workers in Python)                │
│  Message Broker     │  Redis (also serves as Celery broker)          │
│  IoT Broker         │  MQTT (Mosquitto or HiveMQ Cloud)              │
│  ML Models          │  scikit-learn + XGBoost                        │
│  Citizen PWA        │  React 18 + Vite + Tailwind CSS                │
│  Official Dashboard │  React 18 + Leaflet.js + Recharts              │
│  Containerization   │  Docker + Docker Compose                       │
│  Cloud              │  AWS EC2 / DigitalOcean Droplets               │
│  Reverse Proxy      │  Nginx                                         │
│  Monitoring         │  UptimeRobot + AWS CloudWatch                  │
│  CI/CD              │  GitHub Actions                                │
└─────────────────────┴────────────────────────────────────────────────┘
```

### Architecture Decision: Dual-Backend

The system uses two backend layers:

- **Node.js backend:** Handles authentication, dashboard WebSocket connections, subscriber management, alert dispatch orchestration, and serves the React frontend. Node.js is chosen for its real-time WebSocket handling and the team's frontend/backend JavaScript continuity.

- **FastAPI ML microservice:** Isolated Python service for ML inference, model management, and feature engineering. Python isolation ensures the ML environment (numpy, scikit-learn, XGBoost, GDAL for GIS) does not pollute the Node.js environment and can be independently versioned and deployed.

---

## 2. Backend — Python / FastAPI

### 2.1 Why FastAPI

FastAPI is the appropriate choice for the ML inference microservice for the following reasons:

**Performance:** FastAPI is built on Starlette (ASGI) and Pydantic, delivering throughput comparable to Node.js and Go for I/O-bound workloads. For CPU-bound ML inference, async routing ensures the server remains responsive while inference runs in a thread pool executor.

**Automatic API Documentation:** FastAPI auto-generates OpenAPI 3.0 spec and Swagger UI from type annotations. This is critical for the HH-LEWS requirement (FR-39) that all endpoints have Swagger documentation — zero additional work.

**Pydantic Validation:** All request/response models are Pydantic schemas. Invalid feature vectors passed to `/predict` are rejected with structured error messages before reaching the ML model — eliminating a class of runtime errors.

**Python Ecosystem Compatibility:** scikit-learn, XGBoost, NumPy, Pandas, and GDAL/rasterio are Python-native libraries. A Python-based web framework eliminates the language boundary that would exist with a Node.js ML service.

### 2.2 FastAPI Service Endpoints

```
ML Microservice (port 8000)
├── POST   /predict              — Single-zone inference
├── POST   /predict/batch        — Batch inference for all zones
├── GET    /health               — Service health check
├── GET    /models               — List available model versions
├── POST   /models/{version}/load — Hot-swap model
├── GET    /features/schema      — Return expected feature vector schema
└── GET    /docs                 — Swagger UI
```

### 2.3 Feature Vector Schema

```python
class PredictionRequest(BaseModel):
    zone_id: str
    rainfall_mm_hr: float          # Current rainfall intensity
    rainfall_72h_mm: float         # Cumulative 72-hour rainfall
    slope_degrees: float           # From SRTM (static, per zone)
    aspect_degrees: float          # Slope aspect
    curvature: float               # Profile curvature
    soil_saturation_pct: float     # IoT sensor / simulated
    vibration_mps2: float          # IoT sensor / simulated
    soil_type_code: int            # Categorical: 1=clay, 2=sandy, 3=rocky
    ndvi: float                    # Vegetation index (optional, default 0.5)
    historical_landslide_proximity_km: float  # Distance to nearest past event
    model_version: Optional[str] = "latest"

class PredictionResponse(BaseModel):
    zone_id: str
    risk_score: float              # 0.0 - 1.0
    risk_level: str                # LOW / MODERATE / HIGH / CRITICAL
    confidence: float              # Model confidence (0.0 - 1.0)
    model_version: str
    top_features: List[FeatureImportance]
    predicted_at: datetime
```

### 2.4 Node.js Backend

The Node.js Express backend serves as the system's orchestration layer:

- **Authentication:** JWT issuance and validation for official dashboard users.
- **WebSocket Server:** Real-time risk updates pushed to dashboard clients.
- **Alert Orchestration:** Receives alert triggers from ML service (via internal API), queries subscriber lists from PostgreSQL, dispatches to Celery task queue for SMS/WhatsApp/IVR.
- **REST API:** Serves dashboard data (zones, sensors, alert history, subscribers).
- **Static Serving:** Serves compiled React frontend bundles.

---

## 3. Database — PostgreSQL + PostGIS

### 3.1 Why PostgreSQL

PostgreSQL is the only open-source relational database with mature, production-grade geospatial extension support via PostGIS. Given that every core operation in HH-LEWS involves spatial data (zone polygon lookup, proximity queries, subscriber geo-assignment), a database with native geospatial indexing is non-negotiable.

**PostGIS capabilities used:**
- `ST_Contains()` — determine which zone a given coordinate falls within.
- `ST_Distance()` — calculate distance from event to subscriber locations.
- `ST_Intersects()` — find zones affected by a rainfall polygon from IMD.
- `ST_DWithin()` — query subscribers within X km of a zone centroid.
- `GiST indexes` — spatial indexing for sub-millisecond geo queries.

### 3.2 Core Schema

```sql
-- Monitoring zones with spatial geometry
CREATE TABLE zones (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(200) NOT NULL,
    district    VARCHAR(100) NOT NULL,
    block       VARCHAR(100),
    geometry    GEOMETRY(POLYGON, 4326) NOT NULL,  -- PostGIS polygon
    centroid    GEOMETRY(POINT, 4326),
    slope_avg   FLOAT,          -- From SRTM pre-processing
    slope_max   FLOAT,
    aspect_avg  FLOAT,
    curvature   FLOAT,
    soil_type   INTEGER,
    historical_events INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX zones_geometry_idx ON zones USING GIST(geometry);

-- Sensor registry
CREATE TABLE sensors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id         UUID REFERENCES zones(id),
    sensor_type     VARCHAR(50),  -- piezometer, tiltmeter, raingauge
    location        GEOMETRY(POINT, 4326),
    is_simulated    BOOLEAN DEFAULT TRUE,
    installed_at    TIMESTAMPTZ,
    last_seen       TIMESTAMPTZ,
    battery_pct     FLOAT,
    status          VARCHAR(20) DEFAULT 'online'
);

-- Time-series sensor readings (partitioned by month)
CREATE TABLE sensor_readings (
    id              BIGSERIAL,
    sensor_id       UUID REFERENCES sensors(id),
    saturation_pct  FLOAT,
    vibration_mps2  FLOAT,
    battery_pct     FLOAT,
    recorded_at     TIMESTAMPTZ NOT NULL
) PARTITION BY RANGE (recorded_at);

-- ML predictions audit
CREATE TABLE predictions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id         UUID REFERENCES zones(id),
    risk_score      FLOAT NOT NULL,
    risk_level      VARCHAR(20) NOT NULL,
    confidence      FLOAT,
    model_version   VARCHAR(50),
    feature_vector  JSONB,
    predicted_at    TIMESTAMPTZ NOT NULL
);

-- Alert event log
CREATE TABLE alert_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id         UUID REFERENCES zones(id),
    risk_level      VARCHAR(20) NOT NULL,
    risk_score      FLOAT,
    triggered_by    VARCHAR(20),  -- 'ml_auto', 'manual'
    triggered_by_user UUID,
    channels        TEXT[],
    recipient_count INTEGER,
    delivered_count INTEGER,
    suppressed      BOOLEAN DEFAULT FALSE,
    suppress_reason VARCHAR(200),
    alert_text_hi   TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Subscribers
CREATE TABLE subscribers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id         UUID REFERENCES zones(id),
    phone_encrypted BYTEA NOT NULL,  -- AES-256 encrypted
    whatsapp_opted  BOOLEAN DEFAULT FALSE,
    ivr_opted       BOOLEAN DEFAULT FALSE,
    literacy_support BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    registered_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Official users
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(200) UNIQUE NOT NULL,
    password_hash   VARCHAR(200) NOT NULL,
    role            VARCHAR(30) NOT NULL,  -- admin, district_official, viewer
    district        VARCHAR(100),
    full_name       VARCHAR(200),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3 Partitioning Strategy

`sensor_readings` is partitioned by month to manage data volume. Each partition (e.g., `sensor_readings_2025_06`) is automatically created by a trigger. Old partitions (>90 days) are dropped by a scheduled Celery beat task.

---

## 4. Cache & Task Queue — Redis + Celery

### 4.1 Redis — Why and How

Redis serves two roles in HH-LEWS:

**Role 1: Application Cache**
- Current risk score per zone (TTL: 5 minutes) — avoids DB hit on every dashboard poll.
- Latest weather API response per coordinate (TTL: 5 minutes) — prevents redundant API calls.
- Active alert suppression flags per zone (TTL: configurable, default 30 minutes).
- Session tokens (JWT blacklist for logout).

**Role 2: Celery Message Broker**
Redis is the message broker and result backend for Celery task queue. This eliminates the need for a separate RabbitMQ deployment, reducing operational complexity without material performance loss at this scale.

```python
# Redis key schema
f"risk:{zone_id}"              → {"score": 0.87, "level": "CRITICAL", "ts": 1718000000}
f"weather:{lat}:{lon}"         → {weather data JSON}
f"alert_suppress:{zone_id}"    → "1"  (TTL = suppression duration)
f"sensor_last:{sensor_id}"     → {last reading JSON}
```

### 4.2 Celery — Task Queue Architecture

Celery handles all asynchronous and scheduled operations. Workers run in separate Docker containers.

**Queues:**

| Queue | Workers | Tasks |
|-------|---------|-------|
| `polling` | 2 | Weather API polling per zone |
| `inference` | 2 | ML inference trigger + result processing |
| `alerts` | 4 | SMS, WhatsApp, IVR dispatch |
| `maintenance` | 1 | DB cleanup, backup triggers, sensor health checks |

**Scheduled Tasks (Celery Beat):**

```python
CELERYBEAT_SCHEDULE = {
    'poll-weather-all-zones': {
        'task': 'tasks.weather.poll_all_zones',
        'schedule': crontab(minute='*/5'),  # Every 5 minutes
    },
    'run-batch-inference': {
        'task': 'tasks.ml.batch_inference',
        'schedule': crontab(minute='*/5'),  # Every 5 minutes
    },
    'check-sensor-health': {
        'task': 'tasks.sensors.health_check',
        'schedule': crontab(minute='*/10'),
    },
    'cleanup-old-partitions': {
        'task': 'tasks.maintenance.drop_old_partitions',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2AM
    },
}
```

**Alert Dispatch Task:**

```python
@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def dispatch_sms_alert(self, zone_id: str, message_hi: str, recipient_ids: list):
    try:
        # Fetch encrypted phone numbers, decrypt, dispatch via Twilio
        ...
    except TwilioException as exc:
        raise self.retry(exc=exc)
```

---

## 5. ML Engine — scikit-learn + XGBoost

### 5.1 Model Architecture

HH-LEWS uses a two-stage ML pipeline:

**Stage 1: Random Forest Classifier (scikit-learn)**
- Handles multi-class classification (LOW/MODERATE/HIGH/CRITICAL).
- Robust to missing features (e.g., sensor offline → impute with zone average).
- Provides feature importance scores for dashboard transparency.
- Parameters: `n_estimators=200, max_depth=12, min_samples_leaf=5, class_weight='balanced'`
- Optimized for high recall on HIGH/CRITICAL classes (minimize missed real events).

**Stage 2: XGBoost Regressor (risk score refinement)**
- Takes Random Forest class probabilities as additional features.
- Outputs a continuous risk score (0.0–1.0).
- Gradient boosting captures non-linear feature interactions that Random Forest misses.
- Parameters: `n_estimators=300, learning_rate=0.05, max_depth=6, subsample=0.8`

**Ensemble Output:**
```python
risk_score = 0.4 * rf_class_proba_high + 0.6 * xgb_continuous_score
risk_level = classify(risk_score)  # Threshold-based
```

### 5.2 Feature Engineering Pipeline

```python
# scikit-learn Pipeline
pipeline = Pipeline([
    ('imputer', SimpleImputer(strategy='median')),
    ('scaler', StandardScaler()),
    ('poly', PolynomialFeatures(degree=2, include_bias=False)),
    ('selector', SelectKBest(f_classif, k=20)),
    ('classifier', RandomForestClassifier(...))
])
```

Key engineered features:
- `antecedent_rainfall_index`: Exponentially weighted 5-day rainfall accumulation.
- `slope_x_rainfall`: Interaction feature (slope angle × current rainfall intensity).
- `saturation_velocity`: Rate of change of soil saturation (dS/dt over last 30 min).

### 5.3 Training Data

Phase 1 (simulation-based):
- LHASA (Landslide Hazard Assessment for Situational Awareness) historical dataset from NASA.
- GSI (Geological Survey of India) Uttarakhand landslide inventory records.
- Synthetic data augmentation using physics-based slope stability simulation.
- ~15,000 labeled samples; class distribution: 60% LOW, 25% MODERATE, 10% HIGH, 5% CRITICAL.

Phase 2 (sensor-augmented):
- Real sensor readings from deployed hardware.
- Verified event labels from SDRF incident reports.
- Continuous online learning pipeline.

### 5.4 Model Versioning

Models stored in `/models/` directory with version tags:
```
models/
├── rf_v1.2.0.pkl
├── xgb_v1.2.0.pkl
├── pipeline_v1.2.0.pkl
├── metadata_v1.2.0.json   ← training date, metrics, feature schema
└── current -> v1.2.0       ← symlink to active version
```

Hot-swap via FastAPI endpoint `POST /models/{version}/load` — loads new model into memory without restart.

### 5.5 Model Performance Targets

| Metric | Target | Current (v1.2.0) |
|--------|--------|-----------------|
| Precision (HIGH+CRITICAL) | > 0.80 | 0.84 |
| Recall (HIGH+CRITICAL) | > 0.90 | 0.93 |
| F1 Score (weighted) | > 0.85 | 0.88 |
| AUC-ROC (binary HIGH+) | > 0.90 | 0.91 |
| Inference latency | < 500ms | ~180ms |

---

## 6. IoT Communication — MQTT

### 6.1 Why MQTT

MQTT (Message Queuing Telemetry Transport) is the de-facto standard for IoT sensor communication:

- **Low bandwidth:** Binary protocol with minimal header overhead. Suitable for sensors transmitting over NB-IoT or GSM at 10–50 bytes/message.
- **Pub/Sub decoupling:** Sensors publish to topics; backend subscribes. Adding new sensors requires no backend code changes.
- **QoS levels:** QoS 1 (at-least-once delivery) ensures no readings are lost during brief connectivity interruptions.
- **Last Will and Testament (LWT):** Broker automatically publishes an offline message if a sensor disconnects unexpectedly — enabling automatic dead-sensor detection.

### 6.2 Topic Schema

```
sensors/{zone_id}/{sensor_id}/readings      ← Sensor publishes readings here
sensors/{zone_id}/{sensor_id}/status        ← Online/offline status
sensors/{zone_id}/{sensor_id}/battery       ← Battery level
system/alerts/{zone_id}                     ← Backend publishes alerts here
```

### 6.3 Broker

- **Phase 1:** HiveMQ Cloud (free tier, 100 connections, 10GB/month) — zero infrastructure management.
- **Phase 2:** Self-hosted Eclipse Mosquitto in Docker for full control and cost savings at scale.

### 6.4 Sensor Payload Format

```json
{
  "sensor_id": "CHM-GAUCHAR-001",
  "zone_id": "zone_gauchar_01",
  "ts": 1718000000,
  "soil_saturation_pct": 78.4,
  "vibration_mps2": 0.12,
  "battery_pct": 87,
  "firmware_ver": "1.0.4"
}
```

---

## 7. Alert Delivery — Twilio / MSG91 / WhatsApp / IVR

### 7.1 SMS — Twilio (Primary) / MSG91 (Fallback)

**Twilio** is the primary SMS gateway:
- Programmable Messaging API with Node.js SDK.
- India DLT-compliant sender ID registration required.
- Delivery status webhooks for receipt tracking.
- Cost: ~₹0.35–0.50 per SMS (India routes).
- Retry on failure: Celery task retry with exponential backoff.

**MSG91** is the fallback gateway:
- India-first provider with better Tier-2/3 city route coverage.
- Activated automatically if Twilio returns 5xx errors or rate limit.
- Configured via environment variable: `SMS_PROVIDER=twilio|msg91`.

### 7.2 WhatsApp — WhatsApp Business API

- Accessed via **Twilio's WhatsApp integration** (sandbox for development, production API for deployment).
- Template messages required for outbound (non-session) alerts — templates pre-approved by Meta in Hindi.
- Delivered at same time as SMS for opted-in subscribers.
- Rich formatting: bold, bullets, emoji allowed.
- 24-hour session window for follow-up messages post-alert.

### 7.3 IVR Voice Calls

- Provider: **Exotel** (India-based, reliable rural connectivity) or Twilio Voice.
- Pre-recorded Hindi audio files triggered via API.
- DTMF input: "1 to repeat, 2 to connect to SDRF dispatch."
- Used for subscribers flagged `literacy_support=true` and village pradhans.
- Cost: ~₹1.50–2.00 per call (30-second IVR).

### 7.4 Alert Dispatch Architecture

```python
# Celery task chain for alert dispatch
chain(
    fetch_subscribers.s(zone_id),        # Query DB for subscriber list
    group([
        dispatch_sms_batch.s(chunk)      # SMS in parallel batches of 100
        for chunk in chunked(subscribers, 100)
    ]),
    dispatch_whatsapp_batch.s(),         # WhatsApp for opted-in
    dispatch_ivr_batch.s(),              # IVR for literacy-support flagged
    log_alert_delivery.s(),              # Write delivery stats to DB
)
```

---

## 8. Frontend — React + Leaflet.js + Tailwind CSS

### 8.1 React 18

**Why React:** The team's primary frontend competency. Component reusability between the citizen PWA and the official dashboard reduces duplication (shared design system, shared API hooks). React 18 Concurrent Features (Suspense, transitions) provide smooth loading states on slow mobile connections.

**Build Tool:** Vite (vs. Create React App) — 10–20× faster HMR in development; optimized production bundles.

**State Management:** Zustand (lightweight) for global state (current risk levels, user session). React Query for server state (API data fetching, caching, background refresh). No Redux — overkill for this scale.

### 8.2 PWA Configuration

```json
// manifest.json
{
  "name": "HH-LEWS — भूस्खलन चेतावनी",
  "short_name": "LEWS",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FFFFFF",
  "theme_color": "#1E40AF",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "lang": "hi"
}
```

**Service Worker (Workbox):**
- Cache strategy: NetworkFirst for API calls with CacheFirst fallback.
- Offline fallback page served from cache.
- Background sync for subscriber registration when offline.
- Push notification support (Phase 2 — requires user permission grant).

### 8.3 Leaflet.js

**Why Leaflet over Google Maps / Mapbox:**
- Open source, no API key required for base tiles (OpenStreetMap).
- React-Leaflet wrapper provides clean component integration.
- PostGIS GeoJSON output renders directly as Leaflet GeoJSON layers.
- Lightweight (142KB) vs. Google Maps (500KB+).
- **Tile caching:** Leaflet.offline plugin caches tiles for the user's district at install time — critical for offline map use.

**Plugins used:**
- `react-leaflet` — React wrapper.
- `leaflet.heat` — Heatmap layer for risk visualization.
- `leaflet-offline` — Offline tile caching.
- `leaflet.markercluster` — Cluster sensor markers at low zoom.

### 8.4 Tailwind CSS

**Why Tailwind:** Utility-first approach allows rapid UI iteration without CSS file explosion. PurgeCSS integration in Vite build eliminates unused styles — final CSS bundle ~15KB. Consistent spacing/color tokens align with the design token system defined in the UX document.

**Custom Tailwind configuration** adds the HH-LEWS risk color palette:
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        risk: {
          low: '#22C55E',
          moderate: '#F59E0B',
          high: '#EF4444',
          critical: '#7F1D1D',
        }
      }
    }
  }
}
```

### 8.5 Recharts

Used in the official dashboard for:
- 24-hour risk score sparklines per zone.
- Alert volume trend bar charts.
- Sensor reading time series.
- ML prediction distribution pie charts.

---

## 9. Infrastructure — Docker + AWS / DigitalOcean

### 9.1 Docker Compose (Development / Pilot)

```yaml
# docker-compose.yml (abbreviated)
services:
  postgres:
    image: postgis/postgis:15-3.3
    volumes: ["pgdata:/var/lib/postgresql/data"]
    environment: [POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD]

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes

  mqtt:
    image: eclipse-mosquitto:2.0
    volumes: ["./mosquitto.conf:/mosquitto/config/mosquitto.conf"]

  api:
    build: ./backend/node
    depends_on: [postgres, redis]
    ports: ["3000:3000"]
    environment: [DATABASE_URL, REDIS_URL, JWT_SECRET, ...]

  ml:
    build: ./backend/python
    depends_on: [postgres, redis]
    ports: ["8000:8000"]
    volumes: ["./models:/app/models"]

  celery_worker:
    build: ./backend/python
    command: celery -A tasks worker --loglevel=info -Q polling,inference,alerts
    depends_on: [postgres, redis, mqtt]

  celery_beat:
    build: ./backend/python
    command: celery -A tasks beat --loglevel=info
    depends_on: [redis]

  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes: ["./nginx.conf:/etc/nginx/nginx.conf", "./frontend/dist:/usr/share/nginx/html"]
    depends_on: [api, ml]

volumes:
  pgdata:
```

### 9.2 Production Deployment (AWS)

```
AWS Account
├── EC2 t3.medium (2 vCPU, 4GB RAM)     ← Application server
│   ├── Docker: api (Node.js)
│   ├── Docker: ml (FastAPI)
│   ├── Docker: celery_worker × 2
│   ├── Docker: celery_beat
│   └── Docker: nginx (reverse proxy)
│
├── EC2 t3.small (2 vCPU, 2GB RAM)      ← Database server
│   ├── Docker: postgres + PostGIS
│   └── Docker: redis
│
├── EC2 t3.micro                          ← MQTT broker
│   └── Docker: mosquitto
│
├── S3 Bucket                             ← Static frontend assets
├── CloudFront CDN                        ← PWA delivery
├── Route53                               ← DNS
├── ACM                                   ← SSL/TLS certificates
└── CloudWatch                            ← Logs + alerts
```

### 9.3 DigitalOcean Alternative

For cost-optimized deployment:
- 2× Droplets ($12/month each): App server + DB server.
- DigitalOcean Managed PostgreSQL ($15/month) instead of self-managed.
- Spaces (S3-compatible) for static files ($5/month).
- Total: ~$40–55/month fully operational.

### 9.4 Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name hhlews.in;

    # Serve React frontend
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests
    location /api/ {
        proxy_pass http://api:3000/;
        proxy_set_header X-Real-IP $remote_addr;
        rate_limit_zone $binary_remote_addr zone=api:10m rate=100r/m;
    }

    # Proxy ML service (internal only via API, not public)
    location /ml/ {
        allow 172.0.0.0/8;  # Docker internal only
        deny all;
        proxy_pass http://ml:8000/;
    }
}
```

---

## 10. Alternatives Considered

| Decision | Choice | Alternatives Considered | Reason Rejected |
|----------|--------|------------------------|-----------------|
| ML framework | scikit-learn + XGBoost | TensorFlow, PyTorch, LightGBM | TF/PyTorch: overkill for tabular data, larger container. LightGBM: viable but XGBoost has wider community + SHAP support |
| Geospatial DB | PostGIS | MongoDB (with geo), Elasticsearch, SpatiaLite | MongoDB lacks advanced spatial functions (ST_Contains performance at scale). ES not a transactional DB. SpatiaLite: lacks concurrent write handling |
| Task Queue | Celery + Redis | Bull (Node.js), Kafka, RabbitMQ | Bull: Node.js only, can't share with Python workers. Kafka: operational complexity for this scale. RabbitMQ: additional service to manage vs. reusing Redis |
| SMS Gateway | Twilio + MSG91 | AWS SNS, Kaleyra, ValueFirst | AWS SNS: no Hindi WhatsApp. Kaleyra/ValueFirst: less reliable SDK documentation |
| Frontend | React | Next.js, Vue, Svelte | Next.js: SSR overkill for PWA; static export mode would suffice but adds complexity. Vue/Svelte: smaller community for team's context |
| Maps | Leaflet.js | Google Maps, Mapbox, Deck.gl | Google Maps: API key cost at scale, no offline tile support. Mapbox: paid tier needed for custom styles. Deck.gl: GPU-required for full feature set |
| Cache | Redis | Memcached, DynamoDB DAX | Memcached: no pub/sub for Celery broker. DAX: AWS lock-in, cost |
| Backend language (main) | Node.js | Go, Django/DRF, Spring | Go: team unfamiliar. Django: Python dep conflicts with ML service. Spring: JVM overhead unnecessary |

---

## 11. Data Flow Diagram

```
╔══════════════════════════════════════════════════════════════════════╗
║                    HH-LEWS DATA FLOW                                 ║
╚══════════════════════════════════════════════════════════════════════╝

EXTERNAL SOURCES                INGEST LAYER              STORAGE
┌─────────────────┐             ┌───────────┐             ┌──────────┐
│ OpenWeatherMap  │──HTTP GET──▶│           │────────────▶│PostgreSQL│
│ API (rainfall)  │             │  Celery   │             │+PostGIS  │
└─────────────────┘             │  Workers  │             │          │
                                │           │◀────────────│          │
┌─────────────────┐             │  (polling │             └──────────┘
│ SRTM Static     │──Pre-loaded▶│   queue)  │
│ GeoTIFF Data    │  at startup │           │             ┌──────────┐
└─────────────────┘             └───────────┘             │  Redis   │
                                      │                   │  Cache   │
┌─────────────────┐                   │                   └──────────┘
│ IoT Sensors /   │──MQTT Pub─▶┌──────────────┐                │
│ Simulated Data  │             │ MQTT Broker  │                │
└─────────────────┘             │ (Mosquitto)  │                │
                                └──────┬───────┘                │
                                       │ Subscribe               │
                                       ▼                         │
                                ┌────────────────┐              │
                                │ Celery Sensor  │              │
                                │ Ingest Worker  │──────────────▶
                                └────────────────┘

                    INFERENCE LAYER
                    ┌────────────────────────────────────┐
                    │  Celery Inference Worker            │
                    │                                    │
                    │  1. Fetch zone features from DB/Cache
                    │  2. POST to FastAPI /predict        │
                    │  3. Receive risk_score + level      │
                    │  4. Write to predictions table      │
                    │  5. Update Redis risk:{zone_id}     │
                    │  6. Evaluate threshold breach?      │
                    └──────────────┬─────────────────────┘
                                   │ Threshold breached
                                   ▼
                    ALERT DECISION LAYER
                    ┌────────────────────────────────────┐
                    │  Alert Trigger Engine (Node.js)    │
                    │                                    │
                    │  - Check suppression flag (Redis)  │
                    │  - Check cooldown (Redis TTL)      │
                    │  - Fetch subscriber list (PG)      │
                    │  - Enqueue alert tasks (Celery)    │
                    └──────────────┬─────────────────────┘
                                   │
                    ┌──────────────┼───────────────────┐
                    ▼              ▼                   ▼
             ┌──────────┐  ┌──────────────┐  ┌──────────────┐
             │ SMS Task │  │ WhatsApp Task│  │  IVR Task    │
             │ (Twilio/ │  │ (WA Business │  │  (Exotel)    │
             │  MSG91)  │  │    API)      │  │              │
             └──────────┘  └──────────────┘  └──────────────┘
                    │              │                   │
                    └──────────────┴───────────────────┘
                                   │ Delivery status callbacks
                                   ▼
                    ┌────────────────────────────────────┐
                    │  Alert Event Log (PostgreSQL)       │
                    └────────────────────────────────────┘

                    PRESENTATION LAYER
                    ┌────────────────────┐  ┌────────────────────┐
                    │  Official Dashboard│  │  Citizen PWA        │
                    │  (React + Leaflet) │  │  (React + Tailwind) │
                    │  ← WebSocket (WS)  │  │  ← REST API polling │
                    │  ← REST API        │  │  ← Service Worker   │
                    └────────────────────┘  └────────────────────┘
                              │                        │
                              └────────────┬───────────┘
                                           ▼
                              ┌─────────────────────────┐
                              │  Node.js API (Express)   │
                              │  JWT Auth | WebSocket    │
                              │  REST endpoints          │
                              └─────────────────────────┘
```

---

## 12. Scaling Strategy

### 12.1 Horizontal Scaling Triggers

| Service | Scale Trigger | Scale Action |
|---------|--------------|--------------|
| Celery alert workers | Alert queue depth > 1000 | Add worker containers |
| FastAPI ML service | Inference latency p99 > 500ms | Add ML container replicas |
| Node.js API | CPU > 70% or response time > 500ms | Add API replicas behind Nginx upstream |
| PostgreSQL | Query time degradation | Add read replicas; partition sensor_readings |

### 12.2 Database Read Scaling

For 500+ zones with 5-minute polling:
- Add 1× PostgreSQL read replica.
- Route all SELECT queries (dashboard reads, subscriber lookups) to replica.
- Write-only on primary (sensor ingest, prediction writes, alert logs).
- PostGIS spatial indexes ensure geo queries remain < 10ms even at 500 zones.

### 12.3 Phase 2 Scaling Path (10,000+ zones)

- Migrate to AWS RDS Aurora PostgreSQL (auto-scaling read replicas).
- Introduce Amazon SQS alongside Celery for guaranteed-delivery alert dispatch at scale.
- ElastiCache for Redis (managed, multi-AZ).
- Kubernetes (EKS) for container orchestration.
- Separate MQTT broker cluster (EMQX Enterprise) for 10,000+ concurrent sensor connections.

---

## 13. Cost Optimization

### 13.1 Free Tier Usage

| Service | Free Tier | HH-LEWS Usage |
|---------|-----------|--------------|
| OpenWeatherMap | 1,000 calls/day | ~500 zones × 288 calls/day = 144,000 → **requires paid $40/mo plan at 500 zones** |
| OpenWeatherMap | Free tier sufficient for ≤3 zones (dev/demo) | Dev/demo environment |
| HiveMQ Cloud | 100 MQTT connections, 10GB/month | Sufficient for pilot (50 sensors) |
| Twilio | $15 trial credit | ~300 SMS → pilot testing |
| AWS EC2 t3.micro | 750 hours/month free (12 months) | Dev environment |
| GitHub Actions | 2,000 minutes/month free | CI/CD pipeline |
| UptimeRobot | 50 monitors free | System health monitoring |

### 13.2 Production Cost Estimate (50-zone pilot)

| Item | Provider | Monthly Cost |
|------|----------|-------------|
| App server (t3.medium) | AWS EC2 | $30 |
| DB server (t3.small) | AWS EC2 | $17 |
| MQTT broker (t3.micro) | AWS EC2 | $9 |
| Weather API (500 calls/day) | OpenWeatherMap Current $40/mo | $40 |
| SMS alerts (est. 5,000/month) | Twilio | $18 |
| WhatsApp alerts | Twilio | $5 |
| Domain + SSL | Route53 + ACM | $1 |
| **Total** | | **~$120/month** |

### 13.3 Cost Reduction Options

- Switch to Open-Meteo (fully free, no key required) for weather data — saves $40/month at pilot scale.
- Use MSG91 instead of Twilio for SMS — 30–40% lower India rates.
- DigitalOcean instead of AWS — $40–55/month total for equivalent compute.

---

## 14. Technology Decision Log

| Date | Decision | Rationale | Decided By |
|------|----------|-----------|-----------|
| 2025-05-01 | FastAPI over Django for ML service | Django REST Framework adds unnecessary ORM layer for a stateless inference service | Engineering Lead |
| 2025-05-01 | PostgreSQL + PostGIS over MongoDB | Spatial query performance and ACID compliance for alert log | DB Lead |
| 2025-05-08 | Redis as dual-purpose cache + broker | Reduces operational complexity; eliminates RabbitMQ | Engineering Lead |
| 2025-05-08 | Random Forest + XGBoost ensemble | Best precision/recall balance on tabular geo-temporal data per literature review | ML Lead |
| 2025-05-15 | Leaflet.js over Mapbox | Zero cost, offline tile support critical for rural deployment | Frontend Lead |
| 2025-05-20 | Twilio as primary with MSG91 fallback | Twilio reliability + MSG91 India rural coverage | Engineering Lead |

---

*Document controlled by HH-LEWS Engineering Team. Stack changes require ADR (Architecture Decision Record) entry.*
