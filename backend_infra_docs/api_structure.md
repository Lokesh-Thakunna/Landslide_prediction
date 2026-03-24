# BHURAKSHAN API Structure

## 1. Service Boundaries

### Public and dashboard API

Implemented by the Node.js gateway.

- auth for official users
- zone, rainfall, hotspot, shelter, and route retrieval
- alert trigger and alert log access
- citizen subscription
- WebSocket fanout

### Internal ML API

Implemented by the FastAPI service.

- zone-level prediction requests
- current and forecast inference
- model health and metadata

## 2. Core REST Groups

### Authentication

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### Public situational awareness

- `GET /api/health`
- `GET /api/districts`
- `GET /api/zones/risk`
- `GET /api/zones/:zone_id/forecast`
- `GET /api/hotspots`
- `GET /api/safe-shelters`
- `GET /api/evacuation-routes`
- `GET /api/weather/live`
- `GET /api/alerts/logs`

### Citizen actions

- `POST /api/subscribe`

### Official actions

- `POST /api/alerts/trigger`

### Internal ML

- `POST /ml/predict`
- `GET /ml/health`

## 3. Response Shape Principles

- return numeric risk as `0-100`
- always include the normalized label: `SAFE`, `WATCH`, or `DANGER`
- include current and forecast timestamps
- include shelter and route references when the zone is dangerous
- mark stale weather data explicitly

## 4. Internal Prediction Request

```json
{
  "zone_id": "joshimath-core",
  "horizon_hours": 0,
  "rainfall_mm_hr": 42.3,
  "slope_degrees": 38.5,
  "soil_moisture_proxy_pct": 71.2,
  "historical_landslide_frequency": 6.0
}
```

## 5. Internal Prediction Response

```json
{
  "zone_id": "joshimath-core",
  "horizon_hours": 0,
  "risk_score": 78,
  "risk_level": "DANGER",
  "top_features": [
    "rainfall_mm_hr",
    "soil_moisture_proxy_pct",
    "slope_degrees"
  ],
  "predicted_at": "2026-03-19T11:30:00Z"
}
```

## 6. Alert Flow

1. Backend reads the latest current and forecast scores.
2. If a zone is currently dangerous or forecast to become dangerous soon, it composes an alert package.
3. The alert package includes:
   - zone summary
   - risk level
   - nearest safe shelter
   - evacuation route summary
4. SMS and WhatsApp dispatches are queued.
5. Delivery outcomes are written to `alert_events`.

## 7. WebSocket Events

Server to client:

- `zone_risk_updated`
- `zone_forecast_updated`
- `hotspot_updated`
- `alert_dispatched`

Client to server:

- `subscribe_district`
- `subscribe_zone`

## 8. Rate Limits

- public reads: moderate IP-based throttling
- subscription endpoint: strict OTP and per-phone throttling
- manual alert trigger: strict per-user throttle
- internal ML endpoint: network-isolated plus API key protected
