# Phase 3 Road Conditions Foundation

## Task completed

Implemented the next task slice from `Task_HH-LEWS_Improvements.md` for Phase 3:

- Live road-condition data foundation
- Elevation-profile context foundation
- Dashboard road overlay and terrain review UI
- Citizen evacuation route context with road and elevation warnings

This is a practical foundation slice for `improvement_03_google_maps.md`.
It keeps the existing Leaflet/dashboard and card-based citizen UI, but adds the backend contracts, seeded route context, APIs, and visual surfaces needed before a full Google Maps traffic/directions swap.

## What was built

### 1. Shared contracts for route context

Added new shared domain models in `packages/contracts/src/index.ts`:

- `RoadStatusSchema`
- `ValleyExposureSchema`
- `RoadSegmentSchema`
- `RoadConditionSchema`
- `RoadConditionSegmentSchema`
- `ZoneRoadConditionsSchema`
- `ElevationProfileSchema`

Also enriched `EvacuationRouteSchema` with:

- `segmentIds`
- `roadStatus`
- `cautionSegmentCount`
- `blockedSegmentCount`
- `elevationGainM`
- `elevationLossM`
- `valleyExposure`
- `routeWarnings`

This gives API, dashboard, and citizen app one consistent structure.

### 2. Seeded road and terrain data in the API

Added seeded data for pilot zones in `services/api/src/data/seed.ts`:

- route segment geometry
- per-segment road condition snapshots
- elevation profile points per zone
- enriched evacuation route metadata

The seed now models realistic cases like:

- blocked shortcut roads
- caution bends with debris/slippery movement
- flooded river-edge alternatives
- route ascent/descent context

### 3. API state and public endpoints

Updated `services/api/src/lib/state-store.ts` to persist and serve:

- `roadSegments`
- `roadConditions`
- `elevationProfilesByZone`

Added logic to compute a zone road summary:

- open count
- caution count
- blocked count
- flooded count
- worst status
- latest update timestamp

Added new public API endpoints in `services/api/src/routes/public.routes.ts`:

- `GET /api/zones/:zoneId/road-conditions`
- `GET /api/zones/:zoneId/elevation-profile`

The existing evacuation route endpoint now also returns richer route metadata from the shared contract.

### 4. Dashboard support

Updated dashboard types, local mocks, service adapters, and state loading to consume the new APIs.

Built UI changes:

- `dashboard/src/components/RiskMap.tsx`
  - draws selected-zone road polylines on the map
  - color-codes them by status: open, caution, blocked, flooded
  - shows popup notes and delay per road segment

- `dashboard/src/components/ZoneDrawer.tsx`
  - shows road-condition summary card
  - shows top affected road segments
  - shows elevation profile summary
  - shows a compact terrain bar profile for officials

### 5. Citizen app support

Updated citizen app types, local mocks, service adapters, and data hook to load:

- zone road conditions
- zone elevation profile
- enriched evacuation route metadata

Built UI changes in `citizen_app/src/components/RouteCard.tsx`:

- road status summary
- caution and blocked counts
- ascent/descent summary
- valley exposure summary
- route warnings
- highlighted risky road segments
- elevation guidance note

This gives the citizen app stronger navigation context even before a full map/polyline screen is introduced.

## Files changed and what each one does

- `packages/contracts/src/index.ts`
  - Added shared schemas and types for road conditions and elevation profiles.

- `services/api/src/data/seed.ts`
  - Added seeded road segments, road conditions, elevation profiles, and richer route metadata.

- `services/api/src/lib/state-store.ts`
  - Persisted the new route-context data and added summary builders/getters.

- `services/api/src/routes/public.routes.ts`
  - Exposed road-condition and elevation-profile public endpoints.

- `dashboard/src/types.ts`
  - Added dashboard-side road/elevation types and enriched route shape.

- `dashboard/src/services/api.ts`
  - Added adapters and API calls for road-condition and elevation-profile data.

- `dashboard/src/hooks/useDashboardData.ts`
  - Loads selected-zone road conditions and elevation profile with forecast, shelters, route, and media.

- `dashboard/src/components/RiskMap.tsx`
  - Added route-condition polyline overlays and map legend entries.

- `dashboard/src/components/ZoneDrawer.tsx`
  - Added road summary and elevation profile official review panels.

- `dashboard/src/data/mockDashboard.ts`
  - Added local mock route-context data for dashboard fallback mode.

- `dashboard/src/App.tsx`
  - Passed the new selected-zone route-context data into map and drawer components.

- `citizen_app/src/types.ts`
  - Added citizen-side road/elevation types and enriched route shape.

- `citizen_app/src/services/api.ts`
  - Added adapters and API calls for road-condition and elevation-profile data.

- `citizen_app/src/hooks/useCitizenData.ts`
  - Loads road conditions and elevation profile with each selected zone.

- `citizen_app/src/components/RouteCard.tsx`
  - Shows road warnings, terrain summary, and segment-level risk context.

- `citizen_app/src/data/mockCitizen.ts`
  - Added local mock route-context data for citizen fallback mode.

- `citizen_app/src/App.tsx`
  - Passed road/elevation data into the citizen route card.

## How it works

1. Seed data defines route segments and terrain context for each pilot zone.
2. The API state store joins segments with live status snapshots and computes a zone summary.
3. The dashboard requests:
   - forecast
   - shelters
   - route
   - road conditions
   - elevation profile
   - media reports
4. The map overlays color-coded route segments, while the drawer shows officials the summary and terrain profile.
5. The citizen app requests route, road-condition, and elevation data for the selected zone.
6. The route card warns the citizen about blocked/caution segments and shows whether the route descends into more exposed terrain.

## How to run

### Root services build

From repo root:

```bash
npm run build
```

### Citizen app

```bash
cd citizen_app
npm run dev
```

### Dashboard

```bash
cd dashboard
npm run dev
```

If the API is running and `VITE_API_BASE_URL` is configured, both apps will call the live endpoints.
If not, both apps still work with the local mock/demo fallback data.

## New endpoints available

- `GET /api/zones/:zoneId/road-conditions`
- `GET /api/zones/:zoneId/elevation-profile`

## Verification done

- `npm run build` at repo root: passed
- `npm run build` in `citizen_app`: passed
- `npm run build` in `dashboard`: passed

Dashboard build still shows the existing Leaflet image warnings, but the build succeeds.

## Important note

This task slice does **not** yet replace Leaflet with the Google Maps JavaScript API, and it does **not** yet call live Google Directions/Roads/Elevation services.

What it does provide is the full application foundation needed for that next step:

- shared contracts
- route-context APIs
- zone-level road overlays
- terrain profile support
- citizen route warnings

That keeps the implementation useful now and makes the later Google integration much easier and safer.
