# BHURAKSHAN Task Board

This board reflects the updated product direction: rainfall plus terrain plus historical risk data, proxy moisture and movement signals, Random Forest scoring, and current plus short-horizon forecasting.

## Team Split

| Person   | Area               | Focus                                                    |
| -------- | ------------------ | -------------------------------------------------------- |
| Person 1 | Dashboard          | map, hotspot panel, dispatch log, operator controls      |
| Person 2 | Citizen interface  | risk view, shelters, evacuation route, subscription flow |
| Person 3 | Backend and alerts | API, rainfall ingestion, alerts, auth, subscriptions     |
| Person 4 | ML and data        | zone features, proxy generation, RF model, forecasting   |

## Milestones

| Checkpoint | Goal                                                  |
| ---------- | ----------------------------------------------------- |
| PR-01      | data model, weather ingest, base ML contract          |
| PR-02      | dashboard and citizen UI scaffold, zone risk API live |
| PR-03      | current plus forecast flow end to end                 |
| PR-04      | alerting, shelters, route guidance, demo polish       |

## Person 1 - Dashboard

- [ ] Scaffold dashboard app with Leaflet map and Tailwind styles.
- [ ] Render monitored zones with `SAFE`, `WATCH`, and `DANGER` colors.
- [ ] Add zone detail drawer with current risk score and `+1h` and `+2h` forecasts.
- [ ] Show hotspot markers for highest-risk or fastest-rising zones.
- [ ] Add rainfall overlay with latest hourly values.
- [ ] Add district and risk-level filters.
- [ ] Build manual alert trigger form for operators.
- [ ] Build alert dispatch log table with channel, status, and timestamps.
- [ ] Add shelter and evacuation-route summary to the zone panel.
- [ ] Wire WebSocket updates for risk, forecast, and alert events.

## Person 2 - Citizen Interface

- [ ] Scaffold mobile-first citizen app.
- [ ] Create main risk screen with simple level, score, and rainfall context.
- [ ] Add current zone plus `+1h` and `+2h` forecast cards.
- [ ] Create nearby shelter screen with distance and capacity.
- [ ] Create evacuation-route screen with step-by-step directions.
- [ ] Build subscription flow for SMS and WhatsApp alerts.
- [ ] Add emergency contacts view.
- [ ] Add basic installability and offline-ready shell as polish, not as a v1 dependency.
- [ ] Tune UI copy for plain-language warnings and action prompts.

## Person 3 - Backend and Alerts

- [ ] Define database schema for zones, rainfall, predictions, forecasts, shelters, routes, subscribers, and alerts.
- [ ] Build weather polling worker with OpenWeatherMap primary and Open-Meteo fallback.
- [ ] Build `GET /api/health`.
- [ ] Build `GET /api/districts`.
- [ ] Build `GET /api/zones/risk`.
- [ ] Build `GET /api/zones/:zone_id/forecast`.
- [ ] Build `GET /api/hotspots`.
- [ ] Build `GET /api/safe-shelters`.
- [ ] Build `GET /api/evacuation-routes`.
- [ ] Build `GET /api/weather/live`.
- [ ] Build `GET /api/alerts/logs`.
- [ ] Build `POST /api/subscribe`.
- [ ] Build `POST /api/alerts/trigger`.
- [ ] Build auth endpoints for dashboard users.
- [ ] Build WebSocket events for risk, forecast, and alert updates.
- [ ] Add alert cooldown and duplicate-dispatch protection.
- [ ] Add Twilio SMS and WhatsApp integration.

## Person 4 - ML and Data

- [ ] Prepare historical landslide and DEM-derived zone features.
- [ ] Define per-zone `slope_degrees` and `historical_landslide_frequency`.
- [ ] Design rainfall-to-soil-moisture proxy logic.
- [ ] Design terrain-and-history movement proxy logic for hotspot explanations.
- [ ] Build training dataset for Random Forest classification or scoring.
- [ ] Train and evaluate Random Forest model.
- [ ] Expose internal `POST /ml/predict`.
- [ ] Generate `current`, `+1h`, and `+2h` predictions for each active zone.
- [ ] Persist prediction history and forecast snapshots.
- [ ] Publish top contributing features for dashboard display.

## PR-01

- [ ] schema finalized
- [ ] zone static features defined
- [ ] rainfall polling contract defined
- [ ] internal ML request and response contract defined

## PR-02

- [ ] dashboard map renders live risk zones
- [ ] citizen interface renders current risk and forecast cards
- [ ] risk endpoint serves zone-level current predictions
- [ ] forecast endpoint serves `+1h` and `+2h`

## PR-03

- [ ] rainfall ingest to proxy generation to ML scoring works end to end
- [ ] hotspot feed works
- [ ] WebSocket updates work
- [ ] shelters and evacuation route data are connected to danger zones

## PR-04

- [ ] SMS and WhatsApp alerts dispatch successfully
- [ ] alert log records dispatches and outcomes
- [ ] operator can trigger a manual zone alert
- [ ] demo flow shows escalation and action guidance clearly
