# Combined Testing

This file is for full end-to-end testing of Person 1, Person 2, Person 3, and Person 4 together.

## 1. Goal

Verify the full BHURAKSHAN stack works together:

- Person 4 ML provides predictions
- Person 3 worker uses ML and updates backend state
- Person 1 dashboard reads backend data and triggers alerts
- Person 2 citizen app reads backend data and creates subscriptions

## 2. Start Order

### Step 1. Start Person 4 ML

```powershell
cd "C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main\ml_and_data"
python scripts\run_api.py
```

Check:

```powershell
Invoke-RestMethod http://127.0.0.1:8001/ml/health
```

### Step 2. Start Person 3 API

```powershell
cd "C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main"
npm run start:api
```

Check:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

### Step 3. Start Person 3 worker

```powershell
cd "C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main"
npm run start:worker
```

Expected:

- worker sync should update backend state
- ML should receive live prediction requests

### Step 4. Start Person 1 dashboard

```powershell
cd "C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main\dashboard"
npm install
npm run build
npm run preview -- --host 127.0.0.1 --port 5173
```

Open:

- `http://127.0.0.1:5173`

### Step 5. Start Person 2 citizen app

```powershell
cd "C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main\citizen_app"
npm install
npm run dev -- --host 127.0.0.1 --port 5174
```

Open:

- `http://127.0.0.1:5174`

## 3. End-To-End Test Cases

### Test A. ML to backend sync

Verify:

- ML health works
- worker runs
- backend forecast/risk values refresh

Commands:

```powershell
Invoke-RestMethod http://localhost:3000/api/zones/risk
Invoke-RestMethod http://localhost:3000/api/zones/zone-joshimath-core/forecast
```

### Test B. Dashboard to backend

Verify in Person 1 dashboard:

- zone data loads
- hotspot data loads
- selected zone forecast loads
- manual alert works

Expected backend result:

- new alert appears in `GET /api/alerts/logs`

### Test C. Citizen app to backend

Verify in Person 2 app:

- zone risk loads
- shelter and route load
- citizen subscription works

Expected backend result:

- new subscription appears in `.runtime/state.json`

### Test D. Persistence

Open:

- `C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main\.runtime\state.json`

Verify:

- worker-updated predictions exist
- forecast data exists
- subscriptions exist
- alerts exist

## 4. Important API Checks

```powershell
Invoke-RestMethod http://localhost:3000/api/health
Invoke-RestMethod http://localhost:3000/api/zones/risk
Invoke-RestMethod http://localhost:3000/api/hotspots
Invoke-RestMethod http://localhost:3000/api/alerts/logs
Invoke-RestMethod http://127.0.0.1:8001/ml/health
```

## 5. Current Integrated Status

As of the latest live test:

- Person 1, 2, 3, and 4 are connected
- ML to worker to backend flow works
- subscription flow works
- manual alert flow works
- state persistence works

## 6. Remaining Non-Blocking Notes

- Twilio is still simulated until real credentials are added
- dashboard stable test mode is currently `preview`
- dashboard refresh is currently backend polling based

## 7. Final Pass Criteria

Combined testing is successful if:

- ML service is reachable
- API is reachable
- worker updates backend state
- dashboard reads backend and triggers alerts
- citizen app reads backend and stores subscriptions
- `.runtime/state.json` reflects the full flow
