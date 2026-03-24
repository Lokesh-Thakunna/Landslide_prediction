# ML And Data Run Guide

## What I built

I created the Person 4 implementation inside the `ml_and_data/` folder as a runnable ML and data workspace for the documented BHURAKSHAN flow.

This implementation covers the main Person 4 responsibilities:

- static per-zone terrain and historical risk features
- rainfall-to-soil-moisture proxy generation
- terrain-and-history movement proxy generation
- Random Forest-style risk scoring
- internal `POST /ml/predict` endpoint
- `current`, `+1h`, and `+2h` prediction generation for active zones
- prediction snapshot persistence to output files
- model metadata and reusable artifacts for the rest of the team

Important implementation note:

Because this machine is using Python `3.14` and `scikit-learn` was not installable in this environment, I implemented a custom pure-Python Random Forest regressor so the ML workspace is actually runnable here. The external contract and flow still follow the project docs.

## Files I created

### Project setup

- `ml_and_data/requirements.txt`
  Python dependencies required to run the ML service and supporting scripts.

- `ml_and_data/README.md`
  Short workspace summary.

### Core package files

- `ml_and_data/app/__init__.py`
  Marks `app/` as a Python package.

- `ml_and_data/app/config.py`
  Centralized path configuration for data files, model files, and output files.

- `ml_and_data/app/schemas.py`
  Pydantic models for ML request and response contracts, health responses, and zone snapshots.

- `ml_and_data/app/feature_engineering.py`
  Core feature logic:
  - score-to-risk mapping
  - rainfall normalization
  - historical frequency normalization
  - soil moisture proxy formula
  - ground movement proxy formula
  - fallback score formula

- `ml_and_data/app/simple_forest.py`
  Custom pure-Python Random Forest implementation used for training and inference in this environment.

- `ml_and_data/app/model.py`
  Model loading and prediction service. Produces the `/ml/predict` output shape and top feature ranking.

- `ml_and_data/app/training.py`
  Training pipeline that reads the training CSV, trains the forest, evaluates it, and writes model artifacts.

- `ml_and_data/app/pipeline.py`
  Zone-level forecast generation pipeline that builds `current`, `+1h`, and `+2h` predictions from active rainfall inputs.

- `ml_and_data/app/repository.py`
  Writes prediction snapshot outputs to JSON for downstream inspection and handoff.

- `ml_and_data/app/main.py`
  FastAPI application exposing:
  - `GET /ml/health`
  - `POST /ml/predict`

### Data files

- `ml_and_data/data/zone_features.json`
  Static zone features including slope and historical landslide frequency baselines.

- `ml_and_data/data/active_zone_inputs.json`
  Sample active rainfall and short-horizon forecast inputs for current zone scoring.

### Scripts

- `ml_and_data/scripts/generate_training_data.py`
  Generates a synthetic training dataset based on the documented proxy and fallback logic.

- `ml_and_data/scripts/train_model.py`
  Trains the model and writes model artifacts.

- `ml_and_data/scripts/generate_predictions.py`
  Generates current and forecast predictions for the active sample zones and writes snapshot outputs.

- `ml_and_data/scripts/run_api.py`
  Starts the FastAPI ML service locally.

- `ml_and_data/scripts/bootstrap_all.py`
  Convenience script that runs data generation, model training, and prediction generation in one go.

## Generated artifacts

After running the scripts, these generated files are also created:

- `ml_and_data/data/synthetic_training.csv`
  Generated training dataset used by the model training step.

- `ml_and_data/models/rf_v1.joblib`
  Serialized model artifact for the custom Random Forest implementation.

- `ml_and_data/models/rf_v1_meta.json`
  Model metadata including feature schema version and training metrics.

- `ml_and_data/outputs/prediction_snapshots.json`
  Generated current plus forecast predictions for the sample active zones.

## What the implementation does

### Feature engineering

The ML/data workspace implements the documented formulas for:

- soil moisture proxy
- ground movement proxy
- fallback risk scoring

This means the rest of the team can already integrate with a stable feature pipeline while the backend and frontend work continues.

### Training flow

The training flow is:

1. Generate synthetic training data.
2. Train the Random Forest model.
3. Save the model artifact and metadata.
4. Use active zone rainfall data to generate `current`, `+1h`, and `+2h` predictions.
5. Persist those prediction snapshots to JSON.

### API contract

The FastAPI service exposes the internal ML contract described in the docs:

- `GET /ml/health`
- `POST /ml/predict`

The response includes:

- `zone_id`
- `horizon_hours`
- `risk_score`
- `risk_level`
- `top_features`
- `predicted_at`

## How to run

From the repo root:

```powershell
cd ml_and_data
python -m pip install -r requirements.txt
```

### Full bootstrap

To generate training data, train the model, and create prediction snapshots:

```powershell
python scripts\bootstrap_all.py
```

### Step-by-step run

Generate the training dataset:

```powershell
python scripts\generate_training_data.py
```

Train the model:

```powershell
python scripts\train_model.py
```

Generate current and forecast prediction snapshots:

```powershell
python scripts\generate_predictions.py
```

Run the ML API:

```powershell
python scripts\run_api.py
```

The API will run at:

```text
http://127.0.0.1:8001
```

Example endpoints:

- `http://127.0.0.1:8001/ml/health`
- `http://127.0.0.1:8001/docs`

## Example predict request

Example body for `POST /ml/predict`:

```json
{
  "zone_id": "joshimath-core",
  "horizon_hours": 1,
  "rainfall_mm_hr": 39.5,
  "slope_degrees": 38.5,
  "soil_moisture_proxy_pct": 74.1,
  "historical_landslide_frequency": 6.0
}
```

## Verification completed

I verified the implementation by successfully running:

- `python scripts\generate_training_data.py`
- `python scripts\train_model.py`
- `python scripts\generate_predictions.py`
- direct contract-level prediction call through the FastAPI app code
- direct health check call through the FastAPI app code

Training metrics from the run:

- `MAE`: about `4.44`
- `R2`: about `0.90`

## Handoff notes for Person 1, Person 2, and Person 3

### Handoff to Person 1

Person 1 should know this ML/data work already supports the dashboard needs for:

- `risk_score`
- `risk_level`
- `top_features`
- current and short-horizon forecast output
- soil moisture and ground movement proxy context

Important notes for Person 1:

- the dashboard can safely assume `risk_level` values remain `SAFE`, `WATCH`, and `DANGER`
- `top_features` is already available and ready for the zone detail drawer
- the generated snapshot structure is suitable for map, hotspot, and explanation views

### Handoff to Person 2

Person 2 should know the citizen app can consume the simplified version of this same output:

- current risk score
- current risk level
- `+1h` and `+2h` forecast values
- rainfall context derived from the same scoring flow

Important notes for Person 2:

- the citizen app should continue hiding model jargon even though the ML layer also exposes top features and proxy details
- forecast timing and risk-level naming should stay identical across citizen and dashboard experiences

### Handoff to Person 3

Person 3 should know this ML/data workspace is ready to be integrated into the backend flow as the internal scoring layer.

Backend integration points:

- backend worker can call the internal `POST /ml/predict` endpoint
- active zone rainfall ingestion can feed the same feature-generation path used here
- backend persistence can mirror the generated snapshot structure into:
  - `risk_predictions`
  - `forecast_snapshots`

Important notes for Person 3:

- the ML service contract is in `ml_and_data/app/schemas.py` and `ml_and_data/app/main.py`
- prediction snapshots already match the zone-centric data model in the docs
- the backend should preserve `zone_id` consistency with the frontend apps

## Overall team handoff summary

What is ready for the team:

- runnable ML service scaffold
- working proxy generation logic
- working trainable Random Forest implementation
- sample static feature data and active rainfall inputs
- generated model artifacts and forecast snapshot outputs
- internal API contract for backend integration

What teammates should avoid changing without coordination:

- risk-band thresholds
- canonical feature names
- `zone_id` values
- forecast horizon definitions
- internal ML request/response field names

## Notes and assumptions

- Because `scikit-learn` was not installable on this Python `3.14` environment, I replaced it with a custom pure-Python Random Forest so the project remains runnable.
- The training dataset is synthetic because the repository does not yet include real historical landslide training data files.
- The sample zone inputs and outputs are designed to align with the documented project contracts so the frontend and backend teams can integrate without rework later.
