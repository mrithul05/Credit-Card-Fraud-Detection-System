# Credit Card Fraud Detection ML Backend

This backend trains and serves a real fraud classifier from the repository dataset. It is independent of the existing React/Vite frontend and does not train during FastAPI startup.

## Dataset and feature policy

The training command reads `../dataset/fraud_detection_dataset.csv` when run from `backend`. The dataset is validated before training. The required target is `is_fraud` (`0` genuine, `1` fraud).

The production-compatible model accepts only the fields already sent by the frontend:

- `amount`
- `merchant_category`
- `location`
- `timestamp`
- `device_type`
- `user_age`
- `account_age_days`
- `is_foreign_transaction`

The pipeline deterministically derives hour, day-of-week, month, weekend, month-start/end, rush-hour, and off-hours features from `timestamp`. It does not use raw timestamp text as a model feature.

`transaction_id` and `user_id` are identifiers, not features. `is_fraud` is never an input. `risk_score` is excluded because its provenance is unavailable and its target association is suspicious. History/rolling fields and interactions based on them are excluded because this API request does not provide an as-of transaction history. See `analysis/dataset_analysis.md` for the generated evidence.

## Setup

From the repository root:

```bash
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/pip install -r requirements.txt
```

XGBoost is optional and is not a required dependency. Training attempts to use it when an importable installation is already available; if it is unavailable (for example, because the macOS OpenMP runtime is missing), training records that fact and continues with the sklearn models.

## Dataset analysis

Run the analysis before training:

```bash
.venv/bin/python -m src.analysis
```

This writes:

- `analysis/dataset_analysis.json`
- `analysis/dataset_analysis.md`

The report includes schema, missingness, duplicates, target distribution, ranges/outliers, timestamp consistency, derived-formula checks, and the leakage review.

## Training

```bash
.venv/bin/python -m src.train
```

The command uses a fixed seed (`42`) and a stratified 64% train / 16% validation / 20% test split. Preprocessing and SMOTE experiments are fit only within the training partition. Thresholds from `0.30` through `0.70` are selected on validation data using F0.5, with PR-AUC/F1/recall tie-breakers. The test partition is evaluated only once after the model and threshold are frozen.

Generated artifacts:

- `models/fraud_detection_pipeline.joblib` — complete timestamp transformation, preprocessing, and selected model/ensemble.
- `models/model_metadata.json` — actual selected model, feature contract, split sizes, validation comparison, selected threshold, and final untouched-test metrics.
- `analysis/model_comparison_validation.csv` — actual validation metrics for every completed model and ensemble.
- `analysis/threshold_sweeps.json` — validation threshold tables.

Metrics include precision, recall, F1, F0.5, ROC-AUC, PR-AUC, and confusion counts. Accuracy is not used as the primary metric.

## Prediction

After training, run a fresh-process prediction:

```bash
.venv/bin/python -m src.predict --json '{"amount":125.50,"merchant_category":"Grocery","location":"US","timestamp":"2025-01-15T13:45:00","device_type":"Mobile","user_age":34,"account_age_days":420,"is_foreign_transaction":false}'
```

The response has this shape:

```json
{
  "prediction": "genuine",
  "is_fraud": 0,
  "fraud_probability": 0.12,
  "probability": 0.12,
  "threshold": 0.50
}
```

`potential_fraud` means the model probability crossed the selected threshold; it is not proof of fraud. Unknown categorical values are accepted by the one-hot encoder and do not crash inference. Missing required fields, target/leakage fields, malformed timestamps, and invalid numeric ranges are rejected.

## FastAPI

Start the prepared adapter from `backend` after training:

```bash
.venv/bin/uvicorn main:app --reload
```

Endpoints:

- `GET /health`
- `POST /predict`

The `/predict` request accepts only the eight frontend fields and returns `prediction`, `is_fraud`, `fraud_probability`, `probability`, and the saved `threshold`. The frontend can use `fraud_probability` or `probability` and the `potential_fraud` label it already supports.

## Verification

```bash
.venv/bin/python -m pytest -q tests
npm run build
npm run typecheck
npm run lint
```

All frontend commands are run from the repository root. The React/Vite source is not modified by this ML backend.
