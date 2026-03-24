import axios from "axios";
import {
  MlPredictionRequest,
  MlPredictionRequestSchema,
  MlPredictionResponse,
  MlPredictionResponseSchema
} from "@bhurakshan/contracts";
import { env } from "../config/env";
import { buildFallbackPrediction } from "../utils/risk";

export class MlClient {
  public async predict(
    request: MlPredictionRequest,
    groundMovementProxyPct: number
  ): Promise<MlPredictionResponse> {
    const validated = MlPredictionRequestSchema.parse(request);
    let lastError: unknown;

    for (const baseUrl of buildCandidateBaseUrls(env.mlServiceUrl)) {
      try {
        const response = await axios.post(
          `${baseUrl}/ml/predict`,
          {
            zone_id: validated.zoneId,
            horizon_hours: validated.horizonHours,
            rainfall_mm_hr: validated.rainfallMmHr,
            slope_degrees: validated.slopeDegrees,
            soil_moisture_proxy_pct: validated.soilMoistureProxyPct,
            historical_landslide_frequency: validated.historicalLandslideFrequency
          },
          {
            headers: {
              "X-Internal-Api-Key": env.mlInternalApiKey
            },
            timeout: 10000
          }
        );

        const normalized = {
          zoneId: response.data.zone_id ?? response.data.zoneId,
          horizonHours: response.data.horizon_hours ?? response.data.horizonHours,
          riskScore: response.data.risk_score ?? response.data.riskScore,
          riskLevel: response.data.risk_level ?? response.data.riskLevel,
          topFeatures: response.data.top_features ?? response.data.topFeatures,
          predictedAt: response.data.predicted_at ?? response.data.predictedAt
        };

        return MlPredictionResponseSchema.parse(normalized);
      } catch (error) {
        lastError = error;
      }
    }

    console.warn(
      `ML service unavailable for ${validated.zoneId}. Using local fallback scoring.`,
      lastError
    );
    return buildFallbackPrediction(validated, groundMovementProxyPct);
  }
}

function buildCandidateBaseUrls(baseUrl: string) {
  const normalized = baseUrl.trim().replace(/\/+$/, "");

  try {
    const url = new URL(normalized);
    const candidates = [url.toString().replace(/\/+$/, "")];

    if (url.hostname === "localhost") {
      const ipv4Loopback = new URL(url.toString());
      ipv4Loopback.hostname = "127.0.0.1";
      candidates.push(ipv4Loopback.toString().replace(/\/+$/, ""));
    }

    return [...new Set(candidates)];
  } catch {
    return [normalized];
  }
}
