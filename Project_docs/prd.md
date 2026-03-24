# BHURAKSHAN Product Requirements Document

## 1. Executive Summary

BHURAKSHAN is a hybrid landslide early warning system for high-risk Himalayan zones. It combines real-time rainfall, static terrain information, historical landslide frequency, and proxy risk signals to predict current and near-future danger, then converts those predictions into alerts and evacuation guidance.

## 2. Problem Statement

### 2.1 Warning gap

Existing warning systems often fail because:

- satellite refresh is too slow for tactical action
- hazard maps are not updated dynamically enough
- alerting is disconnected from evacuation decision support

### 2.2 User impact

Residents and district officials need:

- simple risk language
- faster situational awareness
- trusted route and shelter guidance
- a view of what may happen in the next one to two hours

## 3. Target Users

### Primary

- residents in monitored landslide-prone zones
- district disaster management operators
- state and regional monitoring teams

### Secondary

- local responders
- road and infrastructure operators
- community coordinators and shelter managers

## 4. Product Goals

- show `SAFE`, `WATCH`, and `DANGER` clearly
- predict current risk and short-horizon future risk
- provide route and shelter context when danger rises
- keep the v1 system deployable without physical sensor hardware

## 5. Solution Overview

### Layer 1: Data

- rainfall from weather APIs
- slope and zone geometry from DEM and GIS data
- historical landslide frequency per zone

### Layer 2: Proxy generation

- soil moisture proxy from rainfall windows
- movement proxy from slope, wetness, and hazard history

### Layer 3: ML scoring

- Random Forest model
- outputs `0-100`
- supports current, `+1h`, and `+2h`

### Layer 4: Action

- dashboard and citizen interface update
- alerts go out by SMS and WhatsApp
- shelter and route guidance is attached to danger events

## 6. Functional Requirements

### 6.1 Data ingestion

- ingest rainfall every five minutes
- support provider fallback when the primary weather API fails
- persist rainfall and mark stale values when needed

### 6.2 Risk engine

- compute proxy soil moisture
- compute proxy movement signal for explanation
- score every active zone at three horizons

### 6.3 Alerts

- auto-trigger on danger
- allow manual operator trigger
- log channel, recipients, and delivery state

### 6.4 Citizen experience

- mobile-first risk screen
- forecast cards
- shelter and evacuation route guidance
- emergency contact access

### 6.5 Official dashboard

- interactive map
- hotspot ranking
- detailed zone panel
- alert dispatch log

## 7. Non-Functional Requirements

- near-real-time updates for pilot scale
- resilient weather fallback
- secure handling of phone numbers
- public read access without exposing secrets
- clear risk explanations for non-expert users

## 8. Success Metrics

### Technical

- rainfall polling success rate
- prediction latency
- alert dispatch success rate
- stale weather percentage

### Operational

- time from danger detection to alert dispatch
- number of operator-visible false positives
- shelter and route attachment rate on alerts

### User-facing

- open rate or engagement on alert links
- successful citizen subscriptions
- clarity of next-step action in testing sessions

## 9. Out Of Scope For v1

- mandatory live ground sensors
- SAR or InSAR operational integration
- IVR as a required delivery path
- native mobile apps

## 10. Future Roadmap

- plug in sensor feeds when available
- add SAR validation layers
- expand route optimization
- add multilingual voice alerts

## 11. Dependencies

- reliable zone boundary and slope data
- weather provider access
- Twilio credentials
- mapped shelters and evacuation routes for pilot zones
