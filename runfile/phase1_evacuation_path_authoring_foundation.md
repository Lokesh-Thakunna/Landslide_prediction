# Phase 1 Evacuation Path Authoring Foundation

## Task completed

Implemented the next task slice from `Task_HH-LEWS_Improvements.md` for the Location Routing improvement:

- protected DDMO evacuation-path publishing
- route metadata persistence in the API state layer
- dashboard evacuation-path authoring panel
- citizen route view consuming published path metadata

This is the authoring and publishing foundation behind:

- `POST /api/dashboard/evacuation-paths`
- DDMO-verified evacuation path management

## What was built

### 1. Shared evacuation-path publishing contract

Added new shared route-authoring structures in `packages/contracts/src/index.ts`:

- `EvacuationPathCategorySchema`
- `EvacuationPathUpsertRequestSchema`

Extended `EvacuationRouteSchema` with publishing metadata:

- `pathCategory`
- `avoidsStreams`
- `hazardNotes`
- `verifiedBy`
- `verifiedAt`

This lets the dashboard publish richer route definitions and lets the citizen app read them back using the same shared contract.

### 2. API persistence for authored evacuation paths

Updated the in-memory/persisted API state in `services/api/src/lib/state-store.ts` so operators can publish a new route for a zone and have it replace the previously active route for that zone.

The state store now:

- validates the zone and shelter relation
- derives route distance from selected road segments
- derives caution/blocked counts from selected segment conditions
- computes route bearing
- attaches elevation context from the zone elevation profile
- stamps operator verification name and timestamp
- persists the published route to `.runtime/state.json`

### 3. Protected dashboard endpoint

Added a new authenticated endpoint in `services/api/src/routes/protected.routes.ts`:

- `POST /api/dashboard/evacuation-paths`

It:

- requires JWT auth
- enforces district-level access restrictions for district officials
- validates selected shelter and selected road segments
- saves the route through the state store
- returns the published route

### 4. Dashboard path-authoring UI

Added a new dashboard component:

- `dashboard/src/components/EvacuationPathEditor.tsx`

Officials can now:

- choose the safe shelter
- choose route category
- set walk time
- select road segments that form the route
- write route summary
- enter step-by-step instructions
- add route warnings
- add hazard notes
- mark uphill and avoids-streams flags
- publish the route

This panel is wired into the zone detail drawer, so route publishing happens in the same operational context as risk, shelters, road conditions, elevation, and reports.

### 5. Citizen route view now reflects published path metadata

The citizen route card now shows additional published-path details, including:

- path category
- road status summary
- hazard notes
- verification info

This means the route a DDMO publishes on the dashboard becomes visible in the citizen-facing route surface without extra manual sync work.

## Files changed and what each one does

- `packages/contracts/src/index.ts`
  - Added evacuation path category and route-publish request schema
  - Extended route contract with verification and hazard metadata

- `services/api/src/data/seed.ts`
  - Enriched seeded evacuation routes with authoring metadata and verification details

- `services/api/src/lib/state-store.ts`
  - Added `upsertEvacuationPath`
  - Backfilled persisted routes with defaults for newer route fields
  - Publishes and persists operator-authored routes

- `services/api/src/routes/protected.routes.ts`
  - Added `POST /api/dashboard/evacuation-paths`
  - Added validation for district ownership, shelter ownership, and road segment selection

- `services/api/db/schema.sql`
  - Added route metadata columns for:
    - `path_category`
    - `avoids_streams`
    - `hazard_notes`
    - `verified_by`
    - `verified_at`

- `dashboard/src/types.ts`
  - Added route publishing payload type
  - Extended route model with authoring metadata

- `dashboard/src/services/api.ts`
  - Added route publishing API call
  - Extended route adapters for the new route metadata
  - Added local fallback behavior for offline/demo dashboard mode

- `dashboard/src/components/EvacuationPathEditor.tsx`
  - New authoring form for publishing evacuation paths

- `dashboard/src/components/ZoneDrawer.tsx`
  - Embedded the authoring panel inside selected-zone detail view

- `dashboard/src/App.tsx`
  - Connected route-save refresh behavior

- `dashboard/src/data/mockDashboard.ts`
  - Added richer route metadata for local fallback/demo mode

- `citizen_app/src/types.ts`
  - Extended route model with authoring metadata

- `citizen_app/src/services/api.ts`
  - Extended route adapters so published path metadata reaches the citizen app

- `citizen_app/src/components/RouteCard.tsx`
  - Added display for path category, hazard notes, and verification info

- `citizen_app/src/data/mockCitizen.ts`
  - Added richer route metadata for local fallback/demo mode

## How it works

1. An operator opens a zone in the dashboard.
2. The dashboard loads that zone’s shelters, current route, road-condition segments, and elevation context.
3. The operator uses the authoring panel to select route segments and enter official path guidance.
4. The dashboard sends the publish request to `POST /api/dashboard/evacuation-paths`.
5. The API validates the request and writes the published route into the shared state store.
6. The dashboard refreshes the selected zone and shows the new published route immediately.
7. The citizen app receives the richer route metadata via the normal evacuation-route endpoint and displays it in the route card.

## What this task enables

This slice makes the routing system more operationally realistic:

- routes are no longer only seed-defined static guidance
- district officials can publish updated evacuation paths
- the published route can reflect current road-segment selection
- citizens can see route verification and hazard notes

## How to run

### Root services build

```bash
npm run build
```

### Dashboard

```bash
cd dashboard
npm run dev
```

### Citizen app

```bash
cd citizen_app
npm run dev
```

### API

Run the API with the existing project command if you want the live protected route publishing flow.
If the API is not configured, the dashboard still works in local fallback mode and simulates route publishing into local in-memory/demo state.

## Endpoint added

- `POST /api/dashboard/evacuation-paths`

## Verification done

- `npm run build` at repo root: passed
- `npm run build` in `citizen_app`: passed
- `npm run build` in `dashboard`: passed

Dashboard still shows the existing Leaflet image warnings during build, but the build succeeds.

## Important note

This task slice is a publishing foundation, not the final full map editor.

It does **not** yet include:

- drag-and-draw geometry editing on the map
- full PostGIS-backed `evacuation_paths` table usage
- active `danger_zones` polygon authoring
- turn-by-turn blue-dot navigation screen
- live moving-toward-danger detection

What it does provide is the key operational step before those features:

- officials can now publish verified evacuation path data from the dashboard
- that published route is consumed by both dashboard and citizen-facing route views
