import {
  MlPredictionRequest,
  MlPredictionResponse,
  RiskLevel
} from "@bhurakshan/contracts";

const getRiskLevel = (score: number): RiskLevel => {
  if (score >= 70) {
    return "DANGER";
  }

  if (score >= 30) {
    return "WATCH";
  }

  return "SAFE";
};

export const calculateSoilMoistureProxy = (
  rainfallMmHr: number,
  rainfallPlusOne: number,
  rainfallPlusTwo: number
) => {
  const value =
    rainfallMmHr * 0.45 + ((rainfallMmHr + rainfallPlusOne) / 2) * 0.35 + (rainfallPlusTwo * 4) * 0.2;

  return Math.max(0, Math.min(100, Number(value.toFixed(2))));
};

export const calculateGroundMovementProxy = (
  slopeDegrees: number,
  soilMoistureProxyPct: number,
  historicalLandslideFrequency: number
) => {
  const normalizedSlopePct = Math.min(100, (slopeDegrees / 45) * 100);
  const normalizedHistoryPct = Math.min(100, historicalLandslideFrequency * 10);
  const value =
    normalizedSlopePct * 0.5 +
    soilMoistureProxyPct * 0.3 +
    normalizedHistoryPct * 0.2;

  return Math.max(0, Math.min(100, Number(value.toFixed(2))));
};

export const buildFallbackPrediction = (
  request: MlPredictionRequest,
  groundMovementProxyPct: number
): MlPredictionResponse => {
  const normalizedRainfallPct = Math.min(100, (request.rainfallMmHr / 50) * 100);
  const normalizedSlopePct = Math.min(100, (request.slopeDegrees / 45) * 100);
  const normalizedHistoryPct = Math.min(100, request.historicalLandslideFrequency * 10);

  const score = Math.round(
    normalizedRainfallPct * 0.4 +
      normalizedSlopePct * 0.25 +
      request.soilMoistureProxyPct * 0.2 +
      normalizedHistoryPct * 0.15
  );

  const ranked = [
    { key: "rainfallMmHr", value: normalizedRainfallPct },
    { key: "slopeDegrees", value: normalizedSlopePct },
    { key: "soilMoistureProxyPct", value: request.soilMoistureProxyPct },
    { key: "historicalLandslideFrequency", value: normalizedHistoryPct },
    { key: "groundMovementProxyPct", value: groundMovementProxyPct }
  ]
    .sort((left, right) => right.value - left.value)
    .slice(0, 3)
    .map((item) => item.key);

  return {
    zoneId: request.zoneId,
    horizonHours: request.horizonHours,
    riskScore: Math.max(0, Math.min(100, score)),
    riskLevel: getRiskLevel(score),
    topFeatures: ranked,
    predictedAt: new Date().toISOString()
  };
};

