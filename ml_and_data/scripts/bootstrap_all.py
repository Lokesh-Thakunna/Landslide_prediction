from __future__ import annotations

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.training import train_model
from scripts.export_frontend_data import main as export_frontend_data_main
from scripts.generate_predictions import main as generate_predictions_main
from scripts.generate_training_data import main as generate_training_data_main


def main() -> None:
    generate_training_data_main()
    metrics = train_model()
    print(f"Training metrics: {metrics}")
    generate_predictions_main()
    export_frontend_data_main()


if __name__ == "__main__":
    main()
