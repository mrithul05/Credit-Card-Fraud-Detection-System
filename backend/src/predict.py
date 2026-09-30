"""Load the trained artifact and perform prediction-time validation/inference."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Mapping

import joblib
import pandas as pd

from .preprocessing import API_INPUT_FEATURES, IDENTIFIERS, RISK_SCORE, TARGET

FORBIDDEN_INPUTS = {TARGET, RISK_SCORE}
OPTIONAL_METADATA = set(IDENTIFIERS)


def default_models_dir() -> Path:
    return Path(__file__).resolve().parents[1] / "models"


def load_artifact(models_dir: Path | None = None) -> tuple[dict[str, Any], dict[str, Any]]:
    directory = models_dir or default_models_dir()
    artifact_path = directory / "fraud_detection_pipeline.joblib"
    metadata_path = directory / "model_metadata.json"
    if not artifact_path.exists() or not metadata_path.exists():
        raise FileNotFoundError(
            f"Trained model artifacts not found in {directory}. Run `python -m src.train` first."
        )
    artifact = joblib.load(artifact_path)
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    if not isinstance(artifact, dict) or "pipeline" not in artifact or "threshold" not in artifact:
        raise ValueError("The saved artifact does not contain a pipeline and threshold")
    return artifact, metadata


def validate_transaction(payload: Mapping[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, Mapping):
        raise TypeError("Transaction input must be a JSON object")
    missing = [field for field in API_INPUT_FEATURES if field not in payload]
    if missing:
        raise ValueError(f"Missing required transaction fields: {missing}")
    forbidden = sorted(FORBIDDEN_INPUTS.intersection(payload))
    if forbidden:
        raise ValueError(f"Prediction input must not include target/leakage fields: {forbidden}")
    unknown = set(payload) - set(API_INPUT_FEATURES) - OPTIONAL_METADATA
    if unknown:
        raise ValueError(f"Unknown transaction fields: {sorted(unknown)}")

    result = {field: payload[field] for field in API_INPUT_FEATURES}
    try:
        result["amount"] = float(result["amount"])
        result["user_age"] = float(result["user_age"])
        result["account_age_days"] = float(result["account_age_days"])
    except (TypeError, ValueError) as exc:
        raise ValueError("amount, user_age, and account_age_days must be numeric") from exc
    if result["amount"] < 0:
        raise ValueError("amount must be non-negative")
    if not 0 <= result["user_age"] <= 120:
        raise ValueError("user_age must be between 0 and 120")
    if result["account_age_days"] < 0:
        raise ValueError("account_age_days must be non-negative")
    if not isinstance(result["is_foreign_transaction"], (bool, int, float)) or result["is_foreign_transaction"] not in (0, 1, False, True):
        raise ValueError("is_foreign_transaction must be boolean or 0/1")
    result["is_foreign_transaction"] = int(bool(result["is_foreign_transaction"]))
    for field in ["merchant_category", "location", "timestamp", "device_type"]:
        if not isinstance(result[field], str) or not result[field].strip():
            raise ValueError(f"{field} must be a non-empty string")
    if pd.isna(pd.to_datetime(result["timestamp"], errors="coerce", format="mixed")):
        raise ValueError("timestamp must be parseable as a date/time")
    return result


def predict_transaction(payload: Mapping[str, Any], models_dir: Path | None = None) -> dict[str, Any]:
    validated = validate_transaction(payload)
    artifact, _metadata = load_artifact(models_dir)
    pipeline = artifact["pipeline"]
    threshold = float(artifact["threshold"])
    frame = pd.DataFrame([validated], columns=API_INPUT_FEATURES)
    probability = float(pipeline.predict_proba(frame)[0, 1])
    is_fraud = int(probability >= threshold)
    return {
        "prediction": "potential_fraud" if is_fraud else "genuine",
        "is_fraud": is_fraud,
        "fraud_probability": probability,
        "probability": probability,
        "threshold": threshold,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--models-dir", type=Path, default=default_models_dir())
    parser.add_argument("--json", required=True, help="JSON transaction object")
    args = parser.parse_args()
    payload = json.loads(args.json)
    print(json.dumps(predict_transaction(payload, args.models_dir), indent=2))


if __name__ == "__main__":
    main()
