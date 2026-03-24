import { z } from "zod";

export const RiskLevelSchema = z.enum(["SAFE", "WATCH", "DANGER"]);
export const ChannelSchema = z.enum(["SMS", "WHATSAPP"]);
export const RoleSchema = z.enum(["ADMIN", "DISTRICT_OFFICIAL", "ANALYST"]);
export const LanguageCodeSchema = z.enum(["hi", "en", "hi-x-garhwali", "hi-x-kumaoni"]);
export const MediaTypeSchema = z.enum(["photo", "video"]);
export const RoadStatusSchema = z.enum(["open", "caution", "blocked", "flooded"]);
export const ValleyExposureSchema = z.enum(["low", "moderate", "high"]);
export const EvacuationPathCategorySchema = z.enum(["primary", "alternate", "emergency_only"]);
export const DangerZoneTypeSchema = z.enum(["debris_flow", "road_collapse", "stream_blockage", "slope_crack"]);
export const MediaPrivacyStatusSchema = z.enum([
  "clear",
  "blur_recommended",
  "blur_required",
  "blur_applied"
]);
export const MediaStorageProviderSchema = z.enum(["supabase", "runtime_local"]);
export const MediaVerificationStatusSchema = z.enum([
  "pending",
  "verified",
  "unverified",
  "fake",
  "duplicate"
]);
export const MediaVerificationComponentSchema = z.object({
  key: z.enum(["evidence", "freshness", "location"]),
  label: z.string(),
  score: z.number().min(0).max(1),
  weight: z.number().min(0).max(1),
  weightedScore: z.number().min(0).max(1),
  note: z.string()
});
export const MediaVerificationBreakdownSchema = z.object({
  components: z.array(MediaVerificationComponentSchema).length(3),
  totalScore: z.number().min(0).max(1),
  needsManualReview: z.boolean().default(false),
  summary: z.string().default("")
});

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const DistrictSchema = z.object({
  id: z.string(),
  name: z.string(),
  stateName: z.string(),
  zoneCount: z.number().int().nonnegative().default(0),
  defaultLanguage: LanguageCodeSchema.default("hi")
});

export const ZoneStaticSchema = z.object({
  id: z.string(),
  districtId: z.string(),
  districtName: z.string(),
  name: z.string(),
  centroidLat: z.number(),
  centroidLon: z.number(),
  slopeDegrees: z.number(),
  historicalLandslideFrequency: z.number(),
  riskPriority: z.number().int().min(1),
  isActive: z.boolean()
});

export const LiveWeatherSchema = z.object({
  zoneId: z.string(),
  rainfallMmHr: z.number(),
  observedAt: z.string(),
  source: z.string(),
  isStale: z.boolean()
});

export const CoordinatesSchema = z.object({
  lat: z.number(),
  lon: z.number()
});

export const DistrictBoundarySchema = z.object({
  districtId: z.string(),
  districtName: z.string(),
  center: CoordinatesSchema,
  polygons: z.array(z.array(CoordinatesSchema).min(3)).min(1)
});

export const DangerZoneSchema = z.object({
  id: z.string(),
  zoneId: z.string(),
  name: z.string(),
  type: DangerZoneTypeSchema,
  severity: z.enum(["advisory", "high", "critical"]).default("high"),
  source: z.string().default("operator"),
  note: z.string().default(""),
  updatedAt: z.string(),
  active: z.boolean().default(true),
  polygon: z.array(CoordinatesSchema).min(3)
});

export const RoadSegmentSchema = z.object({
  id: z.string(),
  zoneId: z.string(),
  name: z.string(),
  roadClass: z.enum(["highway", "connector", "local"]).default("local"),
  priorityRank: z.number().int().min(1).default(1),
  lengthKm: z.number().nonnegative(),
  coordinates: z.array(CoordinatesSchema).min(2)
});

export const RoadConditionSchema = z.object({
  id: z.string(),
  segmentId: z.string(),
  zoneId: z.string(),
  status: RoadStatusSchema,
  averageSpeedKmph: z.number().nonnegative(),
  delayMinutes: z.number().int().nonnegative().default(0),
  severityPct: z.number().min(0).max(100).default(0),
  source: z.string(),
  note: z.string(),
  updatedAt: z.string()
});

export const RoadConditionSegmentSchema = RoadSegmentSchema.extend({
  condition: RoadConditionSchema
});

export const ZoneRoadConditionsSummarySchema = z.object({
  zoneId: z.string(),
  openCount: z.number().int().nonnegative(),
  cautionCount: z.number().int().nonnegative(),
  blockedCount: z.number().int().nonnegative(),
  floodedCount: z.number().int().nonnegative(),
  worstStatus: RoadStatusSchema,
  updatedAt: z.string()
});

export const ZoneRoadConditionsSchema = z.object({
  zoneId: z.string(),
  summary: ZoneRoadConditionsSummarySchema,
  segments: z.array(RoadConditionSegmentSchema)
});

export const ElevationProfilePointSchema = z.object({
  distanceKm: z.number().nonnegative(),
  elevationM: z.number().nonnegative(),
  slopeDegrees: z.number().min(0)
});

export const ElevationProfileSchema = z.object({
  zoneId: z.string(),
  safeShelterId: z.string(),
  minElevationM: z.number().nonnegative(),
  maxElevationM: z.number().nonnegative(),
  totalAscentM: z.number().nonnegative(),
  totalDescentM: z.number().nonnegative(),
  valleyExposure: ValleyExposureSchema,
  recommendedDirectionLabel: z.string(),
  points: z.array(ElevationProfilePointSchema).min(2)
});

export const PredictionCoreSchema = z.object({
  zoneId: z.string(),
  riskScore: z.number().min(0).max(100),
  riskLevel: RiskLevelSchema,
  predictedAt: z.string(),
  soilMoistureProxyPct: z.number().min(0).max(100),
  groundMovementProxyPct: z.number().min(0).max(100),
  topFeatures: z.array(z.string()).min(1)
});

export const ForecastPointSchema = z.object({
  zoneId: z.string(),
  horizonHours: z.number().int().min(1),
  forecastFor: z.string(),
  riskScore: z.number().min(0).max(100),
  riskLevel: RiskLevelSchema,
  soilMoistureProxyPct: z.number().min(0).max(100)
});

export const HotspotSchema = z.object({
  zoneId: z.string(),
  zoneName: z.string(),
  districtName: z.string(),
  riskScore: z.number().min(0).max(100),
  riskLevel: RiskLevelSchema,
  trend: z.enum(["rising", "steady", "falling"]),
  nextHorizonLevel: RiskLevelSchema.optional()
});

export const SafeShelterSchema = z.object({
  id: z.string(),
  zoneId: z.string(),
  districtId: z.string(),
  name: z.string(),
  lat: z.number(),
  lon: z.number(),
  capacity: z.number().int().nonnegative(),
  elevationM: z.number().nonnegative().default(0),
  distanceKm: z.number().nonnegative(),
  contactNumber: z.string(),
  instructionSummary: z.string()
});

export const EvacuationRouteSchema = z.object({
  id: z.string(),
  zoneId: z.string(),
  safeShelterId: z.string(),
  distanceKm: z.number().nonnegative(),
  estimatedMinutes: z.number().int().nonnegative(),
  instructionSummary: z.string(),
  steps: z.array(z.string()).default([]),
  routeType: z.enum(["verified_path", "fallback"]).default("verified_path"),
  bearingDegrees: z.number().min(0).max(360).optional(),
  isUphill: z.boolean().default(false),
  segmentIds: z.array(z.string()).default([]),
  roadStatus: RoadStatusSchema.default("open"),
  cautionSegmentCount: z.number().int().nonnegative().default(0),
  blockedSegmentCount: z.number().int().nonnegative().default(0),
  elevationGainM: z.number().nonnegative().default(0),
  elevationLossM: z.number().nonnegative().default(0),
  valleyExposure: ValleyExposureSchema.default("low"),
  routeWarnings: z.array(z.string()).default([]),
  pathCategory: EvacuationPathCategorySchema.default("primary"),
  avoidsStreams: z.boolean().default(false),
  hazardNotes: z.string().default(""),
  verifiedBy: z.string().optional(),
  verifiedAt: z.string().optional()
});

export const EvacuationPathUpsertRequestSchema = z.object({
  zoneId: z.string(),
  safeShelterId: z.string(),
  segmentIds: z.array(z.string()).min(1),
  instructionSummary: z.string().min(10),
  steps: z.array(z.string().min(3)).min(1),
  estimatedMinutes: z.number().int().nonnegative(),
  pathCategory: EvacuationPathCategorySchema.default("primary"),
  isUphill: z.boolean().default(false),
  avoidsStreams: z.boolean().default(false),
  hazardNotes: z.string().default(""),
  routeWarnings: z.array(z.string()).default([])
});

export const SubscriptionSchema = z.object({
  id: z.string(),
  zoneId: z.string(),
  phoneNumber: z.string(),
  channels: z.array(ChannelSchema).min(1),
  appLanguage: LanguageCodeSchema.default("hi"),
  alertLanguage: LanguageCodeSchema.default("hi"),
  isActive: z.boolean(),
  createdAt: z.string()
});

export const SubscribeRequestSchema = z.object({
  phoneNumber: z.string().regex(/^\+?[1-9]\d{7,14}$/),
  zoneId: z.string(),
  channels: z.array(ChannelSchema).min(1),
  appLanguage: LanguageCodeSchema.default("hi"),
  alertLanguage: LanguageCodeSchema.optional()
});

export const LocalizedAlertMessageSchema = z.object({
  language: LanguageCodeSchema,
  languageLabel: z.string(),
  subscriberCount: z.number().int().nonnegative(),
  smsBody: z.string(),
  whatsappBody: z.string(),
  smsCharacterCount: z.number().int().nonnegative().default(0),
  smsCharacterLimit: z.number().int().positive().default(160),
  smsWithinLimit: z.boolean().default(true)
});

export const AlertLogSchema = z.object({
  id: z.string(),
  zoneId: z.string(),
  zoneName: z.string(),
  riskLevel: RiskLevelSchema,
  riskScore: z.number().min(0).max(100),
  triggerSource: z.enum(["AUTO_CURRENT", "AUTO_FORECAST", "MANUAL"]),
  triggerHorizonHours: z.number().int().min(0).max(2),
  channels: z.array(ChannelSchema),
  recipientCount: z.number().int().nonnegative(),
  deliveryStatus: z.enum(["SIMULATED", "QUEUED", "DELIVERED", "FAILED", "PARTIAL"]),
  localizedMessages: z.array(LocalizedAlertMessageSchema).default([]),
  createdAt: z.string(),
  reason: z.string().optional()
});

export const AlertTriggerRequestSchema = z.object({
  zoneId: z.string(),
  reason: z.string().min(5),
  channels: z.array(ChannelSchema).min(1),
  recipientPhoneNumber: z.string().regex(/^\+?[1-9]\d{7,14}$/).optional(),
  recipientAlertLanguage: LanguageCodeSchema.optional()
});

export const AlertPreviewSchema = z.object({
  zoneId: z.string(),
  zoneName: z.string(),
  riskLevel: RiskLevelSchema,
  totalSubscribers: z.number().int().nonnegative(),
  localizedMessages: z.array(LocalizedAlertMessageSchema),
  notes: z.array(z.string()).default([])
});

export const NearbySafeZoneSchema = z.object({
  id: z.string(),
  zoneId: z.string(),
  name: z.string(),
  distanceKm: z.number().nonnegative(),
  walkTimeMin: z.number().int().nonnegative(),
  elevationM: z.number().nonnegative(),
  isUphillFromUser: z.boolean(),
  capacity: z.number().int().nonnegative(),
  roadStatus: z.enum(["open", "caution", "unknown"]).default("open"),
  routeSummary: z.string(),
  bearingDegrees: z.number().min(0).max(360)
});

export const LocationStatusSchema = z.object({
  userLocation: z.object({
    lat: z.number(),
    lon: z.number(),
    zoneId: z.string(),
    zoneName: z.string(),
    district: z.string()
  }),
  risk: z.object({
    level: RiskLevelSchema,
    score: z.number().min(0).max(100),
    nearestDangerM: z.number().nonnegative(),
    nearestDangerBearing: z.number().min(0).max(360),
    dangerDirectionLabel: z.string(),
    nearestDangerZoneId: z.string().optional(),
    nearestDangerZoneName: z.string().default(""),
    nearestDangerType: DangerZoneTypeSchema.optional(),
    nearestDangerNote: z.string().default("")
  }),
  evacuation: z.object({
    recommendedSafeZone: z.object({
      id: z.string(),
      name: z.string(),
      lat: z.number(),
      lon: z.number(),
      elevationM: z.number().nonnegative(),
      capacity: z.number().int().nonnegative(),
      distanceKm: z.number().nonnegative(),
      bearing: z.number().min(0).max(360)
    }),
    routeAvailable: z.boolean(),
    route: z.object({
      type: z.enum(["verified_path", "fallback"]),
      distanceKm: z.number().nonnegative(),
      walkTimeMin: z.number().int().nonnegative(),
      isUphill: z.boolean(),
      steps: z.array(z.string()),
      bearingDegrees: z.number().min(0).max(360),
      bearingLabel: z.string()
    }),
    offlineFallback: z.object({
      bearingDegrees: z.number().min(0).max(360),
      bearingLabel: z.string(),
      distanceKm: z.number().nonnegative(),
      landmark: z.string()
    })
  }),
  movement: z.object({
    userHeadingDegrees: z.number().min(0).max(360).nullable().default(null),
    headingLabel: z.string().default(""),
    movingTowardDanger: z.boolean().default(false),
    safeBearingDegrees: z.number().min(0).max(360),
    safeBearingLabel: z.string(),
    dangerBearingDeltaDegrees: z.number().min(0).max(180).nullable().default(null)
  }),
  warnings: z.array(z.object({
    type: z.string(),
    message: z.string()
  }))
});

export const NearbySafeZonesResponseSchema = z.object({
  safeZones: z.array(NearbySafeZoneSchema)
});

export const MlPredictionRequestSchema = z.object({
  zoneId: z.string(),
  horizonHours: z.number().int().min(0).max(2),
  rainfallMmHr: z.number().min(0),
  slopeDegrees: z.number().min(0),
  soilMoistureProxyPct: z.number().min(0).max(100),
  historicalLandslideFrequency: z.number().min(0)
});

export const MlPredictionResponseSchema = z.object({
  zoneId: z.string(),
  horizonHours: z.number().int().min(0).max(2),
  riskScore: z.number().min(0).max(100),
  riskLevel: RiskLevelSchema,
  topFeatures: z.array(z.string()).min(1),
  predictedAt: z.string()
});

export const InternalRiskCycleSchema = z.object({
  zone: ZoneStaticSchema,
  weather: LiveWeatherSchema,
  current: PredictionCoreSchema,
  forecast: z.array(ForecastPointSchema).length(2),
  hotspot: HotspotSchema
});

export const InternalRiskCycleBatchSchema = z.object({
  cycles: z.array(InternalRiskCycleSchema).min(1)
});

export const RoadConditionSyncItemSchema = z.object({
  segmentId: z.string(),
  status: RoadStatusSchema,
  averageSpeedKmph: z.number().nonnegative(),
  delayMinutes: z.number().int().nonnegative().default(0),
  severityPct: z.number().min(0).max(100).default(0),
  source: z.string(),
  note: z.string(),
  updatedAt: z.string()
});

export const InternalRoadConditionBatchSchema = z.object({
  zoneId: z.string(),
  updates: z.array(RoadConditionSyncItemSchema).min(1)
});

export const ComputedRouteStepSchema = z.object({
  instructionHi: z.string(),
  instructionEn: z.string(),
  distanceM: z.number().int().nonnegative(),
  roadStatus: RoadStatusSchema
});

export const ComputedSafeZoneRouteSchema = z.object({
  zoneId: z.string(),
  origin: CoordinatesSchema,
  destination: z.object({
    id: z.string(),
    name: z.string(),
    lat: z.number(),
    lon: z.number(),
    capacity: z.number().int().nonnegative(),
    elevationM: z.number().nonnegative().default(0)
  }),
  route: z.object({
    source: z.enum(["osrm_public_api", "published_path_fallback"]),
    distanceKm: z.number().nonnegative(),
    durationMinutes: z.number().int().nonnegative(),
    mode: z.literal("walking"),
    polyline: z.string(),
    coordinates: z.array(CoordinatesSchema).min(2),
    steps: z.array(ComputedRouteStepSchema).default([]),
    warnings: z.array(z.string()).default([]),
    blockedRoadsAvoided: z.array(z.string()).default([])
  }),
  alternateRoute: z
    .object({
      distanceKm: z.number().nonnegative(),
      durationMinutes: z.number().int().nonnegative(),
      coordinates: z.array(CoordinatesSchema).min(2),
      warnings: z.array(z.string()).default([])
    })
    .nullable()
    .default(null),
  fallbackDirections: z.string().default("")
});

export const MediaReportSchema = z.object({
  id: z.string(),
  zoneId: z.string(),
  zoneName: z.string(),
  districtId: z.string(),
  mediaType: MediaTypeSchema,
  fileName: z.string(),
  mimeType: z.string(),
  fileSizeBytes: z.number().int().nonnegative(),
  lat: z.number(),
  lon: z.number(),
  accuracyMeters: z.number().nonnegative().nullable().default(null),
  deviceTimestamp: z.string(),
  serverReceivedAt: z.string(),
  description: z.string().default(""),
  language: LanguageCodeSchema.default("hi"),
  verificationStatus: MediaVerificationStatusSchema.default("pending"),
  verificationScore: z.number().min(0).max(1).nullable().default(null),
  aiLabels: z.array(z.string()).default([]),
  aiFlags: z.array(z.string()).default([]),
  privacyStatus: MediaPrivacyStatusSchema.default("clear"),
  faceBlurApplied: z.boolean().default(false),
  storageProvider: MediaStorageProviderSchema.nullable().default(null),
  storageBucket: z.string().nullable().default(null),
  storageObjectPath: z.string().nullable().default(null),
  thumbnailBucket: z.string().nullable().default(null),
  thumbnailObjectPath: z.string().nullable().default(null),
  duplicateHash: z.string().default(""),
  reviewNotes: z.string().default(""),
  reviewedAt: z.string().nullable().default(null),
  riskBoostApplied: z.boolean().default(false),
  riskBoostAmount: z.number().min(0).max(1).default(0),
  riskBoostExpiresAt: z.string().nullable().default(null),
  verificationBreakdown: MediaVerificationBreakdownSchema.nullable().default(null),
  uploadedByPhoneHash: z.string().optional()
});

export const MediaUploadFieldsSchema = z.object({
  lat: z.coerce.number(),
  lon: z.coerce.number(),
  accuracyM: z.coerce.number().nonnegative().optional(),
  description: z.string().optional(),
  language: LanguageCodeSchema.optional(),
  phoneHash: z.string().optional(),
  deviceTimestamp: z.string().optional()
});

export const MediaUploadResponseSchema = z.object({
  reportId: z.string(),
  status: MediaVerificationStatusSchema,
  zoneId: z.string(),
  zoneName: z.string(),
  message: z.string(),
  estimatedReviewMinutes: z.number().int().nonnegative()
});

export const MediaReportStatusResponseSchema = z.object({
  reportId: z.string(),
  status: MediaVerificationStatusSchema,
  verificationScore: z.number().min(0).max(1).nullable(),
  zoneName: z.string(),
  riskBoostApplied: z.boolean(),
  riskBoostExpiresAt: z.string().nullable().default(null),
  verificationBreakdown: MediaVerificationBreakdownSchema.nullable().default(null),
  message: z.string()
});

export const MediaReportReviewRequestSchema = z.object({
  decision: z.enum(["verified", "fake", "duplicate", "unverified"]),
  notes: z.string().min(3)
});

export const MediaPrivacyReviewRequestSchema = z.object({
  action: z.enum(["mark_blur_required", "mark_blur_applied", "clear_privacy_flag"]),
  notes: z.string().default("")
});

export const MediaReportDeleteRequestSchema = z.object({
  phoneHash: z.string().min(6)
});

export const DashboardMediaReportsResponseSchema = z.object({
  reports: z.array(MediaReportSchema),
  total: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  verified: z.number().int().nonnegative(),
  flagged: z.number().int().nonnegative()
});

export const MediaReportAssetsResponseSchema = z.object({
  reportId: z.string(),
  available: z.boolean(),
  provider: MediaStorageProviderSchema.nullable().default(null),
  mediaUrl: z.string().nullable().default(null),
  thumbnailUrl: z.string().nullable().default(null),
  expiresInSeconds: z.number().int().nonnegative().default(0)
});

export const MediaReportDeleteResponseSchema = z.object({
  ok: z.boolean(),
  reportId: z.string(),
  deleted: z.boolean(),
  message: z.string()
});

export type RiskLevel = z.infer<typeof RiskLevelSchema>;
export type Channel = z.infer<typeof ChannelSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type LanguageCode = z.infer<typeof LanguageCodeSchema>;
export type MediaType = z.infer<typeof MediaTypeSchema>;
export type RoadStatus = z.infer<typeof RoadStatusSchema>;
export type ValleyExposure = z.infer<typeof ValleyExposureSchema>;
export type EvacuationPathCategory = z.infer<typeof EvacuationPathCategorySchema>;
export type DangerZoneType = z.infer<typeof DangerZoneTypeSchema>;
export type MediaPrivacyStatus = z.infer<typeof MediaPrivacyStatusSchema>;
export type MediaStorageProvider = z.infer<typeof MediaStorageProviderSchema>;
export type MediaVerificationStatus = z.infer<typeof MediaVerificationStatusSchema>;
export type MediaVerificationComponent = z.infer<typeof MediaVerificationComponentSchema>;
export type MediaVerificationBreakdown = z.infer<typeof MediaVerificationBreakdownSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type District = z.infer<typeof DistrictSchema>;
export type DistrictBoundary = z.infer<typeof DistrictBoundarySchema>;
export type ZoneStatic = z.infer<typeof ZoneStaticSchema>;
export type DangerZone = z.infer<typeof DangerZoneSchema>;
export type LiveWeather = z.infer<typeof LiveWeatherSchema>;
export type Coordinates = z.infer<typeof CoordinatesSchema>;
export type RoadSegment = z.infer<typeof RoadSegmentSchema>;
export type RoadCondition = z.infer<typeof RoadConditionSchema>;
export type RoadConditionSegment = z.infer<typeof RoadConditionSegmentSchema>;
export type ZoneRoadConditionsSummary = z.infer<typeof ZoneRoadConditionsSummarySchema>;
export type ZoneRoadConditions = z.infer<typeof ZoneRoadConditionsSchema>;
export type ElevationProfilePoint = z.infer<typeof ElevationProfilePointSchema>;
export type ElevationProfile = z.infer<typeof ElevationProfileSchema>;
export type PredictionCore = z.infer<typeof PredictionCoreSchema>;
export type ForecastPoint = z.infer<typeof ForecastPointSchema>;
export type Hotspot = z.infer<typeof HotspotSchema>;
export type SafeShelter = z.infer<typeof SafeShelterSchema>;
export type EvacuationRoute = z.infer<typeof EvacuationRouteSchema>;
export type EvacuationPathUpsertRequest = z.infer<typeof EvacuationPathUpsertRequestSchema>;
export type Subscription = z.infer<typeof SubscriptionSchema>;
export type SubscribeRequest = z.infer<typeof SubscribeRequestSchema>;
export type LocalizedAlertMessage = z.infer<typeof LocalizedAlertMessageSchema>;
export type AlertLog = z.infer<typeof AlertLogSchema>;
export type AlertTriggerRequest = z.infer<typeof AlertTriggerRequestSchema>;
export type AlertPreview = z.infer<typeof AlertPreviewSchema>;
export type NearbySafeZone = z.infer<typeof NearbySafeZoneSchema>;
export type LocationStatus = z.infer<typeof LocationStatusSchema>;
export type NearbySafeZonesResponse = z.infer<typeof NearbySafeZonesResponseSchema>;
export type MlPredictionRequest = z.infer<typeof MlPredictionRequestSchema>;
export type MlPredictionResponse = z.infer<typeof MlPredictionResponseSchema>;
export type InternalRiskCycle = z.infer<typeof InternalRiskCycleSchema>;
export type RoadConditionSyncItem = z.infer<typeof RoadConditionSyncItemSchema>;
export type InternalRoadConditionBatch = z.infer<typeof InternalRoadConditionBatchSchema>;
export type ComputedRouteStep = z.infer<typeof ComputedRouteStepSchema>;
export type ComputedSafeZoneRoute = z.infer<typeof ComputedSafeZoneRouteSchema>;
export type MediaReport = z.infer<typeof MediaReportSchema>;
export type MediaUploadFields = z.infer<typeof MediaUploadFieldsSchema>;
export type MediaUploadResponse = z.infer<typeof MediaUploadResponseSchema>;
export type MediaReportStatusResponse = z.infer<typeof MediaReportStatusResponseSchema>;
export type MediaReportReviewRequest = z.infer<typeof MediaReportReviewRequestSchema>;
export type MediaPrivacyReviewRequest = z.infer<typeof MediaPrivacyReviewRequestSchema>;
export type MediaReportDeleteRequest = z.infer<typeof MediaReportDeleteRequestSchema>;
export type DashboardMediaReportsResponse = z.infer<typeof DashboardMediaReportsResponseSchema>;
export type MediaReportAssetsResponse = z.infer<typeof MediaReportAssetsResponseSchema>;
export type MediaReportDeleteResponse = z.infer<typeof MediaReportDeleteResponseSchema>;
