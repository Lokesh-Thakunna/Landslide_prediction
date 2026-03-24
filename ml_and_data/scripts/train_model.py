from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.training import train_model


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the BHURAKSHAN ML model.")
    parser.add_argument(
        "--dataset",
        type=Path,
        help="Optional path to a real landslide CSV dataset."
    )
    args = parser.parse_args()

    metrics = train_model(dataset_path=args.dataset)
    print("Training complete")
    print(metrics)


if __name__ == "__main__":
    main()
