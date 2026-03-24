# Test Person 1

This file is for testing Person 1 work: the district operator dashboard.

## 1. Purpose

Person 1 should verify that the dashboard can:

- load district and zone risk data from Person 3 backend
- load forecast, shelter, route, and alert data
- trigger manual alerts through the backend
- reflect backend updates during refresh polling

## 2. Prerequisites

Make sure these are already running:

- Person 3 API on `http://localhost:3000`
- Person 3 worker
- Person 4 ML API on `http://localhost:8000`

## 3. Dashboard Environment

Open terminal in:

```powershell
cd "C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main\dashboard"
```

Check `.env`:

```env
VITE_API_BASE_URL=http://localhost:3000
```

## 4. Run Dashboard

Stable test mode:

```powershell
npm install
npm run build
npm run preview -- --host 127.0.0.1 --port 5173
```

Open:

- `http://127.0.0.1:5173`

## 5. What To Test

### A. Initial dashboard load

Verify these sections load:

- district list
- zone risk cards/map
- hotspot data
- alert log data

Expected:

- no blank page
- no fetch error in UI
- zone values should come from backend, not only mock data

### B. Zone details

Select a zone and verify:

- forecast is shown
- shelters are shown
- evacuation route is shown

Use backend reference endpoints if needed:

- `GET http://localhost:3000/api/zones/zone-joshimath-core/forecast`
- `GET http://localhost:3000/api/safe-shelters?zone_id=zone-joshimath-core`
- `GET http://localhost:3000/api/evacuation-routes?zone_id=zone-joshimath-core`

### C. Manual alert trigger

From dashboard:

- choose a zone
- enter a reason
- submit manual alert

Expected:

- success message appears
- new alert appears in alert log after refresh
- backend alert is stored in `.runtime/state.json`

API reference:

- `POST http://localhost:3000/api/alerts/trigger`

### D. Refresh updates

Wait around 10 seconds.

Expected:

- dashboard refreshes zone risk/hotspots/alerts from backend
- updated values should match backend API responses

## 6. Quick API Checks

```powershell
Invoke-RestMethod http://localhost:3000/api/zones/risk
Invoke-RestMethod http://localhost:3000/api/hotspots
Invoke-RestMethod http://localhost:3000/api/alerts/logs
```

## 7. Pass Criteria

Person 1 testing is successful if:

- dashboard opens successfully
- zone data loads from backend
- forecast/shelter/route load correctly
- manual alert works
- alert log updates correctly

## 8. Current Notes

- dashboard is currently tested reliably in preview mode
- live push socket flow is replaced by backend polling for stability
