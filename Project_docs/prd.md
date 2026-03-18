# HH-LEWS — Product Requirements Document (PRD)

**Document Version:** 1.0.0  
**Last Updated:** 2025-06-14  
**Status:** Active — Hackathon Release / Production Candidate  
**Owner:** HH-LEWS Core Team  
**Classification:** Internal · Engineering · Strategy

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Target Users](#3-target-users)
4. [Pain Points](#4-pain-points)
5. [Solution Overview](#5-solution-overview)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Success Metrics](#8-success-metrics)
9. [Out of Scope (v1)](#9-out-of-scope-v1)
10. [Future Roadmap](#10-future-roadmap)
11. [Assumptions & Dependencies](#11-assumptions--dependencies)
12. [Approval & Sign-Off](#12-approval--sign-off)

---

## 1. Executive Summary

HH-LEWS (Himalayan Hybrid Landslide Early Warning System) is an AI-powered, multi-channel early warning platform designed for landslide-prone communities across Uttarakhand and broader Himalayan geographies. The system fuses real-time meteorological data, terrain slope analysis derived from SRTM (Shuttle Radar Topography Mission) datasets, and simulated IoT ground sensor inputs to drive a Random Forest / XGBoost machine learning inference engine capable of issuing geo-targeted landslide risk alerts within 15 seconds of a threat threshold breach.

Alerts are delivered across SMS, WhatsApp, IVR voice calls, and a React Progressive Web App — all in Hindi — ensuring last-mile reach for rural populations with minimal smartphone literacy. A React-based official dashboard provides district administrators and NDMA personnel with real-time risk visualization, manual override controls, and historical incident logging.

The system is deployable on AWS or DigitalOcean using Docker containers, optimized for cost efficiency on free-tier infrastructure during pilot operations, and designed to scale to full regional coverage in Phase 2 with live hardware sensor integration.

---

## 2. Problem Statement

### 2.1 Geographic & Climatic Context

Uttarakhand — spanning the Central and Western Himalayas — experiences some of the world's highest landslide densities. The state sits at the intersection of intense monsoon rainfall (June–September), seismically active fault lines, and terrain with slopes frequently exceeding 45°. The Geological Survey of India classifies over 60% of Uttarakhand's land area as landslide-susceptible.

Between 2000 and 2024:
- **Over 4,200 lives** were lost to landslides in Uttarakhand alone.
- The **2013 Kedarnath disaster** claimed 5,700+ lives, partly due to the absence of a real-time warning system.
- Districts including Chamoli, Pithoragarh, Rudraprayag, Uttarkashi, and Tehri Garhwal experience recurring mass movements during every monsoon cycle.
- **NH-58, NH-7**, and key pilgrimage corridors (Char Dham Yatra route) are disrupted annually for weeks.

### 2.2 The Warning Gap

Existing warning infrastructure in the region suffers from three fundamental failures:

**Temporal Gap:** India Meteorological Department (IMD) issues district-level rainfall warnings at 24-hour granularity. Landslides triggered by localized cloudburst events can reach critical velocity within 20–40 minutes of onset. A 24-hour alert horizon is operationally meaningless for evacuation planning.

**Spatial Coarseness:** IMD district warnings cover areas of 2,000–5,000 km². A warning for "Chamoli district" does not help a village in a specific valley determine whether their particular slope is at risk. Hyperlocal terrain analysis is absent from current government systems.

**Communication Failure:** Even when warnings are generated, the dissemination chain — from IMD to state disaster management authority to district collector to block-level officer to village pradhan to resident — involves 5–7 human handoffs. Each step introduces delay, mistranslation, and information loss. Rural residents, particularly women and elderly, may not receive any warning at all.

### 2.3 The Technology Vacuum

There is no publicly accessible, free, AI-integrated, village-level landslide early warning system operational in Uttarakhand as of 2025. Existing research systems (e.g., CSIR-CBRI's prototype tools) are institution-bound, require specialized hardware, and are not deployable at community scale. ISRO's Bhuvan platform provides susceptibility maps but not real-time risk scoring.

HH-LEWS is designed to fill this operational vacuum.

---

## 3. Target Users

### 3.1 Primary Users

#### P1 — Vulnerable Rural Residents
- **Profile:** Residents of villages in high-susceptibility zones along river valleys and hillsides; predominantly agricultural communities, pilgrims, seasonal workers.
- **Tech Literacy:** Low to medium. Feature phones common. Smartphones (Android, entry-level) increasingly present.
- **Language:** Hindi (primary), Garhwali/Kumaoni dialects (secondary).
- **Key Need:** Receive an urgent, unambiguous alert with actionable instructions in their language, via a channel they already use (WhatsApp, SMS, phone call), with zero prior app installation required.

#### P2 — District Disaster Management Officers (DDMOs)
- **Profile:** Government officials at district or block level responsible for coordinating evacuation, SDRF deployment, and communication with higher authorities.
- **Tech Literacy:** Medium to high. Desktop/laptop access likely in office; smartphone in field.
- **Key Need:** Unified view of all active risk zones in their jurisdiction; ability to manually escalate or dismiss alerts; audit trail for accountability.

#### P3 — NDMA / State SDMA Officials
- **Profile:** National Disaster Management Authority and State Disaster Management Authority analysts and decision-makers.
- **Key Need:** Aggregated risk dashboards, historical event data, system health monitoring, policy-relevant reporting.

### 3.2 Secondary Users

#### S1 — Village Pradhans (Elected Village Heads)
- First responders in rural communities. Need simple, pre-formatted broadcast capability to relay alerts to community groups.

#### S2 — Highway & Infrastructure Operators
- NHIDCL, PWD road maintenance teams monitoring road corridors for slope failures.

#### S3 — Tourism & Pilgrimage Management Bodies
- Char Dham Devasthanam Board, GMVN, requiring early warning integration into pilgrim safety protocols.

---

## 4. Pain Points

| ID | User | Pain Point | Severity |
|----|------|------------|----------|
| PP-01 | Rural Resident | No warning received before landslide | Critical |
| PP-02 | Rural Resident | Warnings in English or technical language not understood | High |
| PP-03 | Rural Resident | Must install app or have internet to receive alerts | High |
| PP-04 | DDMO | No single dashboard for multi-zone risk monitoring | High |
| PP-05 | DDMO | Alert verification requires calling multiple sources | Medium |
| PP-06 | DDMO | No audit trail for alert issuance decisions | Medium |
| PP-07 | NDMA | No real-time data on hyperlocal risk levels | High |
| PP-08 | NDMA | Historical landslide data not correlated with ML predictions | Medium |
| PP-09 | System | Dependency on single weather API (single point of failure) | High |
| PP-10 | System | IoT sensor data unavailable in remote areas (coverage gap) | High |
| PP-11 | Resident | Cannot access PWA in areas with poor connectivity | Medium |
| PP-12 | DDMO | Manual SMS broadcast is slow and error-prone | High |

---

## 5. Solution Overview

HH-LEWS operates as a five-layer system:

```
[Data Ingestion] → [Risk Computation] → [Alert Decision] → [Alert Delivery] → [Dashboard Visualization]
```

### Layer 1: Data Ingestion
- **OpenWeatherMap / IMD API** provides rainfall intensity, humidity, pressure (real-time, per-coordinate).
- **SRTM DEM data** (pre-processed) provides static slope angle, aspect, and curvature per grid cell (~30m resolution).
- **Simulated IoT sensors** (Phase 1) / physical piezometers and tilt sensors (Phase 2) provide soil saturation and vibration data.
- All data ingested via Celery task queue into PostgreSQL/PostGIS spatial database.

### Layer 2: Risk Computation
- FastAPI ML microservice hosts a trained Random Forest + XGBoost ensemble.
- Model inputs: rainfall intensity (mm/hr), cumulative 72-hour rainfall, slope angle, aspect, soil type, sensor readings (saturation, vibration), historical landslide proximity.
- Model output: risk score (0.0–1.0) with class label (LOW / MODERATE / HIGH / CRITICAL).
- Inference triggered on a 5-minute polling cycle and on threshold-breach events.

### Layer 3: Alert Decision
- Rule-based trigger engine applies configurable thresholds (defaults: HIGH ≥ 0.65, CRITICAL ≥ 0.85).
- Rate limiting prevents alert fatigue (minimum 30-minute re-alert interval per zone).
- Manual override available to district officials.

### Layer 4: Alert Delivery
- **SMS** via Twilio/MSG91 to registered residents in affected grid cell.
- **WhatsApp** via WhatsApp Business API — formatted message with risk level, safe zone directions.
- **IVR voice call** via IVR API for non-literate/elderly population.
- All messages composed in Hindi with dynamic placeholders (village name, risk level, safe zone).

### Layer 5: Dashboard
- React PWA for citizens: simple risk indicator, safe zone map, emergency contact.
- React web dashboard for officials: Leaflet.js risk heat map, alert history, sensor status, manual controls.

---

## 6. Functional Requirements

### 6.1 Data Ingestion

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | System shall poll rainfall data from OpenWeatherMap API at configurable intervals (default: 5 minutes) for each registered monitoring grid cell. | Must Have |
| FR-02 | System shall support fallback to a secondary weather API (IMD API or Open-Meteo) if primary API returns error or rate-limit response. | Must Have |
| FR-03 | System shall store SRTM slope, aspect, and curvature data in PostGIS as static spatial reference layers, indexed by grid cell UUID. | Must Have |
| FR-04 | System shall accept simulated IoT sensor payloads via MQTT broker (HiveMQ or Mosquitto) with schema: `{sensor_id, timestamp, soil_saturation_pct, vibration_mps2, battery_pct}`. | Must Have |
| FR-05 | System shall validate all incoming sensor payloads against JSON schema; malformed payloads shall be logged and discarded without crashing the pipeline. | Must Have |
| FR-06 | System shall retain raw sensor and weather data for a rolling 90-day window for ML retraining and audit. | Should Have |

### 6.2 ML Risk Engine

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-07 | System shall compute a risk score (float, 0.0–1.0) for each active monitoring zone on each inference cycle. | Must Have |
| FR-08 | System shall classify risk into four discrete levels: LOW (0–0.39), MODERATE (0.40–0.64), HIGH (0.65–0.84), CRITICAL (0.85–1.0). | Must Have |
| FR-09 | FastAPI ML service shall expose a `/predict` endpoint accepting a feature vector and returning `{risk_score, risk_level, confidence, model_version}`. | Must Have |
| FR-10 | System shall support hot-swapping of ML models without service restart via model versioning in the model registry. | Should Have |
| FR-11 | System shall log all predictions with input features, output scores, model version, and timestamp to the predictions audit table. | Must Have |
| FR-12 | ML service shall expose a `/health` endpoint for uptime monitoring. | Must Have |
| FR-13 | System shall generate a batch re-training job trigger when 500+ new labeled events accumulate in the training queue. | Could Have |

### 6.3 Alert Engine

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-14 | System shall trigger an alert when any monitoring zone's risk score crosses the HIGH threshold (default: 0.65) on two consecutive inference cycles. | Must Have |
| FR-15 | System shall send alerts via SMS to all registered phone numbers in the affected zone's subscriber list. | Must Have |
| FR-16 | System shall send alerts via WhatsApp Business API to opted-in subscribers. | Must Have |
| FR-17 | System shall initiate IVR voice calls for subscribers flagged as `literacy_support=true`. | Should Have |
| FR-18 | All alert messages shall be composed in Hindi. Message templates shall be stored in the database and configurable by administrators. | Must Have |
| FR-19 | System shall enforce a minimum 30-minute re-alert cooldown per zone to prevent alert fatigue, unless risk class escalates (e.g., HIGH → CRITICAL). | Must Have |
| FR-20 | System shall log every alert dispatch with timestamp, channel, recipient count, delivery status, and triggering risk score. | Must Have |
| FR-21 | District officials shall be able to manually trigger or suppress an alert for any zone in their jurisdiction from the official dashboard. | Must Have |
| FR-22 | System shall send a "risk resolved" notification when a zone's score drops below LOW threshold after a HIGH/CRITICAL event. | Should Have |

### 6.4 Citizen PWA

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-23 | Citizen PWA shall display current risk level for the user's detected or selected location using a three-color indicator (green/yellow/red). | Must Have |
| FR-24 | PWA shall function as a Progressive Web App, installable on Android home screen without app store. | Must Have |
| FR-25 | PWA shall display nearest safe zone with walking directions when risk is HIGH or CRITICAL. | Must Have |
| FR-26 | PWA shall work in offline mode, serving the last-cached risk data and safe zone map, with a prominent "last updated" timestamp. | Must Have |
| FR-27 | PWA shall support Hindi as primary language with English toggle. | Must Have |
| FR-28 | PWA shall display emergency contact numbers (SDRF, local hospital, district helpline) on all risk level screens. | Must Have |

### 6.5 Official Dashboard

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-29 | Dashboard shall display a Leaflet.js map with all monitoring zones color-coded by current risk level. | Must Have |
| FR-30 | Dashboard shall display real-time sensor status (online/offline/battery) per zone. | Must Have |
| FR-31 | Dashboard shall display alert history with filtering by zone, date range, and risk level. | Must Have |
| FR-32 | Dashboard shall require JWT-authenticated login for official access. | Must Have |
| FR-33 | Dashboard shall support role-based access: ADMIN (full), DISTRICT_OFFICIAL (zone-scoped), VIEWER (read-only). | Must Have |
| FR-34 | Dashboard shall provide manual alert broadcast form: select zone, compose message (with Hindi template), select channels, confirm. | Must Have |
| FR-35 | Dashboard shall display ML model prediction confidence and feature importance for each active alert. | Should Have |

### 6.6 Administration

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-36 | Admin interface shall allow registration of new monitoring zones with coordinates, slope data reference, and subscriber lists. | Must Have |
| FR-37 | Admin interface shall support bulk import of subscriber phone numbers via CSV. | Must Have |
| FR-38 | Admin interface shall expose system health metrics: API uptime, ML inference latency, alert delivery rates. | Must Have |
| FR-39 | System shall provide Swagger UI documentation for all API endpoints. | Must Have |

---

## 7. Non-Functional Requirements

### 7.1 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-01 | Alert trigger-to-first-SMS latency | ≤ 15 seconds (p95) |
| NFR-02 | ML inference latency per zone | ≤ 500 ms (p99) |
| NFR-03 | Weather API polling cycle | ≤ 5 minutes |
| NFR-04 | Dashboard map load time (4G) | ≤ 3 seconds |
| NFR-05 | PWA offline cache TTL | 24 hours minimum |
| NFR-06 | Bulk SMS dispatch (1,000 recipients) | ≤ 60 seconds |

### 7.2 Availability & Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-07 | System uptime (monsoon season, critical period) | ≥ 99.5% |
| NFR-08 | ML service uptime | ≥ 99.9% |
| NFR-09 | Alert delivery success rate (SMS) | ≥ 97% |
| NFR-10 | Failover to backup weather API | ≤ 30 seconds detection + switch |
| NFR-11 | Database backup frequency | Every 6 hours |

### 7.3 Scalability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-12 | Monitoring zones supported (v1) | Up to 500 zones |
| NFR-13 | Registered subscribers | Up to 100,000 |
| NFR-14 | Concurrent dashboard users | Up to 500 |
| NFR-15 | ML inference throughput | ≥ 100 predictions/minute |

### 7.4 Security

| ID | Requirement |
|----|-------------|
| NFR-16 | All API endpoints protected by JWT (official) or API key (service-to-service). |
| NFR-17 | Phone numbers stored encrypted at rest (AES-256). |
| NFR-18 | HTTPS/TLS enforced on all endpoints. |
| NFR-19 | Rate limiting: 100 req/min per IP on public endpoints. |
| NFR-20 | Environment variables for all secrets; no secrets in source code or Docker images. |

### 7.5 Accessibility & Localization

| ID | Requirement |
|----|-------------|
| NFR-21 | Citizen PWA fully functional in Hindi. |
| NFR-22 | Alert messages composed and delivered in Hindi. |
| NFR-23 | PWA meets WCAG 2.1 AA for color contrast and font sizing. |
| NFR-24 | IVR message available in Hindi audio. |

---

## 8. Success Metrics

### 8.1 Technical KPIs

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Alert latency (trigger → SMS) | < 15 seconds (p95) | Celery task timestamps vs. Twilio delivery receipt |
| ML inference accuracy | > 85% precision on HIGH/CRITICAL classes | Cross-validation on historical dataset |
| System uptime (monsoon) | > 99.5% | UptimeRobot / AWS CloudWatch |
| SMS delivery rate | > 97% | Twilio delivery status callback |
| False positive rate | < 10% (HIGH/CRITICAL alerts) | Manual review of alert-event correlation |
| PWA offline functionality | 100% of last-cached data accessible | Manual QA + Lighthouse audit |

### 8.2 Operational KPIs (Post-Pilot)

| Metric | Target |
|--------|--------|
| Villages covered in pilot phase | 50 |
| Registered subscribers | 10,000 |
| Average evacuation time improvement | 30% vs. no-system baseline |
| DDMO dashboard daily active use | > 80% of enrolled officials |
| Community awareness of system | > 70% surveyed village residents |

### 8.3 Business / Impact KPIs

| Metric | Definition |
|--------|------------|
| Alerts issued per season | Tracked; target: all genuine events covered |
| False alarm rate | < 10% of total HIGH+ alerts |
| Zero missed CRITICAL events | 100% recall on CRITICAL-class events |
| Cost per alert | < ₹0.50 per SMS recipient (Twilio/MSG91 bulk) |

---

## 9. Out of Scope (v1)

- Physical IoT sensor hardware procurement, installation, and maintenance.
- Seismic (earthquake) trigger integration.
- Flash flood early warning (separate hazard model required).
- Satellite imagery change detection (Phase 2).
- Integration with NDMA's IDRN (India Disaster Resource Network) API.
- Multi-language support beyond Hindi and English.
- Native Android/iOS app (PWA covers mobile use case in v1).
- Automated evacuation route optimization engine.

---

## 10. Future Roadmap

### Phase 2 — Real Sensor Integration (Q3 2025 – Q2 2026)

- Deploy physical piezometers, tilt sensors, and rain gauges at 50 pilot sites in Chamoli and Uttarkashi districts.
- Replace simulated sensor data with live MQTT streams from physical hardware.
- Integrate ISRO Bhuvan satellite imagery API for surface deformation monitoring.
- Add seismic sensor data ingestion (USGS/IMD seismograph network).
- Expand ML model to incorporate NDVI (vegetation index) and geological lithology features.

### Phase 3 — Scale & Integration (Q3 2026+)

- Cover all 13 Uttarakhand districts (500+ monitoring zones).
- NDMA IDRN API integration for national-level data sharing.
- Automated resource mobilization: trigger SDRF alert, hospital pre-positioning recommendation.
- Satellite-based connectivity fallback (Starlink/BSNL satellite) for remote zones with no cellular coverage.
- Federated ML: allow neighboring states (Himachal Pradesh, J&K) to share training data and benefit from model improvements.
- AI-generated risk narrative reports in Hindi for DDMO briefing packets.

### Phase 4 — Research & Institutionalization

- Academic collaboration with IIT Roorkee, Wadia Institute of Himalayan Geology for model validation.
- Integration into Uttarakhand State Emergency Operations Centre (SEOC) primary workflow.
- Open-source SDK for other Himalayan nations (Nepal, Bhutan) to adapt the platform.

---

## 11. Assumptions & Dependencies

| Type | Item |
|------|------|
| Assumption | OpenWeatherMap API provides reliable data for Uttarakhand coordinates at required granularity. |
| Assumption | SRTM 30m DEM data is sufficient for slope-based risk modeling in Phase 1. |
| Assumption | Twilio/MSG91 provides adequate SMS gateway coverage across Uttarakhand telecom circles. |
| Assumption | WhatsApp Business API approval obtained before production deployment. |
| Dependency | Valid OpenWeatherMap API key (free tier: 1,000 calls/day; paid: 1M calls/month). |
| Dependency | Twilio account with verified India sender ID and DLT registration. |
| Dependency | AWS/DigitalOcean account for container hosting. |
| Dependency | SRTM data downloaded and pre-processed into PostGIS layers. |
| Risk | TRAI DLT (Distributed Ledger Technology) compliance for transactional/alert SMS in India — requires pre-registration of message templates. |
| Risk | WhatsApp Business API approval timeline (2–4 weeks). |

---

## 12. Approval & Sign-Off

| Role | Name | Status |
|------|------|--------|
| Product Lead | — | Pending |
| Engineering Lead | — | Pending |
| ML Lead | — | Pending |
| UX Lead | — | Pending |
| Security Review | — | Pending |

---

*Document controlled by HH-LEWS Product Team. Changes require PR review and version increment.*
