import { Router } from "express";
import { v4 as uuid } from "uuid";
import {
  AlertTriggerRequestSchema,
  EvacuationPathUpsertRequestSchema,
  MediaPrivacyReviewRequestSchema,
  MediaReportReviewRequestSchema,
  Subscription
} from "@bhurakshan/contracts";
import { StateStore } from "../lib/state-store";
import { AlertDispatcher } from "../lib/alert-dispatcher";
import { issueMediaAssetAccessToken } from "../lib/media-asset-access";
import { RealtimeServer } from "../lib/realtime-server";
import { MediaStorageService } from "../lib/media-storage-service";
import { AuthenticatedRequest } from "../middleware/auth";
import { HttpError } from "../lib/http-error";
import { buildLocalizedAlertPreview, normalizeLanguage } from "../lib/localization";
import { buildMediaStatusMessage } from "../lib/media-reports";

export const createProtectedRouter = (
  stateStore: StateStore,
  alertDispatcher: AlertDispatcher,
  mediaStorageService: MediaStorageService,
  realtimeServer: RealtimeServer
) => {
  const router = Router();

  router.get("/dashboard/reports", (req: AuthenticatedRequest, res, next) => {
    try {
      const zoneId = typeof req.query.zone_id === "string" ? req.query.zone_id : undefined;
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const hours =
        typeof req.query.hours === "string" ? Number.parseInt(req.query.hours, 10) : undefined;

      if (zoneId) {
        const zone = stateStore.getZone(zoneId);
        if (!zone) {
          throw new HttpError(404, "Zone not found.");
        }

        if (
          req.user?.role === "DISTRICT_OFFICIAL" &&
          req.user.districtId &&
          req.user.districtId !== zone.districtId
        ) {
          throw new HttpError(403, "You can only access reports for your district.");
        }
      }

      const reports = stateStore.listMediaReports({
        zoneId,
        status: status as never,
        hours,
        districtId: req.user?.role === "DISTRICT_OFFICIAL" ? req.user.districtId : undefined
      });

      res.json({
        reports,
        total: reports.length,
        pending: reports.filter((report) => report.verificationStatus === "pending").length,
        verified: reports.filter((report) => report.verificationStatus === "verified").length,
        flagged: reports.filter((report) =>
          ["fake", "duplicate", "unverified"].includes(report.verificationStatus)
        ).length
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/dashboard/reports/:reportId/review", (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = MediaReportReviewRequestSchema.parse(req.body);
      if (typeof req.params.reportId !== "string") {
        throw new HttpError(400, "reportId path parameter is required.");
      }

      const report = stateStore.getMediaReport(req.params.reportId);

      if (!report) {
        throw new HttpError(404, "Report not found.");
      }

      if (
        req.user?.role === "DISTRICT_OFFICIAL" &&
        req.user.districtId &&
        req.user.districtId !== report.districtId
      ) {
        throw new HttpError(403, "You can only review reports for your district.");
      }

      const updated = stateStore.updateMediaReport(report.id, {
        verificationStatus: payload.decision,
        reviewNotes: payload.notes,
        reviewedAt: new Date().toISOString(),
        verificationScore:
          payload.decision === "verified"
            ? Math.max(report.verificationScore ?? 0.75, 0.75)
            : report.verificationScore ?? 0.4,
        riskBoostApplied: payload.decision === "verified",
        riskBoostAmount: payload.decision === "verified" ? Math.max(report.riskBoostAmount, 0.1) : 0,
        riskBoostExpiresAt:
          payload.decision === "verified" ? buildRiskBoostExpiryIso() : null,
        verificationBreakdown: report.verificationBreakdown
          ? {
              ...report.verificationBreakdown,
              needsManualReview: payload.decision === "verified" ? false : report.verificationBreakdown.needsManualReview,
              summary:
                payload.decision === "verified"
                  ? "Verified by a dashboard operator after manual review."
                  : `Marked ${payload.decision} by a dashboard operator.`
            }
          : null
      });

      if (!updated) {
        throw new HttpError(404, "Report not found.");
      }

      realtimeServer.emitMediaReportUpdated(updated);

      res.json({
        ok: true,
        report_id: updated.id,
        status: updated.verificationStatus,
        message: buildMediaStatusMessage(updated),
        review_notes: updated.reviewNotes,
        risk_boost_expires_at: updated.riskBoostExpiresAt
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/dashboard/reports/:reportId/privacy", (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = MediaPrivacyReviewRequestSchema.parse(req.body);
      if (typeof req.params.reportId !== "string") {
        throw new HttpError(400, "reportId path parameter is required.");
      }

      const report = stateStore.getMediaReport(req.params.reportId);

      if (!report) {
        throw new HttpError(404, "Report not found.");
      }

      if (
        req.user?.role === "DISTRICT_OFFICIAL" &&
        req.user.districtId &&
        req.user.districtId !== report.districtId
      ) {
        throw new HttpError(403, "You can only review reports for your district.");
      }

      const privacyStatus =
        payload.action === "mark_blur_applied"
          ? "blur_applied"
          : payload.action === "mark_blur_required"
            ? "blur_required"
            : "clear";
      const faceBlurApplied = payload.action === "mark_blur_applied";
      const noteSuffix =
        payload.action === "mark_blur_applied"
          ? "Face blur applied by dashboard operator."
          : payload.action === "mark_blur_required"
            ? "Face blur required before wider sharing."
            : "Privacy flag cleared by dashboard operator.";

      const updated = stateStore.updateMediaReport(report.id, {
        privacyStatus,
        faceBlurApplied,
        reviewNotes: payload.notes.trim() ? payload.notes : report.reviewNotes || noteSuffix,
        reviewedAt: new Date().toISOString()
      });

      if (!updated) {
        throw new HttpError(404, "Report not found.");
      }

      realtimeServer.emitMediaReportUpdated(updated);

      res.json({
        ok: true,
        report_id: updated.id,
        privacy_status: updated.privacyStatus,
        face_blur_applied: updated.faceBlurApplied,
        review_notes: updated.reviewNotes
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/dashboard/reports/:reportId/assets", async (req: AuthenticatedRequest, res, next) => {
    try {
      if (typeof req.params.reportId !== "string") {
        throw new HttpError(400, "reportId path parameter is required.");
      }

      const report = stateStore.getMediaReport(req.params.reportId);

      if (!report) {
        throw new HttpError(404, "Report not found.");
      }

      if (
        req.user?.role === "DISTRICT_OFFICIAL" &&
        req.user.districtId &&
        req.user.districtId !== report.districtId
      ) {
        throw new HttpError(403, "You can only access report assets for your district.");
      }

      const expiresInSeconds = 15 * 60;
      const assets = await mediaStorageService.createSignedAssetUrls(report, expiresInSeconds);

      let mediaUrl = assets.mediaUrl;
      let thumbnailUrl = assets.thumbnailUrl;

      if (assets.provider === "runtime_local" && assets.available) {
        const token = issueMediaAssetAccessToken(report.id, expiresInSeconds);
        mediaUrl = `${req.protocol}://${req.get("host")}/api/reports/${report.id}/media?access_token=${token}`;
        thumbnailUrl = report.mediaType === "photo" ? mediaUrl : null;
      }

      res.json({
        report_id: report.id,
        available: assets.available,
        provider: assets.provider,
        media_url: mediaUrl,
        thumbnail_url: thumbnailUrl,
        expires_in_seconds: expiresInSeconds
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/alerts/preview", (req: AuthenticatedRequest, res, next) => {
    try {
      if (typeof req.query.zone_id !== "string") {
        throw new HttpError(400, "zone_id query parameter is required.");
      }
      const recipientPhoneNumber =
        typeof req.query.recipient_phone_number === "string"
          ? req.query.recipient_phone_number
          : undefined;

      const zone = stateStore.getZone(req.query.zone_id);

      if (!zone) {
        throw new HttpError(404, "Zone not found.");
      }

      const recipientAlertLanguage =
        typeof req.query.recipient_alert_language === "string"
          ? normalizeLanguage(req.query.recipient_alert_language, zone.districtId)
          : undefined;

      if (
        req.user?.role === "DISTRICT_OFFICIAL" &&
        req.user.districtId &&
        req.user.districtId !== zone.districtId
      ) {
        throw new HttpError(403, "You can only preview alerts for your district.");
      }

      const current = stateStore.getForecast(zone.id).current;

      if (!current) {
        throw new HttpError(400, "Current prediction is not available for this zone.");
      }

      const subscribers = resolveAlertRecipients(
        stateStore.getSubscribersByZone(zone.id),
        zone.id,
        zone.districtId,
        recipientPhoneNumber,
        recipientAlertLanguage,
        ["SMS", "WHATSAPP"] as Array<"SMS" | "WHATSAPP">
      );
      const preview = buildLocalizedAlertPreview({
        zone,
        shelter: stateStore.getShelters(zone.id)[0],
        riskLevel: current.riskLevel,
        subscribers
      });

      res.json(preview);
    } catch (error) {
      next(error);
    }
  });

  router.post("/alerts/trigger", async (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = AlertTriggerRequestSchema.parse(req.body);
      const zone = stateStore.getZone(payload.zoneId);

      if (!zone) {
        throw new HttpError(404, "Zone not found.");
      }

      if (
        req.user?.role === "DISTRICT_OFFICIAL" &&
        req.user.districtId &&
        req.user.districtId !== zone.districtId
      ) {
        throw new HttpError(403, "You can only trigger alerts for your district.");
      }

      const current = stateStore.getForecast(zone.id).current;

      if (!current) {
        throw new HttpError(400, "Current prediction is not available for this zone.");
      }

      const subscribers = resolveAlertRecipients(
        stateStore.getSubscribersByZone(zone.id),
        zone.id,
        zone.districtId,
        payload.recipientPhoneNumber,
        payload.recipientAlertLanguage,
        payload.channels
      );
      const preview = buildLocalizedAlertPreview({
        zone,
        shelter: stateStore.getShelters(zone.id)[0],
        riskLevel: current.riskLevel,
        subscribers
      });

      if (
        payload.channels.includes("SMS") &&
        preview.localizedMessages.some((message) => !message.smsWithinLimit)
      ) {
        throw new HttpError(
          400,
          "SMS preview exceeds the 160 character limit for one or more language variants."
        );
      }
      const draft = {
        id: uuid(),
        zoneId: zone.id,
        zoneName: zone.name,
        riskLevel: current.riskLevel,
        riskScore: current.riskScore,
        triggerSource: "MANUAL" as const,
        triggerHorizonHours: 0,
        channels: payload.channels,
        recipientCount: 0,
        deliveryStatus: "QUEUED" as const,
        localizedMessages: preview.localizedMessages,
        createdAt: new Date().toISOString(),
        reason: payload.reason
      };

      const dispatch = await alertDispatcher.dispatch(draft, subscribers);
      const stored = stateStore.createAlert({
        ...draft,
        recipientCount: dispatch.recipientCount,
        deliveryStatus: dispatch.deliveryStatus
      });

      realtimeServer.emitAlertDispatched(stored);

      res.status(201).json({
        ok: true,
        alert_id: stored.id,
        queued_channels: stored.channels,
        recipient_count: stored.recipientCount,
        delivery_status: stored.deliveryStatus,
        localized_messages: stored.localizedMessages
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/dashboard/evacuation-paths", (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = EvacuationPathUpsertRequestSchema.parse(req.body);
      const zone = stateStore.getZone(payload.zoneId);

      if (!zone) {
        throw new HttpError(404, "Zone not found.");
      }

      if (
        req.user?.role === "DISTRICT_OFFICIAL" &&
        req.user.districtId &&
        req.user.districtId !== zone.districtId
      ) {
        throw new HttpError(403, "You can only publish evacuation paths for your district.");
      }

      const shelter = stateStore.getShelters(zone.id).find((item) => item.id === payload.safeShelterId);

      if (!shelter) {
        throw new HttpError(400, "Selected shelter does not belong to this zone.");
      }

      const availableSegments = stateStore.getRoadConditions(zone.id).segments.map((item) => item.id);
      const invalidSegment = payload.segmentIds.find((segmentId) => !availableSegments.includes(segmentId));

      if (invalidSegment) {
        throw new HttpError(400, `Road segment ${invalidSegment} is not available for this zone.`);
      }

      const saved = stateStore.upsertEvacuationPath(payload, req.user?.name ?? req.user?.email ?? "Operator");

      res.status(201).json({
        ok: true,
        route: saved
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};

function buildRiskBoostExpiryIso() {
  return new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
}

function resolveAlertRecipients(
  subscribers: Subscription[],
  zoneId: string,
  districtId: string,
  recipientPhoneNumber: string | undefined,
  recipientAlertLanguage: Subscription["alertLanguage"] | undefined,
  channels: Subscription["channels"]
) {
  if (!recipientPhoneNumber) {
    return subscribers;
  }

  const existing = subscribers.find(
    (subscriber) => subscriber.phoneNumber === recipientPhoneNumber
  );

  if (existing) {
    return [
      {
        ...existing,
        channels: [...channels]
      }
    ];
  }

  const normalizedAlertLanguage = normalizeLanguage(recipientAlertLanguage, districtId);

  return [
    {
      id: `manual-test-${recipientPhoneNumber}`,
      zoneId,
      phoneNumber: recipientPhoneNumber,
      channels,
      appLanguage: normalizedAlertLanguage,
      alertLanguage: normalizedAlertLanguage,
      isActive: true,
      createdAt: new Date().toISOString()
    }
  ];
}
