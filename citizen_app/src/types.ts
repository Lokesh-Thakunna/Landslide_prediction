export type RiskLevel = "SAFE" | "WATCH" | "DANGER";
export type LanguageCode = "hi" | "en" | "hi-x-garhwali" | "hi-x-kumaoni";
export type RoadStatus = "open" | "caution" | "blocked" | "flooded";
export type ValleyExposure = "low" | "moderate" | "high";
export type EvacuationPathCategory = "primary" | "alternate" | "emergency_only";
export type DangerZoneType = "debris_flow" | "road_collapse" | "stream_blockage" | "slope_crack";
export type MediaVerificationStatus = "pending" | "verified" | "unverified" | "fake" | "duplicate";

export interface District {
  id: string;
  name: string;
  zone_count: number;
}

export interface MediaVerificationComponent {
  key: "evidence" | "freshness" | "location";
  label: string;
  score: number;
  weight: number;
  weighted_score: number;
  note: string;
}

export interface MediaVerificationBreakdown {
  components: MediaVerificationComponent[];
  total_score: number;
  needs_manual_review: boolean;
  summary: string;
}

export interface CitizenZoneRisk {
  zone_id: string;
  zone_name: string;
  district_id: string;
  district_name: string;
  risk_score: number;
  risk_level: RiskLevel;
  rainfall_mm_hr: number;
  warning_text: string;
  updated_at: string;
}

export interface LiveWeather {
  zone_id: string;
  rainfall_mm_hr: number;
  observed_at: string;
  source: string;
  is_stale: boolean;
}

export interface CitizenForecast {
  zone_id: string;
  current: {
    risk_score: number;
    risk_level: RiskLevel;
    predicted_at: string;
  };
  forecast: Array<{
    horizon_hours: 1 | 2;
    risk_score: number;
    risk_level: RiskLevel;
    forecast_for: string;
  }>;
}

export interface Shelter {
  id: string;
  zone_id: string;
  name: string;
  lat?: number;
  lon?: number;
  capacity: number;
  elevation_m?: number;
  distance_km: number;
  contact_number: string;
}

export interface EvacuationRoute {
  zone_id: string;
  safe_shelter_id: string;
  distance_km: number;
  estimated_minutes: number;
  instruction_summary: string;
  steps: string[];
  segment_ids?: string[];
  road_status?: RoadStatus;
  caution_segment_count?: number;
  blocked_segment_count?: number;
  elevation_gain_m?: number;
  elevation_loss_m?: number;
  valley_exposure?: ValleyExposure;
  route_warnings?: string[];
  path_category?: EvacuationPathCategory;
  avoids_streams?: boolean;
  hazard_notes?: string;
  verified_by?: string;
  verified_at?: string;
}

export interface RoadConditionSegment {
  id: string;
  zone_id: string;
  name: string;
  road_class: "highway" | "connector" | "local";
  priority_rank: number;
  length_km: number;
  coordinates: Array<{
    lat: number;
    lon: number;
  }>;
  condition: {
    id: string;
    status: RoadStatus;
    average_speed_kmph: number;
    delay_minutes: number;
    severity_pct: number;
    source: string;
    note: string;
    updated_at: string;
  };
}

export interface ZoneRoadConditions {
  zone_id: string;
  summary: {
    zone_id: string;
    open_count: number;
    caution_count: number;
    blocked_count: number;
    flooded_count: number;
    worst_status: RoadStatus;
    updated_at: string;
  };
  segments: RoadConditionSegment[];
}

export interface ElevationProfile {
  zone_id: string;
  safe_shelter_id: string;
  min_elevation_m: number;
  max_elevation_m: number;
  total_ascent_m: number;
  total_descent_m: number;
  valley_exposure: ValleyExposure;
  recommended_direction_label: string;
  points: Array<{
    distance_km: number;
    elevation_m: number;
    slope_degrees: number;
  }>;
}

export interface EmergencyContact {
  id: string;
  label: string;
  phone: string;
  availability: string;
}

export interface LocationStatus {
  user_location: {
    lat: number;
    lon: number;
    zone_id: string;
    zone_name: string;
    district: string;
  };
  risk: {
    level: RiskLevel;
    score: number;
    nearest_danger_m: number;
    nearest_danger_bearing: number;
    danger_direction_label: string;
    nearest_danger_zone_id?: string;
    nearest_danger_zone_name?: string;
    nearest_danger_type?: DangerZoneType;
    nearest_danger_note?: string;
  };
  evacuation: {
    recommended_safe_zone: {
      id: string;
      name: string;
      lat: number;
      lon: number;
      elevation_m: number;
      capacity: number;
      distance_km: number;
      bearing: number;
    };
    route_available: boolean;
    route: {
      type: "verified_path" | "fallback";
      distance_km: number;
      walk_time_min: number;
      is_uphill: boolean;
      steps: string[];
      bearing_degrees: number;
      bearing_label: string;
    };
    offline_fallback: {
      bearing_degrees: number;
      bearing_label: string;
      distance_km: number;
      landmark: string;
    };
  };
  movement: {
    user_heading_degrees: number | null;
    heading_label: string;
    moving_toward_danger: boolean;
    safe_bearing_degrees: number;
    safe_bearing_label: string;
    danger_bearing_delta_degrees: number | null;
  };
  warnings: Array<{
    type: string;
    message: string;
  }>;
}

export interface NearbySafeZone {
  id: string;
  zone_id: string;
  name: string;
  distance_km: number;
  walk_time_min: number;
  elevation_m: number;
  is_uphill_from_user: boolean;
  capacity: number;
  road_status: "open" | "caution" | "unknown";
  route_summary: string;
  bearing_degrees: number;
}

export interface MediaUploadPayload {
  file: File;
  lat: number;
  lon: number;
  accuracy_m?: number;
  description?: string;
  language: LanguageCode;
  phone_hash?: string;
  device_timestamp?: string;
}

export interface MediaUploadResponse {
  report_id: string;
  status: MediaVerificationStatus;
  zone_id: string;
  zone_name: string;
  message: string;
  estimated_review_minutes: number;
}

export interface MediaReportStatus {
  report_id: string;
  status: MediaVerificationStatus;
  verification_score: number | null;
  zone_name: string;
  risk_boost_applied: boolean;
  risk_boost_expires_at?: string | null;
  verification_breakdown?: MediaVerificationBreakdown | null;
  message: string;
}

export interface MediaReportDeleteResponse {
  ok: boolean;
  report_id: string;
  deleted: boolean;
  message: string;
}

export interface ComputedRouteStep {
  instruction_hi: string;
  instruction_en: string;
  distance_m: number;
  road_status: RoadStatus;
}

export interface ComputedSafeZoneRoute {
  zone_id: string;
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
    elevation_m: number;
  };
  route: {
    source: "osrm_public_api" | "published_path_fallback";
    distance_km: number;
    duration_minutes: number;
    mode: "walking";
    polyline: string;
    coordinates: Array<{
      lat: number;
      lon: number;
    }>;
    steps: ComputedRouteStep[];
    warnings: string[];
    blocked_roads_avoided: string[];
  };
  alternate_route: {
    distance_km: number;
    duration_minutes: number;
    coordinates: Array<{
      lat: number;
      lon: number;
    }>;
    warnings: string[];
  } | null;
  fallback_directions: string;
}

export interface SubscriptionPayload {
  phone_number: string;
  zone_id: string;
  channels: Array<"SMS" | "WHATSAPP">;
  app_language: LanguageCode;
  alert_language: LanguageCode;
}

export interface CitizenSnapshot {
  zones: CitizenZoneRisk[];
  forecasts: Record<string, CitizenForecast>;
  shelters: Shelter[];
  routes: EvacuationRoute[];
  emergencyContacts: EmergencyContact[];
  locationStatus?: LocationStatus;
  nearbySafeZones?: NearbySafeZone[];
  recentMediaStatus?: MediaReportStatus;
  liveWeather?: Record<string, LiveWeather>;
  road_conditions?: Record<string, ZoneRoadConditions>;
  elevation_profiles?: Record<string, ElevationProfile>;
}
