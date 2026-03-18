# HH-LEWS — Team Task Board

> All 49 tasks split across 4 members and 6 build phases.  
> Check off tasks as you complete them. PR checkpoints are marked on each task.  
> **Branch off `dev`. Merge back to `dev` at each PR checkpoint.**

---

## Quick Reference

| Member | Branch | Role | Tasks | Est. Hours |
|--------|--------|------|-------|------------|
| Person 1 | `feat/dashboard` | Frontend Lead | 13 tasks | ~20 hrs |
| Person 2 | `feat/citizen-pwa` | PWA Dev | 11 tasks | ~16 hrs |
| Person 3 | `feat/backend-api` | Backend Lead | 17 tasks | ~22 hrs |
| Person 4 | `feat/ml-service` | ML Lead | 8 tasks | ~18 hrs |

### PR Merge Checkpoints

| Checkpoint | Hour | Who merges |
|-----------|------|-----------|
| PR-01 | Hour 10 | P3 + P4 |
| PR-02 | Hour 18 | P3 + P4 + P1 + P2 |
| PR-03 | Hour 26 | All four |
| PR-04 | Hour 34 | All four → `main` |

---

## ⚠️ Blockers — Do These First (Hour 0–1)

These two tasks block P3's entire work. Person 3 must complete these before anything else.

- [ ] **[P3]** Get OpenWeatherMap API key (free tier) — openweathermap.org → sign up → copy key to `.env`
- [ ] **[P3]** Get Twilio account + WhatsApp Sandbox — console.twilio.com → ACCOUNT_SID + AUTH_TOKEN + WhatsApp Sandbox activation

---

---

# 👤 Person 1 — Frontend Lead
**Branch:** `feat/dashboard` | **Merges to:** `dev` | **~20 hrs**

---

## Phase 0 — Setup (Hour 0–3) | PR-02

- [ ] **[P1-01]** Scaffold Vite + React for Dashboard app `1h`
  - `npx create-vite apps/dashboard --template react`
  - Install: `react-router-dom leaflet react-leaflet socket.io-client axios recharts tailwindcss`
  - Configure `tailwind.config.js` with project color theme
  - Branch: `feat/dashboard` → PR-02

- [ ] **[P1-02]** Configure shared component base `1h`
  - Create `/packages/ui` with: `Button`, `Badge`, `Card`, `LoadingSpinner`
  - Set up shared TypeScript types for `Zone`, `RiskLevel`, `AlertEvent`
  - Branch: `feat/dashboard` → PR-02

---

## Phase 1 — Leaflet Map (Hour 3–10) | PR-02

- [ ] **[P1-03]** Load zone polygons from `GET /zones/risk` `3h`
  - `useEffect` → `axios.get('/api/zones/risk')` on mount
  - Render Leaflet GeoJSON layer with risk-level colors:
    - LOW = `#22c55e`, MODERATE = `#eab308`, HIGH = `#f97316`, CRITICAL = `#ef4444`
  - Polygon fill opacity: `0.5`. Stroke: `1.5px` darker shade
  - Branch: `feat/dashboard` → PR-02

- [ ] **[P1-04]** Zone click → detail sidebar panel `2h`
  - `onClick` on polygon opens right sidebar
  - Show: zone name, `risk_score` (0–100 display), `risk_level` badge, `top_features` bar chart (Recharts), `predicted_at` relative time, nearest safe zone name + distance
  - Branch: `feat/dashboard` → PR-02

- [ ] **[P1-05]** Live rainfall overlay on map `2h`
  - `GET /weather/live?zone_id=<id>` per zone centroid
  - Add Leaflet circle markers; radius proportional to `rainfall_mm_hr`
  - Tooltip: humidity, pressure, temperature, is_stale warning
  - Branch: `feat/dashboard` → PR-02

- [ ] **[P1-06]** District filter dropdown `1h`
  - Fetch `GET /districts` → populate dropdown
  - On select: filter zones layer to selected district, zoom map to district bounding box
  - Branch: `feat/dashboard` → PR-02

---

## Phase 2 — Auth + Controls (Hour 10–18) | PR-02 / PR-03

- [ ] **[P1-07]** Login page + JWT auth flow `2h`
  - `POST /auth/login` → store `access_token` in React state (NOT localStorage)
  - Silent refresh on `401`: `POST /auth/refresh` using httpOnly cookie
  - Protected routes with React Router v6 `<PrivateRoute>`
  - Logout button → `POST /auth/logout`
  - Branch: `feat/dashboard` → PR-02

- [ ] **[P1-08]** Manual alert trigger form `2h`
  - Zone selector dropdown → risk level radio (HIGH / CRITICAL)
  - Channel checkboxes: SMS / WhatsApp / IVR
  - Optional Hindi message override textarea
  - Submit → `POST /alerts/trigger` → show response: `recipient_count`, `celery_task_id`
  - Branch: `feat/dashboard` → PR-03

- [ ] **[P1-09]** Alert suppression toggle per zone `1h`
  - Toggle switch in zone sidebar → `POST /alerts/suppress`
  - Duration slider: 15 min to 1440 min
  - Show `suppressed_until` timestamp when active
  - Branch: `feat/dashboard` → PR-03

- [ ] **[P1-10]** Sensor status grid panel `2h`
  - Grid of sensor cards per zone
  - Status colors: online=green, offline=red, degraded=amber
  - `battery_pct` progress bar
  - `last_seen` time-ago string
  - Auto-refresh every 30s via `setInterval`
  - Branch: `feat/dashboard` → PR-03

---

## Phase 3 — WebSocket Live Updates (Hour 18–26) | PR-03 / PR-04

- [ ] **[P1-11]** Socket.io client + JWT auth on connect `1.5h`
  - `io(BASE_URL, { path: '/realtime-risk', auth: { token: accessToken } })`
  - `connect_error` → trigger token refresh → reconnect
  - `subscribe_district` on successful connection for current user's district
  - Branch: `feat/dashboard` → PR-03

- [ ] **[P1-12]** Live polygon color on `zone_risk_updated` event `1.5h`
  - `socket.on('zone_risk_updated')` → update GeoJSON layer style in-place (no full re-render)
  - CSS pulse animation on polygon when level changes to CRITICAL
  - Update sidebar panel if that zone is currently open
  - Branch: `feat/dashboard` → PR-03

- [ ] **[P1-13]** Toast notifications on `alert_dispatched` + `sensor_offline` `1h`
  - `alert_dispatched` → green toast: "Alert sent to {count} subscribers via {channel}"
  - `sensor_offline` → red toast: "Sensor {sensor_id} offline in {zone_name}"
  - Use `react-hot-toast` or custom toast component
  - Branch: `feat/dashboard` → PR-04

---

---

# 👤 Person 2 — PWA Dev
**Branch:** `feat/citizen-pwa` | **Merges to:** `dev` | **~16 hrs**

---

## Phase 0 — Setup (Hour 0–3) | PR-02

- [ ] **[P2-01]** Scaffold Vite + React for Citizen PWA `1h`
  - `npx create-vite apps/citizen-pwa --template react`
  - Install: `vite-plugin-pwa react-leaflet react-i18next axios tailwindcss`
  - PWA manifest: `name=HH-LEWS`, `short_name=HH-LEWS`, `theme_color=#ef4444`, `background_color=#ffffff`
  - Add to home screen icons (192px + 512px)
  - Branch: `feat/citizen-pwa` → PR-02

- [ ] **[P2-02]** i18n setup — Hindi as default language `1h`
  - `react-i18next` config with `lng: 'hi'`, fallback `'en'`
  - Create `/locales/hi.json` and `/locales/en.json`
  - All UI strings use `t('key')` — no hardcoded text in JSX
  - Language toggle button (हिंदी / English) in top-right
  - Branch: `feat/citizen-pwa` → PR-02

---

## Phase 1 — Core Screens (Hour 3–14) | PR-02

- [ ] **[P2-03]** Main risk screen `3h`
  - Full-screen background color matching risk level (green/yellow/orange/red)
  - Large Hindi risk level label: `कम / मध्यम / अधिक / अत्यधिक`
  - Current zone name + district
  - Live rainfall badge (mm/hr)
  - District helpline number always visible at bottom
  - Animated pulse border on CRITICAL level
  - Data from `GET /zones/risk` filtered by selected zone
  - Branch: `feat/citizen-pwa` → PR-02

- [ ] **[P2-04]** Safe zones screen `2.5h`
  - `react-leaflet` mini-map (300px height)
  - User zone centroid marker + nearest safe zone marker
  - Distance in km below map
  - Hindi landmark directions text block
  - Capacity: "X लोग रह सकते हैं"
  - Call helpline floating button
  - Data from `GET /safe-zones?zone_id=<id>`
  - Branch: `feat/citizen-pwa` → PR-02

- [ ] **[P2-05]** Subscribe screen — 2-step OTP flow `2h`
  - Phone number input (E.164 validation: +91XXXXXXXXXX)
  - Zone dropdown populated from `GET /districts` + `GET /zones/risk`
  - Step 1: `POST /subscribe` `{action: "request_otp"}` → show OTP input
  - Step 2: `POST /subscribe` `{action: "verify_otp"}` → Hindi success screen
  - Error states: invalid OTP, already subscribed, rate limited
  - Branch: `feat/citizen-pwa` → PR-02

- [ ] **[P2-06]** Emergency contacts screen `1h`
  - SDRF: `1070` (tap-to-call)
  - District DDMO helpline (from `GET /districts`)
  - Local hospital number
  - All as `<a href="tel:...">` large tap targets
  - Always accessible from bottom navigation bar
  - Branch: `feat/citizen-pwa` → PR-02

---

## Phase 2 — Offline + PWA (Hour 14–22) | PR-03

- [ ] **[P2-07]** Service Worker with Workbox offline cache `3h`
  - `vite-plugin-pwa` with `generateSW` strategy
  - Cache routes (NetworkFirst, 24h TTL):
    - `GET /api/zones/risk`
    - `GET /api/safe-zones`
    - `GET /api/weather/live`
    - `GET /api/districts`
  - Cache static assets (CacheFirst, 7d TTL)
  - Show offline banner: "ऑफलाइन मोड — अंतिम अपडेट: {timestamp}"
  - Branch: `feat/citizen-pwa` → PR-03

- [ ] **[P2-08]** PWA install prompt `1h`
  - Capture `beforeinstallprompt` event
  - Show install banner after 10s: "अभी इंस्टॉल करें — बिना इंटरनेट काम करता है"
  - Dismiss button stores preference in localStorage
  - Branch: `feat/citizen-pwa` → PR-03

---

## Phase 3 — Polish (Hour 22–34) | PR-04

- [ ] **[P2-09]** Complete Hindi translations for all strings `2h`
  - `hi.json`: risk levels, CTA buttons, error messages, empty states, time labels, form placeholders
  - Review all screens: no English leaking through
  - English toggle must work on every screen without layout break
  - Branch: `feat/citizen-pwa` → PR-04

- [ ] **[P2-10]** Mobile responsive polish + accessibility `2h`
  - Test on 320px, 375px, 414px viewport widths
  - Font minimum 16px everywhere
  - Color contrast ratio ≥ 4.5:1 on all text/background combos
  - Run Lighthouse PWA audit — target score ≥ 90
  - Branch: `feat/citizen-pwa` → PR-04

- [ ] **[P2-11]** Demo spike — CRITICAL alert simulation `1h`
  - Hidden trigger: triple-tap on HH-LEWS logo in header
  - Forces CRITICAL state locally (overrides API response)
  - Shows full red screen + pulse animation + Hindi "अभी निकलें!" CTA
  - Resets after 30 seconds automatically
  - Used only during pitch demo on stage
  - Branch: `feat/citizen-pwa` → PR-04

---

---

# 👤 Person 3 — Backend Lead
**Branch:** `feat/backend-api` | **Merges to:** `dev` | **~22 hrs**

---

## Phase 0 — Keys + Infra (Hour 0–3) | PR-01

- [ ] **[P3-01]** ⚠️ Get OpenWeatherMap API key `0.5h` **← DO THIS FIRST**
  - openweathermap.org → sign up → free tier (1,000 calls/day)
  - Test: `curl "api.openweathermap.org/data/2.5/weather?lat=30.41&lon=79.32&appid=YOUR_KEY"`
  - Add to `.env` as `OPENWEATHERMAP_API_KEY`
  - Branch: `feat/backend-api` → PR-01

- [ ] **[P3-02]** ⚠️ Get Twilio account + WhatsApp Sandbox `0.5h` **← DO THIS FIRST**
  - console.twilio.com → create account → get `ACCOUNT_SID` + `AUTH_TOKEN`
  - Enable WhatsApp Sandbox: console.twilio.com/console/sms/whatsapp/sandbox
  - Add both to `.env`
  - Branch: `feat/backend-api` → PR-01

- [ ] **[P3-03]** Write `docker-compose.yml` `1.5h`
  - Services: `hhlews-api` (Node 20-slim, port 3000), `hhlews-ml` (Python 3.11-slim, port 8000 internal only), `hhlews-worker` (Python 3.11-slim, no port), `postgres:15-postgis`, `redis:7-alpine`, `eclipse-mosquitto`
  - All services on `hhlews-network` bridge network
  - Named volumes: `postgres_data`, `redis_data`, `models_data`
  - Health checks on postgres and redis
  - Branch: `feat/backend-api` → PR-01

- [ ] **[P3-04]** Init PostgreSQL + PostGIS + Prisma + seed data `2h`
  - `CREATE EXTENSION postgis; CREATE EXTENSION "uuid-ossp";`
  - `npx prisma migrate deploy`
  - Run `scripts/spatial_indexes.sql` (GIST indexes on geometry columns)
  - Run `scripts/seed_zones.sql` — insert 5 districts + 3 zones per district + 1 safe zone per zone
  - Verify: `SELECT PostGIS_Version(); SELECT COUNT(*) FROM zones;`
  - Branch: `feat/backend-api` → PR-01

---

## Phase 1 — Node.js API (Hour 3–12) | PR-01 / PR-02

- [ ] **[P3-05]** Express app scaffold + all middleware `1.5h`
  - `helmet()`, `cors()` (allow: `hhlews.in`, `localhost:5173`, `localhost:5174`)
  - `morgan` with phone redaction: `.replace(/(\+91|0)?[6-9]\d{9}/g, '[PHONE_REDACTED]')`
  - `express-rate-limit` with `rate-limit-redis` store
  - `express-async-errors` for global error handling
  - Branch: `feat/backend-api` → PR-01

- [ ] **[P3-06]** `POST /auth/login` + `/refresh` + `/logout` `2.5h`
  - Login: `bcrypt.compare` → `jwt.sign` RS256 15m → `httpOnly` refresh cookie 7d stored as `redis.setex refresh:{sha256(token)} 604800`
  - Refresh: `redis.get refresh:{hash}` → delete old → issue new access + refresh
  - Logout: `redis.del refresh:{hash}` + `clearCookie`
  - Branch: `feat/backend-api` → PR-01

- [ ] **[P3-07]** Auth middleware: `requireAuth` + `requireRole` + `requireDistrictAccess` `1.5h`
  - `jwt.verify` with RS256, check `issuer: 'hhlews-api'`, `audience: 'hhlews-dashboard'`
  - `requireRole(...roles)` — 403 if role not in allowed list
  - `requireDistrictAccess` — ADMIN bypasses; DISTRICT_OFFICIAL checks `zone.district_id === user.district_id`
  - Branch: `feat/backend-api` → PR-01

- [ ] **[P3-08]** All public GET endpoints `2h`
  - `GET /districts` — Redis cache first (TTL 3600), fallback DB
  - `GET /zones/risk` — Redis `risk:{zone_id}` per zone, fallback DB
  - `GET /risk/:district` — filter by name or UUID, include summary counts
  - `GET /safe-zones` — supports `?zone_id` and `?district` query params
  - `GET /weather/live` — requires `?zone_id`, reads Redis `weather:{lat}:{lon}`
  - `GET /health` — ping DB + Redis + ML `/health` + return JSON statuses
  - Branch: `feat/backend-api` → PR-01

- [ ] **[P3-09]** `POST /subscribe` — 2-step OTP flow `2h`
  - Step 1 (`action: request_otp`): generate 6-digit OTP, `redis.setex otp:{sha256(phone)} 600 OTP`, send SMS via Twilio
  - Step 2 (`action: verify_otp`): verify OTP, delete Redis key, `Fernet.encrypt(phone)` → `BYTEA`, `sha256(phone)` → unique check, write `subscribers` table
  - Rate limit: 5 req/min/IP via Nginx
  - Branch: `feat/backend-api` → PR-02

- [ ] **[P3-10]** `POST /alerts/trigger` + `/suppress` + `/webhooks/twilio/status` `2h`
  - Trigger: auth + rate-limit (10/min/user on Redis) → compose Hindi template → `celery.send_task('alerts.dispatch_sms_batch')` → write `alert_event` + `audit_log` → emit WebSocket `alert_dispatched`
  - Suppress: `redis.setex alert_suppress:{zone_id} {ttl} reason` → write `audit_log`
  - Twilio webhook: validate `X-Twilio-Signature` HMAC-SHA1 → update `alert_events.delivered_count`
  - Branch: `feat/backend-api` → PR-02

- [ ] **[P3-11]** WebSocket `/realtime-risk` via Socket.io `2h`
  - Auth middleware: `jwt.verify` on `socket.handshake.auth.token`
  - `subscribe_zone` → `socket.join('zone_{id}')`
  - `subscribe_district` → `socket.join` all zones in district
  - Expose Redis pub/sub listener so Celery workers can trigger WS emits
  - Emit: `zone_risk_updated`, `alert_dispatched`, `sensor_offline`, `system_health` (60s heartbeat)
  - Branch: `feat/backend-api` → PR-02

---

## Phase 2 — Celery Workers (Hour 12–22) | PR-02 / PR-03

- [ ] **[P3-12]** Celery app config + 4 queues `1.5h`
  - `Celery(broker=REDIS_URL, backend=REDIS_URL)`
  - Task routes: `polling_queue`, `inference_queue`, `alerts_queue`, `maintenance_queue`
  - All tasks: `acks_late=True`, `reject_on_worker_lost=True`
  - `max_retries=3`, `countdown=60` on inference + alert tasks
  - Branch: `feat/backend-api` → PR-02

- [ ] **[P3-13]** Weather polling task — Celery Beat every 5 min `2h`
  - For each active zone: check `redis.get weather:{lat}:{lon}` TTL 300
  - On miss: call OpenWeatherMap → on fail: Open-Meteo → on fail: use stale cache + `is_stale=True`
  - Write `weather_readings` table
  - Compute `rainfall_72h_mm`: sum of last 72h readings × (5/60) conversion
  - After poll: `celery.send_task('tasks.run_inference', queue='inference_queue')`
  - Branch: `feat/backend-api` → PR-02

- [ ] **[P3-14]** Sensor simulator — MQTT publisher `1.5h`
  - For each active zone + sensor:
    - `sat = 40 + (rainfall × 1.5) + random.uniform(-2, 2)` capped at 100
    - `vib = 0.05 + random(0.01, 0.10)` if rain < 30, else `random(0.5, 3.0)` capped at 20
  - `paho.mqtt.client.publish(f'sensors/{zone_id}/{sensor_id}/readings', payload, qos=1)`
  - Runs every 5 min via Celery Beat
  - Branch: `feat/backend-api` → PR-02

- [ ] **[P3-15]** MQTT subscriber worker + `sensor_offline` handler `2h`
  - `paho-mqtt` subscribe to `sensors/#`
  - JSON schema validate payload fields
  - Range check: saturation 0–100, vibration 0–50 (reject and log if out of range)
  - Write `sensor_readings` table
  - `redis.setex sensor_last:{zone_id} 600 json_payload`
  - LWT topic `sensors/{zone_id}/{sensor_id}/status` with `{"status":"offline"}` → mark `sensor.status='offline'` in DB → Redis pub/sub `sensor_offline` event → Node.js emits WS
  - Branch: `feat/backend-api` → PR-02

- [ ] **[P3-16]** Alert dispatch task — SMS + WhatsApp + IVR `2h`
  - Check `redis.exists alert_suppress:{zone_id}` → skip if set
  - Check `redis.get alert_cooldown:{zone_id}` + escalation logic (CRITICAL bypasses)
  - `SELECT phone_encrypted FROM subscribers WHERE zone_id = ? AND is_active = true`
  - Decrypt each phone with `Fernet.decrypt`
  - Compose Hindi template for risk level
  - `twilio.messages.create` in parallel for each phone
  - `redis.setex alert_cooldown:{zone_id} 1800 risk_level`
  - Branch: `feat/backend-api` → PR-03

- [ ] **[P3-17]** Maintenance task + nightly cleanup `1h`
  - Nightly Celery Beat: drop `sensor_readings` partitions older than 90 days
  - Delete `subscribers` with `unsubscribed_at < NOW() - INTERVAL '30 days'`
  - Log system health metrics to stdout
  - Branch: `feat/backend-api` → PR-03

---

---

# 👤 Person 4 — ML Lead
**Branch:** `feat/ml-service` | **Merges to:** `dev` | **~18 hrs**

---

## Phase 0 — Data + Setup (Hour 0–3) | PR-01

- [ ] **[P4-01]** Download and prepare datasets `1h`
  - NASA Global Landslide Catalog: catalog.data.gov → search "Global Landslide Catalog" → download CSV
  - SRTM DEM for Uttarakhand: earthdata.nasa.gov → SRTM 1 Arc-Second (30m resolution) → tiles covering 28–31°N, 77–81°E
  - ISRO NRSC Landslide Atlas: nrsc.gov.in or bhuvan.nrsc.gov.in → download for Uttarakhand
  - Uttarakhand district GeoJSON: gadm.org → India Level 2 → filter to Uttarakhand
  - Store all in `/data/` folder (gitignored)
  - Branch: `feat/ml-service` → PR-01

- [ ] **[P4-02]** FastAPI app scaffold + Pydantic schemas `1.5h`
  - `FastAPI()` app with `X-Internal-API-Key` middleware (reads `ML_INTERNAL_API_KEY` env)
  - `PredictionRequest` Pydantic model: all 13 fields from `api_structure.md`
  - `PredictionResponse` Pydantic model: `zone_id`, `risk_score`, `risk_level`, `confidence`, `model_version`, `top_features`, `rf_class_probabilities`, `xgb_continuous_score`, `predicted_at`
  - Mount `/docs` Swagger UI
  - `Dockerfile` Python 3.11-slim, `pip install -r requirements.txt`
  - Branch: `feat/ml-service` → PR-01

---

## Phase 1 — Model Training (Hour 3–12) | PR-01

- [ ] **[P4-03]** Feature engineering + preprocessing pipeline `3h`
  - Merge NASA catalog events with SRTM slope features (by lat/lon grid join)
  - Compute: `rainfall_72h_mm` rolling sum, `antecedent_rainfall_index` (EWM span=24), `slope_x_rainfall = slope × rainfall`, `saturation_velocity`
  - Pipeline: `SimpleImputer(strategy='median')` → `StandardScaler()` → `PolynomialFeatures(degree=2, interaction_only=True)`
  - Fit pipeline on training data
  - Save `pipeline_v1.0.pkl` to `/models/`
  - Branch: `feat/ml-service` → PR-01

- [ ] **[P4-04]** Train RF + XGBoost ensemble `4h`
  - `RandomForestClassifier(n_estimators=200, class_weight='balanced', max_depth=15, random_state=42)`
  - Train on 4-class target: LOW / MODERATE / HIGH / CRITICAL
  - `XGBRegressor(n_estimators=200, learning_rate=0.05, max_depth=6, objective='reg:squarederror')`
  - Ensemble: `risk_score = (0.4 × RF_HIGH_proba) + (0.6 × XGB_score)` where `RF_HIGH_proba = P_HIGH + P_CRITICAL`
  - Evaluate: precision + recall on HIGH + CRITICAL classes (target: precision > 0.85)
  - Save `rf_v1.0.pkl` + `xgb_v1.0.pkl` to `/models/`
  - SHA-256 checksum each file, store in `models/checksums.json`
  - Branch: `feat/ml-service` → PR-01

---

## Phase 2 — FastAPI Endpoints (Hour 12–18) | PR-01 / PR-02

- [ ] **[P4-05]** `POST /ml/predict` endpoint `2.5h`
  - Load features dict → `preprocess(features, pipeline)` → `rf.predict_proba(X)` + `xgb.predict(X)`
  - Ensemble formula → `classify(score)` → `shap.TreeExplainer` top 3 features
  - Hard override: `if rainfall_mm_hr > 50 and slope_degrees > 40: risk_score = max(score, 0.85)`
  - Return full `PredictionResponse`
  - Target latency: < 500ms p99
  - Add timing middleware: log inference time for each request
  - Branch: `feat/ml-service` → PR-01

- [ ] **[P4-06]** Model hot-swap + `GET /ml/health` + `GET /models` `1.5h`
  - `POST /ml/models/{version}/load`: load candidate `.pkl` → validate output shape + SHA-256 checksum from `checksums.json` → swap module-level globals `rf_model`, `xgb_model`
  - `GET /ml/health`: return `{status, model_version, last_inference_at, inference_count, avg_latency_ms}`
  - `GET /models`: list all `.pkl` files in `/models/` with versions and timestamps
  - Branch: `feat/ml-service` → PR-02

---

## Phase 3 — Celery Integration (Hour 18–26) | PR-02 / PR-03

- [ ] **[P4-07]** Celery inference batch task `2.5h`
  - In `hhlews-worker` service (uses same Python codebase as ML)
  - Assemble feature vector per active zone:
    - Static features: from `redis.get zone_static:{zone_id}` (or DB fallback)
    - Weather: from `redis.get weather:{lat}:{lon}`
    - Sensor: from `redis.get sensor_last:{zone_id}` (or 24h DB average fallback)
  - `POST http://hhlews-ml:8000/ml/predict` with `X-Internal-API-Key` header
  - On response: write `risk_predictions` table, update `redis.setex risk:{zone_id} 600 json`
  - Emit `zone_risk_updated` via Redis pub/sub → Node.js picks up → WebSocket to dashboard
  - Branch: `feat/ml-service` → PR-02

- [ ] **[P4-08]** Two-cycle alert evaluation + hard override logic `2h`
  - After each inference: `prev = redis.get score_history:{zone_id}` → store current score `redis.setex score_history:{zone_id} 600 score`
  - If `score < 0.65`: check for resolution (was previously HIGH) → call `handle_risk_resolution()`
  - If `score >= 0.65` AND `prev_score < 0.65`: first HIGH cycle → `redis.setex watch_state:{zone_id} 600 "1"` → return
  - If `score >= 0.65` AND `prev_score >= 0.65`: two consecutive HIGH → call `evaluate_and_dispatch(zone_id, score, risk_level)`
  - Hard override check runs BEFORE ML call: `if rainfall > 50 and slope > 40: return synthetic CRITICAL prediction`
  - Branch: `feat/ml-service` → PR-03

---

---

## 📋 Summary Checklist by PR

### PR-01 (Hour 10) — P3 + P4 merge to `dev`
- [ ] P3-01 OpenWeatherMap API key in `.env`
- [ ] P3-02 Twilio credentials in `.env`
- [ ] P3-03 `docker-compose.yml` — all services start clean
- [ ] P3-04 PostgreSQL + PostGIS up, zones seeded, Prisma migrated
- [ ] P3-05 Express middleware stack running
- [ ] P3-06 `POST /auth/login` returns JWT
- [ ] P3-07 Auth middleware blocking unauthorized requests
- [ ] P3-08 All public GET endpoints returning data
- [ ] P4-01 Datasets downloaded to `/data/`
- [ ] P4-02 FastAPI app starts on port 8000
- [ ] P4-03 Preprocessing pipeline saved as `pipeline_v1.0.pkl`
- [ ] P4-04 RF + XGBoost models saved as `rf_v1.0.pkl` + `xgb_v1.0.pkl`
- [ ] P4-05 `POST /ml/predict` returns valid `PredictionResponse`

### PR-02 (Hour 18) — All four merge to `dev`
- [ ] P3-09 Subscribe OTP flow working end-to-end
- [ ] P3-10 `/alerts/trigger` dispatches Celery task
- [ ] P3-11 WebSocket accepts connections, `subscribe_zone` joins room
- [ ] P3-12 Celery app config with 4 queues
- [ ] P3-13 Weather polling running every 5 min, data in `weather_readings`
- [ ] P3-14 Sensor simulator publishing to MQTT every 5 min
- [ ] P3-15 MQTT subscriber writing to `sensor_readings`
- [ ] P4-06 `/ml/health` returns 200
- [ ] P4-07 Celery inference task calling `/ml/predict`, writing `risk_predictions`
- [ ] P1-01 through P1-07 — Dashboard React app running, map loads, login works
- [ ] P2-01 through P2-06 — PWA running, all 4 screens render in Hindi

### PR-03 (Hour 26) — All four merge to `dev`
- [ ] End-to-end: weather poll → ML inference → Redis → WebSocket → dashboard polygon updates
- [ ] End-to-end: risk threshold breach → alert dispatch → Twilio SMS delivered
- [ ] P3-16 Alert dispatch with cooldown logic working
- [ ] P4-08 Two-cycle evaluation + hard override working
- [ ] P1-08 through P1-12 — Alert form, suppression, sensor panel, WebSocket live
- [ ] P2-07 through P2-08 — Offline cache working, PWA installable

### PR-04 (Hour 34) — All four merge `dev → main`
- [ ] P1-13 Toast notifications working
- [ ] P2-09 All Hindi translations complete
- [ ] P2-10 Lighthouse PWA score ≥ 90
- [ ] P2-11 Demo spike (triple-tap CRITICAL) working
- [ ] P3-17 Maintenance task configured
- [ ] Full demo script run without errors

---

*Document Version: 1.0 — HH-LEWS Hackathon Build — Team HH-LEWS*
