import crypto from "crypto";
import { Request, Router } from "express";
import multer from "multer";
import { v4 as uuid } from "uuid";
import {
  MediaReportSchema,
  MediaReportDeleteRequestSchema,
  MediaUploadFieldsSchema,
  SubscribeRequestSchema,
  SubscriptionSchema
} from "@bhurakshan/contracts";
import { env } from "../config/env";
import { StateStore } from "../lib/state-store";
import { buildComputedSafeZoneRoute } from "../lib/computed-route";
import { getDistrictBoundaries } from "../lib/district-boundaries";
import { HttpError } from "../lib/http-error";
import { getRouteTo } from "../lib/routing-service";
import { SubscriptionRepository } from "../lib/subscription-repository";
import {
  angularDifferenceDegrees,
  bearingToLabel,
  computeBearing,
  estimateWalkMinutes,
  haversineKm,
  isMovingTowardDanger
} from "../lib/geo";
import { normalizeLanguage } from "../lib/localization";
import { verifyMediaAssetAccessToken } from "../lib/media-asset-access";
import { buildMediaStatusMessage, inferMediaVerification } from "../lib/media-reports";
import { MediaStorageService } from "../lib/media-storage-service";
import { RealtimeServer } from "../lib/realtime-server";

const MAX_REPORTS_PER_HOUR = 3;
const ALLOWED_MEDIA_TYPES = new Map<string, "photo" | "video">([
  ["image/jpeg", "photo"],
  ["image/jpg", "photo"],
  ["image/png", "photo"],
  ["image/webp", "photo"],
  ["video/mp4", "video"],
  ["video/webm", "video"],
  ["video/quicktime", "video"]
]);

export const createPublicRouter = (
  stateStore: StateStore,
  subscriptionRepository: SubscriptionRepository,
  mediaStorageService: MediaStorageService,
  realtimeServer?: RealtimeServer
) => {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: env.maxVideoSizeMb * 1024 * 1024
    }
  });

  router.get("/health", (_req, res) => {
    const snapshot = stateStore.getHealthSnapshot();
    res.json({
      status: "ok",
      services: {
        api: "ok",
        state_store: snapshot.stateStore,
        ml: "worker-managed"
      },
      active_zone_count: snapshot.activeZoneCount,
      alert_count: snapshot.alertCount,
      timestamp: new Date().toISOString()
    });
  });

  router.get("/districts", (_req, res) => {
    res.json(stateStore.getDistricts());
  });

  router.get("/district-boundaries", (_req, res) => {
    res.json(getDistrictBoundaries(stateStore.getDistricts()));
  });

  router.get("/zones/risk", (_req, res) => {
    res.json(stateStore.getZoneRiskView());
  });

  router.get("/zones/:zoneId/forecast", (req, res, next) => {
    const zone = stateStore.getZone(req.params.zoneId);

    if (!zone) {
      return next(new HttpError(404, "Zone not found."));
    }

    const forecast = stateStore.getForecast(zone.id);

    res.json({
      zone_id: zone.id,
      current: forecast.current,
      forecast: forecast.forecast,
      top_features: forecast.current?.topFeatures ?? []
    });
  });

  router.get("/zones/:zoneId/road-conditions", (req, res, next) => {
    const zone = stateStore.getZone(req.params.zoneId);

    if (!zone) {
      return next(new HttpError(404, "Zone not found."));
    }

    res.json(stateStore.getRoadConditions(zone.id));
  });

  router.get("/zones/:zoneId/elevation-profile", (req, res, next) => {
    const zone = stateStore.getZone(req.params.zoneId);

    if (!zone) {
      return next(new HttpError(404, "Zone not found."));
    }

    const profile = stateStore.getElevationProfile(zone.id);

    if (!profile) {
      return next(new HttpError(404, "Elevation profile not found."));
    }

    res.json(profile);
  });

  router.get("/zones/:zoneId/danger-zones", (req, res, next) => {
    const zone = stateStore.getZone(req.params.zoneId);

    if (!zone) {
      return next(new HttpError(404, "Zone not found."));
    }

    res.json({
      zoneId: zone.id,
      dangerZones: stateStore.getDangerZones(zone.id)
    });
  });

  router.get("/hotspots", (req, res) => {
    const district = typeof req.query.district === "string" ? req.query.district : undefined;
    const limit =
      typeof req.query.limit === "string" ? Number.parseInt(req.query.limit, 10) : undefined;

    res.json(stateStore.getHotspots(limit, district));
  });

  router.get("/safe-shelters", (req, res) => {
    const zoneId = typeof req.query.zone_id === "string" ? req.query.zone_id : undefined;
    const districtId =
      typeof req.query.district === "string" ? req.query.district : undefined;

    res.json(stateStore.getShelters(zoneId, districtId));
  });

  router.get("/safe-zones/:zoneId/route", async (req, res, next) => {
    try {
      const zone = stateStore.getZone(req.params.zoneId);

      if (!zone) {
        throw new HttpError(404, "Zone not found.");
      }

      const fromLat = parseCoordinate(req.query.from_lat, "from_lat");
      const fromLon = parseCoordinate(
        pickFirstQueryValue(req.query.from_lon) ?? pickFirstQueryValue(req.query.from_lng),
        "from_lon"
      );
      const shelter =
        stateStore.getNearbyShelters(zone.id, fromLat, fromLon, 50)[0]?.shelter ??
        stateStore.getShelters(zone.id)[0];

      if (!shelter) {
        throw new HttpError(404, "No safe shelter is configured for this zone.");
      }

      let liveRoute:
        | Awaited<ReturnType<typeof getRouteTo>>
        | undefined;

      try {
        liveRoute = await getRouteTo(fromLat, fromLon, shelter.lat, shelter.lon);
      } catch (error) {
        console.warn("Falling back to published evacuation path.", error);
      }

      const computedRoute = buildComputedSafeZoneRoute({
        zone,
        shelter,
        route: stateStore.getRoute(zone.id),
        roadConditions: stateStore.getRoadConditions(zone.id),
        origin: {
          lat: fromLat,
          lon: fromLon
        },
        liveRoute
      });

      res.json(computedRoute);
    } catch (error) {
      next(error);
    }
  });

  router.get("/evacuation-routes", (req, res, next) => {
    if (typeof req.query.zone_id !== "string") {
      return next(new HttpError(400, "zone_id query parameter is required."));
    }

    const route = stateStore.getRoute(req.query.zone_id);

    if (!route) {
      return next(new HttpError(404, "Evacuation route not found."));
    }

    res.json(route);
  });

  router.get("/weather/live", (req, res, next) => {
    if (typeof req.query.zone_id !== "string") {
      return next(new HttpError(400, "zone_id query parameter is required."));
    }

    const weather = stateStore.getWeather(req.query.zone_id);

    if (!weather) {
      return next(new HttpError(404, "Weather not found for zone."));
    }

    res.json(weather);
  });

  router.get("/location/status", (req, res, next) => {
    try {
      const lat = parseCoordinate(req.query.lat, "lat");
      const lon = parseCoordinate(req.query.lon, "lon");
      const zoneMatch = stateStore.getNearestZone(lat, lon);

      if (!zoneMatch) {
        throw new HttpError(404, "No active zone available for this location.");
      }

      const zone = zoneMatch.zone;
      const current = stateStore.getForecast(zone.id).current;
      const route = stateStore.getRoute(zone.id);
      const rankedShelters = stateStore.getNearbyShelters(zone.id, lat, lon, 50);
      const bestShelter = rankedShelters[0]?.shelter ?? stateStore.getShelters(zone.id)[0];
      const nearestDanger = stateStore.getNearestDangerZone(zone.id, lat, lon);

      if (!current || !bestShelter) {
        throw new HttpError(404, "Location guidance is not available for this zone.");
      }

      const language = normalizeLanguage(
        typeof req.query.lang === "string" ? req.query.lang : undefined,
        zone.districtId
      );
      const shelterDistanceKm = rankedShelters[0]?.distanceKm ?? haversineKm(lat, lon, bestShelter.lat, bestShelter.lon);
      const shelterBearing = rankedShelters[0]?.bearingDegrees ?? computeBearing(lat, lon, bestShelter.lat, bestShelter.lon);
      const dangerBearing = nearestDanger?.bearingDegrees ?? computeBearing(lat, lon, zone.centroidLat, zone.centroidLon);
      const dangerDistanceKm = nearestDanger?.distanceKm ?? haversineKm(lat, lon, zone.centroidLat, zone.centroidLon);
      const headingDegrees = parseOptionalBearing(req.query.heading_degrees);
      const safeBearing = Math.round(route?.bearingDegrees ?? shelterBearing);
      const movingTowardDanger =
        typeof headingDegrees === "number"
          ? isMovingTowardDanger(headingDegrees, dangerBearing)
          : false;
      const routeSteps =
        route?.steps.length
          ? route.steps
          : [
              route?.instructionSummary ?? `Move toward ${bestShelter.name}.`,
              "Stay away from steep slope edges and unstable roadside cuts.",
              `Continue until you reach ${bestShelter.name}.`
            ];

      const warnings =
        current.riskLevel === "DANGER"
          ? [
              {
                type: "evacuate_now",
                message:
                  language === "en"
                    ? `Move now toward ${bestShelter.name}.`
                    : `अभी ${bestShelter.name} की ओर जाएँ।`
              }
            ]
          : current.riskLevel === "WATCH"
            ? [
                {
                  type: "prepare_to_move",
                  message:
                    language === "en"
                      ? `Stay ready to move toward ${bestShelter.name} if conditions worsen.`
                      : `स्थिति बिगड़ने पर ${bestShelter.name} की ओर निकलने के लिए तैयार रहें।`
                }
              ]
            : [];

      if (movingTowardDanger) {
        warnings.push({
          type: "moving_toward_danger",
          message:
            language === "en"
              ? `You are moving toward danger. Turn ${bearingToLabel(safeBearing, language)} now.`
              : `${bearingToLabel(safeBearing, language)} की ओर मुड़ें। आप खतरे की दिशा में बढ़ रहे हैं।`
        });
      }

      if (nearestDanger?.dangerZone) {
        warnings.push({
          type: "active_danger_zone",
          message:
            language === "en"
              ? `Avoid ${nearestDanger.dangerZone.name}. ${nearestDanger.dangerZone.note}`
              : `${nearestDanger.dangerZone.name} से दूर रहें। ${nearestDanger.dangerZone.note}`
        });
      }

      res.json({
        userLocation: {
          lat,
          lon,
          zoneId: zone.id,
          zoneName: zone.name,
          district: zone.districtName
        },
        risk: {
          level: current.riskLevel,
          score: current.riskScore,
          nearestDangerM: Math.round(dangerDistanceKm * 1000),
          nearestDangerBearing: Math.round(dangerBearing),
          dangerDirectionLabel: bearingToLabel(dangerBearing, language),
          nearestDangerZoneId: nearestDanger?.dangerZone.id,
          nearestDangerZoneName: nearestDanger?.dangerZone.name ?? zone.name,
          nearestDangerType: nearestDanger?.dangerZone.type,
          nearestDangerNote: nearestDanger?.dangerZone.note ?? ""
        },
        evacuation: {
          recommendedSafeZone: {
            id: bestShelter.id,
            name: bestShelter.name,
            lat: bestShelter.lat,
            lon: bestShelter.lon,
            elevationM: bestShelter.elevationM,
            capacity: bestShelter.capacity,
            distanceKm: round(shelterDistanceKm),
            bearing: Math.round(shelterBearing)
          },
          routeAvailable: Boolean(route),
          route: {
            type: route?.routeType ?? "fallback",
            distanceKm: round(route?.distanceKm ?? shelterDistanceKm),
            walkTimeMin: route?.estimatedMinutes ?? estimateWalkMinutes(shelterDistanceKm),
            isUphill: route?.isUphill ?? false,
            steps: routeSteps,
            bearingDegrees: Math.round(route?.bearingDegrees ?? shelterBearing),
            bearingLabel: bearingToLabel(route?.bearingDegrees ?? shelterBearing, language)
          },
          offlineFallback: {
            bearingDegrees: Math.round(shelterBearing),
            bearingLabel: bearingToLabel(shelterBearing, language),
            distanceKm: round(shelterDistanceKm),
            landmark: bestShelter.instructionSummary
          }
        },
        movement: {
          userHeadingDegrees: typeof headingDegrees === "number" ? Math.round(headingDegrees) : null,
          headingLabel:
            typeof headingDegrees === "number" ? bearingToLabel(headingDegrees, language) : "",
          movingTowardDanger,
          safeBearingDegrees: safeBearing,
          safeBearingLabel: bearingToLabel(safeBearing, language),
          dangerBearingDeltaDegrees:
            typeof headingDegrees === "number"
              ? Math.round(angularDifferenceDegrees(headingDegrees, dangerBearing))
              : null
        },
        warnings
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/location/nearby-safe-zones", (req, res, next) => {
    try {
      const lat = parseCoordinate(req.query.lat, "lat");
      const lon = parseCoordinate(req.query.lon, "lon");
      const radiusKm =
        typeof req.query.radius_km === "string"
          ? Number.parseFloat(req.query.radius_km)
          : 5;
      const zoneMatch = stateStore.getNearestZone(lat, lon);

      if (!zoneMatch) {
        throw new HttpError(404, "No active zone available for this location.");
      }

      const nearby = stateStore
        .getNearbyShelters(zoneMatch.zone.id, lat, lon, Number.isFinite(radiusKm) ? radiusKm : 5)
        .map((item) => ({
          id: item.shelter.id,
          zoneId: item.shelter.zoneId,
          name: item.shelter.name,
          distanceKm: round(item.distanceKm),
          walkTimeMin: item.walkTimeMin,
          elevationM: item.shelter.elevationM,
          isUphillFromUser: item.isUphillFromUser,
          capacity: item.shelter.capacity,
          roadStatus: "open" as const,
          routeSummary: item.shelter.instructionSummary,
          bearingDegrees: Math.round(item.bearingDegrees)
        }));

      res.json({ safeZones: nearby });
    } catch (error) {
      next(error);
    }
  });

  router.get("/alerts/logs", (_req, res) => {
    res.json(stateStore.getAlerts());
  });

  router.post("/reports/upload", upload.single("file"), async (req, res, next) => {
    try {
      if (!req.file) {
        throw new HttpError(400, "A media file is required.");
      }

      const fields = MediaUploadFieldsSchema.parse({
        lat: req.body.lat,
        lon: req.body.lon,
        accuracyM: req.body.accuracy_m,
        description: req.body.description,
        language: req.body.language,
        phoneHash: req.body.phone_hash,
        deviceTimestamp: req.body.device_timestamp
      });

      const mediaType = ALLOWED_MEDIA_TYPES.get(req.file.mimetype.toLowerCase()) ?? null;

      if (!mediaType) {
        throw new HttpError(400, "Unsupported file type. Please upload JPEG, PNG, WebP, MP4, WebM, or MOV.");
      }

      if (mediaType === "photo" && req.file.size > env.maxPhotoSizeMb * 1024 * 1024) {
        throw new HttpError(413, `Photo exceeds the ${env.maxPhotoSizeMb}MB limit.`);
      }

      if (mediaType === "video" && req.file.size > env.maxVideoSizeMb * 1024 * 1024) {
        throw new HttpError(413, `Video exceeds the ${env.maxVideoSizeMb}MB limit.`);
      }

      const reporterHash = buildReporterHash(req, fields.phoneHash);
      const recentUploads = stateStore.countRecentMediaReportsByReporter(reporterHash, 1);

      if (recentUploads >= MAX_REPORTS_PER_HOUR) {
        throw new HttpError(
          429,
          "Upload limit reached. You can send up to 3 reports per hour from this device."
        );
      }

      const zoneMatch = stateStore.getNearestZone(fields.lat, fields.lon);

      if (!zoneMatch) {
        throw new HttpError(404, "No active zone found near this location.");
      }

      const zone = zoneMatch.zone;
      const duplicateHashes = stateStore.listMediaReports({ zoneId: zone.id }).map((report) => report.duplicateHash);
      const verification = inferMediaVerification({
        fileName: req.file.originalname,
        mediaType,
        fileSizeBytes: req.file.size,
        description: fields.description ?? "",
        deviceTimestamp: fields.deviceTimestamp,
        lat: fields.lat,
        lon: fields.lon,
        zone,
        duplicateHashes
      });
      const reportId = uuid();
      const storage = await mediaStorageService.storeUpload({
        reportId,
        zoneId: zone.id,
        mediaType,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        buffer: req.file.buffer
      });

      const report = MediaReportSchema.parse({
        id: reportId,
        zoneId: zone.id,
        zoneName: zone.name,
        districtId: zone.districtId,
        mediaType,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSizeBytes: req.file.size,
        lat: fields.lat,
        lon: fields.lon,
        accuracyMeters: fields.accuracyM ?? null,
        deviceTimestamp: fields.deviceTimestamp ?? new Date().toISOString(),
        serverReceivedAt: new Date().toISOString(),
        description: fields.description ?? "",
        language: normalizeLanguage(fields.language, zone.districtId),
        verificationStatus: verification.verificationStatus,
        verificationScore: verification.verificationScore,
        aiLabels: verification.aiLabels,
        aiFlags: verification.aiFlags,
        privacyStatus: verification.aiFlags.includes("face_blur_recommended") ? "blur_recommended" : "clear",
        faceBlurApplied: false,
        storageProvider: storage.storageProvider,
        storageBucket: storage.storageBucket,
        storageObjectPath: storage.storageObjectPath,
        thumbnailBucket: storage.thumbnailBucket,
        thumbnailObjectPath: storage.thumbnailObjectPath,
        duplicateHash: verification.duplicateHash,
        reviewNotes: "",
        reviewedAt: null,
        riskBoostApplied: verification.riskBoostApplied,
        riskBoostAmount: verification.riskBoostAmount,
        riskBoostExpiresAt: verification.riskBoostExpiresAt,
        verificationBreakdown: verification.verificationBreakdown,
        uploadedByPhoneHash: reporterHash
      });

      stateStore.createMediaReport(report);
      realtimeServer?.emitMediaReportUpdated(report);

      res.status(202).json({
        report_id: report.id,
        status: report.verificationStatus,
        zone_id: report.zoneId,
        zone_name: report.zoneName,
        message: buildMediaStatusMessage(report),
        estimated_review_minutes: 5
      });
    } catch (error) {
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return next(new HttpError(413, "Uploaded media exceeds the maximum allowed size."));
      }

      next(error);
    }
  });

  router.get("/reports/:reportId/media", async (req, res, next) => {
    try {
      if (typeof req.query.access_token !== "string") {
        throw new HttpError(401, "Media access token is required.");
      }

      if (!verifyMediaAssetAccessToken(req.query.access_token, req.params.reportId)) {
        throw new HttpError(401, "Media access token is invalid or expired.");
      }

      const report = stateStore.getMediaReport(req.params.reportId);

      if (!report) {
        throw new HttpError(404, "Report not found.");
      }

      const streamed = await mediaStorageService.streamRuntimeMedia(report, res);

      if (!streamed) {
        throw new HttpError(404, "Stored media is not available.");
      }
    } catch (error) {
      next(error);
    }
  });

  router.get("/reports/:reportId/status", (req, res, next) => {
    const report = stateStore.getMediaReport(req.params.reportId);

    if (!report) {
      return next(new HttpError(404, "Report not found."));
    }

    res.json({
      report_id: report.id,
      status: report.verificationStatus,
      verification_score: report.verificationScore,
      zone_name: report.zoneName,
      risk_boost_applied: report.riskBoostApplied,
      risk_boost_expires_at: report.riskBoostExpiresAt,
      verification_breakdown: report.verificationBreakdown,
      message: buildMediaStatusMessage(report)
    });
  });

  router.delete("/reports/:reportId", async (req, res, next) => {
    try {
      const report = stateStore.getMediaReport(req.params.reportId);

      if (!report) {
        throw new HttpError(404, "Report not found.");
      }

      const payload = MediaReportDeleteRequestSchema.parse({
        phoneHash: req.body?.phone_hash ?? req.body?.phoneHash
      });
      const reporterHash = buildReporterHash(req, payload.phoneHash);

      if (!report.uploadedByPhoneHash || report.uploadedByPhoneHash !== reporterHash) {
        throw new HttpError(403, "You can only delete media reports sent from this device.");
      }

      await mediaStorageService.deleteStoredMedia(report);
      const deleted = stateStore.deleteMediaReport(report.id);

      if (!deleted) {
        throw new HttpError(404, "Report not found.");
      }

      realtimeServer?.emitMediaReportUpdated(deleted);

      res.json({
        ok: true,
        report_id: deleted.id,
        deleted: true,
        message: "Your media report and stored file have been removed."
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/subscribe", async (req, res, next) => {
    try {
      const payload = SubscribeRequestSchema.parse(req.body);
      const zone = stateStore.getZone(payload.zoneId);

      if (!zone) {
        throw new HttpError(404, "Zone not found.");
      }

      const subscription = SubscriptionSchema.parse({
        id: uuid(),
        zoneId: payload.zoneId,
        phoneNumber: payload.phoneNumber,
        channels: payload.channels,
        appLanguage: payload.appLanguage,
        alertLanguage: payload.alertLanguage ?? payload.appLanguage,
        isActive: true,
        createdAt: new Date().toISOString()
      });

      const saved = stateStore.upsertSubscription(subscription);
      await subscriptionRepository.upsert(saved);

      res.status(201).json({
        ok: true,
        subscription_status: saved.isActive ? "ACTIVE" : "INACTIVE",
        app_language: saved.appLanguage,
        alert_language: saved.alertLanguage,
        subscription: saved
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};

function parseCoordinate(value: unknown, label: string) {
  if (typeof value !== "string") {
    throw new HttpError(400, `${label} query parameter is required.`);
  }

  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed)) {
    throw new HttpError(400, `${label} query parameter must be a valid number.`);
  }

  return parsed;
}

function pickFirstQueryValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }

  return undefined;
}

function parseOptionalBearing(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return ((parsed % 360) + 360) % 360;
}

function round(value: number) {
  return Number(value.toFixed(2));
}

function buildReporterHash(req: Request, providedIdentifier?: string) {
  const forwardedForHeader = req.headers["x-forwarded-for"];
  const forwardedFor =
    typeof forwardedForHeader === "string"
      ? forwardedForHeader
      : Array.isArray(forwardedForHeader)
        ? forwardedForHeader.join(",")
        : "";
  const remoteAddress = forwardedFor || req.ip || req.socket.remoteAddress || "unknown";
  const userAgent = req.get("user-agent") ?? "unknown-agent";
  const baseIdentity =
    providedIdentifier?.trim() || `network:${remoteAddress}:ua:${userAgent.slice(0, 120)}`;

  return crypto.createHash("sha256").update(baseIdentity).digest("hex").slice(0, 24);
}
