import { useEffect, useMemo, useState } from "react";
import type { ComputedSafeZoneRoute, EvacuationRoute, LocationStatus, ZoneRoadConditions } from "../types";

type Coordinate = {
  lat: number;
  lon: number;
};

interface UseEvacuationTrackerOptions {
  active: boolean;
  route: EvacuationRoute | null;
  computedRoute: ComputedSafeZoneRoute | null;
  roadConditions: ZoneRoadConditions | null;
  status: LocationStatus | null;
  deviceHeading: number | null;
}

export function useEvacuationTracker({
  active,
  route,
  computedRoute,
  roadConditions,
  status,
  deviceHeading,
}: UseEvacuationTrackerOptions) {
  const safeCoordinate = useMemo<Coordinate | null>(() => {
    if (!status) {
      return null;
    }

    return {
      lat: status.evacuation.recommended_safe_zone.lat,
      lon: status.evacuation.recommended_safe_zone.lon,
    };
  }, [status]);

  const fallbackOrigin = useMemo<Coordinate | null>(() => {
    if (!status) {
      return null;
    }

    return {
      lat: status.user_location.lat,
      lon: status.user_location.lon,
    };
  }, [status]);

  const [currentPosition, setCurrentPosition] = useState<Coordinate | null>(fallbackOrigin);
  const [tracking, setTracking] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPosition(fallbackOrigin);
  }, [fallbackOrigin?.lat, fallbackOrigin?.lon]);

  useEffect(() => {
    if (!active) {
      setTracking(false);
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setTracking(false);
      setTrackingError("Geolocation tracking is not supported on this device.");
      return;
    }

    setTracking(true);
    setTrackingError(null);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentPosition({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setTrackingError(null);
      },
      (error) => {
        setTrackingError(error.message || "Live route tracking could not continue.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 12000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      setTracking(false);
    };
  }, [active]);

  const routeCoordinates = useMemo(() => {
    const coordinates = buildRouteCoordinates(route, computedRoute, roadConditions);
    const start = currentPosition ?? fallbackOrigin;

    if (start) {
      if (!coordinates.length || haversineKm(start, coordinates[0]) > 0.05) {
        coordinates.unshift(start);
      } else {
        coordinates[0] = start;
      }
    }

    if (safeCoordinate) {
      const last = coordinates[coordinates.length - 1];
      if (!last || haversineKm(last, safeCoordinate) > 0.05) {
        coordinates.push(safeCoordinate);
      }
    }

    return coordinates;
  }, [computedRoute, currentPosition, fallbackOrigin, roadConditions, route, safeCoordinate]);

  const dangerCoordinate = useMemo(() => {
    const origin = currentPosition ?? fallbackOrigin;
    if (!origin || !status) {
      return null;
    }

    return projectCoordinate(
      origin,
      status.risk.nearest_danger_bearing,
      status.risk.nearest_danger_m / 1000
    );
  }, [currentPosition, fallbackOrigin, status]);

  const remainingDistanceKm =
    currentPosition && safeCoordinate ? haversineKm(currentPosition, safeCoordinate) : null;

  const totalDistanceKm =
    computedRoute?.route.distance_km ?? route?.distance_km ?? status?.evacuation.route.distance_km ?? null;
  const progressRatio =
    remainingDistanceKm !== null && totalDistanceKm && totalDistanceKm > 0
      ? clamp(1 - remainingDistanceKm / totalDistanceKm, 0, 1)
      : 0;
  const stepCount = route?.steps.length ?? status?.evacuation.route.steps.length ?? 0;
  const currentStepIndex =
    stepCount > 0 ? Math.min(stepCount - 1, Math.floor(progressRatio * stepCount)) : 0;
  const headingToSafe =
    currentPosition && safeCoordinate ? computeBearing(currentPosition, safeCoordinate) : null;
  const headingToDanger =
    currentPosition && dangerCoordinate ? computeBearing(currentPosition, dangerCoordinate) : null;
  const movingTowardDanger =
    deviceHeading !== null && headingToDanger !== null
      ? angularDifference(deviceHeading, headingToDanger) <= 45
      : status?.movement.moving_toward_danger ?? false;
  const etaMinutes =
    remainingDistanceKm !== null && totalDistanceKm && totalDistanceKm > 0
      ? Math.max(
          1,
          Math.round(
            (computedRoute?.route.duration_minutes ??
              route?.estimated_minutes ??
              status?.evacuation.route.walk_time_min ??
              1) *
              (remainingDistanceKm / totalDistanceKm)
          )
        )
      : null;

  return {
    currentPosition,
    tracking,
    trackingError,
    routeCoordinates,
    safeCoordinate,
    dangerCoordinate,
    remainingDistanceKm,
    etaMinutes,
    progressRatio,
    currentStepIndex,
    headingToSafe,
    movingTowardDanger,
  };
}

function buildRouteCoordinates(
  route: EvacuationRoute | null,
  computedRoute: ComputedSafeZoneRoute | null,
  roadConditions: ZoneRoadConditions | null
) {
  if (computedRoute?.route.coordinates.length) {
    return [...computedRoute.route.coordinates];
  }

  if (!route?.segment_ids?.length || !roadConditions?.segments.length) {
    return [] as Coordinate[];
  }

  return route.segment_ids.flatMap((segmentId) => {
    const segment = roadConditions.segments.find((item) => item.id === segmentId);
    return segment?.coordinates ?? [];
  });
}

function haversineKm(from: Coordinate, to: Coordinate) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.lat - from.lat);
  const dLon = toRadians(to.lon - from.lon);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computeBearing(from: Coordinate, to: Coordinate) {
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const deltaLon = toRadians(to.lon - from.lon);

  const x = Math.sin(deltaLon) * Math.cos(lat2);
  const y =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  return normalizeHeading((Math.atan2(x, y) * 180) / Math.PI);
}

function projectCoordinate(origin: Coordinate, bearingDegrees: number, distanceKm: number): Coordinate {
  const earthRadiusKm = 6371;
  const angularDistance = distanceKm / earthRadiusKm;
  const bearing = toRadians(bearingDegrees);
  const lat1 = toRadians(origin.lat);
  const lon1 = toRadians(origin.lon);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    lat: (lat2 * 180) / Math.PI,
    lon: (lon2 * 180) / Math.PI,
  };
}

function angularDifference(a: number, b: number) {
  const normalized = Math.abs(normalizeHeading(a) - normalizeHeading(b));
  return Math.min(normalized, 360 - normalized);
}

function normalizeHeading(value: number) {
  return ((value % 360) + 360) % 360;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
