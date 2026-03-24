# Phase 1 Moving Toward Danger Warning Foundation

## Task completed

Implemented the next task slice from `Task_HH-LEWS_Improvements.md` for the location-routing improvement:

- heading-aware movement detection foundation
- API warning logic for citizens moving toward danger
- citizen app device-orientation bridge
- citizen warning UI for safe turn guidance

This is the foundation slice for the spec item:

- `is_moving_toward_danger` warning logic
- citizen warning banner when the user is heading toward the hazard instead of away from it

## What was built

### 1. Shared contract support for movement guidance

Extended `LocationStatus` in `packages/contracts/src/index.ts` with a new `movement` block containing:

- `userHeadingDegrees`
- `headingLabel`
- `movingTowardDanger`
- `safeBearingDegrees`
- `safeBearingLabel`
- `dangerBearingDeltaDegrees`

This gives the backend and citizen app a shared structure for heading-aware evacuation guidance.

### 2. Backend movement logic

Added reusable heading helpers in `services/api/src/lib/geo.ts`:

- angular difference between two bearings
- `isMovingTowardDanger(...)`

Updated `services/api/src/routes/public.routes.ts` so `GET /api/location/status` can now accept:

- `heading_degrees`

The endpoint now:

- computes the user’s heading relative to the danger bearing
- computes the safe turn direction using the route/shelter bearing
- returns movement metadata in the location-status response
- adds a `moving_toward_danger` warning when the heading falls within the danger threshold

### 3. Citizen app heading capture

Updated `citizen_app/src/hooks/useCitizenData.ts` to listen for:

- `deviceorientationabsolute`
- `deviceorientation`

The hook now stores a normalized device heading and passes it to the location-status API request when live location guidance is refreshed.

This means the warning is based on actual device heading when available, instead of only static zone direction data.

### 4. Citizen warning UI

Updated `citizen_app/src/components/LocationGuidanceCard.tsx` to show:

- current heading status
- safe turn direction
- stronger red warning styling when the user is moving toward danger
- angle-to-danger context

The location-guidance surface now works more like a real emergency navigation helper instead of only a zone/shelter summary card.

### 5. Local fallback/demo support

Updated the citizen mock data in `citizen_app/src/data/mockCitizen.ts` so local/demo mode also includes:

- movement guidance state
- a sample `moving_toward_danger` warning

This keeps the feature visible even without the backend running.

## Files changed and what each one does

- `packages/contracts/src/index.ts`
  - Extended the shared location-status contract with movement guidance metadata.

- `services/api/src/lib/geo.ts`
  - Added bearing-difference and moving-toward-danger helpers.

- `services/api/src/routes/public.routes.ts`
  - Added optional `heading_degrees` handling to `GET /api/location/status`
  - Added movement metadata and heading-based warning generation

- `citizen_app/src/types.ts`
  - Added the movement block to the citizen location-status type

- `citizen_app/src/services/api.ts`
  - Extended the location-status adapter
  - Added heading query support to the live API call
  - Mapped movement data from backend response to app state

- `citizen_app/src/hooks/useCitizenData.ts`
  - Added device-orientation listeners
  - Stores current device heading
  - Sends heading with location refresh requests

- `citizen_app/src/components/LocationGuidanceCard.tsx`
  - Added current heading display
  - Added safe turn display
  - Added stronger warning state when moving toward danger
  - Added angle-to-danger display

- `citizen_app/src/App.tsx`
  - Passed device heading into the location-guidance card

- `citizen_app/src/data/mockCitizen.ts`
  - Added local mock movement state and sample danger-direction warning

## How it works

1. The citizen opens live location guidance.
2. The app reads GPS coordinates and, when available, the phone’s heading from device orientation events.
3. The app calls `GET /api/location/status` with:
   - `lat`
   - `lon`
   - `lang`
   - `heading_degrees`
4. The backend computes:
   - danger bearing
   - safe bearing
   - angle difference between the user heading and the danger direction
5. If the user heading is within the configured threshold of the danger direction, the backend adds a `moving_toward_danger` warning.
6. The citizen app renders the warning banner and shows the safer turn direction.

## Endpoint behavior added

### `GET /api/location/status`

New optional query param:

- `heading_degrees`

New response section:

- `movement`

Possible new warning:

- `moving_toward_danger`

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

### Dashboard

```bash
cd dashboard
npm run dev
```

### API

Run the existing API dev command if you want the live heading-aware route warning.
If the API is not running, the citizen app still shows the feature using local fallback/demo data.

## Verification done

- `npm run build` at repo root: passed
- `npm run build` in `citizen_app`: passed
- `npm run build` in `dashboard`: passed

Dashboard still shows the existing Leaflet image warnings during build, but the build succeeds.

## Important note

This is a strong warning foundation, not the full final navigation system.

It does **not** yet include:

- continuous live blue-dot route navigation
- automatic background re-query while the person is walking
- explicit iOS compass-permission UX flow
- route polyline turn-by-turn map screen
- full offline compass-only navigation screen

What it does provide now is the core safety behavior:

- heading-aware direction analysis
- safe-turn guidance
- real warning state when the citizen appears to be moving toward the hazard
