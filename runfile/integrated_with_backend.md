# Integrated With Backend

This guide explains the connected team flow after adding the Person 3 backend.

Now the integration path is:

- Person 1 dashboard -> Person 3 backend
- Person 2 citizen app -> Person 3 backend
- Person 3 worker -> Person 4 ML service
- Person 3 backend -> Person 1 realtime updates

So all four people are now connected through one backend-centered architecture.

## 1. Final Connection Overview

### Person 1

Person 1 owns the dashboard frontend.

Dashboard should consume:

- auth APIs
- zones risk API
- forecast API
- hotspots API
- shelters API
- evacuation route API
- alert log API
- alert trigger API
- websocket realtime events

### Person 2

Person 2 owns the citizen app.

Citizen app should consume:

- zones risk API
- forecast API
- shelters API
- evacuation route API
- weather API
- subscribe API

### Person 3

Person 3 now acts as the integration hub.

Backend and worker handle:

- auth
- shared API contracts
- current risk serving
- forecast serving
- shelter and route serving
- alert creation
- subscribe flow
- realtime events
- worker polling and sync
- persistence in `.runtime/state.json`

### Person 4

Person 4 owns ML and data.

ML should provide:

- `POST /ml/predict`
- current and forecast-compatible scoring
- top feature output

Person 3 worker sends ML input to Person 4 and uses output to update APIs for Person 1 and Person 2.

## 2. Backend-Centered Architecture

```text
Person 4 ML
    |
    v
Person 3 Worker ----> Person 3 API ----> Person 1 Dashboard
                          |
                          +-----------> Person 2 Citizen App
```

### Meaning of this flow

- Person 4 does not need to talk directly to Person 1 or Person 2
- Person 1 and Person 2 do not need to call ML directly
- Person 3 backend becomes the single shared source for app integration

This is the correct team integration shape.

## 3. Files Used For Integration

### Main backend integration files

- [packages/contracts/src/index.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/packages/contracts/src/index.ts)
- [services/api/src/app.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/api/src/app.ts)
- [services/api/src/routes/public.routes.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/api/src/routes/public.routes.ts)
- [services/api/src/routes/protected.routes.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/api/src/routes/protected.routes.ts)
- [services/api/src/routes/internal.routes.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/api/src/routes/internal.routes.ts)
- [services/api/src/lib/realtime-server.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/api/src/lib/realtime-server.ts)
- [services/api/src/lib/state-store.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/api/src/lib/state-store.ts)
- [services/worker/src/services/risk-cycle-runner.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/worker/src/services/risk-cycle-runner.ts)
- [services/worker/src/clients/ml-client.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/worker/src/clients/ml-client.ts)

### Supporting runfile docs

- [backend_run.md](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/runfile/backend_run.md)
- [dashboard_run.md](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/runfile/dashboard_run.md)
- [citizen_run.md](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/runfile/citizen_run.md)
- [ml_and_data_run.md](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/runfile/ml_and_data_run.md)

## 4. Exact Handoff From Person 3 To Person 1

Person 1 should use these APIs:

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/zones/risk`
- `GET /api/zones/:zoneId/forecast`
- `GET /api/hotspots`
- `GET /api/weather/live?zone_id=...`
- `GET /api/safe-shelters?zone_id=...`
- `GET /api/evacuation-routes?zone_id=...`
- `GET /api/alerts/logs`
- `POST /api/alerts/trigger`

Person 1 should also consume realtime events:

- `zone_risk_updated`
- `zone_forecast_updated`
- `hotspot_updated`
- `alert_dispatched`

Person 1 should follow contracts from:

- [packages/contracts/src/index.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/packages/contracts/src/index.ts)

## 5. Exact Handoff From Person 3 To Person 2

Person 2 should use these APIs:

- `GET /api/zones/risk`
- `GET /api/zones/:zoneId/forecast`
- `GET /api/safe-shelters?zone_id=...`
- `GET /api/evacuation-routes?zone_id=...`
- `GET /api/weather/live?zone_id=...`
- `POST /api/subscribe`

Person 2 should also follow contracts from:

- [packages/contracts/src/index.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/packages/contracts/src/index.ts)

## 6. Exact Handoff From Person 3 To Person 4

Person 4 should expose ML at:

- `POST /ml/predict`

Worker sends:

- `zoneId`
- `horizonHours`
- `rainfallMmHr`
- `slopeDegrees`
- `soilMoistureProxyPct`
- `historicalLandslideFrequency`

Worker expects back:

- `zoneId`
- `horizonHours`
- `riskScore`
- `riskLevel`
- `topFeatures`
- `predictedAt`

Person 4 should align with:

- [packages/contracts/src/index.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/packages/contracts/src/index.ts)
- [services/worker/src/clients/ml-client.ts](C:/Users/lt22c/OneDrive/Desktop/Landslide_prediction-main/services/worker/src/clients/ml-client.ts)

## 7. How Person 3 Connects Person 1, 2, and 4

Person 3 backend is the central bridge.

### Connection for Person 1

- API gives dashboard current risk
- API gives dashboard forecasts
- API gives dashboard hotspot data
- API gives dashboard alert logs
- API allows manual alert trigger
- websocket pushes live updates

### Connection for Person 2

- API gives citizen app current risk
- API gives citizen app forecast
- API gives citizen app shelters and routes
- API takes citizen subscriptions

### Connection for Person 4

- worker sends feature payload to ML service
- worker gets scored output back
- worker pushes score and forecast into API state
- API exposes that output to both frontends

## 8. Run Order For Full Team Integration

### Step 1. Person 3 backend

From repo root:

```bash
npm install
copy env.example .env
npm run build
```

Run API:

```bash
npm run dev:api
```

Run worker:

```bash
npm run dev:worker
```

### Step 2. Person 4 ML

Person 4 should run their ML service and set:

- `ML_SERVICE_URL`
- `ML_INTERNAL_API_KEY`

If ML is not available yet, backend still works with fallback scoring.

### Step 3. Person 1 dashboard

Person 1 should set frontend env:

- `VITE_API_BASE_URL=http://localhost:3000`
- `VITE_WS_URL=ws://localhost:3000`

### Step 4. Person 2 citizen app

Person 2 should set frontend env:

- `VITE_API_BASE_URL=http://localhost:3000`

## 9. Integration Status

### Already connected on Person 3 side

- API routes are ready
- worker is ready
- internal worker sync is ready
- websocket event layer is ready
- local persistence is ready
- testing collection is ready

### Person 1 side expectation

Dashboard should stop using mock mode and start using backend URLs.

### Person 2 side expectation

Citizen app should stop using mock mode and start using backend URLs.

### Person 4 side expectation

ML should plug into the worker endpoint flow.

## 10. Current Limitation

The team is now integrated with backend as the central connection layer, but one thing is still true:

- persistence is file-backed right now, not full PostgreSQL runtime wiring

That means:

- integration is ready
- demo flow is ready
- frontend/backend/ML coordination is ready
- later production hardening can still be done

## 11. What To Tell The Team In One Line

Use this summary:

`Person 1 and Person 2 should now connect only to Person 3 backend, and Person 4 should connect only to Person 3 worker through the ML predict contract.`
