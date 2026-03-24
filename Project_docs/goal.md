# BHURAKSHAN
## Updated Project Goal

## Core Vision

Build a real-time, AI-powered landslide early warning system that predicts landslide risk using rainfall, terrain, and historical risk data, then turns those predictions into alerts and evacuation guidance that people can actually use.

## Problem Statement

Landslide-prone Himalayan regions continue to face avoidable loss because:

- satellite revisits are too slow for operational warning
- monitoring systems are fragmented across data sources
- warnings rarely translate into immediate action
- evacuation support is usually disconnected from prediction

## Updated Solution

BHURAKSHAN is a hybrid warning system built around three data classes:

### 1. Real-Time Data

- rainfall from a weather API

### 2. Static Geo Data

- terrain slope from DEM or GeoJSON-derived features
- high-risk zones based on historical landslide records

### 3. Simulated or Proxy Signals

- soil moisture proxy derived from recent rainfall accumulation
- ground-movement proxy approximated from terrain stress and historical landslide frequency

## Machine Learning Model

- model: `Random Forest`
- input features:
  - rainfall intensity
  - slope in degrees
  - soil moisture proxy
  - historical landslide frequency
- output:
  - risk score from `0` to `100`

## Risk Levels

| Score | Level |
| --- | --- |
| `0-29` | `SAFE` |
| `30-69` | `WATCH` |
| `70-100` | `DANGER` |

## Workflow

1. Fetch rainfall observations and short-horizon forecast data.
2. Merge rainfall with static zone features.
3. Generate proxy soil moisture and movement indicators.
4. Predict current, `+1h`, and `+2h` risk scores.
5. Update the live map and hotspot summaries.
6. Trigger alerts and evacuation guidance for danger zones.

## Alert Strategy

When a zone becomes `DANGER`, the system should:

- send SMS alerts
- send WhatsApp alerts
- provide the recommended evacuation route
- suggest nearby shelters

## Frontend Requirements

- live Leaflet-based map
- color-coded risk zones
- hotspot markers with zone context
- risk and forecast panel
- alert dispatch log
- citizen-facing mobile interface

## Demo Strategy

The demo should focus on realistic simulation rather than unavailable hardware.

- use seeded high-risk zones such as Joshimath
- simulate rising rainfall and moisture proxy values
- show escalation from `SAFE` to `WATCH` to `DANGER`
- demonstrate current and future forecast cards
- demonstrate alert dispatch and shelter guidance

## Future Scope

- live soil and deformation sensors
- SAR or InSAR validation layers
- native mobile apps with GPS-based alerts
- voice-based emergency alerts

## Summary Line

BHURAKSHAN combines real-time rainfall, terrain analysis, and historical landslide patterns to generate dynamic risk predictions and trigger evacuation-ready alerts without depending on delayed satellite passes alone.
