# BHURAKSHAN System Architecture

## 1. Service Breakdown

| Service | Role |
| --- | --- |
| Dashboard app | operator map, hotspots, alert log, manual controls |
| Citizen app | simplified mobile risk and evacuation interface |
| API gateway | public and protected REST plus WebSocket fanout |
| ML service | Random Forest inference and model health |
| Worker | rainfall polling, proxy generation, forecasts, alert orchestration |
| PostgreSQL and PostGIS | static geography, prediction history, shelters, routes |
| Redis | cache, broker, cooldown, pub-sub |

## 2. Architecture Summary

The v1 platform is weather-first and geo-first:

- rainfall observations enter through the worker
- slope and historical hazard features are read from static zone data
- proxy values are derived in the worker
- the ML service scores the zone for current and future horizons
- the API gateway exposes the results and fans them out via WebSocket
- alerts are triggered when danger thresholds are met

## 3. Queue Usage

Recommended Celery queues:

- `weather_queue`
- `forecast_queue`
- `alerts_queue`
- `maintenance_queue`

## 4. WebSocket Channel Design

The dashboard subscribes by district or zone.

Key events:

- `zone_risk_updated`
- `zone_forecast_updated`
- `alert_dispatched`
- `hotspot_updated`

## 5. Worker Responsibilities

The worker replaces the older sensor-stream concept for v1. It should:

- poll rainfall data every five minutes
- compute rainfall windows for each zone
- derive soil moisture proxy
- derive movement proxy for hotspot ranking
- call the ML service for current, `+1h`, and `+2h`
- evaluate alert conditions
- persist results and publish updates

## 6. Scaling Model

Phase 1 should support a small pilot set of high-risk zones such as Joshimath and nearby districts.

Scale-out path:

- horizontally scale the API gateway
- horizontally scale workers by queue
- keep ML inference stateless so it can be replicated
- retain Postgres as the source of truth and Redis as the short-lived cache

## 7. Future Extensions

The architecture should allow later addition of:

- live sensor inputs
- richer forecast sources
- voice alerts
- institutional integration with disaster management systems
