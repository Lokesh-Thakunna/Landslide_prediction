# HH-LEWS — Improvement Spec: Location Mapping with Safe Route and Evacuation Path
## Real-Time Navigation from Person's Location to Safety

**Version:** 1.0 | **Type:** Feature Improvement Specification  
**Scope:** Citizen PWA + Node.js API + PostGIS spatial queries  
**Priority:** Critical — directly answers "where do I go?" for citizens during emergencies

---

## 1. Problem This Solves

The current system tells a citizen their zone is HIGH or CRITICAL risk. It shows them a safe shelter name and a text description like "मुख्य सड़क से दाएं मुड़ें, मंदिर के पास वाले रास्ते से ऊपर जाएं." This is the best possible guidance when there is no GPS.

But most users in 2025 have Android phones with GPS. A text description is insufficient when we can give them a live map that:

- Shows their exact current location as a moving blue dot
- Shows the danger zone as a red polygon
- Draws a green route line to the nearest safe shelter
- Updates the route as they move
- Warns them if they are walking toward the danger area instead of away from it
- Works offline using pre-cached map tiles

This feature is the single biggest improvement to citizen safety.

---

## 2. Three-Layer Approach

The system provides evacuation routing at three levels of connectivity:

| Connectivity | What citizen gets |
|-------------|------------------|
| Full internet | Live Google Directions route, turn-by-turn, road conditions, ETA |
| Partial / slow internet | Pre-cached Leaflet map tiles + API-computed route (no traffic data) |
| Fully offline | Pre-downloaded map tiles + straight-line bearing to safe zone + landmark text |

No matter the connectivity, the citizen always gets actionable guidance.

---

## 3. Core Data Model Changes

### 3.1 Add Elevation to Safe Zones

During a landslide, direction matters. Moving uphill is safer than moving downhill into a valley. The system must know the elevation of each safe zone to warn citizens who are already at higher elevation than the shelter.

```sql
ALTER TABLE safe_zones
  ADD COLUMN elevation_m     FLOAT,
  ADD COLUMN approach_bearing FLOAT,
  -- Recommended compass bearing to approach (0-360°). Avoids coming from downslope.
  ADD COLUMN approach_note_hi TEXT;
  -- E.g.: "ऊपर की ओर से आएं — नीचे से मत आएं" (Approach from above, not from below)
```

### 3.2 New Table — `evacuation_paths`

Pre-computed, verified evacuation paths for each zone. These are authored by DDMO officials who know the terrain, not auto-generated. They represent the ground-truth safe routes.

```sql
CREATE TABLE evacuation_paths (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id          UUID REFERENCES zones(id),
  safe_zone_id     UUID REFERENCES safe_zones(id),
  path_geometry    GEOMETRY(LINESTRING, 4326),  -- The verified path
  path_type        VARCHAR(30),
  -- 'primary' | 'alternate' | 'emergency_only'
  distance_km      FLOAT,
  walk_time_min    INTEGER,
  description_hi   TEXT,  -- Human-authored description in Hindi
  description_en   TEXT,
  is_uphill        BOOLEAN,         -- True if path moves to higher ground
  avoids_streams   BOOLEAN,         -- True if path avoids stream crossings
  hazard_notes_hi  TEXT,            -- Known hazards along this path
  verified_by      UUID REFERENCES users(id),  -- DDMO who verified this path
  verified_at      TIMESTAMPTZ,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_evac_paths_zone ON evacuation_paths (zone_id, path_type);
CREATE INDEX idx_evac_paths_geom ON evacuation_paths USING GIST (path_geometry);
```

### 3.3 New Table — `danger_zones`

When a landslide is actively occurring or confirmed, specific dangerous areas within a zone need to be marked. These are distinct from the general risk zone polygon.

```sql
CREATE TABLE danger_zones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id         UUID REFERENCES zones(id),
  geometry        GEOMETRY(POLYGON, 4326),
  danger_type     VARCHAR(50),
  -- 'active_debris_flow' | 'blocked_road' | 'collapsed_slope' | 'flood_zone'
  source          VARCHAR(30),
  -- 'ml_prediction' | 'media_report' | 'ddmo_manual' | 'google_incident'
  source_id       UUID,  -- media_report.id or alert_event.id
  description_hi  TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  activated_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_danger_zones_geom ON danger_zones USING GIST (geometry);
```

---

## 4. Location-Aware API Endpoints

### 4.1 `GET /api/location/status`

The primary endpoint the Citizen PWA calls. Given the citizen's current GPS coordinates, returns their risk status, nearest danger, and best evacuation route — in one call.

**Query params:** `?lat=30.5568&lon=79.5643&lang=hi`

**Response:**

```json
{
  "user_location": {
    "lat": 30.5568,
    "lon": 79.5643,
    "zone_id": "uuid",
    "zone_name": "Joshimath Slope Zone",
    "district": "Chamoli"
  },
  "risk": {
    "level": "HIGH",
    "score": 0.73,
    "in_danger_zone": false,
    "nearest_danger_m": 450,
    "nearest_danger_type": "active_debris_flow",
    "nearest_danger_bearing": 47
  },
  "evacuation": {
    "recommended_safe_zone": {
      "id": "uuid",
      "name": "ग्राम पंचायत भवन",
      "lat": 30.5571,
      "lon": 79.5651,
      "elevation_m": 1960,
      "capacity": 250,
      "distance_km": 1.2,
      "bearing": 285
    },
    "route_available": true,
    "route": {
      "type": "verified_path",
      "distance_km": 1.2,
      "walk_time_min": 18,
      "is_uphill": true,
      "polyline": "encoded_polyline_string",
      "steps": [
        {
          "instruction_hi": "मुख्य सड़क पर पश्चिम की ओर चलें",
          "instruction_en": "Walk west on Main Road",
          "distance_m": 320,
          "bearing_degrees": 280,
          "road_status": "open"
        },
        {
          "instruction_hi": "मंदिर के पास बाएं मुड़ें और ऊपर जाएं",
          "instruction_en": "Turn left at the temple and go uphill",
          "distance_m": 880,
          "bearing_degrees": 245,
          "road_status": "open"
        }
      ],
      "hazard_warnings_hi": "रास्ते में एक छोटी नाली है — सावधानी से पार करें।",
      "blocked_roads_avoided": []
    },
    "offline_fallback": {
      "bearing_degrees": 285,
      "bearing_label_hi": "पश्चिम-उत्तर-पश्चिम",
      "distance_km": 1.2,
      "landmark_hi": "बाजार से 200 मीटर उत्तर, पंचायत भवन"
    }
  },
  "warnings": [
    {
      "type": "moving_toward_danger",
      "message_hi": "आप खतरे की ओर बढ़ रहे हैं। पश्चिम की ओर मुड़ें।",
      "show_if_bearing_between": [20, 90]
    }
  ]
}
```

---

### 4.2 `GET /api/location/nearby-safe-zones`

Returns all safe zones within a given radius, sorted by walking time, with route summary for each.

**Query params:** `?lat=30.5568&lon=79.5643&radius_km=5`

```json
{
  "safe_zones": [
    {
      "id": "uuid",
      "name": "ग्राम पंचायत भवन",
      "distance_km": 1.2,
      "walk_time_min": 18,
      "elevation_m": 1960,
      "is_uphill_from_user": true,
      "capacity": 250,
      "road_status": "open",
      "route_summary": "Main road → temple left → uphill path"
    },
    {
      "id": "uuid",
      "name": "Government Primary School",
      "distance_km": 2.4,
      "walk_time_min": 35,
      "elevation_m": 1985,
      "is_uphill_from_user": true,
      "capacity": 400,
      "road_status": "open",
      "route_summary": "NH-58 north → school road right"
    }
  ]
}
```

---

### 4.3 `POST /api/dashboard/evacuation-paths` (JWT — DDMO+)

Allows a DDMO to create or update a verified evacuation path for a zone. This is a critical administrative function — the quality of evacuation routing depends on officials entering accurate path data.

**Request:**
```json
{
  "zone_id": "uuid",
  "safe_zone_id": "uuid",
  "path_geojson": {
    "type": "LineString",
    "coordinates": [[79.5643, 30.5568], [79.5650, 30.5570], [79.5651, 30.5571]]
  },
  "path_type": "primary",
  "description_hi": "मुख्य सड़क से पंचायत भवन तक ऊपर की ओर रास्ता",
  "description_en": "Uphill path via Main Road to Panchayat Bhawan",
  "is_uphill": true,
  "avoids_streams": true,
  "hazard_notes_hi": "रास्ते में एक छोटी नाली है — सावधानी से पार करें",
  "walk_time_min": 18
}
```

---

## 5. Bearing and Direction Logic

When a citizen is offline and cannot receive a map, the system falls back to bearing-based guidance. This is a compass direction expressed in both degrees and a local-language cardinal direction.

```python
# services/api/utils/bearing.py

import math

def compute_bearing(from_lat: float, from_lon: float, to_lat: float, to_lon: float) -> float:
    """
    Computes initial compass bearing (0-360°) from origin to destination.
    0° = North, 90° = East, 180° = South, 270° = West.
    """
    lat1 = math.radians(from_lat)
    lat2 = math.radians(to_lat)
    delta_lon = math.radians(to_lon - from_lon)

    x = math.sin(delta_lon) * math.cos(lat2)
    y = (math.cos(lat1) * math.sin(lat2)
         - math.sin(lat1) * math.cos(lat2) * math.cos(delta_lon))

    bearing = math.degrees(math.atan2(x, y))
    return (bearing + 360) % 360


BEARING_LABELS = {
    'hi': {
        (337.5, 360):  'उत्तर',
        (0,   22.5):   'उत्तर',
        (22.5,  67.5): 'उत्तर-पूर्व',
        (67.5, 112.5): 'पूर्व',
        (112.5,157.5): 'दक्षिण-पूर्व',
        (157.5,202.5): 'दक्षिण',
        (202.5,247.5): 'दक्षिण-पश्चिम',
        (247.5,292.5): 'पश्चिम',
        (292.5,337.5): 'उत्तर-पश्चिम',
    },
    'hi-x-garhwali': {
        (337.5, 360):  'उत्तर',
        (0,   22.5):   'उत्तर',
        (22.5,  67.5): 'उत्तर-पूरब',
        (67.5, 112.5): 'पूरब',
        (112.5,157.5): 'दक्खिन-पूरब',
        (157.5,202.5): 'दक्खिन',
        (202.5,247.5): 'दक्खिन-पच्छिम',
        (247.5,292.5): 'पच्छिम',
        (292.5,337.5): 'उत्तर-पच्छिम',
    }
}

def bearing_to_label(bearing: float, language: str = 'hi') -> str:
    labels = BEARING_LABELS.get(language, BEARING_LABELS['hi'])
    for (lo, hi), label in labels.items():
        if lo <= bearing < hi:
            return label
    return BEARING_LABELS[language][(337.5, 360)]


def is_moving_toward_danger(user_bearing: float, danger_bearing: float, threshold: float = 45) -> bool:
    """
    Returns True if the user is heading within `threshold` degrees of the danger zone.
    Used to trigger the "you are moving toward danger" warning.
    """
    diff = abs(user_bearing - danger_bearing) % 360
    return diff < threshold or diff > (360 - threshold)
```

---

## 6. Citizen PWA — Location Screen Design

### 6.1 Main Map Screen (HIGH / CRITICAL State)

```
┌────────────────────────────────────────┐
│                                        │
│     [MAP — Leaflet.js or Google Maps]  │
│                                        │
│  🔴 Danger zone polygon (red/pulsing)  │
│  🔵 Your location (blue dot, moving)   │
│  🟢 Safe zone (green marker)           │
│  ═══ Evacuation route (green line)     │
│                                        │
│  [Center on me]    [Full screen]       │
│                                        │
├────────────────────────────────────────┤
│  ↗ सुरक्षित स्थान: 1.2 km · 18 मिनट  │
│  ग्राम पंचायत भवन                     │
│                                        │
│  [नेविगेशन शुरू करें / Start Route]   │
└────────────────────────────────────────┘
```

### 6.2 Turn-by-Turn Navigation Screen

Activated when citizen taps "Start Route":

```
┌────────────────────────────────────────┐
│  ↱ मंदिर के पास बाएं मुड़ें            │
│     Turn left at the temple            │
│                                        │
│  880 मीटर आगे · 11 मिनट बचे          │
├────────────────────────────────────────┤
│  [MINI MAP showing route + position]   │
├────────────────────────────────────────┤
│  ▼ अगला: ऊपर की ओर जाएं (450 m)      │
└────────────────────────────────────────┘
```

### 6.3 Warning Banner — Moving Toward Danger

If the system detects the citizen is walking toward the danger zone instead of away from it:

```
┌────────────────────────────────────────┐
│ ⚠️ आप खतरे की ओर जा रहे हैं!          │
│    You are moving toward danger!       │
│                                        │
│    पश्चिम की ओर मुड़ें               │
│    Turn WEST                           │
│                                        │
│    [मेरा रास्ता दिखाएं / Show Route]  │
└────────────────────────────────────────┘
```

This warning fires when `is_moving_toward_danger(user_heading, danger_bearing)` returns `True`. It uses the device's compass (`deviceorientation` API) to get the user's current heading.

### 6.4 Offline Navigation Screen

When offline, the system cannot compute a dynamic route. It falls back to:

```
┌────────────────────────────────────────┐
│  📴 ऑफलाइन मोड                        │
│                                        │
│     [COMPASS ARROW pointing NW]        │
│     ↖ उत्तर-पश्चिम                    │
│                                        │
│  ग्राम पंचायत भवन                     │
│  1.2 km दूर                           │
│                                        │
│  बाजार से 200 मीटर उत्तर,             │
│  पंचायत भवन की ओर जाएं।              │
│  (Go 200m north from the market,       │
│   towards the Panchayat Bhawan.)       │
│                                        │
│  📞 SDRF: 1070                         │
└────────────────────────────────────────┘
```

The compass arrow is computed from bearing using the device's magnetometer (`deviceorientation` event). No internet required.

---

## 7. Offline Map Pre-Caching Strategy

For the offline map to work during a disaster (when connectivity is most likely to fail), tiles for the user's district must be pre-cached when the user first opens the PWA.

```javascript
// apps/citizen-pwa/src/service-worker.js

const TILE_CACHE = 'hhlews-map-tiles-v1';
const CACHE_ZOOM_LEVELS = [10, 11, 12, 13];  // District to village level

// On install: cache tiles for Uttarakhand bounding box
const UTTARAKHAND_BBOX = {
  north: 31.5, south: 28.7,
  east: 81.1,  west: 77.5
};

async function preCacheMapTiles(district_bbox) {
  const cache = await caches.open(TILE_CACHE);

  for (const zoom of CACHE_ZOOM_LEVELS) {
    const tiles = getTilesForBbox(district_bbox, zoom);
    const tileUrls = tiles.map(([x, y]) =>
      `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`
    );

    // Cache in batches of 20 to avoid overwhelming storage
    for (const batch of chunk(tileUrls, 20)) {
      await Promise.all(batch.map(url =>
        fetch(url).then(r => cache.put(url, r)).catch(() => {})
      ));
    }
  }
}

// Pre-cache user's district tiles on first load
self.addEventListener('activate', () => {
  const userDistrict = self.registration.scope + 'district-bbox';
  preCacheMapTiles(UTTARAKHAND_BBOX);  // Cache full Uttarakhand by default
});
```

**Storage estimate per district:** ~15MB at zoom levels 10–13. Full Uttarakhand: ~80MB. This is within mobile browser storage limits.

---

## 8. Real-Time Location Tracking (Opt-in)

For users who grant persistent location permission, the PWA can track movement and provide continuous guidance during evacuation.

```javascript
// apps/citizen-pwa/src/hooks/useEvacuationTracker.js

export function useEvacuationTracker(zone_id, safe_zone_id) {
  const [position, setPosition] = useState(null);
  const [heading, setHeading] = useState(null);
  const [warning, setWarning] = useState(null);

  useEffect(() => {
    // Continuous GPS tracking (high accuracy)
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      null,
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    // Device compass for "moving toward danger" detection
    window.addEventListener('deviceorientation', (e) => {
      if (e.absolute) setHeading(e.alpha);
    });

    return () => {
      navigator.geolocation.clearWatch(watchId);
      window.removeEventListener('deviceorientation', null);
    };
  }, []);

  // Check if moving toward danger every 10 seconds
  useEffect(() => {
    if (!position || !heading) return;

    const dangerBearing = computeBearing(position.lat, position.lon, danger_zone.lat, danger_zone.lon);

    if (isMovingTowardDanger(heading, dangerBearing)) {
      setWarning({
        type: 'moving_toward_danger',
        safe_bearing: computeBearing(position.lat, position.lon, safe_zone.lat, safe_zone.lon),
        safe_direction: bearingToLabel(safe_bearing, userLanguage)
      });
    } else {
      setWarning(null);
    }
  }, [position, heading]);

  return { position, heading, warning };
}
```

---

## 9. PostGIS Spatial Query — Which Zone Is the User In?

```sql
-- Given a lat/lon point, find which monitoring zone it falls in
SELECT
  z.id AS zone_id,
  z.name AS zone_name,
  z.district_id,
  d.name AS district_name,
  d.helpline_number,
  ST_Distance(
    z.centroid::geography,
    ST_SetSRID(ST_Point(:lon, :lat), 4326)::geography
  ) AS distance_m
FROM zones z
JOIN districts d ON z.district_id = d.id
WHERE ST_Contains(z.geometry, ST_SetSRID(ST_Point(:lon, :lat), 4326))
   OR ST_Distance(
        z.geometry::geography,
        ST_SetSRID(ST_Point(:lon, :lat), 4326)::geography
      ) < 2000  -- Within 2km of zone boundary (accounts for GPS drift)
ORDER BY distance_m
LIMIT 1;
```

```sql
-- Find nearest safe zones to user's location, ordered by walking distance
SELECT
  sz.id,
  sz.name,
  sz.landmark_directions_hi,
  sz.capacity,
  sz.elevation_m,
  ST_Distance(
    sz.location::geography,
    ST_SetSRID(ST_Point(:lon, :lat), 4326)::geography
  ) / 1000 AS distance_km,
  CASE
    WHEN e.elevation_m IS NOT NULL AND :user_elevation IS NOT NULL
    THEN e.elevation_m > :user_elevation
    ELSE NULL
  END AS is_uphill,
  ep.walk_time_min,
  ep.is_uphill AS path_is_uphill,
  ep.description_hi AS path_description
FROM safe_zones sz
LEFT JOIN evacuation_paths ep ON ep.safe_zone_id = sz.id AND ep.path_type = 'primary'
WHERE sz.zone_id = :zone_id
ORDER BY distance_km
LIMIT 3;
```

---

## 10. Implementation Checklist

- [ ] Add `elevation_m`, `approach_bearing`, `approach_note_hi` to `safe_zones` table
- [ ] Create `evacuation_paths` table and PostGIS index
- [ ] Create `danger_zones` table and PostGIS index
- [ ] `GET /api/location/status` endpoint — zone detection + route + warnings
- [ ] `GET /api/location/nearby-safe-zones` endpoint
- [ ] `POST /api/dashboard/evacuation-paths` — DDMO path authoring
- [ ] Bearing computation utilities in Node.js + Python
- [ ] `is_moving_toward_danger` warning logic
- [ ] Citizen PWA: map screen with live blue dot + route polyline (P2)
- [ ] Citizen PWA: turn-by-turn navigation screen (P2)
- [ ] Citizen PWA: "moving toward danger" warning banner (P2)
- [ ] Citizen PWA: offline compass bearing screen (P2)
- [ ] Offline map tile pre-caching strategy (P2)
- [ ] Real-time location tracking hook with device compass (P2)
- [ ] PostGIS spatial query for zone detection by lat/lon (P3)
- [ ] PostGIS nearest safe zone query with elevation comparison (P3)
- [ ] Seed `evacuation_paths` for pilot zones via DDMO input (P1 + P3 data entry)

---

*HH-LEWS Improvement Spec: Location Mapping with Safe Route — v1.0*
