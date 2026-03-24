# BHURAKSHAN Technology Stack

## 1. Frontend

### Dashboard

- React
- Vite
- Tailwind CSS
- Leaflet

Reason: quick map-heavy delivery and clear component-driven UI.

### Citizen interface

- React
- Vite
- mobile-first routing and caching strategy

Reason: same team skills, easier shared UI patterns, strong fit for a simple mobile web experience.

## 2. API and Realtime

- Node.js
- Express
- Socket.io or native WebSocket layer

Reason: good fit for public APIs, auth, and event fanout.

## 3. ML

- Python
- FastAPI
- scikit-learn `Random Forest`

Reason: easy model serving, easy experimentation, no need for heavier model infrastructure in v1.

## 4. Background Jobs

- Celery
- Redis

Reason: scheduled rainfall polling, proxy generation, forecasting, and alert dispatch are all async-friendly tasks.

## 5. Data Storage

- PostgreSQL
- PostGIS
- Redis for cache and broker

Reason: geography is a first-class concern, and current zone state benefits from fast cached access.

## 6. Alerting

- Twilio SMS
- Twilio WhatsApp

Reason: simple operational stack and fewer moving parts than a multi-provider v1.

## 7. Weather Inputs

- OpenWeatherMap primary
- Open-Meteo fallback

Reason: one authenticated provider plus one simple fallback is enough for the pilot phase.

## 8. Explicit Non-Choices For v1

Not required in the updated baseline:

- MQTT
- XGBoost ensemble serving
- Exotel IVR dependency
- mandatory hardware sensor pipelines

## 9. Scaling Path

Later phases can add:

- more workers by district
- replicated ML instances
- richer forecast providers
- sensor ingestion adapters
