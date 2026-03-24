import { Router } from "express";
import { InternalRiskCycleBatchSchema, InternalRoadConditionBatchSchema } from "@bhurakshan/contracts";
import { StateStore } from "../lib/state-store";
import { RealtimeServer } from "../lib/realtime-server";
import { HttpError } from "../lib/http-error";

export const createInternalRouter = (
  stateStore: StateStore,
  realtimeServer: RealtimeServer
) => {
  const router = Router();

  router.get("/zones/active", (_req, res) => {
    res.json(stateStore.getActiveZones());
  });

  router.get("/zones/risk-view", (_req, res) => {
    res.json(stateStore.getZoneRiskView());
  });

  router.get("/zones/:zoneId/road-conditions", (req, res, next) => {
    try {
      const zone = stateStore.getZone(req.params.zoneId);

      if (!zone) {
        throw new HttpError(404, "Zone not found.");
      }

      res.json(stateStore.getRoadConditions(zone.id));
    } catch (error) {
      next(error);
    }
  });

  router.post("/risk-cycles", (req, res, next) => {
    try {
      const payload = InternalRiskCycleBatchSchema.parse(req.body);

      payload.cycles.forEach((cycle) => {
        stateStore.applyRiskCycle(cycle);
        realtimeServer.emitZoneRiskUpdated(cycle.current);
        realtimeServer.emitForecastUpdated(cycle.zone.id, cycle.forecast);
        realtimeServer.emitHotspotUpdated(cycle.hotspot);
      });

      res.json({
        ok: true,
        updated: payload.cycles.length
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/road-conditions/sync", (req, res, next) => {
    try {
      const payload = InternalRoadConditionBatchSchema.parse(req.body);
      const zone = stateStore.getZone(payload.zoneId);

      if (!zone) {
        throw new HttpError(404, "Zone not found.");
      }

      const updated = stateStore.syncRoadConditions(payload.zoneId, payload.updates);

      res.json({
        ok: true,
        zone_id: payload.zoneId,
        updated: payload.updates.length,
        worst_status: updated.summary.worstStatus
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/reset-state", (_req, res) => {
    stateStore.reset();
    res.json({
      ok: true
    });
  });

  return router;
};
