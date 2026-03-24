import type { InternalRoadConditionBatch, RoadCondition, ZoneRoadConditions } from "@bhurakshan/contracts";
import { ApiGatewayClient } from "../clients/api-gateway";

type ZoneRiskView = Awaited<ReturnType<ApiGatewayClient["getZoneRiskView"]>>[number];

export class RoadConditionPollingRunner {
  constructor(private readonly apiGatewayClient: ApiGatewayClient) {}

  public async run() {
    const zones = await this.apiGatewayClient.getZoneRiskView();
    const elevatedZones = zones.filter((zone) => zone.riskLevel === "WATCH" || zone.riskLevel === "DANGER");
    const synced: InternalRoadConditionBatch[] = [];

    for (const zone of elevatedZones) {
      const roadConditions = await this.apiGatewayClient.getZoneRoadConditions(zone.zoneId);
      const payload = this.buildZoneUpdate(zone, roadConditions);

      await this.apiGatewayClient.syncRoadConditions(payload);
      synced.push(payload);
    }

    return synced;
  }

  private buildZoneUpdate(zone: ZoneRiskView, roadConditions: ZoneRoadConditions): InternalRoadConditionBatch {
    const updatedAt = new Date().toISOString();

    return {
      zoneId: zone.zoneId,
      updates: roadConditions.segments.map((segment) => {
        const next = simulateRoadCondition(zone, segment.condition);

        return {
          segmentId: segment.id,
          status: next.status,
          averageSpeedKmph: next.averageSpeedKmph,
          delayMinutes: next.delayMinutes,
          severityPct: next.severityPct,
          source: "google_roads_simulated",
          note: next.note,
          updatedAt
        };
      })
    };
  }
}

function simulateRoadCondition(
  zone: ZoneRiskView,
  condition: ZoneRoadConditions["segments"][number]["condition"]
) {
  const riskMultiplier = zone.riskLevel === "DANGER" ? 1.2 : 0.85;
  const nextSeverity = Math.min(
    100,
    Math.round(condition.severityPct + zone.riskScore * 0.08 * riskMultiplier)
  );
  const nextDelay = Math.max(
    0,
    Math.round(condition.delayMinutes + (zone.riskLevel === "DANGER" ? 4 : 2))
  );

  let status: RoadCondition["status"] = condition.status;

  if (nextSeverity >= 88) {
    status = "blocked";
  } else if (nextSeverity >= 68) {
    status = "flooded";
  } else if (nextSeverity >= 36) {
    status = "caution";
  } else {
    status = "open";
  }

  const averageSpeedKmph =
    status === "blocked"
      ? 0
      : status === "flooded"
        ? Math.max(3, Math.round(condition.averageSpeedKmph * 0.35))
        : status === "caution"
          ? Math.max(8, Math.round(condition.averageSpeedKmph * 0.7))
          : Math.max(14, Math.round(condition.averageSpeedKmph * 1.05));

  return {
    status,
    averageSpeedKmph,
    delayMinutes: status === "open" ? Math.max(1, nextDelay - 2) : nextDelay,
    severityPct: nextSeverity,
    note:
      status === "blocked"
        ? "Simulated Google Roads poll found the segment temporarily blocked."
        : status === "flooded"
          ? "Simulated Google Roads poll found water or debris exposure on this segment."
          : status === "caution"
            ? "Simulated Google Roads poll suggests slower movement on this segment."
            : "Simulated Google Roads poll shows this segment is currently passable."
  };
}
