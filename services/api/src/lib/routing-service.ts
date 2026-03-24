import axios from "axios";
import Redis from "ioredis";
import type { Coordinates } from "@bhurakshan/contracts";
import { env } from "../config/env";

const CACHE_TTL_SECONDS = 30 * 60;
const OSRM_BASE_URL = "http://router.project-osrm.org/route/v1/foot";

type OsrmRouteStep = {
  instructionHi: string;
  instructionEn: string;
  distanceM: number;
  roadStatus: "open";
};

type OsrmStep = {
  distance?: number;
  name?: string;
  destinations?: string;
  maneuver?: {
    type?: string;
    modifier?: string;
    exit?: number;
  };
};

type OsrmRouteResponse = {
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: {
      coordinates?: Array<[number, number]>;
    };
    legs?: Array<{
      steps?: OsrmStep[];
    }>;
  }>;
};

export type RoutedPath = {
  distanceKm: number;
  durationMinutes: number;
  polyline: string;
  coordinates: Coordinates[];
  steps: OsrmRouteStep[];
};

let redisClient: Redis | null = null;

function getRedisClient() {
  if (!env.redisUrl) {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis(env.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false
    });

    redisClient.on("error", (error) => {
      console.warn("Redis cache unavailable for routing.", error.message);
    });
  }

  return redisClient;
}

async function getCachedRoute(cacheKey: string) {
  const client = getRedisClient();

  if (!client) {
    return null;
  }

  try {
    if (client.status === "wait") {
      await client.connect();
    }

    const cached = await client.get(cacheKey);
    return cached ? (JSON.parse(cached) as RoutedPath) : null;
  } catch (error) {
    console.warn("Failed to read route cache.", error);
    return null;
  }
}

async function setCachedRoute(cacheKey: string, route: RoutedPath) {
  const client = getRedisClient();

  if (!client) {
    return;
  }

  try {
    if (client.status === "wait") {
      await client.connect();
    }

    await client.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(route));
  } catch (error) {
    console.warn("Failed to persist route cache.", error);
  }
}

export async function getRouteTo(
  originLat: number,
  originLon: number,
  destinationLat: number,
  destinationLon: number
) {
  const cacheKey = [
    "route",
    originLat.toFixed(5),
    originLon.toFixed(5),
    destinationLat.toFixed(5),
    destinationLon.toFixed(5)
  ].join(":");
  const cached = await getCachedRoute(cacheKey);

  if (cached) {
    return cached;
  }

  const url =
    `${OSRM_BASE_URL}/` +
    `${originLon},${originLat};${destinationLon},${destinationLat}` +
    "?overview=full&geometries=geojson&steps=true";

  const response = await axios.get<OsrmRouteResponse>(url, {
    timeout: 12000
  });
  const route = response.data.routes?.[0];
  const leg = route?.legs?.[0];

  if (!route || !leg) {
    throw new Error("OSRM did not return a routable path.");
  }

  const coordinates = (route.geometry?.coordinates ?? []).map(([lon, lat]) => ({
    lat,
    lon
  }));
  const result: RoutedPath = {
    distanceKm: round((route.distance ?? 0) / 1000),
    durationMinutes: Math.max(1, Math.ceil((route.duration ?? 0) / 60)),
    polyline: encodePolyline(coordinates),
    coordinates,
    steps: (leg.steps ?? []).map((step) => ({
      instructionEn: buildInstruction(step, "en"),
      instructionHi: buildInstruction(step, "hi"),
      distanceM: Math.max(1, Math.round(step.distance ?? 0)),
      roadStatus: "open"
    }))
  };

  await setCachedRoute(cacheKey, result);
  return result;
}

function buildInstruction(step: OsrmStep, language: "en" | "hi") {
  const maneuver = step.maneuver ?? {};
  const type = String(maneuver.type ?? "continue");
  const modifier = typeof maneuver.modifier === "string" ? maneuver.modifier : "";
  const roadName = typeof step.name === "string" && step.name.trim() ? step.name.trim() : "";
  const destination =
    typeof step.destinations === "string" && step.destinations.trim()
      ? step.destinations.trim()
      : "";

  if (language === "hi") {
    return buildHindiInstruction(type, modifier, roadName, destination, maneuver.exit);
  }

  return buildEnglishInstruction(type, modifier, roadName, destination, maneuver.exit);
}

function buildEnglishInstruction(
  type: string,
  modifier: string,
  roadName: string,
  destination: string,
  exit: number | undefined
) {
  const roadText = roadName ? ` onto ${roadName}` : "";
  const destinationText = destination ? ` toward ${destination}` : "";

  switch (type) {
    case "depart":
      return `Head ${directionLabelEn(modifier) || "forward"}${roadText}${destinationText}`.trim();
    case "turn":
      return `Turn ${turnLabelEn(modifier) || "ahead"}${roadText}${destinationText}`.trim();
    case "continue":
    case "new name":
      return `Continue${roadText}${destinationText}`.trim();
    case "fork":
      return `Keep ${keepLabelEn(modifier) || "forward"}${roadText}${destinationText}`.trim();
    case "merge":
      return `Merge${roadText}${destinationText}`.trim();
    case "end of road":
      return `At the end of the road, turn ${turnLabelEn(modifier) || "ahead"}${roadText}`.trim();
    case "roundabout":
    case "rotary":
      return `Enter the roundabout and take exit ${exit ?? 1}${roadText}`.trim();
    case "arrive":
      return roadName ? `Arrive at ${roadName}` : "Arrive at the safe zone";
    default:
      return roadName ? `Proceed via ${roadName}` : "Proceed toward the safe zone";
  }
}

function buildHindiInstruction(
  type: string,
  modifier: string,
  roadName: string,
  destination: string,
  exit: number | undefined
) {
  const roadText = roadName ? ` ${roadName} par` : "";
  const destinationText = destination ? ` ${destination} ki or` : "";

  switch (type) {
    case "depart":
      return `${directionLabelHi(modifier) || "Aage"} badhen${roadText}${destinationText}`.trim();
    case "turn":
      return `${turnLabelHi(modifier) || "Aage"} muden${roadText}${destinationText}`.trim();
    case "continue":
    case "new name":
      return `Seedhe chalte rahen${roadText}${destinationText}`.trim();
    case "fork":
      return `${keepLabelHi(modifier) || "Aage"} disha len${roadText}${destinationText}`.trim();
    case "merge":
      return `Marg mein milen${roadText}${destinationText}`.trim();
    case "end of road":
      return `Sadak ke ant mein ${turnLabelHi(modifier) || "aage"} muden${roadText}`.trim();
    case "roundabout":
    case "rotary":
      return `Roundabout par ${exit ?? 1}van nikas len${roadText}`.trim();
    case "arrive":
      return roadName ? `${roadName} pahunchen` : "Surakshit sthan par pahunchen";
    default:
      return roadName ? `${roadName} ke raste aage badhen` : "Surakshit sthan ki or badhen";
  }
}

function directionLabelEn(modifier: string) {
  switch (modifier) {
    case "north":
      return "north";
    case "south":
      return "south";
    case "east":
      return "east";
    case "west":
      return "west";
    case "northeast":
      return "northeast";
    case "northwest":
      return "northwest";
    case "southeast":
      return "southeast";
    case "southwest":
      return "southwest";
    default:
      return "";
  }
}

function directionLabelHi(modifier: string) {
  switch (modifier) {
    case "north":
      return "Uttar ki or";
    case "south":
      return "Dakshin ki or";
    case "east":
      return "Purv ki or";
    case "west":
      return "Pashchim ki or";
    case "northeast":
      return "Uttar-purv ki or";
    case "northwest":
      return "Uttar-pashchim ki or";
    case "southeast":
      return "Dakshin-purv ki or";
    case "southwest":
      return "Dakshin-pashchim ki or";
    default:
      return "";
  }
}

function turnLabelEn(modifier: string) {
  switch (modifier) {
    case "left":
    case "right":
    case "sharp left":
    case "sharp right":
    case "slight left":
    case "slight right":
      return modifier;
    case "uturn":
      return "around";
    default:
      return "";
  }
}

function turnLabelHi(modifier: string) {
  switch (modifier) {
    case "left":
      return "baen";
    case "right":
      return "daen";
    case "sharp left":
      return "tez baen";
    case "sharp right":
      return "tez daen";
    case "slight left":
      return "halka baen";
    case "slight right":
      return "halka daen";
    case "uturn":
      return "wapas";
    default:
      return "";
  }
}

function keepLabelEn(modifier: string) {
  switch (modifier) {
    case "left":
    case "right":
      return modifier;
    default:
      return "";
  }
}

function keepLabelHi(modifier: string) {
  switch (modifier) {
    case "left":
      return "baen";
    case "right":
      return "daen";
    default:
      return "";
  }
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
