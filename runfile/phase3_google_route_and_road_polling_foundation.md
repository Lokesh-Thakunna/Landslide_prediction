# Phase 3 Google Route And Road Polling Foundation

## Task completed

Implemented the next task slice from `Task_HH-LEWS_Improvements.md` for the Google Maps integration improvement:

- server-side computed safe-zone route endpoint foundation
- internal road-condition sync API for worker-driven polling
- worker road polling runner for elevated-risk zones
- citizen app integration for computed route distance, warnings, and step flow

This slice advances the remaining Google Maps items around:

- `GET /api/safe-zones/:id/route`
- road condition polling on a timed worker cycle
- server-side route computation that can later swap to real Google Directions
- citizen route experience based on a computed path instead of only static route metadata

## What was built

### 1. Shared contracts for computed routes and road sync

Updated `packages/contracts/src/index.ts`.

Added shared schemas and types for:

- computed safe-zone route response payloads
- route steps with per-step road status
- internal worker road-condition sync payloads

This gives the API and worker a stable contract for the new route and polling flow.

### 2. Server-side computed route helper and public endpoint

Added `services/api/src/lib/computed-route.ts` and updated `services/api/src/routes/public.routes.ts`.

The API now exposes:

```text
GET /api/safe-zones/:zoneId/route?from_lat=...&from_lon=...&lang=...
```

The endpoint currently computes a Google-style route response using:

- the published evacuation path
- current road-condition segment geometry
- current safe shelter metadata
- blocked and flooded road awareness for warnings and avoided-road notes

It returns:

- origin and destination
- route distance and duration
- polyline string
- explicit route coordinates
- step-by-step instructions
- route warnings
- blocked roads avoided
- fallback landmark directions

This is a foundation implementation designed so a real Google Directions client can replace the internal simulator later without changing the citizen app contract again.

### 3. Internal road-condition sync foundation

Updated:

- `services/api/src/routes/internal.routes.ts`
- `services/api/src/lib/state-store.ts`

The API now supports internal worker polling flow with:

- `GET /api/internal/zones/risk-view`
- `GET /api/internal/zones/:zoneId/road-conditions`
- `POST /api/internal/road-conditions/sync`

The state store now supports road-condition updates per segment so worker refreshes can persist back into runtime state.

### 4. Worker road polling runner

Added `services/worker/src/services/road-condition-polling-runner.ts` and updated:

- `services/worker/src/clients/api-gateway.ts`
- `services/worker/src/config/env.ts`
- `services/worker/src/worker.ts`

The worker now has a second periodic flow alongside risk-cycle syncing:

- fetch elevated-risk zones from the API
- pull current road conditions for those zones
- generate refreshed Google-roads-style status updates
- sync those updates back to the API

For now this is a deterministic simulation layer, not live Google Roads traffic. It still gives the project a real polling architecture and update loop.

### 5. Citizen app computed-route integration

Updated:

- `citizen_app/src/types.ts`
- `citizen_app/src/services/api.ts`
- `citizen_app/src/hooks/useCitizenData.ts`
- `citizen_app/src/hooks/useEvacuationTracker.ts`
- `citizen_app/src/components/RouteCard.tsx`
- `citizen_app/src/components/EvacuationNavigationCard.tsx`
- `citizen_app/src/App.tsx`

The citizen app now:

- requests the computed route after live location guidance resolves
- stores the computed safe-zone route separately from the published route metadata
- uses computed route coordinates in live navigation tracking
- shows computed-route distance, ETA, warnings, and avoided blocked roads
- prefers computed-route instructions when available

This moves the citizen flow closer to the intended “route-from-current-location” behavior from the Google Maps improvement spec.

### 6. Env template update

Updated `env.example`.

Added:

- `ROAD_CONDITION_POLL_INTERVAL_MINUTES=30`

This documents the worker poll cadence for the new road-refresh loop.

## Files changed and what each one does

- `packages/contracts/src/index.ts`
  - Adds shared route-computation and road-sync schemas/types

- `services/api/src/lib/computed-route.ts`
  - Builds the computed safe-zone route response from current road and path data

- `services/api/src/lib/state-store.ts`
  - Adds road-condition sync persistence for worker updates

- `services/api/src/routes/public.routes.ts`
  - Adds `GET /api/safe-zones/:zoneId/route`

- `services/api/src/routes/internal.routes.ts`
  - Adds internal risk-view, zone road snapshot fetch, and road-condition sync endpoints

- `services/worker/src/clients/api-gateway.ts`
  - Adds methods for risk-view fetch, road-condition fetch, and road-condition sync

- `services/worker/src/services/road-condition-polling-runner.ts`
  - Adds the road polling runner for elevated-risk zones

- `services/worker/src/config/env.ts`
  - Adds road polling interval config

- `services/worker/src/worker.ts`
  - Starts the road polling loop alongside the existing risk-cycle loop

- `citizen_app/src/types.ts`
  - Adds computed-route response types

- `citizen_app/src/services/api.ts`
  - Adds computed-route API fetch and local fallback adaptation

- `citizen_app/src/hooks/useCitizenData.ts`
  - Loads and stores computed-route results after location refresh

- `citizen_app/src/hooks/useEvacuationTracker.ts`
  - Uses computed-route coordinates and duration for live tracking

- `citizen_app/src/components/RouteCard.tsx`
  - Shows computed-route summary, warnings, and avoided blocked roads

- `citizen_app/src/components/EvacuationNavigationCard.tsx`
  - Uses computed-route steps and ETA in the navigation surface

- `citizen_app/src/App.tsx`
  - Passes the computed-route payload into route and navigation cards

- `env.example`
  - Documents the worker road-poll interval

## How it works

1. The citizen refreshes live location guidance.
2. The app gets the citizen GPS coordinates and current zone.
3. The app calls `GET /api/safe-zones/:zoneId/route`.
4. The backend builds a computed route from:
   - the published evacuation path
   - road segment geometry
   - current road-condition states
   - the configured safe shelter
5. The app receives route coordinates, ETA, warnings, and step data.
6. The navigation tracker uses the computed route path for the live map/navigation card.
7. Separately, the worker polls elevated-risk zones on a timed interval and refreshes segment conditions through the internal sync API.
8. Future route calls then use the fresher road-condition state.

## Scope note

This is a Google integration foundation, not the final live Google Maps production implementation.

It does **not** yet include:

- real Google Directions API calls
- real Google Roads traffic or incident polling
- full dashboard map migration from Leaflet to Google Maps JavaScript API
- live traffic layer rendering on the dashboard
- Redis-backed caching for route requests
- Places API discovery of dynamic shelters

What it does provide now is the architecture and app contract needed for that later swap:

- server-side route endpoint
- worker road polling loop
- syncable road-state updates
- citizen computed-route consumption

## How to run

### Root build

```bash
npm run build
```

### API

```bash
cd services/api
npm run dev
```

### Worker

```bash
cd services/worker
npm run dev
```

The worker now runs:

- risk cycle sync
- road-condition polling sync

### Citizen app

```bash
cd citizen_app
npm run dev
```

Refresh live location guidance first, then review the computed route summary and navigation card.

### Dashboard

```bash
cd dashboard
npm run dev
```

The existing dashboard still uses Leaflet, but road-condition overlays now have a worker-driven refresh path behind them.

## Verification done

- `npm run build` at repo root: passed
- `npm run build` in `citizen_app`: passed
- `npm run build` in `dashboard`: build output completed successfully

Dashboard still shows the existing Leaflet image warnings during build, and the dashboard build command remained slower than expected in this environment, but the build output itself completed successfully.
