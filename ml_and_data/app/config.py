from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "data"
MODEL_DIR = ROOT_DIR / "models"
OUTPUT_DIR = ROOT_DIR / "outputs"

MODEL_PATH = MODEL_DIR / "rf_v1.joblib"
MODEL_META_PATH = MODEL_DIR / "rf_v1_meta.json"
ZONE_FEATURES_PATH = DATA_DIR / "zone_features.json"
ACTIVE_ZONES_PATH = DATA_DIR / "active_zone_inputs.json"
FRONTEND_CONTEXT_PATH = DATA_DIR / "frontend_context.json"
TRAINING_DATA_PATH = DATA_DIR / "synthetic_training.csv"
PREPARED_TRAINING_DATA_PATH = DATA_DIR / "prepared_training.csv"
PREDICTIONS_PATH = OUTPUT_DIR / "prediction_snapshots.json"

RISK_BANDS = {
    "SAFE": (0, 29),
    "WATCH": (30, 69),
    "DANGER": (70, 100),
}
