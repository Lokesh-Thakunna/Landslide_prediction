# Overall System Run Guide

This file explains how to run the full current HH-LEWS/BHURAKSHAN system after the latest improvements.

## 1. Current system components

The system now includes:

- PostgreSQL database
- ML service
- Node.js API
- background worker
- operator dashboard
- citizen app

## 2. Ports

The current system uses these ports:

- PostgreSQL: `5432`
- ML service: `8001`
- Backend API: `3000`
- Dashboard: `5173`
- Citizen app: `5174`

## 3. Important environment checklist

### Root `.env`

Make sure [`.env`](D:\Games\Landslide_prediction-main\Landslide_prediction-main\.env) contains the required backend values:

```env
PORT=3000
WORKER_API_BASE_URL=http://localhost:3000
INTERNAL_SERVICE_API_KEY=bhurakshan-local-internal-key

ML_SERVICE_URL=http://localhost:8001
ML_INTERNAL_API_KEY=bhurakshan-ml-local-key

JWT_SECRET=bhurakshan-dev-secret

WEATHER_PROVIDER=OpenWeather
WEATHER_API_KEY=your_openweather_key
WEATHER_FALLBACK_PROVIDER=open-meteo
WEATHER_POLL_INTERVAL_MINUTES=5

GOOGLE_CLOUD_PROJECT_ID=hhlews
GOOGLE_APPLICATION_CREDENTIALS=D:\Games\Landslide_prediction-main\Landslide_prediction-main\hhlews-adc850d8c758.json

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
MEDIA_BUCKET=hhlews-media-reports
THUMBNAIL_BUCKET=hhlews-thumbnails

MAX_PHOTO_SIZE_MB=10
MAX_VIDEO_SIZE_MB=50

GOOGLE_MAPS_API_KEY=your_server_side_google_maps_key
```

### Dashboard `.env`

Make sure [`dashboard/.env`](D:\Games\Landslide_prediction-main\Landslide_prediction-main\dashboard\.env) contains:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
VITE_GOOGLE_MAPS_KEY=your_browser_restricted_google_maps_key
```

### Citizen app `.env`

Make sure [`citizen_app/.env`](D:\Games\Landslide_prediction-main\Landslide_prediction-main\citizen_app\.env) contains:

```env
VITE_API_BASE_URL=http://localhost:3000
```

## 4. Required startup order

Always run in this order.

### Step 1. Start PostgreSQL

PostgreSQL must be running first.

If PostgreSQL is not running:

- API startup will fail with `ECONNREFUSED` on `localhost:5432`
- worker startup will then fail because API is unavailable

### Step 2. Start ML service

Open a terminal:

```powershell
cd "D:\Games\Landslide_prediction-main\Landslide_prediction-main\ml_and_data"
python scripts\run_api.py
```

Optional health check:

```powershell
Invoke-RestMethod http://127.0.0.1:8001/ml/health
```

### Step 3. Start backend API

Open a new terminal:

```powershell
cd "D:\Games\Landslide_prediction-main\Landslide_prediction-main"
npm run start:api
```

Optional health check:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

Expected:

- API listens on `http://localhost:3000`
- demo credentials are printed
- process stays running

### Step 4. Start worker

Open a new terminal:

```powershell
cd "D:\Games\Landslide_prediction-main\Landslide_prediction-main"
npm run start:worker
```

Expected:

- worker runs risk/weather cycles
- worker refreshes weather feed data
- worker updates backend state used by dashboard and citizen app

### Step 5. Start dashboard

Open a new terminal:

```powershell
cd "D:\Games\Landslide_prediction-main\Landslide_prediction-main\dashboard"
npm run preview -- --host 127.0.0.1 --port 5173
```

Open:

- `http://127.0.0.1:5173`

### Step 6. Start citizen app

Open a new terminal:

```powershell
cd "D:\Games\Landslide_prediction-main\Landslide_prediction-main\citizen_app"
npm run dev -- --host 127.0.0.1 --port 5174
```

Open:

- `http://127.0.0.1:5174`

## 5. Quick checks after startup

### Backend checks

```powershell
Invoke-RestMethod http://localhost:3000/api/health
Invoke-RestMethod http://localhost:3000/api/zones/risk
Invoke-RestMethod http://localhost:3000/api/hotspots
Invoke-RestMethod "http://localhost:3000/api/weather/live?zone_id=joshimath-core"
```

### Dashboard checks

Verify in the dashboard:

- zones and hotspots load
- zone drawer opens
- live rainfall feed is visible
- danger-zone overlays appear
- road condition and elevation cards load
- ground reports panel loads

### Citizen app checks

Verify in the citizen app:

- hero risk card loads
- rainfall feed is visible
- language switching works
- safe-zone and route guidance load
- media upload flow opens

## 6. Demo login

Use this demo admin login for protected testing:

- `admin@bhurakshan.local`
- `Admin@123`

Other demo users:

- `chamoli.ops@bhurakshan.local / Chamoli@123`
- `analyst@bhurakshan.local / Analyst@123`

## 7. Current completed feature summary

The system now includes these completed slices:

- multilingual support foundation
- location guidance foundation
- media reports foundation
- road conditions and elevation foundation
- evacuation path authoring foundation
- moving-toward-danger warning foundation
- offline guidance foundation
- live navigation foundation
- Google route and road-polling foundation
- dashboard Google Maps migration foundation
- SMS length validation foundation
- media verification and risk-boost foundation
- danger-zone overlays foundation
- dashboard realtime media updates foundation
- dashboard face-blur review foundation
- Supabase media storage foundation
- citizen camera confirmation foundation
- dashboard secure thumbnail preview foundation
- media delete privacy foundation
- live weather feed foundation

## 8. Build status

Latest verified builds passed:

- `npm run build` at repo root
- `npm run build` in `dashboard`
- `npm run build` in `citizen_app`

Dashboard still shows the existing Leaflet image asset warnings during build, but the build succeeds.

## 9. If something fails

Check these first:

- PostgreSQL is running on `5432`
- ML service is running on `8001`
- API is running on `3000`
- worker is started after API
- `VITE_API_BASE_URL` points to `http://localhost:3000`
- weather env values are present
- Supabase backend env values are present

## 10. Related files

- [current_updated_system_run_and_summary.md](D:\Games\Landslide_prediction-main\Landslide_prediction-main\runfile\current_updated_system_run_and_summary.md)
- [backend_run.md](D:\Games\Landslide_prediction-main\Landslide_prediction-main\runfile\backend_run.md)
- [dashboard_run.md](D:\Games\Landslide_prediction-main\Landslide_prediction-main\runfile\dashboard_run.md)
- [citizen_run.md](D:\Games\Landslide_prediction-main\Landslide_prediction-main\runfile\citizen_run.md)
- [ml_and_data_run.md](D:\Games\Landslide_prediction-main\Landslide_prediction-main\runfile\ml_and_data_run.md)
