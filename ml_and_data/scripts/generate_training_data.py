from __future__ import annotations

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.config import TRAINING_DATA_PATH
from app.simple_forest import generate_synthetic_training_data


def main() -> None:
    generate_synthetic_training_data(TRAINING_DATA_PATH)
    print(f"Wrote training data to {TRAINING_DATA_PATH}")


if __name__ == "__main__":
    main()
