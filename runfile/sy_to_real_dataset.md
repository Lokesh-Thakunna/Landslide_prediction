# Synthetic To Real Dataset Guide

This file explains how to move the current BHURAKSHAN ML setup from synthetic demo data to a real dataset.

This is only a planning and handoff document.

No implementation is being done in this step.

## 1. Current Situation

Right now the project uses synthetic and local demo data for ML training and prediction support.

Current data files:

- `C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main\ml_and_data\data\synthetic_training.csv`
- `C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main\ml_and_data\data\zone_features.json`
- `C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main\ml_and_data\data\active_zone_inputs.json`

Current training data generator:

- `C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main\ml_and_data\scripts\generate_training_data.py`

This means:

- training is based on synthetic rows
- zone-level values are demo/sample values
- ML outputs are suitable for project demo and integration testing
- ML is not yet trained on real historical landslide records

## 2. Goal

The goal is to replace synthetic training and demo inputs with real-world landslide-related data so that:

- model predictions are more realistic
- zone risk is informed by real records
- rainfall and slope patterns better match actual terrain conditions
- historical landslide frequency is based on true observations

## 3. What Type Of Real Data Is Needed

To match the current BHURAKSHAN model design, the real dataset should support these features:

- rainfall intensity or hourly rainfall
- slope in degrees
- historical landslide frequency
- soil moisture or a proxy source from weather/hydrology data
- ground movement proxy or related geotechnical indicator
- target label or target risk score

Minimum required columns for the current pipeline:

- `rainfall_mm_hr`
- `slope_degrees`
- `soil_moisture_proxy_pct`
- `historical_landslide_frequency`
- `ground_movement_proxy_pct`
- `risk_score`

## 4. Real Dataset Options

Possible real dataset sources:

- ISRO or NRSC landslide inventory data
- Geological Survey of India landslide records
- IMD rainfall data
- NASA or NOAA weather and terrain products
- Open-Meteo or ERA5 weather history
- DEM-derived slope data from SRTM or similar terrain datasets
- district or state disaster management authority reports

If a single complete dataset is not available, the system can be built from combined sources:

- one source for landslide event history
- one source for rainfall
- one source for slope/topography
- one source for moisture or soil proxy

## 5. Files That Would Need To Change Later

These files are the main places that would need updates when moving to real data:

### ML data and training

- `C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main\ml_and_data\data\synthetic_training.csv`
- `C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main\ml_and_data\scripts\generate_training_data.py`
- `C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main\ml_and_data\scripts\train_model.py`
- `C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main\ml_and_data\app\training.py`
- `C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main\ml_and_data\app\repository.py`
- `C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main\ml_and_data\app\pipeline.py`
- `C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main\ml_and_data\app\model.py`

### Zone and input data

- `C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main\ml_and_data\data\zone_features.json`
- `C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main\ml_and_data\data\active_zone_inputs.json`

### Backend alignment

- `C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main\services\worker\src\clients\weather-client.ts`
- `C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main\services\worker\src\services\risk-cycle-runner.ts`
- `C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main\packages\contracts\src\index.ts`

## 6. Recommended Migration Steps

### Step 1. Select real source data

Choose one or more real datasets that cover:

- landslide history
- rainfall
- slope
- geographic zone mapping

### Step 2. Standardize schema

Convert the real dataset into the same schema expected by the current training pipeline:

- normalize units
- align column names
- fill missing values carefully
- map geographic points into project zones

### Step 3. Build cleaned training dataset

Create a cleaned CSV or database table that replaces:

- `synthetic_training.csv`

### Step 4. Update feature engineering

Adjust feature engineering logic if the real dataset uses:

- daily rainfall instead of hourly rainfall
- categorical hazard classes instead of numeric risk score
- event/no-event labels instead of continuous score

### Step 5. Retrain model

Retrain the Random Forest model on real data and regenerate:

- `rf_v1.joblib`
- `rf_v1_meta.json`

### Step 6. Validate predictions

Check whether real-data predictions still produce:

- `SAFE`
- `WATCH`
- `DANGER`

and whether thresholds need tuning.

### Step 7. Update zone feature store

Replace sample zone feature values with actual terrain and history values for each project zone.

### Step 8. Re-test full stack

After real dataset integration, re-test:

- Person 4 ML API
- Person 3 worker to ML connection
- Person 1 dashboard values
- Person 2 citizen app values

## 7. Important Risks

When moving to real data, these risks must be handled carefully:

- missing or inconsistent columns
- different units across data sources
- sparse landslide labels
- weak geographic mapping between event points and zones
- imbalance between safe and danger cases
- overfitting if the real dataset is too small

## 8. Recommended Output Structure For Future Real Data

Suggested future structure:

- `C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main\ml_and_data\data\raw\`
- `C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main\ml_and_data\data\processed\`
- `C:\Users\lt22c\OneDrive\Desktop\Landslide_prediction-main\ml_and_data\data\external\`

Suggested split:

- `raw` for untouched downloaded files
- `processed` for cleaned training-ready data
- `external` for reference inventories and GIS exports

## 9. Final Note

The current project is integration-ready with synthetic data.

Moving to a real dataset is possible, but it should be done carefully because it affects:

- ML training
- feature engineering
- zone mapping
- backend scoring behavior
- frontend displayed risk values

This file is only the migration plan.

No real dataset integration has been implemented yet.
