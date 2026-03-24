import { ApiGatewayClient } from "./clients/api-gateway";
import { MlClient } from "./clients/ml-client";
import { WeatherClient } from "./clients/weather-client";
import { env } from "./config/env";
import { RoadConditionPollingRunner } from "./services/road-condition-polling-runner";
import { RiskCycleRunner } from "./services/risk-cycle-runner";

const apiGatewayClient = new ApiGatewayClient();
const mlClient = new MlClient();
const weatherClient = new WeatherClient();
const runner = new RiskCycleRunner(apiGatewayClient, weatherClient, mlClient);
const roadRunner = new RoadConditionPollingRunner(apiGatewayClient);

const runCycle = async () => {
  try {
    const cycles = await runner.run();
    console.log(
      `[worker] synced ${cycles.length} zone cycles at ${new Date().toISOString()}`
    );
  } catch (error) {
    console.error("[worker] cycle failed", error);
  }
};

void runCycle();

setInterval(() => {
  void runCycle();
}, env.pollIntervalMinutes * 60 * 1000);

const runRoadPolling = async () => {
  try {
    const polls = await roadRunner.run();
    console.log(
      `[worker] synced ${polls.length} elevated-zone road snapshots at ${new Date().toISOString()}`
    );
  } catch (error) {
    console.error("[worker] road condition poll failed", error);
  }
};

void runRoadPolling();

setInterval(() => {
  void runRoadPolling();
}, env.roadConditionPollIntervalMinutes * 60 * 1000);
