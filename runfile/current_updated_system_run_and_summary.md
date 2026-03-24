# Current Updated System Run And Summary

This file explains how to run the current updated HH-LEWS/BHURAKSHAN codebase and what has been completed so far from the improvement plan.

## Project summary

The system now includes:

- multilingual citizen and alert experience
- live location guidance and nearby safe-zone support
- evacuation path publishing from the dashboard
- moving-toward-danger warning logic
- offline guidance foundation
- live navigation foundation
- danger-zone overlays
- crowdsourced media upload, review, privacy, verification, secure preview, and delete flow
- Supabase-backed media storage foundation
- road condition, elevation, route, and Google Maps dashboard foundation
- live weather feed foundation for operator and citizen views
- realtime dashboard updates for media review activity

## What has been completed so far

### Phase 1

- `phase1_multilanguage_support.md`
  - 4-language support for Hindi, Garhwali, Kumaoni, and English
  - subscriber language persistence
  - dashboard multilingual preview

- `phase1_location_guidance_foundation.md`
  - live location status API
  - nearby safe-zone lookup
  - shelter ranking by distance and bearing

- `phase1_evacuation_path_authoring_foundation.md`
  - dashboard evacuation-path authoring and publishing flow

- `phase1_moving_toward_danger_warning_foundation.md`
  - heading-aware movement warnings
  - safe-turn guidance

- `phase1_sms_length_validation_foundation.md`
  - multilingual SMS character validation
  - block over-limit manual SMS dispatch

- `phase1_danger_zone_overlays_foundation.md`
  - danger-zone polygons in API and UI
  - nearest active hazard guidance

### Phase 2

- `phase2_media_reports_foundation.md`
  - citizen media upload and dashboard review foundation

- `phase2_media_abuse_privacy_foundation.md`
  - per-device throttling
  - hashed reporter identity
  - moderation/privacy flags

- `phase2_offline_guidance_foundation.md`
  - service worker
  - offline shell
  - compass fallback

- `phase2_live_navigation_foundation.md`
  - blue-dot style navigation
  - route line and turn-style guidance

- `phase2_media_verification_risk_boost_foundation.md`
  - verification scoring
  - temporary risk boost with expiry

- `phase2_dashboard_realtime_media_updates_foundation.md`
  - realtime dashboard media refresh

- `phase2_dashboard_face_blur_review_foundation.md`
  - dashboard privacy review workflow

- `phase2_supabase_media_storage_foundation.md`
  - Supabase storage integration
  - secure media asset links

- `phase2_citizen_camera_confirmation_foundation.md`
  - camera/gallery flow
  - GPS and zone confirmation before upload

- `phase2_dashboard_secure_thumbnail_preview_foundation.md`
  - secure inline thumbnail preview

- `phase2_media_delete_privacy_foundation.md`
  - citizen delete-my-report flow

- `phase2_live_weather_feed_foundation.md`
  - improved OpenWeather ingestion
  - live weather shown in operator and citizen views

### Phase 3

- `phase3_road_conditions_foundation.md`
  - road conditions and elevation contracts and UI foundation

- `phase3_google_route_and_road_polling_foundation.md`
  - computed route API foundation
  - worker road-polling foundation

- `phase3_dashboard_google_maps_migration_foundation.md`
  - Google Maps dashboard mode with Leaflet fallback

## What is still left

The biggest remaining work is production-grade hardening:

- native-speaker validation and field testing for Garhwali and Kumaoni
- true DB-backed spatial tables for `danger_zones`, `evacuation_paths`, and `media_reports`
- real Google Directions and richer Google API integrations
- antivirus and async AI verification pipeline
- generated thumbnails and stronger moderation tooling
- broader seeded evacuation paths and road coverage from real field data
- more end-to-end operational testing

## Required services

The current system depends on these services:

- PostgreSQL on `localhost:5432`
- ML API on `127.0.0.1:8001`
- Node API on `localhost:3000`
- Worker connected to the API
- Dashboard on `127.0.0.1:5173`
- Citizen app on `127.0.0.1:5174`

## Important environment checklist

### Root `.env`

Make sure these values exist in [`.env`](D:\Games\Landslide_prediction-main\Landslide_prediction-main\.env):

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

Make sure these values exist in [`dashboard/.env`](D:\Games\Landslide_prediction-main\Landslide_prediction-main\dashboard\.env):

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
VITE_GOOGLE_MAPS_KEY=your_browser_restricted_google_maps_key
```

### Citizen app `.env`

Make sure this exists in [`citizen_app/.env`](D:\Games\Landslide_prediction-main\Landslide_prediction-main\citizen_app\.env):

```env
VITE_API_BASE_URL=http://localhost:3000
```

## Correct run order

Run the system in this order.

### 1. Start PostgreSQL

PostgreSQL must be running first.

If PostgreSQL is not running:

- API startup will fail with `ECONNREFUSED 127.0.0.1:5432`
- worker will then fail because API is unavailable

### 2. Start ML service

Open a terminal:

```powershell
cd "D:\Games\Landslide_prediction-main\Landslide_prediction-main\ml_and_data"
python scripts\run_api.py
```

Expected:

- ML API available on `http://127.0.0.1:8001`

Optional check:

```powershell
Invoke-RestMethod http://127.0.0.1:8001/ml/health
```

### 3. Start backend API

Open a new terminal:

```powershell
cd "D:\Games\Landslide_prediction-main\Landslide_prediction-main"
npm run start:api
```

Expected:

- API listens on `http://localhost:3000`
- demo credentials are printed
- process stays running

Optional check:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

### 4. Start worker

Open a new terminal:

```powershell
cd "D:\Games\Landslide_prediction-main\Landslide_prediction-main"
npm run start:worker
```

Expected:

- worker polls risk/weather cycles
- worker refreshes weather feed data
- worker updates backend runtime state

### 5. Start dashboard

Open a new terminal:

```powershell
cd "D:\Games\Landslide_prediction-main\Landslide_prediction-main\dashboard"
npm run preview -- --host 127.0.0.1 --port 5173
```

Open:

- `http://127.0.0.1:5173`

### 6. Start citizen app

Open a new terminal:

```powershell
cd "D:\Games\Landslide_prediction-main\Landslide_prediction-main\citizen_app"
npm run dev -- --host 127.0.0.1 --port 5174
```

Open:

- `http://127.0.0.1:5174`

## Current demo login

Use this for protected dashboard/API flows:

- `admin@bhurakshan.local / Admin@123`

Other demo users:

- `chamoli.ops@bhurakshan.local / Chamoli@123`
- `analyst@bhurakshan.local / Analyst@123`

## What to verify after startup

### Dashboard

Verify in the dashboard:

- zone list and hotspot panels load
- selected zone drawer opens
- live rainfall feed is shown
- danger-zone overlays appear
- road condition and elevation cards load
- ground reports panel opens
- secure media preview works for stored reports

### Citizen app

Verify in the citizen app:

- risk card loads
- live rainfall feed is shown
- language switching works
- navigation and shelter guidance load
- upload card opens
- delete media flow works for recent reports

### Backend and worker

Verify:

- `/api/zones/risk` responds
- `/api/weather/live?zone_id=<zone-id>` responds
- worker does not continuously log weather/API connection failures

## Build verification

The latest verified builds passed:

- `npm run build` at repo root
- `npm run build` in `dashboard`
- `npm run build` in `citizen_app`

Dashboard still shows the existing Leaflet image asset warnings during build, but the build succeeds.

## Related files

- [overall_system_run.md](D:\Games\Landslide_prediction-main\Landslide_prediction-main\runfile\overall_system_run.md)
- [phase2_live_weather_feed_foundation.md](D:\Games\Landslide_prediction-main\Landslide_prediction-main\runfile\phase2_live_weather_feed_foundation.md)
- [phase2_supabase_media_storage_foundation.md](D:\Games\Landslide_prediction-main\Landslide_prediction-main\runfile\phase2_supabase_media_storage_foundation.md)
- [phase3_dashboard_google_maps_migration_foundation.md](D:\Games\Landslide_prediction-main\Landslide_prediction-main\runfile\phase3_dashboard_google_maps_migration_foundation.md)
