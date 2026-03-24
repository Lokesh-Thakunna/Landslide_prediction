# Phase 1 Location Guidance Foundation

## Task Source

Built from the **Location Mapping with Safe Route & Evacuation Path** improvement in `Task/Task_HH-LEWS_Improvements.md`.

## What Was Built

This task completes the first working foundation for location-aware evacuation guidance:

- shared contracts for live location status and nearby safe zones
- backend geo utilities for distance, bearing, and shelter ranking
- public API endpoints for live location guidance and nearby safe zones
- richer seed data for shelter coordinates, elevation, and route steps
- citizen app geolocation flow using browser GPS
- citizen app live guidance card with recommended safe zone and offline bearing fallback
- citizen app nearby safe-zones panel

This is the **foundation slice** of the routing improvement. It gives working “where do I go?” guidance now, without waiting for the full interactive map/navigation layer.

## What It Does

### Backend

The API now accepts a citizen’s live coordinates and returns:

- nearest active zone
- current risk level and score for that location
- nearest-danger direction as a bearing label
- recommended safe zone
- route steps
- offline fallback direction and landmark guidance
- nearby safe zones ranked by walking distance

### Citizen app

The citizen app now has a location guidance section where the user can:

- tap **Use my location**
- allow browser GPS access
- see their current zone context
- see where danger lies relative to them
- see the recommended shelter and distance
- see route steps
- see offline bearing fallback
- see a list of nearby safe zones

## Files Changed

### Shared contracts

- `packages/contracts/src/index.ts`
  - Added shared coordinate schema
  - Extended `SafeShelter` with `lat`, `lon`, `elevationM`
  - Extended `EvacuationRoute` with `steps`, `routeType`, `bearingDegrees`, `isUphill`
  - Added `LocationStatus`
  - Added `NearbySafeZone`
  - Added `NearbySafeZonesResponse`

### API backend

- `services/api/src/lib/geo.ts`
  - New geo helper module
  - Haversine distance
  - Bearing computation
  - Bearing-to-label conversion
  - Walking time estimation
  - Zone and shelter ranking helpers

- `services/api/src/lib/state-store.ts`
  - Added `getNearestZone`
  - Added `getNearbyShelters`

- `services/api/src/routes/public.routes.ts`
  - Added `GET /api/location/status`
  - Added `GET /api/location/nearby-safe-zones`
  - Added coordinate parsing and rounded distance helpers

- `services/api/src/data/seed.ts`
  - Added shelter coordinates
  - Added shelter elevations
  - Added structured route steps
  - Added route bearings and route metadata

- `services/api/db/schema.sql`
  - Added `lat`, `lon`, `elevation_m` to `safe_shelters`
  - Added `steps`, `route_type`, `bearing_degrees`, `is_uphill` to `evacuation_routes`
  - Added migration-safe `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` entries

### Citizen app

- `citizen_app/src/types.ts`
  - Added `LocationStatus`
  - Added `NearbySafeZone`
  - Extended shelter shape with coordinates and elevation
  - Extended local snapshot type

- `citizen_app/src/lib/i18n.ts`
  - Added location-guidance UI copy for all supported languages

- `citizen_app/src/data/mockCitizen.ts`
  - Added location-status mock data
  - Added nearby-safe-zones mock data
  - Added shelter coordinates/elevation

- `citizen_app/src/services/api.ts`
  - Added backend adapters for location status
  - Added backend adapters for nearby safe zones
  - Added `getLocationStatus`
  - Added `getNearbySafeZones`
  - Extended route and shelter adapters to carry richer fields

- `citizen_app/src/hooks/useCitizenData.ts`
  - Added location-status state
  - Added nearby-safe-zones state
  - Added geolocation loading/error state
  - Added `refreshLocationGuidance`

- `citizen_app/src/components/LocationGuidanceCard.tsx`
  - New component
  - Shows live zone context, danger direction, recommended shelter, route steps, and offline fallback

- `citizen_app/src/components/NearbySafeZonesCard.tsx`
  - New component
  - Shows ranked nearby shelters/safe zones

- `citizen_app/src/App.tsx`
  - Wired location guidance and nearby safe zones into the main citizen flow
  - Triggers live guidance fetch after language selection

## API Endpoints Added

### `GET /api/location/status`

Query params:

- `lat`
- `lon`
- `lang`

Returns:

- current user location context
- current risk at location
- danger bearing
- recommended safe zone
- route details
- offline fallback guidance
- warnings

### `GET /api/location/nearby-safe-zones`

Query params:

- `lat`
- `lon`
- `radius_km` optional

Returns:

- nearby shelters/safe zones
- distance
- walk time
- elevation
- uphill/downhill relation
- route summary
- bearing

## How It Works

1. Citizen taps **Use my location**.
2. Browser geolocation returns live GPS coordinates.
3. App calls `/api/location/status`.
4. API finds the nearest active zone using centroid proximity.
5. API ranks zone shelters using distance and bearing.
6. API returns the best shelter plus route and fallback info.
7. App shows route steps and offline direction guidance.
8. App separately calls `/api/location/nearby-safe-zones` and shows nearby alternatives.

## Important Implementation Notes

- This slice uses **zone centroid proximity** instead of PostGIS polygon containment because the current scaffold is still file/state-backed and not fully spatial-query-backed.
- This slice uses **bearing fallback and ranked shelters** instead of full turn-by-turn dynamic map routing.
- This is intentionally a strong foundation layer that fits the current codebase cleanly and can later be upgraded to:
  - PostGIS polygon containment
  - DDMO-authored evacuation paths
  - moving-toward-danger warnings
  - interactive live maps
  - offline tile caching

## Run / Verify

### Root workspace build

```bash
npm run build
```

### Citizen app

```bash
cd citizen_app
npm run build
npm run dev
```

### Dashboard

```bash
cd dashboard
npm run build
```

### API

```bash
npm run dev:api
```

## Verification Completed

- `npm run build` at repo root
- `npm run build` in `citizen_app`
- `npm run build` in `dashboard`

Note: dashboard still shows the existing Leaflet image warnings during build, but the build completes successfully.

## What This Task Does Not Yet Include

- full interactive route map in the citizen app
- device compass heading / moving-toward-danger warnings
- PostGIS zone polygon lookups
- DDMO-authored evacuation path CRUD
- danger-zone polygon overlays
- offline tile pre-caching

Those are clean next steps on top of this foundation.
