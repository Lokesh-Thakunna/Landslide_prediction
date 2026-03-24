import { mockDashboard } from "../data/mockDashboard";
import { scoreToRiskLevel } from "../lib/risk";
import type {
  AlertLog,
  AlertPreview,
  DangerZone,
  DistrictBoundary,
  DashboardSnapshot,
  DashboardMediaReportsResponse,
  District,
  ElevationProfile,
  EvacuationPathPayload,
  EvacuationRoute,
  Hotspot,
  LiveWeather,
  LocalizedAlertMessage,
  ManualAlertPayload,
  MediaReport,
  MediaReportAssets,
  ZoneRoadConditions,
  Shelter,
  ZoneForecast,
  ZoneRisk,
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const LOCAL_DEMO_PATH = "/demo-data/dashboard.json";

let localSnapshot: DashboardSnapshot = structuredClone(mockDashboard);
let localSnapshotPromise: Promise<DashboardSnapshot> | null = null;
let authToken: string | null = null;

type BackendZoneRisk = {
  zoneId: string;
  zoneName: string;
  districtId: string;
  districtName: string;
  centroidLat?: number;
  centroidLon?: number;
  riskScore: number;
  riskLevel: ZoneRisk["risk_level"];
  rainfallMmHr: number;
  soilMoistureProxyPct: number;
  groundMovementProxyPct: number;
  predictedAt: string;
  isStale: boolean;
};

type BackendLiveWeather = {
  zoneId: string;
  rainfallMmHr: number;
  observedAt: string;
  source: string;
  isStale: boolean;
};

type BackendDistrictBoundary = {
  districtId: string;
  districtName: string;
  center: {
    lat: number;
    lon: number;
  };
  polygons: Array<
    Array<{
      lat: number;
      lon: number;
    }>
  >;
};

type BackendForecast = {
  zone_id: string;
  current: {
    riskScore?: number;
    risk_score?: number;
    riskLevel?: ZoneRisk["risk_level"];
    risk_level?: ZoneRisk["risk_level"];
    predictedAt?: string;
    predicted_at?: string;
  };
  forecast: Array<{
    horizonHours?: 1 | 2;
    horizon_hours?: 1 | 2;
    riskScore?: number;
    risk_score?: number;
    riskLevel?: ZoneRisk["risk_level"];
    risk_level?: ZoneRisk["risk_level"];
    forecastFor?: string;
    forecast_for?: string;
  }>;
  top_features?: string[];
  topFeatures?: string[];
};

type BackendHotspot = {
  zoneId: string;
  zoneName: string;
  districtName: string;
  riskScore: number;
  riskLevel: ZoneRisk["risk_level"];
  trend: "steady" | "rising" | "falling";
  nextHorizonLevel?: ZoneRisk["risk_level"];
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

type BackendAlert = {
  id: string;
  zoneId: string;
  zoneName: string;
  riskLevel: ZoneRisk["risk_level"];
  triggerSource: "AUTO_CURRENT" | "AUTO_FORECAST" | "MANUAL";
  channels: Array<"SMS" | "WHATSAPP">;
  recipientCount: number;
  deliveryStatus: "SIMULATED" | "QUEUED" | "DELIVERED" | "FAILED" | "PARTIAL";
  localizedMessages?: Array<{
    language: string;
    languageLabel: string;
    subscriberCount: number;
    smsBody: string;
    whatsappBody: string;
    smsCharacterCount?: number;
    smsCharacterLimit?: number;
    smsWithinLimit?: boolean;
  }>;
  createdAt: string;
};

type BackendDangerZone = {
  id: string;
  zoneId: string;
  name: string;
  type: DangerZone["type"];
  severity: DangerZone["severity"];
  source: string;
  note: string;
  updatedAt: string;
  active: boolean;
  polygon: Array<{
    lat: number;
    lon: number;
  }>;
};

type BackendAlertPreview = {
  zoneId: string;
  zoneName: string;
  riskLevel: ZoneRisk["risk_level"];
  totalSubscribers: number;
  localizedMessages: Array<{
    language: string;
    languageLabel: string;
    subscriberCount: number;
    smsBody: string;
    whatsappBody: string;
    smsCharacterCount?: number;
    smsCharacterLimit?: number;
    smsWithinLimit?: boolean;
  }>;
  notes: string[];
};

type BackendMediaReport = {
  id: string;
  zoneId: string;
  zoneName: string;
  districtId: string;
  mediaType: "photo" | "video";
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  lat: number;
  lon: number;
  accuracyMeters: number | null;
  deviceTimestamp: string;
  serverReceivedAt: string;
  description: string;
  language: MediaReport["language"];
  verificationStatus: MediaReport["verification_status"];
  verificationScore: number | null;
  aiLabels: string[];
  aiFlags: string[];
  privacyStatus?: NonNullable<MediaReport["privacy_status"]>;
  faceBlurApplied?: boolean;
  storageProvider?: NonNullable<MediaReport["storage_provider"]>;
  storageBucket?: string | null;
  storageObjectPath?: string | null;
  thumbnailBucket?: string | null;
  thumbnailObjectPath?: string | null;
  duplicateHash: string;
  reviewNotes: string;
  reviewedAt: string | null;
  riskBoostApplied: boolean;
  riskBoostAmount: number;
  riskBoostExpiresAt?: string | null;
  verificationBreakdown?: {
    components: Array<{
      key: "evidence" | "freshness" | "location";
      label: string;
      score: number;
      weight: number;
      weightedScore: number;
      note: string;
    }>;
    totalScore: number;
    needsManualReview: boolean;
    summary: string;
  } | null;
  uploadedByPhoneHash?: string;
};

async function loadLocalSnapshot(): Promise<DashboardSnapshot> {
  if (!localSnapshotPromise) {
    localSnapshotPromise = fetch(LOCAL_DEMO_PATH)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Local demo data not found");
        }
        return (await response.json()) as DashboardSnapshot;
      })
      .catch(() => mockDashboard)
      .then((snapshot) => {
        localSnapshot = structuredClone({
          ...mockDashboard,
          ...snapshot,
          district_boundaries: snapshot.district_boundaries ?? mockDashboard.district_boundaries,
          danger_zones: snapshot.danger_zones ?? mockDashboard.danger_zones,
          road_conditions: snapshot.road_conditions ?? mockDashboard.road_conditions,
          elevation_profiles: snapshot.elevation_profiles ?? mockDashboard.elevation_profiles,
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

  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed for ${path}`);
  }

  return response.json() as Promise<T>;
}

function adaptZone(zone: BackendZoneRisk, index: number): ZoneRisk {
  const fallbackCoordinates = [30.5 + index * 0.08, 79.4 - index * 0.12] as [number, number];
  const coordinates =
    typeof zone.centroidLat === "number" && typeof zone.centroidLon === "number"
      ? ([zone.centroidLat, zone.centroidLon] as [number, number])
      : fallbackCoordinates;

  return {
    zone_id: zone.zoneId,
    zone_name: zone.zoneName,
    district_id: zone.districtId,
    district_name: zone.districtName,
    risk_score: zone.riskScore,
    risk_level: zone.riskLevel,
    rainfall_mm_hr: zone.rainfallMmHr,
    rainfall_6h_avg_mm_hr: Number((zone.rainfallMmHr * 0.9).toFixed(1)),
    rainfall_24h_total_mm: Number((zone.rainfallMmHr * 8).toFixed(1)),
    soil_moisture_proxy_pct: zone.soilMoistureProxyPct,
    ground_movement_proxy_pct: zone.groundMovementProxyPct,
    slope_degrees: 35 + index,
    historical_landslide_frequency: 5 + index,
    predicted_at: zone.predictedAt,
    is_stale: zone.isStale,
    coordinates,
    polygon: [],
  };
}

function adaptForecast(payload: BackendForecast): ZoneForecast {
  return {
    zone_id: payload.zone_id,
    current: {
      risk_score: payload.current.riskScore ?? payload.current.risk_score ?? 0,
      risk_level:
        payload.current.riskLevel ?? payload.current.risk_level ?? "SAFE",
      predicted_at:
        payload.current.predictedAt ?? payload.current.predicted_at ?? new Date().toISOString(),
    },
    forecast: payload.forecast.map((item) => ({
      horizon_hours: (item.horizonHours ?? item.horizon_hours ?? 1) as 1 | 2,
      risk_score: item.riskScore ?? item.risk_score ?? 0,
      risk_level: item.riskLevel ?? item.risk_level ?? "SAFE",
      forecast_for: item.forecastFor ?? item.forecast_for ?? new Date().toISOString(),
    })),
    top_features: payload.topFeatures ?? payload.top_features ?? [],
  };
}

function adaptHotspot(payload: BackendHotspot, zones: ZoneRisk[]): Hotspot {
  const zone = zones.find((item) => item.zone_id === payload.zoneId);
  return {
    zone_id: payload.zoneId,
    risk_score: payload.riskScore,
    risk_level: payload.riskLevel,
    trend: payload.trend,
    next_horizon_level: payload.nextHorizonLevel ?? payload.riskLevel,
    district_id: zone?.district_id ?? "unknown",
  };
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

function adaptRoute(payload: BackendRoute): EvacuationRoute {
  return {
    zone_id: payload.zoneId,
    safe_shelter_id: payload.safeShelterId,
    distance_km: payload.distanceKm,
    estimated_minutes: payload.estimatedMinutes,
    instruction_summary: payload.instructionSummary,
    steps: payload.steps ?? [],
    is_uphill: payload.isUphill ?? false,
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

function adaptAlert(payload: BackendAlert): AlertLog {
  return {
    id: payload.id,
    zone_id: payload.zoneId,
    zone_name: payload.zoneName,
    risk_level: payload.riskLevel,
    trigger_source: payload.triggerSource === "MANUAL" ? "MANUAL_OPERATOR" : "AUTO_FORECAST",
    channels: payload.channels,
    recipient_count: payload.recipientCount,
    delivery_status: payload.deliveryStatus,
    localized_messages: payload.localizedMessages?.map(adaptLocalizedMessage),
    created_at: payload.createdAt,
  };
}

function adaptLocalizedMessage(payload: {
  language: string;
  languageLabel: string;
  subscriberCount: number;
  smsBody: string;
  whatsappBody: string;
  smsCharacterCount?: number;
  smsCharacterLimit?: number;
  smsWithinLimit?: boolean;
}): LocalizedAlertMessage {
  return {
    language: payload.language as LocalizedAlertMessage["language"],
    language_label: payload.languageLabel,
    subscriber_count: payload.subscriberCount,
    sms_body: payload.smsBody,
    whatsapp_body: payload.whatsappBody,
    sms_character_count: payload.smsCharacterCount ?? Array.from(payload.smsBody).length,
    sms_character_limit: payload.smsCharacterLimit ?? 160,
    sms_within_limit:
      payload.smsWithinLimit ?? Array.from(payload.smsBody).length <= 160
  };
}

function adaptAlertPreview(payload: BackendAlertPreview): AlertPreview {
  return {
    zone_id: payload.zoneId,
    zone_name: payload.zoneName,
    risk_level: payload.riskLevel,
    total_subscribers: payload.totalSubscribers,
    localized_messages: payload.localizedMessages.map(adaptLocalizedMessage),
    notes: payload.notes
  };
}

function adaptDangerZone(payload: BackendDangerZone): DangerZone {
  return {
    id: payload.id,
    zone_id: payload.zoneId,
    name: payload.name,
    type: payload.type,
    severity: payload.severity,
    source: payload.source,
    note: payload.note,
    updated_at: payload.updatedAt,
    active: payload.active,
    polygon: payload.polygon,
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

function adaptMediaReport(payload: BackendMediaReport): MediaReport {
  return {
    id: payload.id,
    zone_id: payload.zoneId,
    zone_name: payload.zoneName,
    district_id: payload.districtId,
    media_type: payload.mediaType,
    file_name: payload.fileName,
    mime_type: payload.mimeType,
    file_size_bytes: payload.fileSizeBytes,
    lat: payload.lat,
    lon: payload.lon,
    accuracy_meters: payload.accuracyMeters,
    device_timestamp: payload.deviceTimestamp,
    server_received_at: payload.serverReceivedAt,
    description: payload.description,
    language: payload.language,
    verification_status: payload.verificationStatus,
    verification_score: payload.verificationScore,
    ai_labels: payload.aiLabels,
    ai_flags: payload.aiFlags,
    privacy_status: payload.privacyStatus ?? (payload.aiFlags.includes("face_blur_recommended") ? "blur_recommended" : "clear"),
    face_blur_applied: payload.faceBlurApplied ?? false,
    storage_provider: payload.storageProvider ?? null,
    storage_bucket: payload.storageBucket ?? null,
    storage_object_path: payload.storageObjectPath ?? null,
    thumbnail_bucket: payload.thumbnailBucket ?? null,
    thumbnail_object_path: payload.thumbnailObjectPath ?? null,
    duplicate_hash: payload.duplicateHash,
    review_notes: payload.reviewNotes,
    reviewed_at: payload.reviewedAt,
    risk_boost_applied: payload.riskBoostApplied,
    risk_boost_amount: payload.riskBoostAmount,
    risk_boost_expires_at: payload.riskBoostExpiresAt ?? null,
    verification_breakdown: payload.verificationBreakdown
      ? {
          components: payload.verificationBreakdown.components.map((component) => ({
            key: component.key,
            label: component.label,
            score: component.score,
            weight: component.weight,
            weighted_score: component.weightedScore,
            note: component.note,
          })),
          total_score: payload.verificationBreakdown.totalScore,
          needs_manual_review: payload.verificationBreakdown.needsManualReview,
          summary: payload.verificationBreakdown.summary,
        }
      : null,
    uploaded_by_phone_hash: payload.uploadedByPhoneHash,
  };
}

export async function getMediaReportAssets(reportId: string): Promise<MediaReportAssets> {
  if (!API_BASE_URL) {
    return {
      report_id: reportId,
      available: false,
      provider: null,
      media_url: null,
      thumbnail_url: null,
      expires_in_seconds: 0
    };
  }

  const response = await fetchWithAuth(`/api/dashboard/reports/${reportId}/assets`);

  if (!response.ok) {
    throw new Error("Failed to load media asset link");
  }

  const payload = (await response.json()) as {
    report_id: string;
    available: boolean;
    provider: MediaReportAssets["provider"];
    media_url: string | null;
    thumbnail_url: string | null;
    expires_in_seconds: number;
  };

  return payload;
}

export async function getLiveWeather(zoneId: string): Promise<LiveWeather> {
  await loadLocalSnapshot();
  const fallbackWeather = localSnapshot.live_weather?.[zoneId] ?? {
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

function buildLocalAlertPreview(zoneId: string): AlertPreview {
  const zone = localSnapshot.zones.find((item) => item.zone_id === zoneId);
  const riskLevel = zone?.risk_level ?? "WATCH";
  const zoneName = zone?.zone_name ?? zoneId;

  return {
    zone_id: zoneId,
    zone_name: zoneName,
    risk_level: riskLevel,
    total_subscribers: 244,
    localized_messages: [
      {
        language: "hi",
        language_label: "Hindi",
        subscriber_count: 118,
        sms_body: `⚠️ भूस्खलन चेतावनी | ${zoneName} | सावधान - जरूरत पड़ने पर निकासी करें। हेल्पलाइन: 1070`,
        whatsapp_body: `⚠️ *भूस्खलन सावधानी - ${zoneName}*\n\nजरूरत पड़ने पर निकासी करें।\nहेल्पलाइन: 1070`
      },
      {
        language: "hi-x-garhwali",
        language_label: "Garhwali",
        subscriber_count: 92,
        sms_body: `⚠️ भ्यूड़ खबरदारी | ${zoneName} | तयार रवा, जरूरत पड़ी त निकासी करवा। हेल्पलाइन: 1070`,
        whatsapp_body: `⚠️ *भ्यूड़ खबरदारी - ${zoneName}*\n\nतयार रवा, जरूरत पड़ी त निकासी करवा।\nहेल्पलाइन: 1070`
      },
      {
        language: "hi-x-kumaoni",
        language_label: "Kumaoni",
        subscriber_count: 21,
        sms_body: `⚠️ पहाड़ धांस खबरदारी | ${zoneName} | तयार रहो, जरूरत पड़ि त निकासी करो। हेल्पलाइन: 1070`,
        whatsapp_body: `⚠️ *पहाड़ धांस खबरदारी - ${zoneName}*\n\nतयार रहो, जरूरत पड़ि त निकासी करो।\nहेल्पलाइन: 1070`
      },
      {
        language: "en",
        language_label: "English",
        subscriber_count: 13,
        sms_body: `⚠️ Landslide Watch | ${zoneName} | Be ready to evacuate. Helpline: 1070`,
        whatsapp_body: `⚠️ *Landslide Watch - ${zoneName}*\n\nBe ready to evacuate.\nHelpline: 1070`
      }
    ],
    notes: ["Garhwali and Kumaoni alert copy should be reviewed by native speakers before production use."]
  };
}

async function loginAsDashboardOperator() {
  if (!API_BASE_URL) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      email: "admin@bhurakshan.local",
      password: "Admin@123",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to authenticate dashboard operator.");
  }

  const payload = (await response.json()) as { access_token: string };
  authToken = payload.access_token;
  return authToken;
}

async function ensureAuthToken() {
  if (authToken || !API_BASE_URL) {
    return authToken;
  }

  return loginAsDashboardOperator();
}

async function fetchWithAuth(path: string, init?: RequestInit, retry = true) {
  if (!API_BASE_URL) {
    throw new Error("Protected API calls require a configured API base URL.");
  }

  const token = await ensureAuthToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });

  if (response.status === 401 && retry) {
    authToken = null;
    const nextToken = await loginAsDashboardOperator();

    return fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${nextToken}`,
      },
      credentials: "include",
    });
  }

  return response;
}

export async function getDistricts(): Promise<District[]> {
  await loadLocalSnapshot();

  if (!API_BASE_URL) {
    return localSnapshot.districts;
  }

  const [districts, zones] = await Promise.all([
    fetchOrMock<Array<{ id: string; name: string; zoneCount?: number; zone_count?: number }>>(
      "/api/districts",
      []
    ),
    fetchOrMock<BackendZoneRisk[]>("/api/zones/risk", [])
  ]);

  const merged = new Map<string, District>();

  districts.forEach((item) => {
    merged.set(item.id, {
      id: item.id,
      name: item.name,
      zone_count: item.zoneCount ?? item.zone_count ?? 0
    });
  });

  zones.forEach((zone) => {
    const existing = merged.get(zone.districtId);
    if (existing) {
      existing.zone_count = Math.max(existing.zone_count, zones.filter((item) => item.districtId === zone.districtId).length);
      return;
    }

    merged.set(zone.districtId, {
      id: zone.districtId,
      name: zone.districtName,
      zone_count: zones.filter((item) => item.districtId === zone.districtId).length
    });
  });

  return Array.from(merged.values()).sort((left, right) => left.name.localeCompare(right.name));
}

function adaptDistrictBoundary(boundary: BackendDistrictBoundary): DistrictBoundary {
  return {
    district_id: boundary.districtId,
    district_name: boundary.districtName,
    center: [boundary.center.lat, boundary.center.lon],
    polygons: boundary.polygons.map((polygon) =>
      polygon.map((point) => [point.lat, point.lon] as [number, number])
    )
  };
}

function buildLocalDistrictBoundaries(): DistrictBoundary[] {
  return localSnapshot.districts
    .map((district) => {
      const districtZones = localSnapshot.zones.filter((zone) => zone.district_id === district.id);

      if (!districtZones.length) {
        return null;
      }

      const lat = districtZones.reduce((sum, zone) => sum + zone.coordinates[0], 0) / districtZones.length;
      const lon = districtZones.reduce((sum, zone) => sum + zone.coordinates[1], 0) / districtZones.length;
      const offset = 0.14;

      return {
        district_id: district.id,
        district_name: district.name,
        center: [lat, lon] as [number, number],
        polygons: [[
          [lat - offset, lon - offset],
          [lat - offset, lon + offset],
          [lat + offset, lon + offset],
          [lat + offset, lon - offset]
        ]]
      };
    })
    .filter((boundary): boundary is DistrictBoundary => Boolean(boundary));
}

export async function getDistrictBoundaries(): Promise<DistrictBoundary[]> {
  await loadLocalSnapshot();

  if (!API_BASE_URL) {
    return localSnapshot.district_boundaries ?? buildLocalDistrictBoundaries();
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/district-boundaries`);

    if (!response.ok) {
      throw new Error(`Boundary request failed with ${response.status}`);
    }

    const boundaries = (await response.json()) as BackendDistrictBoundary[];
    return boundaries.map(adaptDistrictBoundary);
  } catch (error) {
    console.warn(
      "District boundary endpoint unavailable. Falling back to local approximations until the API is restarted.",
      error
    );
    return localSnapshot.district_boundaries ?? buildLocalDistrictBoundaries();
  }
}

export async function getZoneRisks(): Promise<ZoneRisk[]> {
  await loadLocalSnapshot();

  if (!API_BASE_URL) {
    return localSnapshot.zones;
  }

  const zones = await fetchOrMock<BackendZoneRisk[]>("/api/zones/risk", []);
  return zones.map((zone, index) => adaptZone(zone, index));
}

export async function getHotspots(): Promise<Hotspot[]> {
  await loadLocalSnapshot();

  if (!API_BASE_URL) {
    return localSnapshot.hotspots;
  }

  const [hotspots, zones] = await Promise.all([
    fetchOrMock<BackendHotspot[]>("/api/hotspots", []),
    getZoneRisks(),
  ]);

  return hotspots.map((item) => adaptHotspot(item, zones));
}

export async function getForecast(zoneId: string): Promise<ZoneForecast> {
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

  if (!API_BASE_URL) {
    return localSnapshot.shelters.filter((item) => item.zone_id === zoneId);
  }

  const payload = await fetchOrMock<BackendShelter[]>(
    `/api/safe-shelters?zone_id=${zoneId}`,
    []
  );

  return payload.map(adaptShelter);
}

export async function getEvacuationRoute(zoneId: string): Promise<EvacuationRoute> {
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
      instruction_summary: "Route details are not available yet."
    }
  );

  return "zoneId" in payload ? adaptRoute(payload) : adaptRouteFromLocal(payload);
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

export async function getDangerZones(zoneId: string): Promise<DangerZone[]> {
  await loadLocalSnapshot();
  const localDangerZones = localSnapshot.danger_zones?.[zoneId] ?? [];

  if (!API_BASE_URL) {
    return localDangerZones;
  }

  const payload = await fetchOrMock<{
    zoneId: string;
    dangerZones: BackendDangerZone[];
  }>(
    `/api/zones/${zoneId}/danger-zones`,
    {
      zoneId,
      dangerZones: localDangerZones.map((dangerZone) => ({
        id: dangerZone.id,
        zoneId: dangerZone.zone_id,
        name: dangerZone.name,
        type: dangerZone.type,
        severity: dangerZone.severity,
        source: dangerZone.source,
        note: dangerZone.note,
        updatedAt: dangerZone.updated_at,
        active: dangerZone.active,
        polygon: dangerZone.polygon,
      })),
    }
  );

  return payload.dangerZones.map(adaptDangerZone);
}

export async function getAlertLogs(): Promise<AlertLog[]> {
  await loadLocalSnapshot();

  if (!API_BASE_URL) {
    return localSnapshot.alerts;
  }

  const payload = await fetchOrMock<BackendAlert[]>("/api/alerts/logs", []);
  return payload.map(adaptAlert);
}

export async function getAlertPreview(
  zoneId: string,
  options?: {
    recipientPhoneNumber?: string;
    recipientAlertLanguage?: LocalizedAlertMessage["language"];
  }
): Promise<AlertPreview> {
  await loadLocalSnapshot();

  if (!API_BASE_URL) {
    return buildLocalAlertPreview(zoneId);
  }

  const query = new URLSearchParams({ zone_id: zoneId });
  if (options?.recipientPhoneNumber) {
    query.set("recipient_phone_number", options.recipientPhoneNumber);
  }
  if (options?.recipientAlertLanguage) {
    query.set("recipient_alert_language", options.recipientAlertLanguage);
  }

  const response = await fetchWithAuth(`/api/alerts/preview?${query.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to load alert preview");
  }

  const payload = (await response.json()) as BackendAlertPreview;
  return adaptAlertPreview(payload);
}

export async function getMediaReports(zoneId?: string): Promise<DashboardMediaReportsResponse> {
  await loadLocalSnapshot();

  const localReports = (localSnapshot.media_reports ?? []).filter((report) =>
    zoneId ? report.zone_id === zoneId : true
  );

  if (!API_BASE_URL) {
    return {
      reports: localReports,
      total: localReports.length,
      pending: localReports.filter((report) => report.verification_status === "pending").length,
      verified: localReports.filter((report) => report.verification_status === "verified").length,
      flagged: localReports.filter((report) =>
        ["fake", "duplicate", "unverified"].includes(report.verification_status)
      ).length,
    };
  }

  const query = zoneId ? `?zone_id=${zoneId}` : "";
  const response = await fetchWithAuth(`/api/dashboard/reports${query}`);

  if (!response.ok) {
    throw new Error("Failed to load media reports");
  }

  const payload = (await response.json()) as {
    reports: BackendMediaReport[];
    total: number;
    pending: number;
    verified: number;
    flagged: number;
  };

  return {
    reports: payload.reports.map(adaptMediaReport),
    total: payload.total,
    pending: payload.pending,
    verified: payload.verified,
    flagged: payload.flagged,
  };
}

export async function reviewMediaReport(
  reportId: string,
  decision: "verified" | "fake" | "duplicate" | "unverified",
  notes: string
) {
  if (!API_BASE_URL) {
    localSnapshot = {
      ...localSnapshot,
      media_reports: (localSnapshot.media_reports ?? []).map((report) =>
        report.id === reportId
          ? {
              ...report,
              verification_status: decision,
              review_notes: notes,
              reviewed_at: new Date().toISOString(),
              risk_boost_applied: decision === "verified",
              risk_boost_amount: decision === "verified" ? Math.max(report.risk_boost_amount, 0.1) : 0,
              risk_boost_expires_at:
                decision === "verified"
                  ? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
                  : null,
              verification_breakdown: report.verification_breakdown
                ? {
                    ...report.verification_breakdown,
                    needs_manual_review: decision === "verified" ? false : report.verification_breakdown.needs_manual_review,
                    summary:
                      decision === "verified"
                        ? "Verified by a dashboard operator after manual review."
                        : `Marked ${decision} by a dashboard operator.`,
                  }
                : report.verification_breakdown ?? null,
            }
          : report
      ),
    };

    return { ok: true };
  }

  const response = await fetchWithAuth(`/api/dashboard/reports/${reportId}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      decision,
      notes,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to review media report");
  }

  return response.json() as Promise<{ ok: boolean }>;
}

export async function reviewMediaPrivacy(
  reportId: string,
  action: "mark_blur_required" | "mark_blur_applied" | "clear_privacy_flag",
  notes: string
) {
  if (!API_BASE_URL) {
    localSnapshot = {
      ...localSnapshot,
      media_reports: (localSnapshot.media_reports ?? []).map((report) =>
        report.id === reportId
          ? {
              ...report,
              privacy_status:
                action === "mark_blur_applied"
                  ? "blur_applied"
                  : action === "mark_blur_required"
                    ? "blur_required"
                    : "clear",
              face_blur_applied: action === "mark_blur_applied",
              review_notes: notes || report.review_notes,
              reviewed_at: new Date().toISOString(),
            }
          : report
      ),
    };

    return { ok: true };
  }

  const response = await fetchWithAuth(`/api/dashboard/reports/${reportId}/privacy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action,
      notes,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to update media privacy status");
  }

  return response.json() as Promise<{ ok: boolean }>;
}

export async function saveEvacuationPath(payload: EvacuationPathPayload) {
  if (!API_BASE_URL) {
    const distanceKm = Number(
      (
        localSnapshot.road_conditions?.[payload.zone_id]?.segments
          .filter((segment) => payload.segment_ids.includes(segment.id))
          .reduce((sum, segment) => sum + segment.length_km, 0) ?? 0
      ).toFixed(2)
    );

    localSnapshot = {
      ...localSnapshot,
      routes: [
        {
          zone_id: payload.zone_id,
          safe_shelter_id: payload.safe_shelter_id,
          distance_km: distanceKm,
          estimated_minutes: payload.estimated_minutes,
          instruction_summary: payload.instruction_summary,
          segment_ids: payload.segment_ids,
          road_status: localSnapshot.road_conditions?.[payload.zone_id]?.summary.worst_status ?? "open",
          caution_segment_count:
            localSnapshot.road_conditions?.[payload.zone_id]?.segments.filter(
              (segment) =>
                payload.segment_ids.includes(segment.id) && segment.condition.status === "caution"
            ).length ?? 0,
          blocked_segment_count:
            localSnapshot.road_conditions?.[payload.zone_id]?.segments.filter(
              (segment) =>
                payload.segment_ids.includes(segment.id) && segment.condition.status === "blocked"
            ).length ?? 0,
          elevation_gain_m: localSnapshot.elevation_profiles?.[payload.zone_id]?.total_ascent_m ?? 0,
          elevation_loss_m: localSnapshot.elevation_profiles?.[payload.zone_id]?.total_descent_m ?? 0,
          valley_exposure: localSnapshot.elevation_profiles?.[payload.zone_id]?.valley_exposure ?? "low",
          route_warnings: payload.route_warnings,
          steps: payload.steps,
          path_category: payload.path_category,
          avoids_streams: payload.avoids_streams,
          hazard_notes: payload.hazard_notes,
          verified_by: "Local Operator",
          verified_at: new Date().toISOString(),
        },
        ...localSnapshot.routes.filter((route) => route.zone_id !== payload.zone_id),
      ],
    };

    return { ok: true };
  }

  const response = await fetchWithAuth("/api/dashboard/evacuation-paths", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      zoneId: payload.zone_id,
      safeShelterId: payload.safe_shelter_id,
      segmentIds: payload.segment_ids,
      instructionSummary: payload.instruction_summary,
      steps: payload.steps,
      estimatedMinutes: payload.estimated_minutes,
      pathCategory: payload.path_category,
      isUphill: payload.is_uphill,
      avoidsStreams: payload.avoids_streams,
      hazardNotes: payload.hazard_notes,
      routeWarnings: payload.route_warnings,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to save evacuation path");
  }

  return response.json() as Promise<{ ok: boolean }>;
}

export async function triggerManualAlert(
  payload: ManualAlertPayload,
): Promise<{
  ok: boolean;
  alert_id: string;
  queued_channels: string[];
  delivery_status: AlertLog["delivery_status"];
  recipient_count?: number;
}> {
  if (API_BASE_URL) {
    const response = await fetchWithAuth("/api/alerts/trigger", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        zoneId: payload.zone_id,
        reason: payload.reason,
        channels: payload.channels,
        recipientPhoneNumber: payload.recipient_phone_number,
        recipientAlertLanguage: payload.recipient_alert_language
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to trigger manual alert");
    }

    return response.json() as Promise<{
      ok: boolean;
      alert_id: string;
      queued_channels: string[];
      delivery_status: AlertLog["delivery_status"];
      recipient_count?: number;
    }>;
  }

  const zone = localSnapshot.zones.find((item) => item.zone_id === payload.zone_id);
  const alertId = `alert_${String(localSnapshot.alerts.length + 1).padStart(2, "0")}`;

  const createdAlert: AlertLog = {
    id: alertId,
    zone_id: payload.zone_id,
    zone_name: zone?.zone_name ?? payload.zone_id,
    risk_level: zone?.risk_level ?? "WATCH",
    trigger_source: "MANUAL_OPERATOR",
    channels: payload.channels,
    recipient_count: payload.recipient_phone_number
      ? 1
      : zone?.risk_level === "DANGER"
        ? 180
        : 60,
    delivery_status: "QUEUED",
    created_at: new Date().toISOString(),
  };

  localSnapshot = {
    ...localSnapshot,
    alerts: [createdAlert, ...localSnapshot.alerts],
  };

  return {
    ok: true,
    alert_id: alertId,
    queued_channels: payload.channels,
    delivery_status: createdAlert.delivery_status,
    recipient_count: createdAlert.recipient_count
  };
}

export function applyRealtimeRiskUpdate(zoneId: string, delta: number): DashboardSnapshot {
  const nextZones = localSnapshot.zones.map((zone) => {
    if (zone.zone_id !== zoneId) {
      return zone;
    }

    const riskScore = Math.max(0, Math.min(100, zone.risk_score + delta));
    return {
      ...zone,
      risk_score: riskScore,
      risk_level: scoreToRiskLevel(riskScore),
      rainfall_mm_hr: Number((zone.rainfall_mm_hr + delta * 0.4).toFixed(1)),
      soil_moisture_proxy_pct: Math.max(
        0,
        Math.min(100, Number((zone.soil_moisture_proxy_pct + delta * 0.35).toFixed(1))),
      ),
      ground_movement_proxy_pct: Math.max(
        0,
        Math.min(100, Number((zone.ground_movement_proxy_pct + delta * 0.25).toFixed(1))),
      ),
      predicted_at: new Date().toISOString(),
    };
  });

  const nextZone = nextZones.find((zone) => zone.zone_id === zoneId);
  if (!nextZone) {
    return localSnapshot;
  }

  const nextForecast = localSnapshot.forecasts[zoneId];
  const forecast = nextForecast
    ? {
        ...nextForecast,
        current: {
          risk_score: nextZone.risk_score,
          risk_level: nextZone.risk_level,
          predicted_at: nextZone.predicted_at,
        },
        forecast: nextForecast.forecast.map((item, index) => {
          const offset = delta - index * 2;
          const riskScore = Math.max(0, Math.min(100, item.risk_score + offset));
          return {
            ...item,
            risk_score: riskScore,
            risk_level: scoreToRiskLevel(riskScore),
          };
        }),
      }
    : undefined;

  const hotspots = nextZones
    .filter((zone) => zone.risk_level === "DANGER" || zone.risk_score >= 45)
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 3)
    .map((zone) => ({
      zone_id: zone.zone_id,
      risk_score: zone.risk_score,
      risk_level: zone.risk_level,
      trend: delta > 0 ? "rising" : "falling",
      next_horizon_level:
        localSnapshot.forecasts[zone.zone_id]?.forecast[0]?.risk_level ?? zone.risk_level,
      district_id: zone.district_id,
    })) satisfies Hotspot[];

  localSnapshot = {
    ...localSnapshot,
    zones: nextZones,
    hotspots,
    forecasts: forecast
      ? {
          ...localSnapshot.forecasts,
          [zoneId]: forecast,
        }
      : localSnapshot.forecasts,
  };

  return localSnapshot;
}
