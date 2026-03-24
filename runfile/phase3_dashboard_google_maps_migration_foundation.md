# Phase 3 Dashboard Google Maps Migration Foundation

## Task completed

Implemented the next task slice from `Task_HH-LEWS_Improvements.md` for the Google Maps integration improvement:

- dashboard map foundation for Google Maps JavaScript API
- hybrid/satellite map mode path for official operators
- road-condition overlays on the Google map surface
- traffic-layer capable dashboard map with safe Leaflet fallback

This slice advances the remaining Google Maps items around:

- dashboard map migration from Leaflet to Google Maps
- road overlay rendering on the Google map surface
- traffic-layer support for the operator dashboard
- keeping local/dev use safe when no Google key is configured

## What was built

### 1. Dual-mode dashboard map

Reworked `dashboard/src/components/RiskMap.tsx`.

The dashboard map now supports two modes:

- Google Maps mode when `VITE_GOOGLE_MAPS_KEY` is present and the script loads
- Leaflet fallback mode when the key is missing or Google Maps cannot load

This means the dashboard can move toward the spec without breaking current local preview workflows.

### 2. Google Maps dashboard surface

The new Google Maps path now renders:

- zone risk polygons
- hotspot markers
- road-condition polylines
- traffic layer
- hybrid map type for better terrain and road context

Zone clicks and hotspot clicks still drive the same zone-selection workflow used by the dashboard drawer.

### 3. Safe fallback behavior

If Google Maps is unavailable, the component now:

- shows a clear fallback state in the header
- keeps using the existing Leaflet map
- preserves all current zone, hotspot, and road overlay behavior

This keeps the project usable even before a real dashboard Google Maps key is configured.

## Files changed and what each one does

- `dashboard/src/components/RiskMap.tsx`
  - Replaces the Leaflet-only implementation with a dual-mode map
  - Loads Google Maps JavaScript API dynamically when `VITE_GOOGLE_MAPS_KEY` exists
  - Renders Google polygons, markers, road polylines, and traffic layer
  - Falls back to the previous Leaflet behavior when Google Maps is not available

## How it works

1. The dashboard checks `VITE_GOOGLE_MAPS_KEY`.
2. If a key is available, it loads the Google Maps JavaScript API dynamically.
3. Once loaded, the dashboard renders:
   - risk polygons for zones
   - hotspot markers
   - road-condition overlays for the selected zone
   - live traffic layer
4. Clicking a zone or hotspot still selects that zone in the dashboard state.
5. If the key is missing or the script fails, the component falls back to the existing Leaflet map automatically.

## Scope note

This is the dashboard migration foundation, not the full final Google Maps implementation.

It does **not** yet include:

- full Places API integration
- Street View workflows
- server-driven live traffic incident ingestion into state
- dashboard-only Google overlays beyond current zone and road layers
- removal of Leaflet dependencies from the dashboard package

What it provides now is the actual operator-facing migration path:

- optional Google Maps dashboard rendering
- traffic-layer-capable map surface
- preserved fallback behavior for local and offline-safe development

## How to run

### Dashboard with Google Maps

Set the dashboard env key:

```bash
VITE_GOOGLE_MAPS_KEY=your_dashboard_browser_key
```

Then run:

```bash
cd dashboard
npm run dev
```

When the key is valid, the dashboard map uses Google Maps with road overlays and traffic layer.

### Dashboard without Google Maps

Leave `VITE_GOOGLE_MAPS_KEY` empty and run:

```bash
cd dashboard
npm run dev
```

The dashboard will automatically use the existing Leaflet fallback.

## Verification done

- `npm run build` at repo root: passed
- `npm run build` in `dashboard`: passed

Dashboard still shows the existing Leaflet image warnings during build, but the build succeeds.
