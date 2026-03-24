import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getComputedSafeZoneRoute,
  getDistricts,
  getEmergencyContacts,
  getElevationProfile,
  getForecast,
  getLiveWeather,
  getLocationStatus,
  getNearbySafeZones,
  getRoadConditions,
  getRoute,
  getShelters,
  getZones
} from "../services/api";
import type {
  CitizenForecast,
  ComputedSafeZoneRoute,
  CitizenZoneRisk,
  District,
  ElevationProfile,
  EmergencyContact,
  EvacuationRoute,
  LanguageCode,
  LiveWeather,
  LocationStatus,
  NearbySafeZone,
  Shelter,
  ZoneRoadConditions
} from "../types";

export function useCitizenData(language: LanguageCode) {
  const [districts, setDistricts] = useState<District[]>([]);
  const [zones, setZones] = useState<CitizenZoneRisk[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [forecast, setForecast] = useState<CitizenForecast | null>(null);
  const [liveWeather, setLiveWeather] = useState<LiveWeather | null>(null);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [route, setRoute] = useState<EvacuationRoute | null>(null);
  const [roadConditions, setRoadConditions] = useState<ZoneRoadConditions | null>(null);
  const [elevationProfile, setElevationProfile] = useState<ElevationProfile | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [locationStatus, setLocationStatus] = useState<LocationStatus | null>(null);
  const [computedSafeZoneRoute, setComputedSafeZoneRoute] = useState<ComputedSafeZoneRoute | null>(null);
  const [nearbySafeZones, setNearbySafeZones] = useState<NearbySafeZone[]>([]);
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const languageRef = useRef(language);
  const headingRef = useRef<number | null>(null);
  const lastLocationKeyRef = useRef<string | null>(null);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    headingRef.current = deviceHeading;
  }, [deviceHeading]);

  useEffect(() => {
    let isActive = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [districtResults, zoneResults, emergencyResults] = await Promise.all([
          getDistricts(),
          getZones(),
          getEmergencyContacts()
        ]);

        if (!isActive) {
          return;
        }

        setDistricts(districtResults);
        setZones(zoneResults);
        setEmergencyContacts(emergencyResults);
        setSelectedZoneId(zoneResults[0]?.zone_id ?? null);
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        setDistricts([]);
        setZones([]);
        setEmergencyContacts([]);
        setSelectedZoneId(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Citizen data could not be loaded right now."
        );
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const zoneId = selectedZoneId;
    if (!zoneId) {
      setForecast(null);
      setLiveWeather(null);
      setShelters([]);
      setRoute(null);
      setRoadConditions(null);
      setElevationProfile(null);
      setComputedSafeZoneRoute(null);
      return;
    }

    const activeZoneId = zoneId;
    let isActive = true;

    async function loadZoneData() {
      try {
        const [
          forecastResult,
          liveWeatherResult,
          shelterResults,
          routeResult,
          roadConditionsResult,
          elevationProfileResult
        ] = await Promise.all([
          getForecast(activeZoneId),
          getLiveWeather(activeZoneId),
          getShelters(activeZoneId),
          getRoute(activeZoneId),
          getRoadConditions(activeZoneId),
          getElevationProfile(activeZoneId)
        ]);

        if (!isActive) {
          return;
        }

        setForecast(forecastResult);
        setLiveWeather(liveWeatherResult);
        setShelters(shelterResults);
        setRoute(routeResult);
        setRoadConditions(roadConditionsResult);
        setElevationProfile(elevationProfileResult);
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        setForecast(null);
        setLiveWeather(null);
        setShelters([]);
        setRoute(null);
        setRoadConditions(null);
        setElevationProfile(null);
        setComputedSafeZoneRoute(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Zone details could not be loaded right now."
        );
      }
    }

    void loadZoneData();

    return () => {
      isActive = false;
    };
  }, [selectedZoneId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleOrientation = (event: Event) => {
      const orientation = event as DeviceOrientationEvent & {
        webkitCompassHeading?: number;
      };

      if (typeof orientation.webkitCompassHeading === "number") {
        setDeviceHeading(normalizeHeading(orientation.webkitCompassHeading));
        return;
      }

      if (typeof orientation.alpha === "number") {
        setDeviceHeading(normalizeHeading(360 - orientation.alpha));
      }
    };

    window.addEventListener("deviceorientationabsolute", handleOrientation);
    window.addEventListener("deviceorientation", handleOrientation);

    return () => {
      window.removeEventListener("deviceorientationabsolute", handleOrientation);
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, []);

  const loadLocationGuidanceForCoordinates = useCallback(
    async (lat: number, lon: number, force = false) => {
      const headingDegrees = headingRef.current ?? undefined;
      const locationKey = `${lat.toFixed(4)}:${lon.toFixed(4)}:${
        typeof headingDegrees === "number" ? Math.round(headingDegrees) : "na"
      }:${languageRef.current}`;

      if (!force && lastLocationKeyRef.current === locationKey) {
        return;
      }

      lastLocationKeyRef.current = locationKey;
      setLocating(true);
      setLocationError(null);

      try {
        const [status, safeZones] = await Promise.all([
          getLocationStatus(lat, lon, languageRef.current, headingDegrees),
          getNearbySafeZones(lat, lon, 5)
        ]);
        const weatherResult = await getLiveWeather(status.user_location.zone_id);
        const computedRoute = await getComputedSafeZoneRoute(
          status.user_location.zone_id,
          lat,
          lon,
          languageRef.current
        );

        setLocationStatus(status);
        setNearbySafeZones(safeZones);
        setComputedSafeZoneRoute(computedRoute);
        setLiveWeather(weatherResult);
        setSelectedZoneId(status.user_location.zone_id);
      } catch (loadError) {
        setComputedSafeZoneRoute(null);
        setLocationError(
          loadError instanceof Error
            ? loadError.message
            : "Location guidance could not be loaded."
        );
      } finally {
        setLocating(false);
      }
    },
    []
  );

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation || !zones.length) {
      return;
    }

    let cancelled = false;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (cancelled) {
          return;
        }

        void loadLocationGuidanceForCoordinates(
          position.coords.latitude,
          position.coords.longitude
        );
      },
      (geoError) => {
        if (cancelled) {
          return;
        }

        setLocationError(geoError.message || "Location access was denied.");
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000
      }
    );

    return () => {
      cancelled = true;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [loadLocationGuidanceForCoordinates, zones.length]);

  const refreshLocationGuidance = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Geolocation is not supported on this device.");
      return;
    }

    setLocating(true);
    setLocationError(null);

    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await loadLocationGuidanceForCoordinates(
            position.coords.latitude,
            position.coords.longitude,
            true
          );
          resolve();
        },
        (geoError) => {
          setComputedSafeZoneRoute(null);
          setLocationError(geoError.message || "Location access was denied.");
          setLocating(false);
          resolve();
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0
        }
      );
    });
  }, [loadLocationGuidanceForCoordinates]);

  const selectedZone = useMemo(
    () => zones.find((zone) => zone.zone_id === selectedZoneId) ?? null,
    [selectedZoneId, zones]
  );

  return {
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
    error
  };
}

function normalizeHeading(value: number) {
  return ((value % 360) + 360) % 360;
}
