# 🏔️ HH-LEWS — Himalayan Hybrid Landslide Early Warning System
### Project Goal & Overview Document

---

## 🎯 Core Problem

Uttarakhand loses lives every monsoon season to landslides. Current early warning systems fail because:

- Satellites revisit every 5–6 days — too slow for real-time triggers
- Cloud cover blocks optical satellite data during monsoon (worst time)
- No alerts reach villages in local language (Hindi, Garhwali, Kumaoni)
- Risk maps are too complex and scientific for villagers to act on
- No system tells you *where to go* when danger is detected
- UI/UX is built for researchers, not for local officials or citizens
- Mountain communication infrastructure is weak — systems need offline fallback

---

## 🏗️ Our Solution — HH-LEWS

A **practical, deployable, hybrid early warning system** that combines:

1. Live rainfall data (real, via weather APIs)
2. Terrain/slope data (pre-processed from satellite DEM — static)
3. Simulated IoT ground sensors (tilt, soil moisture, vibration — Phase 1 simulation, seeded by real rainfall)
4. **RF + XGBoost ensemble** ML risk prediction engine
5. Multilingual alert system (SMS + WhatsApp + IVR voice call in Hindi)
6. Interactive risk map with safe zone navigation
7. Dead-simple citizen mobile UI — **works offline**

Satellites are demoted to a **validation layer** — not the primary trigger.
Ground sensors + rainfall forecast = the real trigger.

---

## 📦 Five Core Features

### Feature 1 — Live Data Ingestion Layer
- **Stream A:** Real-time rainfall via OpenWeatherMap API (live, every 5 min) — Open-Meteo as automatic fallback
- **Stream B:** Terrain slope data from SRTM DEM (pre-loaded per district)
- **Stream C:** Simulated sensor readings (tilt, soil moisture) — seeded by live rainfall
- Covers key Uttarakhand zones: Chamoli, Rudraprayag, Tehri, Uttarkashi, Pithoragarh

### Feature 2 — ML Risk Prediction Engine
- Model: **Random Forest + XGBoost ensemble** (scikit-learn + XGBoost)
- Ensemble formula: `risk_score = (0.4 × RF_probability) + (0.6 × XGB_score)`
- Inputs: rainfall (current + 72h cumulative antecedent), slope angle, soil moisture, vibration, historical landslide frequency
- Output: 🟢 LOW / 🟡 MODERATE / 🟠 HIGH / 🔴 CRITICAL
- Exposed as REST API: `POST /predict`
- Datasets: NASA Global Landslide Catalog + ISRO NRSC Hazard Zones + SRTM DEM

### Feature 3 — Multilingual Alert System
- Triggers automatically when risk level hits 🟠 HIGH (score ≥ 0.65) for two consecutive cycles
- Channel 1: SMS via Twilio (Hindi)
- Channel 2: WhatsApp via Twilio Business API (Hindi)
- Channel 3: **IVR voice call via Exotel** (Hindi audio — for non-literate / elderly citizens)
- Channel 4: Live dashboard red alert banner
- Example alert: *"भारी बारिश के कारण आपके क्षेत्र में भूस्खलन का खतरा है। कृपया सुरक्षित स्थान पर जाएँ।"*

### Feature 4 — Interactive Risk Map
- Live Uttarakhand district map colored Green / Yellow / Orange / Red (4 risk tiers)
- Live rainfall overlay
- Pre-mapped safe shelters (schools, open grounds, ridges) with Hindi directions
- Two views: Official (detailed) and Citizen (simple)
- Click any zone: see rainfall, slope, risk score, nearest safe shelter

### Feature 5 — Citizen Mobile UI (PWA)
- Progressive Web App — no download needed, works on any phone browser
- Single screen: Location + Rain Status + Risk Level + Safe Direction + Emergency Number
- Available in Hindi
- **Offline mode:** serves last-cached risk data and safe zone map for 24 hours — critical for low-connectivity mountain areas
- Zero jargon, zero complexity

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Tailwind CSS + Leaflet.js + Recharts |
| Backend (API Gateway) | Node.js + Express |
| ML Microservice | Python + scikit-learn + XGBoost + FastAPI |
| Task Queue | Celery + Redis |
| Real-time | WebSockets (Socket.io) |
| IoT / Sensor Broker | MQTT (Eclipse Mosquitto) |
| Alerts | Twilio (SMS + WhatsApp) + Exotel (IVR) |
| Maps | Leaflet.js + OpenStreetMap + Uttarakhand GeoJSON |
| Database | PostgreSQL 15 + PostGIS 3.3 |
| Cache | Redis 7 |
| Weather API | OpenWeatherMap (primary) + Open-Meteo (fallback) |
| Hosting | Vercel (frontend) + Render/Railway (backend) |

---

## 📊 Data Sources

| Dataset | Purpose | Source |
|---------|---------|--------|
| OpenWeatherMap | Live rainfall + current conditions (primary) | API (free tier) |
| Open-Meteo | Live rainfall fallback — auto-switch on primary failure | API (free, open-source) |
| SRTM Digital Elevation Model | Slope angle, aspect, curvature per zone | earthdata.nasa.gov |
| NASA Global Landslide Catalog | ML model training | catalog.data.gov |
| ISRO NRSC Landslide Atlas | Hazard zone overlays + risk calibration | nrsc.gov.in / bhuvan.nrsc.gov.in |
| Uttarakhand District GeoJSON | Map visualization | GADM / GitHub |
| NDMA Uttarakhand Hazard Zones | Ground truth validation | ndma.gov.in |

---

## 👥 Team Division

| Person | Role | Owns |
|--------|------|------|
| Person 1 | Frontend Lead | Risk map + Dashboard + Official view |
| Person 2 | Frontend Support | Citizen PWA + Hindi UI + Offline mode + Polish |
| Person 3 | Backend Lead | Weather API integration + Sensor simulator + Twilio + IVR alerts |
| Person 4 | ML + Integration + Pitch | Train RF + XGBoost ensemble + FastAPI endpoint + Connect all APIs + Slides |

---

## ⏱️ 46-Hour Build Timeline

| Hours | Milestone |
|-------|-----------|
| 0–3 | Repo setup, API keys, datasets downloaded, tasks divided |
| 3–10 | Everyone builds independently |
| 10–18 | Backend + ML connect first. Frontend scaffolded |
| 18–26 | Full integration — data flows end to end |
| 26–34 | UI polish, Hindi translations, offline PWA cache, demo script written |
| 34–42 | Demo rehearsed 5+ times. Pitch deck finalized |
| 42–46 | Rest + final rehearsal + buffer |

---

## 🗣️ 60-Second Pitch

*"Every monsoon, Uttarakhand loses lives to landslides. Existing systems fail because they depend on satellites that revisit every 6 days, show complex maps nobody understands, and alert nobody in their language.*

*We built HH-LEWS — a hybrid system. Real rainfall data from weather APIs feeds our RF + XGBoost risk engine alongside terrain data and live ground sensor readings. When risk crosses a threshold for two consecutive cycles, it automatically fires Hindi SMS, WhatsApp, and voice calls to villagers — while officials see a live risk map with safe evacuation zones. The citizen PWA even works offline in areas with no signal.*

*Let me show you — [trigger demo spike] — within 10 seconds, that phone receives an alert in Hindi."*

---

## ✅ What Makes This Win

- ✔ Solves a **real, local, life-or-death problem**
- ✔ Uses **real live data** (not just mock)
- ✔ Has a **live demo wow moment** (Hindi SMS on stage)
- ✔ Technically sound but **practically deployable**
- ✔ Addresses human gaps: language, UI complexity, safe zone guidance, offline access
- ✔ Honest about simulation — with clear Phase 2 roadmap for physical sensors
- ✔ **Ensemble ML** (RF + XGBoost) with two-cycle validation — not just a single model
- ✔ **Triple alert channels** — SMS, WhatsApp, and IVR voice for non-literate citizens
- ✔ Balances all judging criteria: impact, innovation, feasibility, presentation

---

## 📋 Changes from v1.0
> *(Internal reference — remove before external sharing)*

| # | What changed | Why |
|---|---|---|
| 1 | Tomorrow.io removed from weather stack | Not implemented — Open-Meteo is the actual fallback |
| 2 | "48hr forecast" replaced with "72h cumulative antecedent rainfall" | Matches actual ML feature schema (`rainfall_72h_mm`) |
| 3 | Risk output updated from 3 levels to 4 levels | Matches backend enum: LOW / MODERATE / HIGH / CRITICAL |
| 4 | IVR voice call (Exotel) added to alert channels | Was implemented but missing from goal doc |
| 5 | Offline PWA mode explicitly mentioned | Addresses stated problem ("weak mountain connectivity") |
| 6 | ML model updated to "RF + XGBoost ensemble" | Accurately reflects the actual ensemble implementation |

---

*Document Version: 2.0 | Hackathon Build | Team HH-LEWS*