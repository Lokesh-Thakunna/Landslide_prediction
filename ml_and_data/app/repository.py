from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from .config import PREDICTIONS_PATH


def ensure_output_dir() -> None:
    PREDICTIONS_PATH.parent.mkdir(parents=True, exist_ok=True)


def write_prediction_snapshots(payload: list[dict]) -> Path:
    ensure_output_dir()
    serializable = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "snapshots": payload,
    }
    PREDICTIONS_PATH.write_text(
        json.dumps(
            serializable,
            indent=2,
            default=lambda value: value.isoformat() if hasattr(value, "isoformat") else str(value),
        ),
        encoding="utf-8",
    )
    return PREDICTIONS_PATH
