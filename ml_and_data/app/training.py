from __future__ import annotations

import csv
import json
from pathlib import Path
import random

from .config import MODEL_DIR, MODEL_META_PATH, MODEL_PATH, PREPARED_TRAINING_DATA_PATH, TRAINING_DATA_PATH
from .feature_engineering import (
    clamp,
    compute_ground_movement_proxy,
    normalize_historical_frequency_pct,
    normalize_rainfall_pct,
)
from .simple_forest import (
    SimpleRandomForestRegressor,
    generate_synthetic_training_data,
    load_training_csv,
    mean_absolute_error,
    r2_score,
    train_test_split,
)

FEATURE_NAMES = [
    "rainfall_mm_hr",
    "slope_degrees",
    "soil_moisture_proxy_pct",
    "historical_landslide_frequency",
    "ground_movement_proxy_pct",
]

REAL_DATASET_CANDIDATES = [
    Path.home() / "OneDrive" / "Desktop" / "landslide_dataset" / "landslide_dataset.csv",
    Path.home() / "Desktop" / "landslide_dataset" / "landslide_dataset.csv",
]
REAL_DATASET_COLUMNS = {"lat", "lon", "elevation", "slope", "rainfall", "soil", "risk"}
MAX_REAL_DATASET_ROWS = 2500


def train_model(dataset_path: Path | None = None) -> dict[str, object]:
    rows: list[list[float]]
    targets: list[float]
    dataset_source: str
    positive_ratio = 0.0

    resolved_dataset = resolve_real_dataset_path(dataset_path)

    if resolved_dataset is not None:
        rows, targets, positive_ratio = build_training_rows_from_real_dataset(resolved_dataset)
        dataset_source = str(resolved_dataset)
    else:
        if not TRAINING_DATA_PATH.exists():
            generate_synthetic_training_data(TRAINING_DATA_PATH)

        rows, targets = load_training_csv(TRAINING_DATA_PATH, FEATURE_NAMES)
        dataset_source = str(TRAINING_DATA_PATH)

    x_train, x_test, y_train, y_test = train_test_split(rows, targets)

    model = SimpleRandomForestRegressor(
        n_trees=18 if resolved_dataset is not None else 25,
        max_depth=5 if resolved_dataset is not None else 6,
        min_samples_leaf=6 if resolved_dataset is not None else 4,
        max_features=3,
        seed=42,
    )
    model.fit(x_train, y_train)
    predictions = model.predict(x_test)

    metrics = {
        "mae": round(mean_absolute_error(y_test, predictions), 4),
        "r2": round(r2_score(y_test, predictions), 4),
        "rows": float(len(rows)),
        "positive_ratio": round(positive_ratio, 4),
        "dataset_source": dataset_source,
    }

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model.save(MODEL_PATH)
    MODEL_META_PATH.write_text(
        json.dumps(
            {
                "model_name": "rf_v1",
                "feature_schema_version": "v1",
                "feature_names": FEATURE_NAMES,
                "metrics": metrics,
                "implementation": "custom_python_random_forest",
                "dataset_source": dataset_source,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    return metrics


def resolve_real_dataset_path(dataset_path: Path | None) -> Path | None:
    if dataset_path and dataset_path.exists():
        return dataset_path

    for candidate in REAL_DATASET_CANDIDATES:
        if candidate.exists():
            return candidate

    return None


def build_training_rows_from_real_dataset(
    dataset_path: Path,
) -> tuple[list[list[float]], list[float], float]:
    rows: list[list[float]] = []
    targets: list[float] = []
    positive_count = 0

    PREPARED_TRAINING_DATA_PATH.parent.mkdir(parents=True, exist_ok=True)

    with dataset_path.open("r", newline="", encoding="utf-8") as raw_handle:
        reader = csv.DictReader(raw_handle)
        if not reader.fieldnames or not REAL_DATASET_COLUMNS.issubset(set(reader.fieldnames)):
            raise ValueError(
                f"Dataset {dataset_path} must contain columns: {', '.join(sorted(REAL_DATASET_COLUMNS))}"
            )

        prepared_rows: list[dict[str, float]] = []

        for item in reader:
            rainfall_mm_hr = float(item["rainfall"])
            slope_degrees = float(item["slope"])
            elevation_m = float(item["elevation"])
            soil_raw = float(item["soil"])
            lat = float(item["lat"])
            lon = float(item["lon"])
            risk_label = 1 if float(item["risk"]) >= 0.5 else 0

            soil_moisture_proxy_pct = round(
                clamp(0, 100, soil_raw * 100.0 if soil_raw <= 1.5 else soil_raw), 2
            )
            historical_landslide_frequency = derive_historical_frequency(
                rainfall_mm_hr=rainfall_mm_hr,
                slope_degrees=slope_degrees,
                elevation_m=elevation_m,
                lat=lat,
                lon=lon,
            )
            ground_movement_proxy_pct = compute_ground_movement_proxy(
                slope_degrees=slope_degrees,
                soil_moisture_proxy_pct=soil_moisture_proxy_pct,
                historical_landslide_frequency=historical_landslide_frequency,
            )
            risk_score = derive_supervised_risk_score(
                risk_label=risk_label,
                rainfall_mm_hr=rainfall_mm_hr,
                slope_degrees=slope_degrees,
                soil_moisture_proxy_pct=soil_moisture_proxy_pct,
                historical_landslide_frequency=historical_landslide_frequency,
            )

            prepared = {
                "rainfall_mm_hr": round(rainfall_mm_hr, 3),
                "slope_degrees": round(slope_degrees, 3),
                "soil_moisture_proxy_pct": soil_moisture_proxy_pct,
                "historical_landslide_frequency": historical_landslide_frequency,
                "ground_movement_proxy_pct": ground_movement_proxy_pct,
                "risk_score": risk_score,
            }
            prepared_rows.append(prepared)
            rows.append([prepared[name] for name in FEATURE_NAMES])
            targets.append(prepared["risk_score"])
            positive_count += risk_label

    with PREPARED_TRAINING_DATA_PATH.open("w", newline="", encoding="utf-8") as prepared_handle:
        writer = csv.DictWriter(
            prepared_handle,
            fieldnames=[*FEATURE_NAMES, "risk_score"],
        )
        writer.writeheader()
        writer.writerows(prepared_rows)

    rows, targets = cap_real_dataset_rows(rows, targets, MAX_REAL_DATASET_ROWS)
    positive_ratio = sum(1 for target in targets if target >= 65) / max(1, len(targets))
    return rows, targets, positive_ratio


def cap_real_dataset_rows(
    rows: list[list[float]], targets: list[float], limit: int
) -> tuple[list[list[float]], list[float]]:
    if len(rows) <= limit:
        return rows, targets

    rng = random.Random(42)
    indexed = list(zip(rows, targets))
    positive = [item for item in indexed if item[1] >= 65]
    negative = [item for item in indexed if item[1] < 65]

    positive_target = min(len(positive), max(1, int(limit * 0.35)))
    negative_target = min(len(negative), max(1, limit - positive_target))

    sampled = rng.sample(positive, positive_target) + rng.sample(negative, negative_target)
    rng.shuffle(sampled)

    capped_rows = [item[0] for item in sampled]
    capped_targets = [item[1] for item in sampled]
    return capped_rows, capped_targets


def derive_historical_frequency(
    rainfall_mm_hr: float,
    slope_degrees: float,
    elevation_m: float,
    lat: float,
    lon: float,
) -> float:
    slope_pct = clamp(0, 100, (slope_degrees / 60.0) * 100.0)
    elevation_pct = clamp(0, 100, (elevation_m / 3500.0) * 100.0)
    rain_pct = clamp(0, 100, (rainfall_mm_hr / 200.0) * 100.0)
    terrain_pct = clamp(
        0,
        100,
        (0.45 * slope_pct)
        + (0.30 * elevation_pct)
        + (0.15 * rain_pct)
        + (0.10 * (abs(lat - 30.0) * 25.0 + abs(lon - 78.5) * 15.0)),
    )
    return round((terrain_pct / 100.0) * 8.0, 3)


def derive_supervised_risk_score(
    risk_label: int,
    rainfall_mm_hr: float,
    slope_degrees: float,
    soil_moisture_proxy_pct: float,
    historical_landslide_frequency: float,
) -> float:
    slope_pct = clamp(0, 100, (slope_degrees / 60.0) * 100.0)
    historical_pct = normalize_historical_frequency_pct(historical_landslide_frequency)
    severity_pct = clamp(
        0,
        100,
        (0.40 * normalize_rainfall_pct(rainfall_mm_hr))
        + (0.25 * slope_pct)
        + (0.20 * soil_moisture_proxy_pct)
        + (0.15 * historical_pct),
    )

    if risk_label:
        score = 65.0 + (0.35 * severity_pct)
    else:
        score = 0.55 * severity_pct

    return round(clamp(0, 100, score), 3)
