import fs from "fs";
import path from "path";
import {
  AlertLog,
  DangerZone,
  District,
  ElevationProfile,
  EvacuationPathUpsertRequest,
  EvacuationRoute,
  ForecastPoint,
  Hotspot,
  InternalRiskCycle,
  LiveWeather,
  MediaReport,
  PredictionCore,
  RoadCondition,
  RoadConditionSyncItem,
  RoadConditionSegment,
  RoadSegment,
  SafeShelter,
  Subscription,
  ZoneRoadConditions,
  ZoneStatic
} from "@bhurakshan/contracts";
import {
  seedDangerZones,
  seedDistricts,
  seedElevationProfiles,
  seedForecasts,
  seedHotspots,
  seedMediaReports,
  seedPredictions,
  seedRoadConditions,
  seedRoadSegments,
  seedRoutes,
  seedShelters,
  seedSubscriptions,
  seedWeather,
  seedZones
} from "../data/seed";
import { chooseNearestZone, computeBearing, rankSheltersByDistance } from "./geo";
import { getDefaultLanguageForDistrict } from "./localization";

type PersistedState = {
  districts: District[];
  zones: ZoneStatic[];
  dangerZones: DangerZone[];
  shelters: SafeShelter[];
  routes: EvacuationRoute[];
  roadSegments: RoadSegment[];
  roadConditions: RoadCondition[];
  elevationProfilesByZone: Record<string, ElevationProfile>;
  weatherByZone: Record<string, LiveWeather>;
  predictionsByZone: Record<string, PredictionCore>;
  forecastsByZone: Record<string, ForecastPoint[]>;
  hotspotsByZone: Record<string, Hotspot>;
  overrideCyclesByZone: Record<string, InternalRiskCycle>;
  subscribers: Subscription[];
  alerts: AlertLog[];
  mediaReports: MediaReport[];
};

const runtimeDir = path.resolve(__dirname, "../../../../.runtime");
const statePath = path.join(runtimeDir, "state.json");

const buildSeedState = (): PersistedState => ({
  districts: [...seedDistricts],
  zones: [...seedZones],
  dangerZones: [...seedDangerZones],
  shelters: [...seedShelters],
  routes: [...seedRoutes],
  roadSegments: [...seedRoadSegments],
  roadConditions: [...seedRoadConditions],
  elevationProfilesByZone: { ...seedElevationProfiles },
  weatherByZone: { ...seedWeather },
  predictionsByZone: { ...seedPredictions },
  forecastsByZone: { ...seedForecasts },
  hotspotsByZone: Object.fromEntries(seedHotspots.map((item) => [item.zoneId, item])),
  overrideCyclesByZone: {},
  subscribers: [...seedSubscriptions],
  alerts: [],
  mediaReports: [...seedMediaReports]
});

export class StateStore {
  private readonly state: PersistedState;

  constructor() {
    this.state = this.loadState();
  }

  public getDistricts() {
    return this.state.districts;
  }

  public getActiveZones(): ZoneStatic[] {
    return this.state.zones.filter((zone) => zone.isActive);
  }

  public getZone(zoneId: string) {
    return this.state.zones.find((zone) => zone.id === zoneId);
  }

  public getDangerZones(zoneId?: string) {
    return this.state.dangerZones.filter((dangerZone) =>
      dangerZone.active && (zoneId ? dangerZone.zoneId === zoneId : true)
    );
  }

  public getNearestDangerZone(zoneId: string, lat: number, lon: number) {
    return this.getDangerZones(zoneId)
      .map((dangerZone) => {
        const centroid = getPolygonCentroid(dangerZone.polygon);
        return {
          dangerZone,
          distanceKm: getNearestPolygonDistanceKm(lat, lon, dangerZone.polygon),
          bearingDegrees: computeBearing(lat, lon, centroid.lat, centroid.lon)
        };
      })
      .sort((left, right) => left.distanceKm - right.distanceKm)[0];
  }

  public getZoneRiskView() {
    return this.getActiveZones().map((zone) => {
      const override = this.state.overrideCyclesByZone[zone.id];
      const current = this.getAdjustedPrediction(zone.id);
      const weather = override?.weather ?? this.state.weatherByZone[zone.id];
      const mediaBoost = this.getZoneMediaBoostSummary(zone.id);

        return {
          zoneId: zone.id,
          zoneName: zone.name,
          districtId: zone.districtId,
          districtName: zone.districtName,
          centroidLat: zone.centroidLat,
          centroidLon: zone.centroidLon,
          riskScore: current?.riskScore ?? 0,
          riskLevel: current?.riskLevel ?? "SAFE",
          rainfallMmHr: weather?.rainfallMmHr ?? 0,
        soilMoistureProxyPct: current?.soilMoistureProxyPct ?? 0,
        groundMovementProxyPct: current?.groundMovementProxyPct ?? 0,
        predictedAt: current?.predictedAt,
        isStale: weather?.isStale ?? true,
        activeMediaBoost: mediaBoost.totalBoost,
        activeVerifiedReports: mediaBoost.activeVerifiedReports,
        latestMediaReportAt: mediaBoost.latestReportAt
      };
    });
  }

  public getForecast(zoneId: string) {
    const override = this.state.overrideCyclesByZone[zoneId];

    return {
      zoneId,
      current: this.getAdjustedPrediction(zoneId),
      forecast: (override?.forecast ?? this.state.forecastsByZone[zoneId] ?? []).map((point) =>
        this.applyMediaBoostToForecastPoint(zoneId, point, point.horizonHours)
      )
    };
  }

  public getHotspots(limit?: number, districtId?: string) {
    let items = this.getActiveZones().map((zone) => {
      const hotspot = this.state.overrideCyclesByZone[zone.id]?.hotspot ?? this.state.hotspotsByZone[zone.id];
      const adjustedCurrent = this.getAdjustedPrediction(zone.id);
      const nextForecast = this.getForecast(zone.id).forecast[0];

      return {
        zoneId: zone.id,
        zoneName: hotspot?.zoneName ?? zone.name,
        districtName: hotspot?.districtName ?? zone.districtName,
        riskScore: adjustedCurrent?.riskScore ?? hotspot?.riskScore ?? 0,
        riskLevel: adjustedCurrent?.riskLevel ?? hotspot?.riskLevel ?? "SAFE",
        trend: hotspot?.trend ?? "steady",
        nextHorizonLevel: nextForecast?.riskLevel ?? hotspot?.nextHorizonLevel
      };
    });

    if (districtId) {
      items = items.filter((item) => {
        const zone = this.getZone(item.zoneId);
        return zone?.districtId === districtId;
      });
    }

    items = items.sort((left, right) => right.riskScore - left.riskScore);
    return typeof limit === "number" ? items.slice(0, limit) : items;
  }

  public getShelters(zoneId?: string, districtId?: string): SafeShelter[] {
    return this.state.shelters.filter((shelter) => {
      if (zoneId) {
        return shelter.zoneId === zoneId;
      }

      if (districtId) {
        return shelter.districtId === districtId;
      }

      return true;
    });
  }

  public getRoute(zoneId: string): EvacuationRoute | undefined {
    return this.state.routes.find((route) => route.zoneId === zoneId);
  }

  public upsertEvacuationPath(
    payload: EvacuationPathUpsertRequest,
    actorName: string
  ): EvacuationRoute {
    const zone = this.getZone(payload.zoneId);
    const shelter = this.state.shelters.find((item) => item.id === payload.safeShelterId);

    if (!zone || !shelter) {
      throw new Error("Zone or shelter not found for evacuation path.");
    }

    const selectedSegments = payload.segmentIds
      .map((segmentId) => this.state.roadSegments.find((segment) => segment.id === segmentId))
      .filter((segment): segment is RoadSegment => Boolean(segment));
    const selectedConditions = selectedSegments
      .map((segment) => this.state.roadConditions.find((condition) => condition.segmentId === segment.id))
      .filter((condition): condition is RoadCondition => Boolean(condition));

    const distanceKm =
      selectedSegments.reduce((sum, segment) => sum + segment.lengthKm, 0) ||
      this.getRoute(payload.zoneId)?.distanceKm ||
      shelter.distanceKm;
    const cautionSegmentCount = selectedConditions.filter((item) => item.status === "caution").length;
    const blockedSegmentCount = selectedConditions.filter((item) => item.status === "blocked").length;
    const routeStatus = selectedConditions.reduce<RoadCondition["status"]>(
      (worst, item) =>
        compareRoadStatus(item.status, worst) > 0 ? item.status : worst,
      "open"
    );
    const profile = this.getElevationProfile(payload.zoneId);
    const existing = this.getRoute(payload.zoneId);

    const nextRoute: EvacuationRoute = {
      id: existing?.id ?? `route-${payload.zoneId}-${Date.now()}`,
      zoneId: payload.zoneId,
      safeShelterId: payload.safeShelterId,
      distanceKm: round(distanceKm),
      estimatedMinutes: payload.estimatedMinutes,
      instructionSummary: payload.instructionSummary,
      steps: payload.steps,
      routeType: payload.pathCategory === "emergency_only" ? "fallback" : "verified_path",
      bearingDegrees: Math.round(
        computeBearing(zone.centroidLat, zone.centroidLon, shelter.lat, shelter.lon)
      ),
      isUphill: payload.isUphill,
      segmentIds: payload.segmentIds,
      roadStatus: routeStatus,
      cautionSegmentCount,
      blockedSegmentCount,
      elevationGainM: profile?.totalAscentM ?? existing?.elevationGainM ?? 0,
      elevationLossM: profile?.totalDescentM ?? existing?.elevationLossM ?? 0,
      valleyExposure: profile?.valleyExposure ?? existing?.valleyExposure ?? "low",
      routeWarnings: payload.routeWarnings,
      pathCategory: payload.pathCategory,
      avoidsStreams: payload.avoidsStreams,
      hazardNotes: payload.hazardNotes,
      verifiedBy: actorName,
      verifiedAt: new Date().toISOString()
    };

    const existingIndex = this.state.routes.findIndex((route) => route.zoneId === payload.zoneId);

    if (existingIndex >= 0) {
      this.state.routes[existingIndex] = nextRoute;
    } else {
      this.state.routes.unshift(nextRoute);
    }

    this.saveState();
    return nextRoute;
  }

  public getRoadConditions(zoneId: string): ZoneRoadConditions {
    const segments = this.state.roadSegments
      .filter((segment) => segment.zoneId === zoneId)
      .map((segment) => ({
        ...segment,
        condition: this.state.roadConditions.find((item) => item.segmentId === segment.id)
      }))
      .filter((segment): segment is RoadConditionSegment => Boolean(segment.condition))
      .sort((left, right) => left.priorityRank - right.priorityRank);

    const fallbackUpdatedAt = new Date().toISOString();
    const summary = segments.reduce<ZoneRoadConditions["summary"]>(
      (accumulator, segment) => {
        accumulator.updatedAt =
          accumulator.updatedAt > segment.condition.updatedAt
            ? accumulator.updatedAt
            : segment.condition.updatedAt;

        if (segment.condition.status === "open") {
          accumulator.openCount += 1;
        } else if (segment.condition.status === "caution") {
          accumulator.cautionCount += 1;
        } else if (segment.condition.status === "blocked") {
          accumulator.blockedCount += 1;
        } else if (segment.condition.status === "flooded") {
          accumulator.floodedCount += 1;
        }

        if (compareRoadStatus(segment.condition.status, accumulator.worstStatus) > 0) {
          accumulator.worstStatus = segment.condition.status;
        }

        return accumulator;
      },
      {
        zoneId,
        openCount: 0,
        cautionCount: 0,
        blockedCount: 0,
        floodedCount: 0,
        worstStatus: "open",
        updatedAt: fallbackUpdatedAt
      }
    );

    return {
      zoneId,
      summary,
      segments
    };
  }

  public getElevationProfile(zoneId: string) {
    return this.state.elevationProfilesByZone[zoneId];
  }

  public getNearestZone(lat: number, lon: number) {
    return chooseNearestZone(this.getActiveZones(), lat, lon);
  }

  public getNearbyShelters(zoneId: string, lat: number, lon: number, radiusKm: number) {
    return rankSheltersByDistance(this.getShelters(zoneId), lat, lon)
      .filter((item) => item.distanceKm <= radiusKm);
  }

  public getWeather(zoneId: string) {
    return this.state.overrideCyclesByZone[zoneId]?.weather ?? this.state.weatherByZone[zoneId];
  }

  public getAlerts() {
    return [...this.state.alerts].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    );
  }

  public upsertSubscription(subscription: Subscription) {
    const existing = this.state.subscribers.find(
      (item) => item.zoneId === subscription.zoneId && item.phoneNumber === subscription.phoneNumber
    );

    if (existing) {
      existing.channels = subscription.channels;
      existing.appLanguage = subscription.appLanguage;
      existing.alertLanguage = subscription.alertLanguage;
      existing.isActive = true;
      this.saveState();
      return existing;
    }

    this.state.subscribers.push(subscription);
    this.saveState();
    return subscription;
  }

  public getSubscribersByZone(zoneId: string) {
    return this.state.subscribers.filter(
      (item) => item.zoneId === zoneId && item.isActive
    );
  }

  public createAlert(alert: AlertLog) {
    this.state.alerts.unshift(alert);
    this.saveState();
    return alert;
  }

  public createMediaReport(report: MediaReport) {
    this.state.mediaReports.unshift(report);
    this.saveState();
    return report;
  }

  public getMediaReport(reportId: string) {
    return this.state.mediaReports.find((report) => report.id === reportId);
  }

  public listMediaReports(filters?: {
    zoneId?: string;
    status?: MediaReport["verificationStatus"];
    hours?: number;
    districtId?: string;
  }) {
    const now = Date.now();

    return this.state.mediaReports.filter((report) => {
      if (filters?.zoneId && report.zoneId !== filters.zoneId) {
        return false;
      }

      if (filters?.districtId && report.districtId !== filters.districtId) {
        return false;
      }

      if (filters?.status && report.verificationStatus !== filters.status) {
        return false;
      }

      if (filters?.hours) {
        const ageMs = now - new Date(report.serverReceivedAt).getTime();
        if (ageMs > filters.hours * 60 * 60 * 1000) {
          return false;
        }
      }

      return true;
    });
  }

  public updateMediaReport(reportId: string, updates: Partial<MediaReport>) {
    const report = this.getMediaReport(reportId);

    if (!report) {
      return undefined;
    }

    Object.assign(report, updates);
    this.saveState();
    return report;
  }

  public deleteMediaReport(reportId: string) {
    const index = this.state.mediaReports.findIndex((report) => report.id === reportId);

    if (index < 0) {
      return undefined;
    }

    const [deleted] = this.state.mediaReports.splice(index, 1);
    this.saveState();
    return deleted;
  }

  public syncRoadConditions(zoneId: string, updates: RoadConditionSyncItem[]) {
    const zoneSegments = this.state.roadSegments
      .filter((segment) => segment.zoneId === zoneId)
      .map((segment) => segment.id);

    updates.forEach((update) => {
      if (!zoneSegments.includes(update.segmentId)) {
        return;
      }

      const existing = this.state.roadConditions.find(
        (condition) => condition.segmentId === update.segmentId
      );

      if (existing) {
        existing.status = update.status;
        existing.averageSpeedKmph = update.averageSpeedKmph;
        existing.delayMinutes = update.delayMinutes;
        existing.severityPct = update.severityPct;
        existing.source = update.source;
        existing.note = update.note;
        existing.updatedAt = update.updatedAt;
        existing.zoneId = zoneId;
        return;
      }

      this.state.roadConditions.push({
        id: `road-condition-${update.segmentId}`,
        segmentId: update.segmentId,
        zoneId,
        status: update.status,
        averageSpeedKmph: update.averageSpeedKmph,
        delayMinutes: update.delayMinutes,
        severityPct: update.severityPct,
        source: update.source,
        note: update.note,
        updatedAt: update.updatedAt
      });
    });

    this.saveState();
    return this.getRoadConditions(zoneId);
  }

  public countRecentMediaReportsByReporter(reporterHash: string, hours: number) {
    const now = Date.now();
    const maxAgeMs = hours * 60 * 60 * 1000;

    return this.state.mediaReports.filter((report) => {
      if (!report.uploadedByPhoneHash || report.uploadedByPhoneHash !== reporterHash) {
        return false;
      }

      return now - new Date(report.serverReceivedAt).getTime() <= maxAgeMs;
    }).length;
  }

  public getZoneMediaBoostSummary(zoneId: string, atMs = Date.now()) {
    const activeReports = this.state.mediaReports
      .filter((report) => report.zoneId === zoneId)
      .map((report) => ({
        report,
        effectiveBoost: getEffectiveRiskBoost(report, atMs)
      }))
      .filter((item) => item.effectiveBoost > 0);
    const latestReportAt = activeReports
      .map((item) => item.report.reviewedAt ?? item.report.serverReceivedAt)
      .sort((left, right) => right.localeCompare(left))[0] ?? null;

    return {
      totalBoost: round(activeReports.reduce((sum, item) => sum + item.effectiveBoost, 0)),
      activeVerifiedReports: activeReports.length,
      latestReportAt
    };
  }

  public applyRiskCycle(cycle: InternalRiskCycle) {
    if (cycle.weather.source === "manual-test") {
      this.state.overrideCyclesByZone[cycle.zone.id] = cycle;
    } else {
      this.state.weatherByZone[cycle.zone.id] = cycle.weather;
      this.state.predictionsByZone[cycle.zone.id] = cycle.current;
      this.state.forecastsByZone[cycle.zone.id] = cycle.forecast;
      this.state.hotspotsByZone[cycle.zone.id] = cycle.hotspot;
    }
    this.saveState();
  }

  public reset() {
    const nextState = buildSeedState();
    Object.assign(this.state, nextState);
    this.saveState();
  }

  public getHealthSnapshot() {
    return {
      stateStore: "ok",
      activeZoneCount: this.getActiveZones().length,
      alertCount: this.state.alerts.length,
      storagePath: statePath
    };
  }

  private loadState(): PersistedState {
    try {
      if (!fs.existsSync(runtimeDir)) {
        fs.mkdirSync(runtimeDir, { recursive: true });
      }

      if (!fs.existsSync(statePath)) {
        const seedState = buildSeedState();
        fs.writeFileSync(statePath, JSON.stringify(seedState, null, 2), "utf-8");
        return seedState;
      }

      const raw = fs.readFileSync(statePath, "utf-8");
      const parsed = JSON.parse(raw) as PersistedState;
      const persistedDistricts = parsed.districts ?? [];
      const districts = seedDistricts.map((district) => {
        const persisted = persistedDistricts.find((item) => item.id === district.id);

        return {
          ...district,
          ...persisted,
          defaultLanguage:
            persisted?.defaultLanguage ??
            district.defaultLanguage ??
            getDefaultLanguageForDistrict(district.id)
        };
      });
      const zones = parsed.zones ?? seedZones;
      const subscribers = (parsed.subscribers ?? []).map((subscription) => {
        const zone = zones.find((item) => item.id === subscription.zoneId);
        const fallbackLanguage = getDefaultLanguageForDistrict(zone?.districtId ?? "");

        return {
          ...subscription,
          appLanguage: subscription.appLanguage ?? fallbackLanguage,
          alertLanguage: subscription.alertLanguage ?? subscription.appLanguage ?? fallbackLanguage
        };
      });
      const routes = (parsed.routes ?? seedRoutes).map((route) => ({
        ...route,
        segmentIds: route.segmentIds ?? [],
        roadStatus: route.roadStatus ?? "open",
        cautionSegmentCount: route.cautionSegmentCount ?? 0,
        blockedSegmentCount: route.blockedSegmentCount ?? 0,
        elevationGainM: route.elevationGainM ?? 0,
        elevationLossM: route.elevationLossM ?? 0,
        valleyExposure: route.valleyExposure ?? "low",
        routeWarnings: route.routeWarnings ?? [],
        pathCategory: route.pathCategory ?? "primary",
        avoidsStreams: route.avoidsStreams ?? false,
        hazardNotes: route.hazardNotes ?? "",
        verifiedBy: route.verifiedBy,
        verifiedAt: route.verifiedAt
      }));
      const dangerZones = (parsed.dangerZones ?? seedDangerZones).map((dangerZone) => ({
        ...dangerZone,
        active: dangerZone.active ?? true,
        note: dangerZone.note ?? "",
        source: dangerZone.source ?? "operator"
      }));
      const alerts = (parsed.alerts ?? []).map((alert) => ({
        ...alert,
        localizedMessages: alert.localizedMessages ?? []
      }));
      const mediaReports = (parsed.mediaReports ?? seedMediaReports).map((report) => ({
        ...report,
        aiLabels: report.aiLabels ?? [],
        aiFlags: report.aiFlags ?? [],
        privacyStatus: report.privacyStatus ?? (report.aiFlags?.includes("face_blur_recommended") ? "blur_recommended" : "clear"),
        faceBlurApplied: report.faceBlurApplied ?? false,
        storageProvider: report.storageProvider ?? null,
        storageBucket: report.storageBucket ?? null,
        storageObjectPath: report.storageObjectPath ?? null,
        thumbnailBucket: report.thumbnailBucket ?? null,
        thumbnailObjectPath: report.thumbnailObjectPath ?? null,
        riskBoostApplied: report.riskBoostApplied ?? false,
        riskBoostAmount: report.riskBoostAmount ?? 0,
        riskBoostExpiresAt: report.riskBoostExpiresAt ?? null,
        verificationBreakdown: report.verificationBreakdown ?? null
      }));
      const roadSegments = parsed.roadSegments ?? seedRoadSegments;
      const roadConditions = parsed.roadConditions ?? seedRoadConditions;
      const elevationProfilesByZone =
        parsed.elevationProfilesByZone ?? seedElevationProfiles;

      return {
        ...buildSeedState(),
        ...parsed,
        districts,
        dangerZones,
        routes,
        subscribers,
        alerts,
        mediaReports,
        roadSegments,
        roadConditions,
        elevationProfilesByZone
      };
    } catch (error) {
      console.warn("Failed to load persisted state, falling back to seed data.", error);
      return buildSeedState();
    }
  }

  private saveState() {
    if (!fs.existsSync(runtimeDir)) {
      fs.mkdirSync(runtimeDir, { recursive: true });
    }

    fs.writeFileSync(statePath, JSON.stringify(this.state, null, 2), "utf-8");
  }

  private getAdjustedPrediction(zoneId: string): PredictionCore | undefined {
    const override = this.state.overrideCyclesByZone[zoneId];
    const basePrediction = override?.current ?? this.state.predictionsByZone[zoneId];

    if (!basePrediction) {
      return undefined;
    }

    return this.applyMediaBoostToCurrentPrediction(zoneId, basePrediction, 0);
  }

  private applyMediaBoostToCurrentPrediction(
    zoneId: string,
    prediction: PredictionCore,
    horizonHours: number
  ): PredictionCore {
    const atMs = Date.now() + horizonHours * 60 * 60 * 1000;
    const mediaBoost = this.getZoneMediaBoostSummary(zoneId, atMs);
    const boostedRiskScore = Math.min(100, prediction.riskScore + mediaBoost.totalBoost * 100);
    const featureSet = new Set(prediction.topFeatures ?? []);

    if (mediaBoost.totalBoost > 0) {
      featureSet.add("verified_ground_report_boost");
      featureSet.add("media_reports_last_2h");
    }

    return {
      ...prediction,
      riskScore: round(boostedRiskScore),
      riskLevel: scoreToLevel(boostedRiskScore),
      topFeatures: Array.from(featureSet)
    };
  }

  private applyMediaBoostToForecastPoint(
    zoneId: string,
    point: ForecastPoint,
    horizonHours: number
  ): ForecastPoint {
    const atMs = Date.now() + horizonHours * 60 * 60 * 1000;
    const mediaBoost = this.getZoneMediaBoostSummary(zoneId, atMs);
    const boostedRiskScore = Math.min(100, point.riskScore + mediaBoost.totalBoost * 100);

    return {
      ...point,
      riskScore: round(boostedRiskScore),
      riskLevel: scoreToLevel(boostedRiskScore)
    };
  }
}

function compareRoadStatus(left: RoadCondition["status"], right: RoadCondition["status"]) {
  const severityOrder: Record<RoadCondition["status"], number> = {
    open: 0,
    caution: 1,
    flooded: 2,
    blocked: 3
  };

  return severityOrder[left] - severityOrder[right];
}

function round(value: number) {
  return Number(value.toFixed(2));
}

function scoreToLevel(score: number): "SAFE" | "WATCH" | "DANGER" {
  if (score >= 70) {
    return "DANGER";
  }

  if (score >= 30) {
    return "WATCH";
  }

  return "SAFE";
}

function getEffectiveRiskBoost(report: MediaReport, atMs: number) {
  if (
    report.verificationStatus !== "verified" ||
    !report.riskBoostApplied ||
    !report.riskBoostAmount ||
    !report.riskBoostExpiresAt
  ) {
    return 0;
  }

  const startAtMs = new Date(report.reviewedAt ?? report.serverReceivedAt).getTime();
  const expiresAtMs = new Date(report.riskBoostExpiresAt).getTime();

  if (!Number.isFinite(startAtMs) || !Number.isFinite(expiresAtMs) || atMs >= expiresAtMs) {
    return 0;
  }

  if (atMs <= startAtMs) {
    return report.riskBoostAmount;
  }

  const ttlMs = expiresAtMs - startAtMs;

  if (ttlMs <= 0) {
    return 0;
  }

  const remainingRatio = (expiresAtMs - atMs) / ttlMs;
  return round(report.riskBoostAmount * Math.max(0, Math.min(1, remainingRatio)));
}

function getPolygonCentroid(polygon: Array<{ lat: number; lon: number }>) {
  if (!polygon.length) {
    return { lat: 0, lon: 0 };
  }

  const totals = polygon.reduce(
    (sum, point) => ({
      lat: sum.lat + point.lat,
      lon: sum.lon + point.lon
    }),
    { lat: 0, lon: 0 }
  );

  return {
    lat: totals.lat / polygon.length,
    lon: totals.lon / polygon.length
  };
}

function getNearestPolygonDistanceKm(
  lat: number,
  lon: number,
  polygon: Array<{ lat: number; lon: number }>
) {
  if (!polygon.length) {
    return 0;
  }

  return Math.min(
    ...polygon.map((point) => chooseNearestPointDistanceKm(lat, lon, point.lat, point.lon))
  );
}

function chooseNearestPointDistanceKm(fromLat: number, fromLon: number, toLat: number, toLon: number) {
  const earthRadiusKm = 6371;
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLon = ((toLon - fromLon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((fromLat * Math.PI) / 180) *
      Math.cos((toLat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}
