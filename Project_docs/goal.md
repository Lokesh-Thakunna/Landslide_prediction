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
4. Lightweight ML risk prediction engine
5. Multilingual alert system (SMS + WhatsApp in Hindi)
6. Interactive risk map with safe zone navigation
7. Dead-simple citizen mobile UI

Satellites are demoted to a **validation layer** — not the primary trigger.
Ground sensors + rainfall forecast = the real trigger.

---

## 📦 Five Core Features

### Feature 1 — Live Data Ingestion Layer
- **Stream A:** Real-time rainfall via OpenWeatherMap / Tomorrow.io API (live, every 5 min)
- **Stream B:** Terrain slope data from SRTM DEM (pre-loaded per district)
- **Stream C:** Simulated sensor readings (tilt, soil moisture) — seeded by live rainfall
- Covers key Uttarakhand zones: Chamoli, Rudraprayag, Tehri, Uttarkashi, Pithoragarh

### Feature 2 — ML Risk Prediction Engine
- Model: Random Forest Classifier (scikit-learn)
- Inputs: rainfall (current + 48hr forecast), slope angle, soil moisture, historical landslide frequency
- Output: 🟢 Safe / 🟡 Watch / 🔴 Danger
- Exposed as REST API: `POST /predict`
- Datasets: NASA Global Landslide Catalog + ISRO NRSC Hazard Zones + SRTM DEM

### Feature 3 — Multilingual Alert System
- Triggers automatically when risk level hits 🔴
- Channel 1: SMS via Twilio (Hindi)
- Channel 2: WhatsApp via Twilio Sandbox (Hindi)
- Channel 3: Live dashboard red alert banner
- Example alert: *"भारी बारिश के कारण आपके क्षेत्र में भूस्खलन का खतरा है। कृपया सुरक्षित स्थान पर जाएँ।"*

### Feature 4 — Interactive Risk Map
- Live Uttarakhand district map colored Green / Yellow / Red
- Live rainfall overlay
- Pre-mapped safe shelters (schools, open grounds, ridges)
- Two views: Official (detailed) and Citizen (simple)
- Click any zone: see rainfall, slope, risk score, nearest safe shelter

### Feature 5 — Citizen Mobile UI (PWA)
- Progressive Web App — no download needed, works on any phone browser
- Single screen: Location + Rain Status + Risk Level + Safe Direction + Emergency Number
- Available in Hindi
- Zero jargon, zero complexity

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Tailwind CSS + Leaflet.js + Recharts |
| Backend | Node.js + Express |
| ML Model | Python + scikit-learn + FastAPI |
| Real-time | WebSockets (Socket.io) |
| Alerts | Twilio (SMS + WhatsApp) |
| Maps | Leaflet.js + OpenStreetMap + Uttarakhand GeoJSON |
| Weather API | OpenWeatherMap or Tomorrow.io (free tier) |
| Hosting | Vercel (frontend) + Render/Railway (backend) |

---

## 📊 Data Sources

| Dataset | Purpose | Source |
|---------|---------|--------|
| OpenWeatherMap / Tomorrow.io | Live rainfall + forecast | API (free tier) |
| SRTM Digital Elevation Model | Slope angle per zone | earthdata.nasa.gov |
| NASA Global Landslide Catalog | ML model training | catalog.data.gov |
| ISRO NRSC Landslide Atlas | Hazard zone overlays + risk calibration | nrsc.gov.in / bhuvan.nrsc.gov.in |
| Uttarakhand District GeoJSON | Map visualization | GADM / GitHub |
| NDMA Uttarakhand Hazard Zones | Ground truth validation | ndma.gov.in |

---

## 👥 Team Division

| Person | Role | Owns |
|--------|------|------|
| Person 1 | Frontend Lead | Risk map + Dashboard + Official view |
| Person 2 | Frontend Support | Citizen PWA + Hindi UI + Polish |
| Person 3 | Backend Lead | Weather API integration + Sensor simulator + Twilio alerts |
| Person 4 | ML + Integration + Pitch | Train model + FastAPI endpoint + Connect all APIs + Slides |

---

## ⏱️ 46-Hour Build Timeline

| Hours | Milestone |
|-------|-----------|
| 0–3 | Repo setup, API keys, datasets downloaded, tasks divided |
| 3–10 | Everyone builds independently |
| 10–18 | Backend + ML connect first. Frontend scaffolded |
| 18–26 | Full integration — data flows end to end |
| 26–34 | UI polish, Hindi translations, demo script written |
| 34–42 | Demo rehearsed 5+ times. Pitch deck finalized |
| 42–46 | Rest + final rehearsal + buffer |

---

## 🗣️ 60-Second Pitch

*"Every monsoon, Uttarakhand loses lives to landslides. Existing systems fail because they depend on satellites that revisit every 6 days, show complex maps nobody understands, and alert nobody in their language.*

*We built HH-LEWS — a hybrid system. Real rainfall data from weather APIs feeds our risk engine alongside terrain data and ground sensor readings. When risk crosses a threshold, it automatically fires Hindi SMS and WhatsApp alerts to villagers, while officials see a live risk map with safe evacuation zones.*

*Let me show you — [trigger demo spike] — within 10 seconds, that phone receives an alert in Hindi."*

---

## ✅ What Makes This Win

- ✔ Solves a **real, local, life-or-death problem**
- ✔ Uses **real live data** (not just mock)
- ✔ Has a **live demo wow moment** (Hindi SMS on stage)
- ✔ Technically sound but **practically deployable**
- ✔ Addresses human gaps: language, UI complexity, safe zone guidance
- ✔ Honest about simulation — with clear Phase 2 roadmap for physical sensors
- ✔ Balances all judging criteria: impact, innovation, feasibility, presentation

---

*Document Version: 1.0 | Hackathon Build | Team HH-LEWS*
