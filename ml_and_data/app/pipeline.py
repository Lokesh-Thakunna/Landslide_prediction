from __future__ import annotations

import json
from datetime import timedelta, timezone

from .config import ACTIVE_ZONES_PATH, ZONE_FEATURES_PATH
from .feature_engineering import (
    FeatureVector,
    compute_ground_movement_proxy,
    compute_soil_moisture_proxy,
)
from .model import RiskModelService


def load_zone_features() -> dict[str, dict]:
    items = json.loads(ZONE_FEATURES_PATH.read_text(encoding="utf-8"))
    return {item["zone_id"]: item for item in items}


def load_active_inputs() -> list[dict]:
    return json.loads(ACTIVE_ZONES_PATH.read_text(encoding="utf-8"))


def build_feature_vector(
    zone: dict,
    rainfall_mm_hr: float,
    rainfall_6h_avg_mm_hr: float,
    rainfall_24h_total_mm: float,
) -> FeatureVector:
    soil_moisture_proxy_pct = compute_soil_moisture_proxy(
        rainfall_mm_hr=rainfall_mm_hr,
        rainfall_6h_avg_mm_hr=rainfall_6h_avg_mm_hr,
        rainfall_24h_total_mm=rainfall_24h_total_mm,
    )
    ground_movement_proxy_pct = compute_ground_movement_proxy(
        slope_degrees=zone["slope_degrees"],
        soil_moisture_proxy_pct=soil_moisture_proxy_pct,
        historical_landslide_frequency=zone["historical_landslide_frequency"],
    )
    return FeatureVector(
        rainfall_mm_hr=rainfall_mm_hr,
        slope_degrees=zone["slope_degrees"],
        soil_moisture_proxy_pct=soil_moisture_proxy_pct,
        historical_landslide_frequency=zone["historical_landslide_frequency"],
        ground_movement_proxy_pct=ground_movement_proxy_pct,
    )


def generate_zone_snapshots(model_service: RiskModelService) -> list[dict]:
    zone_features = load_zone_features()
    rainfall_inputs = load_active_inputs()
    snapshots: list[dict] = []

    for rainfall in rainfall_inputs:
        zone = zone_features[rainfall["zone_id"]]
        current_features = build_feature_vector(
            zone=zone,
            rainfall_mm_hr=rainfall["rainfall_mm_hr"],
            rainfall_6h_avg_mm_hr=rainfall["rainfall_6h_avg_mm_hr"],
            rainfall_24h_total_mm=rainfall["rainfall_24h_total_mm"],
        )
        current_prediction = model_service.predict(
            zone_id=rainfall["zone_id"],
            horizon_hours=0,
            features=current_features,
        )

        forecast_predictions = []
        for horizon in (1, 2):
            forecast_rain = rainfall["forecast_rainfall_mm_hr"][str(horizon)]
            forecast_features = build_feature_vector(
                zone=zone,
                rainfall_mm_hr=forecast_rain,
                rainfall_6h_avg_mm_hr=(rainfall["rainfall_6h_avg_mm_hr"] + forecast_rain) / 2.0,
                rainfall_24h_total_mm=rainfall["rainfall_24h_total_mm"] + forecast_rain,
            )
            prediction = model_service.predict(
                zone_id=rainfall["zone_id"],
                horizon_hours=horizon,
                features=forecast_features,
            )
            forecast_predictions.append(
                {
                    **prediction.model_dump(),
                    "forecast_for": (
                        prediction.predicted_at + timedelta(hours=horizon)
                    ).astimezone(timezone.utc).isoformat(),
                }
            )

        snapshots.append(
            {
                "zone_id": rainfall["zone_id"],
                "zone_name": zone["zone_name"],
                "district_id": zone["district_id"],
                "current": current_prediction.model_dump(),
                "forecast": forecast_predictions,
                "soil_moisture_proxy_pct": current_features.soil_moisture_proxy_pct,
                "ground_movement_proxy_pct": current_features.ground_movement_proxy_pct,
                "top_features": current_prediction.top_features,
            }
        )

    return snapshots
