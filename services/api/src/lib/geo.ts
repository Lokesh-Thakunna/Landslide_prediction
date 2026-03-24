import type { LanguageCode, SafeShelter, ZoneStatic } from "@bhurakshan/contracts";

const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
) {
  const dLat = toRadians(toLat - fromLat);
  const dLon = toRadians(toLon - fromLon);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function computeBearing(fromLat: number, fromLon: number, toLat: number, toLon: number) {
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);
  const deltaLon = toRadians(toLon - fromLon);

  const x = Math.sin(deltaLon) * Math.cos(lat2);
  const y =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  return (toDegrees(Math.atan2(x, y)) + 360) % 360;
}

export function bearingToLabel(bearing: number, language: LanguageCode) {
  const directions =
    language === "en"
      ? ["North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West"]
      : language === "hi-x-garhwali"
        ? ["उत्तर", "उत्तर-पूर्व", "पूरब", "दक्खिन-पूर्व", "दक्खिन", "दक्खिन-पच्छिम", "पच्छिम", "उत्तर-पच्छिम"]
        : language === "hi-x-kumaoni"
          ? ["उत्तर", "उत्तर-पूर्व", "पूरब", "दक्षिण-पूर्व", "दक्षिण", "दक्षिण-पश्चिम", "पश्चिम", "उत्तर-पश्चिम"]
          : ["उत्तर", "उत्तर-पूर्व", "पूर्व", "दक्षिण-पूर्व", "दक्षिण", "दक्षिण-पश्चिम", "पश्चिम", "उत्तर-पश्चिम"];

  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

export function estimateWalkMinutes(distanceKm: number) {
  return Math.max(1, Math.round((distanceKm / 4.5) * 60));
}

export function angularDifferenceDegrees(fromBearing: number, toBearing: number) {
  const raw = Math.abs(normalizeBearing(fromBearing) - normalizeBearing(toBearing)) % 360;
  return raw > 180 ? 360 - raw : raw;
}

export function isMovingTowardDanger(
  userHeadingDegrees: number,
  dangerBearingDegrees: number,
  thresholdDegrees = 45
) {
  return angularDifferenceDegrees(userHeadingDegrees, dangerBearingDegrees) <= thresholdDegrees;
}

export function chooseNearestZone(zones: ZoneStatic[], lat: number, lon: number) {
  return zones
    .map((zone) => ({
      zone,
      distanceKm: haversineKm(lat, lon, zone.centroidLat, zone.centroidLon)
    }))
    .sort((left, right) => left.distanceKm - right.distanceKm)[0];
}

export function rankSheltersByDistance(
  shelters: SafeShelter[],
  lat: number,
  lon: number,
  userElevationM = 0
) {
  return shelters
    .map((shelter) => {
      const distanceKm = haversineKm(lat, lon, shelter.lat, shelter.lon);
      return {
        shelter,
        distanceKm,
        walkTimeMin: estimateWalkMinutes(distanceKm),
        bearingDegrees: computeBearing(lat, lon, shelter.lat, shelter.lon),
        isUphillFromUser: shelter.elevationM >= userElevationM
      };
    })
    .sort((left, right) => left.distanceKm - right.distanceKm);
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number) {
  return (value * 180) / Math.PI;
}

function normalizeBearing(value: number) {
  return ((value % 360) + 360) % 360;
}
