export type RiskLevel = "SAFE" | "WATCH" | "DANGER";
export type LanguageCode = "hi" | "en" | "hi-x-garhwali" | "hi-x-kumaoni";
export type RoadStatus = "open" | "caution" | "blocked" | "flooded";
export type ValleyExposure = "low" | "moderate" | "high";
export type EvacuationPathCategory = "primary" | "alternate" | "emergency_only";
export type DangerZoneType = "debris_flow" | "road_collapse" | "stream_blockage" | "slope_crack";
export type MediaPrivacyStatus = "clear" | "blur_recommended" | "blur_required" | "blur_applied";
export type MediaStorageProvider = "supabase" | "runtime_local";
export type MediaVerificationStatus = "pending" | "verified" | "unverified" | "fake" | "duplicate";

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

export interface District {
  id: string;
  name: string;
  zone_count: number;
}

export interface DistrictBoundary {
  district_id: string;
  district_name: string;
  center: [number, number];
  polygons: Array<[number, number][]>;
}

export interface OperatorLocation {
  lat: number;
  lon: number;
  accuracy_m?: number;
  updated_at: string;
}

export interface ZoneRisk {
  zone_id: string;
  zone_name: string;
  district_id: string;
  district_name: string;
  risk_score: number;
  risk_level: RiskLevel;
  rainfall_mm_hr: number;
  rainfall_6h_avg_mm_hr: number;
  rainfall_24h_total_mm: number;
  soil_moisture_proxy_pct: number;
  ground_movement_proxy_pct: number;
  slope_degrees: number;
  historical_landslide_frequency: number;
  predicted_at: string;
  is_stale: boolean;
  coordinates: [number, number];
  polygon: [number, number][];
}

export interface LiveWeather {
  zone_id: string;
  rainfall_mm_hr: number;
  observed_at: string;
  source: string;
  is_stale: boolean;
}

export interface DangerZone {
  id: string;
  zone_id: string;
  name: string;
  type: DangerZoneType;
  severity: "advisory" | "high" | "critical";
  source: string;
  note: string;
  updated_at: string;
  active: boolean;
  polygon: Array<{
    lat: number;
    lon: number;
  }>;
}

export interface ZoneForecast {
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
  top_features: string[];
}

export interface Hotspot {
  zone_id: string;
  risk_score: number;
  risk_level: RiskLevel;
  trend: "steady" | "rising" | "falling";
  next_horizon_level: RiskLevel;
  district_id: string;
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
  steps?: string[];
  is_uphill?: boolean;
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

export interface EvacuationPathPayload {
  zone_id: string;
  safe_shelter_id: string;
  segment_ids: string[];
  instruction_summary: string;
  steps: string[];
  estimated_minutes: number;
  path_category: EvacuationPathCategory;
  is_uphill: boolean;
  avoids_streams: boolean;
  hazard_notes: string;
  route_warnings: string[];
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

export interface AlertLog {
  id: string;
  zone_id: string;
  zone_name: string;
  risk_level: RiskLevel;
  trigger_source: "AUTO_FORECAST" | "MANUAL_OPERATOR";
  channels: Array<"SMS" | "WHATSAPP">;
  recipient_count: number;
  delivery_status: "QUEUED" | "DELIVERED" | "FAILED" | "PARTIAL" | "SIMULATED";
  localized_messages?: LocalizedAlertMessage[];
  created_at: string;
}

export interface ManualAlertPayload {
  zone_id: string;
  reason: string;
  channels: Array<"SMS" | "WHATSAPP">;
  recipient_phone_number?: string;
  recipient_alert_language?: LanguageCode;
}

export interface LocalizedAlertMessage {
  language: LanguageCode;
  language_label: string;
  subscriber_count: number;
  sms_body: string;
  whatsapp_body: string;
  sms_character_count?: number;
  sms_character_limit?: number;
  sms_within_limit?: boolean;
}

export interface AlertPreview {
  zone_id: string;
  zone_name: string;
  risk_level: RiskLevel;
  total_subscribers: number;
  localized_messages: LocalizedAlertMessage[];
  notes: string[];
}

export interface MediaReport {
  id: string;
  zone_id: string;
  zone_name: string;
  district_id: string;
  media_type: "photo" | "video";
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  lat: number;
  lon: number;
  accuracy_meters: number | null;
  device_timestamp: string;
  server_received_at: string;
  description: string;
  language: LanguageCode;
  verification_status: MediaVerificationStatus;
  verification_score: number | null;
  ai_labels: string[];
  ai_flags: string[];
  privacy_status?: MediaPrivacyStatus;
  face_blur_applied?: boolean;
  storage_provider?: MediaStorageProvider | null;
  storage_bucket?: string | null;
  storage_object_path?: string | null;
  thumbnail_bucket?: string | null;
  thumbnail_object_path?: string | null;
  duplicate_hash: string;
  review_notes: string;
  reviewed_at: string | null;
  risk_boost_applied: boolean;
  risk_boost_amount: number;
  risk_boost_expires_at?: string | null;
  verification_breakdown?: MediaVerificationBreakdown | null;
  uploaded_by_phone_hash?: string;
}

export interface MediaReportAssets {
  report_id: string;
  available: boolean;
  provider: MediaStorageProvider | null;
  media_url: string | null;
  thumbnail_url: string | null;
  expires_in_seconds: number;
}

export interface DashboardMediaReportsResponse {
  reports: MediaReport[];
  total: number;
  pending: number;
  verified: number;
  flagged: number;
}

export interface DashboardSnapshot {
  districts: District[];
  district_boundaries?: DistrictBoundary[];
  zones: ZoneRisk[];
  danger_zones?: Record<string, DangerZone[]>;
  hotspots: Hotspot[];
  shelters: Shelter[];
  routes: EvacuationRoute[];
  alerts: AlertLog[];
  forecasts: Record<string, ZoneForecast>;
  live_weather?: Record<string, LiveWeather>;
  media_reports?: MediaReport[];
  road_conditions?: Record<string, ZoneRoadConditions>;
  elevation_profiles?: Record<string, ElevationProfile>;
}
