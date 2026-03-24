import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

export const env = {
  workerApiBaseUrl: process.env.WORKER_API_BASE_URL ?? "http://localhost:3000",
  internalServiceApiKey:
    process.env.INTERNAL_SERVICE_API_KEY ?? "bhurakshan-local-internal-key",
  mlServiceUrl: process.env.ML_SERVICE_URL ?? "http://localhost:8000",
  mlInternalApiKey: process.env.ML_INTERNAL_API_KEY ?? "bhurakshan-ml-local-key",
  weatherProvider: (process.env.WEATHER_PROVIDER ?? "openweathermap").trim().toLowerCase(),
  weatherFallbackProvider: (process.env.WEATHER_FALLBACK_PROVIDER ?? "open-meteo").trim().toLowerCase(),
  weatherApiKey: process.env.WEATHER_API_KEY?.trim(),
  pollIntervalMinutes: Number(process.env.WEATHER_POLL_INTERVAL_MINUTES ?? 5),
  roadConditionPollIntervalMinutes: Number(process.env.ROAD_CONDITION_POLL_INTERVAL_MINUTES ?? 30)
};
