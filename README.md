# 🏔️ HH-LEWS — Himalayan Hybrid Landslide Early Warning System

> Real-time landslide risk prediction + multilingual alert system for Uttarakhand, India.  
> Ground sensors + live rainfall + RF/XGBoost ML → Hindi SMS / WhatsApp / IVR alerts in under 15 seconds.

---

## 🎯 What It Does

| Layer | What happens |
|-------|-------------|
| **Ingest** | OpenWeatherMap rainfall (every 5 min) + SRTM terrain slope (static) + simulated IoT sensors via MQTT |
| **Predict** | Random Forest + XGBoost ensemble → `risk_score` 0.0–1.0 per zone |
| **Alert** | Two consecutive HIGH cycles → Hindi SMS + WhatsApp + IVR voice call via Twilio/Exotel |
| **Visualize** | Official Leaflet.js dashboard (WebSocket live) + Citizen PWA (Hindi, offline-capable) |

---

## 🗂️ Repo Structure

```
hhlews/
├── apps/
│   ├── dashboard/          # React 18 — Official Dashboard (Leaflet, WebSocket, JWT auth)
│   └── citizen-pwa/        # React 18 — Citizen PWA (Hindi, offline, Vite PWA)
├── services/
│   ├── api/                # Node.js 20 + Express — API Gateway (port 3000)
│   ├── ml/                 # Python 3.11 + FastAPI — ML Inference (port 8000, VPC internal)
│   └── worker/             # Python 3.11 + Celery — Task Workers (polling, inference, alerts)
├── packages/
│   └── ui/                 # Shared React component library
├── scripts/
│   ├── load_srtm.py        # One-time SRTM DEM → PostGIS loader
│   ├── seed_zones.sql      # Seed districts + zones + safe zones
│   └── spatial_indexes.sql # PostGIS GIST spatial indexes
├── docs/
│   ├── 01_API_Endpoints.md
│   ├── 02_Database_Models.md
│   ├── 03_Authentication.md
│   └── 04_Business_Logic.md
├── models/                 # ML model .pkl files (gitignored — large files)
├── data/                   # Raw datasets (gitignored — large files)
├── docker-compose.yml
├── .env.example
├── CONTRIBUTING.md         # Team workflow, branch rules, PR process
└── TASKS.md                # Full 49-task board split by member
```

---

## 👥 Team

| Person | Role | Branch | Owns |
|--------|------|--------|------|
| Person 1 | Frontend Lead | `feat/dashboard` | Risk map, Dashboard, WebSocket UI |
| Person 2 | PWA Dev | `feat/citizen-pwa` | Citizen PWA, Hindi i18n, Offline cache |
| Person 3 | Backend Lead | `feat/backend-api` | Node.js API, PostgreSQL, Celery, Twilio |
| Person 4 | ML Lead | `feat/ml-service` | FastAPI, RF+XGBoost model, Integration |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS + Leaflet.js + Recharts |
| API Gateway | Node.js 20 + Express + Socket.io |
| ML Service | Python 3.11 + FastAPI + scikit-learn + XGBoost |
| Task Workers | Celery 5 + Redis 7 (broker) |
| IoT Broker | Eclipse Mosquitto (MQTT) |
| Database | PostgreSQL 15 + PostGIS 3.3 |
| Cache | Redis 7 |
| Alerts | Twilio (SMS + WhatsApp) + Exotel (IVR) |
| Maps | Leaflet.js + OpenStreetMap + Uttarakhand GeoJSON |
| Weather API | OpenWeatherMap (primary) + Open-Meteo (fallback) |
| Containerization | Docker + Docker Compose |
| Hosting | Vercel (frontend) + Render/Railway (backend) |

---

## ⚡ Quick Start

### Prerequisites
- Docker Desktop
- Node.js 20+
- Python 3.11+

### 1. Clone and configure

```bash
git clone https://github.com/<org>/hhlews.git
cd hhlews
cp .env.example .env
# Fill in your API keys in .env (see CONTRIBUTING.md for which keys are needed)
```

### 2. Start all backend services

```bash
docker-compose up -d
docker-compose ps   # verify all services are healthy
```

### 3. Run database setup (first time only)

```bash
cd services/api
npx prisma migrate deploy
psql $DATABASE_URL -f ../../scripts/spatial_indexes.sql
psql $DATABASE_URL -f ../../scripts/seed_zones.sql
```

### 4. Load SRTM terrain data (Person 4 — first time only)

```bash
cd scripts
pip install rasterio numpy psycopg2-binary
python load_srtm.py
```

### 5. Start frontends

```bash
# Terminal 1 — Official Dashboard
cd apps/dashboard && npm install && npm run dev
# http://localhost:5173

# Terminal 2 — Citizen PWA
cd apps/citizen-pwa && npm install && npm run dev
# http://localhost:5174
```

### 6. Verify end-to-end

```bash
# Health check
curl http://localhost:3000/api/health

# ML inference (internal)
curl -X POST http://localhost:8000/ml/predict \
  -H "X-Internal-API-Key: $ML_INTERNAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"zone_id":"test","rainfall_mm_hr":35.4,"rainfall_72h_mm":180.0,"slope_degrees":44.5,"aspect_avg":220.0,"curvature":-0.12,"soil_saturation_pct":89.2,"vibration_mps2":1.2,"soil_type_code":2,"historical_landslide_proximity_km":1.5,"antecedent_rainfall_index":145.6,"slope_x_rainfall":1571.3,"saturation_velocity":0.4}'

# Public zones risk
curl http://localhost:3000/api/zones/risk
```

---

## 📡 API Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/login` | No | Issue JWT access token |
| `GET` | `/api/districts` | No | All monitored districts |
| `GET` | `/api/zones/risk` | No | All zones with risk scores |
| `GET` | `/api/risk/:district` | No | Zones filtered by district |
| `GET` | `/api/safe-zones` | No | Safe shelter locations |
| `GET` | `/api/weather/live` | No | Latest weather per zone |
| `POST` | `/api/subscribe` | OTP | Citizen phone subscription |
| `POST` | `/api/alerts/trigger` | JWT | Manual alert override |
| `POST` | `/api/alerts/suppress` | JWT | Suppress auto-alerts |
| `WS` | `/realtime-risk` | JWT | Live risk + alert events |
| `POST` | `/ml/predict` | API Key | ML inference (VPC only) |

Full documentation: [`docs/01_API_Endpoints.md`](docs/01_API_Endpoints.md)

---

## 🔒 Risk Level Reference

| Level | Score | Color | Action |
|-------|-------|-------|--------|
| LOW | < 0.40 | 🟢 Green | No action |
| MODERATE | 0.40 – 0.64 | 🟡 Yellow | Monitor |
| HIGH | 0.65 – 0.84 | 🟠 Orange | Pre-evacuate, SMS alert |
| CRITICAL | ≥ 0.85 | 🔴 Red | Immediate evacuation, all channels |

---

## 📊 Data Sources

| Dataset | Purpose | Source |
|---------|---------|--------|
| OpenWeatherMap | Live rainfall (primary) | openweathermap.org |
| Open-Meteo | Rainfall fallback | open-meteo.com |
| SRTM DEM 30m | Slope, aspect, curvature | earthdata.nasa.gov |
| NASA Global Landslide Catalog | ML training data | catalog.data.gov |
| ISRO NRSC Landslide Atlas | Hazard zone calibration | nrsc.gov.in |
| Uttarakhand GeoJSON | Map visualization | gadm.org |
| NDMA Hazard Zones | Ground truth validation | ndma.gov.in |

---

## 📖 Documentation

| File | Contents |
|------|---------|
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Branch rules, commit format, PR process, sync points |
| [`TASKS.md`](TASKS.md) | Full 49-task board split by member across 6 phases |
| [`docs/01_API_Endpoints.md`](docs/01_API_Endpoints.md) | All 14 API endpoints with schemas + cURL examples |
| [`docs/02_Database_Models.md`](docs/02_Database_Models.md) | Prisma schema, migrations, spatial queries |
| [`docs/03_Authentication.md`](docs/03_Authentication.md) | JWT structure, RBAC matrix, SMS abuse prevention |
| [`docs/04_Business_Logic.md`](docs/04_Business_Logic.md) | ML formula, alert algorithm, fail-safe logic |

---

## 🗓️ 46-Hour Build Timeline

| Hours | Milestone |
|-------|-----------|
| 0–3 | Repo setup, API keys, docker-compose verified, tasks divided |
| 3–10 | All members build independently on their branches |
| **Hour 10** | **PR-01** — P3 + P4 merge: DB + API + `/predict` working |
| 10–18 | Full backend + frontend scaffolds |
| **Hour 18** | **PR-02** — All merge: weather → ML → Redis → WebSocket live |
| 18–26 | End-to-end integration + alert dispatch testing |
| **Hour 26** | **PR-03** — All merge: full demo flow working on `dev` |
| 26–34 | UI polish, Hindi translations, offline PWA, demo script |
| **Hour 34** | **PR-04** — All merge to `main`: demo-ready |
| 34–42 | Demo rehearsed 5+ times, pitch deck finalized |
| 42–46 | Rest + final rehearsal + buffer |

---

## 🤝 Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full team workflow, branch rules, and PR process.

---

*HH-LEWS — Hackathon Build v2.0 — Team HH-LEWS*
