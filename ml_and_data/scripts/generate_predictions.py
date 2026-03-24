from __future__ import annotations

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.model import RiskModelService
from app.pipeline import generate_zone_snapshots
from app.repository import write_prediction_snapshots


def main() -> None:
    model_service = RiskModelService()
    model_service.load()
    snapshots = generate_zone_snapshots(model_service)
    path = write_prediction_snapshots(snapshots)
    print(f"Wrote prediction snapshots to {path}")


if __name__ == "__main__":
    main()
