# Test Person 3

This file is for testing Person 3 work: the backend and worker.

## 1. Purpose

Person 3 should verify that:

- API server is running
- worker sync is running
- internal persistence is working
- auth, public, protected, and internal APIs behave correctly
- Person 1, Person 2, and Person 4 can connect successfully

## 2. Run Commands

Open terminal in project root:

```powershell
cd "C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main"
```

Run API:

```powershell
npm run start:api
```

Run worker in another terminal:

```powershell
npm run start:worker
```

## 3. Health Test

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

Expected:

- API returns status JSON

## 4. Public API Tests

```powershell
Invoke-RestMethod http://localhost:3000/api/districts
Invoke-RestMethod http://localhost:3000/api/zones/risk
Invoke-RestMethod http://localhost:3000/api/hotspots
Invoke-RestMethod http://localhost:3000/api/zones/zone-joshimath-core/forecast
Invoke-RestMethod "http://localhost:3000/api/safe-shelters?zone_id=zone-joshimath-core"
Invoke-RestMethod "http://localhost:3000/api/evacuation-routes?zone_id=zone-joshimath-core"
Invoke-RestMethod "http://localhost:3000/api/weather/live?zone_id=zone-joshimath-core"
Invoke-RestMethod http://localhost:3000/api/alerts/logs
```

## 5. Auth Test

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/auth/login -ContentType "application/json" -Body '{"email":"admin@bhurakshan.local","password":"Admin@123"}'
```

Expected:

- login returns access token and refresh token

## 6. Protected Alert Test

```powershell
$login = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/auth/login -ContentType "application/json" -Body '{"email":"admin@bhurakshan.local","password":"Admin@123"}'
$token = $login.access_token
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/alerts/trigger -Headers $headers -ContentType "application/json" -Body '{"zoneId":"zone-joshimath-core","reason":"Manual backend verification alert","channels":["SMS","WHATSAPP"]}'
```

Expected:

- alert should be created
- alert should appear in alert logs

## 7. Subscription Test

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/subscribe -ContentType "application/json" -Body '{"phoneNumber":"+919876543210","zoneId":"zone-joshimath-core","channels":["SMS"]}'
```

Expected:

- subscription created successfully

## 8. Persistence Test

Check:

- `C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main\.runtime\state.json`

Expected:

- alerts are stored
- subscribers are stored
- worker-updated predictions and forecasts are stored

## 9. ML Integration Test

Check that ML receives prediction requests when worker runs.

Expected:

- Person 4 ML service receives `POST /ml/predict`
- backend zone values refresh after worker cycle

## 10. Pass Criteria

Person 3 testing is successful if:

- API works
- worker sync works
- auth works
- alerts and subscriptions work
- state persists
- ML integration works
