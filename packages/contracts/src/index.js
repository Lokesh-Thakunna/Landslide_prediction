"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalRiskCycleBatchSchema = exports.InternalRiskCycleSchema = exports.MlPredictionResponseSchema = exports.MlPredictionRequestSchema = exports.AlertPreviewSchema = exports.AlertTriggerRequestSchema = exports.AlertLogSchema = exports.LocalizedAlertMessageSchema = exports.SubscribeRequestSchema = exports.SubscriptionSchema = exports.EvacuationRouteSchema = exports.SafeShelterSchema = exports.HotspotSchema = exports.ForecastPointSchema = exports.PredictionCoreSchema = exports.LiveWeatherSchema = exports.ZoneStaticSchema = exports.DistrictSchema = exports.LoginRequestSchema = exports.LanguageCodeSchema = exports.RoleSchema = exports.ChannelSchema = exports.RiskLevelSchema = void 0;
const zod_1 = require("zod");
exports.RiskLevelSchema = zod_1.z.enum(["SAFE", "WATCH", "DANGER"]);
exports.ChannelSchema = zod_1.z.enum(["SMS", "WHATSAPP"]);
exports.RoleSchema = zod_1.z.enum(["ADMIN", "DISTRICT_OFFICIAL", "ANALYST"]);
exports.LanguageCodeSchema = zod_1.z.enum(["hi", "en", "hi-x-garhwali", "hi-x-kumaoni"]);
exports.LoginRequestSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8)
});
exports.DistrictSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    stateName: zod_1.z.string(),
    zoneCount: zod_1.z.number().int().nonnegative().default(0),
    defaultLanguage: exports.LanguageCodeSchema.default("hi")
});
exports.ZoneStaticSchema = zod_1.z.object({
    id: zod_1.z.string(),
    districtId: zod_1.z.string(),
    districtName: zod_1.z.string(),
    name: zod_1.z.string(),
    centroidLat: zod_1.z.number(),
    centroidLon: zod_1.z.number(),
    slopeDegrees: zod_1.z.number(),
    historicalLandslideFrequency: zod_1.z.number(),
    riskPriority: zod_1.z.number().int().min(1),
    isActive: zod_1.z.boolean()
});
exports.LiveWeatherSchema = zod_1.z.object({
    zoneId: zod_1.z.string(),
    rainfallMmHr: zod_1.z.number(),
    observedAt: zod_1.z.string(),
    source: zod_1.z.string(),
    isStale: zod_1.z.boolean()
});
exports.PredictionCoreSchema = zod_1.z.object({
    zoneId: zod_1.z.string(),
    riskScore: zod_1.z.number().min(0).max(100),
    riskLevel: exports.RiskLevelSchema,
    predictedAt: zod_1.z.string(),
    soilMoistureProxyPct: zod_1.z.number().min(0).max(100),
    groundMovementProxyPct: zod_1.z.number().min(0).max(100),
    topFeatures: zod_1.z.array(zod_1.z.string()).min(1)
});
exports.ForecastPointSchema = zod_1.z.object({
    zoneId: zod_1.z.string(),
    horizonHours: zod_1.z.number().int().min(1),
    forecastFor: zod_1.z.string(),
    riskScore: zod_1.z.number().min(0).max(100),
    riskLevel: exports.RiskLevelSchema,
    soilMoistureProxyPct: zod_1.z.number().min(0).max(100)
});
exports.HotspotSchema = zod_1.z.object({
    zoneId: zod_1.z.string(),
    zoneName: zod_1.z.string(),
    districtName: zod_1.z.string(),
    riskScore: zod_1.z.number().min(0).max(100),
    riskLevel: exports.RiskLevelSchema,
    trend: zod_1.z.enum(["rising", "steady", "falling"]),
    nextHorizonLevel: exports.RiskLevelSchema.optional()
});
exports.SafeShelterSchema = zod_1.z.object({
    id: zod_1.z.string(),
    zoneId: zod_1.z.string(),
    districtId: zod_1.z.string(),
    name: zod_1.z.string(),
    capacity: zod_1.z.number().int().nonnegative(),
    distanceKm: zod_1.z.number().nonnegative(),
    contactNumber: zod_1.z.string(),
    instructionSummary: zod_1.z.string()
});
exports.EvacuationRouteSchema = zod_1.z.object({
    id: zod_1.z.string(),
    zoneId: zod_1.z.string(),
    safeShelterId: zod_1.z.string(),
    distanceKm: zod_1.z.number().nonnegative(),
    estimatedMinutes: zod_1.z.number().int().nonnegative(),
    instructionSummary: zod_1.z.string()
});
exports.SubscriptionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    zoneId: zod_1.z.string(),
    phoneNumber: zod_1.z.string(),
    channels: zod_1.z.array(exports.ChannelSchema).min(1),
    appLanguage: exports.LanguageCodeSchema.default("hi"),
    alertLanguage: exports.LanguageCodeSchema.default("hi"),
    isActive: zod_1.z.boolean(),
    createdAt: zod_1.z.string()
});
exports.SubscribeRequestSchema = zod_1.z.object({
    phoneNumber: zod_1.z.string().regex(/^\+?[1-9]\d{7,14}$/),
    zoneId: zod_1.z.string(),
    channels: zod_1.z.array(exports.ChannelSchema).min(1),
    appLanguage: exports.LanguageCodeSchema.default("hi"),
    alertLanguage: exports.LanguageCodeSchema.optional()
});
exports.LocalizedAlertMessageSchema = zod_1.z.object({
    language: exports.LanguageCodeSchema,
    languageLabel: zod_1.z.string(),
    subscriberCount: zod_1.z.number().int().nonnegative(),
    smsBody: zod_1.z.string(),
    whatsappBody: zod_1.z.string()
});
exports.AlertLogSchema = zod_1.z.object({
    id: zod_1.z.string(),
    zoneId: zod_1.z.string(),
    zoneName: zod_1.z.string(),
    riskLevel: exports.RiskLevelSchema,
    riskScore: zod_1.z.number().min(0).max(100),
    triggerSource: zod_1.z.enum(["AUTO_CURRENT", "AUTO_FORECAST", "MANUAL"]),
    triggerHorizonHours: zod_1.z.number().int().min(0).max(2),
    channels: zod_1.z.array(exports.ChannelSchema),
    recipientCount: zod_1.z.number().int().nonnegative(),
    deliveryStatus: zod_1.z.enum(["SIMULATED", "QUEUED", "DELIVERED", "FAILED", "PARTIAL"]),
    localizedMessages: zod_1.z.array(exports.LocalizedAlertMessageSchema).default([]),
    createdAt: zod_1.z.string(),
    reason: zod_1.z.string().optional()
});
exports.AlertTriggerRequestSchema = zod_1.z.object({
    zoneId: zod_1.z.string(),
    reason: zod_1.z.string().min(5),
    channels: zod_1.z.array(exports.ChannelSchema).min(1)
});
exports.AlertPreviewSchema = zod_1.z.object({
    zoneId: zod_1.z.string(),
    zoneName: zod_1.z.string(),
    riskLevel: exports.RiskLevelSchema,
    totalSubscribers: zod_1.z.number().int().nonnegative(),
    localizedMessages: zod_1.z.array(exports.LocalizedAlertMessageSchema),
    notes: zod_1.z.array(zod_1.z.string()).default([])
});
exports.MlPredictionRequestSchema = zod_1.z.object({
    zoneId: zod_1.z.string(),
    horizonHours: zod_1.z.number().int().min(0).max(2),
    rainfallMmHr: zod_1.z.number().min(0),
    slopeDegrees: zod_1.z.number().min(0),
    soilMoistureProxyPct: zod_1.z.number().min(0).max(100),
    historicalLandslideFrequency: zod_1.z.number().min(0)
});
exports.MlPredictionResponseSchema = zod_1.z.object({
    zoneId: zod_1.z.string(),
    horizonHours: zod_1.z.number().int().min(0).max(2),
    riskScore: zod_1.z.number().min(0).max(100),
    riskLevel: exports.RiskLevelSchema,
    topFeatures: zod_1.z.array(zod_1.z.string()).min(1),
    predictedAt: zod_1.z.string()
});
exports.InternalRiskCycleSchema = zod_1.z.object({
    zone: exports.ZoneStaticSchema,
    weather: exports.LiveWeatherSchema,
    current: exports.PredictionCoreSchema,
    forecast: zod_1.z.array(exports.ForecastPointSchema).length(2),
    hotspot: exports.HotspotSchema
});
exports.InternalRiskCycleBatchSchema = zod_1.z.object({
    cycles: zod_1.z.array(exports.InternalRiskCycleSchema).min(1)
});
