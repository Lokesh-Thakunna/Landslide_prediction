import { z } from "zod";
export declare const RiskLevelSchema: z.ZodEnum<["SAFE", "WATCH", "DANGER"]>;
export declare const ChannelSchema: z.ZodEnum<["SMS", "WHATSAPP"]>;
export declare const RoleSchema: z.ZodEnum<["ADMIN", "DISTRICT_OFFICIAL", "ANALYST"]>;
export declare const LanguageCodeSchema: z.ZodEnum<["hi", "en", "hi-x-garhwali", "hi-x-kumaoni"]>;
export declare const LoginRequestSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const DistrictSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    stateName: z.ZodString;
    zoneCount: z.ZodDefault<z.ZodNumber>;
    defaultLanguage: z.ZodDefault<z.ZodEnum<["hi", "en", "hi-x-garhwali", "hi-x-kumaoni"]>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    stateName: string;
    zoneCount: number;
    defaultLanguage: "hi" | "en" | "hi-x-garhwali" | "hi-x-kumaoni";
}, {
    id: string;
    name: string;
    stateName: string;
    zoneCount?: number | undefined;
    defaultLanguage?: "hi" | "en" | "hi-x-garhwali" | "hi-x-kumaoni" | undefined;
}>;
export declare const ZoneStaticSchema: z.ZodObject<{
    id: z.ZodString;
    districtId: z.ZodString;
    districtName: z.ZodString;
    name: z.ZodString;
    centroidLat: z.ZodNumber;
    centroidLon: z.ZodNumber;
    slopeDegrees: z.ZodNumber;
    historicalLandslideFrequency: z.ZodNumber;
    riskPriority: z.ZodNumber;
    isActive: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    districtId: string;
    districtName: string;
    centroidLat: number;
    centroidLon: number;
    slopeDegrees: number;
    historicalLandslideFrequency: number;
    riskPriority: number;
    isActive: boolean;
}, {
    id: string;
    name: string;
    districtId: string;
    districtName: string;
    centroidLat: number;
    centroidLon: number;
    slopeDegrees: number;
    historicalLandslideFrequency: number;
    riskPriority: number;
    isActive: boolean;
}>;
export declare const LiveWeatherSchema: z.ZodObject<{
    zoneId: z.ZodString;
    rainfallMmHr: z.ZodNumber;
    observedAt: z.ZodString;
    source: z.ZodString;
    isStale: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    zoneId: string;
    rainfallMmHr: number;
    observedAt: string;
    source: string;
    isStale: boolean;
}, {
    zoneId: string;
    rainfallMmHr: number;
    observedAt: string;
    source: string;
    isStale: boolean;
}>;
export declare const PredictionCoreSchema: z.ZodObject<{
    zoneId: z.ZodString;
    riskScore: z.ZodNumber;
    riskLevel: z.ZodEnum<["SAFE", "WATCH", "DANGER"]>;
    predictedAt: z.ZodString;
    soilMoistureProxyPct: z.ZodNumber;
    groundMovementProxyPct: z.ZodNumber;
    topFeatures: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    zoneId: string;
    riskScore: number;
    riskLevel: "SAFE" | "WATCH" | "DANGER";
    predictedAt: string;
    soilMoistureProxyPct: number;
    groundMovementProxyPct: number;
    topFeatures: string[];
}, {
    zoneId: string;
    riskScore: number;
    riskLevel: "SAFE" | "WATCH" | "DANGER";
    predictedAt: string;
    soilMoistureProxyPct: number;
    groundMovementProxyPct: number;
    topFeatures: string[];
}>;
export declare const ForecastPointSchema: z.ZodObject<{
    zoneId: z.ZodString;
    horizonHours: z.ZodNumber;
    forecastFor: z.ZodString;
    riskScore: z.ZodNumber;
    riskLevel: z.ZodEnum<["SAFE", "WATCH", "DANGER"]>;
    soilMoistureProxyPct: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    zoneId: string;
    riskScore: number;
    riskLevel: "SAFE" | "WATCH" | "DANGER";
    soilMoistureProxyPct: number;
    horizonHours: number;
    forecastFor: string;
}, {
    zoneId: string;
    riskScore: number;
    riskLevel: "SAFE" | "WATCH" | "DANGER";
    soilMoistureProxyPct: number;
    horizonHours: number;
    forecastFor: string;
}>;
export declare const HotspotSchema: z.ZodObject<{
    zoneId: z.ZodString;
    zoneName: z.ZodString;
    districtName: z.ZodString;
    riskScore: z.ZodNumber;
    riskLevel: z.ZodEnum<["SAFE", "WATCH", "DANGER"]>;
    trend: z.ZodEnum<["rising", "steady", "falling"]>;
    nextHorizonLevel: z.ZodOptional<z.ZodEnum<["SAFE", "WATCH", "DANGER"]>>;
}, "strip", z.ZodTypeAny, {
    districtName: string;
    zoneId: string;
    riskScore: number;
    riskLevel: "SAFE" | "WATCH" | "DANGER";
    zoneName: string;
    trend: "rising" | "steady" | "falling";
    nextHorizonLevel?: "SAFE" | "WATCH" | "DANGER" | undefined;
}, {
    districtName: string;
    zoneId: string;
    riskScore: number;
    riskLevel: "SAFE" | "WATCH" | "DANGER";
    zoneName: string;
    trend: "rising" | "steady" | "falling";
    nextHorizonLevel?: "SAFE" | "WATCH" | "DANGER" | undefined;
}>;
export declare const SafeShelterSchema: z.ZodObject<{
    id: z.ZodString;
    zoneId: z.ZodString;
    districtId: z.ZodString;
    name: z.ZodString;
    capacity: z.ZodNumber;
    distanceKm: z.ZodNumber;
    contactNumber: z.ZodString;
    instructionSummary: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    districtId: string;
    zoneId: string;
    capacity: number;
    distanceKm: number;
    contactNumber: string;
    instructionSummary: string;
}, {
    id: string;
    name: string;
    districtId: string;
    zoneId: string;
    capacity: number;
    distanceKm: number;
    contactNumber: string;
    instructionSummary: string;
}>;
export declare const EvacuationRouteSchema: z.ZodObject<{
    id: z.ZodString;
    zoneId: z.ZodString;
    safeShelterId: z.ZodString;
    distanceKm: z.ZodNumber;
    estimatedMinutes: z.ZodNumber;
    instructionSummary: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    zoneId: string;
    distanceKm: number;
    instructionSummary: string;
    safeShelterId: string;
    estimatedMinutes: number;
}, {
    id: string;
    zoneId: string;
    distanceKm: number;
    instructionSummary: string;
    safeShelterId: string;
    estimatedMinutes: number;
}>;
export declare const SubscriptionSchema: z.ZodObject<{
    id: z.ZodString;
    zoneId: z.ZodString;
    phoneNumber: z.ZodString;
    channels: z.ZodArray<z.ZodEnum<["SMS", "WHATSAPP"]>, "many">;
    appLanguage: z.ZodDefault<z.ZodEnum<["hi", "en", "hi-x-garhwali", "hi-x-kumaoni"]>>;
    alertLanguage: z.ZodDefault<z.ZodEnum<["hi", "en", "hi-x-garhwali", "hi-x-kumaoni"]>>;
    isActive: z.ZodBoolean;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    isActive: boolean;
    zoneId: string;
    phoneNumber: string;
    channels: ("SMS" | "WHATSAPP")[];
    appLanguage: "hi" | "en" | "hi-x-garhwali" | "hi-x-kumaoni";
    alertLanguage: "hi" | "en" | "hi-x-garhwali" | "hi-x-kumaoni";
    createdAt: string;
}, {
    id: string;
    isActive: boolean;
    zoneId: string;
    phoneNumber: string;
    channels: ("SMS" | "WHATSAPP")[];
    createdAt: string;
    appLanguage?: "hi" | "en" | "hi-x-garhwali" | "hi-x-kumaoni" | undefined;
    alertLanguage?: "hi" | "en" | "hi-x-garhwali" | "hi-x-kumaoni" | undefined;
}>;
export declare const SubscribeRequestSchema: z.ZodObject<{
    phoneNumber: z.ZodString;
    zoneId: z.ZodString;
    channels: z.ZodArray<z.ZodEnum<["SMS", "WHATSAPP"]>, "many">;
    appLanguage: z.ZodDefault<z.ZodEnum<["hi", "en", "hi-x-garhwali", "hi-x-kumaoni"]>>;
    alertLanguage: z.ZodOptional<z.ZodEnum<["hi", "en", "hi-x-garhwali", "hi-x-kumaoni"]>>;
}, "strip", z.ZodTypeAny, {
    zoneId: string;
    phoneNumber: string;
    channels: ("SMS" | "WHATSAPP")[];
    appLanguage: "hi" | "en" | "hi-x-garhwali" | "hi-x-kumaoni";
    alertLanguage?: "hi" | "en" | "hi-x-garhwali" | "hi-x-kumaoni" | undefined;
}, {
    zoneId: string;
    phoneNumber: string;
    channels: ("SMS" | "WHATSAPP")[];
    appLanguage?: "hi" | "en" | "hi-x-garhwali" | "hi-x-kumaoni" | undefined;
    alertLanguage?: "hi" | "en" | "hi-x-garhwali" | "hi-x-kumaoni" | undefined;
}>;
export declare const LocalizedAlertMessageSchema: z.ZodObject<{
    language: z.ZodEnum<["hi", "en", "hi-x-garhwali", "hi-x-kumaoni"]>;
    languageLabel: z.ZodString;
    subscriberCount: z.ZodNumber;
    smsBody: z.ZodString;
    whatsappBody: z.ZodString;
}, "strip", z.ZodTypeAny, {
    language: "hi" | "en" | "hi-x-garhwali" | "hi-x-kumaoni";
    languageLabel: string;
    subscriberCount: number;
    smsBody: string;
    whatsappBody: string;
}, {
    language: "hi" | "en" | "hi-x-garhwali" | "hi-x-kumaoni";
    languageLabel: string;
    subscriberCount: number;
    smsBody: string;
    whatsappBody: string;
}>;
export declare const AlertLogSchema: z.ZodObject<{
    id: z.ZodString;
    zoneId: z.ZodString;
    zoneName: z.ZodString;
    riskLevel: z.ZodEnum<["SAFE", "WATCH", "DANGER"]>;
    riskScore: z.ZodNumber;
    triggerSource: z.ZodEnum<["AUTO_CURRENT", "AUTO_FORECAST", "MANUAL"]>;
    triggerHorizonHours: z.ZodNumber;
    channels: z.ZodArray<z.ZodEnum<["SMS", "WHATSAPP"]>, "many">;
    recipientCount: z.ZodNumber;
    deliveryStatus: z.ZodEnum<["SIMULATED", "QUEUED", "DELIVERED", "FAILED", "PARTIAL"]>;
    localizedMessages: z.ZodDefault<z.ZodArray<z.ZodObject<{
        language: z.ZodEnum<["hi", "en", "hi-x-garhwali", "hi-x-kumaoni"]>;
        languageLabel: z.ZodString;
        subscriberCount: z.ZodNumber;
        smsBody: z.ZodString;
        whatsappBody: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        language: "hi" | "en" | "hi-x-garhwali" | "hi-x-kumaoni";
        languageLabel: string;
        subscriberCount: number;
        smsBody: string;
        whatsappBody: string;
    }, {
        language: "hi" | "en" | "hi-x-garhwali" | "hi-x-kumaoni";
        languageLabel: string;
        subscriberCount: number;
        smsBody: string;
        whatsappBody: string;
    }>, "many">>;
    createdAt: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    zoneId: string;
    riskScore: number;
    riskLevel: "SAFE" | "WATCH" | "DANGER";
    zoneName: string;
    channels: ("SMS" | "WHATSAPP")[];
    createdAt: string;
    triggerSource: "AUTO_CURRENT" | "AUTO_FORECAST" | "MANUAL";
    triggerHorizonHours: number;
    recipientCount: number;
    deliveryStatus: "SIMULATED" | "QUEUED" | "DELIVERED" | "FAILED" | "PARTIAL";
    localizedMessages: {
        language: "hi" | "en" | "hi-x-garhwali" | "hi-x-kumaoni";
        languageLabel: string;
        subscriberCount: number;
        smsBody: string;
        whatsappBody: string;
    }[];
    reason?: string | undefined;
}, {
    id: string;
    zoneId: string;
    riskScore: number;
    riskLevel: "SAFE" | "WATCH" | "DANGER";
    zoneName: string;
    channels: ("SMS" | "WHATSAPP")[];
    createdAt: string;
    triggerSource: "AUTO_CURRENT" | "AUTO_FORECAST" | "MANUAL";
    triggerHorizonHours: number;
    recipientCount: number;
    deliveryStatus: "SIMULATED" | "QUEUED" | "DELIVERED" | "FAILED" | "PARTIAL";
    localizedMessages?: {
        language: "hi" | "en" | "hi-x-garhwali" | "hi-x-kumaoni";
        languageLabel: string;
        subscriberCount: number;
        smsBody: string;
        whatsappBody: string;
    }[] | undefined;
    reason?: string | undefined;
}>;
export declare const AlertTriggerRequestSchema: z.ZodObject<{
    zoneId: z.ZodString;
    reason: z.ZodString;
    channels: z.ZodArray<z.ZodEnum<["SMS", "WHATSAPP"]>, "many">;
}, "strip", z.ZodTypeAny, {
    zoneId: string;
    channels: ("SMS" | "WHATSAPP")[];
    reason: string;
}, {
    zoneId: string;
    channels: ("SMS" | "WHATSAPP")[];
    reason: string;
}>;
export declare const AlertPreviewSchema: z.ZodObject<{
    zoneId: z.ZodString;
    zoneName: z.ZodString;
    riskLevel: z.ZodEnum<["SAFE", "WATCH", "DANGER"]>;
    totalSubscribers: z.ZodNumber;
    localizedMessages: z.ZodArray<z.ZodObject<{
        language: z.ZodEnum<["hi", "en", "hi-x-garhwali", "hi-x-kumaoni"]>;
        languageLabel: z.ZodString;
        subscriberCount: z.ZodNumber;
        smsBody: z.ZodString;
        whatsappBody: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        language: "hi" | "en" | "hi-x-garhwali" | "hi-x-kumaoni";
        languageLabel: string;
        subscriberCount: number;
        smsBody: string;
        whatsappBody: string;
    }, {
        language: "hi" | "en" | "hi-x-garhwali" | "hi-x-kumaoni";
        languageLabel: string;
        subscriberCount: number;
        smsBody: string;
        whatsappBody: string;
    }>, "many">;
    notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    zoneId: string;
    riskLevel: "SAFE" | "WATCH" | "DANGER";
    zoneName: string;
    localizedMessages: {
        language: "hi" | "en" | "hi-x-garhwali" | "hi-x-kumaoni";
        languageLabel: string;
        subscriberCount: number;
        smsBody: string;
        whatsappBody: string;
    }[];
    totalSubscribers: number;
    notes: string[];
}, {
    zoneId: string;
    riskLevel: "SAFE" | "WATCH" | "DANGER";
    zoneName: string;
    localizedMessages: {
        language: "hi" | "en" | "hi-x-garhwali" | "hi-x-kumaoni";
        languageLabel: string;
        subscriberCount: number;
        smsBody: string;
        whatsappBody: string;
    }[];
    totalSubscribers: number;
    notes?: string[] | undefined;
}>;
export declare const MlPredictionRequestSchema: z.ZodObject<{
    zoneId: z.ZodString;
    horizonHours: z.ZodNumber;
    rainfallMmHr: z.ZodNumber;
    slopeDegrees: z.ZodNumber;
    soilMoistureProxyPct: z.ZodNumber;
    historicalLandslideFrequency: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    slopeDegrees: number;
    historicalLandslideFrequency: number;
    zoneId: string;
    rainfallMmHr: number;
    soilMoistureProxyPct: number;
    horizonHours: number;
}, {
    slopeDegrees: number;
    historicalLandslideFrequency: number;
    zoneId: string;
    rainfallMmHr: number;
    soilMoistureProxyPct: number;
    horizonHours: number;
}>;
export declare const MlPredictionResponseSchema: z.ZodObject<{
    zoneId: z.ZodString;
    horizonHours: z.ZodNumber;
    riskScore: z.ZodNumber;
    riskLevel: z.ZodEnum<["SAFE", "WATCH", "DANGER"]>;
    topFeatures: z.ZodArray<z.ZodString, "many">;
    predictedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    zoneId: string;
    riskScore: number;
    riskLevel: "SAFE" | "WATCH" | "DANGER";
    predictedAt: string;
    topFeatures: string[];
    horizonHours: number;
}, {
    zoneId: string;
    riskScore: number;
    riskLevel: "SAFE" | "WATCH" | "DANGER";
    predictedAt: string;
    topFeatures: string[];
    horizonHours: number;
}>;
export declare const InternalRiskCycleSchema: z.ZodObject<{
    zone: z.ZodObject<{
        id: z.ZodString;
        districtId: z.ZodString;
        districtName: z.ZodString;
        name: z.ZodString;
        centroidLat: z.ZodNumber;
        centroidLon: z.ZodNumber;
        slopeDegrees: z.ZodNumber;
        historicalLandslideFrequency: z.ZodNumber;
        riskPriority: z.ZodNumber;
        isActive: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        districtId: string;
        districtName: string;
        centroidLat: number;
        centroidLon: number;
        slopeDegrees: number;
        historicalLandslideFrequency: number;
        riskPriority: number;
        isActive: boolean;
    }, {
        id: string;
        name: string;
        districtId: string;
        districtName: string;
        centroidLat: number;
        centroidLon: number;
        slopeDegrees: number;
        historicalLandslideFrequency: number;
        riskPriority: number;
        isActive: boolean;
    }>;
    weather: z.ZodObject<{
        zoneId: z.ZodString;
        rainfallMmHr: z.ZodNumber;
        observedAt: z.ZodString;
        source: z.ZodString;
        isStale: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        zoneId: string;
        rainfallMmHr: number;
        observedAt: string;
        source: string;
        isStale: boolean;
    }, {
        zoneId: string;
        rainfallMmHr: number;
        observedAt: string;
        source: string;
        isStale: boolean;
    }>;
    current: z.ZodObject<{
        zoneId: z.ZodString;
        riskScore: z.ZodNumber;
        riskLevel: z.ZodEnum<["SAFE", "WATCH", "DANGER"]>;
        predictedAt: z.ZodString;
        soilMoistureProxyPct: z.ZodNumber;
        groundMovementProxyPct: z.ZodNumber;
        topFeatures: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        zoneId: string;
        riskScore: number;
        riskLevel: "SAFE" | "WATCH" | "DANGER";
        predictedAt: string;
        soilMoistureProxyPct: number;
        groundMovementProxyPct: number;
        topFeatures: string[];
    }, {
        zoneId: string;
        riskScore: number;
        riskLevel: "SAFE" | "WATCH" | "DANGER";
        predictedAt: string;
        soilMoistureProxyPct: number;
        groundMovementProxyPct: number;
        topFeatures: string[];
    }>;
    forecast: z.ZodArray<z.ZodObject<{
        zoneId: z.ZodString;
        horizonHours: z.ZodNumber;
        forecastFor: z.ZodString;
        riskScore: z.ZodNumber;
        riskLevel: z.ZodEnum<["SAFE", "WATCH", "DANGER"]>;
        soilMoistureProxyPct: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        zoneId: string;
        riskScore: number;
        riskLevel: "SAFE" | "WATCH" | "DANGER";
        soilMoistureProxyPct: number;
        horizonHours: number;
        forecastFor: string;
    }, {
        zoneId: string;
        riskScore: number;
        riskLevel: "SAFE" | "WATCH" | "DANGER";
        soilMoistureProxyPct: number;
        horizonHours: number;
        forecastFor: string;
    }>, "many">;
    hotspot: z.ZodObject<{
        zoneId: z.ZodString;
        zoneName: z.ZodString;
        districtName: z.ZodString;
        riskScore: z.ZodNumber;
        riskLevel: z.ZodEnum<["SAFE", "WATCH", "DANGER"]>;
        trend: z.ZodEnum<["rising", "steady", "falling"]>;
        nextHorizonLevel: z.ZodOptional<z.ZodEnum<["SAFE", "WATCH", "DANGER"]>>;
    }, "strip", z.ZodTypeAny, {
        districtName: string;
        zoneId: string;
        riskScore: number;
        riskLevel: "SAFE" | "WATCH" | "DANGER";
        zoneName: string;
        trend: "rising" | "steady" | "falling";
        nextHorizonLevel?: "SAFE" | "WATCH" | "DANGER" | undefined;
    }, {
        districtName: string;
        zoneId: string;
        riskScore: number;
        riskLevel: "SAFE" | "WATCH" | "DANGER";
        zoneName: string;
        trend: "rising" | "steady" | "falling";
        nextHorizonLevel?: "SAFE" | "WATCH" | "DANGER" | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    zone: {
        id: string;
        name: string;
        districtId: string;
        districtName: string;
        centroidLat: number;
        centroidLon: number;
        slopeDegrees: number;
        historicalLandslideFrequency: number;
        riskPriority: number;
        isActive: boolean;
    };
    weather: {
        zoneId: string;
        rainfallMmHr: number;
        observedAt: string;
        source: string;
        isStale: boolean;
    };
    current: {
        zoneId: string;
        riskScore: number;
        riskLevel: "SAFE" | "WATCH" | "DANGER";
        predictedAt: string;
        soilMoistureProxyPct: number;
        groundMovementProxyPct: number;
        topFeatures: string[];
    };
    forecast: {
        zoneId: string;
        riskScore: number;
        riskLevel: "SAFE" | "WATCH" | "DANGER";
        soilMoistureProxyPct: number;
        horizonHours: number;
        forecastFor: string;
    }[];
    hotspot: {
        districtName: string;
        zoneId: string;
        riskScore: number;
        riskLevel: "SAFE" | "WATCH" | "DANGER";
        zoneName: string;
        trend: "rising" | "steady" | "falling";
        nextHorizonLevel?: "SAFE" | "WATCH" | "DANGER" | undefined;
    };
}, {
    zone: {
        id: string;
        name: string;
        districtId: string;
        districtName: string;
        centroidLat: number;
        centroidLon: number;
        slopeDegrees: number;
        historicalLandslideFrequency: number;
        riskPriority: number;
        isActive: boolean;
    };
    weather: {
        zoneId: string;
        rainfallMmHr: number;
        observedAt: string;
        source: string;
        isStale: boolean;
    };
    current: {
        zoneId: string;
        riskScore: number;
        riskLevel: "SAFE" | "WATCH" | "DANGER";
        predictedAt: string;
        soilMoistureProxyPct: number;
        groundMovementProxyPct: number;
        topFeatures: string[];
    };
    forecast: {
        zoneId: string;
        riskScore: number;
        riskLevel: "SAFE" | "WATCH" | "DANGER";
        soilMoistureProxyPct: number;
        horizonHours: number;
        forecastFor: string;
    }[];
    hotspot: {
        districtName: string;
        zoneId: string;
        riskScore: number;
        riskLevel: "SAFE" | "WATCH" | "DANGER";
        zoneName: string;
        trend: "rising" | "steady" | "falling";
        nextHorizonLevel?: "SAFE" | "WATCH" | "DANGER" | undefined;
    };
}>;
export declare const InternalRiskCycleBatchSchema: z.ZodObject<{
    cycles: z.ZodArray<z.ZodObject<{
        zone: z.ZodObject<{
            id: z.ZodString;
            districtId: z.ZodString;
            districtName: z.ZodString;
            name: z.ZodString;
            centroidLat: z.ZodNumber;
            centroidLon: z.ZodNumber;
            slopeDegrees: z.ZodNumber;
            historicalLandslideFrequency: z.ZodNumber;
            riskPriority: z.ZodNumber;
            isActive: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            districtId: string;
            districtName: string;
            centroidLat: number;
            centroidLon: number;
            slopeDegrees: number;
            historicalLandslideFrequency: number;
            riskPriority: number;
            isActive: boolean;
        }, {
            id: string;
            name: string;
            districtId: string;
            districtName: string;
            centroidLat: number;
            centroidLon: number;
            slopeDegrees: number;
            historicalLandslideFrequency: number;
            riskPriority: number;
            isActive: boolean;
        }>;
        weather: z.ZodObject<{
            zoneId: z.ZodString;
            rainfallMmHr: z.ZodNumber;
            observedAt: z.ZodString;
            source: z.ZodString;
            isStale: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            zoneId: string;
            rainfallMmHr: number;
            observedAt: string;
            source: string;
            isStale: boolean;
        }, {
            zoneId: string;
            rainfallMmHr: number;
            observedAt: string;
            source: string;
            isStale: boolean;
        }>;
        current: z.ZodObject<{
            zoneId: z.ZodString;
            riskScore: z.ZodNumber;
            riskLevel: z.ZodEnum<["SAFE", "WATCH", "DANGER"]>;
            predictedAt: z.ZodString;
            soilMoistureProxyPct: z.ZodNumber;
            groundMovementProxyPct: z.ZodNumber;
            topFeatures: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            zoneId: string;
            riskScore: number;
            riskLevel: "SAFE" | "WATCH" | "DANGER";
            predictedAt: string;
            soilMoistureProxyPct: number;
            groundMovementProxyPct: number;
            topFeatures: string[];
        }, {
            zoneId: string;
            riskScore: number;
            riskLevel: "SAFE" | "WATCH" | "DANGER";
            predictedAt: string;
            soilMoistureProxyPct: number;
            groundMovementProxyPct: number;
            topFeatures: string[];
        }>;
        forecast: z.ZodArray<z.ZodObject<{
            zoneId: z.ZodString;
            horizonHours: z.ZodNumber;
            forecastFor: z.ZodString;
            riskScore: z.ZodNumber;
            riskLevel: z.ZodEnum<["SAFE", "WATCH", "DANGER"]>;
            soilMoistureProxyPct: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            zoneId: string;
            riskScore: number;
            riskLevel: "SAFE" | "WATCH" | "DANGER";
            soilMoistureProxyPct: number;
            horizonHours: number;
            forecastFor: string;
        }, {
            zoneId: string;
            riskScore: number;
            riskLevel: "SAFE" | "WATCH" | "DANGER";
            soilMoistureProxyPct: number;
            horizonHours: number;
            forecastFor: string;
        }>, "many">;
        hotspot: z.ZodObject<{
            zoneId: z.ZodString;
            zoneName: z.ZodString;
            districtName: z.ZodString;
            riskScore: z.ZodNumber;
            riskLevel: z.ZodEnum<["SAFE", "WATCH", "DANGER"]>;
            trend: z.ZodEnum<["rising", "steady", "falling"]>;
            nextHorizonLevel: z.ZodOptional<z.ZodEnum<["SAFE", "WATCH", "DANGER"]>>;
        }, "strip", z.ZodTypeAny, {
            districtName: string;
            zoneId: string;
            riskScore: number;
            riskLevel: "SAFE" | "WATCH" | "DANGER";
            zoneName: string;
            trend: "rising" | "steady" | "falling";
            nextHorizonLevel?: "SAFE" | "WATCH" | "DANGER" | undefined;
        }, {
            districtName: string;
            zoneId: string;
            riskScore: number;
            riskLevel: "SAFE" | "WATCH" | "DANGER";
            zoneName: string;
            trend: "rising" | "steady" | "falling";
            nextHorizonLevel?: "SAFE" | "WATCH" | "DANGER" | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        zone: {
            id: string;
            name: string;
            districtId: string;
            districtName: string;
            centroidLat: number;
            centroidLon: number;
            slopeDegrees: number;
            historicalLandslideFrequency: number;
            riskPriority: number;
            isActive: boolean;
        };
        weather: {
            zoneId: string;
            rainfallMmHr: number;
            observedAt: string;
            source: string;
            isStale: boolean;
        };
        current: {
            zoneId: string;
            riskScore: number;
            riskLevel: "SAFE" | "WATCH" | "DANGER";
            predictedAt: string;
            soilMoistureProxyPct: number;
            groundMovementProxyPct: number;
            topFeatures: string[];
        };
        forecast: {
            zoneId: string;
            riskScore: number;
            riskLevel: "SAFE" | "WATCH" | "DANGER";
            soilMoistureProxyPct: number;
            horizonHours: number;
            forecastFor: string;
        }[];
        hotspot: {
            districtName: string;
            zoneId: string;
            riskScore: number;
            riskLevel: "SAFE" | "WATCH" | "DANGER";
            zoneName: string;
            trend: "rising" | "steady" | "falling";
            nextHorizonLevel?: "SAFE" | "WATCH" | "DANGER" | undefined;
        };
    }, {
        zone: {
            id: string;
            name: string;
            districtId: string;
            districtName: string;
            centroidLat: number;
            centroidLon: number;
            slopeDegrees: number;
            historicalLandslideFrequency: number;
            riskPriority: number;
            isActive: boolean;
        };
        weather: {
            zoneId: string;
            rainfallMmHr: number;
            observedAt: string;
            source: string;
            isStale: boolean;
        };
        current: {
            zoneId: string;
            riskScore: number;
            riskLevel: "SAFE" | "WATCH" | "DANGER";
            predictedAt: string;
            soilMoistureProxyPct: number;
            groundMovementProxyPct: number;
            topFeatures: string[];
        };
        forecast: {
            zoneId: string;
            riskScore: number;
            riskLevel: "SAFE" | "WATCH" | "DANGER";
            soilMoistureProxyPct: number;
            horizonHours: number;
            forecastFor: string;
        }[];
        hotspot: {
            districtName: string;
            zoneId: string;
            riskScore: number;
            riskLevel: "SAFE" | "WATCH" | "DANGER";
            zoneName: string;
            trend: "rising" | "steady" | "falling";
            nextHorizonLevel?: "SAFE" | "WATCH" | "DANGER" | undefined;
        };
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    cycles: {
        zone: {
            id: string;
            name: string;
            districtId: string;
            districtName: string;
            centroidLat: number;
            centroidLon: number;
            slopeDegrees: number;
            historicalLandslideFrequency: number;
            riskPriority: number;
            isActive: boolean;
        };
        weather: {
            zoneId: string;
            rainfallMmHr: number;
            observedAt: string;
            source: string;
            isStale: boolean;
        };
        current: {
            zoneId: string;
            riskScore: number;
            riskLevel: "SAFE" | "WATCH" | "DANGER";
            predictedAt: string;
            soilMoistureProxyPct: number;
            groundMovementProxyPct: number;
            topFeatures: string[];
        };
        forecast: {
            zoneId: string;
            riskScore: number;
            riskLevel: "SAFE" | "WATCH" | "DANGER";
            soilMoistureProxyPct: number;
            horizonHours: number;
            forecastFor: string;
        }[];
        hotspot: {
            districtName: string;
            zoneId: string;
            riskScore: number;
            riskLevel: "SAFE" | "WATCH" | "DANGER";
            zoneName: string;
            trend: "rising" | "steady" | "falling";
            nextHorizonLevel?: "SAFE" | "WATCH" | "DANGER" | undefined;
        };
    }[];
}, {
    cycles: {
        zone: {
            id: string;
            name: string;
            districtId: string;
            districtName: string;
            centroidLat: number;
            centroidLon: number;
            slopeDegrees: number;
            historicalLandslideFrequency: number;
            riskPriority: number;
            isActive: boolean;
        };
        weather: {
            zoneId: string;
            rainfallMmHr: number;
            observedAt: string;
            source: string;
            isStale: boolean;
        };
        current: {
            zoneId: string;
            riskScore: number;
            riskLevel: "SAFE" | "WATCH" | "DANGER";
            predictedAt: string;
            soilMoistureProxyPct: number;
            groundMovementProxyPct: number;
            topFeatures: string[];
        };
        forecast: {
            zoneId: string;
            riskScore: number;
            riskLevel: "SAFE" | "WATCH" | "DANGER";
            soilMoistureProxyPct: number;
            horizonHours: number;
            forecastFor: string;
        }[];
        hotspot: {
            districtName: string;
            zoneId: string;
            riskScore: number;
            riskLevel: "SAFE" | "WATCH" | "DANGER";
            zoneName: string;
            trend: "rising" | "steady" | "falling";
            nextHorizonLevel?: "SAFE" | "WATCH" | "DANGER" | undefined;
        };
    }[];
}>;
export type RiskLevel = z.infer<typeof RiskLevelSchema>;
export type Channel = z.infer<typeof ChannelSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type LanguageCode = z.infer<typeof LanguageCodeSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type District = z.infer<typeof DistrictSchema>;
export type ZoneStatic = z.infer<typeof ZoneStaticSchema>;
export type LiveWeather = z.infer<typeof LiveWeatherSchema>;
export type PredictionCore = z.infer<typeof PredictionCoreSchema>;
export type ForecastPoint = z.infer<typeof ForecastPointSchema>;
export type Hotspot = z.infer<typeof HotspotSchema>;
export type SafeShelter = z.infer<typeof SafeShelterSchema>;
export type EvacuationRoute = z.infer<typeof EvacuationRouteSchema>;
export type Subscription = z.infer<typeof SubscriptionSchema>;
export type SubscribeRequest = z.infer<typeof SubscribeRequestSchema>;
export type LocalizedAlertMessage = z.infer<typeof LocalizedAlertMessageSchema>;
export type AlertLog = z.infer<typeof AlertLogSchema>;
export type AlertTriggerRequest = z.infer<typeof AlertTriggerRequestSchema>;
export type AlertPreview = z.infer<typeof AlertPreviewSchema>;
export type MlPredictionRequest = z.infer<typeof MlPredictionRequestSchema>;
export type MlPredictionResponse = z.infer<typeof MlPredictionResponseSchema>;
export type InternalRiskCycle = z.infer<typeof InternalRiskCycleSchema>;
