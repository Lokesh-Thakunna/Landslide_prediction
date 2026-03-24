# Phase 2 Live Navigation Foundation

## Task completed

Implemented the next task slice from `Task_HH-LEWS_Improvements.md` for the location-routing improvement:

- real-time evacuation tracking hook
- citizen navigation-screen style route experience
- live route-line rendering from published evacuation path segments
- step-progress navigation flow with current and next instruction cards

This slice advances the remaining location-routing items around:

- citizen PWA map screen with live blue-dot style route view
- citizen PWA turn-by-turn navigation screen
- real-time location tracking hook with device compass

## What was built

### 1. Real-time evacuation tracker hook

Added `citizen_app/src/hooks/useEvacuationTracker.ts`.

This hook now:

- starts and stops continuous `navigator.geolocation.watchPosition(...)`
- keeps a live tracked user position while navigation is active
- reuses the current safe-zone destination from `locationStatus`
- rebuilds route coordinates from evacuation-path segment ids and road-condition segment geometry
- computes remaining distance, ETA, progress ratio, current step index, and heading to the safe zone
- computes a live local moving-toward-danger check when heading and danger bearing are available

This is the first actual continuous tracking layer in the citizen app.

### 2. Dedicated live navigation card

Added `citizen_app/src/components/EvacuationNavigationCard.tsx`.

This new screen-like card gives the citizen:

- a `Start route` / `Stop route` control
- a route-map panel rendered with SVG
- live user marker
- safe-zone marker
- nearest-danger marker
- route polyline built from the route's segment geometry
- current-step and next-step panels
- full step list with active/completed styling
- remaining-distance and ETA cards

This gives the app a real route-following surface instead of only summary cards.

### 3. Citizen app integration

Updated `citizen_app/src/App.tsx` to place the new navigation card directly below the live location guidance card.

This keeps the evacuation flow consistent:

1. refresh location guidance
2. confirm safe-zone direction
3. start live route tracking

## Files changed and what each one does

- `citizen_app/src/hooks/useEvacuationTracker.ts`
  - Adds continuous GPS tracking for active navigation
  - Builds route geometry from route segment ids and road segments
  - Computes remaining distance, ETA, step progress, and live bearing helpers

- `citizen_app/src/components/EvacuationNavigationCard.tsx`
  - Renders the new navigation screen/card
  - Shows route map, live position, safe-zone marker, danger marker, and step-by-step progress

- `citizen_app/src/App.tsx`
  - Wires the new navigation card into the citizen app main flow

## How it works

1. The citizen refreshes live location guidance.
2. The app already has:
   - the current user location
   - the recommended safe zone
   - the verified route metadata
   - the road segment geometry used by the route
3. When the citizen taps `Start route`, the new tracker hook begins `watchPosition(...)`.
4. As GPS updates arrive, the app recomputes:
   - current position
   - remaining distance to the safe zone
   - estimated remaining time
   - which route step is currently active
5. The navigation card renders the route line, the live user marker, and the current/next instruction panels.
6. If the heading suggests the person is turning back toward danger, the navigation card reinforces the danger warning visually.

## Scope note

This is a live-navigation foundation, not the final full map stack.

It does **not** yet include:

- Leaflet or Google Maps interactive route tiles inside this navigation surface
- server-side live rerouting
- full turn-angle instruction generation from Google Directions
- dynamic route recomputation when road conditions change mid-evacuation
- true spatial danger polygons rendered from a `danger_zones` table

What it does provide now is a practical next step:

- continuous live tracking
- route polyline visualization using existing route geometry
- turn-by-turn style progress UI
- route-start interaction for the citizen app

## How to run

### Root services build

```bash
npm run build
```

### Citizen app

```bash
cd citizen_app
npm run dev
```

Use the live location guidance button first, then start the live route from the new navigation card.

### Dashboard

```bash
cd dashboard
npm run dev
```

## Verification done

- `npm run build` at repo root: passed
- `npm run build` in `citizen_app`: passed
- `npm run build` in `dashboard`: passed

Dashboard still shows the existing Leaflet image warnings during build, but the build succeeds.
