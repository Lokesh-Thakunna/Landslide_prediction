import fs from "fs";
import os from "os";
import path from "path";
import { District, DistrictBoundary } from "@bhurakshan/contracts";

type RawCoordinate = [number, number];

type RawFeature = {
  properties?: {
    Dist_Name?: string;
  };
  geometry?: {
    type?: "Polygon" | "MultiPolygon";
    coordinates?: RawCoordinate[][] | RawCoordinate[][][];
  };
};

type RawFeatureCollection = {
  type?: string;
  features?: RawFeature[];
};

const MAX_RING_POINTS = 240;
const DISTRICT_NAME_ALIASES = new Map<string, string>([
  ["hardwar", "Haridwar"],
  ["garhwal", "Pauri Garhwal"]
]);
const boundaryFileCandidates = [
  process.env.UTTARAKHAND_GEOJSON_PATH,
  path.join(os.homedir(), "OneDrive", "Desktop", "Uttarakhand geo-json integration.txt"),
  path.join(os.homedir(), "Desktop", "Uttarakhand geo-json integration.txt"),
  path.resolve(process.cwd(), "../../Uttarakhand geo-json integration.txt"),
  path.resolve(process.cwd(), "../Uttarakhand geo-json integration.txt"),
  path.resolve(process.cwd(), "Uttarakhand geo-json integration.txt")
].filter((value): value is string => Boolean(value));

let cachedBoundaries: DistrictBoundary[] | null = null;

export function getDistrictBoundaries(districts: District[]): DistrictBoundary[] {
  if (!cachedBoundaries) {
    cachedBoundaries = loadDistrictBoundaries(districts);
  }

  const byId = new Map(cachedBoundaries.map((boundary) => [boundary.districtId, boundary]));

  return districts
    .map((district) => byId.get(district.id))
    .filter((boundary): boundary is DistrictBoundary => Boolean(boundary));
}

function loadDistrictBoundaries(districts: District[]): DistrictBoundary[] {
  const sourcePath = boundaryFileCandidates.find((candidate) => fs.existsSync(candidate));

  if (!sourcePath) {
    console.warn("District boundary GeoJSON not found. Expected one of:", boundaryFileCandidates);
    return [];
  }

  const raw = fs.readFileSync(sourcePath, "utf-8");
  const parsed = JSON.parse(raw) as RawFeatureCollection;
  const districtLookup = new Map(
    districts.map((district) => [normalizeDistrictName(district.name), district])
  );

  const boundaries = (parsed.features ?? [])
    .map((feature) => buildBoundaryFromFeature(feature, districtLookup))
    .filter((boundary): boundary is DistrictBoundary => Boolean(boundary));

  if (!boundaries.length) {
    console.warn(`District boundary GeoJSON loaded from ${sourcePath}, but no usable districts were parsed.`);
  }

  return boundaries;
}

function buildBoundaryFromFeature(
  feature: RawFeature,
  districtLookup: Map<string, District>
): DistrictBoundary | null {
  const rawName = feature.properties?.Dist_Name?.trim();

  if (!rawName) {
    return null;
  }

  const resolvedName = DISTRICT_NAME_ALIASES.get(normalizeDistrictName(rawName)) ?? rawName;
  const district = districtLookup.get(normalizeDistrictName(resolvedName));

  if (!district || !feature.geometry?.coordinates || !feature.geometry.type) {
    return null;
  }

  const polygons = extractOuterRings(feature.geometry.type, feature.geometry.coordinates)
    .map((ring) => simplifyRing(ring))
    .filter((ring): ring is DistrictBoundary["polygons"][number] => ring.length >= 3);

  if (!polygons.length) {
    return null;
  }

  return {
    districtId: district.id,
    districtName: district.name,
    center: computeCenter(polygons),
    polygons
  };
}

function extractOuterRings(
  geometryType: NonNullable<RawFeature["geometry"]>["type"],
  coordinates: NonNullable<RawFeature["geometry"]>["coordinates"]
) {
  if (geometryType === "Polygon") {
    const polygonCoordinates = coordinates as RawCoordinate[][];
    return polygonCoordinates.length ? [polygonCoordinates[0]] : [];
  }

  if (geometryType === "MultiPolygon") {
    const multiPolygonCoordinates = coordinates as RawCoordinate[][][];
    return multiPolygonCoordinates
      .map((polygon) => polygon[0])
      .filter((ring): ring is RawCoordinate[] => Array.isArray(ring) && ring.length >= 3);
  }

  return [];
}

function simplifyRing(ring: RawCoordinate[]) {
  const uniquePoints = stripClosingPoint(ring)
    .map(([lon, lat]) => ({ lat, lon }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));

  if (uniquePoints.length <= MAX_RING_POINTS) {
    return uniquePoints;
  }

  const step = Math.ceil(uniquePoints.length / MAX_RING_POINTS);
  const simplified = uniquePoints.filter((_point, index) => index % step === 0);
  const lastPoint = uniquePoints[uniquePoints.length - 1];

  if (simplified[simplified.length - 1] !== lastPoint) {
    simplified.push(lastPoint);
  }

  return simplified;
}

function stripClosingPoint(ring: RawCoordinate[]) {
  if (ring.length < 2) {
    return ring;
  }

  const [firstLon, firstLat] = ring[0];
  const [lastLon, lastLat] = ring[ring.length - 1];

  if (firstLon === lastLon && firstLat === lastLat) {
    return ring.slice(0, -1);
  }

  return ring;
}

function computeCenter(polygons: DistrictBoundary["polygons"]): DistrictBoundary["center"] {
  const points = polygons.flat();
  const bounds = points.reduce(
    (
      accumulator: {
        minLat: number;
        maxLat: number;
        minLon: number;
        maxLon: number;
      },
      point: { lat: number; lon: number }
    ) => ({
      minLat: Math.min(accumulator.minLat, point.lat),
      maxLat: Math.max(accumulator.maxLat, point.lat),
      minLon: Math.min(accumulator.minLon, point.lon),
      maxLon: Math.max(accumulator.maxLon, point.lon)
    }),
    {
      minLat: Number.POSITIVE_INFINITY,
      maxLat: Number.NEGATIVE_INFINITY,
      minLon: Number.POSITIVE_INFINITY,
      maxLon: Number.NEGATIVE_INFINITY
    }
  );

  return {
    lat: Number(((bounds.minLat + bounds.maxLat) / 2).toFixed(6)),
    lon: Number(((bounds.minLon + bounds.maxLon) / 2).toFixed(6))
  };
}

function normalizeDistrictName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
