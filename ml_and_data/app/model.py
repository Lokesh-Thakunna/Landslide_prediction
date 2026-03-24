from __future__ import annotations

import json
from datetime import datetime, timezone

from .config import MODEL_META_PATH, MODEL_PATH
from .feature_engineering import FeatureVector, compute_fallback_score, score_to_risk_level
from .schemas import PredictResponse
from .simple_forest import SimpleRandomForestRegressor


class ModelNotTrainedError(RuntimeError):
    pass


class RiskModelService:
    def __init__(self) -> None:
        self.model = None
        self.feature_names: list[str] = []
        self.model_name = "rf_v1"
        self.feature_schema_version = "v1"
        self.last_inference_at: datetime | None = None

    def load(self) -> None:
        if not MODEL_PATH.exists() or not MODEL_META_PATH.exists():
            raise ModelNotTrainedError("Model artifacts are missing. Run the training script first.")

        self.model = SimpleRandomForestRegressor.load(MODEL_PATH)
        metadata = json.loads(MODEL_META_PATH.read_text(encoding="utf-8"))
        self.feature_names = metadata["feature_names"]
        self.model_name = metadata["model_name"]
        self.feature_schema_version = metadata["feature_schema_version"]

    def predict(
        self,
        zone_id: str,
        horizon_hours: int,
        features: FeatureVector,
    ) -> PredictResponse:
        now = datetime.now(timezone.utc)

        if self.model is None:
            score = compute_fallback_score(
                rainfall_mm_hr=features.rainfall_mm_hr,
                slope_degrees=features.slope_degrees,
                soil_moisture_proxy_pct=features.soil_moisture_proxy_pct,
                historical_landslide_frequency=features.historical_landslide_frequency,
            )
            top_features = [
                "rainfall_mm_hr",
                "soil_moisture_proxy_pct",
                "slope_degrees",
            ]
        else:
            score = int(round(float(self.model.predict([features.as_model_row()])[0])))
            score = max(0, min(100, score))
            importances = getattr(self.model, "feature_importances_", None)
            if importances is not None:
                ranked = sorted(
                    range(len(importances)),
                    key=lambda index: importances[index],
                    reverse=True,
                )[:3]
                top_features = [self.feature_names[index] for index in ranked]
            else:
                top_features = self.feature_names[:3]

        self.last_inference_at = now
        return PredictResponse(
            zone_id=zone_id,
            horizon_hours=horizon_hours,
            risk_score=score,
            risk_level=score_to_risk_level(score),
            top_features=top_features,
            predicted_at=now,
        )
