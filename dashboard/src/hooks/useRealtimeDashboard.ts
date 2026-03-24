import { useEffect } from "react";
import { io } from "socket.io-client";
import { getAlertLogs, getHotspots, getZoneRisks } from "../services/api";
import type { AlertLog, Hotspot, ZoneRisk } from "../types";

const WS_URL = import.meta.env.VITE_WS_URL as string | undefined;
const POLLING_INTERVAL_MS = 10000;

interface RealtimeArgs {
  selectedZoneId: string | null;
  onZonesUpdate: (zones: ZoneRisk[]) => void;
  onHotspotsUpdate: (hotspots: Hotspot[]) => void;
  onAlertsUpdate: (alerts: AlertLog[]) => void;
  onSelectedZoneRefresh: (zoneId: string) => Promise<void>;
}

export function useRealtimeDashboard({
  selectedZoneId,
  onZonesUpdate,
  onHotspotsUpdate,
  onAlertsUpdate,
  onSelectedZoneRefresh,
}: RealtimeArgs) {
  useEffect(() => {
    let cancelled = false;
    let refreshTimeout: number | null = null;

    const refreshDashboard = async () => {
      const [zones, hotspots, alerts] = await Promise.all([
        getZoneRisks(),
        getHotspots(),
        getAlertLogs(),
      ]);

      if (cancelled) {
        return;
      }

      onZonesUpdate(zones);
      onHotspotsUpdate(hotspots);
      onAlertsUpdate(alerts);

      if (selectedZoneId) {
        await onSelectedZoneRefresh(selectedZoneId);
      }
    };

    const scheduleRefresh = () => {
      if (refreshTimeout !== null) {
        return;
      }

      refreshTimeout = window.setTimeout(() => {
        refreshTimeout = null;
        void refreshDashboard();
      }, 250);
    };

    void refreshDashboard();

    if (!WS_URL) {
      const timer = window.setInterval(() => {
        void refreshDashboard();
      }, POLLING_INTERVAL_MS);

      return () => {
        cancelled = true;
        if (refreshTimeout !== null) {
          window.clearTimeout(refreshTimeout);
        }
        window.clearInterval(timer);
      };
    }

    const socket = io(WS_URL, {
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      if (selectedZoneId) {
        socket.emit("subscribe_zone", selectedZoneId);
      }
    });

    socket.on("zone_risk_updated", scheduleRefresh);
    socket.on("zone_forecast_updated", scheduleRefresh);
    socket.on("hotspot_updated", scheduleRefresh);
    socket.on("alert_dispatched", scheduleRefresh);
    socket.on("media_report_updated", scheduleRefresh);

    return () => {
      cancelled = true;
      if (refreshTimeout !== null) {
        window.clearTimeout(refreshTimeout);
      }
      socket.disconnect();
    };
  }, [
    onAlertsUpdate,
    onHotspotsUpdate,
    onSelectedZoneRefresh,
    onZonesUpdate,
    selectedZoneId,
  ]);
}
