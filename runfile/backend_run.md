# Backend Run And Handoff Guide

This document explains:

- what has been completed so far for Person 3
- what each important backend file/folder does
- how to run the backend
- what to hand off to Person 1, Person 2, and Person 4

## 1. What Work Has Been Completed

The following backend work has already been done:

### Core backend structure

- created a proper monorepo-style backend structure
- created shared contracts package for stable API data shapes
- created separate API and worker services

### API server

- built Express API server
- added auth routes
- added public data routes
- added protected alert trigger route
- added internal worker sync routes
- added middleware for auth, validation, and error handling
- added Socket.io real-time event server

### Functional backend APIs

- health check API
- login, refresh, logout APIs
- districts API
- zones risk API
- zone forecast API
- hotspots API
- safe shelters API
- evacuation routes API
- live weather API
- alert logs API
- citizen subscribe API
- manual alert trigger API

### Worker service

- created worker service
- added weather client
- added ML client
- added API gateway sync client
- added proxy generation logic
- added fallback risk scoring when ML service is unavailable
- added periodic risk cycle runner

### Persistence and runtime

- added durable local persistence using `.runtime/state.json`
- subscriptions and alerts now persist across restart
- worker-updated risk and forecast state also persists

### Dev and infra support

- installed all npm dependencies
- added Dockerfiles for API and worker
- added `docker-compose.yml`
- added root workspace scripts
- added Postman collection for backend testing

### Verified by testing

- `npm install` completed
- `npm run build` completed
- login worked
- zone risk and forecast APIs worked
- subscribe worked
- manual alert trigger worked
- persistent state file was generated correctly

## 2. Backend Folder Structure

```text
Landslide_prediction-main/
|-- packages/
|   `-- contracts/
|       `-- src/index.ts
|-- services/
|   |-- api/
|   |   |-- src/
|   |   |   |-- config/
|   |   |   |-- data/
|   |   |   |-- lib/
|   |   |   |-- middleware/
|   |   |   `-- routes/
|   |   `-- Dockerfile
|   `-- worker/
|       |-- src/
|       |   |-- clients/
|       |   |-- config/
|       |   |-- services/
|       |   `-- utils/
|       `-- Dockerfile
|-- postman/
|   `-- Bhurakshan_Person3.postman_collection.json
|-- .runtime/
|   `-- state.json
|-- docker-compose.yml
|-- env.example
|-- package.json
`-- runfile/
    `-- backend_run.md
```

## 3. Important Files Explained

### Root level

#### [package.json](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/package.json)

Root workspace config.

Used for:

- workspace management
- root scripts like build and dev commands
- installing all backend packages together

#### [tsconfig.base.json](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/tsconfig.base.json)

Shared TypeScript config for API, worker, and contracts.

#### [env.example](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/env.example)

Template for all required environment variables.

You should copy this to `.env`.

#### [docker-compose.yml](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/docker-compose.yml)

Basic container setup for:

- API
- worker
- PostgreSQL
- Redis

#### [.gitignore](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/.gitignore)

Ignores:

- `node_modules`
- `dist`
- `.env`
- `.runtime`
- logs

### Shared contracts

#### [packages/contracts/src/index.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/packages/contracts/src/index.ts)

Most important shared contract file.

Used for:

- request/response schemas
- type safety between backend and frontend
- stable handoff to Person 1, 2, and 4

Contains:

- risk level schemas
- auth request schemas
- zone/district schemas
- weather schemas
- forecast schemas
- hotspot schemas
- shelter and route schemas
- subscription schemas
- alert schemas
- internal ML request/response schemas
- internal worker sync schemas

### API service

#### [services/api/src/server.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/api/src/server.ts)

Starts the API server.

#### [services/api/src/app.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/api/src/app.ts)

Main Express app wiring.

Used for:

- CORS
- helmet
- JSON parsing
- cookies
- logging
- rate limiting
- auth routes
- public routes
- protected routes
- internal routes

#### [services/api/src/config/env.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/api/src/config/env.ts)

Loads and normalizes environment variables.

#### [services/api/src/data/seed.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/api/src/data/seed.ts)

Seed data for:

- users
- districts
- zones
- shelters
- routes
- initial predictions
- initial forecasts
- weather
- hotspots

This is useful for frontend integration even before a real database is connected.

#### [services/api/src/lib/state-store.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/api/src/lib/state-store.ts)

Very important runtime storage layer.

Used for:

- loading initial seed data
- persisting live state into `.runtime/state.json`
- storing subscriptions
- storing alerts
- storing weather/prediction/forecast updates
- exposing methods used by routes and worker sync

#### [services/api/src/lib/auth-service.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/api/src/lib/auth-service.ts)

Handles:

- login
- token generation
- refresh token flow
- token verification
- logout

#### [services/api/src/lib/alert-dispatcher.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/api/src/lib/alert-dispatcher.ts)

Handles alert sending.

Current behavior:

- if Twilio creds are missing, uses simulated delivery
- if Twilio creds are present, tries actual SMS/WhatsApp dispatch

#### [services/api/src/lib/realtime-server.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/api/src/lib/realtime-server.ts)

Socket.io event broadcaster.

Emits:

- `zone_risk_updated`
- `zone_forecast_updated`
- `hotspot_updated`
- `alert_dispatched`

#### [services/api/src/middleware/auth.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/api/src/middleware/auth.ts)

Auth middleware for:

- bearer token protected routes
- internal API key protected routes

#### [services/api/src/middleware/error-handler.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/api/src/middleware/error-handler.ts)

Central error handling.

#### [services/api/src/routes/auth.routes.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/api/src/routes/auth.routes.ts)

Routes:

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

#### [services/api/src/routes/public.routes.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/api/src/routes/public.routes.ts)

Routes:

- `GET /api/health`
- `GET /api/districts`
- `GET /api/zones/risk`
- `GET /api/zones/:zoneId/forecast`
- `GET /api/hotspots`
- `GET /api/safe-shelters`
- `GET /api/evacuation-routes`
- `GET /api/weather/live`
- `GET /api/alerts/logs`
- `POST /api/subscribe`

#### [services/api/src/routes/protected.routes.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/api/src/routes/protected.routes.ts)

Protected route:

- `POST /api/alerts/trigger`

#### [services/api/src/routes/internal.routes.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/api/src/routes/internal.routes.ts)

Internal routes for worker/dev:

- `GET /api/internal/zones/active`
- `POST /api/internal/risk-cycles`
- `POST /api/internal/reset-state`

### Worker service

#### [services/worker/src/worker.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/worker/src/worker.ts)

Starts the background worker loop.

#### [services/worker/src/config/env.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/worker/src/config/env.ts)

Loads worker-specific env settings.

#### [services/worker/src/clients/api-gateway.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/worker/src/clients/api-gateway.ts)

Worker to API communication.

Used for:

- fetching active zones
- syncing risk cycles back into API state

#### [services/worker/src/clients/weather-client.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/worker/src/clients/weather-client.ts)

Handles weather fetching.

Supports:

- OpenWeatherMap
- Open-Meteo fallback
- deterministic simulated fallback

#### [services/worker/src/clients/ml-client.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/worker/src/clients/ml-client.ts)

Connects worker to Person 4 ML service.

If ML is not available:

- local fallback scoring is used

#### [services/worker/src/utils/risk.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/worker/src/utils/risk.ts)

Contains:

- soil moisture proxy logic
- ground movement proxy logic
- fallback risk scoring logic

#### [services/worker/src/services/risk-cycle-runner.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/worker/src/services/risk-cycle-runner.ts)

Main worker logic.

Used for:

- fetching weather
- generating current and future proxy values
- calling ML service
- building hotspot payload
- syncing current and forecast updates to API

### Testing and handoff

#### [postman/Bhurakshan_Person3.postman_collection.json](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/postman/Bhurakshan_Person3.postman_collection.json)

Ready-made Postman collection for testing backend APIs.

## 4. How To Run The Backend

### Step 1. Open terminal in project root

Project root:

`C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main`

### Step 2. Install dependencies

```bash
npm install
```

### Step 3. Create env file

Windows:

```bash
copy env.example .env
```

### Step 4. Fill important `.env` values

At minimum:

- `JWT_SECRET`
- `INTERNAL_SERVICE_API_KEY`
- `WORKER_API_BASE_URL=http://localhost:3000`

Optional but recommended:

- `WEATHER_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_SMS_FROM`
- `TWILIO_WHATSAPP_FROM`
- `ML_SERVICE_URL`
- `ML_INTERNAL_API_KEY`

### Step 5. Build project

```bash
npm run build
```

### Step 6. Run API

In one terminal:

```bash
npm run dev:api
```

### Step 7. Run worker

In second terminal:

```bash
npm run dev:worker
```

### Step 8. Test health API

```bash
curl http://localhost:3000/api/health
```

If API is running correctly, it will return backend health JSON.

## 5. Demo Login Credentials

Use these for testing:

- `admin@bhurakshan.local / Admin@123`
- `chamoli.ops@bhurakshan.local / Chamoli@123`
- `analyst@bhurakshan.local / Analyst@123`

## 6. Main APIs You Will Use

### Public APIs

- `GET /api/health`
- `GET /api/districts`
- `GET /api/zones/risk`
- `GET /api/zones/:zoneId/forecast`
- `GET /api/hotspots`
- `GET /api/safe-shelters?zone_id=...`
- `GET /api/evacuation-routes?zone_id=...`
- `GET /api/weather/live?zone_id=...`
- `GET /api/alerts/logs`
- `POST /api/subscribe`

### Protected API

- `POST /api/alerts/trigger`

### Internal APIs

- `GET /api/internal/zones/active`
- `POST /api/internal/risk-cycles`
- `POST /api/internal/reset-state`

## 7. What To Handoff To Person 1

Person 1 is dashboard/frontend side.

You should handoff:

### APIs for dashboard

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/zones/risk`
- `GET /api/zones/:zoneId/forecast`
- `GET /api/hotspots`
- `GET /api/weather/live`
- `GET /api/alerts/logs`
- `GET /api/safe-shelters`
- `GET /api/evacuation-routes`
- `POST /api/alerts/trigger`

### Realtime events

- `zone_risk_updated`
- `zone_forecast_updated`
- `hotspot_updated`
- `alert_dispatched`

### Handoff files to mention

- [packages/contracts/src/index.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/packages/contracts/src/index.ts)
- [services/api/src/routes/public.routes.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/api/src/routes/public.routes.ts)
- [services/api/src/routes/protected.routes.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/api/src/routes/protected.routes.ts)
- [services/api/src/lib/realtime-server.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/api/src/lib/realtime-server.ts)

## 8. What To Handoff To Person 2

Person 2 is citizen app / mobile side.

You should handoff:

### APIs for citizen side

- `GET /api/zones/risk`
- `GET /api/zones/:zoneId/forecast`
- `GET /api/safe-shelters?zone_id=...`
- `GET /api/evacuation-routes?zone_id=...`
- `GET /api/weather/live?zone_id=...`
- `POST /api/subscribe`

### Handoff files to mention

- [packages/contracts/src/index.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/packages/contracts/src/index.ts)
- [services/api/src/routes/public.routes.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/api/src/routes/public.routes.ts)

## 9. What To Handoff To Person 4

Person 4 is ML service person.

You should handoff:

### ML endpoint expectation

Worker expects ML service at:

- `POST /ml/predict`

### Input contract needed by ML

Main expected fields:

- `zoneId`
- `horizonHours`
- `rainfallMmHr`
- `slopeDegrees`
- `soilMoistureProxyPct`
- `historicalLandslideFrequency`

### Output contract expected from ML

- `zoneId`
- `horizonHours`
- `riskScore`
- `riskLevel`
- `topFeatures`
- `predictedAt`

### Handoff files to mention

- [packages/contracts/src/index.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/packages/contracts/src/index.ts)
- [services/worker/src/clients/ml-client.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/worker/src/clients/ml-client.ts)
- [services/worker/src/services/risk-cycle-runner.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/worker/src/services/risk-cycle-runner.ts)

### Important note for Person 4

If their ML service is not available, backend still works using fallback scoring.

That means frontend can continue integration even before ML is fully connected.

## 10. What You Should Do Next

Your next practical steps:

1. set real `.env` values
2. run API and worker
3. test Postman collection
4. give API details to Person 1 and 2
5. give ML request/response contract to Person 4
6. once Person 4 is ready, test live ML integration
7. once frontend is ready, test end-to-end with dashboard and citizen app

## 11. Current Limitation

This backend is integration-ready and persistent locally, but still not final production architecture because:

- true PostgreSQL persistence is not yet wired into routes
- true Redis queue/cache flow is not yet wired into runtime
- file-backed state is being used for easier local collaboration

So for now:

- team integration can start immediately
- demo work can continue immediately
- production-grade DB/cache migration can be done later without changing public API contracts much
