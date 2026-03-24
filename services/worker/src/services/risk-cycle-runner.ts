import {
  Hotspot,
  InternalRiskCycle,
  MlPredictionRequest,
  ZoneStatic
} from "@bhurakshan/contracts";
import { ApiGatewayClient } from "../clients/api-gateway";
import { MlClient } from "../clients/ml-client";
import { WeatherClient } from "../clients/weather-client";
import {
  calculateGroundMovementProxy,
  calculateSoilMoistureProxy
} from "../utils/risk";

export class RiskCycleRunner {
  constructor(
    private readonly apiGatewayClient: ApiGatewayClient,
    private readonly weatherClient: WeatherClient,
    private readonly mlClient: MlClient
  ) {}

  public async run() {
    const zones = await this.apiGatewayClient.getActiveZones();
    const cycles: InternalRiskCycle[] = [];

    for (const zone of zones) {
      const cycle = await this.runZone(zone);
      cycles.push(cycle);
    }

    if (cycles.length > 0) {
      await this.apiGatewayClient.syncRiskCycles({ cycles });
    }

    return cycles;
  }

  private async runZone(zone: ZoneStatic): Promise<InternalRiskCycle> {
    const weather = await this.weatherClient.fetchForZone(zone);
    const currentSoilProxy = calculateSoilMoistureProxy(
      weather.currentRainfall,
      weather.hourlyForecast[0],
      weather.hourlyForecast[1]
    );

    const currentGroundProxy = calculateGroundMovementProxy(
      zone.slopeDegrees,
      currentSoilProxy,
      zone.historicalLandslideFrequency
    );

    const currentRequest: MlPredictionRequest = {
      zoneId: zone.id,
      horizonHours: 0,
      rainfallMmHr: weather.currentRainfall,
      slopeDegrees: zone.slopeDegrees,
      soilMoistureProxyPct: currentSoilProxy,
      historicalLandslideFrequency: zone.historicalLandslideFrequency
    };

    const plusOneSoilProxy = calculateSoilMoistureProxy(
      weather.hourlyForecast[0],
      weather.hourlyForecast[0],
      weather.hourlyForecast[1]
    );

    const plusTwoSoilProxy = calculateSoilMoistureProxy(
      weather.hourlyForecast[1],
      weather.hourlyForecast[0],
      weather.hourlyForecast[1]
    );

    const currentPrediction = await this.mlClient.predict(
      currentRequest,
      currentGroundProxy
    );

    const plusOnePrediction = await this.mlClient.predict(
      {
        zoneId: zone.id,
        horizonHours: 1,
        rainfallMmHr: weather.hourlyForecast[0],
        slopeDegrees: zone.slopeDegrees,
        soilMoistureProxyPct: plusOneSoilProxy,
        historicalLandslideFrequency: zone.historicalLandslideFrequency
      },
      calculateGroundMovementProxy(
        zone.slopeDegrees,
        plusOneSoilProxy,
        zone.historicalLandslideFrequency
      )
    );

    const plusTwoPrediction = await this.mlClient.predict(
      {
        zoneId: zone.id,
        horizonHours: 2,
        rainfallMmHr: weather.hourlyForecast[1],
        slopeDegrees: zone.slopeDegrees,
        soilMoistureProxyPct: plusTwoSoilProxy,
        historicalLandslideFrequency: zone.historicalLandslideFrequency
      },
      calculateGroundMovementProxy(
        zone.slopeDegrees,
        plusTwoSoilProxy,
        zone.historicalLandslideFrequency
      )
    );

    const hotspot = this.buildHotspot(
      zone,
      currentPrediction.riskScore,
      currentPrediction.riskLevel,
      plusOnePrediction.riskScore,
      plusOnePrediction.riskLevel
    );

    return {
      zone,
      weather: {
        zoneId: zone.id,
        rainfallMmHr: weather.currentRainfall,
        observedAt: new Date().toISOString(),
        source: weather.source,
        isStale: weather.isStale
      },
      current: {
        zoneId: zone.id,
        riskScore: currentPrediction.riskScore,
        riskLevel: currentPrediction.riskLevel,
        predictedAt: currentPrediction.predictedAt,
        soilMoistureProxyPct: currentSoilProxy,
        groundMovementProxyPct: currentGroundProxy,
        topFeatures: currentPrediction.topFeatures
      },
      forecast: [
        {
          zoneId: zone.id,
          horizonHours: 1,
          forecastFor: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          riskScore: plusOnePrediction.riskScore,
          riskLevel: plusOnePrediction.riskLevel,
          soilMoistureProxyPct: plusOneSoilProxy
        },
        {
          zoneId: zone.id,
          horizonHours: 2,
          forecastFor: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          riskScore: plusTwoPrediction.riskScore,
          riskLevel: plusTwoPrediction.riskLevel,
          soilMoistureProxyPct: plusTwoSoilProxy
        }
      ],
      hotspot
    };
  }

  private buildHotspot(
    zone: ZoneStatic,
    currentScore: number,
    currentLevel: Hotspot["riskLevel"],
    plusOneScore: number,
    nextHorizonLevel: Hotspot["nextHorizonLevel"]
  ): Hotspot {
    return {
      zoneId: zone.id,
      zoneName: zone.name,
      districtName: zone.districtName,
      riskScore: currentScore,
      riskLevel: currentLevel,
      trend:
        plusOneScore > currentScore ? "rising" : plusOneScore < currentScore ? "falling" : "steady",
      nextHorizonLevel
    };
  }
}

