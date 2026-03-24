# BHURAKSHAN Business Logic

## 1. Core Inputs

The v1 model uses four canonical inputs:

- `rainfall_mm_hr`
- `slope_degrees`
- `soil_moisture_proxy_pct`
- `historical_landslide_frequency`

The system may also compute `ground_movement_proxy_pct` for hotspot ranking and operator explanation.

## 2. Proxy Generation

### 2.1 Soil moisture proxy

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

Design intent:

- capture immediate rainfall pressure
- preserve memory of cumulative wetness
- avoid dependence on physical soil probes in v1

### 2.2 Ground movement proxy

```text
normalized_slope_pct = min(100, (slope_degrees / 45) * 100)

ground_movement_proxy_pct =
  clamp(
    0,
    100,
    (0.50 * normalized_slope_pct) +
    (0.30 * soil_moisture_proxy_pct) +
    (0.20 * historical_landslide_frequency_pct)
  )
```

Use this proxy for:

- hotspot ranking
- operator context
- alert explanation text

## 3. Model Output

The Random Forest must emit or be mapped to a `0-100` score.

### Risk mapping

| Score | Level |
| --- | --- |
| `0-29` | `SAFE` |
| `30-69` | `WATCH` |
| `70-100` | `DANGER` |

## 4. Forecasting Logic

The platform must calculate:

- current prediction
- `+1h` prediction
- `+2h` prediction

### Preferred forecast source

1. provider hourly forecast
2. short trend extrapolation from recent rainfall

For each horizon:

1. estimate rainfall
2. recompute soil moisture proxy
3. reuse static slope and historical frequency
4. call the ML service

## 5. Hotspot Logic

A hotspot is any zone that matches one of these:

- current `DANGER`
- `WATCH` now and `DANGER` within the next two hours
- unusually steep score increase between horizons

## 6. Alert Trigger Logic

### Automatic alert

Trigger when:

- current risk is `DANGER`, or
- forecast reaches `DANGER` within one to two hours and the trend is rising

### Manual alert

Officials may trigger manually with justification when:

- field teams confirm local instability
- access routes need to be closed preemptively

## 7. Alert Payload Requirements

Every alert should include:

- zone name
- risk level
- whether the risk is current or forecast
- nearest safe shelter
- short evacuation route summary
- emergency contact reference

## 8. Cooldown Logic

To reduce alert spam:

- apply a zone-level cooldown after a successful alert
- allow admin override for manual dispatch
- record every blocked alert attempt in audit logs

## 9. Fail-Safe Rules

When upstream data is degraded:

- if rainfall data is stale, label results as stale and reduce confidence
- if forecast data is missing, continue current prediction and mark forecast unavailable
- if the ML service is unavailable, fall back to a transparent rules-based score using rainfall, slope, and history

### Rules-based fallback

Example fallback:

```text
fallback_score =
  min(
    100,
    (0.40 * normalized_rainfall_pct) +
    (0.30 * normalized_slope_pct) +
    (0.20 * soil_moisture_proxy_pct) +
    (0.10 * historical_landslide_frequency_pct)
  )
```

## 10. Persistence Rules

- current predictions go to `risk_predictions`
- future predictions go to `forecast_snapshots`
- each alert write creates an `alert_events` record
- operator overrides create `audit_logs` records

## 11. Removed Legacy Assumptions

The updated business logic no longer depends on:

- MQTT telemetry
- physical sensor health signals
- RF plus XGBoost ensemble averaging
- IVR as a required v1 alert path
