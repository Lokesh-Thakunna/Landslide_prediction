# HH-LEWS — Improvement Specs: Phased Task Plan

> This document consolidates summaries of all four improvement specification files and organises them into project phases based on priority, dependency, and implementation complexity.

---

## Overview of All Improvement Specs

| # | File | Feature | Priority |
|---|------|---------|----------|
| 01 | `improvement_01_multilanguage.md` | Multilanguage Support (Hindi, Garhwali, Kumaoni, English) | High |
| 02 | `improvement_02_media_reports.md` | Crowdsourced Media Evidence with AI Verification | High |
| 03 | `improvement_03_google_maps.md` | Live Data Integration with Google Maps Platform | Medium-High |
| 04 | `improvement_04_location_routing.md` | Location Mapping with Safe Route & Evacuation Path | Critical |

---

## Phase 1 — Foundation & Core Safety (Must-Have Before Launch)

**Goal:** Ensure every citizen can receive alerts they understand and can act on immediately.

---

### Improvement 01 — Multilanguage Support
**File:** `improvement_01_multilanguage.md`
**Version:** 2.0 | **Scope:** Citizen PWA + SMS/WhatsApp Alerts + Official Dashboard

**Summary:**
The system currently sends all alerts and displays all screens in Hindi only, leaving out Garhwali speakers (Chamoli, Rudraprayag, Tehri, Uttarkashi — ~2.5M speakers) and Kumaoni speakers (Pithoragarh, Almora, Bageshwar, Nainital — ~2M speakers). A warning received in an unfamiliar language causes hesitation, which can be fatal during a landslide.

This improvement adds four-language support — Hindi, Garhwali, Kumaoni, and English — across the Citizen PWA, SMS alerts, WhatsApp messages, and the Official Dashboard. The system auto-detects the likely language from the citizen's district and pre-selects it on first open. Language switching is live (no restart), always one tap away, and saved permanently to the device and against the subscriber's phone number. Alert dispatch automatically sends each subscriber their version — DDMOs send one alert and the system handles all four language variants.

**Key Tasks:**
- Create translated text files for all 4 languages (alert messages first)
- Add language choice to phone subscription step
- Live language switching in PWA — no restart needed
- Language chip always visible on home screen
- Auto-dispatch in subscriber's language (no manual DDMO effort)
- Dashboard alert preview showing all language versions and subscriber counts
- Native speaker review of Garhwali and Kumaoni translations before going live
- Automated SMS length check — must stay under 160 characters per variant

---

### Improvement 04 — Location Mapping with Safe Route & Evacuation Path
**File:** `improvement_04_location_routing.md`
**Version:** 1.0 | **Scope:** Citizen PWA + Node.js API + PostGIS

**Summary:**
The current system tells a citizen their zone is HIGH or CRITICAL and shows a text description of how to reach the safe shelter. Most citizens in 2025 have Android phones with GPS. This improvement replaces static text directions with a live map showing the citizen's position as a moving blue dot, the danger zone as a red polygon, and a green route line to the nearest shelter — with real-time updates as they move.

The system works at three connectivity levels: full internet gives live Google Directions with turn-by-turn instructions; partial connectivity uses pre-cached map tiles with a computed route; fully offline gives a compass bearing and landmark text. The citizen always gets actionable guidance. A "moving toward danger" warning fires if the device detects the citizen is walking toward the hazard rather than away. DDMOs can author and verify evacuation paths via the dashboard. Pre-caching map tiles for Uttarakhand (~80MB) ensures offline operation during disasters.

**Key Tasks:**
- Add `elevation_m`, `approach_bearing`, `approach_note_hi` to `safe_zones` table
- Create `evacuation_paths` table (DDMO-verified paths) with PostGIS index
- Create `danger_zones` table (active debris, blocked roads) with PostGIS index
- `GET /api/location/status` — zone detection + route + warnings in one call
- `GET /api/location/nearby-safe-zones` — sorted by walking time with elevation comparison
- `POST /api/dashboard/evacuation-paths` — DDMO path authoring interface
- Bearing computation and `is_moving_toward_danger` warning logic
- Citizen PWA: live blue dot + route polyline on map screen
- Citizen PWA: turn-by-turn navigation screen
- Citizen PWA: "moving toward danger" warning banner
- Citizen PWA: offline compass bearing screen
- Offline map tile pre-caching in service worker
- Seed evacuation paths for pilot zones via DDMO input

---

## Phase 2 — Intelligence & Ground Truth

**Goal:** Upgrade the system from sensor-only to human-augmented with real-world media evidence and AI verification.

---

### Improvement 02 — Crowdsourced Media Evidence System
**File:** `improvement_02_media_reports.md`
**Version:** 1.0 | **Scope:** Citizen PWA + Backend API + ML Verification Pipeline

**Summary:**
The current system is entirely sensor-driven with no mechanism to receive visual confirmation from humans at the site. This creates two blind spots: ML models can miss a landslide that hasn't yet triggered sensor thresholds, and officials need visual evidence to decide whether to mobilise SDRF. This improvement turns citizens into a crowdsourced sensor network.

Citizens can upload a geotagged photo (up to 10MB) or short video (up to 50MB, ≤60 seconds) directly from the PWA. The backend runs an AI verification pipeline using Google Cloud Vision API to answer four questions: Does the image show a landslide event? Is it freshly taken? Does the GPS location match the claimed zone? Is it a duplicate? Verified reports boost the zone's risk score by up to +0.15 (decaying over 2 hours) and appear in the DDMO dashboard with thumbnail previews and confidence badges. DDMOs can override AI verdicts. Anonymous uploads are allowed but weighted lower than registered subscribers.

**Key Tasks:**
- Create `media_reports` table with all indexes and PostGIS spatial index
- `POST /api/reports/upload` — multipart/form-data with antivirus scan and file type validation
- S3 storage with AES-256 encryption; presigned URLs (15-min expiry) for dashboard viewing
- Celery `verify_media_report` task: Vision API + EXIF freshness check + location match + perceptual hash dedup
- `aggregate_verification` scoring logic (Vision 50%, freshness 25%, location 25%)
- Risk boost integration with 2-hour TTL decay in Redis + WebSocket broadcast
- Dashboard media panel in zone sidebar with verification status badges
- PWA upload screen with direct camera access, GPS auto-capture, and language-aware confirmation
- Rate limiting: 3 uploads per phone per hour (server-side enforced)
- `POST /api/dashboard/reports/:id/review` — DDMO manual review and override endpoint
- Privacy: face blur option in dashboard, phone hash (never plaintext), text moderation on descriptions

---

## Phase 3 — Real-World Context & Navigation Enrichment

**Goal:** Integrate live road conditions, traffic data, and dynamic evacuation routing from Google Maps Platform.

---

### Improvement 03 — Live Data Integration with Google Maps Platform
**File:** `improvement_03_google_maps.md`
**Version:** 1.0 | **Scope:** Backend Celery Workers + Node.js API + Dashboard + Citizen PWA

**Summary:**
The current system uses OpenStreetMap and SRTM DEM for static map rendering and terrain slope, with no live road condition data. Three gaps remain: road closures due to earlier debris are not visible to citizens or officials; there is no live traffic or incident data for evacuation planning; and safe zone directions are static text rather than computed routes from a person's current GPS position.

This improvement integrates five Google Maps Platform APIs: Maps JavaScript API (dashboard map with satellite + traffic layer), Directions API (live evacuation routes), Roads API (snap GPS tracks and identify blocked segments), Places API (discover nearby safe structures dynamically), and Elevation API (verify evacuation routes avoid descending into valleys). The official dashboard switches from Leaflet.js to Google Maps for real-time overlays. The Citizen PWA keeps Leaflet.js for offline capability but now shows a live computed route. Road conditions are polled every 30 minutes — but only for zones currently at HIGH or CRITICAL risk — to control API costs within the $200/month free tier for pilot/hackathon use.

**Key Tasks:**
- Create `road_segments` and `road_conditions` tables in PostgreSQL
- Seed road segments for all 5 pilot districts from OpenStreetMap (osm2pgsql or Overpass API)
- Celery `poll_road_conditions` task — runs every 30 minutes for HIGH/CRITICAL zones only
- `GET /api/zones/:id/road-conditions` — current road status for all key routes in a zone
- `GET /api/safe-zones/:id/route` — evacuation route calling Google Directions API server-side
- `GET /api/zones/:id/elevation-profile` — terrain elevation context for officials
- Dashboard map: replace Leaflet.js with Google Maps JavaScript API + traffic layer
- Dashboard: road condition Polyline overlays with colour-coded status (open, congested, blocked, flooded)
- Citizen PWA: computed route polyline on safe zone screen with step-by-step instructions in user's language
- Offline fallback: straight-line Leaflet map + pre-stored landmark directions when route API unavailable
- Google Maps API key management: server-side key (never exposed to frontend) + restricted client-side key for dashboard domain only
- Rate limiting and Redis caching for all API calls to minimise cost

---

## Phase Dependencies Summary

```
Phase 1 (Foundation)
  ├── Multilanguage Support      ← No dependencies. Start immediately.
  └── Location Routing & Maps    ← Requires safe_zones table (existing). Start immediately.
        │
        ▼
Phase 2 (Intelligence)
  └── Crowdsourced Media Reports ← Benefits from danger_zones table (Phase 1).
                                   AI verification pipeline is independent.
        │
        ▼
Phase 3 (Enrichment)
  └── Google Maps Integration    ← Builds on road/route infrastructure from Phase 1.
                                   Enriches media report location data from Phase 2.
```

---

## Cross-Cutting Notes

- **Translation quality:** Garhwali and Kumaoni alert messages must be reviewed by native speakers before any Phase 1 go-live. Machine translation is not acceptable for life-safety messages.
- **Offline-first:** All citizen-facing features (Phases 1, 2, 3) must degrade gracefully with no connectivity. Never block a citizen's safety action behind an internet requirement.
- **API key security:** The Google Maps server-side key must never be exposed to the frontend. All Directions, Roads, and Elevation API calls must proxy through the Node.js backend.
- **Cost control:** Google Maps API calls are metered. Road condition polling only runs on HIGH/CRITICAL zones. All API responses are cached in Redis with appropriate TTLs.
- **Privacy:** Phone numbers are never stored in plaintext in media-related tables. Media files use presigned URLs with 15-minute expiry. Users can delete their media reports via the unsubscribe flow.

---

*HH-LEWS Phased Task Plan — Compiled from Improvement Specs v1.0–v2.0*
