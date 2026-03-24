# BHURAKSHAN

Hybrid Landslide Early Warning System for Himalayan districts.

This repository currently holds the planning and implementation documents for a real-time landslide warning platform that combines live rainfall data, static terrain data, and historical landslide patterns to generate actionable risk predictions and alerts.

## Vision

Build a practical early warning system that:

- predicts zone-level landslide risk in near real time
- shows current risk plus `+1 hour` and `+2 hour` forecasts
- updates a live map with hotspot context
- sends SMS and WhatsApp alerts with evacuation guidance
- recommends safe shelters and routes when a zone becomes dangerous

## Updated Detection Strategy

The project no longer depends on live sensor or delayed satellite feeds as the primary trigger.

Instead it uses:

- real-time rainfall from a weather API
- static slope and terrain context from DEM and GeoJSON sources
- historical landslide frequency for each monitored zone
- proxy soil moisture and proxy ground-movement indicators derived from rainfall and zone history
- a `Random Forest` model that outputs a `0-100` risk score

## Risk Bands

| Score | Level | Meaning |
| --- | --- | --- |
| `0-29` | `SAFE` | Normal monitoring |
| `30-69` | `WATCH` | Elevated attention and field readiness |
| `70-100` | `DANGER` | Alert and evacuation guidance |

## Planned Workflow

1. Pull rainfall observations and short-horizon forecast data from the weather provider.
2. Join rainfall with static zone features such as slope and historical landslide frequency.
3. Generate proxy soil moisture and movement indicators.
4. Run the Random Forest model for `current`, `+1h`, and `+2h`.
5. Update the dashboard map, hotspot panel, and citizen view.
6. Trigger alerts and show shelter and route guidance when a zone reaches `DANGER`.

## Planned Product Surfaces

- Official dashboard with Leaflet-based live map
- Citizen web app / PWA-style mobile interface
- Alert dispatch log for operations teams
- Internal ML inference service
- Background worker for rainfall ingestion, proxy generation, forecasting, and alert orchestration

## Repository Layout

The repository now includes a runnable Person-3 backend scaffold plus the planning docs.

```text
.
|-- README.md
|-- CONTRIBUTING.md
|-- env.example
|-- backend_infra_docs/
|   |-- ai_instruction.md
|   |-- api_structure.md
|   |-- architecture.md
|   |-- database_schema.md
|   |-- deployment.md
|   `-- features.md
|-- packages/
|   `-- contracts/          # shared zod schemas and TypeScript contracts
|-- Project_docs/
|   |-- 01_API_Endpoints.md
|   |-- 02_Database_Models.md
|   |-- 03_Authentication.md
|   |-- 04_Business_Logic.md
|   |-- goal.md
|   |-- prd.md
|   |-- security.md
|   |-- system-design.md
|   |-- techstack.md
|   |-- ui-ux.md
|   `-- user-flow.md
|-- services/
|   |-- api/                # Express API + auth + alert routes + WebSocket events
|   `-- worker/             # rainfall polling + proxy generation + ML integration fallback
`-- Task/
    `-- TASKS.md
```

## Quick Start

```bash
npm install
copy env.example .env
npm run build
npm run dev:api
npm run dev:worker
```

Docker option:

```bash
docker-compose up --build
```

Demo users for the dashboard:

- `admin@bhurakshan.local / Admin@123`
- `chamoli.ops@bhurakshan.local / Chamoli@123`
- `analyst@bhurakshan.local / Analyst@123`

## Key Documents

- `Project_docs/goal.md`: single-project summary aligned to the updated brief
- `Project_docs/prd.md`: product requirements and scope
- `Project_docs/system-design.md`: service boundaries and data flow
- `Project_docs/01_API_Endpoints.md`: proposed API contracts
- `Project_docs/04_Business_Logic.md`: scoring, proxy generation, forecasting, and alert rules
- `Task/TASKS.md`: implementation plan split by role

## Planned Stack

| Layer | Planned Technology |
| --- | --- |
| Dashboard | React + Vite + Leaflet |
| Citizen interface | React + Vite, mobile-first |
| API gateway | Node.js + Express |
| ML service | Python + FastAPI + scikit-learn |
| Background jobs | Celery + Redis |
| Database | PostgreSQL + PostGIS |
| Alerts | Twilio SMS + WhatsApp |
| Weather data | OpenWeatherMap with Open-Meteo fallback |

## Current State

The repo now contains:

- the updated documentation set
- a runnable API scaffold for frontend integration
- a worker that can poll weather, compute proxy signals, and sync predictions
- clean internal hooks for Person 4's ML service at `POST /ml/predict`
- durable local state persisted in `.runtime/state.json`
- Dockerfiles and `docker-compose.yml` for API, worker, Postgres, and Redis

The current persistence layer is file-backed for fast local setup. The public API contracts are already stable enough for Person 1 and 2 to integrate, and the worker-to-ML hook is ready for Person 4.
