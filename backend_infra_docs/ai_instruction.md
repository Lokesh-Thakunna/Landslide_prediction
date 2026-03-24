# BHURAKSHAN AI and ML Instructions

## 1. Objective

Predict landslide risk for each monitored zone using a lightweight feature set that can run without live hardware sensors.

## 2. Canonical Feature Set

The v1 Random Forest model should be trained and served with these four input features:

- `rainfall_mm_hr`
- `slope_degrees`
- `soil_moisture_proxy_pct`
- `historical_landslide_frequency`

The system may also compute `ground_movement_proxy_pct`, but this is a support signal for hotspot explanations and evacuation context rather than a required v1 training feature.

## 3. Proxy Generation Rules

### Soil moisture proxy

Use recent rainfall accumulation to estimate saturation pressure.

Suggested formula:

```text
soil_moisture_proxy_pct =
  clamp(
    0,
    100,
    (0.45 * rainfall_mm_hr) +
    (0.35 * rainfall_6h_avg_mm_hr) +
    (0.20 * rainfall_24h_total_mm / 4)
  )
```

### Ground movement proxy

Use terrain and history to estimate latent instability for display and prioritization.

```text
ground_movement_proxy_pct =
  clamp(
    0,
    100,
    (0.50 * normalized_slope_pct) +
    (0.30 * soil_moisture_proxy_pct) +
    (0.20 * historical_landslide_frequency_pct)
  )
```

## 4. Training Flow

1. Build zone-level records from historical landslide data and DEM-derived slope.
2. Join rainfall history for the same region and period where available.
3. Generate proxy moisture values from rainfall windows.
4. Train a `RandomForestRegressor` or `RandomForestClassifier` that can be mapped back to a `0-100` score.
5. Persist model metadata and feature importance output for explainability.

## 5. Inference Contract

The inference service should accept one zone at a time and return:

- `zone_id`
- `risk_score`
- `risk_level`
- `top_features`
- `forecast_context`
- `predicted_at`

## 6. Risk Mapping

```text
0-29   -> SAFE
30-69  -> WATCH
70-100 -> DANGER
```

## 7. Forecasting

The platform must emit predictions for:

- current conditions
- `+1h`
- `+2h`

Preferred approach:

- use hourly rainfall forecast values from the provider when available
- fall back to short-term trend extrapolation from recent observations
- recompute proxy values per horizon before calling the model

## 8. Alert Decision Rule

Alerts should fire when:

- the current score is `DANGER`, or
- a near-term forecast reaches `DANGER` and the trend is rising

Forecast-triggered alerts must clearly state that the risk is expected within the next one to two hours.

## 9. Versioning

Track:

- model version
- training data snapshot date
- feature schema version
- threshold version

## 10. Future Extensions

The design should allow future addition of:

- real soil sensors
- deformation feeds
- SAR or InSAR validation
- voice alert channels
