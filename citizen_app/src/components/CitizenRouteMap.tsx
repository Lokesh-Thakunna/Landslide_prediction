import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap
} from "react-leaflet";

type Coordinate = {
  lat: number;
  lon: number;
};

interface CitizenRouteMapProps {
  currentPosition: Coordinate | null;
  safeCoordinate: Coordinate | null;
  dangerCoordinate: Coordinate | null;
  routeCoordinates: Coordinate[];
  currentPositionLabel: string;
  safeZoneLabel: string;
  dangerLabel: string;
}

const TILE_URL = "https://tiles.openfreemap.org/styles/liberty/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://openfreemap.org">OpenFreeMap</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export function CitizenRouteMap({
  currentPosition,
  safeCoordinate,
  dangerCoordinate,
  routeCoordinates,
  currentPositionLabel,
  safeZoneLabel,
  dangerLabel
}: CitizenRouteMapProps) {
  const center = currentPosition ?? safeCoordinate ?? routeCoordinates[0] ?? { lat: 30.18, lon: 79.98 };
  const polyline = routeCoordinates.map((point) => [point.lat, point.lon] as [number, number]);

  return (
    <div className="h-[280px] w-full">
      <MapContainer center={[center.lat, center.lon]} zoom={14} scrollWheelZoom className="z-0 h-full w-full">
        <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} maxZoom={18} />
        <RouteMapViewport
          routeCoordinates={routeCoordinates}
          currentPosition={currentPosition}
          safeCoordinate={safeCoordinate}
          dangerCoordinate={dangerCoordinate}
        />

        {polyline.length > 1 ? (
          <Polyline
            positions={polyline}
            pathOptions={{
              color: "#22c55e",
              weight: 5,
              opacity: 0.95
            }}
          />
        ) : null}

        {dangerCoordinate ? (
          <CircleMarker
            center={[dangerCoordinate.lat, dangerCoordinate.lon]}
            radius={8}
            pathOptions={{
              color: "#fecaca",
              fillColor: "#ef4444",
              fillOpacity: 0.92,
              weight: 2
            }}
          >
            <Popup>{dangerLabel}</Popup>
          </CircleMarker>
        ) : null}

        {safeCoordinate ? (
          <CircleMarker
            center={[safeCoordinate.lat, safeCoordinate.lon]}
            radius={9}
            pathOptions={{
              color: "#bbf7d0",
              fillColor: "#22c55e",
              fillOpacity: 0.95,
              weight: 2
            }}
          >
            <Popup>{safeZoneLabel}</Popup>
          </CircleMarker>
        ) : null}

        {currentPosition ? (
          <CircleMarker
            center={[currentPosition.lat, currentPosition.lon]}
            radius={9}
            pathOptions={{
              color: "#bfdbfe",
              fillColor: "#3b82f6",
              fillOpacity: 0.95,
              weight: 3
            }}
          >
            <Popup>{currentPositionLabel}</Popup>
          </CircleMarker>
        ) : null}
      </MapContainer>
    </div>
  );
}

function RouteMapViewport({
  routeCoordinates,
  currentPosition,
  safeCoordinate,
  dangerCoordinate
}: {
  routeCoordinates: Coordinate[];
  currentPosition: Coordinate | null;
  safeCoordinate: Coordinate | null;
  dangerCoordinate: Coordinate | null;
}) {
  const map = useMap();

  useEffect(() => {
    const points = [
      ...routeCoordinates,
      ...(currentPosition ? [currentPosition] : []),
      ...(safeCoordinate ? [safeCoordinate] : []),
      ...(dangerCoordinate ? [dangerCoordinate] : [])
    ];

    if (!points.length) {
      map.setView([30.18, 79.98], 8);
      return;
    }

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lon], 15);
      return;
    }

    map.fitBounds(
      points.map((point) => [point.lat, point.lon] as [number, number]),
      {
        padding: [28, 28]
      }
    );
  }, [currentPosition, dangerCoordinate, map, routeCoordinates, safeCoordinate]);

  return null;
}
