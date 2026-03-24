import axios, { AxiosInstance } from "axios";
import {
  InternalRiskCycleBatchSchema,
  InternalRoadConditionBatch,
  InternalRoadConditionBatchSchema,
  ZoneRoadConditions,
  ZoneRoadConditionsSchema,
  ZoneStatic,
  ZoneStaticSchema
} from "@bhurakshan/contracts";
import { env } from "../config/env";

type ZoneRiskView = {
  zoneId: string;
  zoneName: string;
  districtId: string;
  districtName: string;
  riskScore: number;
  riskLevel: "SAFE" | "WATCH" | "DANGER";
  rainfallMmHr: number;
  soilMoistureProxyPct: number;
  groundMovementProxyPct: number;
  predictedAt?: string;
  isStale: boolean;
};

export class ApiGatewayClient {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: env.workerApiBaseUrl,
      timeout: 10000,
      headers: {
        "X-Internal-Api-Key": env.internalServiceApiKey
      }
    });
  }

  public async getActiveZones(): Promise<ZoneStatic[]> {
    const response = await this.client.get("/api/internal/zones/active");
    return ZoneStaticSchema.array().parse(response.data);
  }

  public async getZoneRiskView(): Promise<ZoneRiskView[]> {
    const response = await this.client.get("/api/internal/zones/risk-view");
    return response.data as ZoneRiskView[];
  }

  public async getZoneRoadConditions(zoneId: string): Promise<ZoneRoadConditions> {
    const response = await this.client.get(`/api/internal/zones/${zoneId}/road-conditions`);
    return ZoneRoadConditionsSchema.parse(response.data);
  }

  public async syncRiskCycles(payload: unknown) {
    const validated = InternalRiskCycleBatchSchema.parse(payload);
    await this.client.post("/api/internal/risk-cycles", validated);
  }

  public async syncRoadConditions(payload: InternalRoadConditionBatch) {
    const validated = InternalRoadConditionBatchSchema.parse(payload);
    await this.client.post("/api/internal/road-conditions/sync", validated);
  }
}
