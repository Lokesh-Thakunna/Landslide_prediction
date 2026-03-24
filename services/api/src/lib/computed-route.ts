import type {
  ComputedSafeZoneRoute,
  Coordinates,
  ComputedRouteStep,
  EvacuationRoute,
  RoadConditionSegment,
  SafeShelter,
  ZoneRoadConditions,
  ZoneStatic
} from "@bhurakshan/contracts";

export function buildComputedSafeZoneRoute(input: {
  zone: ZoneStatic;
  shelter: SafeShelter;
  route?: EvacuationRoute;
  roadConditions: ZoneRoadConditions;
  origin: Coordinates;
  liveRoute?: {
    distanceKm: number;
    durationMinutes: number;
    polyline: string;
    coordinates: Coordinates[];
    steps: ComputedRouteStep[];
  };
}): ComputedSafeZoneRoute {
  const baseCoordinates = input.liveRoute?.coordinates ?? buildRouteCoordinates(input.route, input.roadConditions);
  const coordinates = ensureEndpoints(baseCoordinates, input.origin, {
    lat: input.shelter.lat,
    lon: input.shelter.lon
  });
  const routeSegments = getRouteSegments(input.route, input.roadConditions);
  const blockedRoadsAvoided = input.roadConditions.segments
    .filter(
      (segment) =>
        !routeSegments.some((routeSegment) => routeSegment.id === segment.id) &&
        ["blocked", "flooded"].includes(segment.condition.status)
    )
    .map((segment) => segment.name);
  const roadWarnings = routeSegments
    .filter((segment) => segment.condition.status !== "open")
    .map(
      (segment) =>
        `${segment.name} is ${segment.condition.status}; expect ${segment.condition.delayMinutes} min delay.`
    );
  const routeWarnings = input.route?.routeWarnings ?? [];
  const allWarnings = Array.from(new Set([...routeWarnings, ...roadWarnings]));
  const totalDistanceKm =
    input.liveRoute?.distanceKm ?? input.route?.distanceKm ?? estimatePolylineDistanceKm(coordinates);
  const durationMinutes =
    input.liveRoute?.durationMinutes ?? input.route?.estimatedMinutes ?? Math.max(1, Math.round(totalDistanceKm * 13));

  return {
    zoneId: input.zone.id,
    origin: input.origin,
    destination: {
      id: input.shelter.id,
      name: input.shelter.name,
      lat: input.shelter.lat,
      lon: input.shelter.lon,
      capacity: input.shelter.capacity,
      elevationM: input.shelter.elevationM
    },
    route: {
      source: input.liveRoute ? "osrm_public_api" : "published_path_fallback",
      distanceKm: round(totalDistanceKm),
      durationMinutes,
      mode: "walking",
      polyline: input.liveRoute?.polyline ?? encodePolyline(coordinates),
      coordinates,
      steps: buildRouteSteps(input.route, routeSegments, totalDistanceKm, input.liveRoute?.steps),
      warnings: allWarnings,
      blockedRoadsAvoided
    },
    alternateRoute:
      blockedRoadsAvoided.length > 0
        ? {
            distanceKm: round(totalDistanceKm * 1.12),
            durationMinutes: Math.max(durationMinutes + 4, Math.round(durationMinutes * 1.12)),
            coordinates: [
              input.origin,
              midpoint(input.origin, {
                lat: input.shelter.lat,
                lon: input.shelter.lon
              }),
              {
                lat: input.shelter.lat,
                lon: input.shelter.lon
              }
            ],
            warnings: ["Alternate route may be longer but avoids blocked roads."]
          }
        : null,
    fallbackDirections:
      input.route?.instructionSummary ?? input.shelter.instructionSummary
  };
}

function buildRouteSteps(
  route: EvacuationRoute | undefined,
  routeSegments: RoadConditionSegment[],
  totalDistanceKm: number,
  liveRouteSteps?: ComputedRouteStep[]
) {
  if (liveRouteSteps?.length) {
    return liveRouteSteps;
  }

  const steps = route?.steps ?? [];

  if (!steps.length) {
    return routeSegments.map((segment) => ({
      instructionHi: `${segment.name} की ओर बढ़ें और ${segment.condition.note.toLowerCase()}`,
      instructionEn: `Proceed via ${segment.name} and note that ${segment.condition.note.toLowerCase()}`,
      distanceM: Math.max(50, Math.round(segment.lengthKm * 1000)),
      roadStatus: segment.condition.status
    }));
  }

  return steps.map((step, index) => {
    const relatedSegment = routeSegments[Math.min(index, routeSegments.length - 1)];
    const stepDistanceKm = totalDistanceKm / Math.max(steps.length, 1);

    return {
      instructionHi: step,
      instructionEn: step,
      distanceM: Math.max(50, Math.round(stepDistanceKm * 1000)),
      roadStatus: relatedSegment?.condition.status ?? "open"
    };
  });
}

function buildRouteCoordinates(route: EvacuationRoute | undefined, roadConditions: ZoneRoadConditions) {
  if (!route?.segmentIds?.length) {
    return [] as Coordinates[];
  }

  return route.segmentIds.flatMap((segmentId) => {
    const segment = roadConditions.segments.find((item) => item.id === segmentId);
    return segment?.coordinates ?? [];
  });
}

function getRouteSegments(route: EvacuationRoute | undefined, roadConditions: ZoneRoadConditions) {
  if (!route?.segmentIds?.length) {
    return [] as RoadConditionSegment[];
  }

  return route.segmentIds
    .map((segmentId) => roadConditions.segments.find((item) => item.id === segmentId))
    .filter((segment): segment is RoadConditionSegment => Boolean(segment));
}

function ensureEndpoints(
  coordinates: Coordinates[],
  origin: Coordinates,
  destination: Coordinates
) {
  const next = [...coordinates];

  if (!next.length) {
    return [origin, midpoint(origin, destination), destination];
  }

  if (distanceKm(origin, next[0]) > 0.05) {
    next.unshift(origin);
  } else {
    next[0] = origin;
  }

  if (distanceKm(next[next.length - 1], destination) > 0.05) {
    next.push(destination);
  } else {
    next[next.length - 1] = destination;
  }

  return next;
}

function midpoint(from: Coordinates, to: Coordinates): Coordinates {
  return {
    lat: (from.lat + to.lat) / 2,
    lon: (from.lon + to.lon) / 2
  };
}

function estimatePolylineDistanceKm(coordinates: Coordinates[]) {
  let total = 0;

  for (let index = 1; index < coordinates.length; index += 1) {
    total += distanceKm(coordinates[index - 1], coordinates[index]);
  }

  return total;
}

function distanceKm(from: Coordinates, to: Coordinates) {
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

function encodePolyline(coordinates: Coordinates[]) {
  let lastLat = 0;
  let lastLon = 0;

  return coordinates
    .map((coordinate) => {
      const lat = Math.round(coordinate.lat * 1e5);
      const lon = Math.round(coordinate.lon * 1e5);
      const encoded = encodeSignedNumber(lat - lastLat) + encodeSignedNumber(lon - lastLon);
      lastLat = lat;
      lastLon = lon;
      return encoded;
    })
    .join("");
}

function encodeSignedNumber(value: number) {
  let shifted = value < 0 ? ~(value << 1) : value << 1;
  let output = "";

  while (shifted >= 0x20) {
    output += String.fromCharCode((0x20 | (shifted & 0x1f)) + 63);
    shifted >>= 5;
  }

  output += String.fromCharCode(shifted + 63);
  return output;
}

function round(value: number) {
  return Number(value.toFixed(2));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
