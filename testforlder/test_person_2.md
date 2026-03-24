# Test Person 2

This file is for testing Person 2 work: the citizen app.

## 1. Purpose

Person 2 should verify that the citizen app can:

- fetch zone risk and forecast data from Person 3 backend
- fetch shelter and evacuation route data
- subscribe a citizen phone number for alerts
- show backend-driven values correctly

## 2. Prerequisites

Make sure these are running:

- Person 3 API on `http://localhost:3000`
- Person 3 worker
- Person 4 ML API on `http://localhost:8000`

## 3. Citizen App Environment

Open terminal in:

```powershell
cd "C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main\citizen_app"
```

Check `.env`:

```env
VITE_API_BASE_URL=http://localhost:3000
```

## 4. Run Citizen App

```powershell
npm install
npm run dev -- --host 127.0.0.1 --port 5174
```

Open:

- `http://127.0.0.1:5174`

## 5. What To Test

### A. Risk data load

Verify the app shows:

- current zone risk
- forecast values
- district/zone information

Reference APIs:

- `GET http://localhost:3000/api/zones/risk`
- `GET http://localhost:3000/api/zones/zone-joshimath-core/forecast`

### B. Shelter and route guidance

Verify the app shows:

- safe shelter details
- evacuation route details

Reference APIs:

- `GET http://localhost:3000/api/safe-shelters?zone_id=zone-joshimath-core`
- `GET http://localhost:3000/api/evacuation-routes?zone_id=zone-joshimath-core`

### C. Citizen subscription

Test subscription with a valid number.

Reference command:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/subscribe -ContentType "application/json" -Body '{"phoneNumber":"+919999888877","zoneId":"zone-joshimath-core","channels":["SMS","WHATSAPP"]}'
```

Expected:

- backend returns `ok: true`
- subscription gets stored in `.runtime/state.json`

### D. Weather display

Reference API:

- `GET http://localhost:3000/api/weather/live?zone_id=zone-joshimath-core`

Expected:

- live weather/rainfall values load without error

## 6. Pass Criteria

Person 2 testing is successful if:

- citizen app opens successfully
- risk/forecast data loads from backend
- shelters and routes are visible
- subscribe flow works
- subscription persists in runtime state
