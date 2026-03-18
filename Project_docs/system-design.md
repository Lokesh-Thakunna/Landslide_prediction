# HH-LEWS — System Design Document

**Document Version:** 1.0.0  
**Last Updated:** 2025-06-14  
**Status:** Active  
**Owner:** HH-LEWS Engineering Lead

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Microservices Separation](#2-microservices-separation)
3. [Data Ingestion Pipeline](#3-data-ingestion-pipeline)
4. [ML Inference Flow](#4-ml-inference-flow)
5. [Alert Trigger Logic](#5-alert-trigger-logic)
6. [Failover & Resilience Strategy](#6-failover--resilience-strategy)
7. [Scaling Considerations](#7-scaling-considerations)
8. [Deployment Topology](#8-deployment-topology)
9. [Network & Communication Patterns](#9-network--communication-patterns)
10. [Data Storage Architecture](#10-data-storage-architecture)

---

## 1. High-Level Architecture

### 1.1 ASCII System Architecture Diagram

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                        HH-LEWS HIGH-LEVEL ARCHITECTURE                          ║
╚══════════════════════════════════════════════════════════════════════════════════╝

  EXTERNAL WORLD                  DMZ / EDGE                    INTERNAL NETWORK
  ──────────────                  ──────────                    ────────────────

  ┌─────────────┐                                              ┌─────────────────┐
  │ OpenWeather │◀──── HTTPS ─────────────────────────────────▶│ Celery Polling  │
  │ Map API     │                                              │ Workers (Python)│
  └─────────────┘                                              └────────┬────────┘
                                                                        │
  ┌─────────────┐                                                        │ task result
  │ Backup      │◀── HTTPS (fallback) ───────────────────────────────── │
  │ Weather API │                                              ┌────────▼────────┐
  └─────────────┘                                              │   PostgreSQL    │
                                                               │   + PostGIS     │
  ┌──────────────┐                ┌──────────┐                 │                 │
  │ IoT Sensors  │─── MQTT/TLS ──▶│  MQTT    │────────────────▶│  sensor_readings│
  │ (simulated   │                │  Broker  │                 │  zones          │
  │  in Phase 1) │                │(Mosquitto│                 │  predictions    │
  └──────────────┘                └──────────┘                 │  alert_events   │
                                                               │  subscribers    │
                                       ┌─────────────────────▶│  users          │
                                       │                       └────────┬────────┘
                                       │                                │
                          ┌────────────┴────────┐                       │ read/write
                          │   Celery Beat        │                       │
                          │  (Scheduler)         │                       │
                          └────────────┬────────┘               ┌───────▼────────┐
                                       │ periodic tasks          │    Redis 7     │
                                       ▼                         │  ┌──────────┐  │
                          ┌────────────────────────┐             │  │  Cache   │  │
                          │  Celery Workers         │◀────────────│  │  (risk,  │  │
                          │                         │             │  │  weather)│  │
                          │  Queue: polling         │             │  └──────────┘  │
                          │  Queue: inference  ─────┼────────────▶│  ┌──────────┐  │
                          │  Queue: alerts          │             │  │  Broker  │  │
                          │  Queue: maintenance     │             │  │ (Celery) │  │
                          └─────────┬───────────────┘             │  └──────────┘  │
                                    │                             └────────────────┘
                                    │ HTTP (internal)
                                    ▼
                          ┌─────────────────────┐
                          │  FastAPI ML Service  │
                          │  (Python 3.11)       │
                          │                      │
                          │  POST /predict        │
                          │  POST /predict/batch  │
                          │  GET  /health         │
                          │  GET  /docs (Swagger) │
                          │                      │
                          │  [RF Model v1.2]      │
                          │  [XGBoost v1.2]       │
                          │  [Pipeline v1.2]      │
                          └─────────────────────┘
                                    │
                                    │ risk scores
                                    ▼
                          ┌─────────────────────┐
                          │  Alert Engine        │
                          │  (Node.js + Express) │
                          │                      │
                          │  Threshold check     │
                          │  Cooldown check      │
                          │  Subscriber lookup   │
                          │  Dispatch trigger    │
                          └──────────┬──────────┘
                                     │
               ┌─────────────────────┼──────────────────────┐
               │                     │                      │
               ▼                     ▼                      ▼
    ┌────────────────┐   ┌──────────────────┐   ┌─────────────────┐
    │   Twilio/      │   │   WhatsApp        │   │  IVR Voice       │
    │   MSG91 SMS    │   │   Business API    │   │  (Exotel)        │
    └────────┬───────┘   └────────┬─────────┘   └───────┬─────────┘
             │                   │                      │
             └───────────────────┼──────────────────────┘
                                 │ delivery receipts
                                 ▼
                    ┌─────────────────────────────┐
                    │  alert_events (PostgreSQL)   │
                    └─────────────────────────────┘

  CITIZEN INTERFACE               EDGE                    OFFICIAL INTERFACE
  ─────────────────               ────                    ──────────────────

  ┌─────────────────┐  HTTPS  ┌─────────┐  WebSocket  ┌──────────────────────┐
  │  Citizen PWA    │◀───────▶│  Nginx  │◀────────────▶│  Official Dashboard  │
  │  (React + TW)   │         │ Reverse │             │  (React + Leaflet)   │
  │  Hindi UI       │         │  Proxy  │    REST     │  JWT Protected       │
  │  Service Worker │         │         │◀────────────▶│  Role-Based Access   │
  │  Offline Cache  │         │         │             │                      │
  └─────────────────┘         └─────────┘             └──────────────────────┘
                                   │
                                   ▼
                         Node.js API (port 3000)
                         JWT Auth | REST | WebSocket
```

### 1.2 Component Interaction Summary

| Component A | Interaction Type | Component B | Protocol |
|-------------|-----------------|-------------|----------|
| Celery Workers | Poll | OpenWeatherMap API | HTTPS REST |
| IoT Sensors | Publish | MQTT Broker | MQTT 3.1.1 / TLS |
| Celery Workers | Subscribe | MQTT Broker | MQTT |
| Celery Workers | Write | PostgreSQL | TCP (asyncpg) |
| Celery Workers | Read/Write | Redis | TCP |
| Celery Workers | HTTP POST | FastAPI ML | HTTP (internal) |
| FastAPI ML | Read | PostgreSQL (zone features) | TCP |
| Node.js API | Read/Write | PostgreSQL | TCP |
| Node.js API | Read/Write | Redis | TCP |
| Node.js API | HTTP POST | FastAPI ML | HTTP (internal) |
| Celery Alert Workers | Dispatch | Twilio SMS API | HTTPS |
| Celery Alert Workers | Dispatch | WhatsApp API | HTTPS |
| Celery Alert Workers | Dispatch | Exotel IVR | HTTPS |
| Nginx | Proxy | Node.js API | HTTP (internal) |
| Nginx | Serve | React PWA static files | Filesystem |
| Citizen PWA | REST | Node.js API via Nginx | HTTPS |
| Dashboard | REST + WebSocket | Node.js API via Nginx | HTTPS + WSS |

---

## 2. Microservices Separation

### 2.1 Service Boundaries

```
┌─────────────────────────────────────────────────────────────────────┐
│                       SERVICE REGISTRY                               │
├──────────────────┬──────────────┬────────────┬──────────────────────┤
│ Service          │ Language     │ Port       │ Responsibility       │
├──────────────────┼──────────────┼────────────┼──────────────────────┤
│ hhlews-api       │ Node.js 20   │ 3000       │ Auth, REST, WebSocket│
│ hhlews-ml        │ Python 3.11  │ 8000       │ ML inference, models │
│ hhlews-worker    │ Python 3.11  │ (no HTTP)  │ Async task processing│
│ hhlews-scheduler │ Python 3.11  │ (no HTTP)  │ Periodic job trigger │
│ hhlews-nginx     │ Nginx 1.25   │ 80, 443    │ Reverse proxy, TLS   │
│ hhlews-postgres  │ PG 15+PostGIS│ 5432       │ Primary data store   │
│ hhlews-redis     │ Redis 7      │ 6379       │ Cache + message broker│
│ hhlews-mqtt      │ Mosquitto 2  │ 8883       │ IoT sensor broker    │
└──────────────────┴──────────────┴────────────┴──────────────────────┘
```

### 2.2 Why These Boundaries

**Node.js API and FastAPI ML are separate services because:**
- Python ML dependencies (numpy, scikit-learn, XGBoost, GDAL, rasterio) are large and Python-specific. Mixing with Node.js would require a subprocess approach or complex inter-language binding.
- ML models need independent deployment lifecycle — a model update should not require API server restart.
- ML service CPU profile (inference bursts) differs from API service profile (I/O-bound, high concurrency) — separate containers enable independent resource allocation.

**Celery workers are separate from the API because:**
- Alert dispatch and weather polling are long-running, potentially CPU/network-intensive tasks.
- Async tasks should not block the request-response cycle of the API server.
- Worker count can be scaled independently from API instances.

**MQTT broker is separate because:**
- IoT sensor connections are persistent (long-lived TCP connections) — a different traffic pattern from short-lived HTTP requests.
- MQTT broker state (connection registry, LWT) must persist independently of application restarts.

---

## 3. Data Ingestion Pipeline

### 3.1 Weather Data Pipeline

```
Every 5 minutes (Celery Beat trigger)
│
▼
poll_all_zones task
│
├── Fetch active zones list from Redis cache
│   (or PostgreSQL if cache miss)
│
├── For each zone (centroid coordinates):
│   │
│   ├── Check Redis: weather:{lat}:{lon} (TTL 5 min)
│   │   ├── HIT  → use cached data, skip API call
│   │   └── MISS → call OpenWeatherMap API
│   │           │
│   │           ├── Success → parse, cache in Redis, return
│   │           └── Failure → try backup API (Open-Meteo)
│   │                   │
│   │                   ├── Success → parse, cache, return
│   │                   └── Failure → use last known value + flag stale
│   │
│   └── Write weather reading to weather_readings table
│
└── Trigger: inference_batch task (enqueue to inference queue)
```

**Weather data schema (stored):**
```python
{
    "zone_id": "uuid",
    "rainfall_mm_hr": 12.4,
    "humidity_pct": 94,
    "pressure_hpa": 998,
    "temperature_c": 18.2,
    "wind_speed_ms": 3.1,
    "recorded_at": "2025-06-14T14:30:00Z",
    "source": "openweathermap",  # or "openmeteo", "cached"
    "is_stale": False
}
```

### 3.2 Sensor Data Pipeline

```
IoT Sensor → MQTT Publish → Broker → Celery MQTT Subscriber Worker
│                                              │
│ Topic: sensors/{zone_id}/{sensor_id}/readings│
│ QoS: 1 (at-least-once delivery)             │
│                                             │
│                                    ┌────────▼────────┐
│                                    │ JSON Schema     │
│                                    │ Validation      │
│                                    └────────┬────────┘
│                                             │
│                                    ┌────────▼────────┐
│                                    │ Range Check     │
│                                    │ (anomaly detect)│
│                                    └────────┬────────┘
│                                             │
│                                    ┌────────▼────────┐
│                                    │ Write to        │
│                                    │ sensor_readings │
│                                    │ (PostgreSQL)    │
│                                    └────────┬────────┘
│                                             │
│                                    ┌────────▼────────┐
│                                    │ Update Redis:   │
│                                    │ sensor_last:{id}│
│                                    └────────┬────────┘
│                                             │
│                                    ┌────────▼────────┐
│                                    │ Update sensor   │
│                                    │ last_seen + bat │
│                                    │ in sensors table│
│                                    └─────────────────┘
```

**Sensor LWT (Last Will and Testament):**
```
Topic: sensors/{zone_id}/{sensor_id}/status
Payload: {"status": "offline", "ts": <timestamp>}
```

When a sensor disconnects without a clean DISCONNECT packet, the MQTT broker publishes this LWT message. Celery subscriber picks it up and marks the sensor as `status='offline'` in the database. Dashboard shows red sensor icon.

### 3.3 SRTM Data Pre-Processing Pipeline (One-Time)

```
SRTM GeoTIFF Files (downloaded from NASA EarthData)
│
▼
Python preprocessing script (run once at deployment)
│
├── Load GeoTIFF: rasterio.open("srtm_uttarakhand.tif")
├── Reproject to WGS84 (EPSG:4326) if needed
├── For each monitoring zone polygon:
│   ├── Clip raster to zone bounding box
│   ├── Compute: slope_avg, slope_max (using numpy gradient)
│   ├── Compute: aspect (using arctan2)
│   ├── Compute: profile_curvature
│   └── Write to zones table
└── Create PostGIS spatial index on zone geometry
```

This is a one-time initialization step, not a recurring pipeline. SRTM data is static for Phase 1; updated in Phase 2 with InSAR surface deformation detection.

---

## 4. ML Inference Flow

### 4.1 Inference Request Assembly

```
inference_batch task (triggered every 5 min)
│
▼
For each active zone:
│
├── 1. Load static features from zones table (cached in Redis for 1 hour)
│   │   slope_avg, slope_max, aspect_avg, curvature,
│   │   soil_type_code, historical_landslide_proximity_km
│
├── 2. Load dynamic weather features (from Redis cache)
│   │   rainfall_mm_hr, rainfall_72h_mm (computed from 72h rolling sum),
│   │   humidity_pct, pressure_hpa
│
├── 3. Load sensor features (from Redis sensor_last:{sensor_id})
│   │   soil_saturation_pct, vibration_mps2
│   │   [If sensor offline: use zone-average from last 24h]
│
├── 4. Compute engineered features
│   │   antecedent_rainfall_index = EWM(rainfall_72h, span=24)
│   │   slope_x_rainfall = slope_avg × rainfall_mm_hr
│   │   saturation_velocity = Δsaturation / Δtime (last 2 readings)
│
└── 5. Assemble PredictionRequest JSON, POST to FastAPI /predict
```

### 4.2 FastAPI Inference Execution

```
POST /predict (PredictionRequest received)
│
├── Pydantic validation (types, ranges)
│   └── Invalid → 422 response (not stored)
│
├── Feature preprocessing
│   ├── SimpleImputer (median fill for any remaining NaN)
│   ├── StandardScaler (normalize)
│   └── PolynomialFeatures (degree=2 interactions)
│
├── Random Forest inference
│   └── Returns: class probabilities [LOW, MOD, HIGH, CRIT]
│
├── XGBoost inference
│   └── Returns: continuous risk score (0.0–1.0)
│
├── Ensemble combination
│   └── risk_score = 0.4 × RF_HIGH_proba + 0.6 × XGB_score
│
├── Threshold classification
│   └── risk_level = classify(risk_score)
│
├── SHAP feature importance computation
│   └── Top 3 contributing features (for dashboard display)
│
└── Return PredictionResponse
```

### 4.3 Inference Result Processing

```
Celery inference worker receives PredictionResponse
│
├── Write to predictions table (full audit record)
│
├── Update Redis: risk:{zone_id}
│   └── {score, level, confidence, predicted_at}
│
├── Broadcast to WebSocket clients
│   └── Node.js emits: zone_risk_updated event to dashboard
│
└── Evaluate alert threshold
    ├── Is risk_score > HIGH_THRESHOLD (0.65)?
    │   ├── YES → alert_check task
    │   └── NO  → done
    │
    └── Was previous level also HIGH+ ? (two consecutive cycles)
        ├── YES → trigger alert dispatch
        └── NO  → mark as "watch" state, check next cycle
```

The two-consecutive-cycle requirement prevents single-reading spikes (data noise) from triggering alerts. A genuine developing landslide will show sustained elevated scores.

---

## 5. Alert Trigger Logic

### 5.1 Alert State Machine

```
                        ┌─────────────────┐
                        │      SAFE        │
                        │   (score < 0.65) │
                        └────────┬────────┘
                                 │ score ≥ 0.65
                                 ▼
                        ┌─────────────────┐
                        │    WATCH         │
                        │ (1 high cycle)   │
                        └────────┬────────┘
                                 │ score ≥ 0.65 AGAIN
                                 │ on next inference
                                 ▼
              ┌──────────────────────────────────┐
              │        CHECK SUPPRESSION         │
              │  Is alert_suppress:{zone_id}     │
              │  set in Redis?                   │
              └─────────────┬────────────────────┘
                            │
              ┌─────────────▼─────────────────┐
              │ YES (suppressed)               │ NO
              │ Log suppressed alert           │
              │ → No dispatch                  ▼
              └────────────────────  ┌─────────────────────┐
                                     │   ALERT TRIGGERED    │
                                     │                     │
                                     │ Fetch subscribers   │
                                     │ Compose message     │
                                     │ Enqueue dispatch    │
                                     │ Set cooldown TTL    │
                                     │   (30 min)          │
                                     └─────────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────────┐
                                    │   ALERT_ACTIVE       │
                                    │  (cooldown period)   │
                                    └──────────┬──────────┘
                                               │
                              ┌────────────────┼────────────────┐
                              │                │                │
                              ▼                ▼                │
                    score drops         score escalates         │
                    below 0.40          to CRITICAL             │
                    (two cycles)        (bypass cooldown)       │
                              │                │                │
                              ▼                ▼                │
                    ┌──────────────┐  ┌──────────────────┐     │
                    │  RESOLVED    │  │ NEW ALERT         │     │
                    │  Send        │  │ (CRITICAL)        │     │
                    │  resolution  │  │ dispatched        │     │
                    │  message     │  └──────────────────┘     │
                    └──────────────┘                           │
                                                               │
                                              cooldown expires │
                                              (30 min TTL)     │
                                                               ▼
                                                  Return to WATCH/SAFE
```

### 5.2 Alert Message Composition

```python
def compose_alert_message(zone: Zone, risk_level: str, channel: str) -> str:
    safe_zone = get_nearest_safe_zone(zone.id)
    district_helpline = get_district_helpline(zone.district)

    templates = {
        'HIGH': {
            'sms': (
                f"⚠️ भूस्खलन खतरा | {zone.name} | खतरा\n"
                f"तुरंत {safe_zone.name} जाएं।\n"
                f"हेल्पलाइन: {district_helpline}\n"
                f"-DDMO {zone.district}"
            ),
        },
        'CRITICAL': {
            'sms': (
                f"🔴 भूस्खलन खतरा | {zone.name} | अभी निकलें!\n"
                f"तुरंत {safe_zone.name} जाएं।\n"
                f"हेल्पलाइन: {district_helpline}\n"
                f"-DDMO {zone.district}"
            ),
        }
    }
    return templates[risk_level][channel]
```

---

## 6. Failover & Resilience Strategy

### 6.1 Component Failure Scenarios

```
┌────────────────────┬───────────────────────────────────────────────────┐
│ Failed Component   │ Behavior & Fallback                               │
├────────────────────┼───────────────────────────────────────────────────┤
│ OpenWeatherMap API │ Automatic switch to Open-Meteo API within 30s.    │
│                    │ If both fail: use last cached value (stale flag).  │
│                    │ ML inference runs with stale rainfall; confidence  │
│                    │ downgraded by 0.1. Dashboard shows "⚠️ Stale data" │
├────────────────────┼───────────────────────────────────────────────────┤
│ IoT Sensor offline │ ML uses zone-average saturation from last 24h.    │
│                    │ Sensor shown as offline on dashboard.              │
│                    │ Alerts still fire if other features warrant.       │
├────────────────────┼───────────────────────────────────────────────────┤
│ FastAPI ML service │ Celery workers catch HTTP timeout/error.           │
│                    │ Retry 3× with 30s backoff.                        │
│                    │ If still failing: use rule-based fallback:         │
│                    │ IF rainfall_mm_hr > 30 AND slope > 35°            │
│                    │ THEN risk = HIGH (conservative estimate).          │
│                    │ Alert if rule fires. Dashboard shows "ML offline". │
├────────────────────┼───────────────────────────────────────────────────┤
│ Redis failure      │ Celery falls back to DB-based queuing (slower).   │
│                    │ Risk cache bypassed — DB queried directly.         │
│                    │ Alert cooldowns managed in DB (alert_events table) │
├────────────────────┼───────────────────────────────────────────────────┤
│ PostgreSQL failure │ All write operations fail. Celery tasks retry.    │
│                    │ Reads served from Redis cache where available.     │
│                    │ Alert dispatch halted (cannot fetch subscribers).  │
│                    │ PG auto-restart in Docker (restart: always).       │
│                    │ Failover to read-replica if available.             │
├────────────────────┼───────────────────────────────────────────────────┤
│ Twilio SMS failure │ Switch to MSG91 automatically (fallback provider). │
│                    │ If both fail: queue for retry up to 4 hours.      │
│                    │ WhatsApp dispatch continues independently.         │
├────────────────────┼───────────────────────────────────────────────────┤
│ Node.js API down   │ Nginx returns 502. Citizens see offline PWA       │
│                    │ (Service Worker serves cached risk data).          │
│                    │ Docker restart policy: restart: always.            │
│                    │ ML+Celery continue to run and dispatch SMS.        │
├────────────────────┼───────────────────────────────────────────────────┤
│ MQTT Broker down   │ Sensors queue messages locally (QoS 1 persistence)│
│                    │ Reconnect on broker recovery. Messages delivered.  │
│                    │ Phase 1 (simulated sensors): task uses defaults.   │
└────────────────────┴───────────────────────────────────────────────────┘
```

### 6.2 Rule-Based ML Fallback

The rule-based fallback ensures alerts continue even when the ML service is unavailable:

```python
RULE_BASED_THRESHOLDS = [
    # (condition_fn, risk_level)
    (lambda f: f['rainfall_mm_hr'] > 50 and f['slope_degrees'] > 40, 'CRITICAL'),
    (lambda f: f['rainfall_mm_hr'] > 30 and f['slope_degrees'] > 35, 'HIGH'),
    (lambda f: f['rainfall_72h_mm'] > 150 and f['soil_saturation_pct'] > 85, 'HIGH'),
    (lambda f: f['rainfall_mm_hr'] > 20 and f['slope_degrees'] > 30, 'MODERATE'),
]

def rule_based_risk(features: dict) -> tuple[str, float]:
    for condition, level in RULE_BASED_THRESHOLDS:
        if condition(features):
            return level, 0.5  # Conservative confidence
    return 'LOW', 0.5
```

These thresholds are derived from published rainfall-triggered landslide intensity thresholds for the Himalayas (Guzzetti et al., 2008; Kanungo & Sharma, 2014).

### 6.3 Offline PWA Fallback

```javascript
// service-worker.js (Workbox-based)
const RISK_CACHE = 'risk-data-v1';
const RISK_API = '/api/zones/risk';

// NetworkFirst strategy: try network, fall back to cache
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: RISK_CACHE,
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxAgeSeconds: 86400 }),  // 24 hour cache
    ],
  })
);

// If completely offline: serve cached risk + show stale warning
self.addEventListener('fetch', (event) => {
  if (!navigator.onLine) {
    // Return cached data with stale header
    event.respondWith(
      caches.match(event.request).then(response => {
        if (response) {
          const staleResponse = new Response(response.body, {
            headers: { ...response.headers, 'X-Data-Stale': 'true' }
          });
          return staleResponse;
        }
        return new Response(JSON.stringify({
          risk_level: 'UNKNOWN',
          message: 'डेटा उपलब्ध नहीं — सावधानी बरतें'
        }), { headers: { 'Content-Type': 'application/json' } });
      })
    );
  }
});
```

---

## 7. Scaling Considerations

### 7.1 Vertical Scaling Limits

| Service | Phase 1 (t3.medium) | Phase 2 Ceiling | Trigger |
|---------|--------------------|-----------------|---------| 
| Node.js API | 200 concurrent WS clients | 2,000 | CPU > 70% |
| FastAPI ML | 50 predictions/sec | 500/sec (2 instances) | Latency > 500ms p99 |
| PostgreSQL | 500 zones, 100K subscribers | 10K zones, 1M subscribers | Query time > 100ms |
| Redis | 500MB working set | 8GB (larger instance) | Memory > 80% |
| Celery Workers | 8 workers (alerts) | 40 workers | Queue depth > 1000 |

### 7.2 Horizontal Scaling Architecture (Phase 2)

```
                    ┌─────────────────────────────────────────┐
                    │            AWS Application              │
                    │          Load Balancer (ALB)            │
                    └──────────────┬──────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
    │ API Instance │   │ API Instance │   │ API Instance │
    │  (EC2 #1)    │   │  (EC2 #2)    │   │  (EC2 #3)    │
    └──────────────┘   └──────────────┘   └──────────────┘
              │                    │                    │
              └────────────────────┼────────────────────┘
                                   │ (all connect to shared services)
                    ┌──────────────▼──────────────────────────┐
                    │         Shared Infrastructure            │
                    │                                         │
                    │  ┌──────────────┐  ┌──────────────┐     │
                    │  │  RDS Aurora   │  │  ElastiCache  │     │
                    │  │  PostgreSQL  │  │  Redis        │     │
                    │  │  (Primary +  │  │  (Multi-AZ)   │     │
                    │  │  2 Replicas) │  │               │     │
                    │  └──────────────┘  └──────────────┘     │
                    │                                         │
                    │  ┌──────────────┐  ┌──────────────┐     │
                    │  │  ML Service  │  │  Celery       │     │
                    │  │  × 3 inst.  │  │  Workers × N  │     │
                    │  │  (ALB)       │  │  (ECS)        │     │
                    │  └──────────────┘  └──────────────┘     │
                    └─────────────────────────────────────────┘
```

### 7.3 Database Partitioning at Scale

For 10,000+ zones with 5-minute sensor readings:
- `sensor_readings`: Monthly range partitions (auto-created).
- `predictions`: Weekly range partitions.
- `alert_events`: Yearly range partitions.
- Partition pruning ensures queries only scan relevant partitions.
- Separate tablespace for historical data (cheaper storage).

---

## 8. Deployment Topology

### 8.1 Phase 1 — Pilot (50 zones, Docker Compose)

```
┌─────────────────────────────────────────────────────────────┐
│               AWS EC2 t3.medium (App Server)                 │
│                                                             │
│  ┌─────────┐  ┌──────────┐  ┌─────────────────────────┐    │
│  │  Nginx  │  │ Node.js  │  │  FastAPI ML Service      │    │
│  │ :80/443 │  │ API :3000│  │  :8000 (internal only)  │    │
│  └────┬────┘  └────┬─────┘  └─────────────────────────┘    │
│       │            │                                        │
│  ┌────▼────────────▼──────────────────────────────────┐     │
│  │              Docker Internal Network               │     │
│  │                 172.20.0.0/16                      │     │
│  └────────────────────────────────────────────────────┘     │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Celery Worker×2 │  │  Celery Beat    │                  │
│  │ (all queues)    │  │  (Scheduler)    │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               AWS EC2 t3.small (DB Server)                   │
│                                                             │
│  ┌────────────────────┐  ┌────────────────────┐            │
│  │ PostgreSQL 15      │  │   Redis 7           │            │
│  │ + PostGIS 3.3      │  │   (Cache+Broker)    │            │
│  │ :5432 (internal)   │  │   :6379 (internal)  │            │
│  └────────────────────┘  └────────────────────┘            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               AWS EC2 t3.micro (MQTT)                       │
│  ┌────────────────────────────────────────────────────┐     │
│  │   Mosquitto MQTT Broker :8883/TLS                  │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘

               AWS S3 + CloudFront
               (Static PWA assets)
```

### 8.2 CI/CD Pipeline

```
Developer Push to main branch
│
▼
GitHub Actions Workflow
│
├── 1. Lint + Test
│   ├── npm run test (Node.js)
│   ├── pytest (Python)
│   └── eslint + flake8
│
├── 2. Security Scan
│   ├── npm audit --audit-level=high
│   ├── pip-audit
│   └── Trivy Docker image scan
│
├── 3. Build Docker Images
│   ├── docker build hhlews-api:$SHA
│   ├── docker build hhlews-ml:$SHA
│   └── docker build hhlews-worker:$SHA
│
├── 4. Push to ECR (AWS Container Registry)
│
├── 5. Deploy to Staging
│   └── docker-compose pull && docker-compose up -d
│
├── 6. Smoke Tests
│   ├── GET /api/health → 200
│   ├── GET /ml/health → 200
│   └── WebSocket connection test
│
└── 7. Deploy to Production (manual approval gate)
    ├── Tag release: git tag v1.x.x
    └── docker-compose up -d --no-deps $SERVICE
```

### 8.3 Environment Configuration

```
Environment Hierarchy:
development → staging → production

.env.development   → localhost, mock APIs, debug logging
.env.staging       → cloud infra, real APIs, test data
.env.production    → cloud infra, real APIs, prod data, secrets from AWS SM
```

---

## 9. Network & Communication Patterns

### 9.1 WebSocket Communication (Dashboard Real-Time Updates)

```
Browser → HTTPS WSS upgrade → Nginx → Node.js (ws server)

Server events emitted to dashboard clients:
├── zone_risk_updated: {zone_id, risk_score, risk_level, ts}
├── alert_dispatched: {zone_id, risk_level, channels, recipient_count}
├── alert_suppressed: {zone_id, reason}
├── sensor_offline: {sensor_id, zone_id, last_seen}
└── system_health: {ml_status, db_status, redis_status, api_status}

Client → Server events:
├── subscribe_zone: {zone_id}    ← Subscribe to specific zone updates
├── unsubscribe_zone: {zone_id}
└── manual_alert: {zone_id, ...} ← Triggers validation + dispatch
```

### 9.2 Celery Task Communication

```
Beat Scheduler
│
├── enqueue: poll_all_zones → polling queue
├── enqueue: batch_inference → inference queue (after polling)
├── enqueue: sensor_health_check → maintenance queue
└── enqueue: cleanup_old_data → maintenance queue

polling queue workers consume:
└── poll_all_zones
    └── triggers: inference_zone (per zone) → inference queue

inference queue workers consume:
└── inference_zone(zone_id)
    └── on threshold breach: dispatch_alert(zone_id) → alerts queue

alerts queue workers consume (4 parallel workers):
├── dispatch_sms_batch
├── dispatch_whatsapp_batch
└── dispatch_ivr_batch
```

---

## 10. Data Storage Architecture

### 10.1 Data Tier Summary

```
┌──────────────────────────────────────────────────────────────┐
│                    DATA TIERS                                 │
├─────────────┬───────────────┬──────────────────────────────── │
│ Tier        │ Technology    │ Data Stored                     │
├─────────────┼───────────────┼──────────────────────────────── │
│ Hot Cache   │ Redis         │ Current risk scores, last sensor│
│ (< 5 min)   │               │ readings, suppression flags,    │
│             │               │ weather cache, zone list        │
├─────────────┼───────────────┼──────────────────────────────── │
│ Operational │ PostgreSQL    │ Zone configs, subscribers,      │
│ DB          │ + PostGIS     │ sensor registry, users,         │
│             │               │ alert events (90 days active)   │
├─────────────┼───────────────┼──────────────────────────────── │
│ Time Series │ PostgreSQL    │ sensor_readings (partitioned),  │
│ (90 days)   │ partitioned   │ weather_readings, predictions   │
├─────────────┼───────────────┼──────────────────────────────── │
│ Archive     │ S3 Glacier    │ Sensor readings > 90 days,      │
│ (2 years)   │               │ Alert event logs > 1 year       │
├─────────────┼───────────────┼──────────────────────────────── │
│ Static      │ S3 + CDN      │ React PWA bundle, map tiles,    │
│             │               │ ML model files (backup)         │
└─────────────┴───────────────┴──────────────────────────────── │
```

### 10.2 Backup Strategy

```
Backup Schedule:
├── PostgreSQL (full): Daily at 02:00 IST → S3 (AES-256 encrypted)
├── PostgreSQL (WAL/incremental): Continuous → S3 (30-min segments)
├── Redis (RDB snapshot): Every 6 hours → S3
└── ML Models: On every new model deployment → S3 versioned

Retention:
├── Daily backups: 30 days
├── Weekly backups: 12 weeks
└── Monthly backups: 12 months

Recovery Time Objectives:
├── RTO (PostgreSQL full restore): < 2 hours
├── RTO (Redis restore): < 15 minutes
└── RPO (maximum data loss): < 30 minutes (WAL replication)
```

---

*Document controlled by HH-LEWS Engineering Lead. Architecture changes require RFC (Request for Comments) process.*
