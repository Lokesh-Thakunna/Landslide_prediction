# HH-LEWS — Business Logic Documentation

**Version:** 1.0 | **Services:** FastAPI ML + Celery Workers + Node.js Alert Engine  
**Classification:** Internal — Engineering

---

## Index

1. [Risk Score Calculation Formula](#1-risk-score-calculation-formula)
2. [Alert Trigger Threshold Logic](#2-alert-trigger-threshold-logic)
3. [Forecast Weighting Logic](#3-forecast-weighting-logic)
4. [Sensor Simulation Logic](#4-sensor-simulation-logic)
5. [Alert Cooldown Logic](#5-alert-cooldown-logic)
6. [Official Override Mechanism](#6-official-override-mechanism)
7. [Fail-Safe Logic](#7-fail-safe-logic)

---

## 1. Risk Score Calculation Formula

### 1.1 Input Feature Set

Features are assembled by the Celery `inference_queue` worker before calling FastAPI. Three source categories:

| Feature | Source | Refresh Rate | Fallback |
|---------|--------|-------------|---------|
| `slope_avg` | `zones` table (SRTM DEM) | Static (one-time load) | None — required |
| `slope_max` | `zones` table | Static | None |
| `aspect_avg` | `zones` table | Static | None |
| `curvature` | `zones` table | Static | None |
| `soil_type_code` | `zones` table | Static | Default: 2 (sandy) |
| `historical_landslide_proximity_km` | `zones` table | Static | None |
| `rainfall_mm_hr` | Redis `weather:{lat}:{lon}` | 5 minutes | Last cached value + `is_stale=true` |
| `rainfall_72h_mm` | Computed rolling sum | 5 minutes | 24h sum if 72h unavailable |
| `humidity_pct` | Redis weather cache | 5 minutes | Last cached value |
| `pressure_hpa` | Redis weather cache | 5 minutes | Last cached value |
| `soil_saturation_pct` | Redis `sensor_last:{sensor_id}` | Live (MQTT) | 24h zone average |
| `vibration_mps2` | Redis `sensor_last:{sensor_id}` | Live (MQTT) | 0.05 (baseline) |
| `antecedent_rainfall_index` | Computed (EWM) | Per inference | 0 if no history |
| `slope_x_rainfall` | Computed interaction | Per inference | slope_avg × 0 = 0 |
| `saturation_velocity` | Computed (Δsat/Δtime) | Per inference | 0 if < 2 readings |

### 1.2 Feature Engineering Pipeline

```python
# feature_engineering.py

import pandas as pd
import numpy as np
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.preprocessing import PolynomialFeatures

def assemble_features(zone_id: str) -> dict:
    # ── Step 1: Load static features (Redis cache, TTL 1hr) ──────────
    zone = redis.get(f"zone_static:{zone_id}") or db.fetch_zone(zone_id)

    # ── Step 2: Load dynamic weather features ────────────────────────
    weather = redis.get(f"weather:{zone.lat}:{zone.lon}")
    if not weather:
        weather = db.fetch_latest_weather(zone_id)

    # ── Step 3: Load sensor readings ─────────────────────────────────
    sensor = redis.get(f"sensor_last:{zone_id}")
    if not sensor:
        # Fallback: use 24-hour zone average from DB
        sensor = db.fetch_sensor_average_24h(zone_id)

    # ── Step 4: Compute 72h rolling rainfall ─────────────────────────
    rainfall_series = db.fetch_rainfall_series_72h(zone_id)
    rainfall_72h_mm = sum(r.rainfall_mm_hr * (5/60) for r in rainfall_series)
    # Each reading covers a 5-minute window → convert mm/hr to mm per interval

    # ── Step 5: Compute engineered features ──────────────────────────
    antecedent_rainfall_index = compute_ari(
        [r.rainfall_mm_hr for r in rainfall_series],
        span=24
    )
    slope_x_rainfall = zone.slope_avg * weather.rainfall_mm_hr
    saturation_velocity = compute_saturation_velocity(
        db.fetch_last_2_sensor_readings(zone_id)
    )

    return {
        "zone_id":                             zone_id,
        "rainfall_mm_hr":                      weather.rainfall_mm_hr,
        "rainfall_72h_mm":                     rainfall_72h_mm,
        "slope_degrees":                       zone.slope_avg,
        "aspect_avg":                          zone.aspect_avg,
        "curvature":                           zone.curvature,
        "soil_saturation_pct":                 sensor.saturation_pct,
        "vibration_mps2":                      sensor.vibration_mps2,
        "soil_type_code":                      zone.soil_type,
        "historical_landslide_proximity_km":   zone.historical_landslide_proximity_km,
        "antecedent_rainfall_index":           antecedent_rainfall_index,
        "slope_x_rainfall":                    slope_x_rainfall,
        "saturation_velocity":                 saturation_velocity,
    }
```

### 1.3 Preprocessing in FastAPI

```python
# ml_service/pipeline.py

from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, PolynomialFeatures
import numpy as np

def preprocess(feature_dict: dict, fitted_pipeline) -> np.ndarray:
    """
    Applies the same preprocessing used during model training.
    Pipeline is fitted on training data and saved with the model.
    """
    X = np.array([[
        feature_dict['rainfall_mm_hr'],
        feature_dict['rainfall_72h_mm'],
        feature_dict['slope_degrees'],
        feature_dict['aspect_avg'],
        feature_dict['curvature'],
        feature_dict['soil_saturation_pct'],
        feature_dict['vibration_mps2'],
        feature_dict['soil_type_code'],
        feature_dict['historical_landslide_proximity_km'],
        feature_dict['antecedent_rainfall_index'],
        feature_dict['slope_x_rainfall'],
        feature_dict['saturation_velocity'],
    ]])

    # Step 1: Impute missing values with training-set median
    X = fitted_pipeline['imputer'].transform(X)

    # Step 2: Standardize to zero-mean, unit-variance
    X = fitted_pipeline['scaler'].transform(X)

    # Step 3: Polynomial interaction features (degree=2, interaction_only=True)
    X = fitted_pipeline['poly'].transform(X)

    return X
```

### 1.4 Ensemble Inference Formula

```python
# ml_service/inference.py

def run_inference(features: dict) -> PredictionResponse:
    X = preprocess(features, pipeline)

    # ── Random Forest: multi-class probabilities ──────────────────────
    rf_proba = rf_model.predict_proba(X)[0]
    # rf_proba = [P_LOW, P_MODERATE, P_HIGH, P_CRITICAL]
    RF_HIGH_proba = rf_proba[2] + rf_proba[3]  # P_HIGH + P_CRITICAL combined

    # ── XGBoost: continuous risk score ───────────────────────────────
    xgb_score = float(xgb_model.predict(X)[0])  # Range: 0.0 → 1.0

    # ── Ensemble combination ─────────────────────────────────────────
    risk_score = (0.4 * RF_HIGH_proba) + (0.6 * xgb_score)
    risk_score = round(min(max(risk_score, 0.0), 1.0), 4)

    # ── Hard override (rule-based safety net) ────────────────────────
    # Bypasses ensemble output when extreme physical conditions present.
    # Guards against edge cases where ML may underestimate.
    if features['rainfall_mm_hr'] > 50 and features['slope_degrees'] > 40:
        risk_score = max(risk_score, 0.85)

    # ── Classification ────────────────────────────────────────────────
    risk_level = classify(risk_score)

    # ── SHAP feature importance (top 3) ──────────────────────────────
    shap_values = shap_explainer(X)
    top_features = get_top_shap_features(shap_values, feature_names, n=3)

    return PredictionResponse(
        zone_id=features['zone_id'],
        risk_score=risk_score,
        risk_level=risk_level,
        confidence=compute_confidence(rf_proba, xgb_score),
        model_version=CURRENT_MODEL_VERSION,
        top_features=top_features,
        rf_class_probabilities={
            'LOW': round(rf_proba[0], 4),
            'MODERATE': round(rf_proba[1], 4),
            'HIGH': round(rf_proba[2], 4),
            'CRITICAL': round(rf_proba[3], 4),
        },
        xgb_continuous_score=round(xgb_score, 4),
        predicted_at=datetime.utcnow().isoformat() + 'Z',
    )


def classify(score: float) -> str:
    """Maps continuous [0,1] score to discrete risk level."""
    if score >= 0.85: return 'CRITICAL'
    if score >= 0.65: return 'HIGH'
    if score >= 0.40: return 'MODERATE'
    return 'LOW'
```

### 1.5 Threshold Reference

| Level | Score Range | Meaning | UI Indicator |
|-------|------------|---------|-------------|
| `LOW` | `< 0.40` | Stable conditions. No action required. | 🟢 Green |
| `MODERATE` | `0.40 – 0.64` | Elevated caution. Monitor closely. | 🟡 Yellow |
| `HIGH` | `0.65 – 0.84` | Pre-evacuation stage. Alert trigger eligible. | 🟠 Orange |
| `CRITICAL` | `≥ 0.85` | Imminent mass failure. Immediate evacuation. | 🔴 Red pulse |

---

## 2. Alert Trigger Threshold Logic

### 2.1 Two-Consecutive-Cycle Requirement

A single HIGH score does **not** trigger an alert. Two consecutive inference cycles must both exceed the HIGH threshold. This eliminates single-reading sensor noise from causing false alarms.

**Cycle interval:** 5 minutes (Celery Beat frequency)  
**Watch state window:** 10 minutes (if second cycle does not confirm within 10 min, watch state resets)

```python
# celery_workers/inference_worker.py

def evaluate_alert_eligibility(zone_id: str, risk_score: float, risk_level: str):
    """
    Called by Celery inference worker after each successful ML response.
    Implements the two-cycle gate and routes to alert dispatch.
    """

    # ── Step 1: Retrieve previous cycle score ─────────────────────────
    prev_raw = redis.get(f"score_history:{zone_id}")
    prev_score = float(prev_raw) if prev_raw else 0.0

    # ── Step 2: Store current score for next cycle comparison ─────────
    redis.setex(f"score_history:{zone_id}", 600, str(risk_score))  # TTL = 10 min

    # ── Step 3: Write prediction to DB (always, regardless of alert) ──
    db.write_prediction(zone_id, risk_score, risk_level, feature_vector, model_version)

    # ── Step 4: Broadcast to WebSocket clients ─────────────────────────
    socketio.emit(
        f"zone_risk_updated",
        { "zone_id": zone_id, "score": risk_score, "level": risk_level },
        room=f"zone_{zone_id}"
    )

    # ── Step 5: Below HIGH threshold — check for resolution ───────────
    if risk_score < 0.65:
        if prev_score >= 0.65:
            # Dropping from HIGH/CRITICAL — send "all clear" if 2 consecutive low cycles
            handle_risk_resolution(zone_id, prev_score)
        return  # No alert to trigger

    # ── Step 6: First HIGH cycle — set watch state, wait ──────────────
    if prev_score < 0.65:
        # Only first cycle is HIGH. Start watch state. No dispatch yet.
        redis.setex(f"watch_state:{zone_id}", 600, "1")
        return

    # ── Step 7: Second consecutive HIGH cycle — proceed to alert gate ─
    evaluate_and_dispatch(zone_id, risk_score, risk_level)


def handle_risk_resolution(zone_id: str, prev_score: float):
    """
    Two consecutive sub-LOW cycles after an alert period → send resolution SMS.
    """
    resolution_key = f"resolution_sent:{zone_id}"
    if redis.exists(f"alert_cooldown:{zone_id}") and not redis.exists(resolution_key):
        send_resolution_message(zone_id)
        redis.delete(f"alert_cooldown:{zone_id}")
        redis.setex(resolution_key, 3600, "1")  # Prevent duplicate resolutions
```

### 2.2 Full Alert State Machine

```
┌──────────────────────────────────────────────────────────────────────┐
│                    ALERT STATE MACHINE                               │
│                                                                      │
│  Inference result received                                           │
│         │                                                            │
│         ▼                                                            │
│    score < 0.65 ?                                                    │
│         │                                                            │
│    YES  │  NO                                                        │
│    ─────┘  │                                                         │
│    │       ▼                                                         │
│    │   prev_score < 0.65 ?  ─── YES ──→ [WATCH STATE]               │
│    │       │                            Redis: watch_state:{id}     │
│    │       │ NO                         TTL: 600s                    │
│    │       │                            → Wait for next cycle       │
│    │       ▼                                                         │
│    │   Is alert_suppress:{id} set ?                                  │
│    │       │                                                         │
│    │  YES  │  NO                                                     │
│    │  ─────┘  │                                                      │
│    │  │       ▼                                                      │
│    │  │   Is alert_cooldown:{id} set ?                               │
│    │  │       │                                                      │
│    │  │  YES  │  NO                                                  │
│    │  │  ─────┘  │                                                   │
│    │  │  │       ▼                                                   │
│    │  │  │   DISPATCH ALERT                                          │
│    │  │  │   → fetch subscribers                                     │
│    │  │  │   → compose Hindi SMS                                     │
│    │  │  │   → enqueue Celery dispatch_sms_batch                    │
│    │  │  │   → set alert_cooldown:{id} TTL=1800                     │
│    │  │  │   → write alert_event to DB                              │
│    │  │  │   → emit alert_dispatched WebSocket                      │
│    │  │  │                                                           │
│    │  │  └─ Is risk escalating to CRITICAL ?                         │
│    │  │     (prev_cooldown_level was HIGH, now CRITICAL)             │
│    │  │         │ YES                                                │
│    │  │         ▼                                                    │
│    │  │     BYPASS COOLDOWN → DISPATCH CRITICAL ALERT               │
│    │  │     → Reset cooldown TTL=1800 at CRITICAL level             │
│    │  │                                                              │
│    │  └── Log suppressed alert (no dispatch)                         │
│    │                                                                 │
│    └── score < 0.40 AND was previously HIGH ?                        │
│            │ YES → handle_risk_resolution()                          │
│            │ NO  → no action                                         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Forecast Weighting Logic

### 3.1 Antecedent Rainfall Index (ARI)

The ARI captures soil pre-saturation from accumulated rainfall over 72 hours. A slope at 70% saturation after 3 days of moderate rain is far more dangerous than the same slope at 70% saturation from a single downpour.

```python
# utils/weather.py
import pandas as pd

def compute_ari(rainfall_series: list[float], span: int = 24) -> float:
    """
    Exponentially-weighted moving average of hourly rainfall readings.

    rainfall_series: List of rainfall_mm_hr readings, chronological order,
                     covering last 72 hours (up to 864 readings at 5-min intervals)
    span:            EWM span. span=24 means readings from 24 time-steps ago
                     are weighted ~1/e (~37%) of the most recent reading.

    Returns: ARI float — higher value = more pre-saturated soil
    """
    if not rainfall_series:
        return 0.0

    s = pd.Series(rainfall_series)
    return float(s.ewm(span=span, adjust=False).mean().iloc[-1])


# Example effect:
# Steady 15mm/hr for 72h:    ARI ≈ 15.0  (fully saturated signal)
# Sudden spike to 35mm/hr:   ARI ≈ 16.8  (high, but ARI dampens the spike)
# → ARI correctly treats steady accumulation as more dangerous than a sudden spike
```

### 3.2 Slope × Rainfall Interaction Feature

```python
# Captures the compounding risk when both slope AND rainfall are simultaneously high.
# A flat zone at 60mm/hr rain is less dangerous than a 45° slope at 60mm/hr.

slope_x_rainfall = zone.slope_avg * weather.rainfall_mm_hr

# Example values:
# slope=10°, rain=60mm/hr → slope_x_rainfall = 600   (moderate)
# slope=44°, rain=35mm/hr → slope_x_rainfall = 1540  (high)
# slope=44°, rain=60mm/hr → slope_x_rainfall = 2640  (very high — most dangerous)
```

### 3.3 Saturation Velocity

```python
# utils/sensors.py

def compute_saturation_velocity(readings: list) -> float:
    """
    Rate of change of soil saturation (% per minute).
    Rapid increases indicate active water infiltration.

    readings: Last 2 sensor readings sorted by recorded_at ascending.
    Returns: delta_saturation / delta_time_minutes
    """
    if len(readings) < 2:
        return 0.0

    latest = readings[-1]
    prev   = readings[-2]

    dt_seconds = (latest.recorded_at - prev.recorded_at).total_seconds()
    dt_minutes = dt_seconds / 60

    if dt_minutes <= 0:
        return 0.0

    velocity = (latest.saturation_pct - prev.saturation_pct) / dt_minutes

    # Cap at physically plausible range:
    return round(max(min(velocity, 10.0), -10.0), 4)
    # Positive = saturation rising (danger signal)
    # Negative = saturation falling (drying out — safer)
```

### 3.4 Stale Data Confidence Downgrade

When weather data falls back to a cached stale value, ML confidence is explicitly downgraded:

```python
def apply_stale_penalty(response: PredictionResponse, weather: WeatherReading) -> PredictionResponse:
    """
    Applied after inference when weather source is 'cached' or is_stale=True.
    Reduces confidence score to reflect data quality degradation.
    """
    if weather.is_stale:
        response.confidence = max(0.0, response.confidence - 0.10)
        response.stale_warning = "Weather data stale — confidence reduced"

    return response
```

---

## 4. Sensor Simulation Logic

### 4.1 Purpose

Phase 1 has no physical piezometers or tiltmeters. The simulator generates realistic MQTT payloads seeded by live rainfall data from OpenWeatherMap. The simulator is a drop-in replacement for real hardware — when physical sensors connect in Phase 2, the simulator script is simply disabled. Zero codebase changes required.

### 4.2 Simulator Algorithm

```python
# celery_workers/sensor_simulator.py
import random
import time
import json
import paho.mqtt.client as mqtt

BASE_SATURATION    = 40.0    # % — dry soil baseline
RAINFALL_FACTOR    = 1.5     # saturation increase per mm/hr of rainfall
NOISE_RANGE        = 2.0     # ± random noise on saturation
LOW_VIB_MAX        = 0.10    # m/s² — baseline vibration (< 30mm/hr rain)
HIGH_VIB_MIN       = 0.50    # m/s² — elevated vibration (>= 30mm/hr rain)
HIGH_VIB_MAX       = 3.00    # m/s²
SATURATION_CAP     = 100.0
VIBRATION_CAP      = 20.0


def simulate_sensor(zone_id: str, sensor_id: str, live_rainfall_mm_hr: float):
    """
    Generates a realistic sensor reading seeded by current live rainfall.
    Published to MQTT broker on every call (every 5 minutes by Celery Beat).
    """

    # Saturation rises quadratically with rainfall accumulation
    computed_sat = BASE_SATURATION + (live_rainfall_mm_hr * RAINFALL_FACTOR)
    computed_sat += random.uniform(-NOISE_RANGE, NOISE_RANGE)
    computed_sat = round(min(max(computed_sat, 0.0), SATURATION_CAP), 2)

    # Vibration spikes on heavy rainfall (slope destabilization signal)
    if live_rainfall_mm_hr < 30:
        computed_vib = 0.05 + random.uniform(0.01, LOW_VIB_MAX)
    else:
        computed_vib = random.uniform(HIGH_VIB_MIN, HIGH_VIB_MAX)

    computed_vib = round(min(computed_vib, VIBRATION_CAP), 3)

    payload = {
        "sensor_id":          sensor_id,
        "zone_id":            zone_id,
        "ts":                 int(time.time()),
        "soil_saturation_pct": computed_sat,
        "vibration_mps2":     computed_vib,
        "battery_pct":        random.uniform(78.0, 99.0)
    }

    mqtt_client.publish(
        topic   = f"sensors/{zone_id}/{sensor_id}/readings",
        payload = json.dumps(payload),
        qos     = 1   # At-least-once delivery
    )
```

### 4.3 Simulation Behavior Table

| Live Rainfall | Simulated Saturation | Simulated Vibration | Likely Risk Output |
|--------------|---------------------|--------------------|--------------------|
| 0 mm/hr | ~40% ± 2% | 0.05–0.15 m/s² | LOW |
| 15 mm/hr | ~62.5% ± 2% | 0.05–0.15 m/s² | MODERATE |
| 30 mm/hr | ~85% ± 2% | 0.5–3.0 m/s² | HIGH |
| 50 mm/hr | ~100% (capped) ± 2% | 0.5–3.0 m/s² | CRITICAL (hard override also fires) |

### 4.4 Phase 2 Migration

To switch from simulation to real hardware:

1. Disable `sensor_simulator` Celery task in `celery_beat_schedule`.
2. Provision real sensors with MQTT credentials (see Authentication doc §11.2).
3. Verify real sensor MQTT topic matches `sensors/{zone_id}/{sensor_id}/readings`.
4. No changes to Celery subscriber worker, DB schema, or inference pipeline.

---

## 5. Alert Cooldown Logic

### 5.1 Redis Key Structure

```
alert_cooldown:{zone_id}
  Value: Last dispatched risk_level string (e.g., "HIGH" or "CRITICAL")
  TTL:   1800 seconds (30 minutes)

alert_suppress:{zone_id}
  Value: Suppression reason string
  TTL:   duration_minutes (set by DDMO, max 86400 = 24 hours)

score_history:{zone_id}
  Value: Last risk_score float string
  TTL:   600 seconds (10 minutes — covers 2 inference cycles)

watch_state:{zone_id}
  Value: "1"
  TTL:   600 seconds (expires after 2 cycles if not confirmed)
```

### 5.2 Cooldown Decision Function

```python
# celery_workers/alert_engine.py

def evaluate_and_dispatch(zone_id: str, risk_score: float, risk_level: str):
    """
    Final gate before alert dispatch. Applies cooldown and suppression rules.
    Called only after two-consecutive-cycle requirement is met (see §2.1).
    """

    cooldown_key = f"alert_cooldown:{zone_id}"
    suppress_key = f"alert_suppress:{zone_id}"

    # ── Suppression hard block ─────────────────────────────────────────
    if redis.exists(suppress_key):
        db.log_suppressed_alert(zone_id, risk_score, risk_level)
        return  # DDMO has muted this zone — abort

    # ── Cooldown check with escalation bypass ─────────────────────────
    existing_cooldown = redis.get(cooldown_key)

    if existing_cooldown:
        current_level = existing_cooldown.decode()
        level_order = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL']

        current_idx = level_order.index(current_level)
        new_idx     = level_order.index(risk_level)

        if new_idx > current_idx:
            # ESCALATION: severity is increasing — bypass cooldown, dispatch immediately
            dispatch_alert(zone_id, risk_level, channels=['SMS', 'WhatsApp', 'IVR'])
            redis.setex(cooldown_key, 1800, risk_level)  # Reset TTL at new level
            return

        # Same or lower level within cooldown window — skip dispatch
        return

    # ── No active cooldown — dispatch ────────────────────────────────
    dispatch_alert(zone_id, risk_level)
    redis.setex(cooldown_key, 1800, risk_level)  # Start 30-minute cooldown
```

### 5.3 Cooldown State Diagram

```
[NO COOLDOWN]
    │
    │  Two consecutive HIGH cycles
    ▼
[DISPATCH ALERT — HIGH]
    │
    └── Set alert_cooldown:{id} = "HIGH", TTL=1800s
         │
         │  Within 30 min:
         ├── Same HIGH reading     → skip (cooldown active, same level)
         ├── Score drops to LOW    → send resolution, delete cooldown key
         └── Score rises CRITICAL  → BYPASS cooldown → dispatch CRITICAL
                                     Reset TTL = 1800s at "CRITICAL"
         │
         │  After 30 min (TTL expires):
         └── [NO COOLDOWN] — cycle resets
```

---

## 6. Official Override Mechanism

### 6.1 Manual Trigger Flow

```
POST /api/alerts/trigger
       │
       ├── 1. requireAuth → verify JWT signature, expiry, issuer, audience
       │
       ├── 2. requireRole('DISTRICT_OFFICIAL', 'ADMIN')
       │       └── VIEWER or unauthenticated → 403
       │
       ├── 3. requireDistrictAccess
       │       └── ADMIN → pass always
       │       └── DISTRICT_OFFICIAL →
       │           zone.district_id === req.user.district_id ?
       │           NO  → 403 District access denied
       │           YES → continue
       │
       ├── 4. alertLimiter (Redis rate limit)
       │       └── > 10 triggers/min/user → 429
       │
       ├── 5. Validate request body
       │       └── risk_level ∈ ['HIGH','CRITICAL']
       │       └── zone_id is valid UUID and exists in DB
       │       └── channels ⊆ ['SMS','WhatsApp','IVR']
       │
       ├── 6. Compose alert message
       │       └── message_override_hi provided? Use it directly.
       │       └── else: use Hindi template for risk_level:
       │           HIGH:     "⚠️ भूस्खलन खतरा | {zone.name} | खतरा\n
       │                      तुरंत {safe_zone.name} जाएं।\n
       │                      हेल्पलाइन: {district_helpline}\n-DDMO {district}"
       │           CRITICAL: "🔴 भूस्खलन खतरा | {zone.name} | अभी निकलें!\n
       │                      तुरंत {safe_zone.name} जाएं।\n
       │                      हेल्पलाइन: {district_helpline}\n-DDMO {district}"
       │
       ├── 7. Skip cooldown check (manual triggers bypass it entirely)
       │       Manual = DDMO asserting ground truth. Intentional override.
       │
       ├── 8. Enqueue Celery task
       │       celery.send_task(
       │         'alerts.dispatch_sms_batch',
       │         args=[zone_id, risk_level, channels, message]
       │       )
       │
       ├── 9. Write alert_event record to DB
       │       triggered_by = 'manual'
       │       user_id = req.user.sub
       │
       ├── 10. Write immutable audit_log
       │       entity='ALERT', action='MANUAL_TRIGGER',
       │       user_id=req.user.sub, ip_address=req.ip,
       │       metadata={ zone_id, risk_level, channels, recipient_count }
       │
       └── 11. Broadcast WebSocket event
               io.to(`zone_${zone_id}`).emit('alert_dispatched', {
                 zone_id, count: recipient_count, channel, level: risk_level
               })
```

### 6.2 Suppression Flow

```python
# controllers/alerts.controller.js (Node.js)

async function suppressAlert(req, res) {
    const { zone_id, reason, duration_minutes = 60 } = req.body;

    # Cap suppression at 24 hours
    const ttl_seconds = Math.min(duration_minutes, 1440) * 60;

    # Set suppression flag
    await redis.setex(
        `alert_suppress:${zone_id}`,
        ttl_seconds,
        reason
    );

    const suppressed_until = new Date(Date.now() + ttl_seconds * 1000).toISOString();

    # Write immutable audit log
    const audit = await prisma.auditLog.create({
        data: {
            entity:     'ALERT',
            entity_id:  zone_id,
            action:     'SUPPRESS_ALERT',
            user_id:    req.user.sub,
            ip_address: req.ip,
            metadata:   { reason, duration_minutes, suppressed_until }
        }
    });

    return res.status(200).json({
        suppressed:       true,
        zone_id,
        suppressed_until,
        audit_log_id:     audit.id
    });
}
```

### 6.3 Model Hot-Swap (ADMIN only)

```python
# FastAPI ML Service — POST /ml/models/swap

from pathlib import Path
import joblib
import numpy as np

MODEL_DIR = Path("/models")

def swap_model(version: str) -> SwapResponse:
    """
    Hot-swaps the active ML models in memory without service restart.
    Validates new models against test vectors before making them active.

    ADMIN JWT required via Node.js proxy to this endpoint.
    """

    rf_path  = MODEL_DIR / f"rf_{version}.pkl"
    xgb_path = MODEL_DIR / f"xgb_{version}.pkl"

    if not rf_path.exists() or not xgb_path.exists():
        raise HTTPException(404, f"Model files for {version} not found")

    # Load candidate models
    candidate_rf  = joblib.load(rf_path)
    candidate_xgb = joblib.load(xgb_path)

    # Validate against test vectors (shape check + sanity output check)
    test_vector = get_test_feature_vector()  # Pre-defined safe test case
    try:
        test_proba = candidate_rf.predict_proba(test_vector)
        test_score = candidate_xgb.predict(test_vector)
        assert test_proba.shape[1] == 4,  "RF must output 4 class probabilities"
        assert 0.0 <= float(test_score[0]) <= 1.0, "XGB output must be in [0,1]"
    except Exception as e:
        raise HTTPException(422, f"Model validation failed: {str(e)}")

    # SHA-256 checksum verification
    verify_model_checksum(rf_path)
    verify_model_checksum(xgb_path)

    # Swap active models in memory (atomic swap via module-level globals)
    global rf_model, xgb_model, CURRENT_MODEL_VERSION
    rf_model  = candidate_rf
    xgb_model = candidate_xgb
    CURRENT_MODEL_VERSION = version

    # Update symlink
    (MODEL_DIR / "current_rf.pkl").unlink(missing_ok=True)
    (MODEL_DIR / "current_rf.pkl").symlink_to(rf_path)
    (MODEL_DIR / "current_xgb.pkl").unlink(missing_ok=True)
    (MODEL_DIR / "current_xgb.pkl").symlink_to(xgb_path)

    return SwapResponse(version=version, status="active")
```

---

## 7. Fail-Safe Logic

### 7.1 Fail-Safe Matrix

| Failure | Detection | Fallback Behavior | Alert Impact |
|---------|-----------|-------------------|--------------|
| OpenWeatherMap API timeout | HTTP timeout > 10s | Switch to Open-Meteo API | None — data continues |
| Both weather APIs fail | Both timeout/error | Use last Redis cached value + `is_stale=True` | Confidence −0.10; dashboard warning |
| No weather cache exists | Redis miss + both APIs failed | Skip inference for that zone | ML cycle skipped; zone shows last known score |
| FastAPI ML service down | Celery HTTP error | 3 retries (60s apart); emit `system_health` WS | Hard override still active; no full ML scores |
| Sensor offline (MQTT LWT) | Broker publishes LWT | Use 24h zone-average for missing features | Inference continues with degraded features |
| Redis failure | Connection error | In-memory fallback for rate limits; force fresh API calls | Cooldown keys lost — possible duplicate alerts (acceptable vs missed alert) |
| PostgreSQL failure | pgPool error | Retry 3x with backoff; serve from Redis cache | Write endpoints return 503; read endpoints serve cache |
| Twilio SMS delivery failure | Twilio error code | Retry with MSG91 fallback; log failed in `delivered_count` | Delivery logged as partial; IVR fallback for CRITICAL |
| Celery worker crash | Worker heartbeat lost | Celery auto-respawn (Docker restart policy `unless-stopped`) | Task queue drains on respawn; no data loss |

### 7.2 Hard Override Rule (Most Critical Fail-Safe)

This rule runs in the **Celery inference worker** before the HTTP call to FastAPI. If triggered, it bypasses the ML pipeline entirely.

```python
# celery_workers/inference_worker.py

def hard_override_check(
    rainfall_mm_hr: float,
    slope_avg: float
) -> Optional[str]:
    """
    Rule-based CRITICAL trigger.

    Fires when both:
      - Rainfall intensity exceeds 50mm/hr (extreme cloudburst)
      - Slope angle exceeds 40° (steep, failure-prone terrain)

    This combination is physically sufficient to trigger landslides
    regardless of soil saturation state or sensor readings.

    If triggered: ML inference call is SKIPPED. Alert engine receives
    a synthetic CRITICAL prediction with risk_score=0.90.

    This guard remains active even when:
      - FastAPI ML service is unreachable
      - Sensor data is missing (offline sensors)
      - Weather data is stale (uses cached value)
    """
    if rainfall_mm_hr > 50 and slope_avg > 40:
        return 'CRITICAL'

    return None  # Proceed with normal ML inference


# Usage in inference pipeline:
def run_inference_cycle(zone_id: str, features: dict):
    # Hard override check first — before any ML call
    override = hard_override_check(
        features['rainfall_mm_hr'],
        features['slope_avg']
    )

    if override:
        synthetic_response = PredictionResponse(
            zone_id=zone_id,
            risk_score=0.90,
            risk_level='CRITICAL',
            confidence=0.95,
            model_version='rule_override_v1',
            top_features=[
                { 'feature': 'rainfall_mm_hr', 'shap_value': 0.50 },
                { 'feature': 'slope_degrees',  'shap_value': 0.45 }
            ]
        )
        process_prediction(zone_id, synthetic_response, features)
        return

    # Normal ML path:
    response = call_fastapi_predict(features)
    process_prediction(zone_id, response, features)
```

### 7.3 Weather Fallback Chain

```python
# celery_workers/polling_worker.py

async def fetch_weather_for_zone(zone: Zone) -> WeatherReading:
    """
    Three-tier fallback: Primary API → Backup API → Stale cache
    """

    cache_key = f"weather:{zone.lat:.4f}:{zone.lon:.4f}"

    # ── Tier 1: Cache hit ──────────────────────────────────────────────
    cached = await redis.get(cache_key)
    if cached:
        data = json.loads(cached)
        return WeatherReading(**data, source='cached', is_stale=False)

    # ── Tier 2: OpenWeatherMap API ────────────────────────────────────
    try:
        data = await openweathermap_client.fetch(zone.lat, zone.lon, timeout=10)
        reading = parse_owm(data)
        await redis.setex(cache_key, 300, json.dumps(reading.dict()))  # Cache 5 min
        return reading

    except (asyncio.TimeoutError, httpx.HTTPError) as e:
        logger.warning(f"OWM failed for zone {zone.id}: {e}")

    # ── Tier 3: Open-Meteo fallback API ──────────────────────────────
    try:
        data = await openmeteo_client.fetch(zone.lat, zone.lon, timeout=10)
        reading = parse_openmeteo(data)
        reading.source = 'openmeteo'
        await redis.setex(cache_key, 300, json.dumps(reading.dict()))
        return reading

    except (asyncio.TimeoutError, httpx.HTTPError) as e:
        logger.warning(f"Open-Meteo also failed for zone {zone.id}: {e}")

    # ── Tier 4: Last known stale cache ────────────────────────────────
    stale = await redis.get(f"weather_stale:{zone.id}")
    if stale:
        data = json.loads(stale)
        data['is_stale'] = True
        data['source']   = 'cached'
        logger.error(f"Using stale weather for zone {zone.id} — both APIs failed")
        return WeatherReading(**data)

    # ── Tier 5: Total failure — skip this zone's inference cycle ──────
    logger.critical(f"No weather data available for zone {zone.id} — skipping inference")
    raise WeatherUnavailableError(zone_id=zone.id)
```

### 7.4 Celery Task Retry Configuration

```python
# celery_config.py

task_routes = {
    'tasks.poll_weather':      {'queue': 'polling_queue'},
    'tasks.run_inference':     {'queue': 'inference_queue'},
    'tasks.dispatch_sms':      {'queue': 'alerts_queue'},
    'tasks.run_maintenance':   {'queue': 'maintenance_queue'},
}

# Per-task retry settings:
@celery.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,  # 60s between retries
    acks_late=True,          # Re-queue on worker crash mid-execution
    reject_on_worker_lost=True
)
def run_inference(self, zone_id: str):
    try:
        ...
    except FastAPIUnavailable as exc:
        raise self.retry(exc=exc, countdown=60)
    except Exception as exc:
        logger.critical(f"Inference failed for zone {zone_id}: {exc}")
        # After max_retries exceeded: task goes to dead letter queue
        # Monitoring alarm fires via Datadog / CloudWatch
```

### 7.5 Health Endpoints

Both services expose unauthenticated health endpoints for uptime monitoring (UptimeRobot):

```
GET /health          → Node.js API
GET /ml/health       → FastAPI ML service (internal, not exposed publicly)
```

```json
// Node.js /health response:
{
  "status": "ok",
  "timestamp": "ISO8601",
  "services": {
    "database":   "ok | degraded | down",
    "redis":      "ok | degraded | down",
    "ml_service": "ok | degraded | down",
    "celery":     "ok | degraded | down"
  },
  "stale_zones": 2,
  "model_version": "v1.2.0"
}
```

---

_HH-LEWS Business Logic Documentation — v1.0 — Internal Engineering_
