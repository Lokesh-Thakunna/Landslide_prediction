# Test Person 4

This file is for testing Person 4 work: the ML and data service.

## 1. Purpose

Person 4 should verify that:

- ML API starts successfully
- health endpoint works
- prediction endpoint works
- Person 3 worker can call the ML service

## 2. Run Commands

Open terminal in:

```powershell
cd "C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main\ml_and_data"
```

Install dependencies if needed:

```powershell
python -m pip install -r requirements.txt
```

Run ML API:

```powershell
python scripts\run_api.py
```

Expected local URL:

- `http://127.0.0.1:8001`

## 3. Health Test

```powershell
Invoke-RestMethod http://127.0.0.1:8001/ml/health
```

Expected:

- status should be `ok`
- model metadata should return

## 4. Prediction Test

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8001/ml/predict -ContentType "application/json" -Body '{"zone_id":"zone-joshimath-core","horizon_hours":0,"rainfall_mm_hr":12.5,"slope_degrees":28,"soil_moisture_proxy_pct":31,"historical_landslide_frequency":0.62}'
```

Expected:

- response includes risk score
- response includes risk level
- response includes top features

## 5. Integration With Person 3

Make sure project root `.env` has:

```env
ML_SERVICE_URL=http://localhost:8001
```

Then run Person 3 worker and verify:

- worker sends `POST /ml/predict`
- backend risk values update using ML response

## 6. Pass Criteria

Person 4 testing is successful if:

- ML health works
- ML predict works
- Person 3 worker successfully reaches ML service
- backend refresh reflects ML-based results
