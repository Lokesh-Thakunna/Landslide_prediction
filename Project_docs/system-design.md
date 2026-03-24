# BHURAKSHAN System Design

## 1. High-Level Architecture

```text
Weather APIs ---> Worker ---> ML Service ---> Postgres/Redis ---> API Gateway ---> Dashboard
                    |              |                |               |
                    |              |                |               `--> Citizen interface
                    |              |                |
                    `-----------> Proxy generation  `--> Alert engine ---> SMS/WhatsApp
```

## 2. Component Summary

### Worker

- polls rainfall
- calculates rainfall windows
- derives soil moisture and movement proxies
- requests current and forecast inference
- evaluates alert rules

### ML service

- serves Random Forest predictions
- returns score, level, and top features

### API gateway

- exposes public and protected endpoints
- returns zone, shelter, route, and alert data
- pushes live events over WebSocket

### Database and cache

- Postgres holds durable geography and history
- Redis holds hot current state and cooldown keys

## 3. Data Flow

1. worker fetches rainfall
2. worker computes proxy signals
3. worker requests current and forecast scores from ML
4. results are stored in Postgres and cached in Redis
5. API serves the latest state
6. WebSocket pushes map and alert updates

## 4. Prediction Horizons

Required horizons:

- current
- `+1h`
- `+2h`

This allows the system to support proactive rather than purely reactive evacuation messaging.

## 5. Alert Flow

1. zone reaches `DANGER` now or in the next two hours
2. backend selects nearest shelter and route
3. alert package is composed
4. SMS and WhatsApp dispatch begin
5. dispatch is recorded in `alert_events`

## 6. Failover Strategy

- use weather provider fallback
- flag stale data instead of hiding it
- use rules-based fallback scoring if ML is unavailable
- let dashboard show degraded mode explicitly

## 7. Pilot Scope

The initial implementation should focus on a small set of known high-risk zones. This keeps the stack manageable and the demo realistic.
