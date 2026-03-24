# Phase 2 Offline Guidance Foundation

## Task completed

Implemented the next task slice from `Task_HH-LEWS_Improvements.md` for the location-routing improvement:

- citizen offline compass guidance foundation
- service-worker based offline shell and district tile caching
- citizen app offline readiness state and cache-status handling
- richer PWA manifest wiring for installable/offline behavior

This slice covers the next location-routing spec items:

- citizen PWA offline compass bearing screen
- offline map tile pre-caching strategy in a service worker
- offline-ready PWA shell for disaster-time fallback guidance

## What was built

### 1. Offline readiness hook for the citizen app

Added `citizen_app/src/hooks/useOfflineReadiness.ts`.

This hook now:

- registers the citizen service worker
- tracks online/offline browser state
- tracks whether the service worker is ready
- stores cached district ids in local storage
- receives cache-status messages from the service worker
- automatically asks the service worker to cache the currently selected district
- exposes a manual retry button for offline preparation

This gives the citizen app a real app-level offline status instead of only a static install message.

### 2. Dedicated offline compass guidance card

Added `citizen_app/src/components/OfflineCompassCard.tsx`.

This new UI surface uses the existing `locationStatus.evacuation.offline_fallback` data and the phone heading already captured in the app to show:

- current connectivity state
- whether offline guidance is prepared
- recommended safe shelter
- bearing label and distance
- a large compass arrow that rotates relative to the user heading
- landmark fallback text for no-network movement

This is the first real offline navigation surface in the citizen app.

### 3. Service worker foundation for offline shell and map tiles

Added `citizen_app/public/sw.js`.

The new service worker now:

- caches the app shell
- caches local demo data
- supports cache-first behavior for OpenStreetMap tiles
- supports stale-while-revalidate for same-origin citizen app assets
- accepts `PRECACHE_DISTRICT` messages from the app
- pre-caches district tile ranges for pilot districts
- sends progress/result messages back to the citizen UI

This is intentionally a foundation implementation. It does not yet try to download the full Uttarakhand tile set, but it establishes the disaster-mode caching flow.

### 4. PWA manifest and browser wiring improvements

Updated the citizen app HTML and manifest so the app now has:

- manifest linked from `index.html`
- mobile web app capability meta
- manifest language/orientation metadata
- explicit app icon metadata
- safety/navigation categories

This makes the citizen app properly discoverable as a PWA instead of only shipping an unused manifest file.

### 5. Citizen app integration

Updated `citizen_app/src/App.tsx` to connect the new offline readiness hook and offline compass card into the main app flow.

The offline guidance surface now sits alongside the live guidance card, so citizens can see both:

- full/live location guidance when the network works
- fallback compass guidance when connectivity drops

## Files changed and what each one does

- `citizen_app/src/hooks/useOfflineReadiness.ts`
  - Registers the service worker
  - Tracks online/offline state
  - Tracks cache preparation state
  - Stores cached districts
  - Triggers district pre-cache requests

- `citizen_app/src/components/OfflineCompassCard.tsx`
  - Renders the offline compass UI
  - Shows cache status, bearing, landmark fallback, and safe shelter details
  - Rotates the guidance arrow relative to the phone heading

- `citizen_app/public/sw.js`
  - Implements the citizen app service worker
  - Caches app shell assets
  - Adds map tile caching logic
  - Handles district offline pre-cache requests
  - Broadcasts cache progress back to the app

- `citizen_app/src/App.tsx`
  - Wires the offline readiness hook into the app
  - Adds the new offline compass card to the main citizen screen

- `citizen_app/public/manifest.webmanifest`
  - Expands the manifest with icon, orientation, language, and category metadata

- `citizen_app/index.html`
  - Connects the manifest to the page
  - Adds mobile web app capability metadata

## How it works

1. The citizen app loads and registers the service worker.
2. When a zone/district is selected, the app asks the service worker to prepare offline guidance for that district.
3. The service worker caches:
   - app shell assets
   - local demo data
   - district OpenStreetMap tiles for the configured zoom levels
4. The service worker sends status updates back to the app.
5. The offline compass card shows:
   - online/offline state
   - whether the district cache is ready
   - the fallback bearing and landmark guidance already available from location status
6. If connectivity drops later, the citizen still has:
   - cached shell
   - cached demo/offline assets
   - cached district tiles
   - compass bearing guidance
   - landmark fallback text

## Current scope and limitations

This is a foundation slice, not the final offline navigation system.

It does **not** yet include:

- full live blue-dot map navigation
- turn-by-turn dedicated navigation screen
- full-state Uttarakhand tile pack
- background route recomputation while walking
- district-specific tile optimization from backend-generated manifests

What it does provide now is the first practical offline fallback layer:

- service worker installation
- district cache preparation
- offline-ready shell
- cached pilot-district tile strategy
- visible compass-based safe-zone guidance in the citizen app

## How to run

### Root services build

```bash
npm run build
```

### Citizen app dev mode

```bash
cd citizen_app
npm run dev
```

### Citizen app production preview

```bash
cd citizen_app
npm run build
npm run preview
```

Use the production preview if you want the closest test of the service worker and offline behavior.

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
