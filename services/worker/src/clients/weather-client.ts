import axios from "axios";
import { ZoneStatic } from "@bhurakshan/contracts";
import { env } from "../config/env";

type WeatherBundle = {
  currentRainfall: number;
  hourlyForecast: [number, number];
  source: string;
  isStale: boolean;
};

export class WeatherClient {
  public async fetchForZone(zone: ZoneStatic): Promise<WeatherBundle> {
    const providers = this.buildProviderOrder();

    for (const provider of providers) {
      try {
        if (provider === "openweathermap" && env.weatherApiKey) {
          return await this.fetchOpenWeather(zone);
        }

        if (provider === "open-meteo") {
          return await this.fetchOpenMeteo(zone);
        }
      } catch (error) {
        console.warn(`[weather] ${provider} failed for ${zone.name}:`, error);
      }
    }

    return this.buildDeterministicFallback(zone);
  }

  private buildProviderOrder() {
    const primary = normalizeProvider(env.weatherProvider);
    const fallback = normalizeProvider(env.weatherFallbackProvider);
    const ordered = [primary, fallback, "open-meteo", "openweathermap"];
    return Array.from(new Set(ordered.filter(Boolean))) as Array<"openweathermap" | "open-meteo">;
  }

  private async fetchOpenWeather(zone: ZoneStatic): Promise<WeatherBundle> {
    const [currentResponse, forecastResponse] = await Promise.all([
      axios.get("https://api.openweathermap.org/data/2.5/weather", {
        params: {
          lat: zone.centroidLat,
          lon: zone.centroidLon,
          appid: env.weatherApiKey,
          units: "metric"
        },
        timeout: 10000
      }),
      axios.get("https://api.openweathermap.org/data/2.5/forecast", {
        params: {
          lat: zone.centroidLat,
          lon: zone.centroidLon,
          appid: env.weatherApiKey,
          units: "metric",
          cnt: 3
        },
        timeout: 10000
      })
    ]);

    const forecastItems = Array.isArray(forecastResponse.data?.list)
      ? forecastResponse.data.list
      : [];
    const currentRainfall = extractOpenWeatherRainfall(currentResponse.data)
      ?? extractOpenWeatherRainfall(forecastItems[0])
      ?? 0;
    const plusOne = extractOpenWeatherRainfall(forecastItems[1]) ?? currentRainfall;
    const plusTwo = extractOpenWeatherRainfall(forecastItems[2]) ?? plusOne;

    return {
      currentRainfall: roundRain(currentRainfall),
      hourlyForecast: [roundRain(plusOne), roundRain(plusTwo)],
      source: "openweathermap-live",
      isStale: false
    };
  }

  private async fetchOpenMeteo(zone: ZoneStatic): Promise<WeatherBundle> {
    const response = await axios.get("https://api.open-meteo.com/v1/forecast", {
      params: {
        latitude: zone.centroidLat,
        longitude: zone.centroidLon,
        current: "precipitation",
        hourly: "precipitation",
        forecast_hours: 3,
        timezone: "auto"
      },
      timeout: 10000
    });

    const currentRainfall = Number(response.data.current?.precipitation ?? 0);
    const hourly = response.data.hourly?.precipitation ?? [];
    const plusOne = Number(hourly[1] ?? currentRainfall);
    const plusTwo = Number(hourly[2] ?? plusOne);

    return {
      currentRainfall: roundRain(currentRainfall),
      hourlyForecast: [roundRain(plusOne), roundRain(plusTwo)],
      source: "open-meteo-live",
      isStale: false
    };
  }

  private buildDeterministicFallback(zone: ZoneStatic): WeatherBundle {
    const hour = new Date().getHours();
    const baseline = zone.riskPriority * 3;
    const pulse = hour >= 12 && hour <= 18 ? 6 : 2;
    const currentRainfall = Number((baseline + pulse).toFixed(1));
    const plusOne = Number((currentRainfall + zone.riskPriority * 0.8).toFixed(1));
    const plusTwo = Number((plusOne + zone.riskPriority * 0.5).toFixed(1));

    return {
      currentRainfall,
      hourlyForecast: [plusOne, plusTwo],
      source: "simulated-fallback",
      isStale: true
    };
  }
}

function normalizeProvider(value: string) {
  if (value === "openweather" || value === "openweathermap") {
    return "openweathermap";
  }

  if (value === "open-meteo" || value === "openmeteo") {
    return "open-meteo";
  }

  return "open-meteo";
}

function extractOpenWeatherRainfall(payload: any) {
  if (!payload) {
    return null;
  }

  const directRain =
    payload.rain?.["1h"] ??
    payload.rain?.["3h"] ??
    payload.snow?.["1h"] ??
    payload.snow?.["3h"];

  if (typeof directRain === "number") {
    return directRain;
  }

  const pop = typeof payload.pop === "number" ? payload.pop : 0;
  const cloudPct = typeof payload.clouds?.all === "number" ? payload.clouds.all : 0;
  const humidity = typeof payload.main?.humidity === "number" ? payload.main.humidity : 0;

  if (pop > 0.6 && cloudPct > 70) {
    return Math.max(0.2, Number((pop * 3).toFixed(1)));
  }

  if (humidity > 92 && cloudPct > 85) {
    return 0.2;
  }

  return null;
}

function roundRain(value: number) {
  return Number(value.toFixed(1));
}
