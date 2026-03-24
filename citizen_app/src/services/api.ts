import { mockCitizen } from "../data/mockCitizen";
import { normalizePhoneNumber } from "../lib/format";
import type {
  ComputedSafeZoneRoute,
  CitizenForecast,
  District,
  LocationStatus,
  LiveWeather,
  MediaReportDeleteResponse,
  MediaReportStatus,
  MediaUploadPayload,
  MediaUploadResponse,
  NearbySafeZone,
  CitizenZoneRisk,
  ElevationProfile,
  EmergencyContact,
  EvacuationRoute,
  ZoneRoadConditions,
  Shelter,
  SubscriptionPayload,
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const LOCAL_DEMO_PATH = "/demo-data/citizen.json";
const DEMO_FALLBACK_ENABLED =
  !API_BASE_URL || import.meta.env.VITE_ALLOW_DEMO_FALLBACK === "true";
let localSnapshot = structuredClone(mockCitizen);
let localSnapshotPromise: Promise<typeof mockCitizen> | null = null;

type BackendZone = {
  zoneId: string;
  zoneName: string;
  districtId: string;
  districtName: string;
  riskScore: number;
  riskLevel: CitizenZoneRisk["risk_level"];
  rainfallMmHr: number;
  predictedAt: string;
};

type BackendLiveWeather = {
  zoneId: string;
  rainfallMmHr: number;
  observedAt: string;
  source: string;
  isStale: boolean;
};

type BackendForecast = {
  zone_id: string;
  current: {
    riskScore?: number;
    risk_score?: number;
    riskLevel?: CitizenZoneRisk["risk_level"];
    risk_level?: CitizenZoneRisk["risk_level"];
    predictedAt?: string;
    predicted_at?: string;
  };
  forecast: Array<{
    horizonHours?: 1 | 2;
    horizon_hours?: 1 | 2;
    riskScore?: number;
    risk_score?: number;
    riskLevel?: CitizenZoneRisk["risk_level"];
    risk_level?: CitizenZoneRisk["risk_level"];
    forecastFor?: string;
    forecast_for?: string;
  }>;
};

type BackendShelter = {
  id: string;
  zoneId: string;
  name: string;
  lat?: number;
  lon?: number;
  capacity: number;
  elevationM?: number;
  distanceKm: number;
  contactNumber: string;
};

type BackendRoute = {
  zoneId: string;
  safeShelterId: string;
  distanceKm: number;
  estimatedMinutes: number;
  instructionSummary: string;
  steps?: string[];
  routeType?: "verified_path" | "fallback";
  bearingDegrees?: number;
  isUphill?: boolean;
  segmentIds?: string[];
  roadStatus?: "open" | "caution" | "blocked" | "flooded";
  cautionSegmentCount?: number;
  blockedSegmentCount?: number;
  elevationGainM?: number;
  elevationLossM?: number;
  valleyExposure?: "low" | "moderate" | "high";
  routeWarnings?: string[];
  pathCategory?: "primary" | "alternate" | "emergency_only";
  avoidsStreams?: boolean;
  hazardNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
};

type BackendRoadConditions = {
  zoneId: string;
  summary: {
    zoneId: string;
    openCount: number;
    cautionCount: number;
    blockedCount: number;
    floodedCount: number;
    worstStatus: ZoneRoadConditions["summary"]["worst_status"];
    updatedAt: string;
  };
  segments: Array<{
    id: string;
    zoneId: string;
    name: string;
    roadClass: "highway" | "connector" | "local";
    priorityRank: number;
    lengthKm: number;
    coordinates: Array<{
      lat: number;
      lon: number;
    }>;
    condition: {
      id: string;
      status: ZoneRoadConditions["summary"]["worst_status"];
      averageSpeedKmph: number;
      delayMinutes: number;
      severityPct: number;
      source: string;
      note: string;
      updatedAt: string;
    };
  }>;
};

type BackendElevationProfile = {
  zoneId: string;
  safeShelterId: string;
  minElevationM: number;
  maxElevationM: number;
  totalAscentM: number;
  totalDescentM: number;
  valleyExposure: ElevationProfile["valley_exposure"];
  recommendedDirectionLabel: string;
  points: Array<{
    distanceKm: number;
    elevationM: number;
    slopeDegrees: number;
  }>;
};

type BackendLocationStatus = {
  userLocation: {
    lat: number;
    lon: number;
    zoneId: string;
    zoneName: string;
    district: string;
  };
  risk: {
    level: CitizenZoneRisk["risk_level"];
    score: number;
    nearestDangerM: number;
    nearestDangerBearing: number;
    dangerDirectionLabel: string;
    nearestDangerZoneId?: string;
    nearestDangerZoneName?: string;
    nearestDangerType?: LocationStatus["risk"]["nearest_danger_type"];
    nearestDangerNote?: string;
  };
  evacuation: {
    recommendedSafeZone: {
      id: string;
      name: string;
      lat: number;
      lon: number;
      elevationM: number;
      capacity: number;
      distanceKm: number;
      bearing: number;
    };
    routeAvailable: boolean;
    route: {
      type: "verified_path" | "fallback";
      distanceKm: number;
      walkTimeMin: number;
      isUphill: boolean;
      steps: string[];
      bearingDegrees: number;
      bearingLabel: string;
    };
    offlineFallback: {
      bearingDegrees: number;
      bearingLabel: string;
      distanceKm: number;
      landmark: string;
    };
  };
  movement: {
    userHeadingDegrees: number | null;
    headingLabel: string;
    movingTowardDanger: boolean;
    safeBearingDegrees: number;
    safeBearingLabel: string;
    dangerBearingDeltaDegrees: number | null;
  };
  warnings: Array<{ type: string; message: string }>;
};

type BackendNearbySafeZone = {
  id: string;
  zoneId: string;
  name: string;
  distanceKm: number;
  walkTimeMin: number;
  elevationM: number;
  isUphillFromUser: boolean;
  capacity: number;
  roadStatus: "open" | "caution" | "unknown";
  routeSummary: string;
  bearingDegrees: number;
};

type BackendComputedSafeZoneRoute = {
  zoneId: string;
  origin: {
    lat: number;
    lon: number;
  };
  destination: {
    id: string;
    name: string;
    lat: number;
    lon: number;
    capacity: number;
    elevationM: number;
  };
  route: {
    source: ComputedSafeZoneRoute["route"]["source"];
    distanceKm: number;
    durationMinutes: number;
    mode: "walking";
    polyline: string;
    coordinates: Array<{
      lat: number;
      lon: number;
    }>;
    steps: Array<{
      instructionHi: string;
      instructionEn: string;
      distanceM: number;
      roadStatus: ComputedSafeZoneRoute["route"]["steps"][number]["road_status"];
    }>;
    warnings: string[];
    blockedRoadsAvoided: string[];
  };
  alternateRoute: {
    distanceKm: number;
    durationMinutes: number;
    coordinates: Array<{
      lat: number;
      lon: number;
    }>;
    warnings: string[];
  } | null;
  fallbackDirections: string;
};

async function loadLocalSnapshot(): Promise<typeof mockCitizen> {
  if (!localSnapshotPromise) {
    localSnapshotPromise = fetch(LOCAL_DEMO_PATH)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Local demo data not found");
        }
        return (await response.json()) as typeof mockCitizen;
      })
      .catch(() => mockCitizen)
      .then((snapshot) => {
        localSnapshot = structuredClone({
          ...mockCitizen,
          ...snapshot,
          road_conditions: snapshot.road_conditions ?? mockCitizen.road_conditions,
          elevation_profiles: snapshot.elevation_profiles ?? mockCitizen.elevation_profiles,
        });
        return localSnapshot;
      });
  }

  return localSnapshotPromise;
}

async function fetchOrMock<T>(path: string, fallback: T): Promise<T> {
  if (!API_BASE_URL) {
    await loadLocalSnapshot();
    return fallback;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`);
    if (!response.ok) {
      throw new Error(`Request failed for ${path}`);
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (!DEMO_FALLBACK_ENABLED) {
      throw error;
    }

    console.warn(`Falling back to local data for ${path}.`, error);
    await loadLocalSnapshot();
    return fallback;
  }
}

function adaptZone(zone: BackendZone): CitizenZoneRisk {
  return {
    zone_id: zone.zoneId,
    zone_name: zone.zoneName,
    district_id: zone.districtId,
    district_name: zone.districtName,
    risk_score: zone.riskScore,
    risk_level: zone.riskLevel,
    rainfall_mm_hr: zone.rainfallMmHr,
    warning_text:
      zone.riskLevel === "DANGER"
        ? "Danger expected. Move toward the recommended shelter now."
        : zone.riskLevel === "WATCH"
          ? "Stay alert and prepare for movement if conditions worsen."
          : "Conditions are stable right now.",
    updated_at: zone.predictedAt,
  };
}

function buildLocalDistricts(): District[] {
  const merged = new Map<string, District>();

  localSnapshot.zones.forEach((zone) => {
    const existing = merged.get(zone.district_id);
    if (existing) {
      existing.zone_count += 1;
      return;
    }

    merged.set(zone.district_id, {
      id: zone.district_id,
      name: zone.district_name,
      zone_count: 1,
    });
  });

  return Array.from(merged.values()).sort((left, right) => left.name.localeCompare(right.name));
}

function adaptForecast(payload: BackendForecast): CitizenForecast {
  return {
    zone_id: payload.zone_id,
    current: {
      risk_score: payload.current.riskScore ?? payload.current.risk_score ?? 0,
      risk_level: payload.current.riskLevel ?? payload.current.risk_level ?? "SAFE",
      predicted_at:
        payload.current.predictedAt ?? payload.current.predicted_at ?? new Date().toISOString(),
    },
    forecast: payload.forecast.map((item) => ({
      horizon_hours: (item.horizonHours ?? item.horizon_hours ?? 1) as 1 | 2,
      risk_score: item.riskScore ?? item.risk_score ?? 0,
      risk_level: item.riskLevel ?? item.risk_level ?? "SAFE",
      forecast_for: item.forecastFor ?? item.forecast_for ?? new Date().toISOString(),
    })),
  };
}

function adaptLiveWeather(payload: BackendLiveWeather | LiveWeather): LiveWeather {
  if ("zoneId" in payload) {
    return {
      zone_id: payload.zoneId,
      rainfall_mm_hr: payload.rainfallMmHr,
      observed_at: payload.observedAt,
      source: payload.source,
      is_stale: payload.isStale
    };
  }

  return payload;
}

function adaptShelter(payload: BackendShelter): Shelter {
  return {
    id: payload.id,
    zone_id: payload.zoneId,
    name: payload.name,
    lat: payload.lat,
    lon: payload.lon,
    capacity: payload.capacity,
    elevation_m: payload.elevationM,
    distance_km: payload.distanceKm,
    contact_number: payload.contactNumber,
  };
}

function adaptRoute(payload: BackendRoute, zoneId: string): EvacuationRoute {
  return {
    zone_id: zoneId,
    safe_shelter_id: payload.safeShelterId,
    distance_km: payload.distanceKm,
    estimated_minutes: payload.estimatedMinutes,
    instruction_summary: payload.instructionSummary,
    steps:
      payload.steps ?? [
        payload.instructionSummary,
        "Avoid the steep or damaged slope edge.",
        "Move directly to the marked shelter point.",
      ],
    segment_ids: payload.segmentIds ?? [],
    road_status: payload.roadStatus ?? "open",
    caution_segment_count: payload.cautionSegmentCount ?? 0,
    blocked_segment_count: payload.blockedSegmentCount ?? 0,
    elevation_gain_m: payload.elevationGainM ?? 0,
    elevation_loss_m: payload.elevationLossM ?? 0,
    valley_exposure: payload.valleyExposure ?? "low",
    route_warnings: payload.routeWarnings ?? [],
    path_category: payload.pathCategory ?? "primary",
    avoids_streams: payload.avoidsStreams ?? false,
    hazard_notes: payload.hazardNotes ?? "",
    verified_by: payload.verifiedBy,
    verified_at: payload.verifiedAt,
  };
}

function adaptRouteFromLocal(payload: EvacuationRoute): EvacuationRoute {
  return payload;
}

function adaptRoadConditions(payload: BackendRoadConditions): ZoneRoadConditions {
  return {
    zone_id: payload.zoneId,
    summary: {
      zone_id: payload.summary.zoneId,
      open_count: payload.summary.openCount,
      caution_count: payload.summary.cautionCount,
      blocked_count: payload.summary.blockedCount,
      flooded_count: payload.summary.floodedCount,
      worst_status: payload.summary.worstStatus,
      updated_at: payload.summary.updatedAt,
    },
    segments: payload.segments.map((segment) => ({
      id: segment.id,
      zone_id: segment.zoneId,
      name: segment.name,
      road_class: segment.roadClass,
      priority_rank: segment.priorityRank,
      length_km: segment.lengthKm,
      coordinates: segment.coordinates,
      condition: {
        id: segment.condition.id,
        status: segment.condition.status,
        average_speed_kmph: segment.condition.averageSpeedKmph,
        delay_minutes: segment.condition.delayMinutes,
        severity_pct: segment.condition.severityPct,
        source: segment.condition.source,
        note: segment.condition.note,
        updated_at: segment.condition.updatedAt,
      },
    })),
  };
}

function adaptElevationProfile(payload: BackendElevationProfile): ElevationProfile {
  return {
    zone_id: payload.zoneId,
    safe_shelter_id: payload.safeShelterId,
    min_elevation_m: payload.minElevationM,
    max_elevation_m: payload.maxElevationM,
    total_ascent_m: payload.totalAscentM,
    total_descent_m: payload.totalDescentM,
    valley_exposure: payload.valleyExposure,
    recommended_direction_label: payload.recommendedDirectionLabel,
    points: payload.points.map((point) => ({
      distance_km: point.distanceKm,
      elevation_m: point.elevationM,
      slope_degrees: point.slopeDegrees,
    })),
  };
}

function adaptLocationStatus(payload: BackendLocationStatus): LocationStatus {
  return {
    user_location: {
      lat: payload.userLocation.lat,
      lon: payload.userLocation.lon,
      zone_id: payload.userLocation.zoneId,
      zone_name: payload.userLocation.zoneName,
      district: payload.userLocation.district,
    },
    risk: {
      level: payload.risk.level,
      score: payload.risk.score,
      nearest_danger_m: payload.risk.nearestDangerM,
      nearest_danger_bearing: payload.risk.nearestDangerBearing,
      danger_direction_label: payload.risk.dangerDirectionLabel,
      nearest_danger_zone_id: payload.risk.nearestDangerZoneId,
      nearest_danger_zone_name: payload.risk.nearestDangerZoneName,
      nearest_danger_type: payload.risk.nearestDangerType,
      nearest_danger_note: payload.risk.nearestDangerNote,
    },
    evacuation: {
      recommended_safe_zone: {
        id: payload.evacuation.recommendedSafeZone.id,
        name: payload.evacuation.recommendedSafeZone.name,
        lat: payload.evacuation.recommendedSafeZone.lat,
        lon: payload.evacuation.recommendedSafeZone.lon,
        elevation_m: payload.evacuation.recommendedSafeZone.elevationM,
        capacity: payload.evacuation.recommendedSafeZone.capacity,
        distance_km: payload.evacuation.recommendedSafeZone.distanceKm,
        bearing: payload.evacuation.recommendedSafeZone.bearing,
      },
      route_available: payload.evacuation.routeAvailable,
      route: {
        type: payload.evacuation.route.type,
        distance_km: payload.evacuation.route.distanceKm,
        walk_time_min: payload.evacuation.route.walkTimeMin,
        is_uphill: payload.evacuation.route.isUphill,
        steps: payload.evacuation.route.steps,
        bearing_degrees: payload.evacuation.route.bearingDegrees,
        bearing_label: payload.evacuation.route.bearingLabel,
      },
      offline_fallback: {
        bearing_degrees: payload.evacuation.offlineFallback.bearingDegrees,
        bearing_label: payload.evacuation.offlineFallback.bearingLabel,
        distance_km: payload.evacuation.offlineFallback.distanceKm,
        landmark: payload.evacuation.offlineFallback.landmark,
      },
    },
    movement: {
      user_heading_degrees: payload.movement.userHeadingDegrees,
      heading_label: payload.movement.headingLabel,
      moving_toward_danger: payload.movement.movingTowardDanger,
      safe_bearing_degrees: payload.movement.safeBearingDegrees,
      safe_bearing_label: payload.movement.safeBearingLabel,
      danger_bearing_delta_degrees: payload.movement.dangerBearingDeltaDegrees,
    },
    warnings: payload.warnings,
  };
}

function adaptNearbySafeZone(payload: BackendNearbySafeZone): NearbySafeZone {
  return {
    id: payload.id,
    zone_id: payload.zoneId,
    name: payload.name,
    distance_km: payload.distanceKm,
    walk_time_min: payload.walkTimeMin,
    elevation_m: payload.elevationM,
    is_uphill_from_user: payload.isUphillFromUser,
    capacity: payload.capacity,
    road_status: payload.roadStatus,
    route_summary: payload.routeSummary,
    bearing_degrees: payload.bearingDegrees,
  };
}

function adaptComputedSafeZoneRoute(payload: BackendComputedSafeZoneRoute): ComputedSafeZoneRoute {
  return {
    zone_id: payload.zoneId,
    origin: payload.origin,
    destination: {
      id: payload.destination.id,
      name: payload.destination.name,
      lat: payload.destination.lat,
      lon: payload.destination.lon,
      capacity: payload.destination.capacity,
      elevation_m: payload.destination.elevationM,
    },
    route: {
      source: payload.route.source,
      distance_km: payload.route.distanceKm,
      duration_minutes: payload.route.durationMinutes,
      mode: payload.route.mode,
      polyline: payload.route.polyline,
      coordinates: payload.route.coordinates,
      steps: payload.route.steps.map((step) => ({
        instruction_hi: step.instructionHi,
        instruction_en: step.instructionEn,
        distance_m: step.distanceM,
        road_status: step.roadStatus,
      })),
      warnings: payload.route.warnings,
      blocked_roads_avoided: payload.route.blockedRoadsAvoided,
    },
    alternate_route: payload.alternateRoute
      ? {
          distance_km: payload.alternateRoute.distanceKm,
          duration_minutes: payload.alternateRoute.durationMinutes,
          coordinates: payload.alternateRoute.coordinates,
          warnings: payload.alternateRoute.warnings,
        }
      : null,
    fallback_directions: payload.fallbackDirections,
  };
}

function buildLocalComputedSafeZoneRoute(
  zoneId: string,
  origin: { lat: number; lon: number }
): ComputedSafeZoneRoute {
  const localRoute = localSnapshot.routes.find((item) => item.zone_id === zoneId);
  const localShelter =
    localSnapshot.shelters.find((item) => item.id === localRoute?.safe_shelter_id) ??
    localSnapshot.shelters.find((item) => item.zone_id === zoneId);
  const roadConditions = localSnapshot.road_conditions?.[zoneId];
  const coordinates =
    localRoute?.segment_ids?.flatMap((segmentId) => {
      const segment = roadConditions?.segments.find((item) => item.id === segmentId);
      return segment?.coordinates ?? [];
    }) ?? [];
  const destination = {
    id: localShelter?.id ?? "unavailable",
    name: localShelter?.name ?? "Safe shelter",
    lat: localSnapshot.locationStatus?.evacuation.recommended_safe_zone.lat ?? origin.lat,
    lon: localSnapshot.locationStatus?.evacuation.recommended_safe_zone.lon ?? origin.lon,
    capacity: localShelter?.capacity ?? 0,
    elevation_m: localSnapshot.locationStatus?.evacuation.recommended_safe_zone.elevation_m ?? 0,
  };

  return {
    zone_id: zoneId,
    origin,
    destination,
    route: {
      source: localRoute ? "osrm_public_api" : "published_path_fallback",
      distance_km: localRoute?.distance_km ?? 0,
      duration_minutes: localRoute?.estimated_minutes ?? 0,
      mode: "walking",
      polyline: "",
      coordinates: coordinates.length
        ? coordinates
        : [origin, { lat: destination.lat, lon: destination.lon }],
      steps:
        localRoute?.steps.map((step) => ({
          instruction_hi: step,
          instruction_en: step,
          distance_m: Math.max(50, Math.round(((localRoute.distance_km || 1) * 1000) / Math.max(localRoute.steps.length, 1))),
          road_status: localRoute.road_status ?? "open",
        })) ?? [],
      warnings: localRoute?.route_warnings ?? [],
      blocked_roads_avoided:
        roadConditions?.segments
          .filter((segment) => segment.condition.status === "blocked" || segment.condition.status === "flooded")
          .map((segment) => segment.name) ?? [],
    },
    alternate_route: null,
    fallback_directions: localRoute?.instruction_summary ?? "Follow the marked safe-route directions.",
  };
}

export async function getZones(): Promise<CitizenZoneRisk[]> {
  await loadLocalSnapshot();

  if (!API_BASE_URL) {
    return localSnapshot.zones;
  }

  const zones = await fetchOrMock<BackendZone[]>(
    "/api/zones/risk",
    localSnapshot.zones.map((zone) => ({
      zoneId: zone.zone_id,
      zoneName: zone.zone_name,
      districtId: zone.district_id,
      districtName: zone.district_name,
      riskScore: zone.risk_score,
      riskLevel: zone.risk_level,
      rainfallMmHr: zone.rainfall_mm_hr,
      predictedAt: zone.updated_at,
    }))
  );

  return zones.length ? zones.map(adaptZone) : localSnapshot.zones;
}

export async function getDistricts(): Promise<District[]> {
  await loadLocalSnapshot();

  if (!API_BASE_URL) {
    return buildLocalDistricts();
  }

  const [districts, zones] = await Promise.all([
    fetchOrMock<Array<{ id: string; name: string; zoneCount?: number; zone_count?: number }>>(
      "/api/districts",
      []
    ),
    fetchOrMock<BackendZone[]>("/api/zones/risk", [])
  ]);

  const merged = new Map<string, District>();

  districts.forEach((item) => {
    merged.set(item.id, {
      id: item.id,
      name: item.name,
      zone_count: item.zoneCount ?? item.zone_count ?? 0,
    });
  });

  zones.forEach((zone) => {
    const zoneCount = zones.filter((item) => item.districtId === zone.districtId).length;
    const existing = merged.get(zone.districtId);

    if (existing) {
      existing.zone_count = Math.max(existing.zone_count, zoneCount);
      return;
    }

    merged.set(zone.districtId, {
      id: zone.districtId,
      name: zone.districtName,
      zone_count: zoneCount,
    });
  });

  return Array.from(merged.values()).sort((left, right) => left.name.localeCompare(right.name));
}

export async function getForecast(zoneId: string): Promise<CitizenForecast> {
  await loadLocalSnapshot();

  if (!API_BASE_URL) {
    return localSnapshot.forecasts[zoneId];
  }

  const payload = await fetchOrMock<BackendForecast>(
    `/api/zones/${zoneId}/forecast`,
    localSnapshot.forecasts[zoneId]
  );

  return adaptForecast(payload);
}

export async function getShelters(zoneId: string): Promise<Shelter[]> {
  await loadLocalSnapshot();
  const localShelters = localSnapshot.shelters.filter((item) => item.zone_id === zoneId);

  if (!API_BASE_URL) {
    return localShelters;
  }

  const payload = await fetchOrMock<BackendShelter[]>(
    `/api/safe-shelters?zone_id=${zoneId}`,
    localShelters.map((item) => ({
      id: item.id,
      zoneId: item.zone_id,
      name: item.name,
      capacity: item.capacity,
      distanceKm: item.distance_km,
      contactNumber: item.contact_number,
    }))
  );

  return payload.length ? payload.map(adaptShelter) : localShelters;
}

export async function getRoute(zoneId: string): Promise<EvacuationRoute> {
  await loadLocalSnapshot();
  const localRoute = localSnapshot.routes.find((item) => item.zone_id === zoneId);

  if (!API_BASE_URL) {
    if (!localRoute) {
      throw new Error(`Missing route for ${zoneId}`);
    }

    return localRoute;
  }

  const payload = await fetchOrMock<BackendRoute | EvacuationRoute>(
    `/api/evacuation-routes?zone_id=${zoneId}`,
    localRoute ?? {
      zone_id: zoneId,
      safe_shelter_id: "unavailable",
      distance_km: 0,
      estimated_minutes: 0,
      instruction_summary: "Route details are not available yet.",
      steps: [
        "Route details are not available yet.",
        "Follow district instructions and move toward the nearest shelter.",
        "Avoid steep edges and unstable roadside sections."
      ]
    }
  );

  return "zoneId" in payload ? adaptRoute(payload, zoneId) : adaptRouteFromLocal(payload);
}

export async function getRoadConditions(zoneId: string): Promise<ZoneRoadConditions> {
  await loadLocalSnapshot();
  const localRoadConditions = localSnapshot.road_conditions?.[zoneId];
  const fallbackRoadConditions: ZoneRoadConditions = localRoadConditions ?? {
    zone_id: zoneId,
    summary: {
      zone_id: zoneId,
      open_count: 0,
      caution_count: 0,
      blocked_count: 0,
      flooded_count: 0,
      worst_status: "open",
      updated_at: new Date().toISOString(),
    },
    segments: [],
  };

  if (!API_BASE_URL) {
    return fallbackRoadConditions;
  }

  const payload = await fetchOrMock<BackendRoadConditions | ZoneRoadConditions>(
    `/api/zones/${zoneId}/road-conditions`,
    fallbackRoadConditions
  );

  return "zoneId" in payload ? adaptRoadConditions(payload) : payload;
}

export async function getLiveWeather(zoneId: string): Promise<LiveWeather> {
  await loadLocalSnapshot();
  const fallbackWeather = localSnapshot.liveWeather?.[zoneId] ?? {
    zone_id: zoneId,
    rainfall_mm_hr: 0,
    observed_at: new Date().toISOString(),
    source: "demo-fallback",
    is_stale: true
  };

  if (!API_BASE_URL) {
    return fallbackWeather;
  }

  const payload = await fetchOrMock<BackendLiveWeather | LiveWeather>(
    `/api/weather/live?zone_id=${zoneId}`,
    fallbackWeather
  );

  return adaptLiveWeather(payload);
}

export async function getElevationProfile(zoneId: string): Promise<ElevationProfile> {
  await loadLocalSnapshot();
  const localProfile = localSnapshot.elevation_profiles?.[zoneId];
  const fallbackProfile: ElevationProfile = localProfile ?? {
    zone_id: zoneId,
    safe_shelter_id: "unavailable",
    min_elevation_m: 0,
    max_elevation_m: 0,
    total_ascent_m: 0,
    total_descent_m: 0,
    valley_exposure: "low",
    recommended_direction_label: "Elevation context is not available yet.",
    points: [
      { distance_km: 0, elevation_m: 0, slope_degrees: 0 },
      { distance_km: 1, elevation_m: 0, slope_degrees: 0 },
    ],
  };

  if (!API_BASE_URL) {
    return fallbackProfile;
  }

  const payload = await fetchOrMock<BackendElevationProfile | ElevationProfile>(
    `/api/zones/${zoneId}/elevation-profile`,
    fallbackProfile
  );

  return "zoneId" in payload ? adaptElevationProfile(payload) : payload;
}

export async function getEmergencyContacts(): Promise<EmergencyContact[]> {
  await loadLocalSnapshot();
  return localSnapshot.emergencyContacts;
}

export async function getLocationStatus(
  lat: number,
  lon: number,
  lang: string,
  headingDegrees?: number
): Promise<LocationStatus> {
  await loadLocalSnapshot();

  if (!API_BASE_URL) {
    return localSnapshot.locationStatus as LocationStatus;
  }

  const fallback = localSnapshot.locationStatus;
  if (!fallback) {
    throw new Error("Location status is not available.");
  }

  const payload = await fetchOrMock<BackendLocationStatus>(
    `/api/location/status?lat=${lat}&lon=${lon}&lang=${encodeURIComponent(lang)}${
      typeof headingDegrees === "number" ? `&heading_degrees=${headingDegrees}` : ""
    }`,
    {
      userLocation: {
        lat: fallback.user_location.lat,
        lon: fallback.user_location.lon,
        zoneId: fallback.user_location.zone_id,
        zoneName: fallback.user_location.zone_name,
        district: fallback.user_location.district,
      },
      risk: {
        level: fallback.risk.level,
        score: fallback.risk.score,
        nearestDangerM: fallback.risk.nearest_danger_m,
        nearestDangerBearing: fallback.risk.nearest_danger_bearing,
        dangerDirectionLabel: fallback.risk.danger_direction_label,
        nearestDangerZoneId: fallback.risk.nearest_danger_zone_id,
        nearestDangerZoneName: fallback.risk.nearest_danger_zone_name,
        nearestDangerType: fallback.risk.nearest_danger_type,
        nearestDangerNote: fallback.risk.nearest_danger_note,
      },
      evacuation: {
        recommendedSafeZone: {
          id: fallback.evacuation.recommended_safe_zone.id,
          name: fallback.evacuation.recommended_safe_zone.name,
          lat: fallback.evacuation.recommended_safe_zone.lat,
          lon: fallback.evacuation.recommended_safe_zone.lon,
          elevationM: fallback.evacuation.recommended_safe_zone.elevation_m,
          capacity: fallback.evacuation.recommended_safe_zone.capacity,
          distanceKm: fallback.evacuation.recommended_safe_zone.distance_km,
          bearing: fallback.evacuation.recommended_safe_zone.bearing,
        },
        routeAvailable: fallback.evacuation.route_available,
        route: {
          type: fallback.evacuation.route.type,
          distanceKm: fallback.evacuation.route.distance_km,
          walkTimeMin: fallback.evacuation.route.walk_time_min,
          isUphill: fallback.evacuation.route.is_uphill,
          steps: fallback.evacuation.route.steps,
          bearingDegrees: fallback.evacuation.route.bearing_degrees,
          bearingLabel: fallback.evacuation.route.bearing_label,
        },
        offlineFallback: {
          bearingDegrees: fallback.evacuation.offline_fallback.bearing_degrees,
          bearingLabel: fallback.evacuation.offline_fallback.bearing_label,
          distanceKm: fallback.evacuation.offline_fallback.distance_km,
          landmark: fallback.evacuation.offline_fallback.landmark,
        },
      },
      movement: {
        userHeadingDegrees: fallback.movement.user_heading_degrees,
        headingLabel: fallback.movement.heading_label,
        movingTowardDanger: fallback.movement.moving_toward_danger,
        safeBearingDegrees: fallback.movement.safe_bearing_degrees,
        safeBearingLabel: fallback.movement.safe_bearing_label,
        dangerBearingDeltaDegrees: fallback.movement.danger_bearing_delta_degrees,
      },
      warnings: fallback.warnings,
    }
  );

  return adaptLocationStatus(payload);
}

export async function getNearbySafeZones(
  lat: number,
  lon: number,
  radiusKm = 5
): Promise<NearbySafeZone[]> {
  await loadLocalSnapshot();

  if (!API_BASE_URL) {
    return localSnapshot.nearbySafeZones ?? [];
  }

  const payload = await fetchOrMock<{ safeZones: BackendNearbySafeZone[] }>(
    `/api/location/nearby-safe-zones?lat=${lat}&lon=${lon}&radius_km=${radiusKm}`,
    {
      safeZones: (localSnapshot.nearbySafeZones ?? []).map((item) => ({
        id: item.id,
        zoneId: item.zone_id,
        name: item.name,
        distanceKm: item.distance_km,
        walkTimeMin: item.walk_time_min,
        elevationM: item.elevation_m,
        isUphillFromUser: item.is_uphill_from_user,
        capacity: item.capacity,
        roadStatus: item.road_status,
        routeSummary: item.route_summary,
        bearingDegrees: item.bearing_degrees,
      })),
    }
  );

  return payload.safeZones.map(adaptNearbySafeZone);
}

export async function getComputedSafeZoneRoute(
  zoneId: string,
  lat: number,
  lon: number,
  language: string
): Promise<ComputedSafeZoneRoute> {
  await loadLocalSnapshot();
  const localRoute = buildLocalComputedSafeZoneRoute(zoneId, { lat, lon });

  if (!API_BASE_URL) {
    return localRoute;
  }

  const payload = await fetchOrMock<BackendComputedSafeZoneRoute | ComputedSafeZoneRoute>(
    `/api/safe-zones/${zoneId}/route?from_lat=${lat}&from_lon=${lon}&lang=${encodeURIComponent(language)}`,
    localRoute
  );

  return "zoneId" in payload ? adaptComputedSafeZoneRoute(payload) : payload;
}

export async function subscribeCitizen(payload: SubscriptionPayload): Promise<{
  ok: boolean;
  subscription_status: string;
}> {
  const normalizedPhoneNumber = normalizePhoneNumber(payload.phone_number);

  if (!API_BASE_URL) {
    return {
      ok: true,
      subscription_status: "ACTIVE",
    };
  }

  const response = await fetch(`${API_BASE_URL}/api/subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phoneNumber: normalizedPhoneNumber,
      zoneId: payload.zone_id,
      channels: payload.channels,
      appLanguage: payload.app_language,
      alertLanguage: payload.alert_language,
    }),
  });

  if (!response.ok) {
    let message = "Subscription failed";

    try {
      const errorPayload = (await response.json()) as { message?: string };
      if (errorPayload.message) {
        message = errorPayload.message;
      }
    } catch {
      // Ignore JSON parsing errors and keep the generic message.
    }

    throw new Error(message);
  }

  return response.json() as Promise<{ ok: boolean; subscription_status: string }>;
}

export async function uploadMediaReport(payload: MediaUploadPayload): Promise<MediaUploadResponse> {
  await loadLocalSnapshot();

  if (!API_BASE_URL) {
    return {
      report_id: "local-report-demo",
      status: "verified",
      zone_id: localSnapshot.locationStatus?.user_location.zone_id ?? "zone-joshimath-core",
      zone_name: localSnapshot.locationStatus?.user_location.zone_name ?? "Joshimath Core",
      message: "Your report was verified and shared with officials.",
      estimated_review_minutes: 5,
    };
  }

  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("lat", String(payload.lat));
  formData.append("lon", String(payload.lon));
  formData.append("language", payload.language);

  if (typeof payload.accuracy_m === "number") {
    formData.append("accuracy_m", String(payload.accuracy_m));
  }
  if (payload.description) {
    formData.append("description", payload.description);
  }
  if (payload.phone_hash) {
    formData.append("phone_hash", payload.phone_hash);
  }
  if (payload.device_timestamp) {
    formData.append("device_timestamp", payload.device_timestamp);
  }

  const response = await fetch(`${API_BASE_URL}/api/reports/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = "Report upload failed";

    try {
      const errorPayload = (await response.json()) as { message?: string };
      if (errorPayload.message) {
        message = errorPayload.message;
      }
    } catch {
      // Keep generic message.
    }

    throw new Error(message);
  }

  return response.json() as Promise<MediaUploadResponse>;
}

export async function getMediaReportStatus(reportId: string): Promise<MediaReportStatus> {
  await loadLocalSnapshot();

  if (!API_BASE_URL) {
    if (!localSnapshot.recentMediaStatus) {
      throw new Error("No report status available.");
    }

    return localSnapshot.recentMediaStatus;
  }

  const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/status`);
  if (!response.ok) {
    throw new Error("Failed to load report status");
  }

  return response.json() as Promise<MediaReportStatus>;
}

export async function deleteMediaReport(
  reportId: string,
  phoneHash: string
): Promise<MediaReportDeleteResponse> {
  await loadLocalSnapshot();

  if (!API_BASE_URL) {
    localSnapshot = {
      ...localSnapshot,
      recentMediaStatus: undefined
    };

    return {
      ok: true,
      report_id: reportId,
      deleted: true,
      message: "Your media report was removed."
    };
  }

  const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      phone_hash: phoneHash
    })
  });

  if (!response.ok) {
    let message = "Failed to delete report";

    try {
      const errorPayload = (await response.json()) as { message?: string };
      if (errorPayload.message) {
        message = errorPayload.message;
      }
    } catch {
      // Keep generic message.
    }

    throw new Error(message);
  }

  return response.json() as Promise<MediaReportDeleteResponse>;
}
