from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


RiskLevel = Literal["SAFE", "WATCH", "DANGER"]


class PredictRequest(BaseModel):
    zone_id: str
    horizon_hours: int = Field(ge=0, le=2)
    rainfall_mm_hr: float = Field(ge=0)
    slope_degrees: float = Field(ge=0, le=90)
    soil_moisture_proxy_pct: float = Field(ge=0, le=100)
    historical_landslide_frequency: float = Field(ge=0)


class PredictResponse(BaseModel):
    zone_id: str
    horizon_hours: int
    risk_score: int
    risk_level: RiskLevel
    top_features: list[str]
    predicted_at: datetime


class HealthResponse(BaseModel):
    status: str
    model_name: str
    feature_schema_version: str
    last_inference_at: datetime | None


class ZoneFeatureInput(BaseModel):
    zone_id: str
    district_id: str
    zone_name: str
    slope_degrees: float
    historical_landslide_frequency: float


class RainfallInput(BaseModel):
    zone_id: str
    rainfall_mm_hr: float
    rainfall_6h_avg_mm_hr: float
    rainfall_24h_total_mm: float
    forecast_rainfall_mm_hr: dict[int, float]
    source: str
    observed_at: datetime


class ZoneSnapshot(BaseModel):
    zone_id: str
    zone_name: str
    district_id: str
    current: PredictResponse
    forecast: list[PredictResponse]
    soil_moisture_proxy_pct: float
    ground_movement_proxy_pct: float
    top_features: list[str]
