# Phase 1 Danger Zone Overlays Foundation

## What I built

This task adds an explicit danger-zone layer to the HH-LEWS routing system.

The platform now has:

- a shared danger-zone data model with hazard polygons
- seeded active danger zones in backend state
- a new public API to fetch zone danger zones
- location guidance that uses the nearest active danger zone instead of only the zone centroid
- dashboard map overlays for danger polygons in both Google Maps and Leaflet fallback modes
- dashboard zone detail cards for active danger zones
- citizen guidance cards that show the nearest named danger area and its field note

This improves routing realism because the system can now point people away from a specific active hazard area, not just away from the center of a zone.

## Files changed

### 1. `packages/contracts/src/index.ts`

Added the shared danger-zone contract.

New shared pieces:

- `DangerZoneType`
- `DangerZoneSchema`
- richer `LocationStatus.risk` fields for nearest danger zone id, name, type, and note

This keeps the API and frontends aligned on the new hazard-polygon model.

### 2. `services/api/src/data/seed.ts`

Added seeded danger zones for active pilot zones.

Each danger zone now includes:

- id
- zone id
- name
- type
- severity
- source
- note
- updated time
- active flag
- polygon coordinates

### 3. `services/api/src/lib/state-store.ts`

Extended persistent API state to store and load danger zones.

New behavior:

- `getDangerZones(zoneId?)`
- `getNearestDangerZone(zoneId, lat, lon)`
- persisted state compatibility for older runtime state files

The nearest-danger logic now chooses the closest active hazard polygon and computes a bearing from its centroid.

### 4. `services/api/src/routes/public.routes.ts`

Added:

- `GET /api/zones/:zoneId/danger-zones`

Updated:

- `GET /api/location/status`

The location response now includes:

- nearest danger zone id
- nearest danger zone name
- nearest danger type
- nearest danger note

It also adds an `active_danger_zone` warning message when a nearby hazard polygon is active.

### 5. `dashboard/src/types.ts`

Added dashboard-side danger zone types and dashboard snapshot support for:

- `DangerZone`
- `danger_zones`

### 6. `dashboard/src/services/api.ts`

Added dashboard danger-zone fetching and adaptation.

New function:

- `getDangerZones(zoneId)`

This supports both backend mode and local demo/fallback mode.

### 7. `dashboard/src/hooks/useDashboardData.ts`

Extended dashboard state with:

- `selectedDangerZones`

The selected zone panel now loads danger zones alongside forecast, route, road conditions, elevation profile, and media reports.

### 8. `dashboard/src/App.tsx`

Passed the selected danger zones into:

- `RiskMap`
- `ZoneDrawer`

### 9. `dashboard/src/components/RiskMap.tsx`

Added danger-zone polygon overlays to the map.

Behavior:

- Google Maps mode renders active hazard polygons with severity-aware fill colors
- Leaflet fallback also renders the same polygons
- clicking a polygon shows the hazard name, type, severity, and note

### 10. `dashboard/src/components/ZoneDrawer.tsx`

Added an `Active danger zones` section showing:

- zone hazard name
- severity
- hazard type
- update time
- field/operator note

### 11. `dashboard/src/data/mockDashboard.ts`

Added local demo danger-zone fixture data so the dashboard still shows hazard overlays without the API.

### 12. `citizen_app/src/types.ts`

Extended citizen location status typing with nearest-danger-zone metadata:

- `nearest_danger_zone_id`
- `nearest_danger_zone_name`
- `nearest_danger_type`
- `nearest_danger_note`

### 13. `citizen_app/src/services/api.ts`

Updated citizen location-status adapters so the new danger-zone metadata is mapped from backend responses and local fallback data.

### 14. `citizen_app/src/components/LocationGuidanceCard.tsx`

Updated the citizen guidance card to show:

- nearest named danger zone instead of only direction text
- danger direction alongside the named hazard
- the hazard note as a visible warning block

### 15. `citizen_app/src/data/mockCitizen.ts`

Added fallback nearest-danger-zone fields and an `active_danger_zone` warning message for local/demo operation.

## How it works

1. The backend stores active danger zones as polygons for each zone.
2. When the citizen asks for location guidance, the backend finds the nearest active hazard polygon.
3. The system computes:
   - nearest danger distance
   - nearest danger bearing
   - nearest danger zone metadata
4. The citizen app shows the named hazard and its field note.
5. The dashboard shows the same hazard polygons on the live map and in the selected zone detail panel.

## How to run

From the project root:

```powershell
cd "D:\Games\Landslide_prediction-main\Landslide_prediction-main"
npm run build
```

To run the citizen app:

```powershell
cd "D:\Games\Landslide_prediction-main\Landslide_prediction-main\citizen_app"
npm run dev
```

To run the dashboard:

```powershell
cd "D:\Games\Landslide_prediction-main\Landslide_prediction-main\dashboard"
npm run dev
```

## Verification

Verified successfully with:

- `npm run build` from the project root
- `npm run build` inside `citizen_app`
- `npm run build` inside `dashboard`

Dashboard still shows the same existing Leaflet image asset warnings during build, but the build completes successfully.
