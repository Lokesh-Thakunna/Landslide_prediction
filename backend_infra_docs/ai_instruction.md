# HH-LEWS — AI & ML Instructions

## 1. Feature Engineering Steps

The raw telemetry from APIs and Sensors undergoes cleaning and polynomial interaction extraction before inference.
1.  **Imputation:** Substitute missing sensor data via `SimpleImputer(strategy='median')` or falling back to 24h zone-centric averages.
2.  **Rolling Summaries:** 72h Cumulative Rainfall (`rainfall_72h_mm`), and exponentially-weighted antecedent moisture.
3.  **Static Merges:** Intersect weather variables against PostGIS `zones` constants (`slope_avg`, `aspect`, `curvature`, `soil_type_code`).
4.  **Mathematical Interactions:** e.g., `slope_x_rainfall = slope_avg * rainfall_mm_hr` to highlight massive risk multiplication.
5.  **Scaling:** Standardize to zero-mean, unit-variance using `StandardScaler`.

## 2. ML Model Training Flow

Currently deployed as an Ensemble (Random Forest + XGBoost Regressor).

*   **Dataset:** Merged NASA Global Landslide Catalog (LHASA) mapped against corresponding SRTM terrains. Bootstrapped with geological GSI bounds.
*   **Random Forest:** 
    *   Trained for multi-class categorization (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`).
    *   Config: Balanced class weights, max-depth bound to prevent overfitting.
*   **XGBoost Regressor:**
    *   Takes probabilities extracted from RF.
    *   Creates continuous risk score `0.00`->`1.00`.
*   **Output logic:** `risk = (0.4 * RF_Probability) + (0.6 * XGB_Score)` -> Yields resilient combined metric.

## 3. Retraining Strategy

Continuous system ingest fills the `predictions` and `sensor_readings` partitions. 
*   **Trigger:** Once verified ground-truth (e.g., from NDRF incident reports) corrects or confirms 500+ novel alert events.
*   **Offline Script:** Pull the JSONB `feature_vector` from `predictions`, map true label, shuffle into training CSV, and retrain `Pipeline`.

## 4. Threshold Tuning

Model confidence limits mapping continuous output onto UI alerts.
*   **`>= 0.85` (CRITICAL)**: Immenient Mass failure. Bypasses alert cooldown logic if escalating. Triggers Red UI pulse.
*   **`>= 0.65` (HIGH)**: Pre-evacuation stage. Triggers standard SMS bursts.
*   **`< 0.40` (LOW)**: Stable state. Evaluates resolution hooks if dropping from `HIGH`. 
*   *NOTE:* A rule-based hard override exists `if rainfall_mm_hr > 50 and slope > 40: return CRITICAL`, guarding against edge-case anomalies.

## 5. Model Versioning (Hot Swap)

Stored dynamically in `/models/` without burying in docker containers.
```text
/models
 ├── rf_v1.2.0.pkl
 ├── xgb_v1.2.0.pkl
 └── current -> symlink to v1.2.0
```
Trigger `POST /models/v1.3.0/load` -> Evaluates local test vectors via PyDantic schemas. If shapes pass, hot-swaps active memory variable instantly.

## 6. Alert Decision Algorithm (Pseudocode)

```python
latest_score = execute_pipeline(features)

If latest_score >= 0.65:
    cache = redis.get('score_history')
    If cache.prev_score >= 0.65: # Two Consecutive Cycles Met
        if not redis.exists('alert_cooldown:{zone_id}'):
           initiate_celery_dispatch(SMS, WhatsApp)
           redis.set('alert_cooldown:{zone_id}', ttl=1800)
        else if latest_score >= 0.85 and cache.prev_score < 0.85:
           # Escalation overrides cooldown!
           initiate_celery_dispatch(SMS_CRITICAL)
    redis.set('score_history', latest_score)
```

## 7. Simulation Logic Design (Phase 1 Hackathon)

```python
# Runs continually mimicking MQTT sensor devices
def simulate_sensor(live_rainfall):
    base_saturation = 40.0
    # Saturation jumps quadratically based on rainfall accumulation
    computed_sat = base_saturation + (live_rainfall * 1.5) + random.uniform(-2, 2)
    computed_vib = 0.05 + random.uniform(0.01, 0.1) if live_rainfall < 30 else random.uniform(0.5, 3.0)
    
    mqtt.publish({
        "soil_saturation_pct": min(computed_sat, 100.0),
        "vibration_mps2": min(computed_vib, 20.0)
    })
```

## 8. Future Deep Learning Upgrade Path

*   **LSTM / GRU:** Moving beyond static 72h summation features, Recurrent Neural Networks can map raw temporal sequences (e.g., rainfall over 14 straight days) without hardcoded aggregation logic.
*   **Computer Vision (InSAR):** Processing Bhuvan microwave satellite passes through a CNN (ResNet) to auto-extract mm-level displacement vectors across mountain faces in real-time, adding a definitive `ground_deformation_idx` feature.
