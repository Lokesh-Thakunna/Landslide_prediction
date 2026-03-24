from __future__ import annotations

import csv
import pickle
import random
from dataclasses import dataclass
from pathlib import Path


@dataclass
class TreeNode:
    feature_index: int | None = None
    threshold: float | None = None
    left: "TreeNode | None" = None
    right: "TreeNode | None" = None
    value: float | None = None

    @property
    def is_leaf(self) -> bool:
        return self.value is not None


class SimpleDecisionTreeRegressor:
    def __init__(self, max_depth: int = 6, min_samples_leaf: int = 3, max_features: int | None = None) -> None:
        self.max_depth = max_depth
        self.min_samples_leaf = min_samples_leaf
        self.max_features = max_features
        self.root: TreeNode | None = None
        self.feature_importances_: list[float] = []

    def fit(self, rows: list[list[float]], targets: list[float], feature_count: int, rng: random.Random) -> None:
        self.feature_importances_ = [0.0] * feature_count
        self.root = self._build(rows, targets, depth=0, feature_count=feature_count, rng=rng)

    def _build(
        self,
        rows: list[list[float]],
        targets: list[float],
        depth: int,
        feature_count: int,
        rng: random.Random,
    ) -> TreeNode:
        if depth >= self.max_depth or len(rows) <= self.min_samples_leaf * 2:
            return TreeNode(value=sum(targets) / len(targets))

        baseline_mse = _mse(targets)
        if baseline_mse == 0:
            return TreeNode(value=targets[0])

        candidate_features = list(range(feature_count))
        rng.shuffle(candidate_features)
        if self.max_features is not None:
            candidate_features = candidate_features[: self.max_features]

        best: tuple[float, int, float, list[list[float]], list[float], list[list[float]], list[float]] | None = None

        for feature_index in candidate_features:
            values = sorted({row[feature_index] for row in rows})
            if len(values) < 2:
                continue

            thresholds = [(values[idx] + values[idx + 1]) / 2.0 for idx in range(len(values) - 1)]
            for threshold in thresholds:
                left_rows: list[list[float]] = []
                left_targets: list[float] = []
                right_rows: list[list[float]] = []
                right_targets: list[float] = []

                for row, target in zip(rows, targets):
                    if row[feature_index] <= threshold:
                        left_rows.append(row)
                        left_targets.append(target)
                    else:
                        right_rows.append(row)
                        right_targets.append(target)

                if len(left_rows) < self.min_samples_leaf or len(right_rows) < self.min_samples_leaf:
                    continue

                split_error = (
                    (_mse(left_targets) * len(left_targets)) + (_mse(right_targets) * len(right_targets))
                ) / len(targets)

                if best is None or split_error < best[0]:
                    best = (
                        split_error,
                        feature_index,
                        threshold,
                        left_rows,
                        left_targets,
                        right_rows,
                        right_targets,
                    )

        if best is None:
            return TreeNode(value=sum(targets) / len(targets))

        gain = max(0.0, baseline_mse - best[0])
        self.feature_importances_[best[1]] += gain
        left = self._build(best[3], best[4], depth + 1, feature_count, rng)
        right = self._build(best[5], best[6], depth + 1, feature_count, rng)
        return TreeNode(feature_index=best[1], threshold=best[2], left=left, right=right)

    def predict_one(self, row: list[float]) -> float:
        if self.root is None:
            raise RuntimeError("Tree is not trained")

        node = self.root
        while not node.is_leaf:
            assert node.feature_index is not None
            assert node.threshold is not None
            assert node.left is not None
            assert node.right is not None
            node = node.left if row[node.feature_index] <= node.threshold else node.right
        assert node.value is not None
        return node.value


class SimpleRandomForestRegressor:
    def __init__(
        self,
        n_trees: int = 25,
        max_depth: int = 6,
        min_samples_leaf: int = 3,
        max_features: int = 3,
        seed: int = 42,
    ) -> None:
        self.n_trees = n_trees
        self.max_depth = max_depth
        self.min_samples_leaf = min_samples_leaf
        self.max_features = max_features
        self.seed = seed
        self.trees: list[SimpleDecisionTreeRegressor] = []
        self.feature_importances_: list[float] = []

    def fit(self, rows: list[list[float]], targets: list[float]) -> None:
        feature_count = len(rows[0])
        rng = random.Random(self.seed)
        importances = [0.0] * feature_count
        self.trees = []

        for index in range(self.n_trees):
            bootstrap_rows, bootstrap_targets = _bootstrap_sample(rows, targets, rng)
            tree = SimpleDecisionTreeRegressor(
                max_depth=self.max_depth,
                min_samples_leaf=self.min_samples_leaf,
                max_features=self.max_features,
            )
            tree.fit(bootstrap_rows, bootstrap_targets, feature_count, random.Random(rng.randint(0, 10_000_000) + index))
            self.trees.append(tree)
            for feature_index, importance in enumerate(tree.feature_importances_):
                importances[feature_index] += importance

        total = sum(importances) or 1.0
        self.feature_importances_ = [importance / total for importance in importances]

    def predict(self, rows: list[list[float]]) -> list[float]:
        predictions = []
        for row in rows:
            tree_predictions = [tree.predict_one(row) for tree in self.trees]
            predictions.append(sum(tree_predictions) / len(tree_predictions))
        return predictions

    def save(self, path: Path) -> None:
        path.write_bytes(pickle.dumps(self))

    @staticmethod
    def load(path: Path) -> "SimpleRandomForestRegressor":
        return pickle.loads(path.read_bytes())


def generate_synthetic_training_data(output_path: Path, row_count: int = 1200, seed: int = 42) -> None:
    from .feature_engineering import (
        compute_fallback_score,
        compute_ground_movement_proxy,
        compute_soil_moisture_proxy,
    )

    rng = random.Random(seed)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "rainfall_mm_hr",
                "slope_degrees",
                "soil_moisture_proxy_pct",
                "historical_landslide_frequency",
                "ground_movement_proxy_pct",
                "risk_score",
            ],
        )
        writer.writeheader()

        for _ in range(row_count):
            rainfall_mm_hr = round(rng.uniform(0, 50), 1)
            rainfall_6h_avg_mm_hr = round(rng.uniform(0, 40), 1)
            rainfall_24h_total_mm = round(rng.uniform(0, 250), 1)
            slope_degrees = round(rng.uniform(10, 45), 1)
            historical_landslide_frequency = round(rng.uniform(0, 8), 1)

            soil_moisture_proxy_pct = compute_soil_moisture_proxy(
                rainfall_mm_hr=rainfall_mm_hr,
                rainfall_6h_avg_mm_hr=rainfall_6h_avg_mm_hr,
                rainfall_24h_total_mm=rainfall_24h_total_mm,
            )
            ground_movement_proxy_pct = compute_ground_movement_proxy(
                slope_degrees=slope_degrees,
                soil_moisture_proxy_pct=soil_moisture_proxy_pct,
                historical_landslide_frequency=historical_landslide_frequency,
            )
            baseline_score = compute_fallback_score(
                rainfall_mm_hr=rainfall_mm_hr,
                slope_degrees=slope_degrees,
                soil_moisture_proxy_pct=soil_moisture_proxy_pct,
                historical_landslide_frequency=historical_landslide_frequency,
            )
            risk_score = max(0, min(100, baseline_score + rng.randint(-8, 8)))
            writer.writerow(
                {
                    "rainfall_mm_hr": rainfall_mm_hr,
                    "slope_degrees": slope_degrees,
                    "soil_moisture_proxy_pct": soil_moisture_proxy_pct,
                    "historical_landslide_frequency": historical_landslide_frequency,
                    "ground_movement_proxy_pct": ground_movement_proxy_pct,
                    "risk_score": risk_score,
                }
            )


def load_training_csv(path: Path, feature_names: list[str]) -> tuple[list[list[float]], list[float]]:
    rows: list[list[float]] = []
    targets: list[float] = []
    with path.open("r", newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for item in reader:
            rows.append([float(item[name]) for name in feature_names])
            targets.append(float(item["risk_score"]))
    return rows, targets


def train_test_split(
    rows: list[list[float]],
    targets: list[float],
    test_ratio: float = 0.2,
    seed: int = 42,
) -> tuple[list[list[float]], list[list[float]], list[float], list[float]]:
    indices = list(range(len(rows)))
    rng = random.Random(seed)
    rng.shuffle(indices)
    test_size = int(len(indices) * test_ratio)
    test_indices = set(indices[:test_size])

    x_train, x_test, y_train, y_test = [], [], [], []
    for idx, row in enumerate(rows):
        if idx in test_indices:
            x_test.append(row)
            y_test.append(targets[idx])
        else:
            x_train.append(row)
            y_train.append(targets[idx])
    return x_train, x_test, y_train, y_test


def mean_absolute_error(y_true: list[float], y_pred: list[float]) -> float:
    return sum(abs(a - b) for a, b in zip(y_true, y_pred)) / max(1, len(y_true))


def r2_score(y_true: list[float], y_pred: list[float]) -> float:
    mean_y = sum(y_true) / max(1, len(y_true))
    ss_total = sum((value - mean_y) ** 2 for value in y_true)
    ss_res = sum((a - b) ** 2 for a, b in zip(y_true, y_pred))
    if ss_total == 0:
        return 1.0
    return 1 - (ss_res / ss_total)


def _mse(values: list[float]) -> float:
    if not values:
        return 0.0
    mean_value = sum(values) / len(values)
    return sum((value - mean_value) ** 2 for value in values) / len(values)


def _bootstrap_sample(
    rows: list[list[float]],
    targets: list[float],
    rng: random.Random,
) -> tuple[list[list[float]], list[float]]:
    sampled_rows: list[list[float]] = []
    sampled_targets: list[float] = []
    for _ in range(len(rows)):
        index = rng.randrange(len(rows))
        sampled_rows.append(rows[index])
        sampled_targets.append(targets[index])
    return sampled_rows, sampled_targets
