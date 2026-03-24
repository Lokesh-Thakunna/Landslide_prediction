import { useEffect, useMemo, useState } from "react";
import { DistrictListCard } from "./components/DistrictListCard";
import { EmergencyContactsCard } from "./components/EmergencyContactsCard";
import { EvacuationNavigationCard } from "./components/EvacuationNavigationCard";
import { ForecastStrip } from "./components/ForecastStrip";
import { HeroCard } from "./components/HeroCard";
import { InstallPrompt } from "./components/InstallPrompt";
import { LocationGuidanceCard } from "./components/LocationGuidanceCard";
import { MediaReportCard } from "./components/MediaReportCard";
import { NearbySafeZonesCard } from "./components/NearbySafeZonesCard";
import { OfflineCompassCard } from "./components/OfflineCompassCard";
import { RouteCard } from "./components/RouteCard";
import { ShelterCard } from "./components/ShelterCard";
import { SubscriptionCard } from "./components/SubscriptionCard";
import { ZonePicker } from "./components/ZonePicker";
import { useCitizenData } from "./hooks/useCitizenData";
import { useOfflineReadiness } from "./hooks/useOfflineReadiness";
import {
  ALERT_LANGUAGE_STORAGE_KEY,
  LANGUAGE_STORAGE_KEY,
  getCitizenDictionary,
  getDefaultLanguageForDistrict,
  getLanguageMeta,
  languageOptions
} from "./lib/i18n";
import type { LanguageCode } from "./types";

function App() {
  const [appLanguage, setAppLanguage] = useState<LanguageCode>(() => {
    if (typeof window === "undefined") {
      return "hi";
    }

    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguageCode(stored) ? stored : "hi";
  });
  const [alertLanguage, setAlertLanguage] = useState<LanguageCode>(() => {
    if (typeof window === "undefined") {
      return "hi";
    }

    const stored = window.localStorage.getItem(ALERT_LANGUAGE_STORAGE_KEY);
    return isLanguageCode(stored) ? stored : "hi";
  });
  const [hasChosenLanguage, setHasChosenLanguage] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return Boolean(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
  });

  const {
    districts,
    zones,
    selectedZoneId,
    selectedZone,
    setSelectedZoneId,
    forecast,
    liveWeather,
    shelters,
    route,
    roadConditions,
    elevationProfile,
    emergencyContacts,
    locationStatus,
    computedSafeZoneRoute,
    nearbySafeZones,
    deviceHeading,
    locationError,
    locating,
    refreshLocationGuidance,
    loading,
    error,
  } = useCitizenData(appLanguage);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const offlineReadiness = useOfflineReadiness(selectedZone?.district_id ?? null);
  const visibleZones = useMemo(
    () =>
      selectedDistrictId
        ? zones.filter((zone) => zone.district_id === selectedDistrictId)
        : zones,
    [selectedDistrictId, zones]
  );

  const suggestedLanguage = useMemo(
    () => getDefaultLanguageForDistrict(selectedZone?.district_id ?? zones[0]?.district_id ?? ""),
    [selectedZone?.district_id, zones]
  );
  const copy = getCitizenDictionary(appLanguage);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, appLanguage);
  }, [appLanguage]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(ALERT_LANGUAGE_STORAGE_KEY, alertLanguage);
  }, [alertLanguage]);

  useEffect(() => {
    if (!hasChosenLanguage) {
      return;
    }

    void refreshLocationGuidance();
  }, [appLanguage, hasChosenLanguage, refreshLocationGuidance]);

  useEffect(() => {
    if (!selectedZone?.district_id) {
      return;
    }

    setSelectedDistrictId((current) =>
      current === selectedZone.district_id ? current : selectedZone.district_id
    );
  }, [selectedZone?.district_id]);

  if (!hasChosenLanguage) {
    return (
      <main className="mx-auto flex min-h-screen max-w-[720px] items-center px-4 py-6">
        <section className="w-full rounded-[30px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_60px_rgba(32,22,17,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
            HH-LEWS
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">
            {copy.chooseLanguageTitle}
          </h1>
          <p className="mt-2 text-sm text-slate-600">{copy.chooseLanguageSubtitle}</p>
          <p className="mt-1 text-sm text-slate-500">{copy.chooseLanguageHint}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {languageOptions.map((option) => {
              const recommended = option.code === suggestedLanguage;
              return (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => {
                    setAppLanguage(option.code);
                    setAlertLanguage(option.code);
                    setHasChosenLanguage(true);
                  }}
                  className={`rounded-[22px] border px-4 py-4 text-left transition ${
                    recommended
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <div className="text-lg font-semibold text-slate-900">{option.nativeLabel}</div>
                  <div className="mt-1 text-sm text-slate-600">{option.label}</div>
                  {recommended ? (
                    <div className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
                      Recommended
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-slate-700">
        {copy.loading}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-[980px] flex-col gap-4 px-4 py-5 sm:px-5">
      {error ? (
        <section className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </section>
      ) : null}

      <section className="rounded-[26px] border border-white/70 bg-white/80 px-4 py-4 shadow-[0_18px_40px_rgba(32,22,17,0.08)] backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
              {copy.appEyebrow}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{copy.appIntro}</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-2">
            <span className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {copy.languageChipLabel}
            </span>
            {languageOptions.map((option) => (
              <button
                key={option.code}
                type="button"
                onClick={() => setAppLanguage(option.code)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  appLanguage === option.code
                    ? "bg-slate-900 text-white"
                    : "text-slate-600"
                }`}
              >
                {option.shortLabel}
              </button>
            ))}
          </div>
        </div>
      </section>

      <ZonePicker
        zones={visibleZones}
        selectedZoneId={selectedZoneId}
        onChange={setSelectedZoneId}
        currentAreaLabel={copy.currentArea}
        noZonesText={copy.noZones}
      />

      <DistrictListCard
        districts={districts}
        selectedDistrictId={selectedDistrictId}
        onSelect={(districtId) => {
          setSelectedDistrictId(districtId);
          const nextZone = zones.find((zone) => zone.district_id === districtId);
          if (nextZone) {
            setSelectedZoneId(nextZone.zone_id);
          }
        }}
        title={getDistrictsTitle(appLanguage)}
        subtitle={getDistrictsSubtitle(appLanguage)}
        countLabel={(count) => formatDistrictCount(appLanguage, count)}
      />

      {!visibleZones.length ? (
        <section className="rounded-[24px] border border-white/70 bg-white/85 p-4 text-sm text-slate-600 shadow-[0_18px_40px_rgba(32,22,17,0.08)]">
          {copy.noZones}
        </section>
      ) : null}

      {selectedZone ? <HeroCard zone={selectedZone} weather={liveWeather} language={appLanguage} /> : null}

      <ForecastStrip forecast={forecast} language={appLanguage} />

      <div className="grid gap-4 md:grid-cols-2">
        <ShelterCard shelter={shelters[0] ?? null} language={appLanguage} />
        <RouteCard
          route={route}
          computedRoute={computedSafeZoneRoute}
          roadConditions={roadConditions}
          elevationProfile={elevationProfile}
          language={appLanguage}
        />
      </div>

      <LocationGuidanceCard
        language={appLanguage}
        status={locationStatus}
        deviceHeading={deviceHeading}
        loading={locating}
        error={locationError}
        onRefresh={refreshLocationGuidance}
      />

      <EvacuationNavigationCard
        language={appLanguage}
        route={route}
        computedRoute={computedSafeZoneRoute}
        roadConditions={roadConditions}
        status={locationStatus}
        deviceHeading={deviceHeading}
      />

      <OfflineCompassCard
        language={appLanguage}
        status={locationStatus}
        deviceHeading={deviceHeading}
        districtName={selectedZone?.district_name ?? locationStatus?.user_location.district ?? null}
        isOnline={offlineReadiness.isOnline}
        serviceWorkerSupported={offlineReadiness.serviceWorkerSupported}
        serviceWorkerReady={offlineReadiness.serviceWorkerReady}
        cacheState={offlineReadiness.cacheState}
        cacheMessage={offlineReadiness.cacheMessage}
        cachedCurrentDistrict={offlineReadiness.cachedCurrentDistrict}
        onPrepareOffline={() => offlineReadiness.prepareOffline(selectedZone?.district_id ?? null)}
      />

      <MediaReportCard
        language={appLanguage}
        locationStatus={locationStatus}
        locating={locating}
      />

      <NearbySafeZonesCard language={appLanguage} safeZones={nearbySafeZones} />

      <section className="rounded-[24px] border border-white/70 bg-white/85 p-4 shadow-[0_18px_40px_rgba(32,22,17,0.08)]">
        <h2 className="text-lg font-semibold text-slate-900">{copy.settingsTitle}</h2>
        <p className="mt-1 text-sm text-slate-600">{copy.settingsBody}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <LanguageChoice
            label={copy.appLanguage}
            value={appLanguage}
            onChange={setAppLanguage}
          />
          <LanguageChoice
            label={copy.alertLanguage}
            value={alertLanguage}
            onChange={setAlertLanguage}
          />
        </div>
      </section>

      <SubscriptionCard
        zones={zones}
        selectedZoneId={selectedZoneId}
        appLanguage={appLanguage}
        alertLanguage={alertLanguage}
      />
      <EmergencyContactsCard contacts={emergencyContacts} language={appLanguage} />
      <InstallPrompt language={appLanguage} />
    </main>
  );
}

export default App;

function LanguageChoice({
  label,
  value,
  onChange
}: {
  label: string;
  value: LanguageCode;
  onChange: (language: LanguageCode) => void;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-700">
      {label}
      <div className="grid grid-cols-2 gap-2">
        {languageOptions.map((option) => (
          <button
            key={option.code}
            type="button"
            onClick={() => onChange(option.code)}
            className={`rounded-xl border px-3 py-3 text-left ${
              value === option.code
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-700"
            }`}
          >
            <div className="font-semibold">{option.nativeLabel}</div>
            <div className="text-xs opacity-80">{option.label}</div>
          </button>
        ))}
      </div>
    </label>
  );
}

function isLanguageCode(value: string | null): value is LanguageCode {
  return (
    value === "hi" ||
    value === "en" ||
    value === "hi-x-garhwali" ||
    value === "hi-x-kumaoni"
  );
}

function getDistrictsTitle(language: LanguageCode) {
  return language === "en" ? "Districts" : "जिले";
}

function getDistrictsSubtitle(language: LanguageCode) {
  return language === "en"
    ? "Same live district list as the dashboard."
    : "डैशबोर्ड वाली वही लाइव जिला सूची।";
}

function formatDistrictCount(language: LanguageCode, count: number) {
  if (language === "en") {
    return `${count} zone${count === 1 ? "" : "s"}`;
  }

  return `${count} क्षेत्र`;
}
