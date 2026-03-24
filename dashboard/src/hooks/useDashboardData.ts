import { useEffect, useMemo, useState } from "react";
import {
  getAlertLogs,
  getDangerZones,
  getDistrictBoundaries,
  getDistricts,
  getElevationProfile,
  getEvacuationRoute,
  getForecast,
  getHotspots,
  getLiveWeather,
  getMediaReports,
  getRoadConditions,
  getShelters,
  getZoneRisks,
} from "../services/api";
import type {
  AlertLog,
  DangerZone,
  DashboardMediaReportsResponse,
  DistrictBoundary,
  District,
  ElevationProfile,
  EvacuationRoute,
  Hotspot,
  LiveWeather,
  MediaReport,
  ZoneRoadConditions,
  Shelter,
  ZoneForecast,
  ZoneRisk,
} from "../types";

interface DashboardState {
  districts: District[];
  districtBoundaries: DistrictBoundary[];
  zones: ZoneRisk[];
  hotspots: Hotspot[];
  alerts: AlertLog[];
  selectedZoneId: string | null;
  selectedForecast: ZoneForecast | null;
  selectedLiveWeather: LiveWeather | null;
  selectedShelters: Shelter[];
  selectedRoute: EvacuationRoute | null;
  selectedRoadConditions: ZoneRoadConditions | null;
  selectedElevationProfile: ElevationProfile | null;
  selectedDangerZones: DangerZone[];
  selectedMediaReports: MediaReport[];
  selectedMediaStats: Omit<DashboardMediaReportsResponse, "reports"> | null;
  loading: boolean;
}

const initialState: DashboardState = {
  districts: [],
  districtBoundaries: [],
  zones: [],
  hotspots: [],
  alerts: [],
  selectedZoneId: null,
  selectedForecast: null,
  selectedLiveWeather: null,
  selectedShelters: [],
  selectedRoute: null,
  selectedRoadConditions: null,
  selectedElevationProfile: null,
  selectedDangerZones: [],
  selectedMediaReports: [],
  selectedMediaStats: null,
  loading: true,
};

export function useDashboardData() {
  const [state, setState] = useState<DashboardState>(initialState);

  useEffect(() => {
    async function load() {
      const [districts, districtBoundaries, zones, hotspots, alerts] = await Promise.all([
        getDistricts(),
        getDistrictBoundaries(),
        getZoneRisks(),
        getHotspots(),
        getAlertLogs(),
      ]);

      const defaultZone = zones[0]?.zone_id ?? null;

      setState((current) => ({
        ...current,
        districts,
        districtBoundaries,
        zones,
        hotspots,
        alerts,
        selectedZoneId: current.selectedZoneId ?? defaultZone,
        loading: false,
      }));
    }

    void load();
  }, []);

  useEffect(() => {
    const zoneId = state.selectedZoneId;
    if (!zoneId) {
      return;
    }

    async function loadZonePanel() {
      const [forecast, liveWeather, shelters, route, roadConditions, elevationProfile, dangerZones, media] = await Promise.all([
        getForecast(zoneId as string),
        getLiveWeather(zoneId as string),
        getShelters(zoneId as string),
        getEvacuationRoute(zoneId as string),
        getRoadConditions(zoneId as string),
        getElevationProfile(zoneId as string),
        getDangerZones(zoneId as string),
        getMediaReports(zoneId as string),
      ]);

      setState((current) => ({
        ...current,
        selectedForecast: forecast,
        selectedLiveWeather: liveWeather,
        selectedShelters: shelters,
        selectedRoute: route,
        selectedRoadConditions: roadConditions,
        selectedElevationProfile: elevationProfile,
        selectedDangerZones: dangerZones,
        selectedMediaReports: media.reports,
        selectedMediaStats: {
          total: media.total,
          pending: media.pending,
          verified: media.verified,
          flagged: media.flagged,
        },
      }));
    }

    void loadZonePanel();
  }, [state.selectedZoneId]);

  const selectedZone = useMemo(
    () => state.zones.find((zone) => zone.zone_id === state.selectedZoneId) ?? null,
    [state.selectedZoneId, state.zones],
  );

  return {
    ...state,
    selectedZone,
    setSelectedZoneId: (zoneId: string) =>
      setState((current) => ({ ...current, selectedZoneId: zoneId })),
    setAlerts: (alerts: AlertLog[]) => setState((current) => ({ ...current, alerts })),
    setZones: (zones: ZoneRisk[]) => setState((current) => ({ ...current, zones })),
    setHotspots: (hotspots: Hotspot[]) =>
      setState((current) => ({ ...current, hotspots })),
    refreshSelectedZone: async (zoneId: string) => {
      const [forecast, liveWeather, shelters, route, roadConditions, elevationProfile, dangerZones, media] = await Promise.all([
        getForecast(zoneId),
        getLiveWeather(zoneId),
        getShelters(zoneId),
        getEvacuationRoute(zoneId),
        getRoadConditions(zoneId),
        getElevationProfile(zoneId),
        getDangerZones(zoneId),
        getMediaReports(zoneId),
      ]);

      setState((current) => ({
        ...current,
        selectedForecast: forecast,
        selectedLiveWeather: liveWeather,
        selectedShelters: shelters,
        selectedRoute: route,
        selectedRoadConditions: roadConditions,
        selectedElevationProfile: elevationProfile,
        selectedDangerZones: dangerZones,
        selectedMediaReports: media.reports,
        selectedMediaStats: {
          total: media.total,
          pending: media.pending,
          verified: media.verified,
          flagged: media.flagged,
        },
      }));
    },
  };
}
