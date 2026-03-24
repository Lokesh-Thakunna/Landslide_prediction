# Phase 2 Dashboard Realtime Media Updates Foundation

## What I built

This task upgrades the dashboard from polling-only refresh behavior to a websocket-first realtime flow for media and other operational updates.

The system now:

- emits realtime media report update events from the API
- broadcasts report uploads and dashboard review decisions over Socket.IO
- uses a real Socket.IO client in the dashboard
- refreshes dashboard zones, hotspots, alerts, and selected zone detail when live events arrive
- falls back to the old timed polling behavior when `VITE_WS_URL` is not configured

This is important because media uploads and review decisions now affect operational awareness and temporary risk boosts, so officials should not have to wait for the next polling cycle to see them.

## Files changed

### 1. `services/api/src/lib/realtime-server.ts`

Added:

- `emitMediaReportUpdated(payload)`

This broadcasts `media_report_updated` globally and to the matching zone room.

### 2. `services/api/src/routes/public.routes.ts`

Updated the public upload route so newly created media reports immediately emit a realtime event after they are stored.

### 3. `services/api/src/routes/protected.routes.ts`

Updated the dashboard review route so manual verification or moderation decisions also emit a realtime media event.

This means both upload-time changes and operator review changes are now visible live.

### 4. `services/api/src/app.ts`

Updated app wiring so the public router also receives the shared `RealtimeServer` instance.

### 5. `dashboard/src/hooks/useRealtimeDashboard.ts`

Replaced the old polling-only hook with a websocket-first implementation.

What it now does:

- connects to `VITE_WS_URL` using Socket.IO
- subscribes to the selected zone room
- listens for:
  - `zone_risk_updated`
  - `zone_forecast_updated`
  - `hotspot_updated`
  - `alert_dispatched`
  - `media_report_updated`
- batches rapid event bursts with a short scheduled refresh
- falls back to 10-second polling if no websocket URL is available

### 6. `dashboard/package.json`

Added the dashboard dependency:

- `socket.io-client`

### 7. `dashboard/package-lock.json`

Updated automatically to reflect the new dashboard dependency.

## How it works

1. A citizen uploads a media report or an operator reviews one.
2. The API stores the update.
3. The API emits `media_report_updated` through Socket.IO.
4. The dashboard client receives the event.
5. The dashboard refreshes:
   - zone risks
   - hotspots
   - alert logs
   - selected zone detail, including media stats and report list

If websockets are unavailable, the dashboard continues to work through the fallback polling path.

## How to run

From the project root:

```powershell
cd "D:\Games\Landslide_prediction-main\Landslide_prediction-main"
npm run build
```

To run the dashboard:

```powershell
cd "D:\Games\Landslide_prediction-main\Landslide_prediction-main\dashboard"
npm run dev
```

Make sure the dashboard `.env` includes:

```env
VITE_WS_URL=http://localhost:3000
```

## Verification

Verified successfully with:

- `npm run build` from the project root
- `npm run build` inside `dashboard`

Dashboard still shows the same existing Leaflet image asset warnings during build, but the build completes successfully.
