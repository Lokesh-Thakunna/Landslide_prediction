from __future__ import annotations

from contextlib import asynccontextmanager
from fastapi import FastAPI

from .feature_engineering import FeatureVector, compute_ground_movement_proxy
from .model import ModelNotTrainedError, RiskModelService
from .schemas import HealthResponse, PredictRequest, PredictResponse

model_service = RiskModelService()


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        model_service.load()
    except ModelNotTrainedError:
        pass
    yield


app = FastAPI(title="BHURAKSHAN ML Service", version="0.1.0", lifespan=lifespan)


@app.get("/ml/health", response_model=HealthResponse)
def ml_health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        model_name=model_service.model_name,
        feature_schema_version=model_service.feature_schema_version,
        last_inference_at=model_service.last_inference_at,
    )


@app.post("/ml/predict", response_model=PredictResponse)
def ml_predict(payload: PredictRequest) -> PredictResponse:
    ground_movement_proxy_pct = compute_ground_movement_proxy(
        slope_degrees=payload.slope_degrees,
        soil_moisture_proxy_pct=payload.soil_moisture_proxy_pct,
        historical_landslide_frequency=payload.historical_landslide_frequency,
    )
    features = FeatureVector(
        rainfall_mm_hr=payload.rainfall_mm_hr,
        slope_degrees=payload.slope_degrees,
        soil_moisture_proxy_pct=payload.soil_moisture_proxy_pct,
        historical_landslide_frequency=payload.historical_landslide_frequency,
        ground_movement_proxy_pct=ground_movement_proxy_pct,
    )
    return model_service.predict(
        zone_id=payload.zone_id,
        horizon_hours=payload.horizon_hours,
        features=features,
    )
