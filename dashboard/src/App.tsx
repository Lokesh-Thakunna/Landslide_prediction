import { useEffect, useMemo, useState } from "react";
import { AlertDispatchLog } from "./components/AlertDispatchLog";
import { FilterBar } from "./components/FilterBar";
import { Header } from "./components/Header";
import { HotspotPanel } from "./components/HotspotPanel";
import { ManualAlertForm } from "./components/ManualAlertForm";
import { RiskMap } from "./components/RiskMap";
import { ZoneDrawer } from "./components/ZoneDrawer";
import { useDashboardData } from "./hooks/useDashboardData";
import { useRealtimeDashboard } from "./hooks/useRealtimeDashboard";
import { getDashboardDictionary, type DashboardLanguage } from "./lib/i18n";
import { getAlertLogs, getAlertPreview } from "./services/api";
import type { RiskLevel } from "./types";
import type { OperatorLocation } from "./types";

function App() {
  const [operatorLocation, setOperatorLocation] = useState<OperatorLocation | null>(null);
  const {
    districts,
    districtBoundaries,
    zones,
    hotspots,
    alerts,
    selectedZone,
    selectedZoneId,
    selectedForecast,
    selectedLiveWeather,
    selectedShelters,
    selectedRoute,
    selectedRoadConditions,
    selectedElevationProfile,
    selectedDangerZones,
    selectedMediaReports,
    selectedMediaStats,
    loading,
    setSelectedZoneId,
    setAlerts,
    setZones,
    setHotspots,
    refreshSelectedZone,
  } = useDashboardData();

  const [districtFilter, setDistrictFilter] = useState<string>("ALL");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "ALL">("ALL");
  const [language, setLanguage] = useState<DashboardLanguage>("en");
  const copy = getDashboardDictionary(language);

  useEffect(() => {
    if (!selectedZoneId && zones.length > 0) {
      setSelectedZoneId(zones[0].zone_id);
    }
  }, [selectedZoneId, setSelectedZoneId, zones]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setOperatorLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy_m: position.coords.accuracy,
          updated_at: new Date(position.timestamp).toISOString()
        });
      },
      () => {
        setOperatorLocation(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  useRealtimeDashboard({
    selectedZoneId,
    onZonesUpdate: setZones,
    onHotspotsUpdate: setHotspots,
    onAlertsUpdate: setAlerts,
    onSelectedZoneRefresh: refreshSelectedZone,
  });

  const filteredZones = useMemo(
    () =>
      zones.filter((zone) => {
        const districtMatches =
          districtFilter === "ALL" || zone.district_id === districtFilter;
        const riskMatches = riskFilter === "ALL" || zone.risk_level === riskFilter;
        return districtMatches && riskMatches;
      }),
    [districtFilter, riskFilter, zones],
  );

  const filteredHotspots = useMemo(
    () =>
      hotspots.filter((hotspot) => {
        const districtMatches =
          districtFilter === "ALL" || hotspot.district_id === districtFilter;
        const riskMatches = riskFilter === "ALL" || hotspot.risk_level === riskFilter;
        return districtMatches && riskMatches;
      }),
    [districtFilter, hotspots, riskFilter],
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-slate-700">
        Loading dashboard data...
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-[1560px] flex-col gap-4 px-3 py-4 lg:px-5">
      <Header
        language={language}
        onLanguageChange={setLanguage}
        zoneCount={zones.length}
        hotspotCount={filteredHotspots.length}
        alertCount={alerts.length}
      />

      <FilterBar
        language={language}
        districts={districts}
        districtFilter={districtFilter}
        setDistrictFilter={setDistrictFilter}
        riskFilter={riskFilter}
        setRiskFilter={setRiskFilter}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.85fr)]">
        <RiskMap
          districts={districts}
          districtBoundaries={districtBoundaries}
          zones={filteredZones}
          hotspots={filteredHotspots}
          shelters={selectedShelters}
          route={selectedRoute}
          roadConditions={selectedRoadConditions}
          dangerZones={selectedDangerZones}
          operatorLocation={operatorLocation}
          selectedZoneId={selectedZoneId}
          onSelectZone={setSelectedZoneId}
        />
        <div className="grid gap-4">
          <HotspotPanel
            language={language}
            hotspots={filteredHotspots}
            zones={zones}
            onSelectZone={setSelectedZoneId}
          />
          <ManualAlertForm
            language={language}
            zones={zones}
            selectedZoneId={selectedZoneId}
            onAlertTriggered={setAlerts}
            getLatestAlerts={getAlertLogs}
            getAlertPreview={getAlertPreview}
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
        <ZoneDrawer
          language={language}
          zone={selectedZone}
          forecast={selectedForecast}
          liveWeather={selectedLiveWeather}
          shelters={selectedShelters}
          route={selectedRoute}
          roadConditions={selectedRoadConditions}
          elevationProfile={selectedElevationProfile}
          dangerZones={selectedDangerZones}
          mediaReports={selectedMediaReports}
          mediaStats={selectedMediaStats}
          onSavePath={() =>
            selectedZoneId ? refreshSelectedZone(selectedZoneId) : Promise.resolve()
          }
          onRefreshMedia={() =>
            selectedZoneId ? refreshSelectedZone(selectedZoneId) : Promise.resolve()
          }
        />
        <AlertDispatchLog language={language} alerts={alerts} />
      </div>
    </main>
  );
}

export default App;
