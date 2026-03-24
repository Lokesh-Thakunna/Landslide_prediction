import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  useMap
} from "react-leaflet";
import { RISK_COLORS } from "../lib/risk";
import type {
  DangerZone,
  District,
  DistrictBoundary,
  EvacuationRoute,
  Hotspot,
  OperatorLocation,
  Shelter,
  ZoneRoadConditions,
  ZoneRisk
} from "../types";

interface RiskMapProps {
  districts: District[];
  districtBoundaries: DistrictBoundary[];
  zones: ZoneRisk[];
  hotspots: Hotspot[];
  shelters: Shelter[];
  route: EvacuationRoute | null;
  roadConditions: ZoneRoadConditions | null;
  dangerZones: DangerZone[];
  operatorLocation: OperatorLocation | null;
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
}

const ROAD_STATUS_COLORS: Record<"open" | "caution" | "blocked" | "flooded", string> = {
  open: "#15803d",
  caution: "#d97706",
  blocked: "#dc2626",
  flooded: "#0f766e"
};

const PRIMARY_TILE_URL = "https://tiles.openfreemap.org/styles/liberty/{z}/{x}/{y}.png";
const PRIMARY_TILE_ATTRIBUTION =
  '&copy; <a href="https://openfreemap.org">OpenFreeMap</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const FALLBACK_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const FALLBACK_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function hotspotIcon(color: string) {
  return L.divIcon({
    className: "hotspot-icon",
    html: `<div style="width:16px;height:16px;border-radius:999px;background:${color};box-shadow:0 0 0 6px rgba(255,255,255,0.35),0 0 18px rgba(0,0,0,0.28);border:2px solid #fff;"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
}

function shelterIcon() {
  return L.divIcon({
    className: "shelter-icon",
    html: '<div style="width:16px;height:16px;border-radius:999px;background:#22c55e;box-shadow:0 0 0 5px rgba(255,255,255,0.32),0 0 14px rgba(34,197,94,0.28);border:2px solid #fff;"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
}

function operatorLocationIcon() {
  return L.divIcon({
    className: "operator-location-icon",
    html: '<div style="width:18px;height:18px;border-radius:999px;background:#2563eb;box-shadow:0 0 0 6px rgba(37,99,235,0.18),0 0 16px rgba(37,99,235,0.35);border:3px solid #fff;"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
}

function districtIcon(
  name: string,
  riskLevel: ZoneRisk["risk_level"] | "NO_ACTIVE_ZONE",
  zoneCount: number
) {
  const color = riskLevel === "NO_ACTIVE_ZONE" ? "#64748b" : RISK_COLORS[riskLevel];
  const riskLabel = riskLevel === "NO_ACTIVE_ZONE" ? "No active zone" : riskLevel;

  return L.divIcon({
    className: "district-situation-icon",
    html: `<div style="display:flex;flex-direction:column;gap:2px;min-width:124px;padding:8px 10px;border-radius:14px;background:rgba(255,255,255,0.94);border:1px solid ${color};box-shadow:0 10px 30px rgba(15,23,42,0.14);">
      <div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:12px;color:#0f172a;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:${color};"></span>
        <span>${name}</span>
      </div>
      <div style="font-size:11px;color:#475569;text-transform:uppercase;letter-spacing:0.08em;">${riskLabel} • ${zoneCount} zones</div>
    </div>`,
    iconSize: [124, 44],
    iconAnchor: [62, 22]
  });
}

export function RiskMap({
  districts,
  districtBoundaries,
  zones,
  hotspots,
  shelters,
  route,
  roadConditions,
  dangerZones,
  operatorLocation,
  selectedZoneId,
  onSelectZone
}: RiskMapProps) {
  const [tileUrl, setTileUrl] = useState(PRIMARY_TILE_URL);
  const [tileAttribution, setTileAttribution] = useState(PRIMARY_TILE_ATTRIBUTION);

  const selectedRouteCoordinates = useMemo(() => {
    if (!route?.segment_ids?.length || !roadConditions?.segments.length) {
      return [] as Array<[number, number]>;
    }

    return route.segment_ids.flatMap((segmentId) => {
      const segment = roadConditions.segments.find((item) => item.id === segmentId);
      return segment?.coordinates.map((point) => [point.lat, point.lon] as [number, number]) ?? [];
    });
  }, [roadConditions, route]);

  const districtSituations = useMemo(() => {
    const boundariesByDistrictId = new Map(
      districtBoundaries.map((boundary) => [boundary.district_id, boundary])
    );

    return districts
      .map((district) => {
        const boundary = boundariesByDistrictId.get(district.id);

        if (!boundary) {
          return null;
        }

        const districtZones = zones.filter((zone) => zone.district_id === district.id);
        const sortedBySeverity = districtZones.slice().sort((left, right) => {
          const severityOrder = { SAFE: 0, WATCH: 1, DANGER: 2 };
          return severityOrder[right.risk_level] - severityOrder[left.risk_level];
        });

        return {
          id: district.id,
          name: district.name,
          riskLevel: (sortedBySeverity[0]?.risk_level ?? "NO_ACTIVE_ZONE") as
            | ZoneRisk["risk_level"]
            | "NO_ACTIVE_ZONE",
          zoneCount: districtZones.length,
          center: boundary.center,
          polygons: boundary.polygons
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [districtBoundaries, districts, zones]);

  return (
    <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/80 shadow-[0_18px_60px_rgba(17,32,22,0.09)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Live district map</h2>
          <p className="text-sm text-slate-600">
            Real Uttarakhand district boundaries now come from the live API, with worst-risk
            coloring, zone markers, shelters, verified routes, and road-condition overlays.
          </p>
        </div>
        <div className="flex max-w-[560px] flex-wrap items-center gap-2 text-xs font-medium">
          <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-emerald-900">
            {tileUrl === PRIMARY_TILE_URL
              ? "Leaflet + OpenFreeMap"
              : "Leaflet + OpenStreetMap fallback"}
          </span>
          {Object.entries(RISK_COLORS).map(([level, color]) => (
            <div
              key={level}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700"
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              {level}
            </div>
          ))}
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: "#94a3b8" }}
            />
            no active zone
          </div>
          {Object.entries(ROAD_STATUS_COLORS).map(([status, color]) => (
            <div
              key={status}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700"
            >
              <span
                className="inline-block h-0.5 w-5 rounded-full"
                style={{ backgroundColor: color }}
              />
              {status}
            </div>
          ))}
        </div>
      </div>

      <div className="h-[420px] md:h-[470px] xl:h-[520px]">
        <MapContainer center={getMapCenter(districtBoundaries, zones, selectedZoneId)} zoom={8} scrollWheelZoom className="z-0 h-full">
          <TileLayer
            attribution={tileAttribution}
            url={tileUrl}
            maxZoom={18}
            eventHandlers={{
              tileerror: () => {
                if (tileUrl !== FALLBACK_TILE_URL) {
                  setTileUrl(FALLBACK_TILE_URL);
                  setTileAttribution(FALLBACK_TILE_ATTRIBUTION);
                }
              }
            }}
          />
          <MapBoundsController
            districtBoundaries={districtBoundaries}
            zones={zones}
            shelters={shelters}
            dangerZones={dangerZones}
            operatorLocation={operatorLocation}
            routeCoordinates={selectedRouteCoordinates}
            selectedZoneId={selectedZoneId}
          />

          {districtSituations.flatMap((district) =>
            district.polygons.map((polygon, index) => (
              <Polygon
                key={`district-shape-${district.id}-${index}`}
                positions={polygon}
                pathOptions={{
                  color: district.riskLevel === "NO_ACTIVE_ZONE" ? "#94a3b8" : RISK_COLORS[district.riskLevel],
                  fillColor:
                    district.riskLevel === "NO_ACTIVE_ZONE" ? "#cbd5e1" : RISK_COLORS[district.riskLevel],
                  fillOpacity: district.riskLevel === "NO_ACTIVE_ZONE" ? 0.08 : 0.12,
                  weight: 2,
                  opacity: 0.9
                }}
              >
                <Popup>
                  <div className="space-y-1">
                    <div className="font-semibold">{district.name}</div>
                    <div>
                      Worst current level:{" "}
                      {district.riskLevel === "NO_ACTIVE_ZONE" ? "No active zone" : district.riskLevel}
                    </div>
                    <div>Active monitored zones: {district.zoneCount}</div>
                  </div>
                </Popup>
              </Polygon>
            ))
          )}

          {districtSituations.map((district) => (
            <Marker
              key={`district-label-${district.id}`}
              position={district.center}
              icon={districtIcon(district.name, district.riskLevel, district.zoneCount)}
            >
              <Popup>
                <div className="space-y-1">
                  <div className="font-semibold">{district.name}</div>
                  <div>
                    Worst current level:{" "}
                    {district.riskLevel === "NO_ACTIVE_ZONE" ? "No active zone" : district.riskLevel}
                  </div>
                  <div>Active monitored zones: {district.zoneCount}</div>
                </div>
              </Popup>
            </Marker>
          ))}

          {zones.map((zone) => {
            const color = RISK_COLORS[zone.risk_level];
            const active = selectedZoneId === zone.zone_id;
            const hasPolygon = zone.polygon.length >= 3;

            if (hasPolygon) {
              return (
                <Polygon
                  key={zone.zone_id}
                  positions={zone.polygon}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: active ? 0.5 : 0.32,
                    weight: active ? 3 : 2
                  }}
                  eventHandlers={{
                    click: () => onSelectZone(zone.zone_id)
                  }}
                >
                  <Popup>
                    <div className="space-y-1">
                      <div className="font-semibold">{zone.zone_name}</div>
                      <div>{zone.district_name}</div>
                      <div>{zone.risk_level}</div>
                      <div>Score: {zone.risk_score}</div>
                      <div>Rainfall: {zone.rainfall_mm_hr} mm/hr</div>
                    </div>
                  </Popup>
                </Polygon>
              );
            }

            return (
              <Circle
                key={zone.zone_id}
                center={zone.coordinates}
                radius={active ? 5000 : 3600}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: active ? 0.24 : 0.14,
                  weight: active ? 3 : 2
                }}
                eventHandlers={{
                  click: () => onSelectZone(zone.zone_id)
                }}
              >
                <Popup>
                  <div className="space-y-1">
                    <div className="font-semibold">{zone.zone_name}</div>
                    <div>{zone.district_name}</div>
                    <div>{zone.risk_level}</div>
                    <div>Score: {zone.risk_score}</div>
                    <div>Rainfall: {zone.rainfall_mm_hr} mm/hr</div>
                  </div>
                </Popup>
              </Circle>
            );
          })}

          {hotspots.map((hotspot) => {
            const zone = zones.find((item) => item.zone_id === hotspot.zone_id);

            if (!zone) {
              return null;
            }

            return (
              <Marker
                key={`hotspot-${hotspot.zone_id}`}
                position={zone.coordinates}
                icon={hotspotIcon(RISK_COLORS[hotspot.risk_level])}
                eventHandlers={{
                  click: () => onSelectZone(zone.zone_id)
                }}
              >
                <Popup>
                  <div className="space-y-1">
                    <div className="font-semibold">{zone.zone_name}</div>
                    <div>Trend: {hotspot.trend}</div>
                    <div>Next horizon: {hotspot.next_horizon_level}</div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {shelters
            .filter((shelter) => typeof shelter.lat === "number" && typeof shelter.lon === "number")
            .map((shelter) => (
              <Marker
                key={shelter.id}
                position={[shelter.lat as number, shelter.lon as number]}
                icon={shelterIcon()}
              >
                <Popup>
                  <div className="space-y-1">
                    <div className="font-semibold">{shelter.name}</div>
                    <div>Capacity: {shelter.capacity}</div>
                    <div>Distance: {shelter.distance_km} km</div>
                  </div>
                </Popup>
              </Marker>
            ))}

          {operatorLocation ? (
            <>
              <Circle
                center={[operatorLocation.lat, operatorLocation.lon]}
                radius={Math.max(operatorLocation.accuracy_m ?? 35, 35)}
                pathOptions={{
                  color: "#2563eb",
                  fillColor: "#60a5fa",
                  fillOpacity: 0.12,
                  weight: 1.5
                }}
              />
              <Marker
                position={[operatorLocation.lat, operatorLocation.lon]}
                icon={operatorLocationIcon()}
              >
                <Popup>
                  <div className="space-y-1">
                    <div className="font-semibold">Your current system location</div>
                    <div>
                      {operatorLocation.lat.toFixed(5)}, {operatorLocation.lon.toFixed(5)}
                    </div>
                    <div>
                      Accuracy: {Math.round(operatorLocation.accuracy_m ?? 0)} m
                    </div>
                  </div>
                </Popup>
              </Marker>
            </>
          ) : null}

          {roadConditions?.segments.map((segment) => (
            <Polyline
              key={segment.id}
              positions={segment.coordinates.map((point) => [point.lat, point.lon] as [number, number])}
              pathOptions={{
                color: ROAD_STATUS_COLORS[segment.condition.status],
                weight: 5 - Math.min(segment.priority_rank, 3),
                opacity: 0.9
              }}
            >
              <Popup>
                <div className="space-y-1">
                  <div className="font-semibold">{segment.name}</div>
                  <div>Status: {segment.condition.status}</div>
                  <div>Delay: {segment.condition.delay_minutes} min</div>
                  <div>{segment.condition.note}</div>
                </div>
              </Popup>
            </Polyline>
          ))}

          {selectedRouteCoordinates.length > 1 ? (
            <Polyline
              positions={selectedRouteCoordinates}
              pathOptions={{
                color: "#3b82f6",
                weight: 6,
                opacity: 0.88
              }}
            >
              <Popup>
                <div className="space-y-1">
                  <div className="font-semibold">Published evacuation path</div>
                  <div>{route?.instruction_summary ?? "Verified route guidance"}</div>
                </div>
              </Popup>
            </Polyline>
          ) : null}

          {dangerZones.map((dangerZone) => (
            <Polygon
              key={dangerZone.id}
              positions={dangerZone.polygon.map((point) => [point.lat, point.lon] as [number, number])}
              pathOptions={{
                color: "#b91c1c",
                fillColor:
                  dangerZone.severity === "critical"
                    ? "#ef4444"
                    : dangerZone.severity === "high"
                      ? "#f97316"
                      : "#f59e0b",
                fillOpacity: 0.28,
                weight: 2,
                dashArray: "6 4"
              }}
            >
              <Popup>
                <div className="space-y-1">
                  <div className="font-semibold">{dangerZone.name}</div>
                  <div>Type: {dangerZone.type}</div>
                  <div>Severity: {dangerZone.severity}</div>
                  <div>{dangerZone.note}</div>
                </div>
              </Popup>
            </Polygon>
          ))}
        </MapContainer>
      </div>
    </section>
  );
}

function MapBoundsController({
  districtBoundaries,
  zones,
  shelters,
  dangerZones,
  operatorLocation,
  routeCoordinates,
  selectedZoneId
}: {
  districtBoundaries: DistrictBoundary[];
  zones: ZoneRisk[];
  shelters: Shelter[];
  dangerZones: DangerZone[];
  operatorLocation: OperatorLocation | null;
  routeCoordinates: Array<[number, number]>;
  selectedZoneId: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    const bounds = L.latLngBounds([]);

    districtBoundaries.forEach((boundary) => {
      boundary.polygons.forEach((polygon) => {
        polygon.forEach((point) => bounds.extend(point));
      });
    });

    zones.forEach((zone) => {
      bounds.extend(zone.coordinates);
      zone.polygon.forEach(([lat, lon]) => bounds.extend([lat, lon]));
    });

    shelters.forEach((shelter) => {
      if (typeof shelter.lat === "number" && typeof shelter.lon === "number") {
        bounds.extend([shelter.lat, shelter.lon]);
      }
    });

    if (operatorLocation) {
      bounds.extend([operatorLocation.lat, operatorLocation.lon]);
    }

    dangerZones.forEach((dangerZone) => {
      dangerZone.polygon.forEach((point) => bounds.extend([point.lat, point.lon]));
    });

    routeCoordinates.forEach((point) => bounds.extend(point));

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [30, 30]
      });
      return;
    }

    map.setView(getMapCenter(districtBoundaries, zones, selectedZoneId), 8);
  }, [
    dangerZones,
    districtBoundaries,
    map,
    operatorLocation,
    routeCoordinates,
    selectedZoneId,
    shelters,
    zones
  ]);

  return null;
}

function getMapCenter(
  districtBoundaries: DistrictBoundary[],
  zones: ZoneRisk[],
  selectedZoneId: string | null
): [number, number] {
  const selected = zones.find((zone) => zone.zone_id === selectedZoneId);

  if (selected) {
    return selected.coordinates;
  }

  if (districtBoundaries.length) {
    const lat =
      districtBoundaries.reduce((sum, boundary) => sum + boundary.center[0], 0) /
      districtBoundaries.length;
    const lon =
      districtBoundaries.reduce((sum, boundary) => sum + boundary.center[1], 0) /
      districtBoundaries.length;

    return [lat, lon];
  }

  return zones[0]?.coordinates ?? [30.18, 79.98];
}
