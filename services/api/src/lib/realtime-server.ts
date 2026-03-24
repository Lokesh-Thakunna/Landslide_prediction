import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { AlertLog, ForecastPoint, Hotspot, MediaReport, PredictionCore } from "@bhurakshan/contracts";
import { env } from "../config/env";

export class RealtimeServer {
  private io?: SocketIOServer;

  public attach(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: env.corsOrigins,
        credentials: true
      }
    });

    this.io.on("connection", (socket) => {
      socket.on("subscribe_district", (districtId: string) => {
        socket.join(`district:${districtId}`);
      });

      socket.on("subscribe_zone", (zoneId: string) => {
        socket.join(`zone:${zoneId}`);
      });
    });
  }

  public emitZoneRiskUpdated(payload: PredictionCore) {
    this.io?.emit("zone_risk_updated", payload);
    this.io?.to(`zone:${payload.zoneId}`).emit("zone_risk_updated", payload);
  }

  public emitForecastUpdated(zoneId: string, payload: ForecastPoint[]) {
    this.io?.emit("zone_forecast_updated", { zoneId, forecast: payload });
    this.io?.to(`zone:${zoneId}`).emit("zone_forecast_updated", {
      zoneId,
      forecast: payload
    });
  }

  public emitHotspotUpdated(payload: Hotspot) {
    this.io?.emit("hotspot_updated", payload);
  }

  public emitAlertDispatched(payload: AlertLog) {
    this.io?.emit("alert_dispatched", payload);
    this.io?.to(`zone:${payload.zoneId}`).emit("alert_dispatched", payload);
  }

  public emitMediaReportUpdated(payload: MediaReport) {
    this.io?.emit("media_report_updated", payload);
    this.io?.to(`zone:${payload.zoneId}`).emit("media_report_updated", payload);
  }
}
