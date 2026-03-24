# Dashboard Run Guide

## What I built

I created the Person 1 dashboard as a new frontend app inside the `dashboard/` folder using the stack defined in the repo docs:

- React
- Vite
- Tailwind CSS
- Leaflet
- TypeScript

The dashboard implements the full Person 1 checklist from `Task/TASKS.md`:

- Leaflet map scaffold with Tailwind-based UI
- Monitored zones rendered with `SAFE`, `WATCH`, and `DANGER` colors
- Zone detail drawer with current score and `+1h` and `+2h` forecast cards
- Hotspot markers and hotspot watchlist
- Rainfall overlay information in the zone panel
- District and risk-level filters
- Manual alert trigger form for operators
- Alert dispatch log table with channels, status, recipients, and timestamps
- Shelter and evacuation-route summary in the zone panel
- WebSocket-ready realtime hook, with local simulated updates when no backend socket exists

Because this repository was documentation-first and did not contain an existing frontend, I built the dashboard as a self-contained app that:

- runs immediately with mock data
- follows the documented API contracts from `Project_docs/01_API_Endpoints.md`
- can switch to real backend endpoints through environment variables

## Files I created

### App scaffold and tooling

- `dashboard/package.json`
  Defines the dashboard package, dependencies, and scripts for `dev`, `build`, and `preview`.

- `dashboard/tsconfig.json`
  Root TypeScript project reference file.

- `dashboard/tsconfig.app.json`
  TypeScript configuration for the React application source code.

- `dashboard/tsconfig.node.json`
  TypeScript configuration for Vite and Node-side config files.

- `dashboard/vite.config.ts`
  Vite configuration for the dashboard dev server and build.

- `dashboard/postcss.config.js`
  PostCSS config used to enable Tailwind in the Vite build.

- `dashboard/index.html`
  Main HTML shell used by Vite to mount the React app.

- `dashboard/.env.example`
  Example environment variables for connecting the UI to a live backend API and WebSocket server.

### Entry and shared styling

- `dashboard/src/main.tsx`
  React entry point that mounts the app.

- `dashboard/src/index.css`
  Global styles, Tailwind import, background styling, and Leaflet base styling.

- `dashboard/src/vite-env.d.ts`
  Vite type definitions for `import.meta.env`.

### Shared types and utility helpers

- `dashboard/src/types.ts`
  Shared TypeScript interfaces for zones, forecasts, hotspots, shelters, routes, alerts, and dashboard snapshots.

- `dashboard/src/lib/risk.ts`
  Risk color mapping, score-to-level logic, and operator-facing risk copy helpers.

- `dashboard/src/lib/format.ts`
  Timestamp and feature-name formatting helpers used across the UI.

### Mock data and service layer

- `dashboard/src/data/mockDashboard.ts`
  Mock dataset for districts, zones, forecasts, hotspots, shelters, routes, and alerts so the dashboard can run end-to-end right now.

- `dashboard/src/services/api.ts`
  API-compatible service layer. Uses real endpoints if `VITE_API_BASE_URL` is configured; otherwise falls back to the local mock snapshot. Also includes local manual-alert creation and simulated realtime state updates.

### Data hooks

- `dashboard/src/hooks/useDashboardData.ts`
  Loads dashboard data, manages selected zone state, and fetches zone-specific forecast, shelter, and route details.

- `dashboard/src/hooks/useRealtimeDashboard.ts`
  Handles realtime updates. Connects to a live WebSocket if `VITE_WS_URL` exists; otherwise simulates update events locally for demo use.

### UI components

- `dashboard/src/components/Header.tsx`
  Top header with dashboard title and summary metric cards.

- `dashboard/src/components/FilterBar.tsx`
  District and risk-level filters for narrowing visible data.

- `dashboard/src/components/RiskMap.tsx`
  Leaflet map component that renders colored zone polygons and hotspot markers.

- `dashboard/src/components/HotspotPanel.tsx`
  Ranked hotspot watchlist showing high-risk and rising zones.

- `dashboard/src/components/ZoneDrawer.tsx`
  Detailed operator panel for the selected zone, including current status, forecasts, rainfall, proxies, top features, shelter info, and evacuation route summary.

- `dashboard/src/components/ManualAlertForm.tsx`
  Manual operator alert form with zone selection, reason entry, and channel selection.

- `dashboard/src/components/AlertDispatchLog.tsx`
  Alert log table showing zone, level, channels, status, recipient count, and timestamps.

- `dashboard/src/App.tsx`
  Main page composition that connects all sections into the final dashboard layout.

### Static map assets

- `dashboard/public/images/layers.png`
  Leaflet image asset copied for map styling compatibility.

- `dashboard/public/images/layers-2x.png`
  Retina Leaflet layer asset.

- `dashboard/public/images/marker-icon.png`
  Leaflet marker icon asset.

- `dashboard/public/images/marker-shadow.png`
  Leaflet marker shadow asset.

## How the dashboard works

### Data mode

By default, the dashboard runs in mock/demo mode with built-in sample data for monitored Himalayan zones.

If you want to connect it to a live backend later, set:

- `VITE_API_BASE_URL`
- `VITE_WS_URL`

Then the service layer and realtime hook will use the backend contracts defined in the project docs.

### Realtime behavior

- If `VITE_WS_URL` is not set, the dashboard simulates risk changes every few seconds so the map and panels still feel live.
- If `VITE_WS_URL` is set, it listens for backend events such as:
  - `zone_risk_updated`
  - `zone_forecast_updated`
  - `hotspot_updated`
  - `alert_dispatched`

## How to run the dashboard

From the repo root:

```powershell
cd dashboard
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal, usually:

```text
http://localhost:5173
```

## How to run with backend integration

1. Copy the example env file values into a real `.env` file inside `dashboard/`.
2. Point `VITE_API_BASE_URL` to the backend API.
3. Point `VITE_WS_URL` to the realtime WebSocket endpoint.
4. Start the frontend:

```powershell
cd dashboard
npm install
npm run dev
```

## Production build

To create a production build:

```powershell
cd dashboard
npm run build
```

To preview the build locally:

```powershell
npm run preview
```

## Verification completed

I verified the dashboard with:

```powershell
npm run build
```

The build completed successfully in `dashboard/`.

## Notes and assumptions

- This repo did not contain an existing dashboard codebase, so I created a fresh app under `dashboard/`.
- Since the backend is not implemented here yet, I used API-shaped mock data and a realtime simulation fallback so the UI is usable now.
- The implementation follows the documented dashboard requirements and endpoint contracts as closely as possible without inventing a different product direction.

## Handoff notes for Person 2, Person 3, and Person 4

### Handoff to Person 2

Person 2 can use this dashboard as the reference for:

- risk level naming consistency: `SAFE`, `WATCH`, `DANGER`
- forecast presentation model: `current`, `+1h`, `+2h`
- shelter and evacuation route information structure
- plain-language warning tone and action-first messaging

Useful alignment points for Person 2:

- keep citizen-facing risk cards consistent with the forecast data shape already used here
- reuse the same zone ids and district ids so both apps stay compatible with one backend
- keep shelter and route field names aligned with the documented API contracts
- simplify the operator copy for citizens, but do not rename the backend contract fields

### Handoff to Person 3

Person 3 should know this dashboard already expects the documented backend routes and realtime behavior.

Frontend integration expectations:

- `GET /api/districts`
- `GET /api/zones/risk`
- `GET /api/zones/:zone_id/forecast`
- `GET /api/hotspots`
- `GET /api/safe-shelters?zone_id=...`
- `GET /api/evacuation-routes?zone_id=...`
- `GET /api/alerts/logs`
- `POST /api/alerts/trigger`

Realtime expectation:

- WebSocket URL from `VITE_WS_URL`
- events expected by the dashboard:
  - `zone_risk_updated`
  - `zone_forecast_updated`
  - `hotspot_updated`
  - `alert_dispatched`

Important notes for Person 3:

- the frontend currently works without auth because the repo docs describe public-read endpoints for most dashboard data
- `POST /api/alerts/trigger` is already separated as the operator action path
- if auth is added later, the easiest path is to keep read endpoints compatible and protect only the operator trigger/log detail flows as needed
- the service layer is in `dashboard/src/services/api.ts`, so backend integration should mainly require setting real env values and matching response shapes

### Handoff to Person 4

Person 4 should know the dashboard is already prepared to display model output and explanation context.

The UI currently uses these ML-related values:

- `risk_score`
- `risk_level`
- `predicted_at`
- `top_features`
- `rainfall_mm_hr`
- `soil_moisture_proxy_pct`
- `ground_movement_proxy_pct`
- `slope_degrees`
- `historical_landslide_frequency`

Important notes for Person 4:

- the dashboard assumes risk scores map cleanly into the documented bands:
  - `0-29` => `SAFE`
  - `30-69` => `WATCH`
  - `70-100` => `DANGER`
- hotspot ranking is easier to explain operationally if the backend/ML layer provides clearly rising zones and not only absolute danger zones
- `top_features` is already surfaced in the zone drawer, so returning stable and readable feature names will help the operator experience
- if forecast confidence or degraded-mode metadata is added later, this dashboard can be extended easily, but the current UI already expects the base current plus `+1h` plus `+2h` flow

### Overall team handoff summary

What is ready for the rest of the team:

- dashboard frontend scaffold is complete
- UI contract is aligned to the existing project docs
- mock mode allows parallel frontend/backend/ML development without blocking each other
- service layer and hooks are separated cleanly, so replacing mock data with live backend responses will be straightforward

What the other teammates should avoid changing without coordination:

- risk level names
- forecast horizon naming
- core response field names already used by the dashboard
- zone and district identifiers once backend seeding begins
