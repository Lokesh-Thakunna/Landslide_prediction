from __future__ import annotations

from dataclasses import dataclass


def clamp(minimum: float, maximum: float, value: float) -> float:
    return max(minimum, min(maximum, value))


def score_to_risk_level(score: int) -> str:
    if score >= 70:
        return "DANGER"
    if score >= 30:
        return "WATCH"
    return "SAFE"


def normalize_rainfall_pct(rainfall_mm_hr: float) -> float:
    return clamp(0, 100, (rainfall_mm_hr / 50.0) * 100.0)


def normalize_historical_frequency_pct(historical_landslide_frequency: float) -> float:
    return clamp(0, 100, (historical_landslide_frequency / 8.0) * 100.0)


def compute_soil_moisture_proxy(
    rainfall_mm_hr: float,
    rainfall_6h_avg_mm_hr: float,
    rainfall_24h_total_mm: float,
) -> float:
    return round(
        clamp(
            0,
            100,
            (0.45 * rainfall_mm_hr)
            + (0.35 * rainfall_6h_avg_mm_hr)
            + (0.20 * (rainfall_24h_total_mm / 4.0)),
        ),
        1,
    )


def compute_ground_movement_proxy(
    slope_degrees: float,
    soil_moisture_proxy_pct: float,
    historical_landslide_frequency: float,
) -> float:
    normalized_slope_pct = min(100, (slope_degrees / 45.0) * 100.0)
    historical_pct = normalize_historical_frequency_pct(historical_landslide_frequency)
    return round(
        clamp(
            0,
            100,
            (0.50 * normalized_slope_pct)
            + (0.30 * soil_moisture_proxy_pct)
            + (0.20 * historical_pct),
        ),
        1,
    )


def compute_fallback_score(
    rainfall_mm_hr: float,
    slope_degrees: float,
    soil_moisture_proxy_pct: float,
    historical_landslide_frequency: float,
) -> int:
    normalized_rainfall_pct = normalize_rainfall_pct(rainfall_mm_hr)
    normalized_slope_pct = min(100, (slope_degrees / 45.0) * 100.0)
    historical_pct = normalize_historical_frequency_pct(historical_landslide_frequency)
    score = min(
        100,
        (0.40 * normalized_rainfall_pct)
        + (0.30 * normalized_slope_pct)
        + (0.20 * soil_moisture_proxy_pct)
        + (0.10 * historical_pct),
    )
    return int(round(score))


@dataclass(frozen=True)
class FeatureVector:
    rainfall_mm_hr: float
    slope_degrees: float
    soil_moisture_proxy_pct: float
    historical_landslide_frequency: float
    ground_movement_proxy_pct: float

    def as_model_row(self) -> list[float]:
        return [
            self.rainfall_mm_hr,
            self.slope_degrees,
            self.soil_moisture_proxy_pct,
            self.historical_landslide_frequency,
            self.ground_movement_proxy_pct,
        ]
