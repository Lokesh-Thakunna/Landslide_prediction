# BHURAKSHAN API Endpoints

This document describes the proposed implementation contract for the updated system. It reflects a documentation-first design, not a completed codebase.

## Index

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | No | Issue dashboard access token |
| `POST` | `/api/auth/refresh` | Cookie | Refresh dashboard access token |
| `POST` | `/api/auth/logout` | Cookie | End dashboard session |
| `GET` | `/api/health` | No | Health status of API, DB, Redis, ML |
| `GET` | `/api/districts` | No | List monitored districts |
| `GET` | `/api/zones/risk` | No | Current risk view for all active zones |
| `GET` | `/api/zones/:zone_id/forecast` | No | Current plus `+1h` and `+2h` forecast |
| `GET` | `/api/hotspots` | No | Highest-risk or fastest-rising zones |
| `GET` | `/api/safe-shelters` | No | Shelter list by zone or district |
| `GET` | `/api/evacuation-routes` | No | Route guidance by zone |
| `GET` | `/api/weather/live` | No | Latest rainfall for a zone |
| `GET` | `/api/alerts/logs` | Optional JWT | Alert dispatch history |
| `POST` | `/api/subscribe` | No | Citizen alert subscription |
| `POST` | `/api/alerts/trigger` | JWT | Manual alert dispatch |
| `POST` | `/ml/predict` | Internal API key | Internal ML scoring |
| `GET` | `/ml/health` | Internal API key | ML readiness check |

## 1. POST /api/auth/login

Official users only.

### Request

```json
{
  "email": "operator@bhurakshan.org",
  "password": "strong-password"
}
```

### Response

```json
{
  "access_token": "jwt-token",
  "user": {
    "id": "usr_01",
    "name": "District Operator",
    "role": "DISTRICT_OFFICIAL",
    "district_id": "dist_chamoli"
  }
}
```

## 2. POST /api/auth/refresh

Refreshes the dashboard session using an `httpOnly` cookie.

### Response

```json
{
  "access_token": "new-jwt-token"
}
```

## 3. POST /api/auth/logout

Clears the session.

### Response

```json
{
  "ok": true
}
```

## 4. GET /api/health

### Response

```json
{
  "status": "ok",
  "services": {
    "api": "ok",
    "database": "ok",
    "redis": "ok",
    "ml": "ok"
  },
  "timestamp": "2026-03-19T11:30:00Z"
}
```

## 5. GET /api/districts

### Response

```json
[
  {
    "id": "dist_chamoli",
    "name": "Chamoli",
    "zone_count": 5
  }
]
```

## 6. GET /api/zones/risk

Returns the current risk state for all active zones.

### Response

```json
[
  {
    "zone_id": "joshimath-core",
    "zone_name": "Joshimath Core",
    "district_id": "dist_chamoli",
    "risk_score": 78,
    "risk_level": "DANGER",
    "rainfall_mm_hr": 42.3,
    "soil_moisture_proxy_pct": 71.2,
    "ground_movement_proxy_pct": 66.4,
    "predicted_at": "2026-03-19T11:30:00Z",
    "is_stale": false
  }
]
```

## 7. GET /api/zones/:zone_id/forecast

Returns current plus short-horizon forecast.

### Response

```json
{
  "zone_id": "joshimath-core",
  "current": {
    "risk_score": 78,
    "risk_level": "DANGER",
    "predicted_at": "2026-03-19T11:30:00Z"
  },
  "forecast": [
    {
      "horizon_hours": 1,
      "risk_score": 82,
      "risk_level": "DANGER",
      "forecast_for": "2026-03-19T12:30:00Z"
    },
    {
      "horizon_hours": 2,
      "risk_score": 74,
      "risk_level": "DANGER",
      "forecast_for": "2026-03-19T13:30:00Z"
    }
  ],
  "top_features": [
    "rainfall_mm_hr",
    "soil_moisture_proxy_pct",
    "slope_degrees"
  ]
}
```

## 8. GET /api/hotspots

Hotspots are zones that are either dangerous now or rising fastest toward danger.

### Query Parameters

- `district`
- `limit`

### Response

```json
[
  {
    "zone_id": "joshimath-core",
    "risk_score": 78,
    "risk_level": "DANGER",
    "trend": "rising",
    "next_horizon_level": "DANGER"
  }
]
```

## 9. GET /api/safe-shelters

### Query Parameters

- `zone_id`
- `district`

### Response

```json
[
  {
    "id": "shelter_01",
    "zone_id": "joshimath-core",
    "name": "Government Inter College",
    "capacity": 350,
    "distance_km": 1.8,
    "contact_number": "+91XXXXXXXXXX"
  }
]
```

## 10. GET /api/evacuation-routes

### Query Parameters

- `zone_id`

### Response

```json
{
  "zone_id": "joshimath-core",
  "safe_shelter_id": "shelter_01",
  "distance_km": 1.8,
  "estimated_minutes": 24,
  "instruction_summary": "Take the main road south, avoid the upper ridge segment."
}
```

## 11. GET /api/weather/live

### Query Parameters

- `zone_id`

### Response

```json
{
  "zone_id": "joshimath-core",
  "rainfall_mm_hr": 42.3,
  "observed_at": "2026-03-19T11:25:00Z",
  "source": "openweathermap",
  "is_stale": false
}
```

## 12. GET /api/alerts/logs

Public access may return a limited feed. Authenticated officials may receive full operational metadata.

### Response

```json
[
  {
    "id": "alert_01",
    "zone_id": "joshimath-core",
    "risk_level": "DANGER",
    "trigger_source": "AUTO_FORECAST",
    "channels": ["SMS", "WHATSAPP"],
    "recipient_count": 187,
    "delivery_status": "QUEUED",
    "created_at": "2026-03-19T11:31:00Z"
  }
]
```

## 13. POST /api/subscribe

This endpoint handles citizen opt-in to SMS and WhatsApp warnings.

### Request

```json
{
  "phone_number": "+91XXXXXXXXXX",
  "zone_id": "joshimath-core",
  "channels": ["SMS", "WHATSAPP"]
}
```

### Response

```json
{
  "ok": true,
  "subscription_status": "ACTIVE"
}
```

## 14. POST /api/alerts/trigger

Manual operator-triggered alert.

### Request

```json
{
  "zone_id": "joshimath-core",
  "reason": "Field verification confirms slope distress",
  "channels": ["SMS", "WHATSAPP"]
}
```

### Response

```json
{
  "ok": true,
  "alert_id": "alert_02",
  "queued_channels": ["SMS", "WHATSAPP"]
}
```

## 15. POST /ml/predict

Internal-only endpoint used by the worker.

### Request

```json
{
  "zone_id": "joshimath-core",
  "horizon_hours": 1,
  "rainfall_mm_hr": 39.5,
  "slope_degrees": 38.5,
  "soil_moisture_proxy_pct": 74.1,
  "historical_landslide_frequency": 6.0
}
```

### Response

```json
{
  "zone_id": "joshimath-core",
  "horizon_hours": 1,
  "risk_score": 82,
  "risk_level": "DANGER",
  "top_features": [
    "soil_moisture_proxy_pct",
    "rainfall_mm_hr",
    "historical_landslide_frequency"
  ],
  "predicted_at": "2026-03-19T11:30:05Z"
}
```

## 16. GET /ml/health

### Response

```json
{
  "status": "ok",
  "model_name": "rf_v1",
  "feature_schema_version": "v1",
  "last_inference_at": "2026-03-19T11:30:05Z"
}
```

## WebSocket: /realtime-risk

### Server Events

- `zone_risk_updated`
- `zone_forecast_updated`
- `hotspot_updated`
- `alert_dispatched`

### Example Event

```json
{
  "event": "zone_risk_updated",
  "payload": {
    "zone_id": "joshimath-core",
    "risk_score": 78,
    "risk_level": "DANGER"
  }
}
```
