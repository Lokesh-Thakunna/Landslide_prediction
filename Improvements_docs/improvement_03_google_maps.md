# HH-LEWS — Improvement Spec: Live Data Integration with Google Maps Platform
## Real-Time Road Status, Traffic, and Terrain via Google Maps APIs

**Version:** 1.0 | **Type:** Feature Improvement Specification  
**Scope:** Backend Celery Workers + Node.js API + Dashboard + Citizen PWA  
**Priority:** Medium-High — enriches risk context with real-world road and conditions data

---

## 1. Why Google Maps vs Current State

The current system uses:
- **OpenStreetMap + Leaflet.js** for map rendering (static tiles)
- **SRTM DEM** for terrain slope (static, pre-processed once)
- **PostGIS zone polygons** for spatial boundaries

This works well for risk visualization but has three gaps:

**Gap 1 — No road condition data.** A zone may be rated HIGH risk but the main road through it may already be closed due to earlier debris. Citizens and officials cannot see this.

**Gap 2 — No live traffic or incident data.** Google Maps has real-time traffic, reported accidents, road closures, and construction that is extremely relevant for evacuation routing.

**Gap 3 — Static safe-zone directions.** The current safe zone feature gives landmark-based text directions. It cannot compute an actual route from a person's current live location.

**Google Maps Platform APIs solve all three gaps.**

---

## 2. Google APIs Used

| API | Purpose | Billing |
|-----|---------|---------|
| **Maps JavaScript API** | Interactive map base layer in Dashboard and PWA | Per load |
| **Directions API** | Compute safe evacuation routes from current location | Per request |
| **Roads API** | Snap GPS tracks to actual roads, identify road segments in zone | Per request |
| **Places API** | Find nearby safe structures (schools, hospitals, temples) dynamically | Per request |
| **Elevation API** | Cross-check elevation profile of evacuation routes (avoid descending into valley) | Per request |

> **Cost note:** Google Maps APIs are metered. For a hackathon / pilot, the $200 monthly free credit from Google is sufficient for all usage. Production at scale requires a billing account.

---

## 3. Architecture Changes

### 3.1 New Celery Task — Road Condition Polling

```python
# services/worker/tasks/road_conditions.py

@celery.task(bind=True, max_retries=2)
def poll_road_conditions(self, zone_id: str):
    """
    Runs every 30 minutes per high-risk zone.
    Uses Google Roads API + Routes API to check key roads within the zone.
    Stores result in Redis and PostgreSQL.
    """
    zone = db.fetch_zone(zone_id)

    # Fetch key road segments within or passing through zone polygon
    roads = db.fetch_roads_in_zone(zone_id)  # Pre-seeded from OpenStreetMap road network

    conditions = []
    for road in roads:
        # Google Roads API: check traffic conditions on this road segment
        condition = google_roads_client.snap_to_roads(
            path=road.sample_coordinates,
            interpolate=True
        )
        conditions.append({
            'road_id': road.id,
            'road_name': road.name,
            'coordinates': condition,
            'fetched_at': datetime.utcnow().isoformat()
        })

    redis.setex(
        f'road_conditions:{zone_id}',
        1800,  # 30-minute TTL
        json.dumps(conditions)
    )

    db.upsert_road_conditions(zone_id, conditions)
```

### 3.2 New Database Table — `road_segments`

```sql
CREATE TABLE road_segments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id         UUID REFERENCES zones(id),
  osm_way_id      BIGINT,                          -- OpenStreetMap way ID
  name            VARCHAR(200),                    -- Road name (e.g., "NH-58")
  road_type       VARCHAR(50),                     -- 'highway', 'state_road', 'village_path'
  geometry        GEOMETRY(LINESTRING, 4326),       -- Road line geometry
  is_evacuation_route BOOLEAN DEFAULT FALSE,       -- Marked as primary evacuation route
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE road_conditions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  road_segment_id UUID REFERENCES road_segments(id),
  zone_id         UUID REFERENCES zones(id),
  status          VARCHAR(30) DEFAULT 'open',
  -- 'open' | 'congested' | 'closed' | 'blocked_debris' | 'flooded' | 'unknown'
  source          VARCHAR(30),
  -- 'google_traffic' | 'google_incident' | 'ddmo_manual' | 'media_report'
  confidence      FLOAT,
  raw_data        JSONB,
  recorded_at     TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ
);

CREATE INDEX idx_road_conditions_zone ON road_conditions (zone_id, recorded_at DESC);
CREATE INDEX idx_road_segments_geom ON road_segments USING GIST (geometry);
```

---

## 4. New API Endpoints

### 4.1 `GET /api/zones/:zone_id/road-conditions`

Returns current road status for all key routes in a zone.

```json
{
  "zone_id": "uuid",
  "zone_name": "Joshimath Slope Zone",
  "roads": [
    {
      "id": "uuid",
      "name": "NH-58 (Badrinath Highway)",
      "road_type": "highway",
      "is_evacuation_route": true,
      "current_status": "open",
      "source": "google_traffic",
      "confidence": 0.91,
      "last_updated": "ISO8601"
    },
    {
      "id": "uuid",
      "name": "Joshimath-Auli Road",
      "road_type": "state_road",
      "is_evacuation_route": false,
      "current_status": "blocked_debris",
      "source": "google_incident",
      "confidence": 0.78,
      "last_updated": "ISO8601"
    }
  ],
  "evacuation_routes_clear": true,
  "last_polled": "ISO8601"
}
```

---

### 4.2 `GET /api/safe-zones/:zone_id/route`

Computes an evacuation route from a citizen's current location to the nearest open safe zone, avoiding roads with `blocked_debris` or `flooded` status.

**Query params:** `?from_lat=30.5568&from_lon=79.5643`

```json
{
  "origin": { "lat": 30.5568, "lon": 79.5643 },
  "destination": {
    "name": "Gram Panchayat Bhawan, Joshimath",
    "lat": 30.5571,
    "lon": 79.5651,
    "capacity": 250
  },
  "route": {
    "distance_km": 1.2,
    "duration_minutes": 18,
    "mode": "walking",
    "polyline": "encoded_polyline_string",
    "steps": [
      {
        "instruction_hi": "मुख्य सड़क पर दाएं मुड़ें",
        "instruction_en": "Turn right on Main Road",
        "distance_m": 320,
        "road_status": "open"
      },
      {
        "instruction_hi": "मंदिर के पास बाएं मुड़ें",
        "instruction_en": "Turn left near the temple",
        "distance_m": 880,
        "road_status": "open"
      }
    ],
    "warnings": [],
    "blocked_roads_avoided": ["Joshimath-Auli Road"]
  },
  "alternate_route": null
}
```

Backend logic:

```python
# services/api/controllers/safe_zones.controller.js

async function getEvacuationRoute(req, res) {
  const { zone_id } = req.params;
  const { from_lat, from_lon } = req.query;

  // 1. Fetch all safe zones for this zone
  const safeZones = await db.fetchSafeZones(zone_id);

  // 2. Fetch current road conditions (from Redis cache)
  const roadConditions = await redis.get(`road_conditions:${zone_id}`);
  const blockedRoads = (roadConditions || [])
    .filter(r => ['blocked_debris', 'flooded', 'closed'].includes(r.current_status))
    .map(r => r.geometry);

  // 3. Try each safe zone, closest first, until we find a routable path
  for (const safeZone of safeZones.sortByDistance(from_lat, from_lon)) {
    const route = await googleMapsClient.directions({
      origin: `${from_lat},${from_lon}`,
      destination: `${safeZone.lat},${safeZone.lon}`,
      mode: 'walking',
      avoid: 'tolls',
      departure_time: 'now',
    });

    if (route.status === 'OK') {
      const steps = translateRouteSteps(route.routes[0].legs[0].steps);
      return res.json({
        origin: { lat: from_lat, lon: from_lon },
        destination: safeZone,
        route: {
          distance_km: route.routes[0].legs[0].distance.value / 1000,
          duration_minutes: Math.ceil(route.routes[0].legs[0].duration.value / 60),
          polyline: route.routes[0].overview_polyline.points,
          steps,
          blocked_roads_avoided: blockedRoads.map(r => r.name),
          warnings: extractWarnings(route),
        }
      });
    }
  }

  // No routable path found — return landmark directions only
  return res.status(503).json({
    message: 'Route computation unavailable. Use landmark directions.',
    fallback_directions: safeZones[0].landmark_directions_hi
  });
}
```

---

### 4.3 `GET /api/zones/:zone_id/elevation-profile`

Returns the elevation profile of the zone to help officials understand terrain context.

```json
{
  "zone_id": "uuid",
  "zone_name": "Joshimath Slope Zone",
  "elevation_profile": {
    "min_elevation_m": 1890,
    "max_elevation_m": 3420,
    "mean_elevation_m": 2156,
    "safe_zones_elevation": [
      { "name": "Gram Panchayat Bhawan", "elevation_m": 1920 },
      { "name": "Primary School", "elevation_m": 1960 }
    ],
    "note": "Safe zones are above mean elevation — evacuation should move uphill"
  }
}
```

---

## 5. Frontend Changes

### 5.1 Dashboard Map — Google Maps JavaScript API

Replace Leaflet.js with Google Maps for the official dashboard to unlock real-time traffic layers, street view, and satellite imagery.

> **Important:** Keep Leaflet.js for the Citizen PWA (offline-capable, lighter). The official dashboard has reliable connectivity and benefits more from Google Maps features.

```javascript
// apps/dashboard/src/components/RiskMap.jsx

import { GoogleMap, LoadScript, Polyline, Polygon, TrafficLayer } from '@react-google-maps/api';

const LIBRARIES = ['geometry', 'places'];

function RiskMap({ zones, roadConditions }) {
  return (
    <LoadScript googleMapsApiKey={process.env.VITE_GOOGLE_MAPS_KEY} libraries={LIBRARIES}>
      <GoogleMap
        zoom={10}
        center={{ lat: 30.42, lng: 79.40 }}  // Chamoli centre
        mapTypeId="hybrid"                    // Satellite + road overlay
      >
        {/* Real-time traffic layer */}
        <TrafficLayer />

        {/* Zone risk polygons */}
        {zones.map(zone => (
          <Polygon
            key={zone.id}
            paths={zone.geojson.coordinates[0].map(([lng, lat]) => ({ lat, lng }))}
            options={{
              fillColor: RISK_COLORS[zone.risk_level],
              fillOpacity: 0.45,
              strokeColor: RISK_COLORS[zone.risk_level],
              strokeWeight: 2,
            }}
            onClick={() => onZoneClick(zone)}
          />
        ))}

        {/* Road condition overlays */}
        {roadConditions.map(road => (
          <Polyline
            key={road.id}
            path={decodePolyline(road.geometry)}
            options={{
              strokeColor: ROAD_STATUS_COLORS[road.current_status],
              strokeWeight: 4,
              strokeOpacity: 0.8,
            }}
          />
        ))}
      </GoogleMap>
    </LoadScript>
  );
}

const ROAD_STATUS_COLORS = {
  open:           '#22c55e',
  congested:      '#f59e0b',
  closed:         '#ef4444',
  blocked_debris: '#7f1d1d',
  flooded:        '#1d4ed8',
  unknown:        '#9ca3af',
};
```

### 5.2 Citizen PWA — Live Route on Safe Zone Screen

The safe zone screen now shows a live computed route instead of static text directions. The map remains Leaflet.js (offline-capable).

```javascript
// apps/citizen-pwa/src/screens/SafeZones.jsx

function SafeZoneScreen({ zone_id }) {
  const [userLocation, setUserLocation] = useState(null);
  const [route, setRoute] = useState(null);

  useEffect(() => {
    // Get live GPS location
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      (err) => {
        // Fallback: use zone centroid as origin
        setUserLocation(zone.centroid);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    if (!userLocation) return;
    // Fetch computed route from our API (not Google directly — keeps API key server-side)
    axios.get(`/api/safe-zones/${zone_id}/route`, {
      params: { from_lat: userLocation.lat, from_lon: userLocation.lon }
    }).then(res => setRoute(res.data.route));
  }, [userLocation]);

  return (
    <div>
      <LeafletMap>
        {/* User location marker */}
        {userLocation && <Marker position={userLocation} icon={userIcon} />}

        {/* Destination marker */}
        <Marker position={safeZone.location} icon={safeZoneIcon} />

        {/* Route polyline (decoded from Google's encoded format) */}
        {route && (
          <Polyline
            positions={decodePolyline(route.polyline)}
            color="#22c55e"
            weight={4}
          />
        )}
      </LeafletMap>

      {/* Step-by-step instructions in user's language */}
      {route?.steps.map((step, i) => (
        <RouteStep key={i} instruction={step.instruction_hi} distance={step.distance_m} status={step.road_status} />
      ))}

      {/* Distance and ETA */}
      <div>{t('route.distance', { km: route?.distance_km })}</div>
      <div>{t('route.eta', { minutes: route?.duration_minutes })}</div>
    </div>
  );
}
```

### 5.3 Offline Fallback

When the route API is unavailable (offline or server error):

1. Show the Leaflet offline map with a straight-line indicator from user position to safe zone.
2. Show the pre-stored `landmark_directions_hi` text below the map.
3. Show the message: "नेटवर्क उपलब्ध नहीं — नीचे दिए गए निर्देशों का पालन करें।"

---

## 6. New Environment Variables

```bash
# Google Maps Platform
GOOGLE_MAPS_API_KEY=                  # Server-side: Directions API, Roads API, Elevation API
VITE_GOOGLE_MAPS_KEY=                 # Client-side (Dashboard only): Maps JavaScript API
# Note: restrict VITE_GOOGLE_MAPS_KEY by HTTP referrer to dashboard.hhlews.in in GCP console
```

> **Security rule:** The server-side key (`GOOGLE_MAPS_API_KEY`) must never be sent to the frontend. All Directions API and Roads API calls happen in the Node.js backend. The `VITE_GOOGLE_MAPS_KEY` is a separate key restricted to Maps JavaScript API only, whitelisted to the dashboard domain.

---

## 7. Rate Limiting & Cost Controls

All Google Maps API calls are rate-limited and cached to minimize cost:

| API Call | Cache TTL | Max calls/day |
|----------|-----------|--------------|
| Road conditions poll | 30 min/zone | `n_high_zones × 48` |
| Directions (evacuation route) | 15 min/request | 200 |
| Elevation profile | 24 hours/zone | `n_zones × 1` |
| Places API (nearby shelters) | 6 hours/zone | `n_zones × 4` |

Road conditions are only polled for zones currently at HIGH or CRITICAL risk — not all zones — to conserve API quota.

```python
def should_poll_roads(zone_id: str) -> bool:
    """Only poll roads for high-risk zones."""
    cached = redis.get(f'risk:{zone_id}')
    if not cached:
        return False
    data = json.loads(cached)
    return data['risk_level'] in ['HIGH', 'CRITICAL']
```

---

## 8. Implementation Checklist

- [ ] `road_segments` and `road_conditions` tables created
- [ ] Seed road segments for all 5 districts from OpenStreetMap (osm2pgsql or Overpass API)
- [ ] Celery `poll_road_conditions` task (runs every 30 min for HIGH/CRITICAL zones)
- [ ] `GET /api/zones/:id/road-conditions` endpoint
- [ ] `GET /api/safe-zones/:id/route` endpoint calling Google Directions API
- [ ] `GET /api/zones/:id/elevation-profile` endpoint
- [ ] Dashboard map switched to Google Maps JavaScript API with traffic layer (P1)
- [ ] Road condition Polyline overlay on dashboard map (P1)
- [ ] Citizen PWA safe zone screen shows computed route polyline (P2)
- [ ] Step-by-step instructions in user's language (P2)
- [ ] Offline fallback with landmark directions when route API unavailable (P2)
- [ ] Google Maps API keys added to `.env.example`
- [ ] Rate limiting and caching for all API calls

---

*HH-LEWS Improvement Spec: Live Data from Google Maps — v1.0*
